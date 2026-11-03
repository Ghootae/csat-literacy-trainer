#!/usr/bin/env node
// luna 기호 오독 집계 1단계: docs/experiments 의 저장 출력에서 luna 출력만 추려 기호가 나오는 후보를 모은다.
// 외부 호출 없음. 저장 파일만 읽고 docs/experiments/luna-marker-misread-count-2026-11-03/ 에 쓴다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expRoot = path.join(repoRoot, 'docs/experiments');
const outDir = path.join(expRoot, 'luna-marker-misread-count-2026-11-03');
const answerKeyPath = path.join(
  repoRoot,
  'packages/pipeline/fixtures/experiments/problem-solving/source-direct-runtime-v1.json',
);

const SIX = [
  'corporate-law-q13',
  'dopamine-motor-control-q13',
  'gongsun-long-later-mohists-q12',
  'information-asymmetry-free-marketplace-q13',
  'mrna-vaccine-lipid-nanoparticle-q19',
  'surface-tension-laplace-q16',
];
const MIN_DATE = '2026-10-07';
const MARKER_RE = /[ⓐ-ⓩ]|[㉠-㉭]|\((?:가|나|다|라|마)\)|\[[A-E]\]/g;
const EXCLUDED_KEYS = new Set(['quote', 'studentEvidence', 'sourceEvidence']);
const OUT_NAME = 'luna-marker-misread-count-2026-11-03';

const answerKey = Object.fromEntries(
  JSON.parse(fs.readFileSync(answerKeyPath, 'utf8')).questions.map((q) => [q.questionId, q.answerChoiceId]),
);

