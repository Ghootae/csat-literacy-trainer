/**
 * 실험 fixture → 학생용 콘텐츠 이관.
 *
 *   npm run content:import [-- --dry]
 *   npm run content:import -- --id photosynthesis-p1
 *
 * 골드와 질의셋은 이미 만들어져 회귀로 검증까지 끝났는데 **실험 경로에만 있었다.**
 * 학생이 풀 수 있는 문단은 니체 하나뿐이었다. 이 CLI가 그 간극을 메운다 — LLM 호출 0회.
 *
 * 질의셋은 **손 오라클을 우선 쓴다.** 학생 테스트의 목적은 채점 엔진과 화면을 보는 것이지
 * 생성기를 보는 것이 아니다. 질의가 이상해서 판정이 이상하면 관찰이 오염된다.
 * 오라클이 없는 문단(`corporate-law`)만 생성 run1을 쓴다.
 *
 * 오라클은 모양이 다르다 — `regions`가 아니라 평평한 `queries` + `regionPolicy`다.
 * `oracleEvalSet`이 이미 하는 변환과 같은 일을 `GeneratedQuerySet` 모양으로 낸다.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Gold } from '../gold.js';
import type { GeneratedQuery, GeneratedQuerySet, GeneratedRegion } from '../llm/query-gen.js';

interface OracleQuery {
  readonly id: string;
  readonly level: string;
  readonly region: string;
  readonly question: string;
  readonly expectedAnswer: string;
  readonly sentences: readonly string[];
  readonly propositions?: readonly string[];
  readonly requiredForRelation?: boolean;
  readonly requiredForFullArgumentCoverage?: boolean;
  readonly acceptanceCriteria?: readonly string[];
  readonly contradictionCriteria?: readonly string[];
}

interface OracleFixture {
  readonly paragraphId: string;
  readonly topic: string;
  readonly queries: readonly OracleQuery[];
  readonly regionPolicy: readonly {
    readonly id: string;
    readonly label: string;
    readonly scopeQueries: readonly string[];
    readonly relationQueries: readonly string[];
    readonly argumentQueries: readonly string[];
  }[];
}

interface Source {
  /** `content/<id>/` 의 id. 학생용 URL에 그대로 쓰인다. */
  readonly id: string;
  readonly gold: string;
  /** 손 오라클 파일명. 없으면 생성 질의셋을 쓴다. */
  readonly oracle?: string;
  readonly generated?: string;
  readonly title: string;
  readonly source: string;
  readonly tags: readonly string[];
  /** 목록 정렬. 관계 구조가 단순한 것부터 — 조건 분기·순환·분업 순으로 어려워진다. */
  readonly order: number;
}

/**
 * 이관 대상. 회귀 3세트가 다루는 문단 전부다 — 판정이 어떻게 나오는지 이미 아는 콘텐츠라,
 * 학생 테스트에서 이상한 판정이 나오면 그것이 진짜 신호인지 바로 가릴 수 있다.
 */
