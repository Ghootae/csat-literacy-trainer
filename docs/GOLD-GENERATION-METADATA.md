# Gold generation metadata contract

## 목적

새로 생성하는 골드가 어떤 원문과 생성 계약으로 만들어졌는지 파일 자체에서 확인하고 같은
조건을 재구성할 수 있게 한다. 기존 골드는 재생성하거나 일괄 수정하지 않는다.

## 저장 계약

새 `Gold`에는 선택형 `generationMetadata`가 생성 시 자동으로 붙는다.

| 필드 | 의미 |
| --- | --- |
| `provider`, `model`, `effort` | 실제 오프라인 골드 생성 설정 |
| `promptVersion` | 분해·합성·링크 검증·슬롯 코어 프롬프트 묶음 버전 |
| `schemaVersion` | 생성되는 골드 의미 구조의 버전 |
| `generatedAt` | 생성 완료 시각(UTC ISO 8601) |
| `sourceHash` | 줄바꿈을 LF로 바꾸고 양끝 공백을 제거한 원문의 SHA-256 |
| `generatorFingerprint` | provider/model/effort/promptVersion/schemaVersion의 SHA-256 |
| `review` | 생성 직후 `unreviewed`; 사람 검수 뒤에만 `reviewed` |
| `revisions` | 사람 수정·재생성·이관 이력. 생성 직후에는 빈 배열 |

프롬프트나 골드 의미 스키마를 바꿀 때는 각각 `GOLD_PROMPT_VERSION` 또는
`GOLD_SCHEMA_VERSION`을 올린다. 모델이나 effort가 달라져도 fingerprint는 자동으로 달라진다.

## Legacy 규칙

- `generationMetadata`가 없으면 `legacy/no-fingerprint`다.
- legacy는 오류나 로딩 차단 상태가 아니다. 기존 앱·질의·회귀에서 그대로 사용한다.
- 기존 `content/*/gold.json`과 `.omc/agreement/*.gold-*.json`에는 메타데이터를 소급해 쓰지 않는다.
- 과거 생성 조건을 추정해 채우지 않는다.
- `content-import`는 객체 전개로 metadata가 있는 새 골드는 보존하고, 없는 legacy 골드는 그대로
  이관한다.

## 검수와 수정

- 자동 생성 직후에는 항상 `review.status = unreviewed`다.
- 사람의 내용·관계 방향 검수가 실제로 끝난 뒤에만 `reviewed`와 `reviewedAt`을 기록한다.
- 생성 이후 의미 내용에 손을 댄 경우 `revisions`에 시각, 종류, 설명을 추가한다.
- 모델 결과나 대화 기록만으로 검수 완료를 추정하지 않는다.

## 구현 경로

- 타입·해시·legacy 판별: `packages/pipeline/src/gold-generation-metadata.ts`
- 자동 기록 지점: `packages/pipeline/src/gold.ts`의 `buildGold()` 반환
- 저장 소비자: `packages/pipeline/src/cli/gold-one.ts`, `agreement.ts`, `adhoc.ts`
- 제품 이관: `packages/pipeline/src/cli/content-import.ts`
