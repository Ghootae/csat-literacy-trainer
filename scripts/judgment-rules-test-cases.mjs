// v5.9·v5.10 시험 묶음 정의: 사례·근거 글·기대 판정·조건. 외부 호출 없음.
// 설계: docs/experiments/question-rules-v59-2026-11-09/DESIGN-DRAFT.md, docs/experiments/v510-judgment-2026-11-09/DESIGN-DRAFT.md
// 인계: docs/handoffs/2026-11-09-v59-v510-test-runners.md
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { SourceDirectProblemBundleSchema } from '../packages/pipeline/dist/index.js';
import { loadProblemSolvingBundle } from '../packages/app/dist/server/content.js';
import { loadInputs, PARTICIPANT, REFERENCE } from './run-judge-model-explanation.mjs';

export const EXP59 = 'docs/experiments/question-rules-v59-2026-11-09', EXP510 = 'docs/experiments/v510-judgment-2026-11-09';
export const DESIGN_59 = `${EXP59}/DESIGN-DRAFT.md`, DESIGN_510 = `${EXP510}/DESIGN-DRAFT.md`;
export const LAB_SOURCES = 'docs/experiments/v5-diverse-48-regression-2026-10-28-v56/sources.json';
export const MRNA_EVENTS = 'docs/experiments/student-sim-2026-10-29/mrna-prob/logs/problem-feedback/events.jsonl';
export const MRNA_SESSIONS = 'docs/experiments/student-sim-2026-10-29/mrna-prob/SESSIONS.md';
export const RUNS_2026_11_08 = 'docs/experiments/judge-model-explanation-2026-11-08/runs';
const PROMPT_DIR = 'packages/pipeline/experiments/problem-solving';
export const SOL = 'gpt-6.1-sol', LUNA = 'gpt-6-luna';
export const REPLICATES = [1, 2, 3];
// 호출당 추정(dry 출력용). 지난 실측 기준.
export const EST_USD = { [SOL]: 0.055, [LUNA]: 0.003 };

export const VERSIONS = {
  'v5.8': { promptPath: `${PROMPT_DIR}/source-direct-problem-feedback-v5.8.md`, promptVersion: 'problem-feedback-v5.8', judgmentRules: null },
  'v5.9': { promptPath: `${PROMPT_DIR}/source-direct-problem-feedback-v5.9.md`, promptVersion: 'problem-feedback-v5.9', judgmentRules: null },
  'v5.10': { promptPath: `${PROMPT_DIR}/source-direct-problem-feedback-v5.10.md`, promptVersion: 'problem-feedback-v5.10', judgmentRules: 'v5.10' },
};
// model null = 제품 배정(정답 luna, 오답 sol)
export const CONDITIONS = Object.fromEntries([
  ['v5.8-luna', 'v5.8', LUNA], ['v5.8-sol', 'v5.8', SOL], ['v5.9-luna', 'v5.9', LUNA], ['v5.9-sol', 'v5.9', SOL],
  ['v5.9-product', 'v5.9', null], ['v5.10-sol', 'v5.10', SOL],
].map(([name, ver, model]) => [name, { name, ver, model, ...VERSIONS[ver] }]));

const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
const squash = s => s.replace(/\s+/gu, ' ');

// ---------------------------------------------------------------- 상수 근거 글 (설계 초안 표와 글자 그대로; selftest가 초안 파일과 대조)
// v5.9 설계 4절 가상 방향 오류 사례. choiceHas = 고른 선지 문장에 들어 있어야 하는 글(오답 선택 assert).
export const V_CASES = [
  { id: 'V1-plas10', q: 'plastic-polymerization-q10', position: 4, choiceHas: '㉯보다 ㉮로 이루어진 소재의 밀도가 더 높겠군.',
    text: '㉮가 ㉯보다 사슬이 더 조밀하게 배열돼서 결정 영역이 많으니 밀도가 더 높다.' },
  { id: 'V2-plas10', q: 'plastic-polymerization-q10', position: 1, choiceHas: '충격에 잘 깨지지 않도록 유연하게 하려면 ㉮보다 ㉯로 이루어진 소재가 적합하겠군.',
    text: '㉯는 결정 영역이 많은데, 결정 영역이 많을수록 유연성이 높아지니까 ㉯가 더 유연하다.' },
  { id: 'V3-aud16', q: 'audio-perceptual-coding-q16', position: 3, choiceHas: '저음에서는 최소가청강도가 크므로 임계대역도 고음의 임계대역보다 넓다.',
    text: '임계대역의 폭은 저음에서 고음보다 넓으니까 ③이 맞다.' },
];

