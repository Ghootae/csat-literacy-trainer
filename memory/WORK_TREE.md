# 작업 수형도

갱신: 2026-11-12

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
├─ 문단 요약 응답 판정 — 운영 후보 단순 형식 v4.8(luna), 옛 학생용 V4 폐기   D-0174·D-0202
│  ├─✓ 근본 검토 — 단순 형식 v4.7로 확정, 개발자 주소 /dialogue/lab        D-0138~D-0149·D-0174
│  │     작동 순서 문서 확인 필요 11건 처리, 교정 질문 힌트 기록      D-0175
│  │     학생 시뮬레이션(10-30): 빈 곳 답 관대 판정 수용, 남은 2건은 v4.10 후보   D-0191
│  │     다음: 학생용 전환 — 순서 확정(1′ 정리 → 학생 확인 → 확대), 섭외 대기  D-0176
│  ├─✓ 전체 판정(H0) 그림자 실험 — 판정기는 V4 유지, 경계 규칙 (나″)        D-0132·D-0133
│  ├─○ 보여 주기 개발자 모드(축 기반) — 단순 형식 채택으로 보류               D-0134~D-0137·D-0174
│  └─○ 축 하나에 한 내용 — 보류, 코드 정리는 학생용 새로 만들 때             Q-0036·D-0202
│
├─ 문항 기호 해석본 생성
│  └─○ 자동 생성·검수 파이프라인 v2 완성 — 현재 v5(methods)에는 미포함        D-0093·D-0114
│        terra의 ⓓ 오독 대응책이었으나 sol은 해석본 없이 해당 오독이 없었음
│        luna 오독 집계: 확정 6건(공손룡 ⓓ)·현행 학생 노출 0 → 필요성 낮음, 관찰  D-0197
│
├─ 문제 풀이 응답 판정 — 운영 후보 v5(methods), 옛 학생용 v3 폐기          D-0090·D-0202
│  ├─✓ 모델 라우팅: 정답 luna / 오답 sol, 세션 안 배정                       D-0104·D-0107
│  ├─✓ 교정: 국소 오류만 판정, 선지를 가르는 관계까지 질문                   D-0108·D-0105
│  ├─✓ 피드백·코칭: 해요체·마크다운 렌더링, 교정 뒤 [다시 선택]/[코칭 보기]  D-0110·D-0106
│  ├─● 개발자 경로 연결 — 구현·실모델 확인·48가상 세션 기록 완료             D-0112·CP-D·D-0150·D-0152~0154
│  │     경로 `/problem/lab`·코드 이름 버전 제거, 작동 순서 문서 작성       D-0173
│  │     작동 순서 확인 필요 9건 처리, `coaching` 필드 정리 완료(v5.1, 18세션 회귀 통과)    D-0177
│  │     메모장 23·24·25·29 반영 D-0156·D-0157·D-0159·D-0161, 48세션 회귀 통과(B3 수정 D-0164), "없음" 근거 판정 D-0166
│  │     K4(회사법 13번 ②) 판정 재검토: 재구성 세 칸·합당 기준·READING 오류 합의  CP-F
│  │     K4 재설계: 재구성 세 칸 판정 v5.3 1단계 구현·시험 통과, v5.2 미채택   D-0178
│  │     v5.3 2단계 실측: 형식 실패 다수로 중단(K4 0/3, 오답 READING 6/6)    CP-G
│  │     v5.3 보강((가) 서버 결론 확정·① 인용 분리 제거) 재실행: 형식 실패 0, 회귀 유지, K4 0/3  CP-H
│  │     v5.3 보강판 운영 후보 채택(재구성 세 칸·서버 결론 확정)            D-0182
│  │     K4 (나) 확인 단계 실험: K4 1/3, 대조 잘못 수용 0, ② 읽기 차이가 원인   CP-I
│  │     K4는 현재 동작 수용(읽기 차이), (나) 미연결                            D-0182
│  │     마지막 설명 칸 유형 레이아웃 v1 채택(진단 글 + 유형별 순서), 판정 11/12  D-0184
│  │     판정 v5.6 채택(선지 읽기 덧붙임 대 세기, XS ADDED 5/5, 회귀 8/8 유지)    D-0185
│  │     판정 v5.7-2 채택(교정 질문: 답 보기 금지·사실 하나 직접 질문, 회귀 16/18 같음·2 흔들림)  D-0188
│  │     서버는 판정기 '부족'을 '정확'으로 올리지 않음, 19번 ⑤ 정의 부정 추론은 연결 부족  D-0189
│  │     판정 v5.8 기본값(결론 재계산·정의 한 번 적용, 회귀 17/18 같음)                 D-0190
│  │     DeepSeek Pro·Flash 시험(19번 ⑤): 비용·지연 이점 없음, luna·sol 유지        D-0192
│  │     열린 질문: 정의 잘못 적용 근거를 오류로 볼지(N2, Pro만 ERROR)                Q-0041
│  │     마지막 설명 문단 넘기기·칠하기: v2.2 실제 생성 연결 D-0193·D-0194
│  │     다음: 서버 재빌드·화면 확인, 관찰(형식 재시도·근거 엄격도)
│  │     관찰 사례: 도파민 ② 근거 엄격·설명 인정 누락(11-03), 입력 기호 버튼·낱말 변환 996c38c7
│  │     luna 기호 오독: 관찰로 남김(학생 노출 0)                              D-0197
│  │     gpt-6.1-terra 대체 시험: 판정 같음·P1 엄격·설명 압축 → sol 유지      D-0199
│  ├─○ 학생용 — 확정된 개발자용을 고쳐 새로 만듦, 순서 D-0176              D-0176·D-0202
│  │     교사 2~3명 원격 시연(사전 점검): 튜토리얼·설문·운영 안내 완료       D-0198
│  │     다음(사용자): 설문 링크·연락처 채우기, 공유, 기간 중 서버·터널 실행
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
│  │     화면 사용: 수형도(보상)+관계 유형 그래프, 1단계 `/dialogue/lab/analysis` 구현  D-0183
│  │     다음: 사용자 화면 확인 → 2단계(요약 직후 판정, 시간·비용 승인)
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
├─ SNS 독해력 진단평가 모드 — 결과 화면·맛보기 추천에 사고 패턴 분석 활용     D-0200
│  ├─● ⑥ 설계 확정(D-0204·D-0205·D-0207·D-0208), 백엔드(인계 A) 구현·검토 완료  D-0208
│  │     학생용 표현 확정(비틂 14종·관계 4갈래, 반말)                        D-0209
│  │     화면(인계 B) `/diagnostic` 구현·검토 완료(가짜 평가기, 외부 전송 없음)  CP 11-07
│  │     비용·대기 측정 1차: 1인 $0.5~1.2, 결과 정리 대기 20~70초 추정        CP 11-07
│  │     판정 과적합 실험 완료, 서버 검사 고침(커밋 7e4b9a8b)               D-0211
│  │     질문 규칙 방향 확정(인용·보기 출처 두 갈래·"표시한" 제한)          D-0212
│  │     판정 흐름 (나): 정답의 질 3단계·버튼 둘·정답 sol(진단만)·문항별 열기   D-0213
│  │     v5.9·v5.10 시험 완료, 채택 후보 v5.10 하나, lab은 v5.8 보류     D-0214·D-0216
│  │     질문 블라인드 판정 v5.9 4/5 우세 → 진단 기본값 v5.10 전환(11-10)   D-0216
│  │     다음: 진단 실사용으로 관대 오판 관찰, 뒤에 lab을 진단 방식으로      Q-0044
│  │     사용 메모 1~4 반영: 입력창 안 제출 확정·결론 버튼                  D-0226
│  │     소거법: [소거법] 버튼·근거 불충분-소거법 기록 구현                   D-0228·Q-0047
│  │     L 재측정 보류(사용자). 다음: 학생 관점 검토의 결과 표현·집계 논의(Q-0048), 대기 줄이기 판단. 공개 전: 바뀐 내용 문장·추천 대응표·훈련 서비스 주소·복사 기준
│  └─✓ 기본 세트 E 16문항 자료 완성(판정 묶음·분석 골드·선지 연결 동결)     D-0201
│
├─ 골드 기반 문항·지문 생성 실험 — 시중 AI 생성보다 정확한 문항, 기출 대체 지문    D-0206
│  ├─✓ E1 문항 생성 — 닫음: 정확성 천장, 골드 이점 없음, 깊이 기출의 2/3     D-0206·D-0210
│  ├─○ E2 지문 대체 생성 — 보류                                           D-0210
│  ├─✗ 원리 적용형 P1 — 중단된 실험: 상황이 값을 직접 줘 산수, a·b 겹침       D-0215·D-0230
│  ├─● 깊은 〈보기〉 문항 — 출제자 시뮬레이션 규칙 + API 파이프라인          D-0229·D-0231
│  │     골드 지도 탐색 → 선별 → 〈보기〉 조립 → 풀이 검증, 방향 확정(promising)
│  │     다음: 지시문 v3 → 새 과학 지문 → 스크립트화(계산 양식 규칙은 후보)
│  └─○ 다른 유형 생성기·큰 표본 유형 범주화 — 난이도 축은 Q-0046          D-0220
│
└─○ 문항 골드 — 오프라인 감사·회귀용으로만 보관                              CP-C

