// Compares two v5 diverse-48 run directories (local files only, no API calls).
// Usage: node scripts/compare-v5-diverse-48-regression.mjs <newDir> [oldDir] [outDir]
//   oldDir defaults to the 2026-10-12 run, outDir to newDir. Writes COMPARISON.json and COMPARISON.md.
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { specs } from './v5-diverse-48-cases.mjs';

export const OLD_DIR = 'docs/experiments/v5-diverse-48-2026-10-12';
const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
const answerOf = Object.fromEntries(specs.map(s => [s.questionId, `C${s.answer}`]));

/** endReason is internal (not in the public view); read it from the saved session records, like the runner does. */
function endReasonOf(dir, id) {
  const p = `${dir}/cases/${id}.records.jsonl`;
  if (!existsSync(p)) return null;
  const rows = readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  return rows.map(r => r.session?.pendingEnd?.endReason).filter(Boolean).at(-1) ?? null;
}

function judgment(rawOutput, attempts, choiceId) {
  const raw = rawOutput ?? {};
  // claimConflicts/keyRelationCoverage are stripped from the call's rawOutput; they survive in the successful attempt.
  const full = [...(attempts ?? [])].reverse().find(a => a.outcome === 'SUCCESS' && a.rawOutput)?.rawOutput ?? {};
  const errors = raw.errors ?? [], hasBasis = errors.every(e => e.basis);
  const coverage = full.keyRelationCoverage ?? raw.keyRelationCoverage;
  return {
    choiceId: choiceId ?? null,
    reconstructability: raw.reconstructability ?? null,
    contentAssessment: raw.contentAssessment ?? null,
    errors: errors.length,
    stated: hasBasis ? errors.filter(e => e.basis === 'STATED').length : null,
    inferred: hasBasis ? errors.filter(e => e.basis === 'INFERRED').length : null,
    insufficiencyKind: raw.insufficiencyKind ?? null,
    claimConflicts: Array.isArray(full.claimConflicts ?? raw.claimConflicts) ? (full.claimConflicts ?? raw.claimConflicts).length : null,
    keyRelationCoverage: Array.isArray(coverage)
      ? { pieces: coverage.length, emptyPieces: coverage.filter(c => !c.covered).length, empty: coverage.filter(c => !c.covered).map(c => c.element) }
      : null,
  };
}

export function summarizeCase(dir, id) {
  const state = readJson(`${dir}/cases/${id}.json`), last = state.steps.at(-1)?.view ?? state.view ?? null;
  const selects = state.steps.filter(s => s.command?.type === 'SELECT').map(s => s.command.choiceId);
  const judgments = state.steps.flatMap(s => s.evaluations ?? []).filter(e => e.kind === 'SELECTION' && e.status === 'SUCCESS')
    .map((e, i) => judgment(e.call?.rawOutput, e.call?.metadata?.attempts, selects[i]));
  const evals = state.steps.flatMap(s => s.evaluations ?? []);
  const endReason = endReasonOf(dir, id);
  return {
    id, role: state.case.role ?? state.case.group ?? null, questionId: state.case.questionId,
    outcome: last?.result?.outcome ?? null, phase: last?.phase ?? null,
    endReason: endReason ?? (last ? `phase:${last.phase}` : null),
    selections: last?.selectionCount ?? null, questions: last?.questionsAsked ?? null,
    first: judgments[0] ?? null, second: judgments[1] ?? null,
    // Retries = failed attempts inside evaluations that finally succeeded; evaluations that ended in ERROR (e.g. connection) are counted separately.
    verificationRetries: evals.filter(e => e.status === 'SUCCESS').flatMap(e => e.call?.metadata?.attempts ?? []).filter(a => a.outcome !== 'SUCCESS').length,
    evaluationErrors: evals.filter(e => e.status === 'ERROR').length,
  };
}

