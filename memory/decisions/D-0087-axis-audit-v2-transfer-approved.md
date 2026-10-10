---
id: D-0087
status: accepted
date: 2026-10-06
scope: axis-audit-v2-min-two-external-transfer
supersedes: none
---

# 감사기 v2 시험의 원문·축 외부 전송 승인

## 결정

[D-0086](./D-0086-auditor-min-two-axes-and-merge-contract.md)의 준비를 마친 뒤, 사용자에게 다음 범위를 명시하고 승인을 요청했다. 사용자는 "승인"이라고 답했다.

- 전송 대상: 5지문 25문단의 원문(지문 문맥 포함)과 v1 자동 병합 후 L1/L2 60축
- 목적지·모델: OpenAI API `gpt-5.6-terra`, reasoning medium
- 용도: 감사기 v2의 감사·수정
- 호출 수: 최대 25회, 재시도 없음

이 범위에서 `node scripts/test-axis-audit-v2.mjs run D-0087`을 실행한다. 결과는 `docs/experiments/axis-audit-v2-min-two-2026-10-06/`에 보존한다. 재시도, 추가 호출, JEV·L1·L2 재생성, 운영 골드·UI 교체, 학생 판정 시험은 이 승인에 포함되지 않는다. 승인 기록은 실행 완료나 의미 품질 검증을 뜻하지 않는다.

## 근거

- 사용자 명시 답변 "승인."(2026-10-06)
- `docs/experiments/axis-audit-v2-min-two-2026-10-06/PLAN.md`

## 완료 관측

`docs/experiments/axis-audit-v2-min-two-2026-10-06/REPORT.md`: 25회 모두 성공, 계약 위반 0. 60→v2 56축(v1 46), 추가 병합 1·삭제 3. 과병합 사례는 해소됐지만 최소 2축으로 연결 축이 남았고 도파민2 D1 대비는 미해결이다. Claude 의견이며 사람 판정이 아니다. 운영에는 반영하지 않았다.
