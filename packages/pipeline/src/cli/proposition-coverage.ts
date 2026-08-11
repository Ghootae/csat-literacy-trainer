/**
 * 고아 명제 조사·보강.
 *
 *   npm run propfill                 고아 명제 목록만 보여준다 (호출 없음)
 *   npm run propfill -- <문단id>...   전용 질의를 만들어 content/에 넣는다
 *
 * 고아 = relation/argument 질의가 하나도 앵커링하지 않아 앵커가 scope 질의뿐인 명제.
 * 원칙 A가 scope 증거를 버리므로 학생이 무엇을 써도 항상 ○가 된다.
 *
 * **`최대 ◐`인 명제는 건드리지 않는다.** 전용 질의가 없어 상한이 걸린 60개는 여기 대상이
 * 아니다. 그쪽은 상한 규칙을 완화하는 문제가 아니라 판정에 명제별 직접 증거를 실어 오는
 * 문제이고, 별도 단계다(2026-08-09 과대충족 회귀를 다시 열지 않기 위해).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  PROPOSITION_QUERY_GENERATOR_VERSION,
  generatePropositionQuery,
} from '../llm/proposition-query-gen.js';
import type { GeneratedQuerySet } from '../llm/query-gen.js';

interface GoldNode {
  readonly id: string;
  readonly kind?: string;
  readonly text?: string;
  readonly shortForm?: string;
}
interface Gold {
  readonly nodes: readonly GoldNode[];
}
interface Passage {
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

interface Orphan {
  readonly regionId: string;
  readonly regionLabel: string;
  readonly propositionId: string;
  readonly text: string;
  readonly shortForm: string;
  readonly siblings: readonly string[];
}

function orphansOf(id: string): Orphan[] {
  const gen = readJson<GeneratedQuerySet>(id, 'queries.json');
  const gold = readJson<Gold>(id, 'gold.json');
  const node = new Map(gold.nodes.map((n) => [n.id, n]));
  const out: Orphan[] = [];
  for (const r of gen.regions) {
    // 이 영역에서 relation/argument 질의가 덮는 명제
    const covered = new Set(
      r.queries.filter((q) => q.level !== 'scope').flatMap((q) => q.propositionIds),
    );
    for (const pid of r.propositionIds) {
      if (covered.has(pid)) continue;
      const n = node.get(pid);
      out.push({
        regionId: r.regionId,
        regionLabel: r.label,
        propositionId: pid,
        text: n?.text ?? pid,
        shortForm: n?.shortForm ?? pid,
        siblings: r.queries.map((q) => q.question),
      });
    }
  }
  return out;
}

function survey(): void {
  let total = 0;
  for (const id of ALL) {
    const os = orphansOf(id);
    total += os.length;
    if (os.length === 0) continue;
    console.log(`${id}  — 고아 ${os.length}개`);
    for (const o of os) console.log(`   [${o.regionId}] ${o.propositionId}  ${o.shortForm}`);
  }
  console.log(total === 0 ? '\n고아 명제 없음.' : `\n합계 ${total}개. 채우려면: npm run propfill -- <문단id>...`);
}

async function fill(id: string): Promise<void> {
  const os = orphansOf(id);
  if (os.length === 0) {
    console.log(`${id}: 고아 없음.`);
    return;
  }
  const gen = readJson<GeneratedQuerySet>(id, 'queries.json');
  const passage = readJson<Passage>(id, 'passage.json');
  const paragraphText = passage.sentences.map((s) => s.text).join(' ');

  for (const o of os) {
    const q = await generatePropositionQuery({
      paragraphId: id,
      paragraphText,
      regionLabel: o.regionLabel,
      propositionText: o.text,
      propositionShortForm: o.shortForm,
      siblingQuestions: o.siblings,
    });
    const region = gen.regions.find((r) => r.regionId === o.regionId);
    if (region === undefined) continue;
    // id는 기존과 겹치지 않게 명제 id를 붙여 만든다. `q4b` 같은 기존 규약과 구별된다.
    const queryId = `${o.regionId}${o.propositionId}`;
    (region.queries as unknown[]).push({
      id: queryId,
      level: 'argument',
      question: q.question,
      expectedAnswer: q.expectedAnswer,
      sourceSentenceIds: region.sourceSentenceIds,
      propositionIds: [o.propositionId], // **전용** — 이 하나만
      relationEdgeIds: [],
      criticalForRelation: false, // 영역 판정을 흔들지 않는다. 표시용 커버리지다.
      requiredForFullArgumentCoverage: false,
      acceptanceCriteria: q.acceptanceCriteria,
      contradictionCriteria: q.contradictionCriteria,
    });
    console.log(`  + ${queryId}  ${o.shortForm}`);
    console.log(`      ${q.question}`);
  }

  const meta = (gen as unknown as { _meta?: Record<string, unknown> })._meta ?? {};
  (gen as unknown as { _meta: Record<string, unknown> })._meta = {
    ...meta,
    propositionCoverage: {
      version: PROPOSITION_QUERY_GENERATOR_VERSION,
      at: new Date().toISOString(),
      added: os.length,
    },
  };
  writeFileSync(path(id, 'queries.json'), `${JSON.stringify(gen, null, 2)}\n`, 'utf8');
  console.log(`${id}: ${os.length}개 추가`);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  survey();
} else {
  for (const id of args) {
    if (!ALL.includes(id)) throw new Error(`모르는 문단: ${id}`);
    await fill(id);
  }
}
