# 2026-10-13 정답 경로 오답 지표 시험 결과

- Claude가 근거 있는 가상 오답 20개와 라벨을 만들고(라벨은 채점 후 공개), Codex가 동결 지도(파일럿 2차)로 독립 2회 채점. 보고: `docs/experiments/answer-path-wrong-cases-2026-10-13/REPORT.md`.
- 라벨 대비 각 18/20(실패 종류·노드·요소까지), r1 대 r2 19/20.
- 불일치: W10은 라벨 오류(근거 없는 부정 → 근거 없음이 규칙상 맞음). X6은 실제 경계(지문과 어긋나는 일반화가 READ 오독인지 LINK 결합 오류인지) → r1 미확정, r2 READ.
- 후속: 명시적 오진술 우선 귀속 채택([D-0123](../decisions/D-0123-answer-path-explicit-misstatement-priority.md)). 노드 요소와 실제 오류 성격 불일치(W8)는 [D-0124](../decisions/D-0124-answer-path-element-override-on-evidence.md) C안 채택.
