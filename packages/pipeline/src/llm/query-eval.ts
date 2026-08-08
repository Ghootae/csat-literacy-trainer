/**
 * 질의 보존 평가 (Hierarchical Query-Preservation Evaluation).
 *
 * "좋은 추상인가?"를 직접 판정하지 않고, 학생 표현이 **문단 수준 보존 질의**의 답을
 * 어느 수준까지 보존하는지 평가한다. 질의는 합성 노드가 아니라 문장 span·명제·관계 간선에
 * 앵커링되어 있어 골드 구조 변이에 영향받지 않는다.
 *
 * 두 축을 분리한다 (사용자 보정):
 *   semanticState  — preserved / not_evidenced / contradicted   (의미 보존 여부)
 *   expressionMode — explicit / implicit / null                 (표현 방식)
 *
 * "자산의 법인 귀속과 권한자의 실제 운용"은 '분리'를 직접 안 썼어도 두 주체를 병치해
 * 역할 분리를 나타냈으므로 semanticState=preserved, expressionMode=implicit.
 */

import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';

import { MODEL, getClient, instrumented } from './client.js';

export const QueryVerdictSchema = z.object({
  queryId: z.string(),
  semanticState: z
    .enum(['preserved', 'not_evidenced', 'contradicted'])
    .describe('질의의 답이 보존됐는가. 병치로 관계를 나타내면 preserved. 언급 없으면 not_evidenced. 어긋나면 contradicted.'),
  expressionMode: z
    .enum(['explicit', 'implicit', 'none'])
    .describe('preserved일 때만 유효. 직접 진술이면 explicit, 병치·함축이면 implicit. not_evidenced/contradicted면 none.'),
  evidenceRole: z
    .enum(['relation', 'entity_identification', 'scope', 'none'])
    .describe(
      'preserved일 때만 유효. 그 증거가 어떤 종류인가 — relation=대상에 역할·방향·조건·인과·대조·순서가 배정됨(대상 개수 무관), entity_identification=대상·개수를 지목했을 뿐 연결이 없음, scope=화제만 지목. preserved가 아니면 none.',
    ),
  evidence: z.string().describe('판정 근거가 된 학생 표현 조각. 그대로 인용.'),
  viaItem: z.string().describe('어느 학생 항목이 이 질의를 다뤘는가. 없으면 빈 문자열.'),
});

export const QueryEvalSchema = z.object({
  verdicts: z.array(QueryVerdictSchema),
});

export type QueryEval = z.infer<typeof QueryEvalSchema>;

/** 실제 요청 파라미터. 캐시 지문과 호출부가 같은 상수를 쓰도록 한 곳에 둔다. */
const EVAL_MAX_TOKENS = 8000;

/**
 * 채점 모델. **골드 구축과 따로 둔다** — 골드는 한 번 만들면 끝이라 품질이 우선이고,
 * 채점은 학생이 쓸 때마다 도는 온라인 경로라 비용·지연이 걸린다. 둘을 한 상수로 묶으면
 * 채점만 싼 모델로 재는 실험이 골드 파이프라인까지 흔든다.
 */
function evalModel(): string {
  return process.env['EVAL_MODEL'] ?? MODEL;
}

/**
 * 사고 깊이. **판정을 만드는 값이므로 바꾸면 회귀 3세트를 다시 재야 한다.**
 *
 * 측정된 사실: 채점 지연·비용은 출력 토큰에 거의 선형이고(약 12ms/토큰), 접두부 캐싱을
 * 넣은 뒤로는 **비용의 95%가 출력**이다. 즉 effort가 지연과 비용을 동시에 정하는 유일한
 * 변수다. 그래서 실험으로 낮은 effort의 판정 일치도를 잴 수 있어야 한다.
 *
 * 환경변수는 **실험 전용이다.** 지문(fingerprint)에 effort가 들어가므로 값이 다르면 캐시도
 * 갈라져, 낮은 effort의 결과가 운영 캐시를 오염시키지 않는다.
 */

const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
export type Effort = (typeof EFFORTS)[number];

function evalEffort(): Effort {
  const raw = process.env['EVAL_EFFORT'];
  if (raw === undefined) return 'high';
  // 오타를 API까지 보내지 않는다. 조용히 기본값으로 되돌리면 낮은 effort를 쟀다고 믿으면서
  // 실은 high를 재는 실험이 된다.
  const found = EFFORTS.find((e) => e === raw);
  if (found === undefined) throw new Error(`EVAL_EFFORT가 잘못됐다: ${raw} (${EFFORTS.join('|')})`);
  return found;
}
const EVAL_THINKING = 'adaptive';

