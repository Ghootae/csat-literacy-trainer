// v6.6b 사례 순서: 재료 끊기 + 헷갈리는 짝(L6·L7) (2026-11-26, case-check/CLI-case-lever2.md)
// v6.6 CASE_FLOW=lever (2026-11-26, case-check/PLAN-case-lever.md): checkLeversV6(item) — 사례 갈래 갈림 사실 표(leverTable)·선지별 choiceLevers를 〈보기〉와 서버가 대조(L1~L5).
// v6.5(2026-11-25 22시대, case-check/REVIEW-case-fact-repair-web.md): M6는 e3가 아니라 별도 호출 e3f(gpt-6.1-sol, 질문 하나) 결과로 계산(classifyV6 5번째 인자). stemChanged·finalStatus는 수리 보완 두 개(발문 보존, 결함 내보내지 않기)의 순수 판정.
// v6.4(2026-11-25): M6 원리 뒤집기(case-check/REVIEW-case-false-spot-web.md·REPORT-case-fact-check.md, 결정 카드 21:42 KST). v6 판정(순수 함수, API 호출 없음). RULES_V=6일 때 eval-repair.mjs가 쓴다. 근거: rule-audit-2026-11-23/PROPOSAL-code-v6.md 4절.
//   classifyV6(item, mask, e2, e3): e1(mask)·e2·e3의 해당 버전 항목으로 결함·방식 위반·수리 대상·경고·전략 경고를 계산한다.
//   checkStrategiesV6(item, mode, kind): 출력의 strategies·strategyUse 기계 점검(PROPOSAL-code-v6 2-6절).

const NEG = /적절하지\s*않은/;
const norm = s => String(s ?? '').replace(/\s/g, '');

// strategies-v6.md 목록 표의 "쓸 수 있는 곳"·"종류"를 코드로 옮긴 것. modes: 양식, kinds: 갈래(null이면 모두), type: depth(깊이)|layout(배치) (v6.1, PROPOSAL-v61.md 2-1).
export const STRATEGY_USE = {
  S1: { modes: ['A', 'B'], kinds: null, type: 'depth' },
  S2: { modes: ['B'], kinds: null, type: 'depth' },
  S3: { modes: ['A', 'B'], kinds: null, type: 'depth' },
  S4: { modes: ['A', 'B'], kinds: null, type: 'depth' },
  S5: { modes: ['A', 'B'], kinds: ['case', 'view'], type: 'layout' },
  S6: { modes: ['A', 'B'], kinds: ['case', 'table'], type: 'layout' },
  S7: { modes: ['A', 'B'], kinds: null, type: 'layout' },
  S8: { modes: ['A', 'B'], kinds: null, type: 'depth' },
  S9: { modes: ['A', 'B'], kinds: null, type: 'layout' },
  S10: { modes: ['A', 'B'], kinds: null, type: 'depth' },
  S11: { modes: ['A', 'B'], kinds: ['table', 'graph'], type: 'depth' },
  S12: { modes: ['A', 'B'], kinds: ['case', 'table'], type: 'depth' },
  S13: { modes: ['A'], kinds: ['case'], type: 'depth' },
  S14: { modes: ['A', 'B'], kinds: ['view'], type: 'depth' },
  S15: { modes: ['A', 'B'], kinds: null, type: 'depth' },
  S16: { modes: ['B'], kinds: null, type: 'depth' },
  S17: { modes: ['B'], kinds: null, type: 'depth' },
  S18: { modes: ['A', 'B'], kinds: ['case', 'table', 'graph', 'experiment'], type: 'depth' },
  S19: { modes: ['A', 'B'], kinds: null, type: 'layout' },
};

