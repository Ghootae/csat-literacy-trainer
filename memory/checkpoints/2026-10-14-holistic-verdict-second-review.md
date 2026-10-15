# 2026-10-14 문단 판정 지연 재판정과 경계 처리 계산

- 결정: [D-0132](../decisions/D-0132-paragraph-judge-keep-v4.md) 판정기 V4 유지. C1(중심 이야기 판정·축 질문)은 대비 5사례에서 경계를 못 가려 진행 안 함.
- gold-v2 30문단 모두 `centralStory`가 있고 conditional-meta-gold-v1은 같은 centralStory에서 축(L1 `description`, L2 `metaAxis`)을 다시 만든 파생 골드다(`sourceGoldHash` 30/30 일치). V4는 gold-v2를 쓴다.
- `REVIEW-SECOND.md` 33시점 블라인드 재판정 완료. 질문 필요 변경 1/33(S033 A-N14).
- 경계 처리 오프라인 계산 결과는 [REPORT](../../docs/experiments/holistic-verdict-shadow-2026-10-08/REPORT.md) "사람 판정 2회차". (나) FA 7→2지만 질문 필요 11 중 8을 보여 주기로 낮춤, (가)는 질문 불변.
- V4 SERIOUS 12개가 사람 판정으로 7:5로 갈림. 차이는 심각도 등급이 아니라 SERIOUS 안의 구분에 있다.
- Q-0033은 열린 채 유지: 사람 기준은 안정적이나 말로 정의되지 않음.
