---
id: D-0102
status: accepted
date: 2026-10-08
scope: holistic-verdict-shadow-1st-external-transfer
supersedes: none
---

# 문단 전체 판정 그림자 실험 1차 외부 전송 승인

## 결정

[D-0101](./D-0101-holistic-verdict-shadow-experiment.md)의 구현을 Codex가 마치고 Claude가 검토했다. 그 뒤 사용자에게 다음 범위를 명시했고, 사용자는 "승인"이라고 답했다.

- **전송 대상:**
  - 6개 지문의 원문 전체(지문 맥락)
  - 실데이터 학생 발화 72시점(개발자 1인)
  - 학생이 받은 V4 질문 원문
  - 탐침 응답 13개
  - gold-v2 축 설명(H1 참조 해석, 축 귀속, 탐침 V4 입력)
- **목적지·모델:** OpenAI API `gpt-5.6-terra`, reasoning medium
- **호출:** 그림자 170 + 탐침 V4 13 + 축 귀속 최대 170 = 최대 353회, 재시도 없음
- **예상 비용:** 약 $3~4(상한)

이 범위에서 `node scripts/test-holistic-verdict-shadow.mjs run D-0102`를 실행한다.

이 승인에 포함되지 않는 것: 그림자 2·3회차, 갈린 시점의 V4 추가 실행, 재시도, 운영·UI 변경.

## 근거

- 사용자 명시 답변 "승인"(2026-10-08)

## 완료 관측

`docs/experiments/holistic-verdict-shadow-2026-10-08/REPORT.md`:

- **호출:** 220회(그림자 170, 탐침 V4 13, 축 귀속 37). 계약 실패 0건, 약 $1.54.
- **실데이터 최초 45시점 갈림:** H0 3개, H1 5개
- **탐침:**
  - 오류 3개는 모두 잡았다.
  - FA 감소는 2개로, 기준인 4개에 못 미쳐 "뚜렷하다" 조건을 충족하지 않는다.
  - 그림자는 사람이 "미확인, 질문 필요"로 본 탐침 2개를 통과시켰다.
- **사람 판정 대기:** 20시점. V4 ERROR를 그림자가 해결로 본 2시점(A-N16 H0, A-N33 H1)이 포함된다.