// v5.10 설계 3.2 K. position = 정답 번호(표의 번호; answerChoiceId와 같은지 assert).
// kind: core 핵심 / restate 결론만 / nodisc 못 가름 / loc-sentence·loc-para 위치만 / real 실제.
// 판정: 충분 SUPPORTED / 부족 INSUFFICIENT(UNKNOWN 포함). expectedForm = ground.kind.
export const K_QUESTIONS = {
  cog12: { q: 'consciousness-cognition-q12', position: 1 }, cog15: { q: 'consciousness-cognition-q15', position: 2 },
  horse4: { q: 'horse-race-reporting-q4', position: 5, lenient: true }, aud15: { q: 'audio-perceptual-coding-q15', position: 3, lenient: true },
  st16: { q: 'surface-tension-laplace-q16', position: 3, lab: true },
};
const kc = (abbr, kind, text, expected, expectedForm, extra = {}) => ({ id: `K-${abbr}-${kind}`, abbr, kind, text, expected, expectedForm, ...extra });
export const K_CASES = [
  kc('cog12', 'core', '설의 중국어 방에서 방 안 사람은 함수적 역할은 같은데 중국어를 모름. 그리고 (나)는 지각이 내 몸의 체험이라고 함.', 'SUPPORTED', 'FACT'),
  kc('cog12', 'restate', '㉮는 의식과 함수적 역할, ㉯는 내 몸의 체험이 들어가야 함.', 'INSUFFICIENT', 'CONCLUSION_RESTATED'),
  kc('cog12', 'nodisc', '(나)는 객관주의 철학의 지각 이론을 비판함.', 'INSUFFICIENT', 'FACT', { formObserveOnly: true }),
  kc('cog15', 'core', '(나) 3문단에서 손이 맞닿을 때 만지는 동시에 만져지는 얽힘이 곧 지각이라고 했으니 감각과 지각을 나눌 수 없음.', 'SUPPORTED', 'FACT'),
  kc('cog15', 'restate', '감각하는 게 동시에 감각되는 얽힘이 지각이라서 ②가 이유임.', 'INSUFFICIENT', 'CONCLUSION_RESTATED'),
  kc('cog15', 'nodisc', '(나)는 지각을 내 몸의 체험이라고 봄.', 'INSUFFICIENT', 'FACT', { formObserveOnly: true }),
  kc('cog15', 'loc-para', '(나) 3문단에 나옴.', 'INSUFFICIENT', 'LOCATION_ONLY'),
  kc('horse4', 'core', '1문단에서 경마식 보도가 선거에 무관심한 유권자의 참여를 독려하는 장점이 있다고 함.', 'SUPPORTED', 'FACT'),
  kc('horse4', 'restate', '경마식 보도는 정치에 관심 없던 유권자가 선거에 관심을 갖게 하니까 ⑤.', 'SUPPORTED', 'CONCLUSION_RESTATED'),
  kc('horse4', 'nodisc', '경마식 보도는 선거의 공정성을 해칠 수 있다는 단점이 있음.', 'INSUFFICIENT', 'FACT', { formObserveOnly: true }),
  kc('horse4', 'loc-sentence', '1문단 장점 말하는 부분에 ⑤ 내용이 나옴.', 'SUPPORTED', 'LOCATION_ONLY'),
  kc('horse4', 'loc-para', '1문단에 ⑤ 내용이 나옴.', 'INSUFFICIENT', 'LOCATION_ONLY'),
  // 실제 근거: 참가자 기록의 audio-perceptual-coding-q15 first.rationale.text(text null). 표의 글과 같은지 realText로 대조.
  kc('aud15', 'real', null, 'SUPPORTED', null, { realText: "2문단에 '소리 크기에 균일한 개수의 비트가 할당된다.'라는 부분이 있음." }),
  kc('aud15', 'restate', '압축 전 오디오 신호는 소리 크기마다 비트 개수가 같으니 ③.', 'SUPPORTED', 'CONCLUSION_RESTATED'),
  kc('aud15', 'nodisc', '2문단에 비트 개수가 늘면 소리가 원음에 가까워진다고 함.', 'INSUFFICIENT', 'FACT', { formObserveOnly: true }),
  kc('st16', 'core', '밀도와 노즐 지름은 곱으로 들어가니까 밀도를 두 배, 지름을 반으로 하면 곱이 그대로라 오네소르게 수도 그대로임.', 'SUPPORTED', 'FACT'),
  kc('st16', 'restate', '점도와 표면 장력이 같고 밀도 두 배, 지름 절반이면 오네소르게 수는 변함없음.', 'INSUFFICIENT', 'CONCLUSION_RESTATED'),
  kc('st16', 'nodisc', '점도가 커지면 오네소르게 수가 커짐.', 'INSUFFICIENT', 'FACT', { formObserveOnly: true }),
];

