// 문단 분석 화면 자료 생성(D-0183 1단계): 기존 판정 기록을 지문 × 세션 단위의 수형도 밝기·관계 그래프 수치로 미리 계산한다.
// 서버·화면은 이 JSON을 그리기만 한다. 외부 전송 없음.
// node scripts/build-analysis-view.mjs --out <view-data.json> [--config <json>] [--structure-dir <dir>]
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { aggregate, finishCell } from './aggregate-student-fingerprint.mjs';
import { BRANCH_OF, TYPE_KO } from './run-relation-classify.mjs';

const DEFAULT_CONFIG = 'docs/experiments/student-fingerprint-2026-10-21/config.json';
const DEFAULT_STRUCTURE_DIR = 'docs/experiments/analysis-gold-ui-2026-10-21';
const sha256 = buf => createHash('sha256').update(buf).digest('hex');
const jsonl = text => text.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));

const BRIGHTNESS = { DIRECT: 'BRIGHT', PARTIAL: 'HALF', ABSENT: 'DIM', CONTRADICTS: 'DIM' };
const RANK = { DIM: 0, HALF: 1, BRIGHT: 2 };
const CELL_KEYS = ['D', 'P', 'A', 'C', 'Cinherited', 'smallSample', 'capture', 'errorRate'];
const pickCell = c => Object.fromEntries(CELL_KEYS.map(k => [k, c[k]]));
const pickCells = cells => Object.fromEntries(Object.entries(cells).map(([k, c]) => [k, pickCell(c)]));

// 대화 번호: dialogueId 끝의 `:<문단>:<n>`. 없으면 문단당 대화가 하나뿐인 형식(v4 등)이라 0.
function dialogueNumber(dialogueId, paragraphId) {
  const m = /:([^:]+):(\d+)$/.exec(dialogueId);
  return m && m[1] === paragraphId ? Number(m[2]) : null;
}

