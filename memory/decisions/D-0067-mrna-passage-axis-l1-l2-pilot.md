---
id: D-0067
status: accepted
date: 2026-10-02
scope: mrna-passage-axis-candidate-and-separate-level2-pilot
supersedes: none
---

# 전체 지문 문맥·1/2/3/4축·별도 L2의 mRNA 단일 지문 시험

## 결정

사용자는1축 후보 포함을 명시하고 mRNA 지문1개의 실제 테스트를 요청했다. 전체 지문 문맥을 제공한 문단별1/2/3/4축3회생성, 고유 경계 후보 JEV5회 평균선택, 선택된L1의L2별도생성을 실행한다. 같은 경계의 다른 축 문구는 보존하고 첫 문구로 평가한다. 동률은 자동 확정하지 않는다.

이는 오프라인 시험 승인이다. 새 생산 기준선·기존 골드 교체·운영 평가기·UI 변경 승인이 아니다. D-0066의 한정시험에 이어 현재 지문만 확대하며 D-0036 제품JEV보류는 유지한다. 지문 단위3호출로 모든 문단을 한번에 생성하는 방식은 이번 실행에 사용하지 않았고, 전체 지문을 넣은 문단별15호출이었다.

## 근거

- 사용자 ‘1축 후보도 포함’, ‘1개의 mRNA 지문을 대상으로 실제로 테스트해봐’.
- `docs/experiments/axis-candidate-jev-mrna-passage-2026-10-02/PLAN.md`, `manifest.json`.

## 결과의 적용 한계

시험 완료와 의미 품질 승인을 구분한다. 점수 근소함·반복 변동·중복 축·L2 의미 범위는 `docs/experiments/axis-candidate-jev-mrna-passage-2026-10-02/REVIEW.md`의 Codex 검토 사항이며 사용자 미승인이다. 원시 출력은 수동수정하지 않고 보존했다.

## 재검토 조건

선택된 경계와 L1/L2 문구를 사용자 검토한 뒤 다음 구현·시험 범위를 정한다. 자동 추가호출·운영 승격 없음.

## 근거 자료

- `docs/experiments/axis-candidate-jev-mrna-passage-2026-10-02/REVIEW.md`
- `scripts/test-axis-candidate-jev-mrna-passage.mjs`
- `scripts/finalize-axis-jev-mrna-passage.mjs`