// 설계 3.3 R: 참가자 기록의 first.rationale.text 그대로(표의 글과 selftest에서 대조). 기대 충분.
export const R_CASES = [
  { id: 'R-cog13', q: 'consciousness-cognition-q13' }, { id: 'R-horse7', q: 'horse-race-reporting-q7' }, { id: 'R-aud14', q: 'audio-perceptual-coding-q14' },
];

// 설계 3.4 H: hint는 판정 입력에 넣지 않고 칸 파일에만 기록.
const hc = (abbr, kind, hint, text, expected, extra = {}) => ({ id: `H-${abbr}-${kind}`, abbr, kind, hint, text, expected, ...extra });
const HINT = {
  cog12: '설이 기능주의의 어떤 주장을 부정했는지, (나) 마지막 문단에서 지각을 무엇이라고 규정했는지 찾아 빈칸과 맞대 봐.',
  cog15: "(나) 3문단의 손이 맞닿는 예와 선지들의 '감각'·'지각' 관계를 맞대 봐.",
  horse4: '1문단에서 경마식 보도의 장점과 단점을 설명한 문장을 찾아 각 선지와 맞대 봐.',
};
export const H_CASES = [
  hc('cog12', 'use', HINT.cog12, '설은 함수적 역할이 같아도 의식이 다를 수 있다고 했고, (나) 마지막 문단은 지각을 내 몸의 체험이라고 함.', 'SUPPORTED'),
  hc('cog12', 'copy', HINT.cog12, '설이 부정한 기능주의 주장과 (나) 마지막 문단의 지각 규정이 빈칸과 맞음.', 'INSUFFICIENT'),
  hc('cog12', 'wrong', HINT.cog12, '설은 함수적 역할이 같으면 의식도 같다고 했음.', 'ERROR'),
  hc('cog15', 'use', HINT.cog15, '손이 맞닿으면 만지는 동시에 만져지는데, 이 얽힘이 지각이라고 했으니 감각과 지각이 한데 얽혀 있음.', 'SUPPORTED'),
  hc('cog15', 'copy', HINT.cog15, '3문단 손이 맞닿는 예가 ②의 얽힘과 같음.', 'INSUFFICIENT'),
  hc('cog15', 'wrong', HINT.cog15, '3문단에서 감각은 몸이 아니라 의식이 한다고 했음.', 'ERROR'),
  hc('horse4', 'use', HINT.horse4, '1문단에서 경마식 보도의 장점으로 무관심한 유권자의 선거 참여를 독려한다고 했음.', 'SUPPORTED'),
  hc('horse4', 'copy', HINT.horse4, '1문단의 장점 문장과 ⑤가 맞음.', 'SUPPORTED', { expectedForm: 'LOCATION_ONLY' }),
  hc('horse4', 'wrong', HINT.horse4, '1문단에서 경마식 보도는 선거 전반기에 더 많다고 했음.', 'ERROR'),
];

