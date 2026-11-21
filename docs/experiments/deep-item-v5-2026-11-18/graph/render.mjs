// 그래프 명세(JSON) → SVG + "그래프 읽기 판"(글). 2026-11-21, ③ 그래프 칸. API 호출 없음.
// 모델은 그림을 그리지 않고 명세 JSON만 낸다. 〈보기〉(bogi)는 명세에서 자동으로 만든 읽기 판이고, 평가자는 SVG와 읽기 판을 같이 본다.
//
// 명세 형식(graphSpec):
// {
//   "xAxis": {"label":"시간","unit":"t"|null, "ticks":[{"at":1,"label":"20"}]},     // ticks = 가로축에 찍을 눈금(선택). label(표시 값)이 필수이고 그림·읽기 판에는 label만 찍는다. 선지가 가로축의 값·범위로 판정되면 그 값을 label로 준다.
//   "yAxis": {"label":"도플러 변위","unit":"Hz"|null, "values":[-200,0,300]},      // 값 눈금(최소만). 점의 y가 여기 없으면 숫자를 보여 주지 않는다.
//   "series": [{"id":"s1","label":"㉠"|null,"style":"solid|dashed","curve":"smooth|linear",
//               "points":[{"x":0,"y":0},{"x":1,"y":-200,"mark":"ⓐ"}, ...]}],      // points는 x 오름차순. mark = 곡선 위에 찍을 표시 기호
//   "shade": [{"series":"s1","from":"ⓑ","to":"ⓓ"}]                                // (선택) 곡선과 가로축 사이 빗금(넓이 읽기용)
// }
// 읽기 판은 그림에 보이는 것만 적는다(2026-11-21): 축 이름·단위, 눈금 값, 표시 점의 값(눈금에 있을 때)과 가로축 위·아래, 구간별 증가/감소/일정, 꼭짓점(최고·최저), 가로축(0) 통과와 부호, 계열 사이 교차. 기울기 크기 순위와 눈금 id는 적지 않는다.
// 사용:  node graph/render.mjs <spec.json> <출력 폴더>        → <이름>.svg, <이름>.txt
//        node graph/render.mjs --items <items.json> <출력 폴더> → 문항마다 <version>.svg/.txt
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EPS = 1e-9;
const JUDGE_WORDS = ['빠른', '느린', '큰', '작은', '많은', '적은', '증가', '감소', '높은', '낮은', '같은', '다른', '클수록', '해당', '결과', '판정', '정답', '밝', '어두', '방향', '반대'];
const fmt = v => (v < 0 ? '−' : '') + Math.abs(v);
const sgn = v => (Math.abs(v) < EPS ? 0 : v > 0 ? 1 : -1);

export function validateSpec(spec) {
  const errs = [], warns = [];
  if (!spec || typeof spec !== 'object') return { errs: ['명세가 객체가 아님'], warns };
  if (!spec.xAxis?.label) errs.push('xAxis.label 없음');
  if (!spec.yAxis?.label) errs.push('yAxis.label 없음');
  if (!Array.isArray(spec.series) || !spec.series.length) errs.push('series 비어 있음');
  const marks = new Set();
  for (const [i, s] of (spec.series || []).entries()) {
    if (!Array.isArray(s.points) || s.points.length < 2) { errs.push(`series[${i}] 점이 2개 미만`); continue; }
    s.points.forEach((p, j) => {
      if (typeof p.x !== 'number' || typeof p.y !== 'number') errs.push(`series[${i}].points[${j}] x·y가 숫자 아님`);
      if (j && p.x <= s.points[j - 1].x) errs.push(`series[${i}].points[${j}] x가 오름차순 아님`);
      if (p.mark) { if (marks.has(p.mark)) errs.push(`표시 기호 ${p.mark} 중복`); marks.add(p.mark); }
    });
  }
  for (const t of spec.xAxis?.ticks || []) if (typeof t.at !== 'number' || t.label === undefined || t.label === null || String(t.label).trim() === '') errs.push('xAxis.ticks 항목에 at(숫자)·label(표시 값) 필요');
  for (const sh of spec.shade || []) for (const k of ['from', 'to']) if (!marks.has(sh[k])) errs.push(`shade.${k} ${sh[k]}는 표시 기호가 아님`);
  const labelTexts = [spec.xAxis?.label, spec.xAxis?.unit, spec.yAxis?.label, spec.yAxis?.unit, ...(spec.series || []).map(s => s.label)].filter(Boolean);
  for (const t of labelTexts) for (const w of JUDGE_WORDS) if (String(t).includes(w)) warns.push(`축·범례 "${t}"에 판정어 "${w}"`);
  return { errs, warns };
}