const SOURCES: readonly Source[] = [
  {
    id: 'corporate-law-p1',
    order: 10,
    gold: '.omc/agreement/s1_p1.gold-1.json',
    generated: 'corporate-law-v1-run1.json', // 손 오라클이 없는 유일한 문단
    title: '법인의 권리 능력',
    source: '수능 국어 비문학 (법)',
    tags: ['법', '역할 분리'],
  },
  {
    id: 'science-p5',
    order: 20,
    gold: '.omc/agreement/69bffacbfa5063deffe19cc6_s1_p5.gold-1.json',
    oracle: 'science-p5-hand.json',
    title: '니켈 촉매의 인과와 트레이드오프',
    source: '수능 국어 비문학 (과학)',
    tags: ['과학', '인과', '트레이드오프'],
  },
  {
    id: 'humanities-p4',
    order: 30,
    gold: '.omc/agreement/69c011fd78128b2a9beddd5e_s1_p4.gold-1.json',
    oracle: 'humanities-p4-hand.json',
    title: '실재론과 명목론',
    source: '수능 국어 비문학 (인문)',
    tags: ['인문', '주장·근거'],
  },
  {
    id: 'photosynthesis-p1',
    order: 40,
    gold: '.omc/agreement/69bce4ece23376a28e12cb7c_s1_p1.gold-1.json',
    generated: 'photosynthesis-p1-v1-run1.json',
    title: '광합성 방식의 공통성과 환경 적응',
    source: '고1 2025년 3월 교육청 모의평가',
    tags: ['과학', '광합성', '환경 적응'],
  },
  {
    id: 'photosynthesis-p2',
    order: 41,
    gold: '.omc/agreement/69bce4ece23376a28e12cb7c_s1_p2.gold-1.json',
    generated: 'photosynthesis-p2-v1-run1.json',
    title: '명반응과 기공의 기능',
    source: '고1 2025년 3월 교육청 모의평가',
    tags: ['과학', '광합성', '명반응'],
  },
  {
    id: 'disclosure-p3',
    order: 50,
    gold: '.omc/agreement/s1_p3.gold-1.json',
    oracle: 'disclosure-p3-hand.json',
    title: '증권 공시 의무의 조건과 예외',
    source: '수능 국어 비문학 (사회)',
    tags: ['사회', '조건·예외', '절차'],
  },
  {
    id: 'photosynthesis-p3',
    order: 42,
    gold: '.omc/agreement/69bce4ece23376a28e12cb7c_s1_p3.gold-1.json',
    oracle: 'photosynthesis-p3-hand.json',
    title: '캘빈 회로',
    source: '수능 국어 비문학 (과학)',
    tags: ['과학', '순환'],
  },
  {
    id: 'photosynthesis-p4',
    order: 43,
    gold: '.omc/agreement/s1_p4.gold-1.json',
    oracle: 'photosynthesis-p4-hand.json',
    title: 'C3 식물의 한계와 C4 연구',
    source: '수능 국어 비문학 (과학)',
    tags: ['과학', '문제-해결'],
  },
  {
    id: 'photosynthesis-p5',
    order: 44,
    gold: '.omc/agreement/69bce4ece23376a28e12cb7c_s1_p5.gold-1.json',
    oracle: 'photosynthesis-p5-hand.json',
    title: 'C4 식물의 두 공간 분업',
    source: '수능 국어 비문학 (과학)',
    tags: ['과학', '분업'],
  },
  {
    id: 'photosynthesis-p6',
    order: 45,
    gold: '.omc/agreement/69bce4ece23376a28e12cb7c_s1_p6.gold-1.json',
    generated: 'photosynthesis-p6-v1-run1.json',
    title: 'C4 식물의 광합성 기여와 연구 가치',
    source: '고1 2025년 3월 교육청 모의평가',
    tags: ['과학', '광합성', '기후 위기'],
  },
];

const ORACLE_DIR = resolve(process.cwd(), 'packages/pipeline/fixtures/query-oracles');
const GEN_DIR = resolve(process.cwd(), 'packages/pipeline/fixtures/generated-queries');
const CONTENT = resolve(process.cwd(), 'content');

function readJson<T>(p: string): T {
  return JSON.parse(readFileSync(p, 'utf8')) as T;
}

/** 손 오라클(평평한 queries + regionPolicy) → 생성 질의셋 모양. */
function oracleToQuerySet(fx: OracleFixture, paragraphId: string): GeneratedQuerySet {
  const byId = new Map(fx.queries.map((q) => [q.id, q]));
  const regions: GeneratedRegion[] = fx.regionPolicy.map((m, i) => {
    const ids = [...m.scopeQueries, ...m.relationQueries, ...m.argumentQueries];
    const queries: GeneratedQuery[] = ids.map((id) => {
      const q = byId.get(id);
      if (q === undefined) throw new Error(`${paragraphId}: regionPolicy가 없는 질의 ${id}를 가리킨다`);
      // 층위는 질의 자신의 필드가 아니라 **regionPolicy의 배치**에서 온다. 오라클은 질의에도
      // level을 적어 두지만 배치가 정본이다 — `oracleEvalSet`도 같은 규칙을 쓴다.
      const level = m.scopeQueries.includes(id)
        ? ('scope' as const)
        : m.relationQueries.includes(id)
          ? ('relation' as const)
          : ('argument' as const);
      return {
        id,
        level,
        question: q.question,
        expectedAnswer: q.expectedAnswer,
        sourceSentenceIds: [...q.sentences],
        propositionIds: [...(q.propositions ?? [])],
        relationEdgeIds: [],
        criticalForRelation: q.requiredForRelation === true,
        requiredForFullArgumentCoverage: q.requiredForFullArgumentCoverage === true,
        acceptanceCriteria: [...(q.acceptanceCriteria ?? [])],
        contradictionCriteria: [...(q.contradictionCriteria ?? [])],
      };
    });
    const uniq = (xs: string[]): string[] => [...new Set(xs)];
    return {
      // `r1`, `r2`… 로 통일한다. 오라클의 id(`c4_def` 등)는 사람이 읽으려고 붙인 것이고,
      // 화면은 영역을 위치로 부르므로(§4.1.3) 정렬 가능한 이름이 낫다.
      regionId: `r${i + 1}`,
      label: m.label,
      sourceSentenceIds: uniq(queries.flatMap((q) => q.sourceSentenceIds)),
      propositionIds: uniq(queries.flatMap((q) => q.propositionIds)),
      relationEdgeIds: [],
      queries,
    };
  });
  return { paragraphId, regions };
}

