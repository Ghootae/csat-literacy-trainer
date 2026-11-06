// 사고 진단 v0.1(D-0111·D-0115·D-0205 1). scripts/test-thought-diagnosis-v0.mjs의 requestFor와
// scripts/test-thought-diagnosis-v01.mjs의 스키마·출력 검증을 옮긴 것이다. 지시문·스키마는 바꾸지 않는다.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod/v4';
import type { FeedbackTransport } from '../problem-solving/feedback-evaluator.js';

export const THOUGHT_DIAGNOSIS_MODEL = 'gpt-6.1-sol';
export const THOUGHT_DIAGNOSIS_MAX_OUTPUT_TOKENS = 6000;
export const THOUGHT_DIAGNOSIS_TIMEOUT_MS = 90000;
export const THOUGHT_DIAGNOSIS_SCHEMA_NAME = 'thought_diagnosis_v01';
export const THOUGHT_DIAGNOSIS_DIR = 'docs/experiments/thought-diagnosis-v01-2026-10-10';

export const THOUGHT_STEPS = ['S1_STEM', 'S2_CHOICE', 'S3_LOCATE', 'S4_INTERPRET', 'S5_JUDGE'] as const;
const OUTCOMES = ['NONE', 'ERROR', 'INSUFFICIENT', 'POLARITY_MISMATCH', 'SELF_CONTRADICTION', 'UNJUDGEABLE'] as const;
const TAGS = ['POLARITY', 'REFERENT', 'ATTRIBUTION', 'DIRECTION', 'CONDITION', 'SCOPE', 'MAPPING',
  'SURFACE_MATCH', 'PARAPHRASE_DISTANCE', 'MULTI_STEP', 'OUTSIDE_KNOWLEDGE', 'MISREAD_FACT'] as const;
// v0 스키마에 v0.1이 outcomeType을 바꾸고 unjudgeableReason·guessed를 덧붙인 모양. 키 순서가 JSON 스키마 해시에 들어간다.
export const ThoughtDiagnosisOutputSchema = z.strictObject({
  caseId: z.string(), outcomeType: z.enum(OUTCOMES),
  steps: z.strictObject(Object.fromEntries(THOUGHT_STEPS.map(s => [s, z.enum(['PASS', 'FAIL', 'NOT_OBSERVED'])])) as Record<typeof THOUGHT_STEPS[number], z.ZodEnum<{ PASS: 'PASS'; FAIL: 'FAIL'; NOT_OBSERVED: 'NOT_OBSERVED' }>>),
  firstFailedStep: z.enum(THOUGHT_STEPS).nullable(),
  errors: z.array(z.strictObject({ tag: z.enum(TAGS), step: z.enum(THOUGHT_STEPS), studentQuote: z.string() })),
  note: z.string(),
  unjudgeableReason: z.enum(['NO_CONTENT', 'GUESS_ONLY', 'CONTRADICTORY']).nullable(),
  guessed: z.boolean(),
});
export type ThoughtDiagnosisOutput = z.infer<typeof ThoughtDiagnosisOutputSchema>;
export const THOUGHT_DIAGNOSIS_JSON_SCHEMA = z.toJSONSchema(ThoughtDiagnosisOutputSchema);
export const jsonHash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');

export function loadThoughtDiagnosisPrompts(root = process.cwd()): { instructions: string } {
  return JSON.parse(readFileSync(resolve(root, THOUGHT_DIAGNOSIS_DIR, 'prompts.json'), 'utf8')) as { instructions: string };
}

/** v0.1 validateOutput과 같은 규칙. 의미 규칙(INSUFFICIENT/UNJUDGEABLE에 FAIL 없음 등)은 지표일 뿐이라 검사하지 않는다. */
export function validateThoughtDiagnosisOutput(value: unknown, caseId: string): ThoughtDiagnosisOutput {
  const result = ThoughtDiagnosisOutputSchema.parse(value);
  if (result.caseId !== caseId) throw new Error('CASE_ID');
  if (result.firstFailedStep !== (THOUGHT_STEPS.find(s => result.steps[s] === 'FAIL') ?? null)) throw new Error('FIRST_FAILED_STEP');
  if ((result.unjudgeableReason !== null) !== (result.outcomeType === 'UNJUDGEABLE')) throw new Error('UNJUDGEABLE_REASON');
  const hasErrors = result.outcomeType === 'ERROR' || result.outcomeType === 'POLARITY_MISMATCH';
  if ((result.errors.length > 0) !== hasErrors) throw new Error('ERRORS_OUTCOME');
  return result;
}

export interface ThoughtDiagnosisStudent { caseId: string; choiceId: string; rationale: string }
const serialize = (v: unknown) => JSON.stringify(v, null, 2) + '\n';
/** source: 문항 묶음(SourceDirectProblemBundle과 같은 모양). 학생·원자료 필드만 화이트리스트로 넘긴다. */
export function thoughtDiagnosisRequest(source: any, student: ThoughtDiagnosisStudent, instructions: string) {
  const { schemaVersion, questionId, questionNumber, passageId, title, exam, passage, stem, stemPolarity,
    scenario, textAnnotations, choices, answerChoiceId, officialExplanation } = source;
  const media = (source.media as any[]).map(({ mediaId, url, mimeType, width, height, contentHash, placement }) =>
    ({ mediaId, url, mimeType, width, height, ...(contentHash === undefined ? {} : { contentHash }), placement }));
  const input = { source: { schemaVersion, questionId, questionNumber, passageId, title, exam, passage,
    stem, stemPolarity, scenario, textAnnotations, choices: (choices as any[]).map(({ choiceId, position, text }) => ({ choiceId, position, text })),
    answerChoiceId, officialExplanation, media }, student: { caseId: student.caseId, choiceId: student.choiceId, rationale: student.rationale } };
  return { model: THOUGHT_DIAGNOSIS_MODEL, instructions, reasoning: { effort: 'medium' }, max_output_tokens: THOUGHT_DIAGNOSIS_MAX_OUTPUT_TOKENS,
    input: [{ role: 'user', content: [{ type: 'input_text', text: serialize(input) },
      ...media.map(m => ({ type: 'input_image', image_url: m.url, detail: 'high' }))] }],
    text: { format: { type: 'json_schema', name: THOUGHT_DIAGNOSIS_SCHEMA_NAME, strict: true, schema: THOUGHT_DIAGNOSIS_JSON_SCHEMA } } };
}

export interface ThoughtDiagnosisCall {
  output: ThoughtDiagnosisOutput;
  metadata: { model: string; durationMs: number; inputTokens: number; outputTokens: number; rawText: string };
}
/** 사고 진단 한 번. 호출은 주입한 transport로만 한다. 실패는 던진다(재시도는 호출자가 정한다). */
export async function diagnoseThought(transport: FeedbackTransport, source: unknown, student: ThoughtDiagnosisStudent,
  instructions: string): Promise<ThoughtDiagnosisCall> {
  const request = thoughtDiagnosisRequest(source, student, instructions);
  const started = performance.now();
  const response = await transport.create(request as never, { timeout: THOUGHT_DIAGNOSIS_TIMEOUT_MS, maxRetries: 0 });
  if (response.status !== 'completed') throw new Error(`RESPONSE_STATUS: ${response.status}`);
  const output = validateThoughtDiagnosisOutput(JSON.parse(response.output_text), student.caseId);
  return { output, metadata: { model: THOUGHT_DIAGNOSIS_MODEL, durationMs: Math.round(performance.now() - started),
    inputTokens: response.usage?.input_tokens ?? 0, outputTokens: response.usage?.output_tokens ?? 0, rawText: response.output_text } };
}
