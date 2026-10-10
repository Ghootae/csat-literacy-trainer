---
id: D-0041
status: accepted
date: 2026-09-30
scope: paragraph-dual-sensitive-expansion-experiment
supersedes: none
---

# 구체 축·메타 축 공동 재생성으로 민감 6문단 이중 판정 확대

## 사용자 결정

사용자는 민감 문단 확대를 요청하고, 이전 실험과의 일관성을 위해 기존 축을 고정한 메타 추가가
아니라 구체 축과 메타 축을 함께 새로 생성하는 방식을 선택했다. 이어 '끝까지 일괄로 진행해줘'로
생성6회와 학생 판정180회·검증·보고까지 승인했다. 생성 후 별도 사용자 확인 대기는 철회됐다.

## 범위

- 공손룡1·3, mRNA2, 도파민1, 정보비대칭2, 헤겔1. 저장된 centralStory만으로 문단당1회 공동 생성.
- 이전 D-0038 candidate-2와 같은 생성 프롬프트·스키마·모델 설정; 바뀌는 것은 input뿐이다.
- 새 구체 축은 L1, 새 메타 축은 L2에 고정하고 30합성응답×2레벨×3반복으로 측정한다.
- L1은 구체 인정, L2는 이전 메타 판정 지시문 그대로. 결과는 D-0040 비개입 우선 정책으로 결합한다.
- 비교는 같은 새 축의 L1-only와 L1+L2 라우팅이다. 과거 운영 V4와의 직접 대조 호출이 아니다.
- 합성 응답·기대는 생성 전 동결하며, 기대는 Codex 가설이지 독립 사람 정답이 아니다.
- 생성/판정 원출력·실패를 보존하고 좋은 결과를 위해 재생성하거나 판정을 재시도하지 않는다.

운영 V4·골드·UI·서버·보상 규칙은 변경하지 않는다. JEV 보류도 유지한다.
accepted는 이 확대 실험의 승인이며 생성물·판정기·운영 승격의 승인이 아니다.

## 근거

- 사용자 2026-09-30 '일관성을 위해서 새로 생성하는 편', '끝까지 일괄로 진행해줘'.
- `docs/experiments/dual-routing-sensitive-six-2026-09-30/PLAN.md`
- `docs/experiments/dual-routing-sensitive-six-2026-09-30/case-definitions.json`
- `scripts/test-dual-routing-sensitive-six.mjs`

## 완료 관측 — 운영 채택 아님

생성6/6·판정175/180유효. 전체 축11→9. 동결30응답의 유효85쌍에서 L2 라우팅 추가효용0,
기능답은 L1도18/18통과였다. 명시오류18/18검출·문단단위나열18/18질문이나 mRNA 한 축OK변동이 남았다.
공손룡 충분답의 생략은 중의성 통제 문제이며 L1 ERROR3/3을 확정 오탐으로 단정하지 않는다.
L2 정확 인용실패5·헤겔 귀속역전과수용1도 기록했다. 무효결과를 사후 수리하지 않았다.

- `docs/experiments/dual-routing-sensitive-six-2026-09-30/REPORT.md`
- `docs/experiments/dual-routing-sensitive-six-2026-09-30/metrics.json`
