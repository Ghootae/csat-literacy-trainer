/**
 * 학생 응답 판정과 테스트 응답 생성.
 *
 * 골드 재현성을 재는 방식이 여기에 달려 있다. 같은 문단으로 골드를 3회 독립 생성하면
 * 슬롯 id도 경계도 달라지므로 **구조를 직접 비교할 수 없다.** 대신 동일한 학생 응답에
 * 대한 판정을 비교한다 — 구조가 달라도 판정이 같으면 학습자에게는 같은 골드다.
 *
 * 비교를 골드 독립적으로 만드는 축은 **문장 번호**다. 슬롯은 traceability 명제를 거쳐
 * sourceSentences로 환원되므로, 서로 다른 골드의 슬롯도 "어느 문장을 덮는가"로 정렬된다.
 */

import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';

import { MODEL, getClient, instrumented } from './client.js';

export const SlotVerdictSchema = z.object({
  slotId: z.string(),
  verdict: z
    .enum(['충족', '부분', '누락', '모순'])
    .describe(
      '충족: 핵심 사고 관계를 모두 담았다. 부분: 일부만 담았다. 누락: 언급하지 않았다. ' +
        '모순: 골드와 어긋나는 주장을 했다.',
    ),
  coveredCore: z
    .array(z.string())
    .describe('학생이 담아낸 required_reasoning_core 항목을 그대로 인용.'),
  missingCore: z.array(z.string()).describe('담아내지 못한 항목.'),
  contradiction: z
    .string()
    .describe(
      '골드와 어긋나는 학생 진술을 그대로 인용. 없으면 빈 문자열. ' +
        '**역할·층위가 다른 진술은 모순이 아니다** — evaluation link를 먼저 확인하라.',
    ),
});

export const EvaluationSchema = z.object({
  slotVerdicts: z.array(SlotVerdictSchema),
  firstRevisionTarget: z
    .object({
      slotId: z.string().describe('먼저 고쳐야 할 슬롯. 고칠 것이 없으면 빈 문자열.'),
      kind: z
        .enum(['모순 교정', '누락 보완', '없음'])
        .describe('모순이 하나라도 있으면 반드시 모순 교정이 먼저다.'),
      what: z.string().describe('무엇을 고쳐야 하는지 한 문장. 답을 알려주지 말고 방향만.'),
    })
    .describe('학생이 가장 먼저 손대야 할 지점.'),
});

export type Evaluation = z.infer<typeof EvaluationSchema>;

const EVALUATE_SYSTEM = `당신은 학생의 문단 요약을 골드 의미지도에 대조해 판정한다.

각 슬롯에 대해 **충족 / 부분 / 누락 / 모순** 중 하나를 판정하라.

# 모순 판정은 신중하게

**역할이나 설명 층위가 다른 진술은 모순이 아니다.** 골드의 evaluation link를 먼저 확인하라.

예: "법인이 자산 운용의 법적 주체이지만 실제 운용은 권한자가 수행한다"
  → 두 진술은 각각 legal_attribution 층위와 actual_execution 층위다. 역할 분리 링크가
    이를 명시하므로 **모순이 아니라 정확한 요약**이다.

같은 층위·같은 역할 위에서 관계가 어긋날 때만 모순이다:
  - 인과 방향을 뒤집음
  - 조건부 매핑의 대상을 뒤바꿈 (순위값→최빈값처럼)
  - 골드가 부정한 것을 긍정하거나 그 반대

# 판정 기준은 명칭이 아니라 사고 관계다

required_reasoning_core에 적힌 것을 담았는지로 판단하라. 학생이 용어를 조금 다르게 써도
관계를 파악했으면 충족이다. 반대로 명칭만 나열하고 관계를 못 짚었으면 부분이다.

# 첫 수정 타겟

모순이 하나라도 있으면 **반드시 모순 교정이 먼저다** — 잘못된 이해를 안고 진행하는 것이
누락보다 해롭다. 모순이 없으면 가장 핵심적인 누락을 고르되, **답을 알려주지 말고 방향만**
제시하라. 고칠 것이 없으면 kind를 "없음"으로.`;

export interface GoldSlotView {
  readonly slotId: string;
  readonly shortForm: string;
  readonly requiredReasoningCore: readonly string[];
  readonly propositions: readonly { id: string; text: string; aspect: string }[];
}

export interface EvaluationLinkView {
  readonly source: string;
  readonly target: string;
  readonly relation: string;
  readonly contrastAxis: string | null;
  readonly evaluationEffect: string;
}

