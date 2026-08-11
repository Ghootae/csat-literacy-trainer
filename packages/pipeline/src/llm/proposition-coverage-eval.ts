/**
 * Experimental proposition coverage evaluator.
 *
 * Production assessment와 query evaluator에서 의도적으로 분리한다. 모델 입력은 gold proposition
 * semantic proposition view와 학생 응답 두 값뿐이며, paragraph/query/oracle label을 받는 API 자체가 없다.
 */

import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';

import { MODEL, getClient } from './client.js';

export const PropositionCoverageResultSchema = z.object({
  coverage: z.enum(['explicit', 'partial', 'none']),
  expressedRelation: z
    .string()
    .describe('학생 응답 자체가 실제로 표현한 관계. 관계가 없으면 단어·주제만 언급했다고 적는다.'),
  missingElements: z.array(z.string()).describe('목표 명제를 완성하기 위해 빠진 필수 요소.'),
  evidence: z.string().describe('학생 응답 원문에서 그대로 가져온 짧은 근거. 근거가 없으면 빈 문자열.'),
  completionTest: z
    .enum(['pass', 'fail'])
    .describe('응답의 관계를 유지하고 누락 요소만 보충해 목표 명제가 되면 pass, 아니면 fail.'),
  rationale: z.string().describe('coverage와 completion test를 선택한 이유.'),
});

export type PropositionCoverageResult = z.infer<typeof PropositionCoverageResultSchema>;

export interface TargetPropositionView {
  readonly text: string;
  readonly relation: {
    readonly from: string;
    readonly to: string;
    readonly kind: string;
  };
  readonly predicate: string;
  readonly argument: string;
  readonly aspect: string;
  readonly subjectRole: string;
}

export interface PropositionCoverageInput {
  readonly targetProposition: TargetPropositionView;
  readonly studentResponse: string;
}

const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
export type PropositionCoverageEffort = (typeof EFFORTS)[number];

export interface PropositionCoverageConfig {
  readonly model: string;
  readonly effort: PropositionCoverageEffort;
  readonly maxTokens: number;
}

export interface PropositionCoverageCall {
  readonly output: PropositionCoverageResult;
  readonly apiMessageId: string;
  readonly model: string;
  readonly effort: PropositionCoverageEffort;
  readonly maxTokens: number;
  readonly latencyMs: number;
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly cacheWriteTokens: number;
    readonly cacheReadTokens: number;
  };
  readonly rawContent: unknown;
}

