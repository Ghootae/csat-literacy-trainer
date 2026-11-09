// v5.9·v5.10 시험 요약: 칸 파일을 기대 판정·통과 기준과 대조하고 질문 목록을 뽑는다. 외부 호출 없음.
// Usage: node scripts/summarize-judgment-rules-test.mjs <set> [runsDir]   -> <runsDir>/SUMMARY.json, SUMMARY.md
// 설계 기준: docs/experiments/v510-judgment-2026-11-09/DESIGN-DRAFT.md 4절, 인계 docs/handoffs/2026-11-09-v59-v510-test-runners.md
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { SET_NAMES, SET_META, REPLICATES, RUNS_2026_11_08 } from './judgment-rules-test-cases.mjs';

const ENUM = ['SUPPORTED', 'INSUFFICIENT', 'ERROR', 'UNKNOWN'];
const RAISED = 'contentAssessment raised to SUPPORTED: lenient item';
const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
// 기대(충분 SUPPORTED, 부족 INSUFFICIENT, 오류 ERROR)와 최종 판정의 대응. 부족은 INSUFFICIENT 또는 UNKNOWN(D-0213 4번).
export const matches = (expected, verdict) => expected === 'INSUFFICIENT' ? ['INSUFFICIENT', 'UNKNOWN'].includes(verdict) : verdict === expected;
export const KOREAN = { SUPPORTED: '충분', INSUFFICIENT: '부족', UNKNOWN: '부족(판정 불가)', ERROR: '오류', EVALUATION_ERROR: '평가 실패' };
const verdictOf = c => c.status === 'EVALUATION_ERROR' ? 'EVALUATION_ERROR' : c.judge.contentAssessment;
const count = (list, f) => list.filter(f).length;

export function loadCells(dir) {
  return readdirSync(dir).filter(f => f.endsWith('.json') && !['META.json', 'SUMMARY.json'].includes(f)).map(f => readJson(`${dir}/${f}`));
}
/** 재활용 기준 칸(11-08 실행): 사례의 reuse.v58 패턴으로 읽는다. 없는 파일은 건너뛴다. */
export function loadReuse(cases) {
  const out = [];
  for (const c of cases) for (const r of c.reuse?.v58 ?? []) for (const n of [1, 2, 3]) {
    const p = r.pattern.replace('{n}', n);
    if (existsSync(p)) { const x = readJson(p); out.push({ ...x, caseId: c.id ?? c.caseId, condition: r.cond, replicate: n, reusedFrom: p, reference: true, ...(c.expected ? { expected: c.expected } : {}) }); }
  }
  return out;
}

function rowsOf(cells) {
  const table = {};
  for (const c of cells) {
    const v = verdictOf(c);
    if (v !== 'EVALUATION_ERROR' && !ENUM.includes(v)) throw new Error(`알 수 없는 contentAssessment: ${v} (${c.caseId} ${c.condition})`);
    const row = ((table[c.caseId] ??= {})[c.condition] ??= { expected: c.expected ?? null, expectedForm: c.expectedForm ?? null, observeOnly: !!c.observeOnly, formObserveOnly: !!c.formObserveOnly,
      kind: c.kind ?? null, lenient: c.lenient ?? null, reference: !!c.reference, reusedFrom: c.reusedFrom ?? null, byReplicate: {}, modelByReplicate: {}, formByReplicate: {}, raisedByReplicate: {}, counts: {} });
    row.byReplicate[`r${c.replicate}`] = v;
    row.modelByReplicate[`r${c.replicate}`] = c.modelJudge?.contentAssessment ?? null;
    row.formByReplicate[`r${c.replicate}`] = c.modelJudge?.groundKind ?? null;
    row.raisedByReplicate[`r${c.replicate}`] = (c.normalizedNotes ?? []).some(n => n.includes(RAISED));
    row.counts[v] = (row.counts[v] ?? 0) + 1;
  }
  for (const byCond of Object.values(table)) for (const row of Object.values(byCond)) {
    const finals = Object.values(row.byReplicate);
    row.matchCount = row.expected ? count(finals, v => matches(row.expected, v)) : null;
    row.pass = row.expected ? row.matchCount >= 2 : null;
    row.supportedCount = count(finals, v => v === 'SUPPORTED');
    row.formMatchCount = row.expectedForm ? count(Object.values(row.formByReplicate), f => f === row.expectedForm) : null;
    row.raisedCount = count(Object.values(row.raisedByReplicate), Boolean);
  }
  return table;
}

