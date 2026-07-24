# 원본 데이터 스키마 — `suneung_db`

데이터셋 위치: `/Users/mac/Projects/suneung_db/output/`
전수 검사: `python3 scripts/inspect-data.py` · 2026-07-23

이전 수집본(gugeodat 단일 JSON, `data/`)은 **폐기**한다. 아래 "구 수집본 대비 무엇이
해결됐나"에 이유가 있다.

## 레이아웃

```
output/
  passages/{set_id}.json         지문 158개
  questions/{set_id}.json        문항 (현 설계에서는 미사용)
  assets/{set_id}/img_NNN.png    이미지 17장
  manifest.json
```

## 지문 스키마

```jsonc
{
  "schema_version": "1.0",
  "set_id": "69bbefa4a029f488d9e4e809",
  "source": { "detail_url": "...", "collected_at": "..." },
  "exam": {
    "label": "고3 2025년(2026학년도) 11월 - 수능",
    "year": 2025, "month": 11, "grade": 3,
    "subject": "reading",               // 158건 전부 reading (독서)
    "category": "science_technology",   // 영역. null인 레코드 55건
    "title": "열팽창과 액추에이터"
  },
  "instruction": "다음 글을 읽고 물음에 답하시오.",
  "full_text": "…",                      // 주석 오프셋의 기준 좌표계
  "tags": ["물리학", …],
  "sections": [                          // 복합 지문의 (가)/(나)가 여기서 갈린다
    {
      "section_id": "section_s1",
      "label": null,                     // 복합 지문이면 "(가)" / "(나)" / "(다)"
      "order": 1,
      "source_range": { "start": 0, "end": 1443 },
      "paragraphs": [
        {
          "paragraph_id": "s1_p1",
          "order": 1,
          "text": "…",
          "source_range": { "start": 0, "end": 304 },
          "annotations": [ { "annotation_id": "ann_002", "type": "underlined_phrase",
                             "marker": "ⓐ", "start": 147, "end": 149,
                             "global_start": 147, "global_end": 149,
                             "text": "얻는", "style": "underline" } ],
          "image_ids": []
        }
      ]
    }
  ],
  "images": [ /* 아래 */ ],
  "elements": [ /* 원본 렌더 순서. 정규화에는 불필요 */ ]
}
```

## 실측 (158지문 전수)

| 항목 | 값 |
|---|---|
| 지문 | **158** (중복 0) |
| 영역 | 미분류 55 / 과학기술 43 / 사회문화 41 / 인문예술 19 |
| 섹션 수 | 1개 **108** · 2개 **47** · 3개 **3** |
| 문단 역할 | 본문 **990** · 각주 55 · 자리표시 2 |
| 본문 문단 수 | 최소 3 / 중앙 **6** / 최대 12 |
| 본문 문단 길이 | 중앙 **295자** / 최대 1148자 |
| 4~6문단 지문 | 99 / 158 |
| 이미지 | 15개 지문에 **17장** |
| 주석 오프셋 | 697건 **전부 정확** |

## 어댑터 규칙 — 필터 2개가 전부다

```
passage.json
  → sections[].paragraphs[] 를 순회
      · text가 "*"로 시작        → role: footnote     (55건)
      · text가 <…> 꺾쇠만        → role: placeholder  (2건: <표>, <튀김과 초밥의 한계 효용>)
      · 그 외                    → role: body         (990건)
  → Passage { sections[], images[], … }
```

골드 생성과 슬롯 입력은 `role === 'body'`에만 일어난다. 각주와 자리표시는 화면에는 보여주되
골드 대상이 아니다 — 원본의 표/그림이 있던 자리를 학생이 알 수 있어야 하기 때문이다.

**복합 지문을 격리하지 않는다.** (가)/(나)가 `section.label`로 명시되므로 경계가 데이터에
있고, 학습은 어차피 문단 단위다. 섹션 라벨은 화면에 그대로 표시한다.

## 이미지 배치

```jsonc
{
  "image_id": "img_001",
  "local_path": "assets/69bbefa4a029f488d9e4e809/img_001.png",
  "mime_type": "image/png", "width": 418, "height": 240,
  "sha256": "…", "alt_text": null,
  "anchor": {
    "container_type": "paragraph",
    "container_id": "s1_p3",      // 이 문단에 붙는다
    "position": "start",          // start | middle | end
    "align": "center",
    "float": null,
    "width_percent": 50,
    "paragraph_offset": 0         // position이 middle일 때 삽입 지점
  }
}
```

학습 화면은 **이 앵커대로 렌더해야 한다.** 지문에서 그림이 놓인 자리가 곧 독해의 단서다 —
도표를 참조하며 읽어야 하는 문단이 있으므로, 위치를 무시하고 문단 끝에 몰아넣으면 원문과
다른 글이 된다.

- `position`: 문단 앞 / 중간(`paragraph_offset` 지점) / 뒤
- `align`, `float`: 정렬과 흘림. `float`이 있으면 텍스트가 옆으로 흐른다
- `width_percent`: 컨테이너 폭 대비. 없으면 `width`/`height` 원본 픽셀

문항 쪽 이미지(`questions/*.json`의 `images[]`)는 `container_type: "question_supplement"`로
`<보기>`에 붙는다. 현 설계는 문항을 쓰지 않으므로 미사용이다.

## 구 수집본 대비 무엇이 해결됐나

구 수집본을 상대로 세웠던 방어 장치 대부분이 불필요해졌다.

| 구 수집본의 문제 | 새 수집본 |
|---|---|
| 문단이 `passage` 문자열 안에 `\n`으로만 구분 | `sections[].paragraphs[]`로 **구조화** |
| 표가 줄 단위로 쪼개져 `투표자 선호순위`(8자)가 문단이 됨 | `<표>` 자리표시 하나로 접힘 |
| 문단 분할 무결성 대조가 필요했음 (개수 비교) | **불필요** — 구조가 명시적 |
| (가)/(나) 경계를 복원할 수 없어 48건 격리 | `section.label`로 명시. **격리 불필요** |
| 주석 오프셋이 문자 위치가 아니었음 (첫 문단 328자 vs 폭 255) | 697건 **전수 일치** |
| `product_id` 중복 1건 | 중복 0 |
| 영역 구분 필드 없음 | `exam.category` |
| 이미지 정보 없음 | 위치·정렬·폭까지 기록 |

사용 가능 지문이 **104 → 158**로 늘었다. 복합 지문 48건을 되찾은 것이 대부분이다.
