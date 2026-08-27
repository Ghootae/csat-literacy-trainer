/**
 * 콘텐츠 리포지토리.
 *
 * **파일시스템 접근은 이 파일 안에만 있다** (계획서 `D4` 규칙 1). 웹으로 옮길 때
 * 여기만 교체하면 되도록, 호출부는 경로를 모른다.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  ParagraphDiagnosticGoldSchema,
  ProblemQuestionGoldSchema,
  type Gold,
  type GeneratedQuerySet,
  type ParagraphDiagnosticGold,
  type ProblemQuestionGold,
} from '@csat/pipeline';
import type {
  PassageSummary,
  PassageView,
  ProblemContentView,
  Sentence,
} from '../shared/contract.js';

const ROOT = resolve(process.cwd(), 'content');
const DIALOGUE_ROOT = resolve(
  process.cwd(),
  'packages/pipeline/fixtures/experiments/dialogue/passages',
);
const PROBLEM_ROOT = resolve(
  process.cwd(),
  'packages/pipeline/fixtures/experiments/problem-solving',
);

export interface DialoguePassageParagraph {
  readonly paragraphId: string;
  readonly position: number;
  readonly text: string;
  readonly goldPath: string | null;
  readonly candidateGoldPath?: string;
  readonly goldReviewStatus?: 'human_reviewed' | 'awaiting_human_review';
}

export interface DialoguePassageContent {
  readonly passageId: string;
  readonly title: string;
  readonly exam: string;
  readonly source: {
    readonly status: 'exact-local-source' | 'incomplete-local-excerpt';
    readonly note?: string;
  };
  /** 문단 이해 세션 뒤 이어 풀 수 있는 문제. 현재 MVP는 지문당 하나만 노출한다. */
  readonly problemQuestionId?: string;
  readonly paragraphs: readonly DialoguePassageParagraph[];
}

export function loadDialoguePassages(root = DIALOGUE_ROOT): readonly DialoguePassageContent[] {
  return readdirSync(root)
    .filter((name) => name.endsWith('.json'))
    .map((name) => JSON.parse(readFileSync(resolve(root, name), 'utf8')) as DialoguePassageContent)
    .sort((a, b) => a.title.localeCompare(b.title, 'ko'));
}

export function loadDialogueGold(goldPath: string): {
  readonly gold: ParagraphDiagnosticGold;
  readonly goldHash: string;
} {
  const raw = readFileSync(resolve(process.cwd(), goldPath), 'utf8');
  return {
    gold: ParagraphDiagnosticGoldSchema.parse(JSON.parse(raw)),
    goldHash: `sha256:${createHash('sha256').update(raw).digest('hex')}`,
  };
}

export function loadProblemSolvingBundle(questionId: string): {
  readonly content: ProblemContentView;
  readonly gold: ProblemQuestionGold;
} {
  const supportedQuestionId = 'mrna-vaccine-lipid-nanoparticle-q19';
  if (questionId !== supportedQuestionId) throw new Error('등록되지 않은 문제입니다.');
  const content = JSON.parse(readFileSync(
    resolve(PROBLEM_ROOT, 'public', `${questionId}.json`), 'utf8',
  )) as ProblemContentView;
  const gold = ProblemQuestionGoldSchema.parse(JSON.parse(readFileSync(
    resolve(PROBLEM_ROOT, `${questionId}.json`), 'utf8',
  )));
  if (content.questionId !== gold.questionId || content.passageId !== gold.passageId) {
    throw new Error('공개 문제 콘텐츠와 골드가 일치하지 않습니다.');
  }
  if (
    content.choices.length !== gold.choices.length ||
    content.choices.some((choice, index) =>
      choice.choiceId !== gold.choices[index]?.choiceId ||
      choice.text !== gold.choices[index]?.text)
  ) {
    throw new Error('공개 선지와 골드 선지가 일치하지 않습니다.');
  }
  return { content: structuredClone(content), gold };
}

export interface Passage extends PassageView {
  readonly text: string;
  readonly tags?: readonly string[];
  /** 목록 정렬 순서. 없으면 뒤로 보낸다 — 파일시스템 순서는 과목이 뒤섞인다. */
  readonly order?: number;
}