● 진행 중  ○ 보류·대기  ✓ 확정  ✗ 폐기  ? 미해결 질문
```

## 근거

| 표기 | 연결 |
|---|---|
| D-0013 | [문단 선택적 보완 V4](./decisions/D-0013-paragraph-optional-revision-v4.md)(학생용 기본값 지위는 D-0202로 폐기) |
| D-0138 | [문단 요약 근본 검토](./decisions/D-0138-paragraph-fundamental-review-question-quality-first.md), [질문 비교 묶음](../docs/experiments/question-quality-h0-vs-v4-2026-10-15/README.md), [D-0139 질문 규칙](./decisions/D-0139-paragraph-simple-format-question-rules.md), [D-0140 개발자 모드](./decisions/D-0140-paragraph-simple-holistic-dev-mode.md) |
| D-0090 | [v5 명칭](./decisions/D-0090-problem-evaluator-v5-naming.md) |
| CP-I | [K4 확인 단계 실험](./checkpoints/2026-10-27-k4-blank-probe.md), [보고](../docs/experiments/k4-blank-probe-2026-10-27/REPORT-human.md) |
| D-0182 | [v5.3 보강판 채택](./decisions/D-0182-problem-feedback-v53-three-cell-adopted.md) |
| D-0185 | [판정 v5.6 선지 읽기 보강](./decisions/D-0185-judge-reading-added-vs-stronger-v56.md), [보고](../docs/experiments/judge-reading-paraphrase-d1-2026-10-28/REPORT-human.md) |
| D-0188 | [판정 v5.7-2 교정 질문](./decisions/D-0188-problem-feedback-v57-2-direct-questions.md), [보고](../docs/experiments/v57-regression-2026-10-29/REPORT-human.md) |
| D-0206 | [골드 기반 생성 실험 설계](./decisions/D-0206-gold-based-item-generation-experiment-design.md), [설계 문서](../docs/handoffs/2026-11-06-gold-based-generation-experiment.md), [E1 구현 인계](../docs/handoffs/2026-11-06-e1-item-generation-implementation.md), [지도 회차 간 천장](../docs/experiments/map-run-agreement-2026-11-06/REPORT-human.md) |
| D-0201 | [세트 E](./decisions/D-0201-sns-diagnostic-set-e.md), [제작 절차](../docs/SNS-DIAGNOSTIC-SET-PROCEDURE-2026-11-05.md), [골드·선지 연결](../docs/experiments/sns-diagnostic-gold-2026-11-05/choice-link/FROZEN.md) |
| D-0200 | [SNS 진단평가 모드 방향](./decisions/D-0200-sns-diagnostic-mode-result-screen-direction.md), [웹 에이전트 결과](../docs/reports/REPORT-learner-analysis-usage-web-result.md), [선택률 대응 확인](../docs/experiments/megastudy-rate-coverage-2026-11-05/README.md) |
| D-0199 | [terra 대 sol 비교·sol 유지](./decisions/D-0199-keep-sol-over-terra-61.md), [보고](../docs/experiments/terra-vs-sol-2026-11-04/REPORT-human.md) |
| D-0195·D-0196 | [판정기 형식 실수 정리](./decisions/D-0195-judge-format-slip-normalization.md), [인계](../docs/handoffs/2026-11-03-judge-format-slip-normalization.md), [회사법 ② 결함 문항](./decisions/D-0196-corporate-law-q13-c2-defective-choice.md) |
| D-0194 | [마지막 설명 v2.2 연결](./decisions/D-0194-end-explanation-layout-v22-default.md), [보고](../docs/experiments/end-explanation-paragraph-marks-v22-2026-11-02/REPORT-human.md), [체크포인트](./checkpoints/2026-11-02-end-explanation-v22-wired.md) |
| D-0184 | [마지막 설명 레이아웃 v1](./decisions/D-0184-end-explanation-layout-v1-adopted.md), [보고](../docs/experiments/end-explanation-layout-2026-10-28/REPORT-human.md) |
| CP-H | [v5.3 보강 재실행](./checkpoints/2026-10-27-k4-v53-stage3-rerun.md), [보고](../docs/experiments/v53-three-cell-check-2026-10-27-b/REPORT-human.md) |
| CP-G | [v5.3 실측 중단](./checkpoints/2026-10-27-k4-v53-stage2-live.md), [보고](../docs/experiments/v53-three-cell-check-2026-10-27/REPORT-human.md) |
| D-0177 | [문제 판정 v5.1 coaching 제거](./decisions/D-0177-problem-feedback-v51-drop-unused-coaching.md), [회귀 보고](../docs/experiments/v5-diverse-48-regression-2026-10-26/REPORT-human.md) |
| D-0202 | [지금의 학생용 폐기](./decisions/D-0202-current-student-version-discarded.md) |
| D-0176 | [학생용 전환 순서](./decisions/D-0176-student-switch-roadmap-pilot-before-expansion.md), [coaching 정리 인계](../docs/handoffs/2026-10-26-problem-feedback-coaching-field-cleanup.md) |
| D-0191 | [문단 빈 곳 답 관대 판정 수용](./decisions/D-0191-paragraph-gap-answer-lenient-judgment-accepted.md), [학생 시뮬레이션 보고](../docs/experiments/student-sim-2026-10-30/REPORT-human.md) |
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
| D-0183 | [문단 분석 화면 사용](./decisions/D-0183-paragraph-analysis-ui-tree-and-relation-graphs.md), [1단계 인계](../docs/handoffs/2026-10-27-paragraph-analysis-view-stage1.md), [1단계 체크포인트](./checkpoints/2026-10-27-paragraph-analysis-view-stage1.md) |
| D-0181 | [오류 분류 두 축](./decisions/D-0181-problem-error-taxonomy-two-axes-later.md), [대응표](../docs/review/problem-error-taxonomy-crosswalk-2026-10-27.md) |
| D-0112 | [v5 개발자 경로 종료 상태](./decisions/D-0112-v5-developer-path-connection-end-states.md), [연결 기록](./checkpoints/2026-10-10-v5-developer-path-connected.md) |
| Q-0032·Q-0033·Q-0034·Q-0036·Q-0042·Q-0043 | [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md) |
| D-0132·D-0133 | [판정기 V4 유지](./decisions/D-0132-paragraph-judge-keep-v4.md), [경계 규칙 (나″)](./decisions/D-0133-paragraph-boundary-rule-na-double-prime.md) |
| D-0134~D-0137 | [개발자 모드](./decisions/D-0134-boundary-show-dev-mode-central-object.md), [오류 축마다 질문](./decisions/D-0135-boundary-show-error-question-per-axis.md), [반말](./decisions/D-0136-boundary-show-banmal-question-feedback.md), [effectiveResponse](./decisions/D-0137-boundary-show-effective-response-restatement.md) |
| CP-A | [두 단계 생성 v3에서 멈춤](./checkpoints/2026-10-08-two-stage-paused-at-v3.md) |
| CP-B | [종료 코칭 수정 확인 시험](./checkpoints/2026-10-10-v5-coaching-fix-test.md) |
| CP-C | [`WORKSTREAM-STATE.md` 문제 골드 절](../docs/WORKSTREAM-STATE.md) (2026-09-08 결정, 역사 자료) |
| CP-E | [보여 주기 개발자 모드 첫 사용](./checkpoints/2026-10-15-boundary-show-dev-mode-first-use.md) |
| CP-F | [K4 판정 재설계 논의](./checkpoints/2026-10-27-k4-judgment-redesign-discussion.md), [논의 메모](../docs/reports/REPORT-k4-v51-judgment-review-human.md) |
| CP-D | [실모델 확인](./checkpoints/2026-10-11-v5-live-connection-test.md), [48개 세션 기록](./checkpoints/2026-10-12-v5-diverse-48-recorded.md) |
| CP-J | [원리 적용형 설계 시작](./checkpoints/2026-11-07-principle-application-start.md), [E1 v3 작동 방식 사례](../docs/reports/e1-v3-mechanism-walkthrough-2026-11-07.md) |
| D-0229 | [깊은 〈보기〉 문항 생성](./decisions/D-0229-deep-bogi-item-generation-gold-map-search.md), [법인 출제자 시뮬레이션](../docs/handoffs/2026-11-11-examiner-simulation-corporate-law-rules.md), [계산 양식 규칙](../docs/handoffs/2026-11-11-calculation-format-rules.md), [API 법인](../docs/experiments/gold-search-api-2026-11-11/KEY.md), [API 인문 3지문](../docs/experiments/gold-search-api-batch2-2026-11-11/REVIEW.md) |
| D-0230 | [P1 중단](./decisions/D-0230-p1-principle-application-generation-stopped.md), [P1 결과](../docs/experiments/principle-application-pilot-2026-11-09/REPORT-p1-human.md), [검토본](../docs/experiments/principle-application-pilot-2026-11-09/REVIEW-p1-items.md) |
| D-0216 | [v5.10 단일 후보·진단 먼저·lab 보류](./decisions/D-0216-v510-single-candidate-diagnostic-first-lab-held.md) |

## 갱신 규칙

- 갈래의 상태나 다음 한 단계가 바뀐 작업은 끝날 때 이 파일과 맨 위 갱신 날짜를 함께 고친다.
- 노드는 결정 기록이 생겼거나 독립적으로 진행·보류될 수 있는 갈래만 만든다. 실험 한 번은 노드가 아니다.
- 완료·폐기된 갈래는 한 줄로 접고 하위 노드를 지운다. 이력은 결정 기록과 체크포인트에 남는다.
- 근거 표의 링크는 `node scripts/validate-memory.mjs`가 검사한다.