// 설계 v5.9 3절 T2. 세션 id 앞 8자.
export const T2_SESSIONS = [
  { id: 'prob-5', session: 'd419bced' }, { id: 'prob-6', session: 'b8f89716' }, { id: 'prob-8', session: '88cee21f' },
  { id: 'prob-9', session: '7d4b2510' }, { id: 'prob-10', session: '358e7095', repair: true },
];

// ---------------------------------------------------------------- 묶음
// runs: [{ cond, reps, reference? }]. capUsd는 인계 문서의 묶음별 기본값.
export const SET_NAMES = ['v59-t1', 'v59-t2', 'v510-t', 'v510-k', 'v510-r', 'v510-h'];
export const SET_META = {
  'v59-t1': { dir: `${EXP59}/runs-T1`, capUsd: 2, title: 'v5.9 T1 질문이 나아지는가' },
  'v59-t2': { dir: `${EXP59}/runs-T2`, capUsd: 0.5, title: 'v5.9 T2 답 보기 질문 재발 여부' },
  'v510-t': { dir: `${EXP510}/runs-T`, capUsd: 2.6, title: 'v5.10 T 고치기용 14건' },
  'v510-k': { dir: `${EXP510}/runs-K`, capUsd: 4.3, title: 'v5.10 K 확인용' },
  'v510-r': { dir: `${EXP510}/runs-R`, capUsd: 0.6, title: 'v5.10 R 정답 회귀' },
  'v510-h': { dir: `${EXP510}/runs-H`, capUsd: 1.7, title: 'v5.10 H 힌트 뒤 근거' },
};

const strip = source => { const { lenientCorrect: _l, ...rest } = source; return SourceDirectProblemBundleSchema.parse(rest); };
const choiceAt = (source, position) => source.choices.find(c => c.position === position);

export function loadWorld() {
  const participant = readJson(PARTICIPANT), reference = new Map(readJson(REFERENCE).questions.map(q => [q.questionId, q]));
  const lab = readJson(LAB_SOURCES);
  const world = { participant, reference, lab };
  world.participantSource = q => {
    const item = participant.items[q]; assert.ok(item, `참가자 기록에 ${q} 없음`);
    const source = strip(item.session.source), ref = reference.get(q);
    assert.ok(ref, `runtime-reference에 ${q} 없음`);
    assert.equal(source.officialExplanation, ref.officialExplanation, `${q}: 해설이 runtime-reference와 다름`);
    return source;
  };
  // lab 문항: sources.json과 지금 lab 자료(dist content)가 passage·choices·answerChoiceId·officialExplanation에서 같아야 한다.
  world.labSource = q => {
    const saved = strip(lab[q] ?? assert.fail(`sources.json에 ${q} 없음`)), now = loadProblemSolvingBundle(q).source;
    for (const k of ['passage', 'choices', 'answerChoiceId', 'officialExplanation']) assert.deepEqual(saved[k], now[k], `${q}: lab 자료 ${k}가 sources.json과 다름 (중단 보고 대상)`);
    return saved;
  };
  world.lenientOf = q => reference.get(q)?.lenientCorrect ?? null;
  return world;
}

const rationaleOf = (world, q) => {
  const first = world.participant.items[q].first;
  assert.equal(first.rationale.mode, 'PROVIDED', `${q}: 참가자 근거 글 없음`);
  return first.rationale.text;
};
function buildT1(world, base) {
  const cases = base.cases.filter(c => ['A-horse5', 'A-aud17', 'A-cog16'].includes(c.id)).map(c => ({
    id: c.id, questionId: c.q, source: strip(c.source), choiceId: c.choiceId, text: c.text, lenientCorrect: null, real: true,
    runs: [{ cond: 'v5.9-luna', reps: REPLICATES }, { cond: 'v5.9-sol', reps: REPLICATES }],
    reuse: { v58: ['L-now', 'S-now'].map((cond, i) => ({ cond: ['v5.8-luna', 'v5.8-sol'][i], pattern: `${RUNS_2026_11_08}/${c.id}__${cond}__r{n}.json` })) },
  }));
  for (const v of V_CASES) {
    const source = world.participantSource(v.q), choice = choiceAt(source, v.position);
    assert.ok(choice, `${v.id}: ${v.position}번 선지 없음`);
    assert.ok(squash(choice.text).includes(squash(v.choiceHas)), `${v.id}: 고른 선지 글이 설계 4절과 다름: ${choice.text}`);
    assert.notEqual(choice.choiceId, source.answerChoiceId, `${v.id}: 오답 선택이어야 함`);
    cases.push({ id: v.id, questionId: v.q, source, choiceId: choice.choiceId, text: v.text, lenientCorrect: null, real: false,
      runs: [{ cond: 'v5.8-sol', reps: REPLICATES, reference: true }, { cond: 'v5.9-sol', reps: REPLICATES }] });
  }
  return cases;
}

