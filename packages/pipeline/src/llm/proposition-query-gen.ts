/**
 * 고아 명제에 전용 질의를 붙인다.
 *
 * **고아 명제**란 relation/argument 질의가 하나도 앵커링하지 않아, 앵커가 scope 질의뿐인
 * 명제다. 원칙 A가 scope 증거를 버리므로(`aggregatePropositionState`) 이런 명제는 학생이
 * 무엇을 쓰든 항상 `not_evidenced`가 된다 — 화면에는 늘 ○로 뜬다. 실측 92개 중 6개가 그렇고,
 * 그중에는 `암반응=캘빈 회로로 진행`, `1공간=엽육세포`처럼 문단의 뼈대도 있다.
 *
 * **기존 질의에 앵커를 얹는 방식은 쓰지 않는다.** 그러면 그 질의의 앵커 개수가 늘어 원래
 * 명제가 전용 질의를 잃고, ●에서 ◐로 떨어진다. 하나를 살리려고 다른 하나를 깎는 셈이다.
 *
 * 손으로 쓰지 않는 이유는 `contradiction-gen.ts`와 같다 — 사람이 문단마다 다른 엄격도로
 * 쓰면 "무엇을 물어야 하는가"가 문서화되지 않은 채 굳는다.
 */

import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';

import { MODEL, getClient, instrumented } from './client.js';

export const PROPOSITION_QUERY_GENERATOR_VERSION: string = 'v1';

export const PropositionQuerySchema = z.object({
  question: z.string().describe('이 명제 하나만을 겨냥한 질문.'),
  expectedAnswer: z.string().describe('그 질문의 답. 명제의 내용 그대로.'),
  acceptanceCriteria: z.array(z.string()).describe('학생 응답을 실제로 구분하는 판정 규칙. 추상 문구 금지.'),
  contradictionCriteria: z.array(z.string()).describe('이 질의를 모순시키는 응답. 학생이 실제로 진술해야 성립하는 것만. 없으면 빈 배열.'),
});
export type PropositionQuery = z.infer<typeof PropositionQuerySchema>;

export interface PropositionQueryInput {
  readonly paragraphId: string;
  readonly paragraphText: string;
  readonly regionLabel: string;
  readonly propositionText: string;
  readonly propositionShortForm: string;
  /** 같은 영역의 기존 질의. 겹치는 것을 만들지 않게 보여준다. */
  readonly siblingQuestions: readonly string[];
}

const SYSTEM = `당신은 수능 국어 비문학 문단의 채점 질의를 **하나** 만든다.

주어진 **명제 하나만을 겨냥하는** argument 층위 질의다. 이 명제는 지금 어떤 질의도 직접
묻지 않아서, 학생이 무엇을 써도 "쓰지 않았다"로 표시된다. 그것을 고치는 것이 목적이다.

# 지켜야 할 것

**이 명제 하나만 물어라.** 같은 영역의 다른 명제까지 함께 묻는 질문을 만들면 안 된다. 그러면
앵커가 여럿이 되어 지금과 같은 문제가 다시 생긴다. 질문이 여러 항을 요구하게 되면 범위를 좁혀라.

**기존 질의와 겹치지 마라.** 아래 형제 질의 목록을 보고, 같은 것을 다시 묻지 않는지 확인하라.

**수용 기준은 판정 가능하게.** 실제 학생 응답을 구분할 수 있어야 한다.
"잘 서술했는가" 같은 추상적 문구는 금지. 무엇을 쓰면 인정이고 무엇이면 미보존인지 적는다.

**표현 일치를 요구하지 마라.** 원문 어휘를 그대로 쓰지 않아도 같은 뜻이면 인정한다고 적어라.
학생은 자기 말로 요약한다.

**모순 기준은 학생이 실제로 진술해야 성립하는 것만.** "언급하지 않으면 모순" 류는 금지 —
빠뜨린 것은 미보존이지 모순이 아니다. 어긋날 여지가 없으면 빈 배열로 둔다.`;

/** 명제 하나에 대한 전용 질의를 만든다. LLM 1회. */
export async function generatePropositionQuery(input: PropositionQueryInput): Promise<PropositionQuery> {
  const siblings =
    input.siblingQuestions.length === 0
      ? '(없음)'
      : input.siblingQuestions.map((q) => `  - ${q}`).join('\n');

  const response = await instrumented('proposition-query-gen', 'medium', input.paragraphId, () =>
    getClient().messages.parse({
      model: MODEL,
      max_tokens: 4000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: zodOutputFormat(PropositionQuerySchema) },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content:
            `원문 문단:\n${input.paragraphText}\n\n` +
            `영역: ${input.regionLabel}\n\n` +
            `겨냥할 명제:\n  ${input.propositionText}\n  (요약: ${input.propositionShortForm})\n\n` +
            `같은 영역의 기존 질의 (겹치지 말 것):\n${siblings}`,
        },
      ],
    }),
  );

  const parsed = response.parsed_output;
  if (parsed === null || parsed === undefined) {
    throw new Error(`전용 질의 생성 실패: ${input.paragraphId} / ${input.propositionShortForm}`);
  }
  return parsed;
}
