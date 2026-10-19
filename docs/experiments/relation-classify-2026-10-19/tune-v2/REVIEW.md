# tune-v2 검토 (Claude, 2026-10-19)

실행: 지시문 v2(`../CLASSIFY-PROMPT-v2.md`), 같은 16지문 지도 r1, 관계 532개, 16요청 모두 검증 통과, 실제 청구 $0.7640, 보호 파일 해시 불변(`RUN.json`). 실행은 Claude가 `main({ promptPath, limits: { maxRequests: 16, usdCap: 1.2 } })`로 직접 했다. dry-run 산출물은 `../dry-run-v2/`.

## v1 대비

- 같은 유형 478, 바뀐 유형 54(10.2%).
- `OTHER` 3건(0.6%): 성격의 병렬(joseon R35), 실천의 병행(joseon R38), 작동 방식의 공통성(diffusion R18).

## 겨냥한 수정 (`../tune-v1/REVIEW.md`의 1~3)

모두 의도대로 바뀌었다(17건).
- 문제·대응 → 근거·도출 7건(gongsun R5, corporate R22, information-asymmetry R19~R21, laozi R15·R35).
- 공통·수용 → 인과·작용 2건(fear-appeal R21·R22), → 원리 적용 3건(information-asymmetry R16, neoclassicism R8·R12), → 구체화·예시 3건(neoclassicism R6·R19·R27).
- 수단·목적 → 과정·순서 2건(diffusion R11·R19).

## 겨냥하지 않은 변화 (37건)

같은 입력에서도 경계가 모호한 관계는 실행마다 바뀐다(실행 간 흔들림). Claude 판단: 나아짐 약 10, 비슷함(둘 다 가능) 약 20, 나빠짐 약 7.
- 나빠짐 예: dopamine R18 인과→전개·전환, blockchain R25 원리 적용→분류·구성, laozi R28 해석·평가→양보·한계, joseon R40 인과→과정·순서, diffusion R18 정의(재진술)→기타, information-asymmetry R30 배경→근거.
- 따라서 v1→v2 순이익은 분명하지만, 약 7%의 관계는 실행마다 유형이 흔들린다. 검증 단계의 지도 간 분포 안정성 해석에 이 바닥값을 쓴다.

## 새 유형 후보 (채택 안 함, 관찰)

- **병렬·나열**: 같은 대상의 두 성격·두 활동을 같은 층위에서 나란히 놓는 관계(joseon R35·R38). v1에서는 분류·구성, 전개·전환으로 억지 배정됐다. 기타 비율이 0.6%라 지금은 더하지 않고, 검증 지문에서 다시 나오면 더한다.

## 결론

v2를 고정해 검증 단계에 그대로 쓴다. 남은 오류는 계통적 오류보다 경계 모호성이며, 지시문을 더 고쳐 16지문에 맞추면 과적합 위험이 크다.
