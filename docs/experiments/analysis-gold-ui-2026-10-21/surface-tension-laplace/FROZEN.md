# 동결 지도와 입장

- 지도: `frozen-map.json` = `runs/map-r2.json` 사본(수정 없음), sha256 `738aa0394cde08f9f81b9bfa68a8d464260bfee361cba61b4af114d07a70dfa4`. 지도 지시문 v2(D-0155). 동결 2026-10-21, Claude 점검표 v2 선택(D-0158).
- 선택 이유: 갈린 곳은 최상위와 5문단. 최상위에서 원리(1문단) | 적용(폐포·기포, 2·3문단) | 실생활 사례 잉크젯(4~6문단)으로 셋을 가른 회차는 r2뿐이다(r1·r3은 원리를 적용 사례와 한 묶음). 5문단은 한계·오네소르게 수 정의 | 결정 요인 | "따라서" 조절(r1 같음; r3은 결론을 결정 요인과 한 묶음). "따라서" 근거 관계(C5-3→P5-7) 있음.
- 관찰: P5-4가 점도 정의와 "끈적할수록 크다"를 한 명제로 합침.
- 입장: `stance/stance.json`(sol 1회, STANCE-PROMPT-v2, 검증 통과). 확정본 `stance/stance-final.json`은 Claude 점검표 v2 검토(덮어쓰기 0), 2026-10-21(D-0158).
- 관계 유형: `../classify/surface-tension-laplace/classify.json`(CLASSIFY-PROMPT-v3, sol medium 1회, 검증 통과, 35개, 기타 0), 2026-10-21.
