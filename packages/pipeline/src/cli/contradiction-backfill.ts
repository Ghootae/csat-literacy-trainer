/**
 * 모순 기준이 비어 있는 문단을 찾아 채운다.
 *
 *   npm run ccfill                 비어 있는 문단 목록만 보여준다 (호출 없음)
 *   npm run ccfill -- <문단id>...   그 문단들을 채워 content/에 쓴다
 *
 * 손 오라클에서 가져온 문단은 `contradictionCriteria`가 통째로 비어 있다 — 오라클에 그 필드가
 * 없기 때문이다. 그 상태에서는 채점기가 모순을 잡을 근거가 없다.
 *
 * **덮어쓰지 않는다.** 이미 기준이 있는 질의는 건드리지 않는다. 손으로 다듬은 것이 있으면
 * 그것이 이긴다 — 니체 문단의 귀속 기준처럼 실측으로 검증된 것을 재생성이 지우면 안 된다.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  type CriteriaGenQuery,
  CONTRADICTION_GENERATOR_VERSION,
  generateContradictionCriteria,
} from '../llm/contradiction-gen.js';
import type { GeneratedQuerySet } from '../llm/query-gen.js';

interface Passage {
  readonly paragraphId: string;
  readonly sentences: readonly { readonly id: string; readonly text: string }[];
}

const CONTENT = resolve(process.cwd(), 'content');
const path = (id: string, f: string) => resolve(CONTENT, id, f);
const readJson = <T>(id: string, f: string): T => JSON.parse(readFileSync(path(id, f), 'utf8')) as T;

const ALL = [
  'corporate-law-p1',
  'science-p5',
  'humanities-p4',
  'photosynthesis-p4',
  'disclosure-p3',
  'photosynthesis-p3',
  'photosynthesis-p5',
  'nietzsche-p1',
];

function survey(): void {
  console.log(`${'문단'.padEnd(20)} ${'질의'.padStart(4)} ${'기준있음'.padStart(8)} ${'비어있음'.padStart(8)}`);
  for (const id of ALL) {
    const gen = readJson<GeneratedQuerySet>(id, 'queries.json');
    const qs = gen.regions.flatMap((r) => r.queries);
    const have = qs.filter((q) => q.contradictionCriteria.length > 0).length;
    const mark = have === 0 ? '   ← 모순을 잡을 근거가 없다' : '';
    console.log(`${id.padEnd(20)} ${String(qs.length).padStart(4)} ${String(have).padStart(8)} ${String(qs.length - have).padStart(8)}${mark}`);
  }
}

async function fill(id: string): Promise<void> {
  const gen = readJson<GeneratedQuerySet>(id, 'queries.json');
  const passage = readJson<Passage>(id, 'passage.json');
  const paragraphText = passage.sentences.map((s) => s.text).join(' ');

  const targets: CriteriaGenQuery[] = [];
  for (const r of gen.regions) {
    for (const q of r.queries) {
      // 이미 있는 것은 넘긴다 — 재생성이 손질된 기준을 지우면 안 된다.
      if (q.contradictionCriteria.length > 0) continue;
      targets.push({
        id: q.id,
        level: q.level,
        region: r.label,
        question: q.question,
        expectedAnswer: q.expectedAnswer,
        acceptanceCriteria: q.acceptanceCriteria,
      });
    }
  }
  if (targets.length === 0) {
    console.log(`${id}: 채울 것이 없다.`);
    return;
  }

  const out = await generateContradictionCriteria(id, paragraphText, targets);
  const byId = new Map(out.items.map((i) => [i.queryId, i.contradictionCriteria]));

  let filled = 0;
  let scopeSkipped = 0;
  for (const r of gen.regions) {
    for (const q of r.queries) {
      if (q.contradictionCriteria.length > 0) continue;
      const got = byId.get(q.id);
      if (got === undefined || got.length === 0) continue;
      // scope 질의의 모순은 영역을 통째로 모순으로 만든다(rawScopeState). 프롬프트에서도
      // 막지만, 모델이 넘겨도 여기서 다시 거른다 — 파급이 큰 쪽은 코드로 지킨다.
      if (q.level === 'scope') {
        scopeSkipped += 1;
        continue;
      }
      (q as { contradictionCriteria: string[] }).contradictionCriteria = [...got];
      filled += 1;
    }
  }

  const meta = (gen as unknown as { _meta?: Record<string, unknown> })._meta ?? {};
  (gen as unknown as { _meta: Record<string, unknown> })._meta = {
    ...meta,
    contradictionBackfill: { version: CONTRADICTION_GENERATOR_VERSION, at: new Date().toISOString() },
  };

  writeFileSync(path(id, 'queries.json'), `${JSON.stringify(gen, null, 2)}\n`, 'utf8');
  console.log(`${id}: ${filled}개 채움 (대상 ${targets.length}, scope라 건너뜀 ${scopeSkipped})`);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  survey();
  console.log('\n채우려면: npm run ccfill -- <문단id> [문단id...]');
} else {
  for (const id of args) {
    if (!ALL.includes(id)) throw new Error(`모르는 문단: ${id}`);
    await fill(id);
  }
}