export const PROPOSITION_COVERAGE_SYSTEM = `당신은 학생 응답 하나가 목표 명제를 얼마나 표현했는지 판정한다.

입력에는 목표 명제와 학생 응답만 주어진다. 질문이나 원문 문단을 상상해 보충하지 말고,
오직 학생 응답 자체에 표현된 내용만 사용하라. 각 사례를 다른 사례와 비교하지 말고 독립적으로 판정하라.

목표 명제 계약:
- targetProposition.text는 목표 명제의 규범적 자연어 표현이다.
- relation, predicate, argument, aspect, subjectRole은 text의 의미 프레임을 구별하는 구조적 해석 보조 정보이며,
  의미 계약의 완전한 필드 목록이 아니다.
- 구조 필드에 없더라도 text의 진리조건을 바꾸는 주장 귀속, 구체 술어, 논항 역할과 방향, 부정과 양태,
  조건, 첫 번째·두 번째 같은 순서 역할은 필수일 수 있다.
- text와 구조 필드가 어긋나거나 구조 필드가 지나치게 넓으면 text의 구체적인 명제 의미를 우선한다.
- relation.kind가 넓은 범주라는 이유로 text의 구체 술어를 다른 관계로 대체하지 마라.

판정:

explicit
- 응답 자체가 목표와 동일한 의미 프레임을 주장하고 필수 참여자·역할·방향·조건을 모두 보존했다.
- 목표 명제와 같은 문구일 필요는 없다.

partial
- 응답이 목표 명제와 같은 의미 프레임의 일부를 실제로 표현했다.
- 필수 참여자, 역할, 조건, 자격, 순서, 병렬 endpoint 중 일부만 빠졌다.
- 응답의 기존 관계를 유지하고 누락 요소만 보충하면 목표 명제가 된다.

none
- 단어·주제만 겹친다.
- 목표와 관련된 개념을 사용하지만 다른 술어 관계를 표현한다.
- 목표 명제를 만들려면 새로운 관계를 추가하거나 기존 관계를 교체해야 한다.

핵심 completion test:
- 응답에 표현된 관계를 그대로 유지한 채 누락 요소만 보충할 수 있으면 pass다.
- 관계를 새로 추가하거나 교체해야 하면 fail이다.
- 이미 완전한 explicit도 보충 없이 목표 명제이므로 pass다.
- partial은 반드시 pass, none은 반드시 fail이어야 한다.

주의:
- 응답에 없는 관계를 배경지식, 논리적 함의, 인접 명제로부터 만들어내지 마라.
- 같은 주체를 다룬다는 이유만으로 같은 predicate frame으로 보지 마라.
- 개념의 나열 순서에서 첫 번째·두 번째 역할을 추론하지 마라.
- 주장 귀속이 관점 대립을 구별하면 귀속 주체를 보존해야 한다.
- predicate, argument, aspect, subjectRole이 다른 인접 명제를 목표 명제의 partial로 자동 인정하지 마라.
- 표현상의 수식어나 중복 표현이 빠졌다는 이유만으로 partial로 낮추지 말고 핵심 관계의 진리조건이
  달라지는지 판정하라.
- 한쪽 개념의 단순 출현만으로 partial을 주지 마라.
- 두 개념이 모두 있어도 서로 다른 관계로 연결됐으면 none이다.
- 분류 비율을 맞추려 하지 마라.
- evidence는 학생 응답에서 실제 문자열을 짧게 인용하라.`;

export function propositionCoverageConfig(): PropositionCoverageConfig {
  const rawEffort = process.env['EVAL_EFFORT'];
  const effort = rawEffort === undefined ? 'medium' : EFFORTS.find((x) => x === rawEffort);
  if (effort === undefined) {
    throw new Error(`EVAL_EFFORT가 잘못됐다: ${rawEffort} (${EFFORTS.join('|')})`);
  }
  return {
    model: process.env['EVAL_MODEL'] ?? MODEL,
    effort,
    maxTokens: 4000,
  };
}

export function propositionCoverageUserPrompt(input: PropositionCoverageInput): string {
  return `목표 명제:\n${JSON.stringify(input.targetProposition, null, 2)}\n\n학생 응답:\n${input.studentResponse}`;
}

export async function evaluatePropositionCoverage(
  input: PropositionCoverageInput,
): Promise<PropositionCoverageCall> {
  const config = propositionCoverageConfig();
  const started = performance.now();
  // 로컬 eval cache와 query evaluator를 거치지 않는다. 같은 입력의 반복도 매번 독립 API
  // request이며, prompt cache를 켜는 cache_control도 사용하지 않는다.
  const response = await getClient().messages.parse({
    model: config.model,
    max_tokens: config.maxTokens,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: config.effort,
      format: zodOutputFormat(PropositionCoverageResultSchema),
    },
    system: PROPOSITION_COVERAGE_SYSTEM,
    messages: [{ role: 'user', content: propositionCoverageUserPrompt(input) }],
  });
  const latencyMs = Math.round(performance.now() - started);
  const output = response.parsed_output;
  if (output === null) throw new Error('evaluatePropositionCoverage: 구조화 출력 파싱 실패');

  return {
    output,
    apiMessageId: response.id,
    model: config.model,
    effort: config.effort,
    maxTokens: config.maxTokens,
    latencyMs,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
    },
    rawContent: response.content,
  };
}
