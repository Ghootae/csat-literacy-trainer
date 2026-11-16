// 문단 기능 배열 대조 (코드, API 없음).
// 하위 구조 array 문자열을 요소로 풀고, 생성 지문의 문단 라벨 배열과 정렬한다.

// "A(B) ×n", "[A → B] ×n", "…" 를 요소 목록으로 바꾼다.
// 요소: { label, label2, repeat, wild }
export function parseArray(s) {
  const out = [];
  const tokens = s.split('→').map((t) => t.trim()).filter(Boolean);
  let inGroup = false;
  let group = [];
  for (let raw of tokens) {
    let t = raw;
    if (t.startsWith('[')) { inGroup = true; t = t.slice(1).trim(); }
    let groupEnd = false, groupRepeat = false;
    const m = t.match(/\]\s*(×\s*n|×\s*\d+)?\s*$/);
    if (inGroup && m) { groupEnd = true; groupRepeat = !!m[1]; t = t.slice(0, m.index).trim(); }
    if (/^…+$|^\.\.\.$/.test(t)) { const e = { wild: true }; (inGroup ? group : out).push(e); }
    else {
      const rep = /×\s*(n|\d+)/.test(t);
      t = t.replace(/×\s*(n|\d+)/, '').trim();
      const mm = t.match(/^([^()]+?)\s*(?:\(([^()]+)\))?$/);
      const e = { label: (mm ? mm[1] : t).trim(), label2: mm && mm[2] ? mm[2].trim() : null, repeat: rep };
      (inGroup ? group : out).push(e);
    }
    if (groupEnd) { for (const e of group) { if (groupRepeat) e.repeat = true; out.push(e); } group = []; inGroup = false; }
  }
  for (const e of group) out.push(e);
  return out;
}

export function makeGroupOf(vocab) {
  const g = {};
  for (const gr of vocab.groups) for (const f of gr.functions) g[f.name] = gr.group;
  return g;
}

// 문단 하나(p)와 요소 하나(e)가 얼마나 맞는가: 0~1
export function sim(p, e, groupOf) {
  if (e.wild) return 0;
  let s = 0;
  if (p.label === e.label) s = 1;
  else if ((e.label2 && p.label === e.label2) || (p.label2 && p.label2 === e.label)) s = 0.6;
  else if (p.label2 && e.label2 && p.label2 === e.label2) s = 0.3;
  else if (groupOf && groupOf[p.label] && groupOf[p.label] === groupOf[e.label]) s = 0.3;
  if (s === 1 && e.label2 && p.label2 && p.label2 !== e.label2) s = 0.9;
  return s;
}

const MATCH_BASE = 0.35, GAP_P = 0.4, GAP_E = 0.5, OK = 0.6;

// 정렬: 반환 { score, norm, steps:[{type, p?, e?, sim?}] }
// type: 맞음(sim≥0.6) / 바뀜(정렬됐지만 sim<0.6) / 덧붙음(요소 없는 문단) / 빠짐(문단 없는 요소) / 생략(… 이 흡수)
export function align(paras, elems, groupOf) {
  const n = paras.length, m = elems.length;
  const NEG = -1e9;
  // dp[i][j][u]: 문단 i개, 요소 j개 처리. u=1이면 요소 j-1이 마지막 문단을 받았고 반복 가능
  const dp = Array.from({ length: n + 1 }, () => Array.from({ length: m + 1 }, () => [NEG, NEG]));
  const bt = Array.from({ length: n + 1 }, () => Array.from({ length: m + 1 }, () => [null, null]));
  dp[0][0][0] = 0;
  const set = (i, j, u, v, from) => { if (v > dp[i][j][u]) { dp[i][j][u] = v; bt[i][j][u] = from; } };
  for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) for (let u = 0; u < 2; u++) {
    const cur = dp[i][j][u];
    if (cur <= NEG / 2) continue;
    // 요소 j 건너뜀 (빠짐) — 와일드카드는 비용 없음
    if (j < m) set(i, j + 1, 0, cur - (elems[j].wild ? 0 : GAP_E), { i, j, u, type: elems[j].wild ? '생략' : '빠짐', e: j });
    // 문단 i 덧붙음
    if (i < n) set(i + 1, j, 0, cur - GAP_P, { i, j, u, type: '덧붙음', p: i });
    // 문단 i ↔ 요소 j 정렬
    if (i < n && j < m) {
      const e = elems[j];
      if (e.wild) set(i + 1, j + 1, 1, cur, { i, j, u, type: '생략', p: i, e: j });
      else { const s = sim(paras[i], e, groupOf); set(i + 1, j + 1, e.repeat ? 1 : 0, cur + s - MATCH_BASE, { i, j, u, type: s >= OK ? '맞음' : '바뀜', p: i, e: j, sim: s }); }
    }
    // 반복 요소가 문단을 하나 더 받음
    if (u === 1 && i < n && j > 0) {
      const e = elems[j - 1];
      if (e.wild) set(i + 1, j, 1, cur, { i, j, u, type: '생략', p: i, e: j - 1 });
      else { const s = sim(paras[i], e, groupOf); set(i + 1, j, 1, cur + s - MATCH_BASE, { i, j, u, type: s >= OK ? '맞음' : '바뀜', p: i, e: j - 1, sim: s, again: true }); }
    }
  }
  const u = dp[n][m][0] >= dp[n][m][1] ? 0 : 1;
  const score = dp[n][m][u];
  const steps = [];
  let i = n, j = m, uu = u;
  while (i > 0 || j > 0) {
    const b = bt[i][j][uu];
    if (!b) break;
    steps.push({ type: b.type, p: b.p, e: b.e, sim: b.sim, again: b.again });
    i = b.i; j = b.j; uu = b.u;
  }
  steps.reverse();
  const real = elems.filter((e) => !e.wild).length;
  const matched = steps.filter((s) => s.type === '맞음').length;
  const norm = score / Math.max(real, n, 1);
  return { score, norm, matched, steps };
}

export function formatElem(e) { return e.wild ? '…' : `${e.label}${e.label2 ? `(${e.label2})` : ''}${e.repeat ? ' ×n' : ''}`; }
export function formatPara(p) { return `${p.label}${p.label2 ? `(${p.label2})` : ''}`; }