export interface Content {
  readonly passage: Passage;
  readonly gold: Gold;
  readonly queries: GeneratedQuerySet;
  /**
   * 타이틀 질의. **없을 수 있다** — 아직 생성하지 않은 문단이 있으면 타이틀 단계를 건너뛴다.
   * 없다고 문단 전체가 막히면 안 된다.
   */
  readonly titleQueries?: GeneratedQuerySet;
}

export interface PassageManifest {
  readonly passageId: string;
  readonly title: string;
  readonly paragraphIds: readonly string[];
}

function passageManifests(): PassageManifest[] {
  const dir = resolve(ROOT, 'passages');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => JSON.parse(readFileSync(resolve(dir, entry.name), 'utf8')) as PassageManifest);
}

export function loadPassageManifest(passageId: string): PassageManifest {
  const manifest = passageManifests().find((candidate) => candidate.passageId === passageId);
  if (manifest === undefined) throw new Error(`지문 manifest 없음: ${passageId}`);
  return manifest;
}

export function findPassageManifestForParagraph(paragraphId: string): PassageManifest | undefined {
  return passageManifests().find((manifest) => manifest.paragraphIds.includes(paragraphId));
}

function read<T>(paragraphId: string, file: string): T {
  const path = resolve(ROOT, paragraphId, file);
  if (!existsSync(path)) throw new Error(`콘텐츠 없음: ${paragraphId}/${file}`);
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function loadContent(paragraphId: string): Content {
  const titlePath = resolve(ROOT, paragraphId, 'title-queries.json');
  return {
    passage: read<Passage>(paragraphId, 'passage.json'),
    gold: read<Gold>(paragraphId, 'gold.json'),
    queries: read<GeneratedQuerySet>(paragraphId, 'queries.json'),
    ...(existsSync(titlePath)
      ? { titleQueries: JSON.parse(readFileSync(titlePath, 'utf8')) as GeneratedQuerySet }
      : {}),
  };
}

/**
 * 고를 수 있는 문단 목록. `content/` 하위 디렉터리를 훑는다.
 *
 * **`passage.json`만 읽는다** — 골드와 질의는 열지도 않는다. 목록에 새 문단을 등록하는
 * 절차가 따로 없다는 뜻이기도 하다: 디렉터리를 만들면 그대로 나타난다.
 */
export function listPassages(): PassageSummary[] {
  if (!existsSync(ROOT)) return [];
  const membership = new Map<string, {
    passageId: string;
    passageTitle: string;
    passageIndex: number;
    passageLength: number;
  }>();
  for (const manifest of passageManifests()) {
    manifest.paragraphIds.forEach((paragraphId, passageIndex) => {
      if (membership.has(paragraphId)) throw new Error(`문단이 여러 지문 manifest에 등록됨: ${paragraphId}`);
      membership.set(paragraphId, {
        passageId: manifest.passageId,
        passageTitle: manifest.title,
        passageIndex,
        passageLength: manifest.paragraphIds.length,
      });
    });
  }
  const out: (PassageSummary & { order: number })[] = [];
  for (const dir of readdirSync(ROOT, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const path = resolve(ROOT, dir.name, 'passage.json');
    if (!existsSync(path)) continue;
    const p = JSON.parse(readFileSync(path, 'utf8')) as Passage;
    out.push({
      paragraphId: p.paragraphId,
      title: p.title,
      tags: p.tags ?? [],
      sentenceCount: p.sentences.length,
      ...membership.get(p.paragraphId),
      order: p.order ?? Number.MAX_SAFE_INTEGER,
    });
  }
  out.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'ko'));
  return out.map(({ order: _order, ...rest }) => rest);
}

/** 학생에게 보내는 것 — **골드도 질의도 포함하지 않는다.** */
export function toPassageView(p: Passage): PassageView {
  const sentences: Sentence[] = p.sentences.map((s) => ({ id: s.id, text: s.text }));
  return { paragraphId: p.paragraphId, title: p.title, sentences };
}