// ---- 분석 ----
function analyze(spec) {
  const marks = []; // {name, x, y, series}
  for (const [si, s] of spec.series.entries()) for (const p of s.points) if (p.mark) marks.push({ name: p.mark, x: p.x, y: p.y, series: si });
  for (const t of spec.xAxis.ticks || []) marks.push({ name: `가로축 ${t.label}${spec.xAxis.unit || ''}`, x: t.at, y: null, series: null, tick: true });
  marks.sort((a, b) => a.x - b.x);
  const xmin = Math.min(...spec.series.map(s => s.points[0].x));
  const where = (x, si = null) => { // si: 읽고 있는 계열 번호. 같은 가로 좌표에 다른 계열의 표시 기호가 있으면 그 계열 점으로 오해하지 않게 "같은 가로 위치"로 쓴다.
    if (x <= xmin + 1e-6) return '시작';
    const at = marks.filter(m => Math.abs(m.x - x) < 1e-6);
    const own = at.find(m => m.series === si), tick = at.find(m => m.tick), other = at.find(m => !m.tick && m.series !== si);
    if (own) return own.name;
    if (tick) return other ? `${tick.name}(${other.name}와 같은 가로 위치)` : tick.name;
    if (other) return `${other.name}와 같은 가로 위치`;
    const before = [...marks].reverse().find(m => m.x < x), after = marks.find(m => m.x > x);
    if (before && after) return `${before.name}와 ${after.name} 사이`;
    if (after) return `${after.name} 이전`;
    if (before) return `${before.name} 이후`;
    return `x=${x}`;
  };
  const values = spec.yAxis.values || [];
  const out = { marks, where, series: [] };
  for (const s of spec.series) {
    const pts = s.points;
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const dy = pts[i + 1].y - pts[i].y, dx = pts[i + 1].x - pts[i].x;
      segs.push({ from: pts[i], to: pts[i + 1], dir: sgn(dy), slope: Math.abs(dy / dx) });
    }
    // 같은 방향이 이어지면 한 구간으로 묶는다(꼭짓점 사이 단조 구간).
    const runs = [];
    for (const g of segs) {
      const last = runs[runs.length - 1];
      if (last && last.dir === g.dir && !last.to.mark) { last.to = g.to; last.parts.push(g); } else runs.push({ from: g.from, to: g.to, dir: g.dir, parts: [g] });
    }
    for (const r of runs) { const dy = Math.abs(r.to.y - r.from.y), dx = r.to.x - r.from.x; r.slope = dy / dx; r.single = r.parts.length === 1; }
    const turns = [];
    for (let i = 1; i < runs.length; i++) {
      const a = runs[i - 1].dir, b = runs[i].dir;
      if (a > 0 && b < 0) turns.push({ p: runs[i].from, kind: '최고점' });
      else if (a < 0 && b > 0) turns.push({ p: runs[i].from, kind: '최저점' });
    }
    // 가로축(y=0) 통과·부호 구간
    const crossings = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (sgn(a.y) !== 0 && sgn(b.y) !== 0 && sgn(a.y) !== sgn(b.y)) crossings.push({ x: a.x + (b.x - a.x) * (0 - a.y) / (b.y - a.y), from: sgn(a.y), to: sgn(b.y) });
      else if (sgn(b.y) === 0 && i + 1 < pts.length - 1 && sgn(pts[i + 2].y) !== 0 && sgn(a.y) !== 0 && sgn(a.y) !== sgn(pts[i + 2].y)) crossings.push({ x: b.x, from: sgn(a.y), to: sgn(pts[i + 2].y) });
    }
    out.series.push({ s, pts, runs, turns, crossings });
  }
  // 계열 사이 교차(선형 보간)
  out.cross = [];
  for (let a = 0; a < spec.series.length; a++) for (let b = a + 1; b < spec.series.length; b++) {
    const xs = [...new Set([...spec.series[a].points, ...spec.series[b].points].map(p => p.x))].sort((p, q) => p - q);
    const f = (s, x) => { const P = s.points; if (x < P[0].x || x > P[P.length - 1].x) return null; for (let i = 0; i < P.length - 1; i++) if (x >= P[i].x && x <= P[i + 1].x) return P[i].y + (P[i + 1].y - P[i].y) * (x - P[i].x) / (P[i + 1].x - P[i].x); return null; };
    for (let i = 0; i < xs.length - 1; i++) {
      const [fa0, fb0, fa1, fb1] = [f(spec.series[a], xs[i]), f(spec.series[b], xs[i]), f(spec.series[a], xs[i + 1]), f(spec.series[b], xs[i + 1])];
      if ([fa0, fb0, fa1, fb1].some(v => v === null)) continue;
      const d0 = fa0 - fb0, d1 = fa1 - fb1;
      if (sgn(d0) !== 0 && sgn(d1) !== 0 && sgn(d0) !== sgn(d1)) out.cross.push({ a, b, x: xs[i] + (xs[i + 1] - xs[i]) * d0 / (d0 - d1) });
      else if (sgn(d1) === 0 && sgn(d0) !== 0) out.cross.push({ a, b, x: xs[i + 1], touch: true });
    }
  }
  out.values = values;
  return out;
}