export function checkStrategiesV6(item, mode, kind) {
  const out = [];
  const s = item.strategies;
  if (!Array.isArray(s)) return ['strategies가 배열이 아님(없음)'];
  if (s.length < 1 || s.length > 3) out.push(`strategies가 ${s.length}개(1~3개여야 함)`);
  for (const id of s) {
    const u = STRATEGY_USE[id];
    if (!u) { out.push(`strategies에 목록에 없는 번호: ${id}`); continue; }
    if (!u.modes.includes(mode)) out.push(`${id}는 ${mode} 양식에 쓸 수 없음`);
    else if (u.kinds && !u.kinds.includes(kind)) out.push(`${id}는 ${kind} 갈래에 쓸 수 없음`);
    const use = item.strategyUse?.[id];
    if (typeof use !== 'string' || !use.trim()) out.push(`${id}의 strategyUse(쓴 자리 한 줄)가 없음`);
  }
  // v6.1 (PROPOSAL-v61.md 3절): 깊이 전략 점검. 경고일 뿐 수리·결함 아님. 목록 점검에 걸린 번호(없는 번호)는 깊이 판정에서 뺀다.
  const depth = s.filter(id => STRATEGY_USE[id]?.type === 'depth');
  if (s.length && depth.length === 0 && s.every(id => STRATEGY_USE[id])) out.push('깊이 전략 없음');
  // 선지 번호 읽기: ①~⑤, "N번", "선지/정답/rival/경쟁 N"만 센다(다른 숫자는 세지 않음).
  const nums = v => {
    const t = String(v ?? '');
    const r = [...t.matchAll(/[①-⑤]/g)].map(m => m[0].charCodeAt(0) - 0x2460 + 1);
    for (const m of t.matchAll(/([1-5])\s*번/g)) r.push(Number(m[1]));
    for (const m of t.matchAll(/(?:선지|정답|rival|경쟁)\s*([1-5])(?!\d)/g)) r.push(Number(m[1]));
    return r;
  };
  const ans = Number(item.answer), rival = Number(item.rival);
  for (const id of depth) {
    const txt = String(item.strategyUse?.[id] ?? '');
    const hit = new Set(nums(txt));
    if (txt.trim() && !hit.has(ans) && !(rival >= 1 && hit.has(rival))) out.push(`깊이 전략 ${id}이 정답·rival에 안 쓰임`);
  }
  return out;
}

// 수리 보완 1(v6.5): 수리가 발문을 한 글자라도 바꾸면 그 수리는 버린다.
export const stemChanged = (origStem, fixedStem) => fixedStem != null && String(fixedStem) !== String(origStem);
// 수리 보완 2(v6.5): 수리 뒤 재판정이 결함(정답 유일성 문제)이면 최종본 아님 표시.
export const finalStatus = afterDiag => (afterDiag && afterDiag.defect ? 'defect' : undefined);

