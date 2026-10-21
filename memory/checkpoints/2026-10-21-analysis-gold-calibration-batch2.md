# 2026-10-21 분석 골드 맞춰 보기 두 묶음과 종료

- 첫 묶음(4지도, `docs/experiments/analysis-gold-calibration-2026-10-20/`): 동결 통과(4/4 "써도 됨", 회차 일치 2/4), 입장 실패(147/149, 인물 귀속 불일치 2건). 동결본·입장 확정본은 사용자 선택·검토로([D-0151](../decisions/D-0151-analysis-gold-standard-procedure.md) 보완 2). 관계 유형 v3 분류 4지도 107관계·기타 0($0.168), `classify/`.
- 점검표 v2·지도/입장 지시문 v2([D-0155](../decisions/D-0155-analysis-gold-checklist-v2-and-prompt-v2.md)), 입장 스크립트 `--prompt`·`--passages-dir`·`--stance-dir`(+테스트 2).
- 둘째 묶음(2지도, `docs/experiments/analysis-gold-calibration-2-2026-10-21/`): 지도 v2 세 회차 문장 묶음 일치 14/18문단(첫 묶음 8/21). 동결 통과(2/2, 일치 1/2; Claude는 virtual r3 1문단 문장 쪼개기를 놓침). 입장 61/62, 불일치 1건(virtual P3-6 관형절 전제) → 실패. 확인된 청구 지도 약 $0.58, 입장 $0.083. 시간 초과 1건(meaning r2) 재전송.
- 두 묶음 입장 불일치는 모두 관형절 전제에서 반대 방향. 사용자 결정으로 맞춰 보기를 끝내고 동결·입장 모두 Claude 검토로 운용([D-0158](../decisions/D-0158-analysis-gold-claude-review-without-further-calibration.md)). 입장 점검표에 "예를 들어" 예시=필자, 표지 없는 문장의 끼임/이어짐 규칙 추가.
- 다음: 학생 이해 지문(fingerprint) 집계, 다리 층.
