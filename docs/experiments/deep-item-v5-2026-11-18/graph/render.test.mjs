// render.mjs 그래프 1차(2026-11-25) 시험. API 호출 없음. 실행: node docs/experiments/deep-item-v5-2026-11-18/graph/render.test.mjs
// 근거: set-pattern-2026-11-18/CLI-graphB-code.md 2·5절. 2-a(기호 눈금)·2-b(기준선)·2-c(교점)·2-d(이름 배치)·2-e(단위 버그)·2-f(검증) + 회귀 9개.
// 회귀: graph-census/regress-before/ 의 9개와 견준다(방안 A 2026-11-25: 이름·범례가 바뀐 5개는 regress-after/ 를 새 기준으로도 견준다). 읽기 판은 2-e 단위 줄만 다르고, SVG는 곡선 이름이 한 낱말이 아니거나 겹쳤던 5개(2-d 의도)에서 이름·범례 줄만 다르다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSpec, readingText, renderSvg } from './render.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const V5 = path.join(HERE, '..');
const SP = path.join(V5, '..', 'set-pattern-2026-11-18');
const cases = [];
const t = (name, fn) => cases.push([name, fn]);
const line2 = (x1, x2, y1, y2) => ({ x1, x2, y1, y2 });

// 직선 하나(0,0)→(10,10)에 ⓐ(5,5). 기준선·교점 시험용
const base = (extra = {}) => ({
  xAxis: { label: '시간', unit: null }, yAxis: { label: '양', unit: null },
  series: [{ id: 's1', label: null, style: 'solid', curve: 'linear', points: [{ x: 0, y: 0 }, { x: 5, y: 5, mark: 'ⓐ' }, { x: 10, y: 10 }] }], ...extra,
});
const cross2 = (extra = {}) => ({
  xAxis: { label: '시간', unit: null }, yAxis: { label: '양', unit: null },
  series: [
    { id: 'u', label: 'ㄱ', style: 'solid', curve: 'linear', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] },
    { id: 'w', label: 'ㄴ', style: 'solid', curve: 'linear', points: [{ x: 0, y: 10 }, { x: 10, y: 0 }] },
  ], ...extra,
});
const guideLines = svg => [...svg.matchAll(/<line x1="([\d.]+)" x2="([\d.]+)" y1="([\d.]+)" y2="([\d.]+)"[^>]*data-role="guide"\/>/g)].map(m => line2(...m.slice(1, 5).map(Number)));
const circles = svg => [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)"/g)].map(m => ({ cx: Number(m[1]), cy: Number(m[2]) }));

