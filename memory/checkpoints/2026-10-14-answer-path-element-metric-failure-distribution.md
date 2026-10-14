# 2026-10-14 요소 지표를 실패 분포로 변경

- 사용자 확인: 정답이면 정답 선지 노드·요소 전부 성공, 오답이면 고른 오답 선지에서 오류가 드러난 노드 하나의 요소만 실패. 따라서 요소별 성공 횟수는 정답 수의 재표현이라는 지적.
- 결정 [D-0126](../decisions/D-0126-answer-path-element-metric-failure-distribution.md): 리포트 요소 지표는 오답의 요소별 실패 분포만 보이고, 요소별 성공·실패 비율은 쓰지 않는다.
- 변경: `docs/review/answer-path-element-vocabulary-v0-2026-10-13.md` v0.1 누적 지표 표("요소별 실패 분포" 행 + 설명), v0 표 해당 행에 폐기 표시.
- 샘플 리포트: 서윤 리포트 version 2(https://claude.ai/artifact/NzJgstQeGYcYHqTSvE3fe5) 요소 표를 실패 분포 막대로 교체. 민서 리포트에는 요소 표가 없어 변경 없음.
- 남은 것: 노출 기준 요소별 실패율은 문항 지도 확대·외부 선택률 기준 이후 재검토.
