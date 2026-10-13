import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const sha = value => createHash('sha256').update(value).digest('hex');
// Cohort boundaries copied from the source-reviewed actual-use packet generator.
export const WINDOWS = [
  ['gongsun-long-later-mohists', '06:45', '07:00', 5],
  ['dopamine-motor-control', '07:35', '07:55', 4],
  ['corporate-law', '11:06', '11:46', 5],
  ['information-asymmetry-free-marketplace', '11:45', '12:12', 5],
  ['surface-tension-laplace', '12:11', '12:30', 6],
  ['mrna-vaccine-lipid-nanoparticle', '12:30', '13:04', 5],
];
export function selectRecords(lines) {
  const rows = lines.map((text, i) => ({ row: JSON.parse(text), sourceLine: i + 1, sourceLineHash: sha(text) }));
  const selected = [];
  for (const [pid, start, end, count] of WINDOWS) {
    const subset = rows.filter(({ row: r }) => r.paragraphId.startsWith(`${pid}-p`) &&
      r.startedAt >= `2026-09-11T${start}:00.000Z` && r.startedAt < `2026-09-11T${end}:00.000Z`);
    assert.equal(subset.length, count, pid);
    assert.equal(new Set(subset.map(x => x.row.paragraphId)).size, count);
    selected.push(...subset.map(x => ({ ...x, cohort: 'six-passage-user-use' })));
  }
  const recent = rows.filter(x => x.row.sessionId === '8e2ead22-27ef-44d5-af37-115b9083f238');
  assert.equal(recent.length, 1);
  selected.push({ ...recent[0], cohort: 'confirmed-recent-gongsun-p1' });
  assert.equal(new Set(selected.map(x => x.row.sessionId)).size, selected.length);
  return selected;
}

export function casesFromRecord(record) {
  const { row } = record, history = [], revealedAxisContent = [], shownSourceGuides = [], cases = [];
  for (let i = 0; i < row.turns.length; i++) {
    const t = row.turns[i];
    assert.equal(history.length, i, 'Every included evaluation must follow an answered question');
    cases.push({ paragraphId: row.paragraphId, sessionId: row.sessionId, sourceLine: record.sourceLine,
      sourceLineHash: record.sourceLineHash, cohort: record.cohort, turn: i + 1,
      stratum: i === 0 ? 'initial' : 'followup', initialResponse: row.initialResponse,
      history: structuredClone(history), revealedAxisContent: structuredClone(revealedAxisContent),
      shownSourceGuides: structuredClone(shownSourceGuides) });
    if (i + 1 === row.turns.length) break;
    assert.equal(typeof t.studentAnswer, 'string');
    assert.ok(t.questionShown?.trim());
    assert.equal(t.evaluation.nextQuestion?.text, t.questionShown);
    assert.ok(['DIAGNOSTIC', 'CORRECTIVE'].includes(t.evaluation.nextQuestion.type));
    history.push({ question: { type: t.evaluation.nextQuestion.type, text: t.questionShown }, answer: t.studentAnswer });
    for (const a of t.evaluation.snapshot?.axisFeedback ?? []) if (a.revealedText?.trim()) {
      revealedAxisContent.push({ axisId: a.axisId, text: a.revealedText, turn: i + 1 });
    }
    const guide = t.evaluation.sourceGuide;
    if (guide) shownSourceGuides.push({ axisId: guide.axisId, quote: guide.quote, turn: i + 1 });
  }
  return cases;
}
export const needsQuestion = axes => axes.some(a => ['UNCLEAR_SERIOUS', 'ERROR'].includes(a.status));
export const signature = axes => [...axes].sort((a, b) => a.axisId.localeCompare(b.axisId)).map(a => `${a.axisId}:${a.status}`).join('|');
export function compareAxes(v4, direct, questionsAsked) {
  if (!v4 || !direct) return { comparable: false };
  assert.deepEqual(v4.map(a => a.axisId).sort(), direct.map(a => a.axisId).sort());
  const changes = v4.filter(a => direct.find(b => b.axisId === a.axisId).status !== a.status)
    .map(a => ({ axisId: a.axisId, v4: a.status, direct: direct.find(b => b.axisId === a.axisId).status }));
  const axisInterventionChange = changes.some(x => needsQuestion([{ status: x.v4 }]) !== needsQuestion([{ status: x.direct }]));
  return { comparable: true, changes, same: !changes.length, axisInterventionChange,
    v4NeedsQuestion: needsQuestion(v4), directNeedsQuestion: needsQuestion(direct),
    paragraphInterventionChange: needsQuestion(v4) !== needsQuestion(direct),
    questionSlotAvailable: questionsAsked < 3,
    errorBoundaryChange: changes.some(x => x.v4 === 'ERROR' || x.direct === 'ERROR') };
}
// Fixed hash order, independently sampled in each response stratum. Not a population estimate.
export function reviewSelection(comparisons, cases) {
  const mandatory = comparisons.filter(x => !x.raw.comparable || !x.raw.same || x.contractFailure).map(x => x.caseId);
  const agreement = [];
  for (const stratum of ['initial', 'followup']) {
    agreement.push(...comparisons.filter(x => x.raw.same && !x.contractFailure && cases.find(c => c.id === x.caseId).stratum === stratum)
      .sort((a, b) => sha(`agreement-v1:${a.caseId}`).localeCompare(sha(`agreement-v1:${b.caseId}`))).slice(0, 3).map(x => x.caseId));
  }
  return { mandatory, agreement, blindOrder: [...mandatory, ...agreement]
    .sort((a, b) => sha(`blind-v1:${a}`).localeCompare(sha(`blind-v1:${b}`))) };
}
