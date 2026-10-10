---
id: D-0098
status: accepted
date: 2026-10-07
scope: central-story-two-stage-v2-external-transfer
supersedes: none
---

# 두 단계 생성 v2 실험의 외부 전송 승인

## 결정

사용자가 "승인"이라고 한 뒤, Claude는 다음 범위를 명시해 그 승인이 이 범위의 전송 승인인지 다시 물었다. 사용자는 "맞다."라고 답했다.

- 전송 대상: 5지문 25문단 원문(문장 번호), 지문 문맥, 원본 중심 이야기, 1단계 보강본과 설명 단위 요약
- 목적지·모델: OpenAI API `gpt-5.6-terra`, reasoning medium
- 용도: [D-0097](./D-0097-central-story-two-stage-v2.md) 두 단계 생성 v2(1단계 보강, 2단계 축 생성)
- 호출 수: 최대 50회, 재시도 없음
- 실행 조건: Codex 구현이 Claude diff 검토를 통과한 뒤 실행한다. 이 조건은 충족됐다(`docs/handoffs/2026-10-07-central-story-two-stage-v2.md`의 Claude 검토 절).

이 범위에서 `node scripts/test-central-story-two-stage-v2.mjs run D-0098`을 실행한다. 이 승인에 포함되지 않는 것: 재시도, 추가 호출, 운영 골드·UI 교체, 학생 판정 시험.

## 근거

- 사용자 답변 "승인"과 범위 확인 답변 "맞다."(2026-10-07)

## 완료 관측

`docs/experiments/central-story-two-stage-v2-2026-10-07/REPORT.md`: 49회 호출, 1단계 실패 1문단(법인2). 성공 24문단 44축, 1축 10문단. 사람 판정 4건 중 3건 일치(정보 비대칭2 불일치). 도입 문단 뭉침(도파민1·정보 비대칭1)과 원리·적용 합침(정보 비대칭3)이 새로 관측됐다. Claude 의견이며 운영에는 반영하지 않았다.