export function classifyV6(it, m = {}, b = {}, c = {}, f = null) {
  const defectReasons = [], warnings = [], methodDetails = {};
  const surv = (b.surviving || []).map(Number);
  const ch = c.choices || [];
  const get = n => ch.find(y => Number(y.n) === n);
  const sc = n => { const x = get(n); return !!(x && x.one_fact_shortcut?.possible && !(x.minimum_evidence?.bogi || '').trim()); };
  const isRecheck = n => sc(n) && norm(get(n)?.task) === '내용확인'; // 지문 되묻기: 지문 한 사실로 판정되고 〈보기〉 근거가 없고 task가 내용 확인
  const ans = Number(it.answer);
  const negative = NEG.test(it.stem || '');
  const trueChoices = negative ? [1, 2, 3, 4, 5].filter(n => n !== ans) : [ans];

  // ---- 결함: 정답 유일성 (v5 판정 그대로, '후보 비움 + 답 일치'는 경고)
  const va = (c.valid_answers || []).map(Number);
  if (va.length === 0 && Number(c.answer) === ans) warnings.push(`정답 유일성 경고: 검사 모델이 정답 후보를 비움(답은 ${c.answer}, 근거 약함 ${JSON.stringify(c.weak || [])})`);
  else if (!(va.length === 1 && va[0] === ans)) defectReasons.push(`정답 유일성 문제: 검사 모델의 정답 후보 ${JSON.stringify(va)}, 출제 정답 ${ans}`);
  const defect = defectReasons.length > 0;

  // ---- 방식 위반 M2·M3·M4·M5
  const bogiOnly = [1, 2, 3, 4, 5].filter(n => get(n)?.bogi_only === true);
  if (bogiOnly.length) methodDetails.M2 = `〈보기〉만으로 정오가 정해지는 선지: ${bogiOnly.join(',')}`;
  const trueRecheck = trueChoices.filter(n => norm(get(n)?.task) === '내용확인');
  if (trueRecheck.length) methodDetails.M3 = `내용상 참인 선지 중 내용 확인인 것: ${trueRecheck.join(',')}`;
  const recheck = [1, 2, 3, 4, 5].filter(isRecheck);
  if (recheck.length >= 2) methodDetails.M4 = `〈보기〉 없이 지문 문장 확인만으로 정해지는 선지가 ${recheck.length}개: ${recheck.join(',')}`;
  const mp = c.mirror_pair || {};
  const mpc = (mp.choices || []).map(Number);
  if (mp.exists) methodDetails.M5 = `거울 짝 선지(${mpc.join('·')}): ${mp.why || ''}`;
  // v6.4 M6 (2026-11-25, case-check): 원리 뒤집기 선지. fact_sensitive가 null·없음이면 세지 않는다.
  const fch = (f && Array.isArray(f.choices)) ? f.choices : null; // e3f 결과(없으면 M6 계산 안 함)
  const fsOf = n => { if (!fch) return null; const v = fch.find(y => Number(y.n) === n)?.fact_sensitive; return v === true ? true : v === false ? false : null; };
  const m6Choices = negative
    ? (fsOf(ans) === false ? [ans] : [])
    : [1, 2, 3, 4, 5].filter(n => n !== ans && fsOf(n) === false);
  if (negative ? m6Choices.length === 1 : m6Choices.length >= 3) {
    methodDetails.M6 = negative ? `정답이 지문 원리를 뒤집어 만든 선지: ${ans}` : `오답 중 지문 원리를 뒤집어 만든 선지: ${m6Choices.join(',')}`;
  }
  const methodViolations = Object.keys(methodDetails);
  // v6.1 (PROPOSAL-v61.md 3절): 수리는 kind가 view가 아닐 때만. view는 방식 위반이 있어도 경고로만 남긴다.
  // v6.3 (Ghootae 2026-11-25): 방식 위반 하나여도 수리(과학 사례 B형이 M2 경고만 받고 수리 없이 미달). view는 그대로 경고만.
  const viewNoRepair = it.kind === 'view';
  const repair = !defect && methodViolations.length >= 1 && !viewNoRepair;
  if (!repair && methodViolations.length === 1) warnings.push(`방식 위반 ${methodViolations[0]}: ${methodDetails[methodViolations[0]]}`);
  if (!repair && viewNoRepair && !defect && methodViolations.length >= 2) warnings.push(`관점: 방식 위반 둘 이상 — 수리 안 함(검사기 참고): ${methodViolations.map(k => `${k} ${methodDetails[k]}`).join(' / ')}`);

  // ---- 경고로 내린 사유 (v5의 수리 사유였던 것)
  const noKey = !m.keyEvidence || !m.keyEvidence.length;
  const maskOnlyAnswer = !noKey && surv.length === 1 && surv[0] === ans;
  if (noKey) warnings.push('정답과 경쟁 선지를 가르는 핵심 관찰이 〈보기〉에 없음(지문만으로 갈림)');
  else if (maskOnlyAnswer) warnings.push(`핵심 관찰(${m.keyEvidence.join(' / ')})을 가려도 정답만 남음`);
  const ansC = get(ans);
  const ansSc = sc(ans);
  if (ansSc) warnings.push('정답이 〈보기〉 없이 지문 한 사실로 판정됨');
  const ansSteps = Number(ansC?.steps ?? NaN);
  const oneStep = !ansSc && ansSteps <= 1;
  if (oneStep) warnings.push('정답이 한 단계로 판정됨(〈보기〉 한 번 읽고 지문 규칙 하나 적용)');
  const ansSrc = Number(ansC?.bogi_sources ?? NaN);
  const oneObs = !ansSc && ansSrc <= 1;
  if (oneObs) warnings.push('정답이 〈보기〉 관찰 하나(한 열·한 문장)로 정해짐');
  const easy = [1, 2, 3, 4, 5].filter(n => n !== ans && sc(n));
  if (easy.length === 4) warnings.push('오답 넷이 모두 〈보기〉 없이 지문 한 사실로 지워짐');
  else if (easy.length === 3) warnings.push(`오답 셋이 지문 한 사실로 지워짐(${easy.join(',')})`);
  if (c.closest_rival && m.rival && Number(c.closest_rival.n) !== Number(m.rival)) warnings.push(`경쟁 선지 판단이 다름(출제 쪽 ${m.rival}, 풀이 쪽 ${c.closest_rival.n})`);
  // '정답이 가장 긴 선지' 경고는 v6에서 지움(OP8: 기록만).

  // ---- 고른 전략 못 지킴
  const strategyWarnings = [];
  const picked = Array.isArray(it.strategies) ? it.strategies : [];
  if (picked.includes('S3') && (noKey || maskOnlyAnswer || ansSc)) strategyWarnings.push('고른 전략 못 지킴: S3');
  if (picked.includes('S1') && (oneStep || oneObs)) strategyWarnings.push('고른 전략 못 지킴: S1');
  if (picked.includes('S4') && easy.length >= 3) strategyWarnings.push('고른 전략 못 지킴: S4');
  warnings.push(...strategyWarnings);

  const reasons = [...defectReasons.map(x => `[결함] ${x}`), ...methodViolations.map(k => `[방식 위반 ${k}] ${methodDetails[k]}`)];
  return {
    repair, defect, methodViolations, methodDetails, strategyWarnings, reasons, warnings,
    rival: m.rival, keyEvidence: m.keyEvidence, surviving: surv, easyChoices: easy,
    steps: [1, 2, 3, 4, 5].map(n => Number(get(n)?.steps ?? NaN)),
    bogiSources: [1, 2, 3, 4, 5].map(n => Number(get(n)?.bogi_sources ?? NaN)),
    tasks: [1, 2, 3, 4, 5].map(n => get(n)?.task ?? null),
    bogiOnly: [1, 2, 3, 4, 5].map(n => get(n)?.bogi_only ?? null),
    factSensitive: [1, 2, 3, 4, 5].map(fsOf), m6Choices: methodDetails.M6 ? m6Choices : [],
    factWhy: [1, 2, 3, 4, 5].map(n => fch?.find(y => Number(y.n) === n)?.why ?? null),
    mirrorPair: mp, solverAnswer: c.answer, validAnswers: va, closestRival: c.closest_rival,
  };
}

