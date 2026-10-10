---
id: D-0007
status: superseded
date: 2026-09-11
scope: problem-solving-runtime
supersedes: none
superseded_by: D-0008
---

# 학생 발화 보존을 강화한 문제 풀이 v3 후보를 별도 검증

## 결정

현행 `source-direct-problem-dialogue-prompt-v2`를 운영 기준선으로 유지하면서, 학생이 말하지
않은 올바른 관계의 과잉 보충, 호출 사이 오류 명제 변형, 유도적 진단 질문, 재선택 안내의
간접 정답 누출과 부분 수정의 과대 인정을 표적으로 한 `v3` 후보를 별도로 검증한다.

v3의 상위 불변 조건은 생략된 언어 표현은 문맥으로 복원할 수 있지만 확인되지 않은 판단
내용은 복원하지 않는 것이다. 학생이 명시한 사실 명제의 참·거짓은 선택 정오나 평가 모드에
따라 바꾸지 않으며, 선택–근거 충돌은 사실 명제 자체의 오류와 구분한다.

v3는 무과금 계약 검증과 표적·기존·비공개 유료 회귀를 통과하고 별도 승격 판단을 받기 전에는
운영 기본값으로 전환하지 않는다.

## 근거

신규 7문항 v2 전체 사이클과 웹앱 독립 검토에서 정답 소재만 언급한 답을 원문으로 보충해
`SUPPORTED`로 판정한 사례, 같은 학생 오류를 호출 사이에 반대로 바꾼 질문, 아직 다루지 않은
정답 선지 내용을 재선택 안내에 넣은 사례가 확인됐다. 이는 문항별 예외보다 학생 발화의 의미
범위를 보존하는 공통 원칙으로 다루는 편이 적절하다.

## 유지하는 경계

- 전체 문제 풀이 런타임은 계속 원문 직접 방식이다.
- 구조화 문제 골드를 런타임에 넣지 않는다.
- 짧지만 핵심 판단이 있는 답을 불필요하게 엄격하게 평가하지 않는다.
- 일반적인 의미 보존을 불완전한 문자열 휴리스틱으로 운영 validator에 강제하지 않는다.
- 운영 기본 프롬프트는 승격 전까지 v2다.

## 승격 조건

표적 실패 해소, 짧지만 충분한 정상 답 유지, 기존 오답 경로 무회귀, 동일 명제의 모드 간 사실
판정 일관성, 교정 대상 보존, 진단 질문 중립성, 재선택 신규 정답 정보 0건, 부분 수정의 조기
`CORRECTED` 0건을 기존 자료와 수정에 사용하지 않은 새 문항에서 확인해야 한다.

## 근거 자료

- [`v2 신규 7문항 전체 사이클`](../../docs/experiments/problem-source-direct-v2-full-cycle-seven-2026-09-11/FINAL-REPORT.md)
- [`v3 후보 프롬프트`](../../packages/pipeline/experiments/problem-solving/source-direct-problem-dialogue-prompt-v3.md)
- [`v3 회귀 계약`](../../packages/pipeline/experiments/problem-solving/source-direct-problem-dialogue-v3-regression-contract-v1.json)
