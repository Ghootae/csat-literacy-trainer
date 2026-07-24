/**
 * `suneung_db` 수집본 → 도메인 `Passage`.
 *
 * 문단이 `sections[].paragraphs[]`로 구조화되어 있어 필터는 두 개뿐이다 (docs/DATA-SCHEMA.md).
 * 각주와 자리표시는 버리지 않고 role로 표시만 한다 — 원본에 표/그림이 있던 자리를 학생이
 * 알 수 있어야 하고, 각주는 어휘 이해에 필요하다.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

import type {
  Paragraph,
  ParagraphAnnotation,
  ParagraphRole,
  Passage,
  PassageCategory,
  PassageImage,
  Section,
} from '@csat/core';

const PLACEHOLDER = /^<[^>]{1,20}>$/;

const CATEGORIES: readonly PassageCategory[] = [
  'science_technology',
  'social_culture',
  'humanities_arts',
];

export function classifyParagraph(text: string): ParagraphRole {
  const t = text.trim();
  if (t.startsWith('*')) return 'footnote';
  if (PLACEHOLDER.test(t)) return 'placeholder';
  return 'body';
}

/** 수집본 JSON은 스키마가 고정돼 있지만 타입은 없다. 좁은 형태만 선언해 읽는다. */
interface RawPassage {
  set_id: string;
  source: { detail_url: string };
  exam: { label: string; year: number; category: string | null; title: string };
  instruction: string;
  tags: string[];
  sections: {
    section_id: string;
    label: string | null;
    order: number;
    paragraphs: {
      paragraph_id: string;
      order: number;
      text: string;
      annotations: {
        annotation_id: string;
        type: string;
        marker?: string | null;
        start: number;
        end: number;
        text: string;
        style?: string | null;
      }[];
      image_ids: string[];
    }[];
  }[];
  images: {
    image_id: string;
    local_path: string;
    mime_type: string;
    width: number;
    height: number;
    alt_text: string | null;
    anchor: {
      container_type: string;
      container_id: string;
      position: string;
      align: string | null;
      float: string | null;
      width_percent: number | null;
      paragraph_offset: number;
    };
  }[];
}

export function normalize(raw: RawPassage): Passage {
  const sections: Section[] = raw.sections.map((s) => ({
    id: s.section_id,
    label: s.label,
    order: s.order,
    paragraphs: s.paragraphs.map(
      (p): Paragraph => ({
        id: p.paragraph_id,
        sectionId: s.section_id,
        order: p.order,
        role: classifyParagraph(p.text),
        text: p.text.trim(),
        annotations: p.annotations.map(
          (a): ParagraphAnnotation => ({
            id: a.annotation_id,
            type: a.type,
            marker: a.marker ?? null,
            start: a.start,
            end: a.end,
            text: a.text,
            style: a.style ?? null,
          }),
        ),
        imageIds: p.image_ids,
      }),
    ),
  }));

  const category = raw.exam.category;
  const images: PassageImage[] = raw.images.map((img) => ({
    id: img.image_id,
    localPath: img.local_path,
    mimeType: img.mime_type,
    width: img.width,
    height: img.height,
    altText: img.alt_text,
    anchor: {
      containerType: img.anchor.container_type,
      containerId: img.anchor.container_id,
      position: asPosition(img.anchor.position),
      align: asAlign(img.anchor.align),
      float: img.anchor.float === 'left' || img.anchor.float === 'right' ? img.anchor.float : null,
      widthPercent: img.anchor.width_percent,
      paragraphOffset: img.anchor.paragraph_offset,
    },
  }));

  return {
    id: raw.set_id,
    sourceUrl: raw.source.detail_url,
    title: raw.exam.title,
    examLabel: raw.exam.label,
    year: raw.exam.year,
    category: isCategory(category) ? category : 'uncategorized',
    tags: raw.tags,
    instruction: raw.instruction,
    sections,
    images,
  };
}

function isCategory(value: string | null): value is PassageCategory {
  return value !== null && (CATEGORIES as readonly string[]).includes(value);
}

function asPosition(value: string): 'start' | 'middle' | 'end' {
  return value === 'start' || value === 'middle' || value === 'end' ? value : 'end';
}

function asAlign(value: string | null): 'left' | 'center' | 'right' | null {
  return value === 'left' || value === 'center' || value === 'right' ? value : null;
}

/** 데이터셋 루트(`suneung_db/output`)에서 지문 하나를 읽는다. */
export function loadPassage(datasetRoot: string, setId: string): Passage {
  const path = join(datasetRoot, 'passages', `${setId}.json`);
  return normalize(JSON.parse(readFileSync(path, 'utf8')) as RawPassage);
}

export function loadAllPassages(datasetRoot: string): readonly Passage[] {
  const dir = join(datasetRoot, 'passages');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => loadPassage(datasetRoot, basename(f, '.json')));
}
