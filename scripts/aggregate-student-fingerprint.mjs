// 학생 이해 지문 집계: 판정 자료(라운드별 노드·관계 라벨)를 묶음 × 칸(층·갈래·유형)으로 센다. 외부 전송 없음.
// node scripts/aggregate-student-fingerprint.mjs --config <json> --out <dir> [--group-by session|source]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { errorEvents, latestByJob, jobId } from './run-analysis-judge-gongsun.mjs';
import { BRANCHES, TYPES, BRANCH_OF } from './run-relation-classify.mjs';

export const LAYERS = ['명제', '합성', '요지'];
const LAYER_OF_KIND = { COMPOSITE: '합성', PARAGRAPH_GIST: '요지' };
const LABELS = ['DIRECT', 'PARTIAL', 'ABSENT', 'CONTRADICTS'];
const sha256 = buf => createHash('sha256').update(buf).digest('hex');
const jsonl = text => text.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));

export const SMALL_N = 10; // 이보다 N이 작은 칸은 표본 적음
const newCell = () => ({ D: 0, P: 0, A: 0, C: 0, Cinherited: 0, UNJUDGED: 0, events: new Set() });
export function finishCell(c) {
  const { D, P, A, C, UNJUDGED } = c, N = D + P + A + C;
  return { D, P, A, C, Cinherited: c.Cinherited ?? 0, UNJUDGED, smallSample: N < SMALL_N, capture: N ? (D + P) / N : null, precision: D + P ? D / (D + P) : null, errorRate: D + P + C ? C / (D + P + C) : null, errorEvents: c.events.size };
}
const SHORT = { DIRECT: 'D', PARTIAL: 'P', ABSENT: 'A', CONTRADICTS: 'C' };
const bump = (cell, label) => { cell[label ? SHORT[label] : 'UNJUDGED']++; };

function newView() {
  return { layers: Object.fromEntries(LAYERS.map(k => [k, newCell()])), branches: Object.fromEntries(BRANCHES.map(([b]) => [b, newCell()])), types: Object.fromEntries(TYPES.map(t => [t, newCell()])), events: new Set(), rounds: 0 };
}

// passages: [{ passageId, map, rounds, judgmentRows, combined, classify }]
export function aggregate({ passages, groupBy = 'session' }) {
  const groups = new Map(); // key -> { first: view, last: view }
  const group = key => { if (!groups.has(key)) groups.set(key, { first: newView(), last: newView() }); return groups.get(key); };
  let excludedCrossRelations = 0, unlocatedErrors = 0;
  for (const { passageId, map, rounds, judgmentRows, combined, classify } of passages) {
    const layerOf = Object.fromEntries([...map.propositions.map(p => [p.id, '명제']), ...map.nodes.map(n => [n.id, LAYER_OF_KIND[n.kind]]).filter(([, l]) => l)]);
    const typeOf = Object.fromEntries(classify.items.map(i => [i.id, i.type]));
    const byJob = latestByJob(judgmentRows);
    const roundMeta = new Map(rounds.map(r => [`${r.dialogueId}|${r.roundIndex}`, r]));
    const minMax = new Map(); // dialogueId -> [min, max]
    for (const e of combined) { const m = minMax.get(e.dialogueId); minMax.set(e.dialogueId, m ? [Math.min(m[0], e.roundIndex), Math.max(m[1], e.roundIndex)] : [e.roundIndex, e.roundIndex]); }
    const inheritedSet = new Set(); // 끝 노드의 ✕를 물려받은 관계 ✕: dialogueId|roundIndex|relId
    const relById = new Map(map.relations.map(r => [r.id, r]));
    const crossSet = new Set(); // dialogueId|roundIndex|relId (문단을 넘는 관계)
    const keyOfRound = r => groupBy === 'source' ? r.source : r.sessionId;
    const viewsOf = (dialogueId, roundIndex) => {
      const [lo, hi] = minMax.get(dialogueId), meta = roundMeta.get(`${dialogueId}|${roundIndex}`), g = group(keyOfRound(meta)), all = group('ALL');
      return [roundIndex === lo && [g.first, all.first], roundIndex === hi && [g.last, all.last]].filter(Boolean).flat();
    };
    for (const e of combined) {
      const views = viewsOf(e.dialogueId, e.roundIndex);
      for (const view of views) view.rounds++;
      const check = (kind, id, label) => {
        const row = byJob.get(jobId(e.dialogueId, e.roundIndex, kind, id));
        if ((row?.finalLabel ?? null) !== label) throw new Error(`combined/judgments 라벨 불일치: ${e.dialogueId}|${e.roundIndex}|${kind}|${id} combined=${label} judgments=${row?.finalLabel ?? null}`);
      };
      for (const [id, n] of Object.entries(e.nodes)) {
        check('node', id, n.label);
        if (!layerOf[id]) throw new Error(`지도에 층이 없는 노드: ${id}`);
        for (const view of views) bump(view.layers[layerOf[id]], n.label);
      }
      for (const [id, r] of Object.entries(e.relations)) {
        check('relation', id, r.label);
        if (r.crossEndUnchecked?.length) { crossSet.add(`${e.dialogueId}|${e.roundIndex}|${id}`); excludedCrossRelations++; continue; }
        const type = typeOf[id];
        if (!type) throw new Error(`classify에 관계 id 없음: ${passageId} ${id}`);
        const rel = relById.get(id), inherited = r.label === 'CONTRADICTS' && [rel.fromId, rel.toId].some(end => e.nodes[end]?.label === 'CONTRADICTS');
        if (inherited) inheritedSet.add(`${e.dialogueId}|${e.roundIndex}|${id}`);
        for (const view of views) for (const cell of [view.types[type], view.branches[BRANCH_OF[type]]]) { if (inherited) cell.Cinherited++; else bump(cell, r.label); }
      }
    }
    // 오류 사건
    const { events, unlocated } = errorEvents(rounds, judgmentRows, map);
    unlocatedErrors += unlocated.length;
    for (const ev of events) {
      const nodes = ev.units.nodes, relations = ev.units.relations.filter(id => !crossSet.has(`${ev.dialogueId}|${ev.round}|${id}`));
      if (!nodes.length && !relations.length) continue;
      const [lo, hi] = minMax.get(ev.dialogueId), meta = roundMeta.get(`${ev.dialogueId}|${ev.round}`), g = group(keyOfRound(meta)), all = group('ALL');
      const evId = `${passageId}|${ev.key}|${ev.round}`;
      for (const [isRound, ...vs] of [[ev.round === lo, g.first, all.first], [ev.round === hi, g.last, all.last]]) {
        if (!isRound) continue;
        for (const view of vs) {
          view.events.add(evId);
          for (const id of nodes) view.layers[layerOf[id]].events.add(evId);
          for (const id of relations.filter(id => !inheritedSet.has(`${ev.dialogueId}|${ev.round}|${id}`))) { view.types[typeOf[id]].events.add(evId); view.branches[BRANCH_OF[typeOf[id]]].events.add(evId); }
        }
      }
    }
  }
  const fin = view => ({
    layers: Object.fromEntries(Object.entries(view.layers).map(([k, c]) => [k, finishCell(c)])),
    branches: Object.fromEntries(Object.entries(view.branches).map(([k, c]) => [k, finishCell(c)])),
    types: Object.fromEntries(Object.entries(view.types).map(([k, c]) => [k, finishCell(c)])),
    errorEvents: view.events.size,
  });
  const keys = [...groups.keys()].filter(k => k !== 'ALL').sort();
  return {
    excludedCrossRelations, unlocatedErrors,
    groups: [...keys, 'ALL'].map(key => { const g = groups.get(key); return { key, rounds: { first: g.first.rounds, last: g.last.rounds }, views: { first: fin(g.first), last: fin(g.last) } }; }),
  };
}

