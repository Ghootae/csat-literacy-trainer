# 체크포인트: 마지막 설명 칸 유형 레이아웃 v1 채택 (2026-10-28)

- v5.3 마지막 설명 첫 칸 사용자 판정: KC·K4-r1이 "무엇이 빠졌는지" 못 말함, XS 억지, K4-r3 학생 말 그대로 인용. 원인: M4 입력의 `insufficiencyCase`(CONCLUSION_ONLY)·`insufficiencyKind`(JUDGMENT_METHOD) 충돌, 판정기 `reason` 미전달(`docs/experiments/v53-three-cell-check-2026-10-27-b/requests/KC-r1-*`).
- 사용자 제안으로 진단 글 + 칸 유형 레이아웃 지시문(풀어 쓰기, 학생 말 풀어 말하기) 설계·구현(인계 `docs/handoffs/2026-10-28-end-explanation-layout-v1.md`, executor). `readingSummary`에 `conclusionOnly`·`judgmentNote` 추가.
- 저장 판정 재사용 12건 재생성 $0.064, 사용자 판정 11/12 긍정. XS-r1은 판정(STRONGER) 문제로 남음(`docs/experiments/end-explanation-layout-2026-10-28/`).
- 채택: [D-0184](../decisions/D-0184-end-explanation-layout-v1-adopted.md). 기본값 `endLayout: 'layout-v1'`, 빌드·테스트 통과(기존 실패 2건만).
- 다음: D1 판정기 선지 읽기 관계 보강 + XS·G-B3 재확인, 서버 재빌드.
