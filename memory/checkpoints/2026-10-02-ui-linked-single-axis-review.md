---
date: 2026-10-02
scope: paragraph-gold-axis-granularity-review
base_commit: uncommitted
---

# UI 연결 골드 단일 축의 정적 검토

## 새로 확인된 것

- UI 연결 정확 원문 6지문·30문단의 기존 골드는 48축·단일 축14문단, 조건부 실험 자산은 51축·단일 축12문단이다. 연결과 자산별 경로는 `docs/review/ui-linked-single-axis-review-2026-10-02.md`에 기록했다.
- 분해 프롬프트는 인과사슬·대조·정책 전개를 한 축으로 묶도록 명시한다: `packages/pipeline/experiments/dialogue/central-axis-decomposition-prompt-v2.md`.
- Codex 원문 대조에서 mRNA5의 여러 기능 단계, 정보 비대칭2의 대응/적용 범위 논쟁을 우선 분리 후보로 제안했다. 이는 검토 의견이며 독립 사람 승인·실모델 효과 측정이 아니다: `docs/review/ui-linked-single-axis-review-2026-10-02.md`.

## 결정된 것

- 새 정책 결정 없음. 기존 골드·UI·운영 기본값 유지.

## 변경한 것

- 검토 문서·체크포인트·현재 위험·열린 질문을 추가했다. API 호출 없음.

## 미해결

- Q-0031: 무손실 거시 구조와 학생 부분 이해 진단 단위의 경계를 어떻게 설정할지.

## 다음 행동

- mRNA5·정보 비대칭2의 의미 보존 분리 후보를 사람 검토하고 충분/누락/오류 응답 대조 범위를 정한다.

## 근거

- `docs/review/ui-linked-single-axis-review-2026-10-02.md`
- `packages/app/src/server/content.ts`
- `packages/pipeline/fixtures/experiments/dialogue/passages/`
- `packages/pipeline/fixtures/experiments/dialogue/gold-v2/`
- `packages/pipeline/fixtures/experiments/dialogue/conditional-meta-v1/`
