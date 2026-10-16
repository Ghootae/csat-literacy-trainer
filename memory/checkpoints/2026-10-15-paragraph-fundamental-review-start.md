# 2026-10-15 문단 요약 근본 검토 시작

- 사용자: 모든 단계의 대충함이 누적돼 해결이 어려움 → 목표(핵심 포착 확인, 못 잡으면 질문으로 자기 교정)에서 다시 검토. 가설: 문단에 최적 축 구조가 있다는 전제가 무리. → [D-0138](../decisions/D-0138-paragraph-fundamental-review-question-quality-first.md)
- 확인: 사용자 제안 형식(전체 판정 + 가장 큰 구멍 하나 질문)은 H0와 같다. H0 요청에 축·centralStory 없음, 질문도 같은 호출에서 생성. 33시점 판정은 V4와 비슷(질문 15/17, 불필요 6/7, 놓침 2/1).
- Claude 정정: 처음 권고한 "33시점에 단순 형식 새 실행"은 이미 한 시험이라 철회.
- 질문 비교 묶음 생성(API 0): [README](../../docs/experiments/question-quality-h0-vs-v4-2026-10-15/README.md), 10쌍, A/B 5:5.
- 보여 주기 개발자 모드 구현 중지. 다음: 사용자 블라인드 판정, 결과 읽는 규칙 확정.
- 질문 비교 결과([RESULTS](../../docs/experiments/question-quality-h0-vs-v4-2026-10-15/RESULTS.md)): 선택 H0 4·V4 6(Q07 근소), Q01~05 적절성 합 16 대 16, 누출 중간 이상 H0 2·V4 3. 사전 제안 규칙 첫 조건 미충족 → 원인 논의 갈래. H0 패배 원인은 누출·반복·겹질문, V4는 지엽·애매. "전체를 아우르는 질문" 선호는 2:2.
- 사용자 동의 → [D-0139](../decisions/D-0139-paragraph-simple-format-question-rules.md): 단순 형식+질문 규칙 4, 새 응답 검증 뒤 채택. 다음: 새 응답 확보 방법.
- 정정(2026-10-16): 비교한 기존 질문 중 A 5쌍은 V2 질문 프롬프트 생성. V2·V4 묶음 모두 H0 2 대 기존 3.
- 연결 조사(2026-10-16): 문제 풀이 v5는 골드·문단 판정 미사용(교정 질문 미색 표시도 판정 모델의 원문 인용). 축 구조에 묶인 곳은 문단 판정과 학생 상태 모델뿐. 결함 2건과 분석 자료 문제는 Q-0037.
- [D-0140](../decisions/D-0140-paragraph-simple-holistic-dev-mode.md): 검증 방식을 사용자 직접 사용감 기록으로. 흐름·말투·메모 확정, 프롬프트 v1과 [인계](../../docs/handoffs/2026-10-16-paragraph-simple-holistic-dev-mode.md) 작성.
- 구현(executor)·Claude 검토 완료: 새 테스트 58/58, typecheck·build 통과, 전체 vitest 기존 실패 2(boundary student-state.ts, axis-architecture ENOENT) 무관. 검토 중 보완 1건: 구멍 질문 뒤 무관·복사 답으로 CLOSE_GAP이면 물었던 빈 곳을 표시(targetGap). 화면 미확인.
