# 볼록렌즈 전체 그림 시각 전처리 탐색 v1

## 목적

영역 자르기 없이 원본 전체 그림으로 다음 세 단계를 비교한다.

1. 그림만 보는 순수 시각 판독
2. 그림과 검증된 텍스트를 함께 보는 판독
3. 네 후보를 원본 그림·검증 텍스트와 대조하는 medium/high 독립 감사

기존 지문·문제 골드와 Source Bundle은 변경하지 않는다.

## 현재 상태

- 시각 출력·감사 Structured Output 계약 구현
- 사람 평가 기준표와 API 입력 격리
- 시각 관찰과 텍스트 결합 해석의 구조적 분리
- 라벨·핵심 시각 사실·과잉 추론 자동 채점기 구현
- 최대 6회 실행기와 호출별 비용·승인 hash 안전장치 구현
- dry-run 2회 동일 계획 hash 확인
- 유료 API 호출 0회

## 호출 계획

| 번호 | 역할 | 모델 설정 |
|---|---|---|
| 1 | 전체 그림 순수 시각 판독 | Terra medium |
| 2 | 전체 그림 순수 시각 판독 | Terra high |
| 3 | 전체 그림 + 검증 텍스트 판독 | Terra medium |
| 4 | 전체 그림 + 검증 텍스트 판독 | Terra high |
| 5 | 네 후보 독립 감사 | Terra medium |
| 6 | 네 후보 독립 감사 | Terra high |

모든 호출은 원본 전체 그림을 사용하며 crop은 사용하지 않는다. 선지, 정답, 공식 해설,
기존 골드, 사람 평가 기준표는 입력하지 않는다. 감사 후보 이름에는 medium/high 매핑을
노출하지 않는다.

## dry-run

- 계획 hash: `sha256:8b2cdfba47406a764ad0d923164e4ad49f3098dda336ae35d9350bb8ecef0c1e`
- 최대 호출 수: 6
- 신규 최악 비용 추산: `$0.87726`
- 앞선 볼록렌즈 실험 누적비용: `$0.6126585`
- 전체 누적 최악 추산: `$1.489918`
- 전체 승인 상한: `$2`
- 자동 재시도: 0

유료 실행은 계획 hash에 결합된 별도 승인 ID 없이는 시작할 수 없다.

## 결과물

- `dry-run/execution-plan.json`: 6회 호출 순서와 입력 projection hash
- `dry-run/approval-plan.json`: 프롬프트·스키마·실행기·비용 계약 hash
- `dry-run/verified-text-context.json`: 결합 판독용 텍스트 context
- `dry-run/structured-output-schemas.json`: API 출력 계약
- `dry-run/input-projection-audit.json`: 금지 입력과 crop 미사용 확인
- `quarantined/evaluation-reference.json`: API에서 숨긴 사람 평가 기준표
- `quarantined/reference-isolation.json`: 기준표 격리 기록
