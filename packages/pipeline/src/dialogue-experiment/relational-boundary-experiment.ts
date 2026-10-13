import { readFileSync } from 'node:fs';
import type OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { DIRECT_JUDGMENT_PROMPT_PATH, DirectJudgmentSchema, validateDirectJudgment } from './direct-judgment-experiment.js';

export const RELATIONAL_BOUNDARY_VERSION = 'axis-direct-judgment-v2-relational-boundary';
export type BoundaryArm = 'v1' | 'candidate';
// These are prose replacements only, never a new ontology or model output field.
export const OLD_RELATION_RULE = '명확한 수정·철회는 반영하고, 학생이 말하지 않은 핵심 관계를 원문이나 정답에서 보충하지 않는다. 단순 나열에 관계를 만들어 주지 않는다.';
export const NEW_RELATION_RULE = '명확한 수정·철회는 반영한다.\n\n중심축의 핵심이 대조·인과·조건·예외·변화 방향·역할·대응·논쟁·포함 범위 같은 관계라면, 관련 대상이 모두 등장했다는 사실만으로 그 관계를 이해했다고 판단하지 않는다. 핵심 관계는 학생 표현에서 실제로 드러나야 하며, 학생이 말하지 않은 관계를 원문·정답·상식으로 보충하지 않는다.';
export const OLD_PASS_RULE = '- PASS: 중심 설명이 충분히 보존된다. 자기 말로 압축하거나 부수적 위상·수식·구체화를 생략한 것만으로 미완료로 남기지 않는다.';
export const NEW_PASS_RULE = '- PASS: 중심 설명이 충분히 보존된다. 핵심 관계를 자기 말로 표현했다면 대표성·전문성·강조·위상 같은 부수적 수식이나 중복 구체화가 빠졌다는 이유만으로 미완료로 남기지 않는다.';

export function relationalBoundaryInstructions(base: string, arm: BoundaryArm): string {
  if (arm === 'v1') return base;
  for (const old of [OLD_RELATION_RULE, OLD_PASS_RULE]) {
    if (base.split(old).length !== 2) throw new Error('relational boundary: prompt anchor mismatch');
  }
  return base.replace(OLD_RELATION_RULE, NEW_RELATION_RULE).replace(OLD_PASS_RULE, NEW_PASS_RULE);
}

/** Matches the existing gate payload. Pair labels, types and expectations stay outside it. */
export interface BoundaryPayload {
  paragraphText: string;
  centralAxes: { id: string; description: string }[];
  evidence: { initialResponse: string; followUpExchanges: []; previousAxisStates: null };
  turn: 1;
}
export interface BoundaryPair {
  id: string;
  category: string;
  targetAxisId: string;
  sourceParagraphId?: string;
  synthetic?: Pick<BoundaryPayload, 'paragraphText' | 'centralAxes'>;
  insufficient: string;
  sufficient: string;
  note: string;
  anchor?: string;
}
export function boundaryPayload(pair: BoundaryPair, side: 'insufficient' | 'sufficient',
  sources: Record<string, { gold: Pick<BoundaryPayload, 'paragraphText' | 'centralAxes'> }>): BoundaryPayload {
  if (Boolean(pair.sourceParagraphId) === Boolean(pair.synthetic)) throw new Error('exactly one source required');
  const source = pair.sourceParagraphId ? sources[pair.sourceParagraphId]?.gold : pair.synthetic;
  if (!source || !source.centralAxes.some(a => a.id === pair.targetAxisId)) throw new Error('missing source or target axis');
  return {
    paragraphText: source.paragraphText,
    centralAxes: source.centralAxes.map(({ id, description }) => ({ id, description })),
    evidence: { initialResponse: pair[side], followUpExchanges: [], previousAxisStates: null },
    turn: 1,
  };
}
/** Offline metrics, never sent to the model and never used to rewrite its verdict. */
export function boundaryOutcome(raw: unknown, payload: BoundaryPayload, targetAxisId: string, side: 'insufficient' | 'sufficient') {
  try {
    const axes = validateDirectJudgment(raw, payload.centralAxes.map(a => a.id)).axes;
    const target = axes.find(a => a.axisId === targetAxisId);
    if (!target) throw new Error('target absent');
    return {
      contractValid: true, contractError: null, axes,
      overAcceptance: side === 'insufficient' && target.status === 'PASS',
      overHolding: side === 'sufficient' && axes.some(a => a.status !== 'PASS'),
      unsupportedError: axes.some(a => a.status === 'ERROR'),
      otherAxisRegression: axes.some(a => a.axisId !== targetAxisId && a.status !== 'PASS'),
    };
  } catch (e) {
    return { contractValid: false, contractError: String(e), axes: null,
      overAcceptance: null, overHolding: null, unsupportedError: null, otherAxisRegression: null };
  }
}
export function buildBoundaryRequest(payload: BoundaryPayload, arm: BoundaryArm) {
  return {
    model: 'gpt-5.6-terra',
    instructions: relationalBoundaryInstructions(readFileSync(DIRECT_JUDGMENT_PROMPT_PATH, 'utf8').trim(), arm),
    input: JSON.stringify(payload, null, 2),
    reasoning: { effort: 'medium' as const },
    max_output_tokens: 4000,
    store: false,
    text: { format: zodTextFormat(DirectJudgmentSchema, 'axis_direct_judgment') },
  };
}
export async function evaluateBoundary(payload: BoundaryPayload, arm: BoundaryArm, client: OpenAI) {
  const response = await client.responses.parse(buildBoundaryRequest(payload, arm), { timeout: 60_000, maxRetries: 0 });
  if (response.output_parsed == null) throw new Error('relational boundary: missing output');
  return validateDirectJudgment(response.output_parsed, payload.centralAxes.map(a => a.id));
}