const KEYS = ['outcome', 'endReason', 'selections', 'questions'];
export function compare(oldDir, newDir) {
  const ids = readdirSync(`${newDir}/cases`).filter(f => /\.json$/.test(f) && !f.includes('.step-') && !f.includes('.records')).map(f => f.slice(0, -5)).sort();
  const rows = ids.map(id => {
    const old = existsSync(`${oldDir}/cases/${id}.json`) ? summarizeCase(oldDir, id) : null, cur = summarizeCase(newDir, id);
    // Fields the 2026-10-12 judgments never recorded stay null (insufficiencyKind, claimConflicts, keyRelationCoverage, retries).
    if (old) { old.verificationRetries = null; }
    return { id, role: cur.role, old, new: cur, changed: !!old && KEYS.some(k => old[k] !== cur[k]) };
  });
  const dist = (side, role) => rows.filter(r => r.role === role && r[side]).reduce((m, r) => { const k = r[side].outcome ?? 'null'; m[k] = (m[k] ?? 0) + 1; return m; }, {});
  const roles = [...new Set(rows.map(r => r.role))];
  const nonSupported = rows.flatMap(r => [['first', r.new.first], ['second', r.new.second]].filter(([, j]) => j && j.choiceId === answerOf[r.new.questionId] && j.contentAssessment !== 'SUPPORTED')
    .map(([which, j]) => ({ id: r.id, which, contentAssessment: j.contentAssessment, insufficiencyKind: j.insufficiencyKind, emptyPieces: j.keyRelationCoverage?.empty ?? null })));
  const summary = {
    sessions: rows.length,
    outcomeByRole: Object.fromEntries(roles.map(role => [role, { old: dist('old', role), new: dist('new', role) }])),
    changed: rows.filter(r => r.changed).length, changedIds: rows.filter(r => r.changed).map(r => r.id),
    verificationRetries: rows.reduce((n, r) => n + r.new.verificationRetries, 0),
    claimConflictSessions: rows.filter(r => (r.new.first?.claimConflicts ?? 0) > 0 || (r.new.second?.claimConflicts ?? 0) > 0).map(r => r.id),
    correctChoiceNotSupported: nonSupported,
  };
  return { rows, summary };
}

const fmt = o => Object.entries(o).map(([k, v]) => `${k} ${v}`).join(', ') || '-';
const cell = j => j ? `${j.choiceId ?? '?'} ${j.reconstructability}/${j.contentAssessment}/오류${j.errors}${j.insufficiencyKind ? `/${j.insufficiencyKind}` : ''}${j.claimConflicts ? `/충돌${j.claimConflicts}` : ''}${j.keyRelationCoverage ? `/조각${j.keyRelationCoverage.pieces}(빈${j.keyRelationCoverage.emptyPieces})` : ''}` : '-';
export function renderMarkdown({ rows, summary }) {
  const L = ['# COMPARISON', '', `세션 ${summary.sessions}개, changed ${summary.changed}개, 검증 재시도 합계 ${summary.verificationRetries}`, '', '## 역할별 outcome (10-12 / 이번)', '',
    '| 역할 | 10-12 | 이번 |', '|---|---|---|', ...Object.entries(summary.outcomeByRole).map(([r, d]) => `| ${r} | ${fmt(d.old)} | ${fmt(d.new)} |`), '',
    `## changed 세션 (${summary.changed})`, '', summary.changedIds.join(', ') || '-', '', '## claimConflicts가 비어 있지 않은 세션', '', summary.claimConflictSessions.join(', ') || '-', '',
    '## 정답 선택 SELECTION에서 SUPPORTED가 아닌 세션', '', ...(summary.correctChoiceNotSupported.length ? ['| 세션 | 판정 | 평가 | 부족 종류 | 빈 조각 |', '|---|---|---|---|---|',
      ...summary.correctChoiceNotSupported.map(n => `| ${n.id} | ${n.which} | ${n.contentAssessment} | ${n.insufficiencyKind ?? '-'} | ${(n.emptyPieces ?? []).join(' / ') || '-'} |`)] : ['-']), '',
    '## 세션별', '', '| 세션 | changed | outcome 10-12 -> 이번 | 종료 이유 10-12 -> 이번 | 선택 | 질문 | 첫 판정 이번 | 재선택 판정 이번 | 재시도 |', '|---|---|---|---|---|---|---|---|---|',
    ...rows.map(r => `| ${r.id} | ${r.changed ? 'Y' : ''} | ${r.old?.outcome ?? '-'} -> ${r.new.outcome} | ${r.old?.endReason ?? '-'} -> ${r.new.endReason} | ${r.old?.selections ?? '-'} -> ${r.new.selections} | ${r.old?.questions ?? '-'} -> ${r.new.questions} | ${cell(r.new.first)} | ${cell(r.new.second)} | ${r.new.verificationRetries} |`), ''];
  return L.join('\n');
}

export function writeComparison(oldDir, newDir, outDir = newDir) {
  const result = compare(oldDir, newDir);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/COMPARISON.json`, JSON.stringify(result, null, 2) + '\n');
  writeFileSync(`${outDir}/COMPARISON.md`, renderMarkdown(result));
  return result.summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [newDir, oldDir = OLD_DIR, outDir = newDir] = process.argv.slice(2);
  if (!newDir) { console.error('Usage: node scripts/compare-v5-diverse-48-regression.mjs <newDir> [oldDir] [outDir]'); process.exit(1); }
  const s = writeComparison(oldDir, newDir, outDir);
  console.log(JSON.stringify({ sessions: s.sessions, changed: s.changed, verificationRetries: s.verificationRetries, claimConflictSessions: s.claimConflictSessions.length, correctChoiceNotSupported: s.correctChoiceNotSupported.length }));
}
