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
  evidence: z.string().describe('판정 근거가 된 학생 표현 조각. 그대로 인용.'),
  viaItem: z.string().describe('어느 학생 항목이 이 질의를 다뤘는가. 없으면 빈 문자열.'),
});

export const QueryEvalSchema = z.object({
  verdicts: z.array(QueryVerdictSchema),
});

export type QueryEval = z.infer<typeof QueryEvalSchema>;

export interface PreservationQuery {
  readonly id: string;
  readonly level: string;
  readonly region: string;
  readonly question: string;
  readonly expectedAnswer: string;
  readonly sentences: readonly string[];
  readonly acceptanceCriteria: readonly string[];
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
- evidence: 판정 근거가 된 학생 표현을 그대로 인용
- viaItem: 어느 학생 항목이 이 질의를 다뤘는지

# 핵심 원칙

**수용 기준(acceptanceCriteria)을 그대로 따르라.** 특히 관계 질의에서 '분리·대조·다르다'
같은 단어가 없어도, 두 역할을 서로 다른 주체에 연결한 **병치만으로** 관계를 나타냈다면
preserved + implicit로 인정한다. 반대로 한쪽 주체만 언급하면 not_evidenced다.

**추상적 표현을 과대평가하지 마라.** "법인의 자산 운용"은 자산 운용이라는 화제(scope)는
담지만, 법적 주체와 실제 운용 주체의 **분리(관계)**는 담지 못한다 — 그 관계 질의는
not_evidenced다. 화제어만으로 관계 질의까지 통과시키면 안 된다.

**공허한 표현을 걸러라.** "법인의 성격", "법인의 특징"은 어느 영역인지 특정하지 못하므로
scope 질의조차 not_evidenced다.`;

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

  const response = await instrumented('query-eval', 'high', paragraphId, () =>
    getClient().messages.parse({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high', format: zodOutputFormat(QueryEvalSchema) },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `원문 문단:\n${paragraphText}\n\n보존 질의:\n${queryBlock}\n\n학생 응답:\n${studentResponse}`,
        },
      ],
    }),
  );

  const parsed = response.parsed_output;
  if (parsed === null) throw new Error('evaluateQueries: 구조화 출력 파싱 실패');
  return parsed;
}
