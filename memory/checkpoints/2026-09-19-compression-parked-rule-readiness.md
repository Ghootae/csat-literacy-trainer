# 압축 측정 보류 및 새 판정 규칙 구현 준비도 확인

## 이번 delta

- 사용자 요청으로 청킹·압축 측정 및 피드백을 D-0012에 보류 기록했다.
  현재 논의는 새 문단 판정 규칙으로 한정한다.
- 구현 준비도는 읽기 전용으로 확인했다. 현재 1차는 축별 captured/partial/unknown/distorted와
  누적 effectiveResponse를 반환하지만 OK/SERIOUS 구분·축별 공개 텍스트 계약은 없다.
  출처: `packages/pipeline/src/dialogue-experiment/gate.ts`,
  `packages/pipeline/src/dialogue-experiment/schema.ts`.
- 비통과면 2차 질문 호출로 연결되는 구조다. OK에서 사용자가 보완을 선택하는 흐름은 별도 설계가
  필요하다. 출처: `packages/pipeline/src/dialogue-experiment/two-stage-evaluator.ts`.
- 현재 서버의 문단 navigate 자체는 PASS를 요구하지 않지만 전체 완료 상태 및 문제 handoff는
  모든 문단 PASS를 요구한다. 따라서 화면 버튼만 추가해서 새 진행 정책이 완성되지는 않는다.
  출처: `packages/app/src/server/dialogue.ts`의 navigate/view/createProblemHandoff.
- 코드·프롬프트·운영·골드는 변경하지 않았고 유료 API 호출도 하지 않았다.
