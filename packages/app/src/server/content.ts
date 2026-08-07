/**
 * 콘텐츠 리포지토리.
 *
 * **파일시스템 접근은 이 파일 안에만 있다** (계획서 `D4` 규칙 1). 웹으로 옮길 때
 * 여기만 교체하면 되도록, 호출부는 경로를 모른다.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Gold, GeneratedQuerySet } from '@csat/pipeline';
import type { PassageView, Sentence } from '../shared/contract.js';

const ROOT = resolve(process.cwd(), 'content');

export interface Passage extends PassageView {
  readonly text: string;
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

/** 학생에게 보내는 것 — **골드도 질의도 포함하지 않는다.** */
export function toPassageView(p: Passage): PassageView {
  const sentences: Sentence[] = p.sentences.map((s) => ({ id: s.id, text: s.text }));
  return { paragraphId: p.paragraphId, title: p.title, sentences };
}