const pct = x => x == null ? '-' : `${(x * 100).toFixed(1)}%`;
const N = c => c.D + c.P + c.A + c.C;
const row = (name, c) => `| ${name} | ${N(c)}${c.smallSample ? ' (표본 적음)' : ''} | ${pct(c.capture)} | ${pct(c.precision)} | ${pct(c.errorRate)} | ${c.errorEvents} | ${c.Cinherited} |`;
function viewTable(view, withTypes) {
  const head = ['| 칸 | N | 포착률 | 정밀도 | 오류율 | 오류 사건 | 물려받은 오류 |', '|---|---|---|---|---|---|---|'];
  const rows = [...LAYERS.map(l => row(l, view.layers[l]))];
  rows.push(...BRANCHES.filter(([b]) => b !== '기타' || N(view.branches[b]) > 0).map(([b]) => row(`갈래 ${b}`, view.branches[b])));
  if (withTypes) rows.push(...TYPES.filter(t => N(view.types[t]) > 0).map(t => row(`유형 ${t}`, view.types[t])));
  return [...head, ...rows, `\n묶음 전체 오류 사건: ${view.errorEvents}`].join('\n');
}
export function renderMarkdown(fp) {
  const out = ['# 학생 이해 지문', '', '- 포착률에는 말 안 함과 모름이 섞여 있다. 판단에는 오류율을 먼저 쓴다.', '- 기록 세션은 대부분 개발 중 입력이라 세션 차이를 학생 차이로 해석하지 않는다.', "- 관계 칸의 오류율은 양 끝 사실이 맞는데 관계만 틀린 경우(자체 오류)만 센다. 끝의 사실 오류로 같이 틀린 관계는 '물려받은 오류'로 따로 적는다.", '',
    `묶음 기준: ${fp.groupBy}. 문단을 넘는 관계 제외: ${fp.excludedCrossRelations}건. 위치 못 찾은 오류: ${fp.unlocatedErrors}건.`, ''];
  for (const g of fp.groups) {
    out.push(`## ${g.key} — first (라운드 ${g.rounds.first})`, '', viewTable(g.views.first, g.key === 'ALL'), '');
    if (g.key === 'ALL') out.push(`## ${g.key} — last (라운드 ${g.rounds.last})`, '', viewTable(g.views.last, true), '');
  }
  return out.join('\n');
}

export function main(argv = process.argv.slice(2)) {
  const arg = (name, dflt) => { const i = argv.indexOf(name); return i < 0 ? dflt : argv[i + 1]; };
  const configPath = arg('--config'), outDir = arg('--out'), groupBy = arg('--group-by', 'session');
  if (!configPath || !outDir || !['session', 'source'].includes(groupBy)) throw new Error('usage: --config <json> --out <dir> [--group-by session|source]');
  const configRaw = readFileSync(configPath);
  const inputs = {};
  const read = (p) => { const buf = readFileSync(p); inputs[p] = sha256(buf); return buf.toString('utf8'); };
  const passages = JSON.parse(configRaw).map(c => ({ passageId: c.passageId, map: JSON.parse(read(c.mapPath)), rounds: jsonl(read(c.roundsPath)), judgmentRows: jsonl(read(c.judgmentsPath)), combined: JSON.parse(read(c.combinedPath)), classify: JSON.parse(read(c.classifyPath)) }));
  const fp = { version: 1, generatedFrom: { config: configPath, configSha256: sha256(configRaw), inputs }, groupBy, ...aggregate({ passages, groupBy }) };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/fingerprint.json`, JSON.stringify(fp, null, 2) + '\n');
  writeFileSync(`${outDir}/FINGERPRINT.md`, renderMarkdown(fp) + '\n');
  return fp;
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
