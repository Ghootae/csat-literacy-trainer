# 볼록렌즈 ITEM Source Bundle v2 실행 준비

## 현재 상태

- v2 ITEM 생성·독립 판독·비교 감사 프롬프트: 구현 완료
- v2 Structured Output 및 정적 검증: 구현 완료
- Responses API 실행기: 구현 완료
- 역관계 변이와 이원화 채점: 구현 완료
- 무료 dry-run: 통과
- 실제 API 호출: **1회** (첫 실행은 entity 상태 계약 위반으로 안전 중단)
- 기존 골드 변경: **0건**

첫 실행에서 핵심 비율 두 개는 정확히 추출했지만 일부 entity를 감사 전에 `VERIFIED`로 표시해
후속 호출 없이 중단됐다. 해당 원시 응답과 사용량은 `failures/`에 그대로 보존한다.

보완된 생성·독립 판독 스키마에서는 entity status가
`EVIDENCE_GROUNDED_CANDIDATE` 하나로 제한된다. 이후 유료 실행은 `paid-runs/` 아래의 고유 실행
디렉터리에 저장되어 이전 실행 기록을 덮어쓰지 않는다.

## 핵심 계약

비율은 다음처럼 좌변과 우변을 명시한다.

```text
leftQuantityId = coefficient × rightQuantityId
```

볼록렌즈의 목표 Source Relation은 다음 두 개다.

```text
distance(P0,axis) = 2 × distance(P1,axis)
distance(P0,axis) = 0.5 × distance(P2,axis)
```

발문은 `ITEM_DIRECTIVE`로 분리되어 과학적 claim 생성에서 제외된다. 그림 전체는 `FIG1`로
고정하고, 그림 내부 객체·라벨·관계는 artifact별 `FIG1-V#` 후보로 제출한다. 감사기는 모든
claim과 모든 시각 후보를 정확히 한 번씩 검토해야 한다.

## 정상 완주 호출 계획

| 번호 | 단계 | effort |
|---:|---|---|
| 1 | ITEM 생성 | medium |
| 2 | 독립 판독 | medium |
| 3 | 생성 후보 비교 감사 | medium |
| 4 | 독립 판독 | high |
| 5 | 생성 후보 비교 감사 | high |
| 6 | 반대 방향 대조 후보 비교 감사 | medium |
| 7 | 반대 방향 대조 후보 비교 감사 | high |

생성 결과가 정상 방향이면 마지막 두 호출에는 역관계 후보를 넣고, 생성 결과가 역방향이면
정상 방향으로 교정한 대조 후보를 넣는다. 어느 경우에도 API 입력에는 후보의 정상·오류 여부와
기대 판정을 전달하지 않는다. 생성기가 핵심 비율을 틀렸다는 이유만으로 실험을 중단하지 않는다.
자동 재시도는 없다.

P0/P2의 단일 0.5 비율 관계 자체를 찾지 못한 경우에도 생성 후보 감사는 계속하며, 마지막 두
호출에는 코드가 만든 고정 정상 대조 후보를 사용한다. 이 분기도 private manifest에만 기록한다.

## 변이 채점

- 의미 검출 성공: `REPAIR_REQUIRED` 또는 `BLOCKING`이면서 `issueClass=DIRECTION`
- 안전 차단 성공: `productionEligible=false`
- `UNRESOLVED`: 의미 검출 실패, 안전 차단 성공

정상 후보가 모든 품질 게이트를 통과하더라도 탐색 artifact이므로 실제
`productionEligible`은 false다. 별도로 `wouldBeProductionEligible`만 계산한다.

## dry-run 결과

- 최대 호출 수: 7
- 자동 재시도: 0
- 전체 출력 토큰 상한: 51,000
- 예상 입력 토큰 계획 상한: 약 169,000
- 캐시 쓰기 최고 단가까지 적용한 예상 계획 비용: 약 $1.03
- 기존 첫 실행 비용: 약 $0.0692
- 기존 실행과 재실행을 합친 예상 비용: 약 $1.10
- 승인 예산 상한: $2.00
- 원문·그림 해시: 통과
- 정답·공식 해설·기존 골드 누출 검사: 통과
- 잘못된 approval ID 차단: 확인

후속 감사 입력은 앞선 API 출력에 따라 달라지므로 dry-run 해시는 실제 요청 해시가 아니라
projection 해시다. 실제 입력이 완성되면 각 호출 직전에 실제 요청 해시와 이전 artifact 해시,
조건 분기, 호출 최대 비용을 기록한다.

비용 값은 결제 시스템의 거래 한도가 아니라 프로젝트 코드의 보수적 차단값이다. 각 호출 전에
`누적 실제 비용 + 실제 입력의 캐시 쓰기 최고 비용 + max_output_tokens 비용`을 계산하고 $2를
넘을 가능성이 있으면 요청을 보내지 않는다. 누적 실제 비용에는 첫 실패 호출의 $0.0691805도
포함된다. 모든 호출은 `service_tier: default`를 사용한다.

## 실행 경계

기본 명령은 무료 dry-run만 수행한다.

```bash
npm run problem-source:item-v2
```

`--execute`와 현재 계획 해시에 결합된 승인 ID가 모두 있어야 유료 호출 경로가 열린다. 계획에는
원문·그림·Source Unit·프롬프트·스키마·실행기·모델·호출 그래프·가격표·예산이 포함되며 API 키는
포함되지 않는다. 이 중 하나가 바뀌면 승인 ID도 바뀐다.

현재 계획 해시는 dry-run의 `approval-plan.json`에서 확인한다. 실제 유료 실행은 이번 보완 구현
승인에 포함되지 않았으며, 갱신된 dry-run을 검토한 뒤 별도로 승인받아야 한다.
