# 문단 지시문 v4.8 검증 결과 (2026-10-28)

- 모델 gpt-6-luna, 지시문 v4.7(기준)·v4.8(후보), 첫 호출 46회(V1 20, V2 10, V3 16).
- 인계: docs/handoffs/2026-10-28-paragraph-gap-question-v48.md · 원자료: runs.jsonl, cases.json

## V1. 담은 부분 뒤집힘 (세션 d6bb304e, 5문단 AFTER_CORRECTION 입력)

| arm | 회차 | 2번 false 횟수 | 재요청 수(attempts>1) | 판정 실패 수(버려진 출력) | 오류 종료 | action 분포 |
|---|---|---|---|---|---|---|
| v4.7 | 10 | 2 | 0 | 0 | 0 | PRAISE 8, GAP_QUESTION 2 |
| v4.8 | 10 | 0 | 0 | 0 | 0 | PRAISE 10 |

## V2. 3문단 첫 요약 (INITIAL)

| arm | 회차 | category 분포 | 재요청 수 | 판정 실패 수 | 오류 종료 |
|---|---|---|---|---|---|
| v4.7 (재사용: paragraph-boundary-stability-2026-10-28) | 10 | CAPTURED 4, GAP 6 | - | 0 | 0 |
| v4.8 | 10 | CAPTURED 7, GAP 3 | 0 | 0 | 0 |

### V2 GAP 질문 (arm 가림, 섞음, 9개)

학생 요약: "세포막을 구성하는 인지질은 지방산으로 구성된 꼬리(세포막 구성)와 인산기 머리(외부 수용액 접함)로 구성.-> 친수성 물질이 세포막 투과 차단."

1. 인지질은 어떤 모습으로 배열되어 세포막을 이룰까?
2. 세포막을 이루는 인지질은 어떤 방식으로 배열되어 있어?
3. 세포막에서 인지질의 꼬리 쪽은 어떤 상태로 배열될까?
4. 인지질의 두 부분은 세포막 안에서 어떻게 배열돼?
5. 친수성 머리가 외부 수용액에 접할 때, 소수성 꼬리들은 세포막 안에서 어떻게 배열돼?
6. 인지질의 머리와 꼬리는 세포막에서 어떤 관계로 배열돼?
7. 인지질의 두 부분은 세포막에서 어떤 방식으로 배열될까?
8. 수용액에 접하는 인산기 머리와 달리, 지방산 꼬리는 세포막 안에서 어떤 상태로 모여 있어?
9. 인지질의 성질은 세포막이 어떤 구조를 이루게 해?

<details><summary>열쇠 (arm)</summary>

| 번호 | arm | run |
|---|---|---|
| 1 | v4.7 | 5 |
| 2 | v4.7 | 2 |
| 3 | v4.8 | 6 |
| 4 | v4.7 | 7 |
| 5 | v4.8 | 8 |
| 6 | v4.7 | 3 |
| 7 | v4.7 | 4 |
| 8 | v4.8 | 1 |
| 9 | v4.7 | 6 |

</details>

## V3. 저장 기록 INITIAL 8개 회귀 (v4.8 각 2회, coveredBefore null)

| 사례 | 문단 | 고른 이유 | 저장 category | v4.8 1회 | v4.8 2회 | 검증 실패로 끝난 호출 | 재요청 수 |
|---|---|---|---|---|---|---|---|
| 376db6cc/p3 | dopamine-motor-control-p3 | 직접·간접 경로를 정리한 요약이 저장 판정 CAPTURED | CAPTURED [true,true] | CAPTURED [true,true] | CAPTURED [true,true] | 0 | 0 |
| b630ebfd/p3 | information-asymmetry-free-marketplace-p3 | 짧은 이론 문단, 부분 1개 CAPTURED | CAPTURED [true] | CAPTURED [true,true] | CAPTURED [true,true] | 0 | 0 |
| 6a1601d8/p3 | gongsun-long-later-mohists-p3 | "흰말은 말이 아니다" 주장 요약 CAPTURED | CAPTURED [true,true] | CAPTURED [true] | CAPTURED [true,true] | 0 | 0 |
| b630ebfd/p1 | information-asymmetry-free-marketplace-p1 | 2번 부분이 빠진 GAP | GAP [true,false] | GAP [true,false] | GAP [false,false] | 0 | 0 |
| 9b1dbb33/p5 | surface-tension-laplace-p5 | 부분 3개, 2개가 빠진 GAP | GAP [false,true,false] | GAP [true,false] | GAP [false,true,false] | 0 | 0 |
| 6a1601d8/p5 | gongsun-long-later-mohists-p5 | 용어 나열 요약, 저장 판정 GAP | GAP [true,false] | GAP [true,false] | CAPTURED [true,true] | 0 | 0 |
| f0a8898e/p2 | dopamine-motor-control-p2 | 수용체 요약에 오류가 있다고 본 ONE_ERROR | ONE_ERROR [true,false] | ONE_ERROR [true,false] | ONE_ERROR [true,false] | 0 | 0 |
| 9b1dbb33/p3 | surface-tension-laplace-p3 | 기포 병합 요약에 오류가 있다고 본 ONE_ERROR | ONE_ERROR [false,true] | ONE_ERROR [false,true] | ONE_ERROR [false,true] | 0 | 0 |

## 비용

| 항목 | 값 |
|---|---|
| 첫 호출 | 46회 |
| 입력 토큰 | 403462 |
| 출력 토큰 | 50463 |
| 합계(입력 $0.10, 출력 $0.50 per 1M) | $0.0656 (상한 $0.5) |