const dirWord = d => d > 0 ? '증가' : d < 0 ? '감소' : '일정';
const nameOf = (s, i, n) => s.label || (n > 1 ? `곡선 ${i + 1}` : '곡선');

export function readingText(spec) {
  const A = analyze(spec), n = spec.series.length, L = [];
  const ax = spec.xAxis, ay = spec.yAxis;
  L.push('[그래프 읽기 판]');
  L.push(`가로축: ${ax.label}${ax.unit ? `(${ax.unit})` : ''}. 세로축: ${ay.label}${ay.unit ? `(${ay.unit})` : ''}.`);
  if (A.values.length) L.push(`세로축에 값이 적힌 눈금: ${A.values.map(fmt).join(', ')}.`);
  const mkInfo = [];
  for (const [si, S] of spec.series.entries()) for (const p of S.points) if (p.mark) mkInfo.push({ x: p.x, t: `${p.mark}(${n > 1 ? nameOf(S, si, n) + ', ' : ''}가로축 ${sgn(p.y) > 0 ? '위' : sgn(p.y) < 0 ? '아래' : '0, 가로축 위'})` });
  mkInfo.sort((a, b) => a.x - b.x);
  if (mkInfo.length) L.push(`곡선 위 표시(가로축 왼쪽부터): ${mkInfo.map(m => m.t).join(', ')}.`);
  const tk = (ax.ticks || []).map(t => `${t.label}${ax.unit || ''}`);
  if (tk.length) L.push(`가로축에 값이 적힌 눈금: ${tk.join(', ')}.`);
  for (const [i, S] of A.series.entries()) {
    const nm = nameOf(S.s, i, n);
    L.push(`${nm}${S.s.style === 'dashed' ? '(점선)' : ''}:`);
    const label = p => p.mark || A.marks.find(m => Math.abs(m.x - p.x) < 1e-6)?.name || (p === S.pts[0] ? '시작' : p === S.pts[S.pts.length - 1] ? '끝' : `x=${p.x}`);
    const valueAt = p => A.values.includes(p.y) ? `(${fmt(p.y)})` : '';
    for (const r of S.runs) {
      const shape = r.dir === 0 ? '일정' : dirWord(r.dir);
      L.push(`- ${label(r.from)}${valueAt(r.from)} → ${label(r.to)}${valueAt(r.to)}: ${shape}`);
    }
    for (const t of S.turns) L.push(`- ${label(t.p)}: ${t.kind}${valueAt(t.p)}`);
    // 가로축(0) 통과와 부호
    const zero = S.crossings.map(c => `${A.where(c.x, i)}에서 가로축(0)을 지남(${c.from > 0 ? '양→음' : '음→양'})`);
    if (zero.length) L.push(`- ${zero.join(', ')}`);
    const ys = S.pts.map(p => p.y);
    if (Math.min(...ys) < 0 && Math.max(...ys) > 0) {
      const sc = [], pts = S.pts; let cur = sgn(pts[0].y) || sgn(pts[1].y), start = pts[0];
      const bounds = S.crossings.map(c => c.x);
      const sign = v => v > 0 ? '양(+)' : '음(−)';
      let prevX = pts[0].x, prevS = cur;
      for (const bx of bounds) { sc.push(`${A.where(prevX, i)}~${A.where(bx, i)} ${sign(prevS)}`); prevX = bx; prevS = -prevS; }
      sc.push(`${A.where(prevX, i)}~끝 ${sign(prevS)}`);
      L.push(`- 가로축 기준 부호: ${sc.join(', ')}`);
    }
    else if (Math.max(...ys) <= 0 && Math.min(...ys) < 0) L.push('- 가로축 기준 부호: 전 구간 음(−)');
    else if (Math.min(...ys) >= 0 && Math.max(...ys) > 0) L.push('- 가로축 기준 부호: 전 구간 양(+)');
  }
  for (const c of A.cross) L.push(`${nameOf(spec.series[c.a], c.a, n)}와 ${nameOf(spec.series[c.b], c.b, n)}는 ${A.where(c.x)}에서 만남${c.touch ? '(접함)' : '(교차)'}.`);
  for (const sh of spec.shade || []) L.push(`빗금: ${sh.from}~${sh.to} 구간에서 곡선과 가로축 사이.`);
  return L.join('\n');
}