// ---- 2-a ----
t('(2-a) yAxis.ticks: 그림에 label이 찍히고 읽기 판에 label만 나온다', () => {
  const s = base({ yAxis: { label: '가격', unit: 'P', ticks: [{ at: 3, label: 'P₁' }, { at: 8, label: 'P₂' }] } });
  assert.deepEqual(validateSpec(s).errs, []);
  const svg = renderSvg(s);
  assert.match(svg, />P₁<\/text>/); assert.match(svg, />P₂<\/text>/);
  const txt = readingText(s);
  assert.match(txt, /세로축에 기호가 적힌 눈금: P₁, P₂\./);
  assert.doesNotMatch(txt, /P₁\(|=3|3\.|8\./);
});
t('(2-a) yAxis.ticks: label 없으면 오류, 없는 명세는 줄이 안 생김', () => {
  assert.ok(validateSpec(base({ yAxis: { label: 'y', ticks: [{ at: 3 }] } })).errs.some(e => e.startsWith('yAxis.ticks')));
  assert.doesNotMatch(readingText(base()), /기호가 적힌 눈금/);
});
t('(2-a) yAxis.ticks의 at이 점 범위 밖이어도 그림 범위에 들어온다', () => {
  const s = base({ yAxis: { label: '양', ticks: [{ at: 20, label: '+' }] } });
  const m = renderSvg(s).match(/<text x="[\d.]+" y="([\d.]+)" text-anchor="end">\+<\/text>/);
  assert.ok(m && Number(m[1]) > 0 && Number(m[1]) < 360);
});

// ---- 2-b ----
t('(2-b) 기준선: 점 참조(표시 기호)는 그 점의 x에 수직선을 그린다', () => {
  const s = base({ guides: [{ dir: 'v', at: { series: 's1', point: 'ⓐ' }, label: null, to: 'axis' }] });
  assert.deepEqual(validateSpec(s).errs, []);
  const svg = renderSvg(s), cx = circles(svg)[0].cx, cy = circles(svg)[0].cy, g = guideLines(svg);
  assert.equal(g.length, 1); assert.equal(g[0].x1, cx); assert.equal(g[0].x2, cx); assert.equal(g[0].y2, cy); // 축에서 점까지
});
t('(2-b) 기준선: 수평 + to=axis는 세로축에서 그 점까지, to 없음은 그림 끝까지', () => {
  const pt = { series: 's1', point: 'ⓐ' };
  const svgA = renderSvg(base({ guides: [{ dir: 'h', at: pt, to: 'axis' }] })), a = guideLines(svgA)[0], cx = circles(svgA)[0].cx;
  assert.equal(a.x1, 64); assert.equal(a.x2, cx); assert.equal(a.y1, a.y2);
  const f = guideLines(renderSvg(base({ guides: [{ dir: 'h', at: pt }] })))[0];
  assert.equal(f.x1, 64); assert.equal(f.x2, 560 - 36);
});
t('(2-b) 기준선: to=계열 id는 그 계열과 만나는 곳까지(수직 x=5 → 곡선 위 ⓐ의 높이)', () => {
  const svg = renderSvg(base({ guides: [{ dir: 'v', at: 5, to: 's1' }] }));
  assert.equal(guideLines(svg)[0].y2, circles(svg)[0].cy);
  const h = renderSvg(base({ guides: [{ dir: 'h', at: 5, to: 's1' }] }));
  assert.equal(guideLines(h)[0].x2, circles(h)[0].cx);
});
t('(2-b) 기준선: peak·trough·start·end 참조', () => {
  const s = { xAxis: { label: 'x' }, yAxis: { label: 'y' }, series: [{ id: 'p', style: 'solid', curve: 'linear', points: [{ x: 0, y: 2 }, { x: 4, y: 9 }, { x: 8, y: -3 }, { x: 10, y: 1 }] }] };
  const g = (point, dir) => ({ dir, at: { series: 'p', point }, to: 'axis' });
  const ys = Object.fromEntries(['peak', 'trough', 'start', 'end'].map(k => [k, guideLines(renderSvg({ ...s, guides: [g(k, 'h')] }))[0].y1]));
  assert.ok(ys.peak < ys.start && ys.start < ys.trough && ys.end > ys.start && ys.end < ys.trough); // 화면 y는 위가 작다
  const xv = guideLines(renderSvg({ ...s, guides: [g('peak', 'v')] }))[0].x1, xt = guideLines(renderSvg({ ...s, guides: [g('trough', 'v')] }))[0].x1;
  assert.ok(xv < xt);
});
t('(2-b) 기준선 label: 축 쪽 끝에 기호가 찍히고 읽기 판에 한 줄', () => {
  const s = base({ guides: [{ dir: 'h', at: 3, label: 'P₁', to: null }, { dir: 'v', at: 6, label: 'Q₁', to: 's1' }] });
  assert.deepEqual(validateSpec(s).errs, []);
  const svg = renderSvg(s), txt = readingText(s);
  assert.match(svg, />P₁<\/text>/); assert.match(svg, />Q₁<\/text>/);
  assert.match(txt, /^P₁ 높이의 수평 기준선\.$/m); assert.match(txt, /^Q₁ 위치의 수직 기준선\.$/m);
});
t('(2-b) 기준선 label이 null이면 읽기 판에 줄이 없다', () => {
  assert.doesNotMatch(readingText(base({ guides: [{ dir: 'h', at: 3, label: null }] })), /기준선/);
});

// ---- 2-c ----
t('(2-c) crossMarks 배열: 교점에 점과 기호, 읽기 판 교점 줄에 기호', () => {
  const s = cross2({ crossMarks: [{ a: 'u', b: 'w', label: 'E' }] });
  assert.deepEqual(validateSpec(s).errs, []);
  const plain = renderSvg(cross2()), svg = renderSvg(s);
  assert.equal(circles(svg).length, circles(plain).length + 1);
  assert.match(svg, />E<\/text>/);
  assert.match(readingText(s), /만남\(교차, 교점 기호 E\)\./);
  assert.match(readingText(cross2()), /만남\(교차\)\./);
});
t('(2-c) crossMarks true: 모든 교점에 점만(읽기 판은 그대로)', () => {
  const s = cross2({ crossMarks: true });
  assert.equal(circles(renderSvg(s)).length, circles(renderSvg(cross2())).length + 1);
  assert.equal(readingText(s), readingText(cross2()));
});
t('(2-c) crossMarks: 교점이 없는 쌍·없는 계열 id는 오류', () => {
  const par = { xAxis: { label: 'x' }, yAxis: { label: 'y' }, series: [{ id: 'a', points: [{ x: 0, y: 0 }, { x: 5, y: 5 }] }, { id: 'b', points: [{ x: 0, y: 3 }, { x: 5, y: 8 }] }], crossMarks: [{ a: 'a', b: 'b', label: 'E' }] };
  assert.ok(validateSpec(par).errs.some(e => e.includes('교점이 없음')));
  assert.ok(validateSpec(cross2({ crossMarks: [{ a: 'u', b: 'zz' }] })).errs.some(e => e.includes('계열 id가 아님')));
});

// ---- 2-d ----
const etf = () => ({
  xAxis: { label: '시간', unit: 't' }, yAxis: { label: '가격', unit: '원' },
  series: [
    { id: 'm', label: '시장 가격', style: 'solid', curve: 'linear', points: [{ x: 0, y: 10 }, { x: 10, y: 30 }, { x: 20, y: 25 }] },
    { id: 'n', label: '실시간 추정 순자산가치', style: 'dashed', curve: 'linear', points: [{ x: 0, y: 12 }, { x: 10, y: 20 }, { x: 20, y: 25 }] },
  ],
});
const nameTexts = svg => [...svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)"( text-anchor="end")? font-size="14">([^<]*)<\/text>/g)].map(m => ({ x: Number(m[1]), y: Number(m[2]), end: !!m[3], s: m[4] }));
t('(2-d) 끝점이 같은 두 곡선: 이름 전체가 찍히고 서로 다른 자리', () => {
  const nm = nameTexts(renderSvg(etf()));
  assert.deepEqual(nm.map(n => n.s), ['시장 가격', '실시간 추정 순자산가치']);
  assert.ok(Math.abs(nm[0].y - nm[1].y) >= 14 || nm[0].end !== nm[1].end);
});
t('(2-d) 오른쪽 여백을 넘는 이름은 끝점 왼쪽(text-anchor=end)으로 옮긴다', () => {
  const nm = nameTexts(renderSvg(etf()));
  for (const n of nm) assert.ok(n.end, `${n.s}가 오른쪽으로 넘침`);
  const s = base(); s.series[0].label = 'ㄱ'; // 짧은 이름은 끝점 오른쪽 위(기본)
  assert.equal(nameTexts(renderSvg(s))[0].end, false);
});
t('(2-d) 범례에 선 모양(실선·점선) 작은 선', () => {
  const svg = renderSvg(etf());
  const sw = [...svg.matchAll(/<line [^>]*data-role="legend-swatch"\/>/g)].map(m => m[0]);
  assert.equal(sw.length, 2); assert.ok(!sw[0].includes('stroke-dasharray')); assert.ok(sw[1].includes('stroke-dasharray="7,5"'));
});

// ---- 2-e ----
t('(2-e) 단위 버그: 가로 눈금 label 뒤에 단위가 붙지 않는다', () => {
  const s = base({ xAxis: { label: '농도', unit: 'M', ticks: [{ at: 3, label: 'M₁' }, { at: 7, label: 'M₂' }] } });
  const txt = readingText(s);
  assert.match(txt, /가로축에 값이 적힌 눈금: M₁, M₂\./); assert.doesNotMatch(txt, /M₁M/);
  assert.match(txt, /가로축: 농도\(M\)/); // 단위는 축 이름 줄에만
});
t('(2-e) 단위 버그: 표시 점 이름·교차 위치에도 단위가 안 붙는다', () => {
  const s = cross2({ xAxis: { label: '시간', unit: 't', ticks: [{ at: 5, label: 't₁' }] } });
  const txt = readingText(s);
  assert.match(txt, /가로축 t₁에서 만남/); assert.doesNotMatch(txt, /t₁t/);
});

// ---- 2-f ----
const noEnd = ws => ws.filter(w => !w.startsWith('끝점 높이를 읽을 수 없음')); // 그래프 D에서 더한 경고는 따로 시험한다
t('(2-f) validateSpec: 새 필드 오류 문구', () => {
  const e = g => validateSpec(base({ guides: [g] })).errs.join('|');
  assert.match(e({ dir: 'x', at: 3 }), /guides\[0\]\.dir x은 h 또는 v가 아님/);
  assert.match(e({ dir: 'h', at: { series: 'nope', point: 'ⓐ' } }), /guides\[0\]\.at\.series nope는 계열 id가 아님/);
  assert.match(e({ dir: 'h', at: { series: 's1', point: 'ⓩ' } }), /guides\[0\]\.at\.point ⓩ는 표시 기호도/);
  assert.match(e({ dir: 'h', at: 3, to: 'axis' }), /to가 axis이면 at은 점 참조/);
  assert.match(e({ dir: 'h', at: 3, to: 'zz' }), /guides\[0\]\.to zz는 axis도 계열 id도 아님/);
  assert.match(e({ dir: 'h', at: 99, to: 's1' }), /계열과 만나는 곳이 없음/);
  assert.match(e({ dir: 'h', at: 'x' }), /guides\[0\]\.at은 숫자 또는/);
  assert.deepEqual(validateSpec(base({ guides: [{ dir: 'h', at: { series: 's1', point: 'ⓐ' }, to: 'axis' }, { dir: 'v', at: { series: 's1', point: 'end' }, to: 'axis' }] })).errs, []);
});
t('(2-f) validateSpec: 새 label(눈금·기준선·교점)에도 판정어 경고', () => {
  const w = s => validateSpec(s).warns.join('|');
  assert.match(w(base({ yAxis: { label: '양', ticks: [{ at: 3, label: '큰 값' }] } })), /판정어 "큰"/);
  assert.match(w(base({ guides: [{ dir: 'h', at: 3, label: '증가 기준' }] })), /판정어 "증가"/);
  assert.match(w(cross2({ crossMarks: [{ a: 'u', b: 'w', label: '결과' }] })), /판정어 "결과"/);
  assert.deepEqual(noEnd(validateSpec(base({ guides: [{ dir: 'h', at: 3, label: 'P₁' }] })).warns), []);
});
t('(2-f) validateSpec: 새 필드가 없는 명세는 지금처럼 통과', () => {
  const v = validateSpec(base()); assert.deepEqual(v.errs, []); assert.deepEqual(noEnd(v.warns), []);
});

// ---- 회귀 9개 ----
const readJ = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const items = (dir, key) => readJ(path.join(V5, dir, 'items.json')).items.filter(i => i.graphSpec).map(i => [`${key}/${i.version}`, i.graphSpec]);
const REG = [
  ['doppler/doppler-12.spec', readJ(path.join(V5, 'graph/doppler-12.spec.json')), true],
  ...['s1-auxin', 's2-hysteresis', 's3-monopoly', 's4-etf'].map(n => [`hand/${n}.spec`, readJ(path.join(SP, 'graph-census/hand', `${n}.spec.json`)), n === 's1-auxin']),
  ...items('out-cell2-v62/tax-incidence-excise-A', 'tax-incidence-excise-A').map(([k, s]) => [k, s, false]),
  ...items('out-cell2-v62/tax-incidence-excise-B', 'tax-incidence-excise-B').map(([k, s]) => [k, s, false]),
  ...items('out-cell3-v62/auxin-growth-A', 'auxin-growth-A').map(([k, s]) => [k, s, true]),
  ...items('out-cell3-v62/auxin-growth-B', 'auxin-growth-B').map(([k, s]) => [k, s, true]),
];
const before = (key, ext) => fs.readFileSync(path.join(SP, 'graph-census/regress-before', `${key}.${ext}`), 'utf8');
const golden = key => fs.readFileSync(path.join(SP, 'graph-census/regress-after', `${key}.svg`), 'utf8'); // 2026-11-25 방안 A: 이름·범례가 바뀐 5개의 새 기준
const unitless = (txt, spec) => (spec.xAxis.ticks || []).reduce((s, tk) => s.split(`${tk.label}${spec.xAxis.unit || ''}`).join(`${tk.label}`), txt);
t('(회귀) 기준 파일 9개가 모두 있다', () => { assert.equal(REG.length, 9); for (const [k] of REG) assert.ok(fs.existsSync(path.join(SP, 'graph-census/regress-before', `${k}.svg`)), k); });
for (const [key, spec, svgSame] of REG) {
  t(`(회귀) ${key}: 읽기 판은 단위 줄과 '같은 가로 위치' 이름 줄만 다르다`, () => { // 그래프 D(2026-11-25): 다른 계열의 표시 기호를 끝점 이름으로 집어 오던 버그 수리
    const a = unitless(before(key, 'txt'), spec).trim().split('\n'), b = readingText(spec).trim().split('\n'), sa = new Set(a);
    assert.equal(a.length, b.length);
    assert.ok(b.filter(l => !sa.has(l)).every(l => l.includes('와 같은 가로 위치')), `관계없는 줄이 바뀜: ${b.find(l => !sa.has(l) && !l.includes('와 같은 가로 위치'))}`);
    const gp = path.join(SP, 'graph-census/regress-after', `${key}.txt`);
    if (fs.existsSync(gp)) assert.equal(readingText(spec) + '\n', fs.readFileSync(gp, 'utf8')); // 그래프 D 새 기준
  });
  t(`(회귀) ${key}: SVG ${svgSame ? '바이트 동일' : '곡선 이름·범례 줄만 다름'}`, () => {
    const now = renderSvg(spec), old = before(key, 'svg');
    if (svgSame) return assert.equal(now, old);
    const a = now.split('\n'), b = old.split('\n'), cnt = new Map();
    for (const l of b) cnt.set(l, (cnt.get(l) || 0) + 1);
    const added = [];
    for (const l of a) { if (cnt.get(l)) cnt.set(l, cnt.get(l) - 1); else added.push(l); }
    const removed = [...cnt].flatMap(([l, n]) => Array(n).fill(l));
    assert.ok(removed.every(l => l.startsWith('<text ')), `사라진 줄이 이름·범례 글자가 아님: ${removed.find(l => !l.startsWith('<text '))}`);
    assert.ok(added.every(l => l.startsWith('<text ') || /data-role="(legend-swatch|name-leader)"/.test(l)), `새 줄이 이름·범례가 아님: ${added.find(l => !(l.startsWith('<text ') || /data-role=/.test(l)))}`);
    assert.equal(a.filter(l => l.startsWith('<path')).join('\n'), b.filter(l => l.startsWith('<path')).join('\n')); // 곡선은 그대로
    assert.equal(now, golden(key)); // 새 기준(regress-after)과 바이트 동일
  });
}

// ---- 그래프 D: 읽기 판 끝점 이름 + 끝점 높이 경고 ----
const GC = JSON.parse(fs.readFileSync(path.join(V5, 'out-graphC/gen32-o4-T5-1-B/leakfix/items-leakfix.json'), 'utf8')).items.find(i => i.version === 'V2').graphSpec;
t('(D-1) 읽기 판: 표시 없는 끝점은 다른 계열의 기호를 이름으로 쓰지 않는다(graphC B)', () => {
  const r = readingText(GC);
  assert.ok(!/병[\s\S]*ⓔ\(100\) → ⓑ:/.test(r), r);
  assert.match(r, /- ⓔ\(100\) → 가로축 1\(ⓑ·?ⓓ?와 같은 가로 위치\): 증가|- ⓔ\(100\) → 가로축 1\(ⓑ와 같은 가로 위치\): 증가/);
});
t('(D-1) 읽기 판: 자기 계열 mark와 눈금 없는 시작·끝 이름은 그대로', () => {
  const s = base(); const r = readingText(s); assert.match(r, /시작|끝|ⓐ/);
});
t('(D-2) validateSpec: 끝점 높이를 읽을 수 없으면 경고만(graphC B의 병 끝점 120)', () => {
  const v = validateSpec(GC); assert.deepEqual(v.errs, []);
  assert.ok(v.warns.some(w => w === '끝점 높이를 읽을 수 없음: 병 (1, 120)'), v.warns.join('|'));
  assert.ok(!v.warns.some(w => w.startsWith('끝점 높이를 읽을 수 없음: 갑') || w.startsWith('끝점 높이를 읽을 수 없음: 을')));
});
t('(D-2) validateSpec: 세로축 값·기호 눈금이 있거나 mark가 있으면 경고 없음', () => {
  const sp = y => ({ xAxis: { label: 'x' }, yAxis: { label: 'y', values: [1, 2] }, series: [{ id: 's', label: 'S', points: [{ x: 0, y: 1 }, { x: 1, y: y }] }] });
  assert.deepEqual(validateSpec(sp(2)).warns, []);
  assert.equal(validateSpec(sp(3)).warns.length, 1);
  const withTick = sp(3); withTick.yAxis.ticks = [{ at: 3, label: 'P₁' }]; assert.deepEqual(validateSpec(withTick).warns, []);
  const withMark = sp(3); withMark.series[0].points[1].mark = 'ⓐ'; assert.deepEqual(validateSpec(withMark).warns, []);
});

let fail = 0;
for (const [name, fn] of cases) {
  try { fn(); console.log('통과  ' + name); } catch (e) { fail++; console.log('실패  ' + name + '\n      ' + e.message.split('\n')[0]); }
}
console.log(`\n${cases.length - fail}/${cases.length} 통과`);
process.exit(fail ? 1 : 0);
