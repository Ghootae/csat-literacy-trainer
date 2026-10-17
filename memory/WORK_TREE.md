# 작업 수형도

갱신: 2026-10-17

병렬 작업의 갈래와 각 갈래의 다음 한 단계를 한눈에 보기 위한 지도다. 최상위 갈래는 제품
기능 단위다. 노드는 한 줄 요약과 근거 번호만 담고, 사실의 상세는 아래 근거 표의 링크와
[`CURRENT_STATE.md`](./CURRENT_STATE.md)에서 찾는다. 운영 규칙은 [D-0113](./decisions/D-0113-work-tree-entry-map.md).

```
수능 비문학 학습 도우미 — 외부 학생 검증 대기

├─ 문단 골드 생성
│  ├─✗ 원문 분할→JEV→병합→감사기 흐름 — 중단, 규칙 일부만 계승             D-0094
│  └─○ 중심 이야기 2단계 생성 — v3에서 멈춤, 재개 여부 미정(과적합 우려)      CP-A
│        다음: 재개 여부 결정(Claude 권고: v3 고정·반복 실행·새 문단 검증, 미승인)
│
├─ 문단 요약 응답 판정 — 학생 기본값 V4, 근본 검토 중                       D-0013·D-0138
│  ├─● 근본 검토 — 축 구조 전제 재검토, 단순 형식 후보                D-0138~D-0144
│  │     질문 비교 H0 4·V4 6 → 단순 형식+질문 규칙 4 유지(D-0139)
│  │     검증은 사용자 직접 사용감 기록으로(D-0140), 개발자 모드 인계 작성
│  │     사용감 메모로 v2(D-0142)·v3(D-0144) 구현·검토 완료, 판정 모델 luna로 관찰
│  │     다음: v3로 사용자 직접 사용, 메모 6(이미 말한 관계 GAP) 재발 관찰
│  ├─✓ 전체 판정(H0) 그림자 실험 — 판정기는 V4 유지, 경계 규칙 (나″)        D-0132·D-0133
│  ├─○ 보여 주기 개발자 모드 — 근본 검토 끝날 때까지 구현 중지                D-0134~D-0137·CP-E
│  └─? 축 하나에 한 내용(gold-v2 묶인 축 재분할) — 근본 검토 결과에 종속      Q-0036
│
├─ 문항 기호 해석본 생성
│  └─○ 자동 생성·검수 파이프라인 v2 완성 — 현재 v5(methods)에는 미포함        D-0093·D-0114
│        terra의 ⓓ 오독 대응책이었으나 sol은 해석본 없이 해당 오독이 없었음
│        다음: 다문항 결과에서 luna·sol의 기호 오독 사례 확인 → 필요성 판단
│
├─ 문제 풀이 응답 판정 — 학생 기본값 v3, 운영 후보 v5(methods)               D-0090
│  ├─✓ 모델 라우팅: 정답 luna / 오답 sol, 세션 안 배정                       D-0104·D-0107
│  ├─✓ 교정: 국소 오류만 판정, 선지를 가르는 관계까지 질문                   D-0108·D-0105
│  ├─✓ 피드백·코칭: 해요체·마크다운 렌더링, 교정 뒤 [다시 선택]/[코칭 보기]  D-0110·D-0106
│  ├─● 개발자 경로 연결 — 구현·실모델 확인·48가상 세션 기록 완료             D-0112·CP-D
│  │     다음: UI 메모장 20번(첫 문장 적절/부적절) 논의, 사용자 UI 검토 계속
│  ├─○ 학생용 전환 — 개발자 경로 확인 뒤 운영 반영 승인 필요                 CP-B
│  └─? 경계 응답 판정 기준(짧지만 충분 vs 대상만 언급)                       Q-0032
│
├─ 학습자 생각 진단 — 큰 논의는 문단·문제 안정화 뒤 재개                     Q-0034
│  ├─✗ 함정 강도·선택률 예측 — LLM·JEV 모두 실패, 목표 재정의                D-0109
│  ├─○ 문단 분석 지도 — 방향 합의(상향 지도·동결·닫힌 어휘·생성형 판정)    D-0141
│  │     다음: 분야별 지문 샘플링·라벨 목록 논의(브레인스토밍 단계)
│  └─● 사고 진단 v0.1 — 가상 풀이 36/36, 과잉 분류 0                         D-0111
│        운영 방향: 실시간 아닌 주기 실행, 모델 sol 고정(주기 기준 미정)       D-0115
│        다음: 처음 보는 사례·실제 학생 풀이로 검증
│
└─○ 문항 골드 — 오프라인 감사·회귀용으로만 보관                              CP-C

● 진행 중  ○ 보류·대기  ✓ 확정  ✗ 폐기  ? 미해결 질문
```

## 근거

