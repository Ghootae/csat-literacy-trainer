---
id: D-0096
status: accepted
date: 2026-10-07
scope: central-story-two-stage-external-transfer
supersedes: none
---

# 중심 이야기 두 단계 생성 실험의 외부 전송 승인

## 결정

[D-0095](./D-0095-central-story-two-stage-generation.md)의 구현과 사전 검증, Claude의 diff 검토를 마친 뒤 사용자에게 다음 범위를 명시했고, 사용자는 "승인."이라고 답했다.

- 전송 대상: 5지문 25문단의 원문(문장 번호 포함), 지문 문맥, 원본 중심 이야기, 1단계 보강 중심 이야기와 설명 단위 요약
- 목적지·모델: OpenAI API `gpt-5.6-terra`, reasoning medium
- 용도: 1단계 중심 이야기 보강과 2단계 축 생성
- 호출 수: 최대 50회(단계별 25회), 재시도 없음

이 범위에서 `node scripts/test-central-story-two-stage.mjs run D-0096`을 실행한다. 결과는 `docs/experiments/central-story-two-stage-2026-10-07/`에 보존한다.

이 승인에 포함되지 않는 것: 재시도, 추가 호출, 다른 문단, 운영 골드·UI 교체, 학생 판정 시험. 승인 기록은 실행 완료나 의미 품질 검증을 뜻하지 않는다.

## 근거

- 사용자 명시 답변 "승인."(2026-10-07)
- `docs/handoffs/2026-10-07-central-story-two-stage-generation.md`

## 완료 관측

`docs/experiments/central-story-two-stage-2026-10-07/REPORT.md`: 47회 호출, 1단계 계약 실패 3문단(재시도 없음). 성공 22문단은 48축(운영 39)이다. 세부 복원과 본론 1축 해소를 관측했고, 개관·요약 문장 축 분리와 부수 보강은 남았다. Claude 의견이며 운영에는 반영하지 않았다.
