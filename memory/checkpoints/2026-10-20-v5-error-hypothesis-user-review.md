# v5 오류 가설 구현과 반자동 사용자 시험 (2026-10-19~20)

## 바뀐 것

- 오답 첫 선택에서 명시 오류가 없으면 오류 가설을 세우고 추정 오류(INFERRED)로 질문한다([D-0150](../decisions/D-0150-error-hypothesis-first-for-wrong-choice.md), [인계](../../docs/handoffs/2026-10-19-v5-error-hypothesis-first.md)). executor 구현, Claude diff 검토와 지시문 충돌 문장 1곳 보정.
- 수형도 두 개를 만들었다: [지금 코드](https://claude.ai/artifact/QGymVjnZQRTTvW3E6aAzsm), [설계안 반영 후](https://claude.ai/artifact/HQBEuno92vPqCd1voLjXLA). 경로 83개, 기호는 경로를 이은 것.
- 반자동 사용자 시험 방식(사용자 결정 2026-10-19): Claude가 학생 응답을 쓰고 실제 모델로 돌린 뒤, 경로별 터미널 형식으로 보여 주고 사용자가 단계마다 적절/고칠 점 있음/부적절로 판정. 기록은 실험 폴더 REVIEW.md, 고칠 점은 UI 메모장으로 요약.

## 결과

- [판정 기록](../../docs/experiments/v5-hypothesis-user-2026-10-19/REVIEW.md): 27단계 중 적절 23, 고칠 점 4, 부적절 0. 판정·질문·안내 15/15 적절. 고칠 점은 모두 마지막 설명 문체.
- 대조군 6개 중 5개 이전과 같음. V-S는 가설 질문으로 바뀌었고 사용자 판정 적절.
- 비용 0.60달러(시험 0.36, 대조군 0.24).

## 다음

- UI 메모장 27번(설명 문체) [설계안](../../docs/handoffs/2026-10-20-v5-end-explanation-style.md) 사용자 검토 → 구현 → 같은 방식 재시험.
- UI 메모장 20번(첫 문장 적절/부적절)에 사용자 수정안 두 문장을 더했다. 남은 질문 1~3 논의.
- 커밋 전(21·22·26번 변경 포함).