function questionRows(cells, mediaCases) {
  const rows = [];
  const push = (c, errorType, basis, question, rowKind) => {
    if (!question) return;
    rows.push({ caseId: c.caseId, condition: c.condition, replicate: c.replicate, rowKind, errorType, basis, question, chars: [...question].length,
      startsWithQuote: /^["“]/u.test(question.trim()), hasMarked: question.includes('표시한'), mediaCase: mediaCases.includes(c.caseId),
      reused: c.reusedFrom ?? null });
  };
  for (const c of cells) {
    for (const e of c.errors ?? []) push(c, e.errorType ?? null, e.basis ?? null, e.question, 'first');
    if (c.repair?.nextQuestion) push(c, null, null, c.repair.nextQuestion, 'repair-next');
  }
  return rows;
}

/** 순수 함수: 칸 객체 목록 -> 요약. cases는 reuse 경로를 읽기 위한 사례 정의(생략 가능). */
export function summarizeCells(setName, cells, reuseCells = []) {
  const all = [...cells, ...reuseCells], table = rowsOf(all);
  const evalErrors = count(cells, c => c.status === 'EVALUATION_ERROR');
  const cost = { total: 0, cells: cells.length };
  for (const c of cells) cost.total += (c.requests ?? []).reduce((n, r) => n + (r.usd ?? 0), 0);
  const out = { set: setName, evalErrors, cost, table, criteria: [] };
  const main = (id, cond) => table[id]?.[cond];
  const pass = (id, cond) => main(id, cond)?.pass === true;
  const crit = (name, ok, detail) => out.criteria.push({ name, ok, detail });
  if (setName === 'v510-t') {
    const cond = 'v5.10-sol', ids = Object.keys(table);
    const fix = ['A-cog14', 'B-horse6'], keep = ['A-horse6', 'A-plas10', 'A-cog16', 'A-horse5', 'A-aud17', 'B-cog14', 'B-plas10'];
    crit('T 고치기 대상(의식 14·경마 6-B) 통과', fix.every(id => pass(id, cond)), fix.map(id => `${id}:${pass(id, cond)}`).join(' '));
    crit('T 기존 통과 사례 7건 계속 통과', keep.every(id => pass(id, cond)), keep.map(id => `${id}:${pass(id, cond)}`).join(' '));
    const c = ids.filter(id => id.startsWith('C') && (main(id, cond)?.supportedCount ?? 0) >= 2);
    crit('T C 반례 4건 중 최종 충분 2회 이상 0건', c.length === 0, `충분 2회 이상: ${c.join(', ') || '없음'}`);
    out.observeOnly = { 'A-aud16': main('A-aud16', cond)?.byReplicate ?? null };
  } else if (setName === 'v510-k') {
    const cond = 'v5.10-sol', rows = Object.entries(table).map(([id, byCond]) => ({ id, ...byCond[cond] })).filter(r => r.byReplicate);
    const core = rows.filter(r => r.kind === 'core' || r.id === 'K-aud15-real');
    crit('K 핵심 5건 중 4건 이상 통과', core.length === 5 && count(core, r => r.pass) >= 4, `${count(core, r => r.pass)}/${core.length}: ${core.map(r => `${r.id}:${r.pass}`).join(' ')}`);
    const wrong = rows.filter(r => r.expected === 'INSUFFICIENT' && r.supportedCount >= 2);
    const strict = rows.filter(r => ['restate', 'nodisc'].includes(r.kind) && r.expected === 'INSUFFICIENT');
    crit('K 관대 아닌 문항의 결론만·못 가름 + 관대 문항의 못 가름: 최종 충분 2회 이상 0건', count(strict, r => r.supportedCount >= 2) === 0,
      `대상 ${strict.length}건, 충분 2회 이상: ${strict.filter(r => r.supportedCount >= 2).map(r => r.id).join(', ') || '없음'}`);
    const lr = rows.filter(r => r.kind === 'restate' && r.lenient);
    crit('K 관대 문항의 결론만 2건: 서버 최종 충분 2회 이상', lr.length === 2 && lr.every(r => r.supportedCount >= 2), lr.map(r => `${r.id}:${r.supportedCount}/3`).join(' '));
    const sentence = rows.find(r => r.id === 'K-horse4-loc-sentence'), paras = rows.filter(r => r.kind === 'loc-para');
    crit('K 위치만: 경마 4 문장 특정 충분 2회 이상', (sentence?.supportedCount ?? 0) >= 2, `K-horse4-loc-sentence ${sentence?.supportedCount ?? 0}/3`);
    crit('K 위치만: 경마 4 문단만·의식 15 문단만 충분 2회 이상 0건', paras.length === 2 && paras.every(r => r.supportedCount < 2), paras.map(r => `${r.id}:${r.supportedCount}/3`).join(' '));
    out.lenientMisjudgments = { count: wrong.length, ids: wrong.map(r => r.id), definition: '기대 부족인데 서버 최종 충분 2회 이상' };
    out.formAgreement = rows.filter(r => r.expectedForm && !r.formObserveOnly).map(r => ({ id: r.id, expectedForm: r.expectedForm, formMatchCount: r.formMatchCount }));
    out.formObserveOnly = rows.filter(r => r.formObserveOnly).map(r => ({ id: r.id, forms: r.formByReplicate }));
    out.raised = rows.filter(r => r.raisedCount).map(r => ({ id: r.id, raisedCount: r.raisedCount }));
  } else if (setName === 'v510-r') {
    const cond = 'v5.10-sol', ids = Object.keys(table);
    crit('R 3건 모두 충분 유지', ids.length === 3 && ids.every(id => pass(id, cond)), ids.map(id => `${id}:${main(id, cond)?.matchCount}/3`).join(' '));
  } else if (setName === 'v510-h') {
    const cond = 'v5.10-sol', rows = Object.entries(table).map(([id, byCond]) => ({ id, ...byCond[cond] }));
    const wrong = rows.filter(r => r.id.endsWith('-wrong') && r.supportedCount >= 2);
    crit('H 사용자 기대 판정 통과(9건)', rows.length === 9 && rows.every(r => r.pass), rows.map(r => `${r.id}:${r.matchCount}/3`).join(' '));
    crit('H 관대 오판(여전히 틀림이 최종 충분 2회 이상) 0건', wrong.length === 0, wrong.map(r => r.id).join(', ') || '없음');
    out.formAgreement = rows.filter(r => r.expectedForm).map(r => ({ id: r.id, expectedForm: r.expectedForm, formMatchCount: r.formMatchCount }));
  }
  if (setName === 'v59-t1' || setName === 'v59-t2') {
    out.questions = questionRows(all, ['A-aud17']);
    out.mechanical = {
      markedInMediaCase: out.questions.filter(q => q.mediaCase && q.hasMarked).map(q => `${q.caseId} ${q.condition} r${q.replicate}`),
      notStartingWithQuote: out.questions.filter(q => q.rowKind === 'first' && !q.startsWithQuote && q.errorType === 'CONTENT').length,
      note: '방향만 묻는지·보기 출처 위반·답 보기 여부는 판정하지 않는다(메인 세션·사용자 몫)',
    };
  } else out.questions = questionRows(all, []);
  return out;
}

export function summarize(setName, dir, cases = null) {
  const cells = loadCells(dir), meta = existsSync(`${dir}/META.json`) ? readJson(`${dir}/META.json`) : null;
  const reuse = loadReuse(cases ?? meta?.cases ?? []);
  const s = summarizeCells(setName, cells, reuse);
  if (meta?.cases) s.reuseNotes = meta.cases.filter(c => c.reuse).map(c => ({ caseId: c.caseId, reuse: c.reuse }));
  return s;
}

const fmtRow = (row, expectedMark = true) => row ? `${REPLICATES.map(n => KOREAN[row.byReplicate[`r${n}`]] ?? '-').join(' / ')}${expectedMark && row.expected ? ` (${row.matchCount}/3${row.pass ? ' 통과' : ''})` : ''}` : '-';
export function toMarkdown(s) {
  const L = [`# 요약: ${s.set} (${SET_META[s.set]?.title ?? ''})`, '', `평가 실패 칸 ${s.evalErrors}개 · 칸 ${s.cost.cells}개 · 실측 비용 $${s.cost.total.toFixed(3)}`, ''];
  if (s.criteria.length) { L.push('## 통과 기준', '', '| 기준 | 결과 | 상세 |', '|---|---|---|'); for (const c of s.criteria) L.push(`| ${c.name} | ${c.ok ? '통과' : '미달'} | ${c.detail} |`); L.push(''); }
  if (s.lenientMisjudgments) L.push(`관대 오판(${s.lenientMisjudgments.definition}): ${s.lenientMisjudgments.count}건 ${s.lenientMisjudgments.ids.join(', ')}`, '');
  const conds = [...new Set(Object.values(s.table).flatMap(x => Object.keys(x)))];
  L.push('## 사례별 최종 판정 (r1 / r2 / r3)', '', `| 사례 | 기대 | ${conds.join(' | ')} | 판정기 원판정(주 조건) | 형태 ground.kind | 서버 올림 |`, `|---|---|${conds.map(() => '---').join('|')}|---|---|---|`);
  for (const [id, byCond] of Object.entries(s.table)) {
    const main = Object.values(byCond).find(r => !r.reference) ?? Object.values(byCond)[0];
    L.push(`| ${id}${main.observeOnly ? ' (관찰만)' : ''} | ${main.expected ? KOREAN[main.expected] : '-'} | ${conds.map(c => fmtRow(byCond[c])).join(' | ')} | ${REPLICATES.map(n => main.modelByReplicate[`r${n}`] ?? '-').join(' / ')} | ${REPLICATES.map(n => main.formByReplicate[`r${n}`] ?? '-').join(' / ')}${main.expectedForm ? ` (기대 ${main.expectedForm}, ${main.formMatchCount}/3${main.formObserveOnly ? ', 관찰만' : ''})` : ''} | ${main.raisedCount}/3 |`);
  }
  const reused = Object.entries(s.table).flatMap(([id, byCond]) => Object.values(byCond).filter(r => r.reusedFrom).map(r => `${id}: ${r.reusedFrom}`));
  if (reused.length) L.push('', '재활용 기준 칸(새로 돌리지 않음): 11-08 실행 `' + RUNS_2026_11_08 + '` 의 파일 r1~r3', '');
  if (s.questions?.length) {
    L.push('', '## 질문 목록', '', '| 사례 | 조건 | 회차 | 구분 | errorType | basis | 글자 수 | 큰따옴표 시작 | "표시한" | 질문 원문 | 재활용 |', '|---|---|---|---|---|---|---|---|---|---|---|');
    for (const q of s.questions) L.push(`| ${q.caseId} | ${q.condition} | r${q.replicate} | ${q.rowKind} | ${q.errorType ?? ''} | ${q.basis ?? ''} | ${q.chars} | ${q.startsWithQuote ? 'O' : 'X'} | ${q.hasMarked ? 'O' : 'X'} | ${q.question.replaceAll('|', '\\|')} | ${q.reused ?? ''} |`);
  }
  if (s.mechanical) L.push('', `기계 검사: 그림·표 근거 사례(A-aud17)에 "표시한" 포함 ${s.mechanical.markedInMediaCase.length}건 ${s.mechanical.markedInMediaCase.join(', ')}; CONTENT 첫 질문 중 큰따옴표로 시작하지 않는 것 ${s.mechanical.notStartingWithQuote}건. ${s.mechanical.note}`);
  if (s.set === 'v59-t2') L.push('', '기준(재활용): `docs/experiments/student-sim-2026-10-29/v57-prob/` (v5.7 결과, 질문 원문은 그 SESSIONS.md)');
  return L.join('\n') + '\n';
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const name = process.argv[2];
  if (!SET_NAMES.includes(name)) throw new Error(`사용법: summarize-judgment-rules-test.mjs <${SET_NAMES.join('|')}> [runsDir]`);
  const dir = process.argv[3] ?? SET_META[name].dir, s = summarize(name, dir);
  writeFileSync(`${dir}/SUMMARY.json`, JSON.stringify(s, null, 2) + '\n'); writeFileSync(`${dir}/SUMMARY.md`, toMarkdown(s));
  console.log(JSON.stringify({ set: name, dir, criteria: s.criteria.map(c => ({ name: c.name, ok: c.ok })), evalErrors: s.evalErrors }));
}
