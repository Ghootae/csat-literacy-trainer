import { readFileSync } from 'node:fs';
import OpenAI from 'openai';
import { OpenAICentralStoryGateEvaluator, type CentralStoryGateEvaluator } from './gate.js';
import type { DialogueEvaluationInput } from './evaluator.js';

export const MATERIALITY_PROMPT_PATH = 'packages/pipeline/experiments/dialogue/axis-missing-materiality-prompt-v1.md';
export const MATERIALITY_VERSION = 'central-story-gate-v4-missing-materiality-v1';
export type MaterialityArm = 'baseline' | 'candidate';
const start = '각 축의 의미 판정(axisStates)과 다음 학생용 공개 상태(axisFeedback)를 같은 호출에서 정한다.';
const end = 'revealedText는 학생 직접 인용도 누적 학생 응답도 아니다.';

/** Experimental replacement only; original V4 file and runtime defaults stay untouched. */
export function materialityInstructions(instructions: string, arm: MaterialityArm): string {
  if (arm === 'baseline') return instructions;
  const from = instructions.indexOf(start), to = instructions.indexOf(end);
  if (from < 0 || to <= from || instructions.indexOf(start, from + 1) !== -1) throw new Error('materiality experiment: prompt anchor mismatch');
  return instructions.slice(0, from) + readFileSync(MATERIALITY_PROMPT_PATH, 'utf8').trim() + '\n' + instructions.slice(to);
}

export class MaterialityGateExperiment implements CentralStoryGateEvaluator {
  constructor(private readonly options: { arm: MaterialityArm; client?: OpenAI }) {}
  async evaluate(input: DialogueEvaluationInput) {
    const transport = this.options.client ?? new OpenAI({ maxRetries: 0 });
    const wrapped = { responses: { parse: (request: Parameters<OpenAI['responses']['parse']>[0], options: Parameters<OpenAI['responses']['parse']>[1]) => {
      if (typeof request.instructions !== 'string') throw new Error('materiality experiment: missing instructions');
      return transport.responses.parse({ ...request, instructions: materialityInstructions(request.instructions, this.options.arm) }, options);
    } } } as unknown as OpenAI;
    const out = await new OpenAICentralStoryGateEvaluator({ client: wrapped, promptRevision: 'v4',
      model: 'gpt-5.6-terra', effort: 'medium', maxTransportRetries: 0, maxContractRetries: 0,
    }).evaluate(input);
    return { ...out, call: { ...out.call, promptVersion: this.options.arm === 'candidate' ? MATERIALITY_VERSION : out.call.promptVersion } };
  }
}
