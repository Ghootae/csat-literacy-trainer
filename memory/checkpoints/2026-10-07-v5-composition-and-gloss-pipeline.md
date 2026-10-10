---
date: 2026-10-07
scope: v5-composition-and-gloss-pipeline
base_commit: de9d766b97ab947193e3acbdedbeace11b699608
---

# v5 명칭·구성 결정과 자동 해석본 파이프라인 준비

## 결정된 것

- [D-0090](../decisions/D-0090-problem-evaluator-v5-naming.md): 'v3 기반 v4 후보'를 v5로 부른다(대화·문서만). v4는 운영 후보로 쓰지 않는다.
- [D-0091](../decisions/D-0091-v3-marker-phase-closed-port-to-v5.md): v3 기호 실험 단계를 마무리하고 판정 방법을 v5로 옮긴다.
- [D-0093](../decisions/D-0093-v5-composition-auto-gloss-pipeline.md): v5 = v5 운영 규칙 + 사람 승인 없는 자동 중간안 해석본 + v3 판정 방법.
  해석본은 생성 → 코드 검사 → 독립 재도출 → 기호별 대조, 최대 3회차, 실패 시 해석본 없이 판정. 같은 OpenAI 모델.

## 변경한 것

- `scripts/lib/marker-gloss-pipeline.mjs`와 테스트(6/6), 1단계 시험 `scripts/test-marker-gloss-pipeline-gongsun.mjs`(prepare 2회 안정,
  가짜 모델로 실행 경로·재개 확인), `docs/experiments/marker-gloss-pipeline-gongsun-2026-10-07/` FROZEN(최대 66요청, 추정 2달러).
- [설계안](../../docs/review/v5-marker-port-design-2026-10-07.md) 갱신. v5 프롬프트·서버·UI는 바꾸지 않았다. API 호출 0.

## 1단계 결과(사용자 실행 승인 후, 57요청 약 0.94달러)

- [결과 요약](../../docs/experiments/marker-gloss-pipeline-gongsun-2026-10-07/REVIEW-SUMMARY.json): 심은 오류 24/24 검출, 정상 오탐 0/45,
  같은 대상을 사례로 적은 자연 오류 1/3 검출. 파이프라인 3회: run1 ⓔ 불필요 제외(대조기 비일관), run2 ⓒ 사례 문장 이견, run3 전부 맞음.
- Claude·GPT 공통 개선안: 대상 일치와 사례 적격성 분리, 생략과 범위 변경 구별, 사례 종류 구분, 불일치 원인 구분 기록.

## 파이프라인 v2(Codex 구현, Claude 검토 후 실행, 54요청 약 0.97달러)

- [결과 요약](../../docs/experiments/marker-gloss-pipeline-v2-gongsun-2026-10-07/REVIEW-SUMMARY.json): 기호 오류 21/21, 오탐 0/156, 사례 판정 20/21(같은 대상 재지칭 3/3),
  고정 짝 P1 2/3·P2 대상 3/3. 파이프라인 3회 모두 1회차 전부 일치, 대상·화자 오류 0. run2 ⓑ에 대상 자체를 사례로 적은 결함이 남음.
- Claude·GPT 모두 채택본을 고치지 않고 2단계 반복 1~3에 쓰는 데 동의. 검수가 사례 규칙을 보장한다고 보지 않는다.

## 2단계 v5 세 조건 비교(Codex 구현, Claude 검토 후 실행, 72요청 약 1.15달러)

- [결과 요약](../../docs/experiments/v5-marker-judgment-gongsun-2026-10-07/REVIEW-SUMMARY.json): 의미 통과 v5 원본 19~20/24, +판정 방법 20~21/24, +해석본 20~21/24.
  ⓓ=빨간 옷 오독 4/24 → 1/24 → 0/24로 줄었지만 S5 과잉 교정 0/3 → 1/3 → 2/3으로 늘었다. 우열 미확정(소표본).

## 원문 대입 확인 시험과 모델 비교(사용자 승인, terra 81·sol 66·luna 72요청, terra 단가 추정 합계 약 6.3달러)

- 설계: [설계안](../../docs/review/v5-substitution-check-design-2026-10-07.md), 사용자 논의(S5 허용 근거는 하위 범주가 아니라 문맥상 ⓓ가 옷장 안의 옷으로 해석될 수 있음).
- [결과 요약](../../docs/experiments/v5-substitution-check-review-2026-10-07/REVIEW-SUMMARY.json): S5 과잉 교정과 판정기 자신의 ⓓ=빨간 옷 오독은 gpt-5.6-terra에서만 나타났다.
  gpt-6.1-sol은 두 조건 모두 GPT 기준 65/66, 심각한 실패 0. 원문 대입 확인은 terra의 S5를 고쳤지만 실제 오류 2건을 놓치게 했고 sol·luna에는 이득이 없었다.
- 하네스 결함 두 가지(대입 문장의 기호 문자 누락, 두 괄호)를 terra 실행 뒤 발견해 오프라인 재검사로 복원하고 v2 계약으로 고쳤다.
- sol·luna 실제 단가는 확인하지 못했다.

## 다음 행동

- 1단계 실행 승인 → 검수 레이어 검출률·오탐률과 파이프라인 채택본 검토 → 2단계(v5 세 조건 비교) 준비 전 설계안 5절 결정 4개.
