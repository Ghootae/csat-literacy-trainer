#!/usr/bin/env python3
"""suneung_db 수집본을 어댑터 규칙으로 검사한다.

구 수집본(gugeodat 단일 JSON)과 달리 문단이 sections[].paragraphs[]로 구조화되어 있어
`\\n` 분할도, 그에 딸린 무결성 대조도 필요 없다. 남은 필터는 두 개뿐이다:

  1. `*`로 시작하는 문단 -> 각주. 화면에는 보이되 골드 대상이 아니다.
  2. `<표>` 같이 꺾쇠로만 이루어진 짧은 문단 -> 자리표시. 원본의 표/그림 위치.

복합 지문은 격리하지 않는다. (가)/(나)가 section.label로 명시되므로 섹션 경계를 알 수 있고,
학습은 어차피 문단 단위다.
"""
import json
import re
import statistics
import sys
from collections import Counter
from pathlib import Path

DATA = Path("/Users/mac/Projects/suneung_db/output")
PLACEHOLDER = re.compile(r"^<[^>]{1,20}>$")


def classify(text: str) -> str:
    t = text.strip()
    if t.startswith("*"):
        return "footnote"
    if PLACEHOLDER.fullmatch(t):
        return "placeholder"
    return "body"


def main() -> int:
    files = sorted((DATA / "passages").glob("*.json"))
    if not files:
        print(f"데이터 없음: {DATA}", file=sys.stderr)
        return 1

    roles = Counter()
    categories = Counter()
    section_counts = Counter()
    body_counts: list[int] = []
    body_lengths: list[int] = []
    images = 0
    passages_with_images = 0
    ann_total = ann_bad = 0
    ids = Counter()

    for path in files:
        doc = json.loads(path.read_text(encoding="utf-8"))
        ids[doc["set_id"]] += 1
        exam = doc.get("exam") or {}
        categories[exam.get("category") or "uncategorized"] += 1
        section_counts[len(doc["sections"])] += 1

        full_text = doc.get("full_text", "")
        n_body = 0
        for section in doc["sections"]:
            for para in section["paragraphs"]:
                role = classify(para["text"])
                roles[role] += 1
                if role == "body":
                    n_body += 1
                    body_lengths.append(len(para["text"]))
                for ann in para.get("annotations", []):
                    ann_total += 1
                    if full_text[ann["global_start"] : ann["global_end"]] != ann["text"]:
                        ann_bad += 1
        body_counts.append(n_body)

        if doc.get("images"):
            passages_with_images += 1
            images += len(doc["images"])

    dupes = {k: v for k, v in ids.items() if v > 1}

    print(f"지문 {len(files)}개 (중복 {len(dupes)}건)")
    print(f"영역: {dict(categories.most_common())}")
    print(f"섹션 수 분포: {dict(sorted(section_counts.items()))}  "
          f"— 2개 이상은 복합 지문 ((가)/(나))")
    print()
    print(f"문단 역할: {dict(roles.most_common())}")
    print(f"본문 문단 수  min {min(body_counts)} / 중앙 {int(statistics.median(body_counts))} "
          f"/ max {max(body_counts)}")
    print(f"본문 문단 길이 중앙 {int(statistics.median(body_lengths))}자 / 최대 {max(body_lengths)}자")
    print(f"4~6문단 지문: {sum(1 for c in body_counts if 4 <= c <= 6)}/{len(body_counts)}")
    print()
    print(f"이미지: {passages_with_images}개 지문에 {images}장")
    print(f"주석 오프셋: {ann_total}건 중 불일치 {ann_bad}건")

    if dupes:
        print(f"\n중복 set_id: {dupes}", file=sys.stderr)
        return 1
    if ann_bad:
        print(f"\n주석 오프셋 불일치 {ann_bad}건 — 어댑터에서 재확인 필요", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