// v6.6: 사례 갈림 사실 순서(CASE_FLOW=lever)의 서버 확인. item = {stem, bogi, answer, leverTable, choiceLevers, principleCards}. 반환 {errors, warnings}.
const lvNorm = t => String(t ?? '').replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim().replace(/^["'“”‘’「」『』]+|["'“”‘’「」『』]+$/g, '').trim();
export function checkLeversV6(item, opts = {}) {
  const errors = [], warnings = [];
  const bogi = lvNorm(item.bogi);
  const table = Array.isArray(item.leverTable) ? item.leverTable : [];
  const facts = table.map(r => lvNorm(r?.fact)).filter(Boolean);
  const inBogi = f => f && bogi.includes(f);
  // L1(오류): leverTable 각 fact가 〈보기〉에 있다
  if (!facts.length) errors.push('L1: leverTable이 비어 있음');
  for (const f of facts) if (!inBogi(f)) errors.push(`L1: leverTable의 fact가 〈보기〉에 없음: "${f.slice(0, 40)}"`);
  // L2(경고): 〈보기〉 문장(. ? ! 및 줄바꿈) 중 10자 이상인 것마다 그것을 포함하거나 그것에 포함되는 fact가 하나 이상
  const sents = String(item.bogi ?? '').split(/\n+/).flatMap(l => l.split(/(?<=[.?!])\s+/)).map(lvNorm).filter(x => x.length >= 10);
  for (const st of sents) if (!facts.some(f => f.includes(st) || st.includes(f))) warnings.push(`L2: 〈보기〉 문장이 leverTable 어디에도 안 쓰임: "${st.slice(0, 40)}"`);
  // L3(오류): choiceLevers 5개, 선지마다 facts 1개 이상이고 모두 leverTable의 fact와 같다
  const cl = Array.isArray(item.choiceLevers) ? item.choiceLevers : [];
  if (cl.length !== 5) errors.push(`L3: choiceLevers가 ${cl.length}개(5개여야 함)`);
  const factSet = new Set(facts);
  for (const c of cl) {
    const fs_ = Array.isArray(c?.facts) ? c.facts.map(lvNorm).filter(Boolean) : [];
    if (!fs_.length) errors.push(`L3: 선지 ${c?.n}의 facts가 없음`);
    for (const f of fs_) if (!factSet.has(f)) errors.push(`L3: 선지 ${c?.n}의 fact가 leverTable에 없음: "${f.slice(0, 40)}"`);
  }
  // L4(오류): 결정 선지마다 misread가 비어 있지 않다. 긍정 발문이면 오답 4개의 facts 합집합 3개 이상
  const negative = NEG.test(item.stem || ''); const ans = Number(item.answer);
  const decisive = negative ? [ans] : [1, 2, 3, 4, 5].filter(n => n !== ans);
  for (const n of decisive) { const c = cl.find(x => Number(x?.n) === n); if (!c || !String(c.misread ?? '').trim() || c.misread === 'null') errors.push(`L4: 결정 선지 ${n}의 misread가 비어 있음`); }
  if (!negative) {
    const u = new Set(decisive.flatMap(n => (cl.find(x => Number(x?.n) === n)?.facts || []).map(lvNorm)).filter(Boolean));
    if (u.size < 3) errors.push(`L4: 오답 4개의 facts 합집합이 ${u.size}개(3개 이상이어야 함)`);
  }
  // L6(오류): pair 이름 하나 이상이 두 줄 이상에 쓰였다 (v6.6b)
  const pairOf = r => { const v = String(r?.pair ?? '').trim(); return v && v !== 'null' ? v : null; };
  const pairCount = {}; for (const r of table) { const k = pairOf(r); if (k) pairCount[k] = (pairCount[k] || 0) + 1; }
  if (!Object.values(pairCount).some(n => n >= 2)) errors.push('L6: pair 이름이 두 줄 이상에 쓰인 헷갈리는 짝이 없음');
  // L7: 부정 발문이면 정답 선지의 facts에 pair 줄이 하나 이상(없으면 오류). 긍정 발문이면 오답 중 하나 이상이 pair 줄을 쓴다(없으면 경고).
  const pairFacts = new Set(table.filter(r => pairOf(r)).map(r => lvNorm(r.fact)));
  const usesPair = n => (cl.find(x => Number(x?.n) === n)?.facts || []).some(f => pairFacts.has(lvNorm(f)));
  if (negative) { if (!usesPair(ans)) errors.push(`L7: 부정 발문 정답 선지 ${ans}가 헷갈리는 짝(pair) 줄을 쓰지 않음`); }
  else if (!decisive.some(usesPair)) warnings.push('L7: 오답 중 pair 줄을 쓰는 선지가 없음');
  // L8 (v6.8 CASE_FLOW=premise, opts.premise): 전제형. a(오류) premise·verdict 모두 있음 / b(오류) premiseTrue=false가 정확히 하나이고 정답 / c(오류) 정답 선지에 가정 표현 없음 / d(경고) 선지 본문에 premise / e(경고) 이유 연결어 없는 선지 수
  if (opts.premise) {
    const choices = Array.isArray(item.choices) ? item.choices.map(lvNorm) : [];
    const emp = cl.filter(c => !String(c?.premise ?? '').trim() || !String(c?.verdict ?? '').trim()).map(c => c?.n);
    if (cl.length !== 5 || emp.length) errors.push(`L8a: premise·verdict가 빈 선지: ${emp.join(',') || '(choiceLevers 5개 아님)'}`);
    const falses = cl.filter(c => c?.premiseTrue === false).map(c => Number(c.n));
    if (falses.length !== 1 || falses[0] !== ans) errors.push(`L8b: premiseTrue=false가 ${falses.length}개(${falses.join(',')}), 정답 ${ans}만이어야 함`);
    const at = choices[ans - 1] ?? '';
    if (/(라면|다면|았더라면|었더라면)/.test(at)) errors.push(`L8c: 정답 선지 ${ans}에 가정 표현이 있음`);
    for (const c of cl) { const p = lvNorm(c?.premise); const t = choices[Number(c?.n) - 1]; if (p && t && !t.includes(p) && diceBigram(p, t) < 0.6) warnings.push(`L8d: 선지 ${c.n} 본문에 premise가 없음`); }
    const noLink = choices.filter(t => !/(므로|때문에|이니|이어서|이라서)/.test(t)).length;
    if (noLink) warnings.push(`L8e: 이유 연결어가 없는 선지 ${noLink}개`);
  }
  // L5(경고): principleCards 2개 이상
  if (!(Array.isArray(item.principleCards) && item.principleCards.length >= 2)) warnings.push('L5: principleCards가 2개 미만');
  return { errors, warnings };
}

// v6.6b: 글자 두 개씩 묶음(bigram) Dice 유사도. 최종 L1에서 글자 일치가 깨졌을 때 다듬기로 바뀐 것인지 가른다.
const bigrams = t => { const x = lvNorm(t).replace(/\s/g, ''); const m = new Map(); for (let i = 0; i < x.length - 1; i++) { const g = x.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); } return m; };
export function diceBigram(a, b) {
  const A = bigrams(a), B = bigrams(b); let common = 0, na = 0, nb = 0;
  for (const v of A.values()) na += v; for (const v of B.values()) nb += v;
  for (const [g, v] of A) common += Math.min(v, B.get(g) || 0);
  return na + nb ? (2 * common) / (na + nb) : 0;
}
// fact 하나를 〈보기〉와 대조: '일치'(부분 문자열) / '유사'(문장 중 Dice 최고 ≥ 0.6, 다듬기로 바뀜) / '없음'.
export function matchFactV6(fact, bogi, threshold = 0.6) {
  const f = lvNorm(fact), b = lvNorm(bogi);
  if (f && b.includes(f)) return { status: '일치', score: 1 };
  const sents = String(bogi ?? '').split(/\n+/).flatMap(l => l.split(/(?<=[.?!])\s+/)).map(lvNorm).filter(Boolean);
  let best = 0; for (const st of sents) best = Math.max(best, diceBigram(f, st));
  return { status: best >= threshold ? '유사' : '없음', score: Math.round(best * 1000) / 1000 };
}