export interface PreservationQuery {
  readonly id: string;
  readonly level: string;
  readonly region: string;
  readonly question: string;
  readonly expectedAnswer: string;
  readonly sentences: readonly string[];
  readonly acceptanceCriteria: readonly string[];
  /** 후처리 정규화 전용 플래그. LLM 프롬프트에는 전달되지 않는다. */
  readonly requiredForRelation?: boolean;
  readonly requiredForFullArgumentCoverage?: boolean;
}

const SYSTEM = `당신은 학생의 문단 요약이 **보존 질의**의 답을 어느 수준까지 담았는지 판정한다.

각 질의에는 질문·기대 답·수용 기준이 있다. 학생 응답 전체를 보고, 각 질의에 대해:

- semanticState:
    preserved      질의의 답을 담았다 (수용 기준 충족)
    not_evidenced  담지 않았다 (틀린 게 아니라 근거가 없음)
    contradicted   답과 어긋나는 주장을 했다
- expressionMode (preserved일 때만):
    explicit   답을 직접 진술함
    implicit   직접 쓰진 않았지만 병치·함축으로 충분히 나타냄
    (preserved가 아니면 none)
- evidenceRole (preserved일 때만):
    relation               대상에 **역할·방향·조건·인과·대조·순서**가 배정됨
    entity_identification  대상·개수를 **지목**했을 뿐 연결이 없음
    scope                  화제만 지목
    (preserved가 아니면 none)
- evidence: 판정 근거가 된 학생 표현을 그대로 인용
- viaItem: 어느 학생 항목이 이 질의를 다뤘는지

# 두 판단의 분업 — 섞지 마라

semanticState와 evidenceRole은 **서로 다른 질문**에 답한다.

- semanticState는 **"학생이 이 질의의 답을 했는가"**다. 질의별 **수용 기준을 그대로 따른다.**
  수용 기준이 "이름 두 개면 인정"이라고 하면, 이름 두 개를 쓴 학생은 그 질의에 **답한 것이므로
  preserved**다. 답을 했는데 not_evidenced로 낮추지 마라.
- evidenceRole은 **"그 답이 어떤 종류의 증거인가"**다. 여기서는 수용 기준이 무엇이라고 쓰여
  있든 **아래 정의만 따른다.** 수용 기준이 이름 나열을 인정하더라도, 이름 나열은
  entity_identification이지 relation이 아니다.

두 축이 어긋나는 것은 정상이다: **preserved + entity_identification**은 "질의에는 답했지만
관계 증거는 아니다"라는 뜻이며, 흔하게 나온다.

# evidenceRole 판별 — 개수가 아니라 **역할 배정**이 기준이다

relation인 경우:
- 대상에 서로 다른 역할을 배정 ("자산은 법인이 소유하고 실제 운용은 권한자가 한다")
- 원인–결과·조건–결과·수단–목적을 연결
- 과정의 순서·방향을 표현
- 두 대상을 대조
- **대상이 하나여도 그 대상에 역할·작용이 배정되면 relation이다** ("법인이 권리·의무의 주체가 된다")

entity_identification인 경우:
- 역할 없이 대상 이름만 나열 ("법인과 권한자")
- 개수만 진술 ("주체는 둘이다")
- "관련이 있다", "차이가 있다" 같은 공허한 연결어만 붙임

# 핵심 원칙

**수용 기준(acceptanceCriteria)을 그대로 따르라.** 특히 관계 질의에서 '분리·대조·다르다'
같은 단어가 없어도, 두 역할을 서로 다른 주체에 연결한 **병치만으로** 관계를 나타냈다면
preserved + implicit로 인정한다. 반대로 한쪽 주체만 언급하면 not_evidenced다.

**추상적 표현을 과대평가하지 마라.** "법인의 자산 운용"은 자산 운용이라는 화제(scope)는
담지만, 법적 주체와 실제 운용 주체의 **분리(관계)**는 담지 못한다 — 그 관계 질의는
not_evidenced다. 화제어만으로 관계 질의까지 통과시키면 안 된다.

**대상 이름의 나열은 관계가 아니다.** 관계 질의에 대해 학생이 관련 대상의 **이름만 둘 이상
나열**하고 그것들이 어떻게 연결되는지 · 역할을 어떻게 나눠 맡는지 나타내지 않았다면
not_evidenced다. 대상을 빠짐없이 정확히 지목했더라도 마찬가지다 — 관계 질의가 요구하는 것은
대상 목록이 아니라 **대상들 사이의 연결**이다. 이는 병치 인정 규칙과 충돌하지 않는다:
병치가 인정되는 것은 서로 다른 역할이 각 대상에 배정됐을 때이고, 역할 없이 이름만 늘어놓은
것은 병치가 아니다.

**공허한 표현을 걸러라.** "법인의 성격", "법인의 특징"은 어느 영역인지 특정하지 못하므로
scope 질의조차 not_evidenced다.`;

