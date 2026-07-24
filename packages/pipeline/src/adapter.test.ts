/**
 * 어댑터를 실제 데이터셋 전량에 돌린다.
 *
 * 문서(docs/DATA-SCHEMA.md)의 수치가 스크립트 실행에서만 검증되고 코드에서는 검증되지 않는
 * 상태를 피하기 위해, 어댑터가 그 수치를 재현하는지 테스트로 고정한다.
 */

import { existsSync } from 'node:fs';

import { bodyParagraphs, imagesForParagraph } from '@csat/core';
import { describe, expect, it } from 'vitest';

import { classifyParagraph, loadAllPassages, loadPassage } from './adapter.js';

const DATASET = '/Users/mac/Projects/suneung_db/output';
const available = existsSync(DATASET);

describe('classifyParagraph', () => {
  it('각주를 본문에서 분리한다', () => {
    expect(classifyParagraph('* 정관: 법인의 근본 규칙.')).toBe('footnote');
  });

  it('꺾쇠 자리표시를 본문에서 분리한다', () => {
    expect(classifyParagraph('<표>')).toBe('placeholder');
    expect(classifyParagraph('<튀김과 초밥의 한계 효용>')).toBe('placeholder');
  });

  it('본문은 본문으로 둔다 — 꺾쇠를 포함하되 문장인 경우 포함', () => {
    expect(classifyParagraph('결측치는 데이터 값이 빠져 있는 것이다.')).toBe('body');
    expect(classifyParagraph('<보기>의 사례를 보면 이 원리가 드러난다.')).toBe('body');
  });
});

describe.skipIf(!available)('전량 정규화', () => {
  const passages = loadAllPassages(DATASET);

  it('158지문을 읽는다', () => {
    expect(passages).toHaveLength(158);
  });

  it('본문 990문단 · 각주 55 · 자리표시 2로 분류한다', () => {
    const roles = { body: 0, footnote: 0, placeholder: 0 };
    for (const p of passages) {
      for (const s of p.sections) {
        for (const para of s.paragraphs) roles[para.role] += 1;
      }
    }
    expect(roles).toEqual({ body: 990, footnote: 55, placeholder: 2 });
  });

  it('복합 지문 50건의 섹션 라벨을 보존한다', () => {
    const multi = passages.filter((p) => p.sections.length > 1);
    expect(multi).toHaveLength(50);
    for (const p of multi) {
      for (const s of p.sections) {
        expect(s.label, `${p.id}의 섹션 라벨`).toMatch(/^\([가-힣]\)$/);
      }
    }
  });

  it('이미지 17장의 앵커를 보존하며 컨테이너가 실재하는 문단을 가리킨다', () => {
    const withImages = passages.filter((p) => p.images.length > 0);
    expect(withImages).toHaveLength(15);
    expect(withImages.reduce((n, p) => n + p.images.length, 0)).toBe(17);

    for (const p of withImages) {
      const ids = new Set(p.sections.flatMap((s) => s.paragraphs.map((x) => x.id)));
      for (const img of p.images) {
        expect(ids.has(img.anchor.containerId), `${p.id}/${img.id}의 컨테이너`).toBe(true);
        expect(['start', 'middle', 'end']).toContain(img.anchor.position);
        expect(img.localPath).toMatch(/^assets\//);
      }
    }
  });

  it('영역이 알려진 값으로만 정규화된다', () => {
    const seen = new Set(passages.map((p) => p.category));
    expect([...seen].sort()).toEqual([
      'humanities_arts',
      'science_technology',
      'social_culture',
      'uncategorized',
    ]);
  });
});

describe.skipIf(!available)('캘리브레이션 픽스처 지문', () => {
  it('법인 지문의 본문 문단과 픽스처가 가리키는 문단이 일치한다', () => {
    const p = loadPassage(DATASET, '69bbf88d8937cf14551903ca');
    const body = bodyParagraphs(p);
    expect(body).toHaveLength(5);
    expect(body[0]!.id).toBe('s1_p1');
    expect(body[0]!.text).toContain('법인격의 부여 대상이 재산 자체인지 단체인지에 따라');
    expect(imagesForParagraph(p, 's1_p1')).toHaveLength(0);
  });

  it('데이터 지문의 문단 2가 3원 조건부 매핑을 담고 있다', () => {
    const body = bodyParagraphs(loadPassage(DATASET, '69c006f178128b2a9bedd2f3'));
    expect(body[1]!.id).toBe('s1_p2');
    expect(body[1]!.text).toContain('연속적인 수치이면 평균으로');
  });
});
