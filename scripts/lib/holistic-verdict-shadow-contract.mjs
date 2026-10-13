import { z } from 'zod/v4';

export const ShadowSchema = z.object({
  overall: z.enum(['resolved', 'unresolved']),
  understoodRelations: z.array(z.string()),
  brokenRelation: z.object({ description: z.string(), studentQuote: z.string().nullable(),
    kind: z.enum(['missing', 'incorrect', 'inter-axis-relation']) }).strict().nullable(),
  unconfirmed: z.array(z.string()), questionWorthy: z.boolean(), question: z.string().nullable(),
  confidence: z.enum(['high', 'medium', 'low']),
}).strict();
export const AttributionSchema = z.object({ axisAttribution: z.array(z.string()),
  unconfirmedAttribution: z.array(z.array(z.string())), reason: z.string() }).strict();
export const normalizeWhitespace = text => text.replace(/\s+/gu, ' ').trim();
export function isStudentQuote(quote, dialogue) {
  const needle = normalizeWhitespace(quote);
  return !!needle && dialogue.some(d => d.role === 'student' && normalizeWhitespace(d.text).includes(needle));
}
export function validateShadow(raw, dialogue) {
  const parsed = ShadowSchema.safeParse(raw);
  if (!parsed.success) return [`schema: ${parsed.error.message}`];
  const out = parsed.data, errors = [];
  if (out.overall === 'resolved' && (out.brokenRelation !== null || out.questionWorthy || out.question !== null))
    errors.push('resolved requires brokenRelation=null, questionWorthy=false, question=null');
  if (out.overall === 'unresolved' && out.brokenRelation === null) errors.push('unresolved requires brokenRelation');
  if (out.brokenRelation?.studentQuote !== null && out.brokenRelation && !isStudentQuote(out.brokenRelation.studentQuote, dialogue))
    errors.push('studentQuote must be a substring of one student utterance');
  if (out.brokenRelation?.kind === 'incorrect' && out.brokenRelation.studentQuote === null)
    errors.push('incorrect requires studentQuote');
  if (out.questionWorthy ? !out.question?.trim() : out.question !== null)
    errors.push('questionWorthy requires nonempty question; false requires null');
  return errors;
}
export function validateAttribution(raw, axes, unconfirmed) {
  const parsed = AttributionSchema.safeParse(raw);
  if (!parsed.success) return [`schema: ${parsed.error.message}`];
  const out = parsed.data, ids = axes.map(a => a.id), errors = [];
  if ([...out.axisAttribution, ...out.unconfirmedAttribution.flat()].some(id => !ids.includes(id))) errors.push('unknown axis id');
  if (out.unconfirmedAttribution.length !== unconfirmed.length) errors.push('unconfirmedAttribution length mismatch');
  return errors;
}
export const shouldAttribute = (raw, errors) => errors.length === 0 && raw.overall === 'unresolved';
export function summarizeV4(axes, contractError = null) {
  if (contractError || !axes?.length || axes.some(a => !['PASS','UNCLEAR_OK','UNCLEAR_SERIOUS','ERROR'].includes(a.status))) return 'contract-failed';
  return axes.some(a => ['UNCLEAR_SERIOUS', 'ERROR'].includes(a.status)) ? 'unresolved' : 'resolved';
}
export function effectiveShadow(raw, errors, v4) {
  if (errors.length) return { rawOverall: raw?.overall ?? null, effectiveOverall: 'contract-failed', retracted: false };
  const retracted = v4 === 'resolved' && raw.overall === 'unresolved' && raw.brokenRelation.studentQuote === null;
  return { rawOverall: raw.overall, effectiveOverall: retracted ? 'resolved' : raw.overall, retracted };
}
export function reviewFlag(v4, raw, errors, dialogue) {
  return errors.length === 0 && raw.overall === 'resolved' && v4.axes.some(a => a.status === 'ERROR' &&
    v4.errorClaims.some(e => e.axisId === a.axisId && isStudentQuote(e.evidence, dialogue)));
}
