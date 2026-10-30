# 체크포인트: 19번 ⑤ P1 DeepSeek Pro·Flash 판정 비교 (2026-10-30)

- 목적: sol이 luna보다 어려운 정답 근거를 잘 잡는다(P1 sol 4/10, luna 0/5). 이 판단을 DeepSeek으로 싸게 얻을 수 있는지 확인. 가격은 공식 가격표로 확인(sol $2/$10, Pro 피크 $1.32/$3.96·비피크 절반, 사용자가 가져온 검색 자료의 "GPT-5.6 Sol $4/$20"은 다른 모델·Fast 등급 가격).
- 실행: `scripts/run-v58-deepseek-p1.mjs`, 결과 `docs/experiments/v58-conclusion-2026-10-29/deepseek/`, Pro·Flash high 각 16세션, $0.73, 모두 비피크. 그림(MEDIA1)은 텍스트 설명으로 대체(사용자 승인).
- 결과: P1 SUPPORTED Pro 3/10, Flash 0/10. Pro 출력 약 15k 토큰, 지연 중앙 173초. 피크 환산 세션당 약 $0.074로 sol($0.051)보다 비쌈.
- 새 관찰: N2("전하가 없으니까 극성도 없어짐")를 Pro가 2/3 ERROR(극성 정의와 어긋남)로 판정, sol·Flash는 6/6 INSUFFICIENT. Q-0041로 열어 둠.
- 사용자 결정: 구성 유지·DeepSeek 종결([D-0192](../decisions/D-0192-keep-luna-sol-over-deepseek-pro.md)). N2 판정은 미결정.
