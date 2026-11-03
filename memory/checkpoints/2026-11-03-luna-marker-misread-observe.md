# 체크포인트: luna 기호 오독 빈도 집계와 관찰 결정 (2026-11-03)

- 저장 기록 luna 출력 2179개(중복 제거 1665) 중 후보 228, 확정 오독 6건(모두 공손룡 ⓓ, 실질 3·혼동 2·라벨 실수 1), 학생 노출 1건(10-22 S2-r3). 기호 정답표 `docs/experiments/luna-marker-misread-count-2026-11-03/MARKER-KEY.md`(사용자 확인). 판정: sonnet 1차 → opus 재판정 → 코드 에이전트 원문 확인.
- v5.8 표적 재현(`scripts/run-luna-marker-misread-repro.mjs`, 20회 $0.051): 판정 20/20 맞음, 오독 2/20(S2-r3·G2-r1 reason), 학생 노출 0.
- 두 세션 마지막 설명(`scripts/run-luna-marker-misread-end.mjs`, 6회 $0.0068): 오독 0, 흔적 1문단.
- 결정 [D-0197](../decisions/D-0197-luna-marker-misread-observe.md): 관찰로 남김. 보고서 `docs/experiments/luna-marker-misread-count-2026-11-03/REPORT-human.md`·`REPORT-desktop.md`.
- 사용자 요청(나중): gpt-6.1-terra를 sol 대신 쓰는 시험, S2 기호 조건 포함.