/** T2: events.jsonl에서 세션 id로 첫 SELECT·prob-10 첫 CORRECT를 읽고 SESSIONS.md와 대조. 문항 자료는 sources.json(= 지금 lab 자료)이며 events의 source와도 대조. */
export function loadT2(world) {
  const rows = readFileSync(MRNA_EVENTS, 'utf8').trim().split('\n').map(JSON.parse);
  const md = readFileSync(MRNA_SESSIONS, 'utf8');
  const q = 'mrna-vaccine-lipid-nanoparticle-q19', source = world.labSource(q);
  return T2_SESSIONS.map(s => {
    const recs = rows.filter(r => r.session.sessionId.startsWith(s.session)); assert.ok(recs.length, `events.jsonl에 세션 ${s.session} 없음`);
    const last = recs.at(-1).session, eventSource = strip(recs[0].session.source);
    for (const k of ['passage', 'choices', 'answerChoiceId', 'officialExplanation']) assert.deepEqual(eventSource[k], source[k], `${s.id}: events의 source ${k}가 lab 자료와 다름`);
    const sel = last.selections[0]; assert.equal(sel.rationale.mode, 'PROVIDED');
    assert.ok(md.includes(sel.rationale.text), `${s.id}: SESSIONS.md에 첫 근거 글이 없음`);
    const def = { id: s.id, questionId: q, source, choiceId: sel.choiceId, text: sel.rationale.text, lenientCorrect: null, sessionId: recs[0].session.sessionId,
      runs: [{ cond: 'v5.9-product', reps: [1] }], reuse: { v57: `docs/experiments/student-sim-2026-10-29/v57-prob/` } };
    if (s.repair) {
      const answer = last.observations.find(o => o.command.type === 'CORRECT').command.text;
      assert.ok(md.includes(`학생 답 1: "${answer}"`), `${s.id}: SESSIONS.md의 학생 답 1과 다름`);
      def.repair = { answerText: answer };
    }
    return def;
  });
}

