# 2026-10-22 선지 연결 v2·v3 실행과 비틂 목록 초안

- 생성기 `scripts/run-choice-link.mjs`(+test 21개). 입력: 〈보기〉 조각은 코드가 고정, 그림은 `supplement-fixed.json`으로 고정, EBSi 기반 참고 해설. 인계: `docs/handoffs/2026-10-22-choice-link-generator.md`(v1·보완 v2·v3).
- v2(`CHOICE-LINK-PROMPT-v2.md`), UI 6지문 3회, $1.99: 검증 위반 76. 정답과 어긋난 판단은 360 중 28(선지 10개). 원인은 공손룡 q12 〈보기〉 ⓐ~ⓔ 표시 누락(입력 결함)과 모델의 엄격 읽기. 보고서: `docs/experiments/choice-link-2026-10-22/REPORT-v2-run-{desktop,human}.md`.
- 사용자 "A안 동의" → [D-0162](../decisions/D-0162-choice-link-layer-direction.md) 보완 3: 정오는 정답에서 고정하고 `readingGap`으로 표시. 〈보기〉 `marks` 추가. NONE·APPLY 규칙 수정.
- v3(`CHOICE-LINK-PROMPT-v3.md`), $1.91: 위반 3(공손룡 q11②, NONE+INFER 규칙 충돌). 공손룡 q12 해결. readingGap이 NONE이 아닌 선지는 28개(다단계 추론에도 붙음). FALSE 57선지 중 NONE-only 12, 공통 대상 36, 갈림 9. 보고서: `REPORT-v3-run-{desktop,human}.md`.
- 비틂 목록 초안 `TWIST-LIST-DRAFT-v1.md`: 5갈래 14종. "대응 오류" 갈래는 APPLY로 대신하자는 제안이며, 사용자 판단을 기다린다.
- 보고 형식 [D-0163](../decisions/D-0163-two-format-task-reports.md): 실험 결과 해석·설계 판단·큰 작업 단위일 때 Desktop용과 인간용 두 파일로 보고.
- 다음: 목록 확정 → v4(14종 enum, NONE이면 inferenceBasisIds 면제, 섞인 비틂은 조각 분리) → 맞춰 보기 6지도 문항으로 검증.