/**
 * 캐시 키 입력으로 노출하는 요청 지문(fingerprint).
 *
 * **실제 API에 전달되는 값 그대로여야 한다.** 사람이 손으로 올리는 버전 번호나 부분
 * 템플릿을 해시하면, 프롬프트를 고쳤는데 과거 평가 결과가 재사용되는 사고를 막지 못한다.
 * `outputFormat`은 `zodOutputFormat(QueryEvalSchema)`의 결과 — 즉 응답 스키마가 바뀌면
 * 자동으로 달라진다.
 *
 * **`cache_control`은 일부러 넣지 않는다.** 프롬프트 캐싱은 모델이 보는 내용을 바꾸지 않고
 * 과금만 바꾸므로, 캐싱을 켜고 끄는 것으로 과거 평가 결과가 무효화되면 안 된다. 여기 담을
 * 것은 **판정을 바꾸는 것**뿐이다.
 */
export function evalRequestFingerprint() {
  return {
    model: evalModel(),
    systemPrompt: SYSTEM,
    maxTokens: EVAL_MAX_TOKENS,
    // **상수가 아니라 함수인 이유다.** effort를 실험으로 바꿀 수 있으므로 모듈 적재 시점에
    // 굳히면 낮은 effort의 결과가 운영 effort의 캐시 키를 쓰게 된다.
    effort: evalEffort(),
    thinking: EVAL_THINKING,
    outputFormat: zodOutputFormat(QueryEvalSchema),
  };
}

export async function evaluateQueries(
  paragraphText: string,
  queries: readonly PreservationQuery[],
  studentResponse: string,
  paragraphId?: string,
): Promise<QueryEval> {
  const queryBlock = queries
    .map(
      (q) =>
        `[${q.id}] (${q.level}, ${q.region})\n` +
        `  질문: ${q.question}\n` +
        `  기대 답: ${q.expectedAnswer}\n` +
        `  수용 기준:\n${q.acceptanceCriteria.map((c) => `    - ${c}`).join('\n')}`,
    )
    .join('\n\n');

  const effort = evalEffort();
  const model = evalModel();
  const response = await instrumented(
    'query-eval',
    effort,
    paragraphId,
    () =>
      getClient().messages.parse({
        model,
        max_tokens: EVAL_MAX_TOKENS,
        thinking: { type: EVAL_THINKING },
        output_config: { effort, format: zodOutputFormat(QueryEvalSchema) },
        system: SYSTEM,
        messages: [
          {
            role: 'user',
            // **접두부를 별도 블록으로 쪼갠 이유가 캐싱이다.** 한 문자열로 합치면 학생 응답이
            // 접두부 안에 섞여 매번 지문이 달라지고, 캐시가 성립하지 않는다.
            //
            // 안정 → 가변 순서가 규칙이다. 문단·질의는 같은 문단이면 매번 같고(입력의 95%가
            // 넘는다), 학생 응답만 바뀐다. 마지막 안정 블록에 표시를 달면 그 앞의 system까지
            // 함께 캐시된다 — 렌더 순서가 tools → system → messages이기 때문이다.
            content: [
              {
                type: 'text',
                text: `원문 문단:\n${paragraphText}\n\n보존 질의:\n${queryBlock}`,
                cache_control: { type: 'ephemeral' },
              },
              { type: 'text', text: `학생 응답:\n${studentResponse}` },
            ],
          },
        ],
      }),
    model,
  );

  const parsed = response.parsed_output;
  if (parsed === null) throw new Error('evaluateQueries: 구조화 출력 파싱 실패');
  return parsed;
}
