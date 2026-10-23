# 마지막 설명 좌표 비교 실험 실행 (2026-10-23)

- D-0167(+보완 1): v5 회귀 42세션(오답 30 sol, 정답·근거 약함 12 luna). BASE는 저장 출력 재사용(D-0168, 사용자 지적 뒤 규칙화), LINK 42요청만 전송(사용자 "승인").
- 결과: 41 파싱, I-B3 1건 503(재시도 0), 실비 $0.578. 자동 점검 위반 0.
- Claude 블라인드 판정(열쇠 열기 전 `run/CLAUDE-BLIND-JUDGMENT.json` 기록): LINK 우세 35·BASE 1·비슷 5. 단정 0. 원문 오류 1(S-CP LINK luna "점도에 비례"). LINK의 "어떻게 바꿨나+걸러내는 법" 문장 34/41이 조건을 드러내 블라인드 약함.
- 사용자 6쌍(`run/USER-PAIRS.md`: C-A3, D-B1, G-CT, I-B2, M-B3, S-A1) 판정 대기.
- 근거: `docs/experiments/choice-link-end-explanation-compare-2026-10-23/REPORT-desktop.md`, `REPORT-human.md`.
- 사용자 6쌍(2026-10-23): "쌍20은 비슷. 나머진 모두 Y가 조금 나아." → LINK 2·BASE 3·비슷 1, Claude 일치 2/6. Claude의 LINK 우세는 확인되지 않음. 잠정: 차이 작음, 운영 반영 근거 없음(D-0167 5항).
- 사용자 41쌍(이해 용이성): LINK 20·BASE 18·비슷 3, Claude 일치 20/41. 결론: 좌표 운영 미반영(D-0167 결과). 판정 이유는 문단·결론 닫기·간결함 등 서술 품질.