// 세션·문단의 마지막 대화 = 번호 n이 가장 큰 대화. 번호로 정할 수 없으면 멈춘다.
function lastDialogueOf(dialogueIds, paragraphId, sessionId) {
  if (dialogueIds.length === 1) return dialogueIds[0];
  const numbered = dialogueIds.map(id => [id, dialogueNumber(id, paragraphId)]);
  const ns = numbered.map(([, n]) => n);
  if (ns.some(n => n === null) || new Set(ns).size !== ns.length) {
    throw new Error(`마지막 대화를 정할 수 없음: session=${sessionId} paragraph=${paragraphId} dialogues=${dialogueIds.join(', ')}`);
  }
  return numbered.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

function paragraphOrder(map) {
  const ids = [];
  for (const u of [...map.propositions, ...map.nodes]) if (u.paragraphId && !ids.includes(u.paragraphId)) ids.push(u.paragraphId);
  return ids;
}

// 수형도 밝기: 판정된 문단의 마지막 차례 라벨 → 밝기, CROSS·TOP은 자식에서 계산(CROSS 먼저, TOP 나중).
function buildTree(map, lastEntries) {
  const tree = {};
  const dim = () => ({ brightness: 'DIM', computed: false });
  for (const u of [...map.propositions, ...map.nodes.filter(n => n.kind !== 'CROSS' && n.kind !== 'TOP'), ...map.relations]) tree[u.id] = dim();
  for (const e of lastEntries) {
    for (const [id, v] of [...Object.entries(e.nodes), ...Object.entries(e.relations)]) {
      if (!tree[id]) throw new Error(`지도에 없는 판정 단위: ${id}`);
      tree[id] = { brightness: BRIGHTNESS[v.label], computed: false, label: v.label };
    }
  }
  const compute = node => {
    const ranks = node.childIds.map(id => {
      if (!tree[id]) throw new Error(`자식 노드 없음: ${node.id} → ${id}`);
      return RANK[tree[id].brightness];
    });
    const brightness = !ranks.length ? 'DIM' : ranks.every(r => r === 2) ? 'BRIGHT' : ranks.every(r => r >= 1) ? 'HALF' : 'DIM';
    tree[node.id] = { brightness, computed: true };
  };
  for (const kind of ['CROSS', 'TOP']) for (const n of map.nodes.filter(x => x.kind === kind)) compute(n);
  return tree;
}

const studentText = row => row.dialogue.filter(d => d.role === 'student').map(d => d.text).join('\n');

// 한 지문의 화면 자료. input: { passageId, map, classify, rounds?, judgmentRows?, combined? }
export function buildPassageView({ passageId, map, classify, rounds = [], judgmentRows = [], combined = [] }) {
  const typeOf = Object.fromEntries(classify.items.map(i => [i.id, i.type]));
  const relationTypes = Object.fromEntries(map.relations.map(r => {
    const type = typeOf[r.id];
    if (!type) throw new Error(`classify에 관계 id 없음: ${passageId} ${r.id}`);
    return [r.id, { type, typeKo: TYPE_KO[type], branch: BRANCH_OF[type] }];
  }));
  const paragraphIds = paragraphOrder(map);
  const passage = { passageId, map: { propositions: map.propositions, nodes: map.nodes, relations: map.relations }, relationTypes, paragraphIds, sessions: [] };
  if (!combined.length) return passage;

  const roundMeta = new Map(rounds.map(r => [`${r.dialogueId}|${r.roundIndex}`, r]));
  const entryOf = new Map(combined.map(e => [`${e.dialogueId}|${e.roundIndex}`, e]));
  const minMax = new Map(); // dialogueId -> [첫 차례, 마지막 차례]
  for (const e of combined) { const m = minMax.get(e.dialogueId); minMax.set(e.dialogueId, m ? [Math.min(m[0], e.roundIndex), Math.max(m[1], e.roundIndex)] : [e.roundIndex, e.roundIndex]); }
  const fingerprint = aggregate({ passages: [{ passageId, map, rounds, judgmentRows, combined, classify }], groupBy: 'session' });
  const viewOf = new Map(fingerprint.groups.map(g => [g.key, g.views.first]));

  const bySession = new Map();
  for (const e of combined) {
    const meta = roundMeta.get(`${e.dialogueId}|${e.roundIndex}`);
    if (!meta) throw new Error(`rounds에 없는 판정: ${e.dialogueId}|${e.roundIndex}`);
    if (!bySession.has(meta.sessionId)) bySession.set(meta.sessionId, { source: meta.source, entries: [] });
    const s = bySession.get(meta.sessionId);
    if (s.source !== meta.source) throw new Error(`세션의 출처가 섞임: ${meta.sessionId}`);
    s.entries.push(e);
  }

  for (const [sessionId, { source, entries }] of bySession) {
    // 문단별 마지막 대화의 마지막 차례
    const dialoguesByParagraph = new Map();
    for (const e of entries) {
      const set = dialoguesByParagraph.get(e.paragraphId) ?? new Set();
      set.add(e.dialogueId); dialoguesByParagraph.set(e.paragraphId, set);
    }
    const lastEntries = [...dialoguesByParagraph].map(([paragraphId, ids]) => {
      const dialogueId = lastDialogueOf([...ids], paragraphId, sessionId);
      return entryOf.get(`${dialogueId}|${minMax.get(dialogueId)[1]}`);
    });
    const judged = paragraphIds.filter(p => dialoguesByParagraph.has(p)).length;

    // 그래프(첫 차례): aggregate() 결과 그대로
    const first = viewOf.get(sessionId);
    const sum = { D: 0, P: 0, A: 0, C: 0, UNJUDGED: 0, Cinherited: 0, events: new Set() };
    for (const c of Object.values(first.branches)) for (const k of ['D', 'P', 'A', 'C']) sum[k] += c[k];
    const total = finishCell(sum);

    // 틀린 관계: 첫 차례에서 자체 CONTRADICTS(문단 넘는 관계·물려받은 오류 제외)
    const relById = new Map(map.relations.map(r => [r.id, r]));
    const wrongRelations = [];
    for (const e of entries) {
      const [lo, hi] = minMax.get(e.dialogueId);
      if (e.roundIndex !== lo) continue;
      for (const [relId, r] of Object.entries(e.relations)) {
        if (r.label !== 'CONTRADICTS' || r.crossEndUnchecked?.length) continue;
        const rel = relById.get(relId);
        if ([rel.fromId, rel.toId].some(end => e.nodes[end]?.label === 'CONTRADICTS')) continue;
        const lastLabel = entryOf.get(`${e.dialogueId}|${hi}`).relations[relId]?.label;
        wrongRelations.push({
          relId, paragraphId: e.paragraphId, dialogueId: e.dialogueId,
          studentText: studentText(roundMeta.get(`${e.dialogueId}|${e.roundIndex}`)),
          fixedAfterDialogue: hi !== lo && (lastLabel === 'DIRECT' || lastLabel === 'PARTIAL'),
        });
      }
    }

    passage.sessions.push({
      sessionId, source,
      judgedParagraphs: judged, totalParagraphs: paragraphIds.length, complete: judged === paragraphIds.length,
      tree: buildTree(map, lastEntries),
      graph: {
        branches: pickCells(first.branches), types: pickCells(first.types),
        trendPoint: { passageId, capture: total.capture, errorRate: total.errorRate, relationN: total.D + total.P + total.A + total.C },
        wrongRelations,
      },
    });
  }
  // 완료 세션 먼저, 그다음 판정 문단 많은 순
  passage.sessions.sort((a, b) => Number(b.complete) - Number(a.complete) || b.judgedParagraphs - a.judgedParagraphs || a.sessionId.localeCompare(b.sessionId));
  return passage;
}

export function main(argv = process.argv.slice(2)) {
  const arg = (name, dflt) => { const i = argv.indexOf(name); return i < 0 ? dflt : argv[i + 1]; };
  const out = arg('--out'), configPath = arg('--config', DEFAULT_CONFIG), structureDir = arg('--structure-dir', DEFAULT_STRUCTURE_DIR);
  if (!out) throw new Error('usage: --out <view-data.json> [--config <json>] [--structure-dir <dir>]');
  const generatedFrom = [];
  const read = p => { const buf = readFileSync(p); generatedFrom.push({ path: p, sha256: sha256(buf) }); return buf.toString('utf8'); };
  const passages = [];
  for (const c of JSON.parse(read(configPath))) {
    passages.push(buildPassageView({ passageId: c.passageId, map: JSON.parse(read(c.mapPath)), rounds: jsonl(read(c.roundsPath)), judgmentRows: jsonl(read(c.judgmentsPath)), combined: JSON.parse(read(c.combinedPath)), classify: JSON.parse(read(c.classifyPath)) }));
  }
  for (const dir of readdirSync(structureDir).sort()) {
    const mapPath = `${structureDir}/${dir}/frozen-map.json`, classifyPath = `${structureDir}/classify/${dir}/classify.json`;
    if (!existsSync(mapPath) || !existsSync(classifyPath)) continue;
    const map = JSON.parse(read(mapPath));
    passages.push(buildPassageView({ passageId: map.passageId, map, classify: JSON.parse(read(classifyPath)) }));
  }
  const data = { generatedFrom, passages };
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(data) + '\n');
  return data;
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
