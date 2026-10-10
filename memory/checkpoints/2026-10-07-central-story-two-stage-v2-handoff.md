---
date: 2026-10-07
scope: central-story-two-stage-v2-handoff
base_commit: uncommitted
---

# 두 단계 생성 v2 결정과 인계

사용자 판정 4건(표면 장력3·정보 비대칭2는 1축 적당, 도파민4 AX1·표면 장력6 AX2는 잉여)과 승인("그 방향대로 진행")에 따라 [D-0097](../decisions/D-0097-central-story-two-stage-v2.md)을 기록했다.

- 1단계만 바꾼다.
  - CONNECTIVE에 개관·요약 문장을 넣는다. 불확실하면 설명 단위로 두는 기본값은 유지한다.
  - CONNECTIVE 내용과 부수 정의는 보충하지 않는다. 근거 인용이 CONNECTIVE 문장에만 있으면 코드가 위반으로 잡는다.
  - 1단계 출력에서 centralStory 필드를 없앤다.
- 2단계, 덧붙이기 검사, 최소 축 수 계산은 그대로다. 25문단 전체를 다시 생성하고, v1 결과는 보존한다.
- 인계 문서: `docs/handoffs/2026-10-07-central-story-two-stage-v2.md`(1단계 지침 v2 전문 포함). Codex가 구현과 API 없는 사전 검증을 하고 Claude가 검토한 뒤, 실행에는 별도 전송 승인을 받는다.

## Codex 실행과 Claude 검토

- Codex가 구현과 API 없는 사전 검증을 마쳤다. 만든 것은 `scripts/test-central-story-two-stage-v2.mjs`, `docs/experiments/central-story-two-stage-v2-2026-10-07/`의 prepare 산출물, 계약 모듈과 테스트에 추가한 v2 코드다.
- Claude 재검증: 계약 테스트와 prepare 재현, `run` 거부 3/3, 1단계 지침 원문 일치, 2단계 지침 v1과 바이트 동일, 보호 파일 1,876개 불변.
- Claude가 인계 설계의 빈틈을 고쳤다. 근거 인용이 두 문장에 걸치면 거부되던 것을, 연속된 설명 단위 문장 구간 안이면 허용하도록 바꿨다(v1 도파민1 사례). 수정 후 테스트 22/22·전체 108/108이다.
- v1 1단계 출력을 v2 계약으로 재검사하면 24/25가 통과하고, 표면 장력1만 위반이다. 실행은 전송 승인 확인을 기다린다.
