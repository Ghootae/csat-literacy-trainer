---
date: 2026-10-07
scope: central-story-two-stage-v3-handoff
base_commit: uncommitted
---

# 두 단계 생성 v3 결정과 인계

사용자 결정("도입 문단 면제 없애는 방향으로 진행", 정리 문단도 포함하자는 권고에 "권고대로 진행", 4문단 재실행 범위에 "승인")에 따라 [D-0099](../decisions/D-0099-central-story-two-stage-v3-no-role-exemption.md)를 기록했다.

- 최소 축 수는 설명 단위가 2개 이상이면 2다. 문단 기능 면제는 없앴다.
- v2 1단계 결과를 재사용한다. v2 결과로 계산하면 최소 축 수가 바뀌는 문단은 법인1·도파민1·정보 비대칭1·표면 장력1(모두 도입)이며, 이 4문단만 2단계를 다시 부른다(최대 4회). 나머지 20문단은 v2 결과를 그대로 쓴다.
- 인계 문서: `docs/handoffs/2026-10-07-central-story-two-stage-v3.md`. 전송 승인은 검토 뒤 따로 받는다.

## Codex 실행과 Claude 검토 (2026-10-08)

- Codex가 v3 스크립트, 계약 함수 추가(`minimumAxesV3`·`stage2InputForV3`), prepare 산출물을 만들었다. 대상은 정확히 4문단이다.
- Claude 재검증: 테스트 136/136, v2·v3 prepare 통과, `run` 거부 3/3, 대상 요청은 v2와 `minimumAxes`만 다름, 보호 파일 2,107개 불변. 실행은 전송 승인을 기다린다.
