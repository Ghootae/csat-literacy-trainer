---
date: 2026-10-07
scope: central-story-two-stage-handoff
base_commit: uncommitted
---

# JEV 골드 흐름 중단과 중심 이야기 두 단계 생성 인계

사용자 판단("jev를 사용한 이 실험은 굳이 유지할 필요가 없고 … 중심 스토리를 이용한 버전이 차라리 낫겠다")과 Claude의 의견을 거쳐 방향을 바꿨다. Claude 의견은 JEV는 접되 중심 이야기 기반에 최소 2축과 원문 대조를 얹자는 것이었다.

- [D-0094](../decisions/D-0094-source-jev-gold-flow-stopped.md): 원문 분할·JEV 흐름을 골드 생성 방향에서 제외한다. 결과는 보존하고, 최소 2축(실질 설명 기준)·문단 기능·관계 기준은 계승한다.
- [D-0095](../decisions/D-0095-central-story-two-stage-generation.md): 두 단계 생성 실험을 설계했다. 명료화 답변은 25문단 전체, 두 단계 방식, 별도 실험, 인계→검토→전송 승인 순서다.
  - 1단계는 원문을 대조해 중심 이야기를 보강한다. 덧붙이기만 허용하고 부분 수열로 검사하며, 문장 배정으로 실질 설명 단위를 센다.
  - 2단계는 candidate-2 지침으로 축을 만들되, 최소 축 수가 기존 묶음 규칙보다 우선한다.
- 인계 문서: `docs/handoffs/2026-10-07-central-story-two-stage-generation.md`. 구현과 API 없는 사전 검증은 Codex 몫이고, 실행은 별도 전송 승인 뒤에 한다.
- 근거 관측: candidate-2 지침의 묶음 규칙(인과사슬 한 축, 원리와 적용 한 축 등)이 운영 골드 1축 10문단의 원인으로 보인다(Claude 의견).

## Codex 실행과 Claude 검토 (2026-10-07)

- Codex가 인계대로 구현과 API 없는 사전 검증을 마쳤다. 만든 파일은 다음과 같다: `scripts/lib/central-story-two-stage-contract.mjs`(+ `.test.mjs`), `scripts/test-central-story-two-stage.mjs`, `docs/experiments/central-story-two-stage-2026-10-07/`의 prepare 산출물 5개. 보고 내용은 인계 문서의 결과 보고 절에 있다.
- Claude가 직접 재검증했다.
  - 계약 테스트 15/15, `scripts/lib` 전체 70/70 통과
  - prepare 재실행 결과 동일, `run` 거부 3/3(인자 없음, D-0095, 없는 ID)
  - 동결된 1단계 지침이 인계 문서와 같고, 2단계 지침은 candidate-2에서 한 문장 교체와 최소 축 절 추가만 다르다.
  - 인계 전에 해시를 찍어 둔 보호 대상 1,652개 파일(운영·원본 골드, 기존 실험과 스크립트)이 그대로다.
- API는 0회다. 실행(최대 50회)은 D-0095 이후의 전송 승인 기록이 있어야 가능하다.