/** 묶음 이름 -> { name, dir, capUsd, title, cases, cells }. 입력이 출처와 다르면 던진다(중단 보고 대상). */
export function buildSet(name, world = loadWorld()) {
  assert.ok(SET_NAMES.includes(name), `알 수 없는 묶음: ${name} (${SET_NAMES.join(', ')})`);
  const meta = SET_META[name];
  let cases;
  if (name === 'v59-t1' || name === 'v510-t') {
    const base = loadInputs();
    if (name === 'v59-t1') cases = buildT1(world, base);
    else {
      const EXPECT = { 'A-horse5': 'ERROR', 'A-aud17': 'ERROR' };
      cases = base.cases.map(c => ({ id: c.id, questionId: c.q, source: strip(c.source), choiceId: c.choiceId, text: c.text, lenientCorrect: null,
        expected: EXPECT[c.id] ?? (c.id.startsWith('C') ? 'INSUFFICIENT' : 'SUPPORTED'), ...(c.id === 'A-aud16' ? { observeOnly: true } : {}),
        runs: [{ cond: 'v5.10-sol', reps: REPLICATES }], reuse: { v58: [{ cond: 'v5.8-sol', pattern: `${RUNS_2026_11_08}/${c.id}__S-now__r{n}.json` }] } }));
    }
  } else if (name === 'v59-t2') cases = loadT2(world);
  else if (name === 'v510-k') {
    cases = K_CASES.map(k => {
      const kq = K_QUESTIONS[k.abbr], source = kq.lab ? world.labSource(kq.q) : world.participantSource(kq.q), choice = choiceAt(source, kq.position);
      assert.equal(choice.choiceId, source.answerChoiceId, `${k.id}: 표의 번호 ${kq.position}가 answerChoiceId와 다름`);
      let text = k.text;
      if (text === null) { text = rationaleOf(world, kq.q); assert.equal(text, k.realText, `${k.id}: 참가자 근거 글이 표의 글과 다름`); }
      return { id: k.id, questionId: kq.q, source, choiceId: choice.choiceId, text, kind: k.kind, expected: k.expected, expectedForm: k.expectedForm,
        formObserveOnly: k.formObserveOnly ?? false, lenient: !!kq.lenient, lenientCorrect: kq.lenient ? world.lenientOf(kq.q) : null,
        runs: [{ cond: 'v5.10-sol', reps: REPLICATES }, { cond: 'v5.8-sol', reps: [1], reference: true }] };
    });
    for (const c of cases.filter(c => c.lenient)) assert.ok(c.lenientCorrect, `${c.id}: runtime-reference에 lenientCorrect 없음`);
  } else if (name === 'v510-r') {
    cases = R_CASES.map(r => {
      const source = world.participantSource(r.q), item = world.participant.items[r.q];
      assert.equal(item.first.choiceId, source.answerChoiceId, `${r.id}: 참가자 선택이 정답과 다름`);
      return { id: r.id, questionId: r.q, source, choiceId: item.first.choiceId, text: rationaleOf(world, r.q), expected: 'SUPPORTED', lenientCorrect: world.lenientOf(r.q),
        runs: [{ cond: 'v5.10-sol', reps: REPLICATES }] };
    });
  } else if (name === 'v510-h') {
    cases = H_CASES.map(h => {
      const kq = K_QUESTIONS[h.abbr], source = world.participantSource(kq.q), choice = choiceAt(source, kq.position);
      assert.equal(choice.choiceId, source.answerChoiceId, `${h.id}: 표의 번호가 answerChoiceId와 다름`);
      return { id: h.id, questionId: kq.q, source, choiceId: choice.choiceId, text: h.text, hint: h.hint, kind: h.kind, expected: h.expected,
        expectedForm: h.expectedForm ?? null, lenient: !!kq.lenient, lenientCorrect: kq.lenient ? world.lenientOf(kq.q) : null,
        runs: [{ cond: 'v5.10-sol', reps: REPLICATES }] };
    });
  }
  return { name, ...meta, cases, cells: buildSchedule(name, cases) };
}

/** 반복 단위 순서: r1 전체 -> r2 -> r3. 반복 안에서는 사례 순서 x 조건 순서. */
export function buildSchedule(setName, cases) {
  return REPLICATES.flatMap(r => cases.flatMap(caseDef => caseDef.runs.filter(x => x.reps.includes(r))
    .map(x => ({ setName, caseDef, cond: x.cond, replicate: r, reference: !!x.reference }))));
}
export const cellLabel = c => `${c.caseDef.id}__${c.cond}__r${c.replicate}`;

/** 한 칸에서 예상되는 호출 모델 목록(dry 추정용). */
export function callModels(cell) {
  const spec = CONDITIONS[cell.cond], c = cell.caseDef;
  const first = spec.model ?? (c.choiceId === c.source.answerChoiceId ? LUNA : SOL);
  return c.repair ? [first, LUNA] : [first];
}
export const estimateUsd = cells => cells.reduce((n, c) => n + callModels(c).reduce((m, x) => m + EST_USD[x], 0), 0);

/** 칸에 쓰는 문항 자료: v5.10 조건에만 lenientCorrect를 붙인다. */
export function sourceFor(caseDef, cond) {
  return CONDITIONS[cond].judgmentRules === 'v5.10' && caseDef.lenientCorrect
    ? SourceDirectProblemBundleSchema.parse({ ...caseDef.source, lenientCorrect: caseDef.lenientCorrect }) : caseDef.source;
}
