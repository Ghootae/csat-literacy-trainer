# 작업 수형도

갱신: 2026-10-27

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
├─ 문단 요약 응답 판정 — 학생 기본값 V4, 운영 후보 단순 형식 v4.7(luna)       D-0013·D-0174
│  ├─✓ 근본 검토 — 단순 형식 v4.7로 확정, 개발자 주소 /dialogue/lab        D-0138~D-0149·D-0174
│  │     작동 순서 문서 확인 필요 11건 처리, 교정 질문 힌트 기록      D-0175
│  │     다음: 학생용 전환 — 순서 확정(1′ 정리 → 학생 확인 → 확대), 섭외 대기  D-0176
│  ├─✓ 전체 판정(H0) 그림자 실험 — 판정기는 V4 유지, 경계 규칙 (나″)        D-0132·D-0133
│  ├─○ 보여 주기 개발자 모드(축 기반) — 단순 형식 채택으로 보류               D-0134~D-0137·D-0174
│  └─○ 축 하나에 한 내용 — 보류, 폐기 여부는 학생용 전환 때                  Q-0036·D-0174
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
│  ├─● 개발자 경로 연결 — 구현·실모델 확인·48가상 세션 기록 완료             D-0112·CP-D·D-0150·D-0152~0154
│  │     경로 `/problem/lab`·코드 이름 버전 제거, 작동 순서 문서 작성       D-0173
│  │     작동 순서 확인 필요 9건 처리, `coaching` 필드 정리 완료(v5.1, 18세션 회귀 통과)    D-0177
│  │     메모장 23·24·25·29 반영 D-0156·D-0157·D-0159·D-0161, 48세션 회귀 통과(B3 수정 D-0164), "없음" 근거 판정 D-0166
│  │     K4(회사법 13번 ②) 판정 재검토: 재구성 세 칸·합당 기준·READING 오류 합의  CP-F
│  │     K4 재설계: 재구성 세 칸 판정 v5.3 1단계 구현·시험 통과, v5.2 미채택   D-0178
│  │     다음: v5.3 2단계 실측(실제 문항 사례·18세션 회귀, 승인 필요)
│  │     리마인드: luna 자신의 기호 오독(S2-r3) 해결 — 질문 자동 검사 vs 교정 단계 sol   Q-0030
│  ├─○ 학생용 전환 — 순서 D-0176(실제 학생 확인 뒤 확대·전환)              CP-B·D-0176
│  └─? 경계 응답 판정 기준(짧지만 충분 vs 대상만 언급)                       Q-0032
│
├─ 학습자 생각 진단 — 큰 논의는 문단·문제 안정화 뒤 재개                     Q-0034
│  │  문제 쪽 오류 분류: 지금은 세 목록 대응표, 재검증 때 내용·과정 두 축    D-0181
│  ├─✗ 함정 강도·선택률 예측 — LLM·JEV 모두 실패, 목표 재정의                D-0109
│  ├─● 문단 분석 지도(지문을 명제→묶음→요지로 쌓은 동결 지도에 학생 요약을 대어 무엇을 잡고 놓쳤는지 기록)
│  │     공손룡 기준선(r3·입장·판정 v3·오류 집계), 도파민 일반화 기준 ①②③ 통과 D-0143·D-0146
│  │     관계 유형 4갈래 18유형 검증 완료(블라인드 85%), v3 새 지문 4개 기타 0  D-0147
│  │     분석 골드 절차: 맞춰 보기 종료, 동결·입장 코드 에이전트 검토 운용, 동결 지도 6장 D-0151·D-0155·D-0158
│  │     학생 이해 지문 집계 스크립트 완성, 학생별 18유형 칸은 표본 부족     D-0160
│  │     선지 연결: v5 UI 6지문 120선지 동결 완료, 마지막 설명 좌표는 차이 없어 미반영 D-0162·D-0167
│  │     선택형 출제자 전략 피드백: 57편 생성·검토 → 화면 연결·선지 직접 누르기 완료 D-0170·D-0172
│  │     다음: 출제자 전략 화면 메모 반영(38 결정·구현 대기, 40·41·43 논의 대기)
│  │     미착수: 다리 층, 말 안 함/모름 구별(시점 미정)
│  ├─● 사고 진단 v0.1(풀이 이유 문장으로 무너진 단계·걸린 함정 판정)
│  │     가상 풀이 36/36, 과잉 분류 0                                         D-0111
│  │     운영 방향: 실시간 아닌 주기 실행, 모델 sol 고정(주기 기준 미정)       D-0115
│  │     다음: 처음 보는 사례·실제 학생 풀이로 검증
│  └─○ 정답 경로 분석(문항마다 정답에 이르는 노드 지도를 만들고, 학생이 어느 노드·요소에서 틀렸는지 기록)
│        READ·LINK·APPLY 노드, 요소 E1~E10, 깊이=노드 수, 오답=실패 노드·요소   D-0119·D-0121~D-0124
│        sol 종단 검증 대체로 양호(실패 종류 17/20, 3회 일관성 33/35)
│        다음: 실제 학생 풀이, 여러 문항에서 노드 분할 일관성 확인
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
| D-0177 | [문제 판정 v5.1 coaching 제거](./decisions/D-0177-problem-feedback-v51-drop-unused-coaching.md), [회귀 보고](../docs/experiments/v5-diverse-48-regression-2026-10-26/REPORT-human.md) |
| D-0176 | [학생용 전환 순서](./decisions/D-0176-student-switch-roadmap-pilot-before-expansion.md), [coaching 정리 인계](../docs/handoffs/2026-10-26-problem-feedback-coaching-field-cleanup.md) |
| D-0175 | [문단 교정 질문 중 근거 문장 힌트](./decisions/D-0175-paragraph-simple-correction-hint-during-question.md) |
| D-0174 | [문단 운영 후보 단순 형식 v4.7](./decisions/D-0174-paragraph-simple-v47-operating-candidate.md), [작동 순서](../docs/PARAGRAPH-LAB-FLOW-2026-10-25.md) |
| D-0173 | [개발자 문제 경로 이름 정리](./decisions/D-0173-problem-lab-version-free-code-names.md), [작동 순서](../docs/PROBLEM-LAB-FLOW-2026-10-24.md) |
| D-0093·D-0114 | [v5 구성과 자동 해석본](./decisions/D-0093-v5-composition-auto-gloss-pipeline.md), [v5 실제 구성 정정](./decisions/D-0114-v5-current-composition-methods-without-gloss.md) |
| D-0094 | [원문 분할·JEV 골드 흐름 중단](./decisions/D-0094-source-jev-gold-flow-stopped.md) |
| D-0103 | [전체 판정·축 기록 방향](./decisions/D-0103-holistic-verdict-axis-recording-direction.md) |
| D-0104·D-0107 | [선택 정오 라우팅](./decisions/D-0104-problem-evaluator-model-routing-by-choice.md), [세션 안 배정](./decisions/D-0107-session-model-routing-repair-reselect-coaching.md) |
| D-0105·D-0108 | [교정 질문 범위](./decisions/D-0105-correction-question-covers-choice-deciding-relation.md), [국소 오류만 판정](./decisions/D-0108-repair-judges-local-error-only.md) |
| D-0106·D-0110 | [교정 뒤 흐름](./decisions/D-0106-post-repair-choice-reselect-or-coaching.md), [공개 설명 형식](./decisions/D-0110-public-coaching-format-haeyo-and-markdown.md) |
| D-0109 | [함정 지도 v0](./decisions/D-0109-trap-map-v0-external-rate-experiment.md), [JEV 결과](./checkpoints/2026-10-10-trap-map-jev-choice-results.md) |
| D-0111 | [사고 진단 v0](./decisions/D-0111-thought-diagnosis-v0-experiment.md), [v0.1 결과](./checkpoints/2026-10-10-thought-diagnosis-v01-results.md) |
| D-0141·D-0143 | [문단 분석 지도 방향](./decisions/D-0141-paragraph-analysis-map-direction.md), [논의 기록](../docs/review/paragraph-analysis-map-brainstorm-2026-10-16.md), [공손룡 실험](./decisions/D-0143-analysis-map-gongsun-pilot.md), [1단계 인계](../docs/handoffs/2026-10-16-analysis-map-gongsun-stage1.md), [2단계 인계](../docs/handoffs/2026-10-16-analysis-map-gongsun-stage2.md) |
| D-0146~D-0172(분석 지도) | [D-0146 도파민 일반화](./decisions/D-0146-analysis-map-dopamine-generalization.md), [D-0147 관계 유형 목록](./decisions/D-0147-relation-vocabulary-sampling.md), [D-0151 분석 골드 절차](./decisions/D-0151-analysis-gold-standard-procedure.md), [D-0155 점검표 v2](./decisions/D-0155-analysis-gold-checklist-v2-and-prompt-v2.md), [D-0158 코드 에이전트 검토 운용](./decisions/D-0158-analysis-gold-claude-review-without-further-calibration.md), [D-0160 학생 이해 지문 집계](./decisions/D-0160-student-fingerprint-aggregation.md), [D-0162 선지 연결 층](./decisions/D-0162-choice-link-layer-direction.md), [D-0167 마지막 설명 좌표 비교](./decisions/D-0167-choice-link-end-explanation-comparison.md), [D-0170 출제자 전략 피드백](./decisions/D-0170-optional-examiner-strategy-feedback.md), [D-0172 선지 직접 누르기](./decisions/D-0172-problem-ui-choice-direct-select.md) |
| D-0115 | [사고 진단 주기 실행·sol 고정](./decisions/D-0115-thought-diagnosis-periodic-sol.md) |
| D-0119·D-0121~D-0124 | [요구 요소·깊이](./decisions/D-0119-answer-path-elements-and-depth.md), [층·실패 종류](./decisions/D-0121-answer-path-layers-and-failed-operation.md), [깊이=노드 수](./decisions/D-0122-answer-path-depth-node-count.md), [오진술 우선](./decisions/D-0123-answer-path-explicit-misstatement-priority.md), [요소 덮어쓰기](./decisions/D-0124-answer-path-element-override-on-evidence.md), [sol 종단 검증](./checkpoints/2026-10-14-answer-path-sol-e2e-results.md), [정의 문서](../docs/review/answer-path-element-vocabulary-v0-2026-10-13.md) |
| D-0181 | [오류 분류 두 축](./decisions/D-0181-problem-error-taxonomy-two-axes-later.md), [대응표](../docs/review/problem-error-taxonomy-crosswalk-2026-10-27.md) |
| D-0112 | [v5 개발자 경로 종료 상태](./decisions/D-0112-v5-developer-path-connection-end-states.md), [연결 기록](./checkpoints/2026-10-10-v5-developer-path-connected.md) |
| Q-0032·Q-0033·Q-0034·Q-0036 | [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md) |
| D-0132·D-0133 | [판정기 V4 유지](./decisions/D-0132-paragraph-judge-keep-v4.md), [경계 규칙 (나″)](./decisions/D-0133-paragraph-boundary-rule-na-double-prime.md) |
| D-0134~D-0137 | [개발자 모드](./decisions/D-0134-boundary-show-dev-mode-central-object.md), [오류 축마다 질문](./decisions/D-0135-boundary-show-error-question-per-axis.md), [반말](./decisions/D-0136-boundary-show-banmal-question-feedback.md), [effectiveResponse](./decisions/D-0137-boundary-show-effective-response-restatement.md) |
| CP-A | [두 단계 생성 v3에서 멈춤](./checkpoints/2026-10-08-two-stage-paused-at-v3.md) |
| CP-B | [종료 코칭 수정 확인 시험](./checkpoints/2026-10-10-v5-coaching-fix-test.md) |
| CP-C | [`WORKSTREAM-STATE.md` 문제 골드 절](../docs/WORKSTREAM-STATE.md) (2026-09-08 결정, 역사 자료) |
| CP-E | [보여 주기 개발자 모드 첫 사용](./checkpoints/2026-10-15-boundary-show-dev-mode-first-use.md) |
| CP-F | [K4 판정 재설계 논의](./checkpoints/2026-10-27-k4-judgment-redesign-discussion.md), [논의 메모](../docs/reports/REPORT-k4-v51-judgment-review-human.md) |
| CP-D | [실모델 확인](./checkpoints/2026-10-11-v5-live-connection-test.md), [48개 세션 기록](./checkpoints/2026-10-12-v5-diverse-48-recorded.md) |

## 갱신 규칙

- 갈래의 상태나 다음 한 단계가 바뀐 작업은 끝날 때 이 파일과 맨 위 갱신 날짜를 함께 고친다.
- 노드는 결정 기록이 생겼거나 독립적으로 진행·보류될 수 있는 갈래만 만든다. 실험 한 번은 노드가 아니다.
- 완료·폐기된 갈래는 한 줄로 접고 하위 노드를 지운다. 이력은 결정 기록과 체크포인트에 남는다.
- 근거 표의 링크는 `node scripts/validate-memory.mjs`가 검사한다.