function main(): void {
  const dry = process.argv.includes('--dry');
  const idIndex = process.argv.indexOf('--id');
  const onlyId = idIndex === -1 ? undefined : process.argv[idIndex + 1];
  if (idIndex !== -1 && onlyId === undefined) throw new Error('--id 뒤에 문단 ID가 필요하다');
  const selected = onlyId === undefined ? SOURCES : SOURCES.filter((source) => source.id === onlyId);
  if (selected.length === 0) throw new Error(`이관 대상에 없는 문단: ${onlyId}`);
  console.log(`실험 fixture → content/ 이관${dry ? ' (드라이런)' : ''}\n`);

  for (const s of selected) {
    const goldPath = resolve(process.cwd(), s.gold);
    if (!existsSync(goldPath)) {
      console.error(`  ✗ ${s.id}: 골드 없음 ${s.gold}`);
      continue;
    }
    const gold = readJson<Gold & { sentences: { id: string; text: string }[] }>(goldPath);

    let queries: GeneratedQuerySet;
    let via: string;
    if (s.oracle !== undefined) {
      queries = oracleToQuerySet(readJson<OracleFixture>(resolve(ORACLE_DIR, s.oracle)), s.id);
      via = `손 오라클 ${s.oracle}`;
    } else if (s.generated !== undefined) {
      const gen = readJson<GeneratedQuerySet>(resolve(GEN_DIR, s.generated));
      queries = { ...gen, paragraphId: s.id };
      via = `생성 ${s.generated}`;
    } else {
      console.error(`  ✗ ${s.id}: 질의셋 지정 없음`);
      continue;
    }

    // 골드의 paragraphId는 실험용 해시다. 콘텐츠 id로 맞춰 두지 않으면 캐시 키와 세션
    // 기록에 해시가 섞여 나중에 어느 문단인지 못 읽는다.
    const outGold = { ...gold, paragraphId: s.id };
    const passage = {
      paragraphId: s.id,
      title: s.title,
      source: s.source,
      tags: s.tags,
      order: s.order,
      text: gold.sentences.map((x) => x.text).join(' '),
      sentences: gold.sentences.map((x) => ({ id: x.id, text: x.text })),
    };

    const nQ = queries.regions.reduce((n, r) => n + r.queries.length, 0);
    console.log(
      `  ${s.id.padEnd(20)} 문장 ${String(gold.sentences.length).padStart(2)} · 영역 ${queries.regions.length} · 질의 ${String(nQ).padStart(2)}   ${via}`,
    );

    if (dry) continue;
    const dir = resolve(CONTENT, s.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'passage.json'), `${JSON.stringify(passage, null, 2)}\n`, 'utf8');
    writeFileSync(resolve(dir, 'gold.json'), `${JSON.stringify(outGold, null, 2)}\n`, 'utf8');
    writeFileSync(resolve(dir, 'queries.json'), `${JSON.stringify(queries, null, 2)}\n`, 'utf8');
  }

  console.log(dry ? '\n(드라이런 — 파일을 쓰지 않았다)' : `\n${selected.length}문단 이관 완료`);
}

main();