| 표기 | 연결 |
|---|---|
| D-0013 | [문단 선택적 보완 V4](./decisions/D-0013-paragraph-optional-revision-v4.md) |
| D-0138 | [문단 요약 근본 검토](./decisions/D-0138-paragraph-fundamental-review-question-quality-first.md), [질문 비교 묶음](../docs/experiments/question-quality-h0-vs-v4-2026-10-15/README.md), [D-0139 질문 규칙](./decisions/D-0139-paragraph-simple-format-question-rules.md), [D-0140 개발자 모드](./decisions/D-0140-paragraph-simple-holistic-dev-mode.md) |
| D-0090 | [v5 명칭](./decisions/D-0090-problem-evaluator-v5-naming.md) |
| D-0093·D-0114 | [v5 구성과 자동 해석본](./decisions/D-0093-v5-composition-auto-gloss-pipeline.md), [v5 실제 구성 정정](./decisions/D-0114-v5-current-composition-methods-without-gloss.md) |
| D-0094 | [원문 분할·JEV 골드 흐름 중단](./decisions/D-0094-source-jev-gold-flow-stopped.md) |
| D-0103 | [전체 판정·축 기록 방향](./decisions/D-0103-holistic-verdict-axis-recording-direction.md) |
| D-0104·D-0107 | [선택 정오 라우팅](./decisions/D-0104-problem-evaluator-model-routing-by-choice.md), [세션 안 배정](./decisions/D-0107-session-model-routing-repair-reselect-coaching.md) |
| D-0105·D-0108 | [교정 질문 범위](./decisions/D-0105-correction-question-covers-choice-deciding-relation.md), [국소 오류만 판정](./decisions/D-0108-repair-judges-local-error-only.md) |
| D-0106·D-0110 | [교정 뒤 흐름](./decisions/D-0106-post-repair-choice-reselect-or-coaching.md), [공개 설명 형식](./decisions/D-0110-public-coaching-format-haeyo-and-markdown.md) |
| D-0109 | [함정 지도 v0](./decisions/D-0109-trap-map-v0-external-rate-experiment.md), [JEV 결과](./checkpoints/2026-10-10-trap-map-jev-choice-results.md) |
| D-0111 | [사고 진단 v0](./decisions/D-0111-thought-diagnosis-v0-experiment.md), [v0.1 결과](./checkpoints/2026-10-10-thought-diagnosis-v01-results.md) |
| D-0141 | [문단 분석 지도 방향](./decisions/D-0141-paragraph-analysis-map-direction.md), [논의 기록](../docs/review/paragraph-analysis-map-brainstorm-2026-10-16.md) |
| D-0115 | [사고 진단 주기 실행·sol 고정](./decisions/D-0115-thought-diagnosis-periodic-sol.md) |
| D-0112 | [v5 개발자 경로 종료 상태](./decisions/D-0112-v5-developer-path-connection-end-states.md), [연결 기록](./checkpoints/2026-10-10-v5-developer-path-connected.md) |
| Q-0032·Q-0033·Q-0034·Q-0036 | [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md) |
| D-0132·D-0133 | [판정기 V4 유지](./decisions/D-0132-paragraph-judge-keep-v4.md), [경계 규칙 (나″)](./decisions/D-0133-paragraph-boundary-rule-na-double-prime.md) |
| D-0134~D-0137 | [개발자 모드](./decisions/D-0134-boundary-show-dev-mode-central-object.md), [오류 축마다 질문](./decisions/D-0135-boundary-show-error-question-per-axis.md), [반말](./decisions/D-0136-boundary-show-banmal-question-feedback.md), [effectiveResponse](./decisions/D-0137-boundary-show-effective-response-restatement.md) |
| CP-A | [두 단계 생성 v3에서 멈춤](./checkpoints/2026-10-08-two-stage-paused-at-v3.md) |
| CP-B | [종료 코칭 수정 확인 시험](./checkpoints/2026-10-10-v5-coaching-fix-test.md) |
| CP-C | [`WORKSTREAM-STATE.md` 문제 골드 절](../docs/WORKSTREAM-STATE.md) (2026-09-08 결정, 역사 자료) |
| CP-E | [보여 주기 개발자 모드 첫 사용](./checkpoints/2026-10-15-boundary-show-dev-mode-first-use.md) |
| CP-D | [실모델 확인](./checkpoints/2026-10-11-v5-live-connection-test.md), [48개 세션 기록](./checkpoints/2026-10-12-v5-diverse-48-recorded.md) |

## 갱신 규칙

- 갈래의 상태나 다음 한 단계가 바뀐 작업은 끝날 때 이 파일과 맨 위 갱신 날짜를 함께 고친다.
- 노드는 결정 기록이 생겼거나 독립적으로 진행·보류될 수 있는 갈래만 만든다. 실험 한 번은 노드가 아니다.
- 완료·폐기된 갈래는 한 줄로 접고 하위 노드를 지운다. 이력은 결정 기록과 체크포인트에 남는다.
- 근거 표의 링크는 `node scripts/validate-memory.mjs`가 검사한다.
