import { z } from 'zod/v4';
import { CentralAxisDecompositionResultSchema as Base } from '../../packages/pipeline/dist/central-axis-decomposition/schema.js';
import { validateCentralAxisDecompositionResult } from '../../packages/pipeline/dist/central-axis-decomposition/evaluator.js';

// 구조·정확 인용 계약만 검사한다. 핵심성·기능·설명 단위의 의미 타당성은 사람 검토 대상이다.
export const norm = (text) => String(text ?? '').replace(/\s+/gu, ' ').trim();
const contains = (whole, part) => norm(part).length > 0 && norm(whole).includes(norm(part));
export const ROLES = ['introduction', 'conclusion', 'general'];
export const effectiveRole = (pf) => pf.uncertain ? 'general' : pf.role;

// axis-audit-v2-contract.mjs의 sentenceCount와 동일한 경계를 사용한다.
export function splitSentences(text) {
  const t = norm(text), sentences = [];
  let start = 0;
  for (const match of t.matchAll(/[.?!](?:["'”’)\]*]*)(?=\s|$)/gu)) {
    const end = match.index + match[0].length;
    sentences.push(t.slice(start, end).trim());
    start = end;
  }
  const tail = t.slice(start).trim();
  if (tail) sentences.push(tail);
  return sentences;
}

export const Stage1 = z.object({
  paragraphId: z.string(), centralStory: z.string(), revisedCentralStory: z.string().min(1),
  additions: z.array(z.object({ content: z.string().min(1), sourceQuote: z.string().min(1), reason: z.string().min(1) })),
  paragraphFunction: z.object({ role: z.enum(ROLES), uncertain: z.boolean(), evidenceQuote: z.string(), reason: z.string().min(1) }),
  explanationUnits: z.array(z.object({ id: z.string(), summary: z.string().min(1) })).min(1),
  sentenceAssignments: z.array(z.object({ sentenceId: z.string(), unit: z.string(), reason: z.string().min(1) })).min(1),
});
export const Gen = Base.extend({
  schemaVersion: z.literal('central-axis-meta-openai-v1'),
  centralAxes: z.array(Base.shape.centralAxes.element.extend({ metaAxis: z.string().min(1) })).min(1),
});

export function isAppendOnly(original, revised) {
  const chars = [...norm(original)];
  let cursor = 0;
  for (const char of norm(revised)) if (cursor < chars.length && char === chars[cursor]) cursor++;
  return cursor === chars.length;
}
export const minimumAxes = (out) => effectiveRole(out.paragraphFunction) === 'general' && out.explanationUnits.length >= 2 ? 2 : 1;
export const stage2InputFor = (out) => ({
  paragraphId: out.paragraphId, centralStory: out.revisedCentralStory,
  minimumAxes: minimumAxes(out), explanationUnits: out.explanationUnits,
});

export function validateStage1(input, raw) {
  const parsed = Stage1.safeParse(raw);
  if (!parsed.success) return [`stage1 schema: ${parsed.error.message}`];
  const out = parsed.data, errors = [], body = input.sentences.map(s => s.text).join(' ');
  if (out.paragraphId !== input.paragraphId) errors.push('paragraphId 불일치');
  if (out.centralStory !== input.centralStory) errors.push('centralStory 불일치');
  if (!isAppendOnly(input.centralStory, out.revisedCentralStory)) errors.push('revisedCentralStory 삭제·치환: 덧붙이기 계약 위반');
  if (!out.additions.length && norm(out.revisedCentralStory) !== norm(input.centralStory)) errors.push('additions 없음에도 revisedCentralStory 변경');
  for (const [i, a] of out.additions.entries()) {
    if (!contains(out.revisedCentralStory, a.content)) errors.push(`additions[${i}].content가 보강본에 없음`);
    if (!contains(body, a.sourceQuote)) errors.push(`additions[${i}].sourceQuote가 원문 인용이 아님`);
  }
  if (effectiveRole(out.paragraphFunction) !== 'general' && !contains(body, out.paragraphFunction.evidenceQuote)) errors.push('evidenceQuote가 원문 인용이 아님');
  const ids = out.explanationUnits.map(u => u.id);
  if (ids.some((id, i) => id !== `E${i + 1}`)) errors.push('explanationUnits ID 순서 오류');
  if (out.sentenceAssignments.length !== input.sentences.length || out.sentenceAssignments.some((a, i) => a.sentenceId !== input.sentences[i]?.id)) errors.push('sentenceAssignments 문장 누락·순서 오류');
  for (const a of out.sentenceAssignments) if (a.unit !== 'CONNECTIVE' && !ids.includes(a.unit)) errors.push(`${a.sentenceId}: 알 수 없는 단위 ${a.unit}`);
  for (const id of ids) if (!out.sentenceAssignments.some(a => a.unit === id)) errors.push(`${id}: 빈 설명 단위`);
  return errors;
}

export function validateStage2(input, raw) {
  let out;
  try { out = Gen.parse(raw); }
  catch (error) { return [`stage2 schema: ${error.message}`]; }
  const errors = [];
  try {
    const { centralAxes, ...rest } = out;
    validateCentralAxisDecompositionResult(Base.parse({ ...rest, schemaVersion: 'central-axis-decomposition-openai-v2', centralAxes: centralAxes.map(({ id, description }) => ({ id, description })) }), { paragraphId: input.paragraphId, centralStory: input.centralStory });
  } catch (error) { errors.push(error.message); }
  if (out.verdict !== 'READY') errors.push(`stage2 verdict: ${out.verdict}`);
  if (out.centralAxes.some((a, i) => a.id !== `AX${i + 1}`)) errors.push('centralAxes ID 순서 오류');
  if (out.centralAxes.length < input.minimumAxes) errors.push(`minimumAxes=${input.minimumAxes}: 축 수 ${out.centralAxes.length} 미달`);
  if (out.centralAxes.some(a => !norm(a.metaAxis))) errors.push('빈 metaAxis');
  return errors;
}

// v1을 그대로 재사용하되 출력의 centralStory 생략과 보충 근거 제한만 추가한다.
export const Stage1V2 = Stage1.omit({ centralStory: true });
export function validateStage1V2(input, raw) {
  const parsed = Stage1V2.safeParse(raw);
  if (!parsed.success) return [`stage1 schema: ${parsed.error.message}`];
  const out = parsed.data;
  const errors = validateStage1(input, { ...out, centralStory: input.centralStory });
  const unitIds = new Set(out.explanationUnits.map(u => u.id));
  const explanatoryIds = new Set(out.sentenceAssignments.filter(a => unitIds.has(a.unit)).map(a => a.sentenceId));
  // 연속된 설명 단위 문장 구간마다 묶는다. 근거가 두 문장에 걸쳐도 CONNECTIVE 문장을 포함하지 않으면 허용한다.
  const explanatoryRuns = [];
  let run = [];
  for (const s of input.sentences) {
    if (explanatoryIds.has(s.id)) run.push(s.text);
    else if (run.length) { explanatoryRuns.push(run.join(' ')); run = []; }
  }
  if (run.length) explanatoryRuns.push(run.join(' '));
  for (const [i, addition] of out.additions.entries()) {
    if (!explanatoryRuns.some(text => contains(text, addition.sourceQuote))) {
      errors.push(`additions[${i}].sourceQuote: CONNECTIVE 문장 내용 보충 또는 설명 단위 문장 근거 없음`);
    }
  }
  return errors;
}

// v3는 문단 기능 면제 없이 설명 단위 수만 사용한다. v1·v2 함수는 유지한다.
export const minimumAxesV3 = (out) => out.explanationUnits.length >= 2 ? 2 : 1;
export const stage2InputForV3 = (out) => ({ ...stage2InputFor(out), minimumAxes: minimumAxesV3(out) });