// ---------- 파일 순회 ----------
function listJsonFiles(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === OUT_NAME) continue;
      listJsonFiles(p, acc);
    } else if (/\.jsonl?$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const parseCache = new Map();
function readJson(file) {
  if (parseCache.has(file)) return parseCache.get(file);
  let result;
  try {
    const text = fs.readFileSync(file, 'utf8');
    if (file.endsWith('.jsonl')) {
      const records = [];
      let failed = false;
      text.split('\n').forEach((line, i) => {
        if (!line.trim()) return;
        try {
          records.push({ line: i + 1, value: JSON.parse(line) });
        } catch {
          failed = true;
        }
      });
      result = { jsonl: true, records, failed };
    } else {
      result = { jsonl: false, value: JSON.parse(text), failed: false };
    }
  } catch {
    result = { jsonl: false, value: null, failed: true };
  }
  parseCache.set(file, result);
  return result;
}

// ---------- 요청 본문 찾기 ----------
function requestInputOf(req) {
  if (!req || typeof req !== 'object') return null;
  const input = req.input;
  if (!Array.isArray(input)) return null;
  const texts = [];
  for (const m of input) {
    if (typeof m === 'string') texts.push(m);
    else if (Array.isArray(m?.content)) for (const c of m.content) if (typeof c?.text === 'string') texts.push(c.text);
    else if (typeof m?.content === 'string') texts.push(m.content);
  }
  for (const t of texts) {
    try {
      const j = JSON.parse(t);
      if (j && typeof j === 'object' && (j.source || j.selection || j.mode || j.selectedChoice || typeof j.passage === 'string')) {
        registerPassage(j);
        return j;
      }
    } catch {
      /* 다음 텍스트 */
    }
  }
  return null;
}

// 지문 앞부분 -> questionId. 요청 입력에 문항 정보가 없는 호출(blank_check, examiner_strategy 등)의 문항을 지문으로 정한다.
const passageRegistry = new Map();
const passageKey = (p) => p.replace(/\s+/g, ' ').trim().slice(0, 80);
const choiceTextRegistry = new Map();
function registerPassage(j) {
  if (typeof j?.source?.questionId === 'string' && Array.isArray(j.source.choices))
    for (const c of j.source.choices) if (typeof c?.text === 'string') choiceTextRegistry.set(c.text.trim(), j.source.questionId);
  if (typeof j?.source?.passage === 'string' && typeof j.source.questionId === 'string')
    passageRegistry.set(passageKey(j.source.passage), j.source.questionId);
}

function pairedRequestFiles(file) {
  const dir = path.dirname(file);
  const base = path.basename(file);
  const m = base.match(/^(.*)\.response\.json$/);
  if (!m) {
    // responses/X.json <-> requests/X.json
    return path.basename(dir) === 'responses' ? [path.join(path.dirname(dir), 'requests', base)] : [];
  }
  const stem = m[1];
  const stems = [stem, stem.replace(/-\d+$/, '')];
  const dirs = [dir];
  if (path.basename(dir) === 'responses') dirs.push(path.join(path.dirname(dir), 'requests'));
  const out = [];
  for (const d of dirs) for (const s of stems) out.push(path.join(d, `${s}.request.json`));
  return out;
}

function inputFromPairedFile(file) {
  for (const p of pairedRequestFiles(file)) {
    if (!fs.existsSync(p)) continue;
    const j = readJson(p);
    if (j.failed || j.jsonl) continue;
    const req = j.value?.request ?? j.value;
    const input = requestInputOf(req);
    if (input) return { input, req, file: p };
    return { input: null, req, file: p };
  }
  return null;
}

// ---------- 모델·문맥 ----------
function nearest(chain, pick) {
  for (let i = chain.length - 1; i >= 0; i--) {
    const v = pick(chain[i]);
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

function modelOf(chain, obj) {
  if (typeof obj.model === 'string') return obj.model;
  const m = nearest(chain, (a) => (typeof a.model === 'string' ? a.model : undefined));
  if (m) return m;
  const c = nearest(chain, (a) =>
    typeof a.config === 'string' ? a.config : typeof a.config?.model === 'string' ? a.config.model : undefined,
  );
  if (c) return c;
  const r = nearest(chain, (a) => (typeof a.request?.model === 'string' ? a.request.model : undefined));
  return r ?? 'UNKNOWN';
}

function firstLine(s) {
  return typeof s === 'string' ? s.split('\n')[0].trim() : '';
}

function versionFromInstructions(instr) {
  const line = firstLine(instr);
  if (!line.startsWith('#')) return null;
  const title = line.replace(/^#+\s*/, '');
  const m = title.match(/\s(v\d[\w.\-]*)$/);
  return m ? m[1] : title;
}

function findKey(root, key, depth = 0) {
  if (depth > 6 || !root || typeof root !== 'object') return null;
  if (typeof root[key] === 'string') return root[key];
  for (const v of Array.isArray(root) ? root : Object.values(root)) {
    const r = findKey(v, key, depth + 1);
    if (r) return r;
  }
  return null;
}

// ---------- fields ----------
const ALL_STRINGS_KINDS = /end_explanation|end_coaching|repair_end/;

function includeKey(name, parents) {
  if (name === 'reason' || name === 'reconstructedPath' || name === 'diagnosis' || name === 'endExplanation') return true;
  if (/question/i.test(name) || /coaching/i.test(name)) return true;
  if (name === 'description' && parents.includes('errors')) return true;
  if (name === 'element' && parents.includes('keyRelationCoverage')) return true;
  if (['firstChoice', 'reselection', 'answer'].includes(name)) return true;
  return false;
}

function extractFields(parsed, callKind) {
  const out = [];
  const all = ALL_STRINGS_KINDS.test(callKind);
  const walk = (v, p, name, parents, on) => {
    if (EXCLUDED_KEYS.has(name)) return;
    if (typeof v === 'string') {
      if (on || all) out.push({ path: p, text: v });
      return;
    }
    if (Array.isArray(v)) {
      v.forEach((x, i) => walk(x, `${p}[${i}]`, name, parents, on));
      return;
    }
    if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        const np = p ? `${p}.${k}` : k;
        walk(x, np, k, [...parents, name].filter(Boolean), on || includeKey(k, [...parents, name]));
      }
    }
  };
  walk(parsed, '', '', [], false);
  return out;
}

// ---------- 출력 수집 ----------
const sha16 = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

function topFolder(file) {
  return path.relative(expRoot, file).split(path.sep)[0];
}
function folderDateOf(folder) {
  const m = folder.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

const folders = new Map(); // folder -> stats
function stat(folder) {
  if (!folders.has(folder))
    folders.set(folder, { files: 0, parseFail: 0, lunaRaw: 0, sixRaw: 0, candRaw: 0, excludedOld: 0, excludedQ: 0 });
  return folders.get(folder);
}

const modelTally = {}; // 모든 출력의 모델 집계(중복 제거 전)
const unknownModelFiles = new Set();
const skippedFiles = []; // 형식을 알 수 없어 건너뛴 파일
const found = []; // luna 출력 발생

function collectFrom(file, rootValue, lineNo) {
  const rel = path.relative(repoRoot, file);
  const folder = topFolder(file);
  const pair = inputFromPairedFile(file);

  const visit = (v, chain, jsonPath) => {
    if (Array.isArray(v)) {
      v.forEach((x, i) => visit(x, chain, `${jsonPath}[${i}]`));
      return;
    }
    if (!v || typeof v !== 'object') return;
    const outText = typeof v.output_text === 'string' ? v.output_text : null;
    if (outText !== null) {
      const model = modelOf(chain, v);
      modelTally[model] = (modelTally[model] || 0) + 1;
      if (model === 'UNKNOWN') unknownModelFiles.add(rel);
      if (/luna/i.test(model)) {
        found.push({ file, rel, folder, lineNo, jsonPath, obj: v, chain: [...chain, v], model, outText, pair, rootValue });
      }
    }
    const next = [...chain, v];
    for (const [k, x] of Object.entries(v)) visit(x, next, `${jsonPath}.${k}`);
  };
  visit(rootValue, [], '');
}

const allFiles = listJsonFiles(expRoot);
for (const file of allFiles) {
  if (!file.endsWith('.request.json')) continue;
  const j = readJson(file);
  if (!j.failed && !j.jsonl) requestInputOf(j.value?.request ?? j.value);
}

for (const file of allFiles) {
  const folder = topFolder(file);
  const s = stat(folder);
  s.files += 1;
  const j = readJson(file);
  if (j.failed) {
    s.parseFail += 1;
    skippedFiles.push(`${path.relative(repoRoot, file)} (JSON 파싱 실패)`);
  }
  if (j.jsonl) for (const r of j.records) collectFrom(file, r.value, r.line);
  else if (j.value !== null) collectFrom(file, j.value, null);
}

// ---------- 요청 입력에서 문항·선택·학생 발화 ----------
const choiceFromNumber = (n) => (Number.isInteger(n) ? `C${n}` : null);

function inputFacts(input) {
  const none = { questionId: null, choiceId: null, firstChoiceId: null, selectionNumber: null, studentText: null };
  if (!input) return none;
  let questionId = input.source?.questionId ?? null;
  if (!questionId && typeof input.passage === 'string') questionId = passageRegistry.get(passageKey(input.passage)) ?? null;
  if (!questionId && typeof input.source?.passage === 'string') questionId = passageRegistry.get(passageKey(input.source.passage)) ?? null;

  if (!questionId && typeof input.selectedChoice?.text === 'string')
    questionId = choiceTextRegistry.get(input.selectedChoice.text.trim()) ?? null;

  const selects = (input.observations ?? []).filter((o) => o?.command?.type === 'SELECT');
  let choiceId = input.selection?.choiceId ?? input.selectedChoice?.choiceId ?? null;
  let selectionNumber = input.selection?.selectionNumber ?? null;
  if (!choiceId && selects.length) {
    const last = selects[selects.length - 1];
    choiceId = last.command.choiceId ?? null;
    selectionNumber = last.selectionNumber ?? selectionNumber;
  }
  const firstChoiceId =
    selects[0]?.command?.choiceId ?? choiceFromNumber(input.studentUtterances?.find((u) => Number.isInteger(u?.selectedChoice))?.selectedChoice) ?? null;
  if (!choiceId) choiceId = choiceFromNumber(input.finalSelectedChoice) ?? null;
  const asObject = (v) => {
    if (typeof v !== 'string') return v;
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  };
  if (!choiceId) choiceId = asObject(input.choice)?.id ?? null;
  if (!choiceId) choiceId = choiceFromNumber(asObject(input.target)?.choice) ?? null;

  const parts = [];
  for (const o of input.observations ?? []) {
    const t = o?.command?.rationale?.text ?? o?.command?.text ?? o?.text ?? o?.response?.text;
    if (typeof t === 'string') parts.push(t);
  }
  for (const u of input.studentResponses ?? []) if (typeof u?.text === 'string') parts.push(u.text);
  for (const u of input.studentUtterances ?? []) if (typeof u?.text === 'string') parts.push(u.text);
  if (typeof input.studentRationale === 'string') parts.push(input.studentRationale);
  const cur = input.currentStudentResponse;
  if (typeof cur === 'string') parts.push(cur);
  else if (cur && typeof cur.text === 'string') parts.push(cur.text);
  return { questionId, choiceId, firstChoiceId, selectionNumber, studentText: parts.length ? parts.join('\n') : null };
}

// ---------- 폴더의 cases.json 로 사례 ID -> 문항·선택 ----------
const caseTableCache = new Map();
function loadCaseTable(casesPath) {
  if (caseTableCache.has(casesPath)) return caseTableCache.get(casesPath);
  let table = null;
  if (fs.existsSync(casesPath)) {
    const j = readJson(casesPath);
    const arr = Array.isArray(j.value) ? j.value : Array.isArray(j.value?.cases) ? j.value.cases : null;
    if (arr) {
      const dir = path.dirname(casesPath);
      let folderQ = null;
      for (const name of ['source.json', 'sources.json']) {
        const sp = path.join(dir, name);
        if (!fs.existsSync(sp)) continue;
        const ids = new Set();
        const grab = (v) => {
          if (Array.isArray(v)) v.forEach(grab);
          else if (v && typeof v === 'object') {
            if (typeof v.questionId === 'string') ids.add(v.questionId);
            Object.values(v).forEach(grab);
          }
        };
        grab(readJson(sp).value);
        if (ids.size === 1) folderQ = [...ids][0];
      }
      table = new Map();
      for (const e of arr) {
        const key = e?.id ?? e?.caseId ?? e?.type;
        if (typeof key !== 'string') continue;
        table.set(key, { questionId: e.questionId ?? folderQ, choiceId: e.choiceId ?? null });
      }
    }
  }
  caseTableCache.set(casesPath, table);
  return table;
}

function caseTableLookup(file, chain) {
  const stem = path.basename(file).replace(/\.json$/, '').replace(/\.response$/, '');
  const noRep = stem.replace(/-r\d+$/, '');
  const parts = noRep.split('-');
  const keys = new Set();
  for (let i = 0; i < parts.length; i++) keys.add(parts.slice(i).join('-'));
  keys.add(stem);
  for (const a of chain) for (const k of ['caseId', 'id', 'type']) if (typeof a[k] === 'string') keys.add(a[k]);
  // 후보 cases.json: 파일의 조상 폴더들 + 같은 폴더 FROZEN.json 이 가리키는 다른 실험 폴더
  const cands = [];
  let dir = path.dirname(file);
  while (dir.startsWith(expRoot) && dir !== expRoot) {
    cands.push(path.join(dir, 'cases.json'));
    const fz = path.join(dir, 'FROZEN.json');
    if (fs.existsSync(fz)) {
      const j = readJson(fz);
      for (const k of Object.keys(j.value?.fileHashes ?? {})) {
        const m = k.match(/^docs\/experiments\/[^/]+\/cases\.json$/);
        if (m) cands.push(path.join(repoRoot, k));
      }
    }
    dir = path.dirname(dir);
  }
  for (const c of cands) {
    const t = loadCaseTable(c);
    if (!t) continue;
    for (const k of keys) if (t.has(k)) return t.get(k);
  }
  return null;
}

// ---------- 출력별 메타 ----------
function buildRecord(f) {
  const { obj, chain, pair, rootValue } = f;
  // 요청 본문: 짝 파일 → 조상의 request
  let input = pair?.input ?? null;
  let req = pair?.req ?? null;
  if (!input) {
    for (let i = chain.length - 1; i >= 0 && !input; i--) {
      const a = chain[i];
      const r = a.request && typeof a.request === 'object' ? a.request : a;
      const inp = requestInputOf(r);
      if (inp) {
        input = inp;
        req = r;
      }
    }
  }
  const instructions =
    typeof obj.instructions === 'string' ? obj.instructions : (req && typeof req.instructions === 'string' ? req.instructions : nearest(chain, (a) => (typeof a.instructions === 'string' ? a.instructions : undefined)));
  const formatName =
    obj.text?.format?.name ?? req?.text?.format?.name ?? nearest(chain, (a) => a.text?.format?.name ?? a.request?.text?.format?.name);
  let callKind = formatName || null;
  if (!callKind) callKind = nearest(chain, (a) => (typeof a.kind === 'string' ? a.kind : undefined));
  if (!callKind && instructions) callKind = firstLine(instructions).slice(0, 60) || null;
  callKind = callKind || 'UNKNOWN';

  let promptVersion = versionFromInstructions(instructions);
  if (!promptVersion) {
    promptVersion = nearest(chain, (a) => (typeof a.promptVersion === 'string' ? a.promptVersion : undefined));
    if (!promptVersion && rootValue && typeof rootValue === 'object') promptVersion = findKey(rootValue, 'promptVersion');
  }

  const facts = inputFacts(input);
  const caseHit = facts.questionId && facts.choiceId ? null : caseTableLookup(f.file, chain);
  const questionId =
    facts.questionId ??
    caseHit?.questionId ??
    nearest(chain, (a) => (typeof a.questionId === 'string' ? a.questionId : undefined));
  const choiceId =
    facts.choiceId ?? caseHit?.choiceId ?? nearest(chain, (a) => (typeof a.choiceId === 'string' ? a.choiceId : undefined));
  const selectionNumber =
    facts.selectionNumber ?? nearest(chain, (a) => (typeof a.selectionNumber === 'number' ? a.selectionNumber : undefined));
  let sessionKind = 'UNKNOWN';
  if (questionId && choiceId && answerKey[questionId]) sessionKind = choiceId === answerKey[questionId] ? 'CORRECT' : 'WRONG';
  else {
    let cc = nearest(chain, (a) => (typeof a.correctChoice === 'boolean' ? a.correctChoice : undefined));
    if (typeof cc !== 'boolean') {
      // 원 세션 파일(src)을 가리키는 기록: 그 세션의 correctChoice 를 따른다
      const src = nearest(chain, (a) => (typeof a.src === 'string' ? a.src : undefined));
      const sp = src ? path.join(repoRoot, src) : null;
      if (sp && fs.existsSync(sp)) cc = readJson(sp).value?.correctChoice;
    }
    if (typeof cc === 'boolean') sessionKind = cc ? 'CORRECT' : 'WRONG';
  }
  const studentText = facts.studentText;

  let parsed = null;
  let parseError = false;
  try {
    parsed = JSON.parse(f.outText);
  } catch {
    parseError = true;
  }
  const fields = parseError ? null : extractFields(parsed, callKind);
  const markers = fields ? [...new Set(fields.flatMap((x) => x.text.match(MARKER_RE) ?? []))] : [];

  const caseId = nearest(chain, (a) => (typeof a.caseId === 'string' ? a.caseId : typeof a.label === 'string' ? a.label : undefined));
  return {
    folder: f.folder,
    folderDate: folderDateOf(f.folder),
    model: f.model,
    callKind,
    promptVersion: promptVersion ?? null,
    questionId: questionId ?? null,
    choiceId: choiceId ?? null,
    firstChoiceId: facts.firstChoiceId ?? null,
    sessionKind,
    selectionNumber: selectionNumber ?? null,
    studentText,
    fields,
    ...(parseError ? { parseError: true } : {}),
    markers,
    location: { file: f.rel, ...(f.lineNo ? { line: f.lineNo } : {}), path: f.jsonPath || null, caseId: caseId ?? null },
    outputText: f.outText,
  };
}

const byId = new Map();
const conflicts = [];
const unresolved = [];
for (const f of found) {
  const r = buildRecord(f);
  const s = stat(r.folder);
  s.lunaRaw += 1;
  const tooOld = r.folderDate !== null && r.folderDate < MIN_DATE;
  const sixOk = r.questionId !== null && SIX.includes(r.questionId);
  if (tooOld) s.excludedOld += 1;
  else if (!sixOk) {
    s.excludedQ += 1;
    if (r.questionId === null) unresolved.push(r);
  } else {
    s.sixRaw += 1;
    if (r.markers.length) s.candRaw += 1;
  }
  const id = sha16(r.outputText);
  const excluded = tooOld ? 'before-v5' : sixOk ? null : r.questionId === null ? 'question-unknown' : 'other-question';
  let rec = byId.get(id);
  if (!rec) {
    rec = { id, ...r, excluded, locations: [], _conflicts: new Set() };
    delete rec.location;
    byId.set(id, rec);
  } else {
    for (const k of ['questionId', 'choiceId', 'callKind', 'model']) {
      if (r[k] !== null && rec[k] !== null && r[k] !== rec[k] && r[k] !== 'UNKNOWN' && rec[k] !== 'UNKNOWN') rec._conflicts.add(`${k}: ${rec[k]} vs ${r[k]}`);
    }
    // 정보가 더 많은 위치의 값으로 보강
    for (const k of ['questionId', 'choiceId', 'selectionNumber', 'studentText', 'promptVersion']) if (rec[k] === null && r[k] !== null) rec[k] = r[k];
    if (rec.sessionKind === 'UNKNOWN' && r.sessionKind !== 'UNKNOWN') rec.sessionKind = r.sessionKind;
    if (rec.callKind === 'UNKNOWN' && r.callKind !== 'UNKNOWN') rec.callKind = r.callKind;
    if (rec.excluded === 'question-unknown' && excluded !== 'question-unknown') rec.excluded = excluded;
  }
  rec.locations.push(r.location);
}
for (const rec of byId.values()) {
  if (rec._conflicts.size) conflicts.push({ id: rec.id, items: [...rec._conflicts], locations: rec.locations.map((l) => l.file) });
  // 보강된 문항·선택으로 분류 갱신
  const tooOld = rec.folderDate !== null && rec.folderDate < MIN_DATE;
  const sixOk = rec.questionId !== null && SIX.includes(rec.questionId);
  rec.excluded = tooOld ? 'before-v5' : sixOk ? null : rec.questionId === null ? 'question-unknown' : 'other-question';
  if (rec.questionId && rec.choiceId && answerKey[rec.questionId]) rec.sessionKind = rec.choiceId === answerKey[rec.questionId] ? 'CORRECT' : 'WRONG';
}

// ---------- 출력 ----------
const all = [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
const candidates = all.filter((r) => r.excluded === null && r.markers.length > 0);
const ordered = (r, withText) => {
  const { _conflicts, outputText, ...rest } = r;
  return withText ? { ...rest, outputText } : rest;
};
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'candidates.jsonl'), candidates.map((r) => JSON.stringify(ordered(r, true))).join('\n') + (candidates.length ? '\n' : ''));
fs.writeFileSync(path.join(outDir, 'all-luna-outputs.jsonl'), all.map((r) => JSON.stringify(ordered(r, false))).join('\n') + '\n');

const tally = (rows, key) => {
  const t = {};
  for (const r of rows) t[r[key] ?? 'null'] = (t[r[key] ?? 'null'] || 0) + 1;
  return Object.entries(t).sort((a, b) => b[1] - a[1]);
};
const fmt = (pairs) => pairs.map(([k, n]) => `${k}: ${n}`).join(', ');

let md = '# INVENTORY — luna 기호 오독 집계 1단계\n\n';
md += '`node scripts/collect-luna-marker-outputs.mjs`가 만든다. 외부 호출 없음. 열 설명: 읽은 파일 수 / 파싱 실패 파일 수 / luna 출력 수(중복 제거 전) / 6문항 luna 출력 수(v5 이후, 중복 제거 전) / 기호 후보 수(발생 기준, 중복 제거 전).\n\n';
md += '규칙 메모: (1) 같은 출력이 요청 로그·세션 묶음·jsonl 에 여러 번 기록돼 있어 "중복 제거 전" 수는 발생 횟수다. (2) choiceId 는 그 호출이 다루는 선택(selection.choiceId, 없으면 마지막 SELECT 관찰, 없으면 finalSelectedChoice)이고 firstChoiceId 는 첫 선택이다. (3) callKind 를 응답 스키마 이름·instructions 로 정할 수 없을 때 기록의 kind 값(예 ASSESSMENT)을 쓴다. (4) promptVersion 은 instructions 첫 줄 제목, 없으면 기록의 promptVersion 값이다. (5) 요청 입력에 문항이 없으면 지문·선지 원문을 6문항 요청 입력과 대조하거나 폴더의 cases.json 으로 정한다. (6) sessionKind 는 choiceId 가 없으면 기록의 correctChoice 로 정하고, 둘 다 없으면 UNKNOWN 이다.\n\n';
md += '| 폴더 | 읽은 파일 | 파싱 실패 | luna 출력 | 6문항 luna 출력 | 기호 후보 | (제외: v5 이전) | (제외: 6문항 아님·문항 미상) |\n|---|---:|---:|---:|---:|---:|---:|---:|\n';
const sums = { files: 0, parseFail: 0, lunaRaw: 0, sixRaw: 0, candRaw: 0, excludedOld: 0, excludedQ: 0 };
for (const [name, s] of [...folders.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
  md += `| ${name} | ${s.files} | ${s.parseFail} | ${s.lunaRaw} | ${s.sixRaw} | ${s.candRaw} | ${s.excludedOld} | ${s.excludedQ} |\n`;
  for (const k of Object.keys(sums)) sums[k] += s[k];
}
md += `| **합계** | ${sums.files} | ${sums.parseFail} | ${sums.lunaRaw} | ${sums.sixRaw} | ${sums.candRaw} | ${sums.excludedOld} | ${sums.excludedQ} |\n\n`;

const six = all.filter((r) => r.excluded === null);
md += '## 합계와 중복 제거\n\n';
md += `- 전체 luna 출력: 중복 제거 전 ${sums.lunaRaw}, 후 ${all.length}\n`;
md += `- 6문항·v5 이후 luna 출력: 중복 제거 전 ${sums.sixRaw}, 후 ${six.length}\n`;
md += `- 기호 후보: 중복 제거 전 ${sums.candRaw}, 후 ${candidates.length}\n`;
md += `- 제외(중복 제거 후): v5 이전 ${all.filter((r) => r.excluded === 'before-v5').length}, 6문항 아님 ${all.filter((r) => r.excluded === 'other-question').length}, 문항 미상 ${all.filter((r) => r.excluded === 'question-unknown').length}\n`;
md += `- 파싱 실패(output_text가 JSON 아님) 후보 외 출력(중복 제거 후): ${all.filter((r) => r.parseError).length}\n`;
md += `- 모델 값 집계(전체 output_text 발생, luna 여부 무관): ${fmt(Object.entries(modelTally).sort((a, b) => b[1] - a[1]))}\n`;
md += `- 후보의 모델 값 집계: ${fmt(tally(candidates, 'model'))}\n`;
md += `- 모델을 정할 수 없는(UNKNOWN) 출력 발생 수: ${modelTally.UNKNOWN || 0}\n`;
md += `- 후보 문항별: ${fmt(tally(candidates, 'questionId'))}\n`;
md += `- 후보 callKind별: ${fmt(tally(candidates, 'callKind'))}\n`;
md += `- 후보 sessionKind별: ${fmt(tally(candidates, 'sessionKind'))}\n`;
md += `- 후보 promptVersion별: ${fmt(tally(candidates, 'promptVersion'))}\n`;
md += `- 후보 중 callKind UNKNOWN ${candidates.filter((r) => r.callKind === 'UNKNOWN').length}, sessionKind UNKNOWN ${candidates.filter((r) => r.sessionKind === 'UNKNOWN').length}, promptVersion null ${candidates.filter((r) => r.promptVersion === null).length}\n`;
md += `- 같은 출력인데 문항·선택·callKind가 서로 다르게 기록된 경우: ${conflicts.length}건\n`;
for (const c of conflicts) md += `  - ${c.id}: ${c.items.join('; ')} (${c.locations.join(', ')})\n`;
md += `\n## 모델을 정할 수 없어 건너뛴 출력이 있는 파일 (${unknownModelFiles.size})\n\n`;
for (const f of [...unknownModelFiles].sort()) md += `- ${f}\n`;
md += `\n## 형식을 알 수 없어 건너뛴 파일 (${skippedFiles.length})\n\n`;
for (const f of skippedFiles.sort()) md += `- ${f}\n`;
fs.writeFileSync(path.join(outDir, 'INVENTORY.md'), md);

console.log(`luna 출력 ${sums.lunaRaw} -> ${all.length}, 6문항 ${sums.sixRaw} -> ${six.length}, 후보 ${sums.candRaw} -> ${candidates.length}`);
