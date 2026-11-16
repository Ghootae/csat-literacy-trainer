// 배열 대조(align.mjs)가 쓸 만한 신호인지 기출로 확인한다. API 호출 없음.
// 실행: 저장소 루트에서  node docs/experiments/fidelity-check-2026-11-16/align-selftest.mjs
// 하위 구조 소속 단일 기출마다, 그 기출의 라벨 배열을 37개 단일 하위 구조 array와 정렬해 자기 하위 구조가 몇 위인지 센다.
// 주의: array는 이 기출들에서 끌어낸 것이므로 결과는 낙관적이다(같은 자료로 만들고 같은 자료로 잼).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArray, makeGroupOf, align } from './align.mjs';

const SC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'structure-catalog');
const rj = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const G = makeGroupOf(rj(path.join(SC, 'vocab.json')));
const subs = [];
for (const t of ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9']) for (const s of rj(path.join(SC, 'substructures', `${t}.json`)).substructures) subs.push({ ...s, elems: parseArray(s.array) });
const owner = {}; for (const s of subs) for (const m of s.members) owner[m] = s.code;
const typeOf = {}; for (const t of rj(path.join(SC, 'types', 'final.json'))) typeOf[t.set_id] = t.type;
let n = 0, top1 = 0, top3 = 0, typeTop1 = 0;
const miss = [];
for (const f of fs.readdirSync(path.join(SC, 'labels')).filter((f) => /^[0-9a-f]{24}\.json$/.test(f))) {
  const d = rj(path.join(SC, 'labels', f));
  if (!owner[d.set_id]) continue;
  n++;
  const r = subs.map((s) => ({ code: s.code, norm: align(d.paragraphs, s.elems, G).norm })).sort((a, b) => b.norm - a.norm);
  const k = r.findIndex((x) => x.code === owner[d.set_id]);
  if (k === 0) top1++; else miss.push(`${d.set_id} ${owner[d.set_id]} → 1위 ${r[0].code}, 자기 ${k + 1}위`);
  if (k < 3) top3++;
  if (r[0].code.split('-')[0] === typeOf[d.set_id]) typeTop1++;
}
console.log(`하위 구조 소속 단일 기출 ${n}편: 자기 하위 구조 1위 ${top1}, 3위 안 ${top3}, 1위의 1차 유형이 맞음 ${typeTop1}`);
if (process.env.SHOW_MISS) console.log(miss.join('\n'));