// ---- SVG ----
function monotonePath(P) { // P: [[x,y]] 화면 좌표, Fritsch–Carlson 단조 3차 보간(꼭짓점에서 넘치지 않음)
  const n = P.length; if (n < 3) return `M${P.map(p => p.map(v => v.toFixed(1)).join(',')).join(' L')}`;
  const dx = [], m = [], t = new Array(n);
  for (let i = 0; i < n - 1; i++) { dx[i] = P[i + 1][0] - P[i][0]; m[i] = (P[i + 1][1] - P[i][1]) / dx[i]; }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = Math.hypot(a, b);
    if (h > 3) { t[i] = 3 * a / h * m[i]; t[i + 1] = 3 * b / h * m[i]; }
  }
  let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) d += ` C${(P[i][0] + dx[i] / 3).toFixed(1)},${(P[i][1] + t[i] * dx[i] / 3).toFixed(1)} ${(P[i + 1][0] - dx[i] / 3).toFixed(1)},${(P[i + 1][1] - t[i + 1] * dx[i] / 3).toFixed(1)} ${P[i + 1][0].toFixed(1)},${P[i + 1][1].toFixed(1)}`;
  return d;
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function renderSvg(spec) {
  const W = 560, H = 360, ml = 64, mr = 36, mt = 28, mb = 56;
  const all = spec.series.flatMap(s => s.points);
  const xs = all.map(p => p.x), ys = [...all.map(p => p.y), 0, ...(spec.yAxis.values || [])];
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const padY = (y1 - y0) * 0.12 || 1, padX = (x1 - x0) * 0.06 || 1;
  const X = x => ml + (x - (x0 - 0)) / (x1 + padX - x0) * (W - ml - mr);
  const Y = y => H - mb - (y - (y0 - padY)) / (y1 + padY - (y0 - padY)) * (H - mb - mt);
  const axisY = Y(Math.min(Math.max(0, y0 - padY), y1 + padY)); // 가로축은 y=0에 둔다
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="'Apple SD Gothic Neo','Noto Sans KR',sans-serif" font-size="13">`);
  o.push(`<rect width="${W}" height="${H}" fill="#fff"/>`);
  o.push(`<defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L7,4 L0,8 z" fill="#000"/></marker><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#000" stroke-width="1"/></pattern></defs>`);
  // 값 눈금 점선
  for (const v of spec.yAxis.values || []) {
    if (v !== 0) o.push(`<line x1="${ml}" x2="${W - mr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#000" stroke-width=".6" stroke-dasharray="2,4"/>`);
    o.push(`<line x1="${ml - 4}" x2="${ml}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#000"/>`);
    o.push(`<text x="${ml - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${fmt(v)}</text>`);
  }
  // 축
  o.push(`<line x1="${ml}" y1="${H - mb + 8}" x2="${ml}" y2="${mt - 10}" stroke="#000" stroke-width="1.4" marker-end="url(#ah)"/>`);
  o.push(`<line x1="${ml - 6}" y1="${axisY.toFixed(1)}" x2="${W - mr + 14}" y2="${axisY.toFixed(1)}" stroke="#000" stroke-width="1.4" marker-end="url(#ah)"/>`);
  o.push(`<text x="10" y="${mt - 14}" text-anchor="start" font-size="12">${esc(spec.yAxis.label)}${spec.yAxis.unit ? `(${esc(spec.yAxis.unit)})` : ''}</text>`);
  o.push(`<text x="${W - mr + 12}" y="${(axisY - 10).toFixed(1)}" text-anchor="end" font-size="12">${esc(spec.xAxis.label)}${spec.xAxis.unit ? `(${esc(spec.xAxis.unit)})` : ''}</text>`);
  // 구간 경계 눈금
  for (const t of spec.xAxis.ticks || []) {
    o.push(`<line x1="${X(t.at).toFixed(1)}" x2="${X(t.at).toFixed(1)}" y1="${axisY - 4}" y2="${axisY + 4}" stroke="#000"/>`);
    o.push(`<text x="${X(t.at).toFixed(1)}" y="${(axisY + 18).toFixed(1)}" text-anchor="middle">${esc(t.label)}</text>`);
  }
  // 빗금
  for (const sh of spec.shade || []) {
    const s = spec.series.find(q => q.id === sh.series) || spec.series[0];
    const a = s.points.find(p => p.mark === sh.from), b = s.points.find(p => p.mark === sh.to);
    const inside = s.points.filter(p => p.x >= a.x && p.x <= b.x);
    const pathPts = s.curve === 'linear' ? inside.map(p => [X(p.x), Y(p.y)]) : null;
    const top = pathPts ? `M${pathPts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' L')}` : monotonePath(inside.map(p => [X(p.x), Y(p.y)]));
    o.push(`<path d="${top} L${X(b.x).toFixed(1)},${axisY.toFixed(1)} L${X(a.x).toFixed(1)},${axisY.toFixed(1)} Z" fill="url(#hatch)" opacity=".35" stroke="none"/>`);
  }
  // 곡선
  for (const s of spec.series) {
    const P = s.points.map(p => [X(p.x), Y(p.y)]);
    const d = s.curve === 'linear' ? `M${P.map(p => p.map(v => v.toFixed(1)).join(',')).join(' L')}` : monotonePath(P);
    o.push(`<path d="${d}" fill="none" stroke="#000" stroke-width="2" ${s.style === 'dashed' ? 'stroke-dasharray="7,5"' : ''}/>`);
    if (s.label) { const e = P[P.length - 1]; o.push(`<text x="${(e[0] + 6).toFixed(1)}" y="${(e[1] - 6).toFixed(1)}" font-size="14">${esc(s.label)}</text>`); }
    for (const p of s.points) if (p.mark) {
      const px = X(p.x), py = Y(p.y), up = p.y >= 0;
      o.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.4" fill="#000"/>`);
      o.push(`<line x1="${px.toFixed(1)}" x2="${px.toFixed(1)}" y1="${py.toFixed(1)}" y2="${axisY.toFixed(1)}" stroke="#000" stroke-width=".6" stroke-dasharray="2,3"/>`);
      o.push(`<text x="${px.toFixed(1)}" y="${(py + (up ? -9 : 17)).toFixed(1)}" text-anchor="middle" font-size="15">${esc(p.mark)}</text>`);
    }
  }
  o.push('</svg>');
  return o.join('\n');
}

