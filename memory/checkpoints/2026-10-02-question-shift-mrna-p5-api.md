---
date: 2026-10-02
scope: question-shift-axis-pilot
base_commit: uncommitted
---

# 중심 질문 전환 기준 mRNA5 단회 API 시험

## 새로 확인된 것

- 사용자 요청으로 mRNA5 원문만 입력한 실제 API 시험을 실행했다. 기존 축·중심 이야기·목표 축 수·예시를 제공하지 않았다.
- gpt-5.6-terra medium 성공 응답1회는 4개 청크/축을 생성했다. 첫 경계는 “내포 작용이란…” 앞, 나머지는 엔도솜 산성화 문장과 방출된 mRNA 작용 문장 앞이다. 원문 범위는 공백 제외 복원 검사 통과.
- 입력719·출력866토큰. 최초 sandbox DNS 실패는 API 미도달로 보존하고 네트워크 권한 실행으로 완료했다. SDK 재시도0.
- 근거: `docs/experiments/question-shift-mrna-p5-2026-10-02/request.json`, `response.json`, `result.json`, `audit.json`, `REVIEW.md`(동일 디렉터리).

## 결정된 것

- 사용자 승인 범위는 현재 문단 단회 시험이다. 4축 채택·일반화·운영 승격 결정 없음.

## 변경한 것

- 실행 스크립트 `scripts/test-question-shift-mrna-p5.mjs` 및 실험 기록을 추가했다. 기존 골드·UI 유지.

## 미해결

- Q-0031 유지. 4축 경계의 적절성·반복 안정성·학생 판정 효과는 미검증이다.

## 다음 행동

- 사용자가 실제 생성한 4축과 원문 경계를 검토한다.

## 근거

- `docs/experiments/question-shift-mrna-p5-2026-10-02/REVIEW.md`
- `scripts/test-question-shift-mrna-p5.mjs`

## 사용자 요청 후속 — 두 보조 지시 삭제

- 사용자가 요청한 두 문장만 삭제하고 입력·모델·설정을 유지하여 API 성공1회·재시도0 실행했다. 3축(복합체 형성 / 진입·엔도솜 형성 / 방출·면역)을 생성했다. 첫 경계는 “이 복합체는…” 앞의 문장 내부다. 공백 제외 원문 복원 통과. 입력674·출력787토큰.
- 근거: `docs/experiments/question-shift-mrna-p5-no-helpers-2026-10-02/REVIEW.md`, `request.json`, `response.json`, `audit.json`(동일 디렉터리), `scripts/test-question-shift-mrna-p5-without-helpers.mjs`.
- 이전4축/이번3축 차이는 관측이며 단회 비교로 지시 삭제의 인과 효과를 확정하지 않는다. 골드 채택 없음.
