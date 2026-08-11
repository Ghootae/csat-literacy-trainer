/**
 * 모순 기준 보강 — 이미 있는 질의셋에 `contradictionCriteria`만 채운다.
 *
 * **왜 따로 필요한가.** 질의 생성기(`query-gen.ts`)는 모순 기준을 잘 만든다(생성 fixture에서
 * `photosynthesis-p5` 13/13, `science-p5` 12/12). 그런데 `content/`에 들어간 8문단 중 6개는
 * **손 오라클**에서 가져왔고, 손 오라클에는 그 필드가 애초에 없어 빈 배열이 됐다
 * (`content-import.ts`의 `oracleToQuerySet`). 그래서 그 6문단은 모순을 잡을 근거가 없다 —
 * 실측으로도 두 세포의 역할을 통째로 뒤바꾼 응답이 `주제만`으로 나왔다(2026-08-10 코덱스 테스트).
 *
 * 질의를 다시 생성하면 영역 분할이 바뀌어 검증된 오라클 구조가 흔들린다. 그래서 **구조는
 * 그대로 두고 이 필드만** 채운다.
 *
 * 손으로 쓰지 않는 이유는 그것대로다. 65개를 사람이 지으면 문단마다 엄격도가 달라지고,
 * 무엇보다 "무엇을 모순으로 볼 것인가"가 문서화되지 않은 채 개인 취향으로 굳는다.
 */

import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';

import { MODEL, getClient, instrumented } from './client.js';

/** 프롬프트를 고치면 올린다. */
export const CONTRADICTION_GENERATOR_VERSION: string = 'v1';

export const ContradictionCriteriaSchema = z.object({
  items: z.array(
    z.object({
      queryId: z.string(),
      contradictionCriteria: z
        .array(z.string())
        .describe('이 질의를 모순시키는 응답. 학생이 실제로 진술해야 성립하는 것만. 없으면 빈 배열.'),
    }),
  ),
});
export type ContradictionCriteria = z.infer<typeof ContradictionCriteriaSchema>;

export interface CriteriaGenQuery {
  readonly id: string;
  readonly level: string;
  readonly region: string;
  readonly question: string;
  readonly expectedAnswer: string;
  readonly acceptanceCriteria: readonly string[];
}

const SYSTEM = `당신은 수능 국어 비문학 문단의 채점 질의에 **모순 기준**을 붙인다.

모순 기준은 "학생이 이렇게 쓰면 원문과 어긋난다"를 적은 것이다. 채점기는 이 목록에 적힌 것을
근거로만 모순 판정을 내린다.

# 가장 중요한 규칙 — 진술한 것만 모순이다

**학생이 실제로 진술해야 성립하는 것만 적는다.** "언급하지 않으면 모순", "빠뜨리면 모순" 같은
것은 절대 쓰지 마라. 빠뜨린 것은 모순이 아니라 미보존이고, 그것은 수용 기준이 처리한다.

기준 문구는 **학생이 무엇을 썼을 때 걸리는지**가 분명해야 한다:

    좋음   "A가 B의 원인이라고 서술하면 모순"          무엇을 썼는지 특정된다
    좋음   "X를 Y의 역할이라고 설명하면 모순"          같음
    나쁨   "인과를 혼동하면 모순"                     '혼동'이 무엇인지 알 수 없다
    나쁨   "관계를 정확히 쓰지 않으면 모순"            미보존과 구별되지 않는다

'혼동하면'처럼 모호한 말 대신, **혼동의 결과로 학생이 쓰게 될 문장**을 적어라.

# 반드시 덮어야 하는 것 — 짝을 이루는 대상의 역할 맞바꿈

문단에 역할이 다른 두 대상이 나오면(두 사상가, 두 세포, 두 물질, 두 시장, 두 유형…),
**그 둘을 맞바꿔 서술하는 것**이 가장 흔한 오독이고 가장 놓치기 쉽다. 해당 질의에는 반드시
맞바꿈 기준을 넣어라.

    "엽육 세포가 하는 일을 유관속초 세포가 한다고 서술하면 모순"
    "니켈의 효과를 망가니즈의 효과라고 서술하면 모순"
    "갑의 주장을 을의 주장으로 돌려 서술하면 모순"

주장의 **귀속**도 여기 포함된다. 어떤 입장이 누구의 것인지가 문단의 뼈대라면, 그것을 바꿔
쓰는 것은 관계를 틀리게 쓴 것과 같은 무게다.

# 방향과 순서의 역전

인과·수단목적·조건결과·시간순서가 있으면 뒤집힌 서술을 기준으로 넣어라.

    "결과가 원인이라고 서술하면 모순"
    "나중 단계가 먼저 일어난다고 서술하면 모순"

# 비워 두어야 하는 경우

- **level이 scope인 질의는 원칙적으로 빈 배열이다.** 화제만 묻는 질의에서 모순이 나면 영역이
  통째로 모순이 되어, 사소한 어긋남 하나가 문단 전체를 끌어내린다.
- 어긋날 여지가 없는 질의(정의를 그대로 묻는 등)도 빈 배열로 둔다. 억지로 채우지 마라.

# 개수

질의당 1~3개. 그 질의가 묻는 관계에서 **실제로 나올 법한** 오독만 적는다. 가능한 오독을
전부 나열하는 목록이 아니다.

출력은 입력으로 받은 질의 전부에 대해 하나씩, 같은 queryId로 낸다.`;

/** 문단 하나의 질의 전부에 모순 기준을 붙인다. LLM 1회. */
export async function generateContradictionCriteria(
  paragraphId: string,
  paragraphText: string,
  queries: readonly CriteriaGenQuery[],
): Promise<ContradictionCriteria> {
  const block = queries
    .map(
      (q) =>
        `[${q.id}] (${q.level}, ${q.region})\n` +
        `  질문: ${q.question}\n` +
        `  기대 답: ${q.expectedAnswer}\n` +
        `  수용 기준:\n${q.acceptanceCriteria.map((c) => `    - ${c}`).join('\n')}`,
    )
    .join('\n\n');

  const response = await instrumented('contradiction-gen', 'medium', paragraphId, () =>
    getClient().messages.parse({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: zodOutputFormat(ContradictionCriteriaSchema) },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `원문 문단:\n${paragraphText}\n\n질의:\n${block}`,
        },
      ],
    }),
  );

  const parsed = response.parsed_output;
  if (parsed === null || parsed === undefined) throw new Error(`모순 기준 생성 실패: ${paragraphId}`);
  return parsed;
}
