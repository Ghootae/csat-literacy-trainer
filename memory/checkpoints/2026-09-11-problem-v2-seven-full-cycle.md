---
date: 2026-09-11
scope: problem-solving-runtime-evaluation
base_commit: 6852686c2f975f6e628d33564b44d818c39e8d98
---

# 문제 풀이 v2 신규 7문항 전체 사이클 실행

## 실행한 것

- 문단 골드가 완성된 11지문의 연결 문항 중 v2 기실행 4문항을 제외한 7문항을 대상으로 했다.
- 문항마다 정답·충분, 정답·불충분, 정답·명시적 오류, 오답·명시적 오류, 오답·모호,
  선택–근거 충돌의 6사례를 사전 정의했다.
- 구조화 문제 골드는 사용하지 않고 지문·문항·정답·EBSi 배포 해설 기반 독립 의역·원자료
  이미지와 누적 합성 학생 발화만 사용했다.
- `gpt-5.6-terra`, effort `medium`, `source-direct-problem-dialogue-prompt-v2`로 실행했다.

## 새로 확인된 것

- 계획 84호출 중 상태상 도달 가능한 82호출이 실행됐고, 엄격 기대 일치는 78/82였다.
- 오답 관련 49호출은 모두 기대 행동과 일치했다. 모호한 오답 7/7이 최초 진단으로 보류되고,
  오류가 드러난 뒤 교정한 다음 실제 수정 후 재선택했다.
- 정답·불충분 근거 7건 중 3건을 `SUPPORTED`로 판정했다. 두 건은 명확한 과수용이고 한 건은
  압축 근거를 어디까지 인정할지의 경계 사례다.
- 결측치 문항에서 모델은 후보 직선과 최종 선택 직선의 충돌을 설명에 정확히 적었지만 라벨을
  `CLEAR_ERROR`가 아닌 `UNCERTAIN`으로 냈다. 후속 교정 2호출은 상태상 실행되지 않았다.
- API·스키마·근거 인용·미디어 ID 계약 오류는 0건이었다.
- 비용은 USD 0.977136로 승인된 USD 3 하드캡 안이었다.

## 상태 변화

- 모호한 오답 과잉 교정 질문 `Q-0002`를 신규 7문항의 7/7 진단 근거로 닫았다.
- 정답 근거 과수용과 명시적 오류 미탐지를 `Q-0008`로 열었다.
- 오답 라우팅 규칙은 변경하지 않았다. 정답 근거 경계의 표적 수정·회귀가 다음 문제 풀이 작업이다.

## 근거

- [`최종 보고서`](../../docs/experiments/problem-source-direct-v2-full-cycle-seven-2026-09-11/FINAL-REPORT.md)
- [`기계 요약`](../../docs/experiments/problem-source-direct-v2-full-cycle-seven-2026-09-11/summary.json)
- [`기계 결과`](../../docs/experiments/problem-source-direct-v2-full-cycle-seven-2026-09-11/results.json)
- [`학생 응답 fixture`](../../packages/pipeline/experiments/problem-solving/source-direct-v2-full-cycle-seven-fixtures-v1.json)
