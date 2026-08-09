/**
 * 콘텐츠 리포지토리.
 *
 * **파일시스템 접근은 이 파일 안에만 있다** (계획서 `D4` 규칙 1). 웹으로 옮길 때
 * 여기만 교체하면 되도록, 호출부는 경로를 모른다.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Gold, GeneratedQuerySet } from '@csat/pipeline';
import type { PassageSummary, PassageView, Sentence } from '../shared/contract.js';

const ROOT = resolve(process.cwd(), 'content');

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
}

function read<T>(paragraphId: string, file: string): T {
  const path = resolve(ROOT, paragraphId, file);
  if (!existsSync(path)) throw new Error(`콘텐츠 없음: ${paragraphId}/${file}`);
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function loadContent(paragraphId: string): Content {
  return {
    passage: read<Passage>(paragraphId, 'passage.json'),
    gold: read<Gold>(paragraphId, 'gold.json'),
    queries: read<GeneratedQuerySet>(paragraphId, 'queries.json'),
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
