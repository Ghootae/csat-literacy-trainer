# V4-light 최소 출력 대조 준비

- 현재 V4와 V4-light를 자연 응답45시점에서 같은 조건으로 비교하는90호출 계획을 동결했다.
- 후보는 `effectiveResponse`와 축별 `status`·`reason`만 출력한다. 운영 코드와 공개 서버는 변경하지 않았다.
- 실험 프롬프트: `packages/pipeline/experiments/dialogue/v4-light-judgment-prompt-v1.md`
- 실행기: `scripts/test-v4-light-output.mjs`
- 계획·상태·동결 manifest: `docs/experiments/v4-light-output-v1-2026-09-22/`
- 준비·구문 검사는 통과했다. 외부 API 호출은 안전 검토에서 중단되어0회, 비용0이다.
- 재개 조건: 실제 사용자 응답·원문·축·과거 대화·공개 도움을 OpenAI Responses API의 gpt-5.6-terra로 `store:false`, 최대90호출·USD2 로컬 추정 상한으로 전송하는 데 대한 명시적 승인.
