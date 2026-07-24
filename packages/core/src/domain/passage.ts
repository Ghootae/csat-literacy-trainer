/**
 * 지문 도메인 모델. `suneung_db` 수집본(`output/passages/{set_id}.json`)을 정규화한 형태다.
 *
 * 구 수집본 대비 세 가지가 근본적으로 다르다:
 *  1. 문단이 `sections[].paragraphs[]`로 **구조화**되어 있다. `\n` 분할과 그에 딸린
 *     무결성 검사가 통째로 불필요하다.
 *  2. 복합 지문의 (가)/(나)가 `section.label`로 **명시**된다. 격리할 이유가 없어졌다.
 *  3. 주석(밑줄 ㉠ⓐ 등)의 문자 오프셋이 **실제로 맞는다** (697건 전수 검증).
 */

/** 지문 영역. 수집본의 `exam.category`. 일부 레코드는 미분류다. */
export type PassageCategory =
  | 'science_technology'
  | 'social_culture'
  | 'humanities_arts'
  | 'uncategorized';

export interface PassageImageAnchor {
  /** 이미지가 붙는 컨테이너의 종류. 지문 이미지는 `paragraph`. */
  readonly containerType: string;
  readonly containerId: string;
  /** 문단 내 배치. 학습 화면은 이 값에 따라 문단 앞/중간/뒤에 렌더한다. */
  readonly position: 'start' | 'middle' | 'end';
  readonly align: 'left' | 'center' | 'right' | null;
  readonly float: 'left' | 'right' | null;
  /** 컨테이너 폭 대비 백분율. 없으면 원본 픽셀 크기를 쓴다. */
  readonly widthPercent: number | null;
  /** `position === 'middle'`일 때 문단 텍스트 내 삽입 지점. */
  readonly paragraphOffset: number;
}

export interface PassageImage {
  readonly id: string;
  /** 데이터셋 루트 기준 상대 경로 (`assets/{set_id}/img_001.png`). */
  readonly localPath: string;
  readonly mimeType: string;
  readonly width: number;
  readonly height: number;
  readonly altText: string | null;
  readonly anchor: PassageImageAnchor;
}

/** 밑줄 표시(㉠ ⓐ …) 등 문단 내 주석. 오프셋은 문단 텍스트 기준으로 정규화된다. */
export interface ParagraphAnnotation {
  readonly id: string;
  readonly type: string;
  readonly marker: string | null;
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly style: string | null;
}

/**
 * 문단의 역할.
 * - `body`: 학습 대상. 골드 생성과 슬롯 입력이 여기에만 일어난다.
 * - `footnote`: `*`로 시작하는 어휘 주석. 화면에는 보여주되 골드에서 제외한다.
 * - `placeholder`: `<표>` 같은 자리표시. 원본에 표/그림이 있었음을 뜻한다.
 */
export type ParagraphRole = 'body' | 'footnote' | 'placeholder';

export interface Paragraph {
  readonly id: string;
  readonly sectionId: string;
  readonly order: number;
  readonly role: ParagraphRole;
  readonly text: string;
  readonly annotations: readonly ParagraphAnnotation[];
  readonly imageIds: readonly string[];
}

/** 복합 지문의 (가)/(나)/(다). 단일 지문은 섹션 하나에 `label === null`이다. */
export interface Section {
  readonly id: string;
  readonly label: string | null;
  readonly order: number;
  readonly paragraphs: readonly Paragraph[];
}

export interface Passage {
  readonly id: string;
  readonly sourceUrl: string;
  readonly title: string;
  readonly examLabel: string;
  readonly year: number;
  readonly category: PassageCategory;
  readonly tags: readonly string[];
  readonly instruction: string;
  readonly sections: readonly Section[];
  readonly images: readonly PassageImage[];
}

/** 학습 대상 문단만. 각주와 자리표시는 골드 생성에 들어가지 않는다. */
export function bodyParagraphs(passage: Passage): readonly Paragraph[] {
  return passage.sections.flatMap((s) => s.paragraphs.filter((p) => p.role === 'body'));
}

/** 문단 하나에 붙은 이미지들. 렌더 순서는 앵커의 `paragraphOffset`을 따른다. */
export function imagesForParagraph(
  passage: Passage,
  paragraphId: string,
): readonly PassageImage[] {
  return passage.images
    .filter((img) => img.anchor.containerId === paragraphId)
    .toSorted((a, b) => a.anchor.paragraphOffset - b.anchor.paragraphOffset);
}