export function renderBoth(spec) { return { svg: renderSvg(spec), text: readingText(spec) }; }

// ---- CLI ----
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const itemsMode = args[0] === '--items';
  const [inp, outDir] = itemsMode ? [args[1], args[2]] : [args[0], args[1]];
  if (!inp || !outDir) { console.error('사용: node render.mjs <spec.json> <출력 폴더>  |  --items <items.json> <출력 폴더>'); process.exit(1); }
  fs.mkdirSync(outDir, { recursive: true });
  const jobs = itemsMode
    ? JSON.parse(fs.readFileSync(inp, 'utf8')).items.filter(it => it.graphSpec).map(it => [it.version, it.graphSpec])
    : [[path.basename(inp).replace(/\.json$/, ''), JSON.parse(fs.readFileSync(inp, 'utf8'))]];
  for (const [name, spec] of jobs) {
    const v = validateSpec(spec);
    if (v.errs.length) { console.error(`[${name}] 명세 오류: ${v.errs.join(' / ')}`); continue; }
    const { svg, text } = renderBoth(spec);
    fs.writeFileSync(path.join(outDir, `${name}.svg`), svg);
    fs.writeFileSync(path.join(outDir, `${name}.txt`), text + '\n');
    console.log(`[${name}] → ${path.join(outDir, name)}.svg/.txt` + (v.warns.length ? ` (경고: ${v.warns.join(' / ')})` : ''));
  }
}
