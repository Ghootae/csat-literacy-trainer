# 볼록렌즈 Passage Source Bundle v2 준비

## 현재 상태 (2026-09-03 통합 실행 후)

- Passage v2 생성·감사·부분 수리 계약 구현 완료
- 볼록렌즈 지문을 28개 고정 Source Unit과 4개 문단 감사 chunk로 분리
- API 입력에서 그림, 발문, 보기, 선지, 정답, 공식 해설, 기존 골드 제외
- 통합 dry-run 게이트 완료: 동일 계획 해시 2회 재현
- 유료 API 호출 3회 수행 후 안전 중단
- 생성 1·2는 스키마와 원문 연결 검증 통과
- 생성 3은 `P1-S3-C1`의 비정확한 `evidenceFragment` 1건으로 검증 실패
- Medium/High 문단 감사는 아직 실행되지 않음
- 기존 골드 변경 없음
- 검증된 Passage Source Bundle 후보 2개가 원시 응답과 함께 보존됨

실행 계획 해시는
`sha256:ff15564aef54a34e022805bf6064b51f0f6c9d2f2bac6bb41fe31bb8a8745fd8`이다.
실행 폴더는
`paid-runs/ff15564aef54-2026-09-03T125621816Z`이다.

새 호출 비용은 `$0.3946158`, 이전 실험을 포함한 누적 비용은 `$1.1419878`이다.
자동 재시도와 자동 수리는 0회다.

중단 원문은 `맺히지만`인데 생성 3의 인용 조각은 `맺힌다`로 끝났다. 이 필드는 비권위 레거시
필드로 분류해 버리고, 코드는 `sourceUnitId`에서 원문 전체·offset·hash를 canonical evidence로
붙이도록 계약을 수정했다. 세 원시 출력은 변경하지 않고 모두 새 계약으로 무료 재투영했다.

재투영 후 세 후보의 28개 unit 비교 결과는 `STRUCTURAL_VARIANT` 21개, `UNRESOLVED` 7개다.
코드가 확정할 수 있는 직접적 `MEANING_CONFLICT`는 0개다. 표현·claim 분할 차이만으로 High 감사를
호출하지 않도록 라우팅도 수정했다.

감사 연속 실행의 새 계획 해시는
`sha256:bde9f321fc4f1ca9c6cfbf4b49774435e02bc582068227961db3b2c43bee47b7`이다.
기존 출력 재사용으로 생성 호출은 0회이고, Medium 4회와 High 4회가 계획됐다. 네 문단 모두에
조건·부정·비율·비교 또는 `UNRESOLVED`가 있어 이번 사례에서는 High 네 문단이 모두 사전 선택된다.
보수적 신규 비용은 `$2.458775`, 이전 비용을 포함한 누적 투영은 `$3.6007628`이다. 아직 이 감사
API는 호출하지 않았다.

## 계층 경계

Passage v2에는 원문에 명시됐거나 의미를 바꾸지 않은 충실한 정규화만 들어간다.

```text
Source Claim              원문에 명시된 사실
Derived Relation          동결 Source Claim으로부터 나중에 계산
Item Inference            문항 선지에 나중에 적용
```

이번 단계는 Source Claim까지만 다룬다. `derivedRelationsIncluded`는 항상 `false`다.

## Source Unit과 근거

- 문단·문장 경계, ID, UTF-16 offset, hash는 코드가 소유한다.
- LLM은 offset을 생성하지 않는다.
- LLM은 각 claim에 해당 문장 내부의 `evidenceFragments`만 제안한다.
- 코드는 fragment를 원문에 다시 연결하며, 유일한 exact 일치만 자동 확정한다.
- 모든 Source Unit은 claim 유무와 관계없이 `unitCoverage`에 정확히 한 번 기록한다.

## 감사

볼록렌즈 지문의 네 원문 문단이 각각 하나의 감사 chunk다.

| chunk | unit 수 |
|---|---:|
| P1 | 4 |
| P2 | 7 |
| P3 | 7 |
| P4 | 10 |

Medium은 모든 chunk를 감사한다. High는 고위험 의미 서명 또는 후보 간 의미 충돌이 있는 chunk에만
추가한다. Medium과 High는 서로의 감사 결과를 보지 않는다.

## 부분 수리

부분 수리는 한 Source Unit의 claim, relation, unresolved, coverage만 교체한다. 전역 entity 또는
quantity 변경은 자동 수리하지 않고 인간 검수 대상으로 남긴다. 수리 API 호출은 현재 dry-run
계획에 포함되지 않으며 별도 승인이 필요하다.

## 승인·실행 호출안

- 독립 Medium 생성 3회
- 네 문단 Medium 감사 4회
- 고위험·충돌 문단 High 감사 최대 4회
- 최소 7회, 최대 11회
- 자동 재시도 0회
- `service_tier: default`
- `store: false`
- 이미지 입력 0개

통합 승인 상한은 기존 실험 비용을 포함해 `$10`이다. dry-run의 보수적 투영은 최소 `$3.076867`,
최대 `$4.4500645` 누적이었다. 각 실제 호출 직전에도 동적 입력과 출력 상한을 이용해 비용을
다시 검사한다.

## 파일

- `dry-run/source-unit-registry.json`: 코드가 고정한 28개 문장
- `dry-run/structured-output-schemas.json`: 생성·감사·부분 수리 API 출력 스키마
- `dry-run/input-projection-audit.json`: 입력 격리 확인
- `dry-run/execution-plan.json`: 조건부 호출 구조와 비용 투영
- `dry-run/approval-candidate.json`: 유료 실행 비활성 상태의 후보 계획 해시
- `reprojected/run-1.json` ~ `run-3.json`: 원시 응답 hash와 레거시 인용 진단을 포함한 무료 재투영
- `reprojected/candidate-comparison.json`: 고정 unit별 구조·의미 비교
- `continuation-dry-run/approval-plan.json`: 기존 세 출력을 사용하는 감사 계획과 승인 ID
- `continuation-dry-run/execution-plan.json`: 8회 감사 호출과 비용 투영