export async function evaluate(
  paragraphText: string,
  slots: readonly GoldSlotView[],
  links: readonly EvaluationLinkView[],
  studentResponse: string,
  paragraphId?: string,
): Promise<Evaluation> {
  const slotBlock = slots
    .map(
      (s) =>
        `[${s.slotId}] ${s.shortForm}\n` +
        `  확인할 사고 관계:\n${s.requiredReasoningCore.map((r) => `    - ${r}`).join('\n')}\n` +
        `  근거 명제:\n${s.propositions.map((p) => `    ${p.id} (${p.aspect}) ${p.text}`).join('\n')}`,
    )
    .join('\n\n');

  const linkBlock =
    links.length === 0
      ? '(없음)'
      : links
          .map(
            (l) =>
              `${l.source} →(${l.relation})→ ${l.target}` +
              (l.contrastAxis === null ? '' : `  [${l.contrastAxis}]`) +
              `\n    ${l.evaluationEffect}`,
          )
          .join('\n');

  const response = await instrumented('evaluate', 'high', paragraphId, () =>
    getClient().messages.parse({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high', format: zodOutputFormat(EvaluationSchema) },
      system: EVALUATE_SYSTEM,
      messages: [
        {
          role: 'user',
          content:
            `원문 문단:\n${paragraphText}\n\n` +
            `골드 슬롯:\n${slotBlock}\n\n` +
            `역할 분리 등 평가용 링크:\n${linkBlock}\n\n` +
            `학생 응답:\n${studentResponse}`,
        },
      ],
    }),
  );

  const parsed = response.parsed_output;
  if (parsed === null) throw new Error('evaluate: 구조화 출력 파싱 실패');
  return parsed;
}

// ─────────────────────────────────────────────────────────────────────────────

export const TestResponsesSchema = z.object({
  responses: z.array(
    z.object({
      id: z.string().describe('r1, r2, … 형식.'),
      kind: z
        .enum(['완전', '부분', '모순', '환언', '문단 밖'])
        .describe('이 응답이 대표하는 품질 수준.'),
      text: z.string().describe('학생이 쓸 법한 실제 문장. 3~5문장.'),
      intent: z.string().describe('이 응답으로 무엇을 시험하려는지 한 문장.'),
    }),
  ),
});

export type TestResponses = z.infer<typeof TestResponsesSchema>;

const TEST_RESPONSES_SYSTEM = `당신은 골드 재현성 측정을 위한 **테스트 학생 응답**을 만든다.

주어진 문단만 보고, 학생이 쓸 법한 요약을 다섯 가지 품질 수준으로 작성하라.

  완전    — 문단의 핵심 관계를 모두 담은 정확한 요약
  부분    — 일부 핵심을 빠뜨린 요약. 무엇을 빠뜨릴지는 문단에서 중요한 것 중에 고른다
  모순    — 관계를 실제로 잘못 이해한 요약. 인과 방향을 뒤집거나 조건부 매핑의 대상을
            뒤바꾼다. **표현만 다른 것이 아니라 이해가 틀려야 한다**
  환언    — 완전 요약과 같은 내용을 전혀 다른 어휘·문장 구조로 쓴 것
  문단 밖  — 참이지만 이 문단에 없는 내용을 섞은 요약

각 수준마다 하나씩, 총 다섯 개. 실제 고등학생이 쓸 법한 자연스러운 문장이어야 하고,
지나치게 정연하거나 지나치게 엉성하면 안 된다.

**중요: 골드 의미지도를 보지 않고 문단만 보고 쓴다.** 특정 골드에 맞춰 만들면 그 골드에
유리한 판정이 나와 재현성 측정이 무의미해진다.`;

/** 문단만 보고 테스트 응답을 만든다. 골드와 독립이어야 측정이 성립한다. */
export async function generateTestResponses(
  paragraphText: string,
  paragraphId?: string,
): Promise<TestResponses> {
  const response = await instrumented('test-responses', 'high', paragraphId, () =>
    getClient().messages.parse({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high', format: zodOutputFormat(TestResponsesSchema) },
      system: TEST_RESPONSES_SYSTEM,
      messages: [{ role: 'user', content: `문단:\n${paragraphText}` }],
    }),
  );

  const parsed = response.parsed_output;
  if (parsed === null) throw new Error('generateTestResponses: 구조화 출력 파싱 실패');
  return parsed;
}
