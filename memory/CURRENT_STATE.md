# 현재 프로젝트 상태

이 문서는 **지금 참인 것만** 담고 20KB 이하로 유지한다([D-0171](./decisions/D-0171-session-usage-rules.md)). 변경 과정·과거 수치는 결정 기록·체크포인트·실험 보고서에서 찾는다. 2026-10-24 정리 전 전문: [`CURRENT_STATE-ARCHIVE-2026-10-24.md`](./CURRENT_STATE-ARCHIVE-2026-10-24.md). 작업 갈래: [`WORK_TREE.md`](./WORK_TREE.md) · 출처 지도: [`INDEX.md`](./INDEX.md)(소제목 먼저 읽기).

- 상태 정본 버전: 1
- 프로젝트 단계: 학생용 연결 UI 준비 완료 / 사용자 직접 전 구간 사용 완료 / 외부 학생 검증 대기. 첫 집중 타겟은 상위권 중등([D-0125](./decisions/D-0125-first-target-top-tier-middle-school.md)). 지문 고1 학평 확장은 합의만, 작업 미정. 보상 구조는 보류(Q-0035).
- 작업 규칙(지시 확인 D-0069, 업무 분장 D-0128, 실행 주체 명칭 D-0169, 보고 형식 D-0163, 기존 자료 재활용 D-0168, 사용량 절감 D-0171)은 `AGENTS.md`에 있다.

## 목표

수능 국어 비문학 학습에서 학생이 원문의 핵심 관계를 스스로 파악하도록 돕는다. 제품에는 문단 자유 요약 대화와 객관식 문제 풀이 대화가 있으며, 정답을 대신 말하는 것보다 학생이 실제로 이해를 수정했는지를 확인하는 데 초점을 둔다.

## 문제 풀이 대화

- 학생용 기본값은 v3(2026-09-11 사용자 승인·고정). v2는 과거 회귀·비교용으로만 보존한다. 정책: [`PS-PROBLEM-SOURCE-DIRECT-V1`](../docs/PROBLEM-SOLVING-SOURCE-DIRECT-OPERATIONAL-POLICY-2026-09-08.md).
- 운영 후보는 **v5**([D-0090](./decisions/D-0090-problem-evaluator-v5-naming.md): 'v3 기반 v4 후보'의 이름, v4는 운영 후보 아님, 파일·코드 이름은 그대로). 상태: `V3_STUDENT_DEFAULT / V4_DEVELOPER_UI_LIVE / REAL_STUDENT_USE_PENDING`. 학생용 전환은 개발자 경로 확인 뒤 별도 승인이 필요하다.
- v5 구성: 해석본 없는 methods 조성. 기호 해석본 사용은 luna·sol 기호 오독 확인 전까지 보류([D-0114](./decisions/D-0114-v5-current-composition-methods-without-gloss.md)). 기호 해석본 파이프라인 v2는 완성돼 있으나 v5에 미포함([D-0093](./decisions/D-0093-v5-composition-auto-gloss-pipeline.md)).
- 판정 모델: 선택 정오 라우팅, 정답 luna·오답 sol([D-0104](./decisions/D-0104-problem-evaluator-model-routing-by-choice.md)), 세션 안 배정([D-0107](./decisions/D-0107-session-model-routing-repair-reselect-coaching.md)). Gemini 가격 재확인([D-0129](./decisions/D-0129-keep-luna-sol-over-gemini-after-price-check.md))과 DeepSeek 1017 재시험([D-0165](./decisions/D-0165-keep-luna-sol-over-deepseek-1017.md)) 뒤에도 유지. DeepSeek 오답 자리는 미측정.
- 교정·피드백 규칙: 교정은 국소 오류만 판정([D-0108](./decisions/D-0108-repair-judges-local-error-only.md)), 교정 질문은 선지 정오를 가르는 관계까지([D-0105](./decisions/D-0105-correction-question-covers-choice-deciding-relation.md)), 교정 뒤 "다시 선택"/"코칭 보기" 버튼([D-0106](./decisions/D-0106-post-repair-choice-reselect-or-coaching.md)), 학생용 문장 반말([D-0116](./decisions/D-0116-student-facing-tone-banmal.md)), 선택 충돌 인용은 충분성 인용 가능([D-0164](./decisions/D-0164-selection-mismatch-quote-allowed-as-sufficiency.md)), "원문에 없음" 근거는 반박 여부로 판정([D-0166](./decisions/D-0166-absence-rationale-by-refutation.md)).
- 개발자 경로 `/problem/dev/v4`에 v5·라우팅·교정 후 버튼·별도 종료 설명이 연결돼 있다([D-0112](./decisions/D-0112-v5-developer-path-connection-end-states.md)). 최신 48세션 회귀(2026-10-22, [판정 기록](../docs/experiments/v5-diverse-48-regression-2026-10-22/REVIEW.md))는 D-0156·D-0157·D-0159·D-0161·D-0164 반영 뒤 역할별 최종 결과가 10-12와 같다. 가상 답변이라 실제 학생 검증이 아니다.
- 다음 할 일: UI 메모장 30번 논의(16번 정답 피드백 규칙). 리마인드: luna 자신의 기호 오독(S2-r3) 해결 방식(Q-0030).
- 선택형 출제자 전략 피드백([D-0170](./decisions/D-0170-optional-examiner-strategy-feedback.md)): 동결본 truth FALSE 선지 57편을 sol·지시문 v4로 생성하고 코드 에이전트 검토(골드 수정 4, 재생성 통과)까지 마쳤다([FINAL.json](../docs/experiments/examiner-strategy-2026-10-23/FINAL.json)). 개발자 화면 연결 [인계](../docs/handoffs/2026-10-24-examiner-strategy-ui.md) 작성(2026-10-24). 사용자 표본 이해 용이성 판정은 남아 있다.
- 마지막 설명에 선지 연결 좌표를 넣는 안은 차이가 없어 운영 미반영 확정([D-0167](./decisions/D-0167-choice-link-end-explanation-comparison.md)).
- 구조화 문제 골드는 학생용 런타임 입력과 실행 조건으로 쓰지 않는다. 모든 런타임 단계는 완전한 원문·문항·선지·정답·공식 해설·원자료 이미지를 직접 쓴다.
- 명시적 오류는 교정하고, 불충분하거나 모호한 근거는 진단한다.
- 정책·코드 불일치: 정책 문서는 '코칭 후 종료'인데 현행 코드는 1·2차 오답의 질문 한도 소진 시 현재 선지 코칭 확인 뒤에도 재선택한다. 코드·회귀 정의를 근거로 현행 동작을 구분한다([확인 기록](./checkpoints/2026-10-01-problem-feedback-policy-runtime-discrepancy.md)).
- 인용·상태 계약 오류는 학생 선택·근거·후속 답변을 보존한 `EVALUATION_ERROR`에서 자동 1회와 수동 재개가 가능하다.

## 문단 요약 대화

- 학생용 기본값은 V4(`PS-DIALOGUE-STUDENT-AGENCY-V4`, [D-0013](./decisions/D-0013-paragraph-optional-revision-v4.md), [정책](../docs/PARAGRAPH-SUMMARY-DIALOGUE-OPERATIONAL-POLICY-V4-2026-09-19.md)). 소스·빌드 기본값: `axis-dialogue-selective-v4`, 1차 `central-story-gate-prompt-v4-claims-v2`, 2차 `dialogue-selective-feedback-prompt-v4-guide-v1`. 판정기 V4 유지([D-0132](./decisions/D-0132-paragraph-judge-keep-v4.md)).
- V4 동작: 불필요한 개입 최소화, OK는 확인된 부분만 공개·자동 질문 없음. SERIOUS/ERROR는 질문을 제시하지만 모든 상태에서 진행 선택 가능, SKIPPED와 기존 판정을 함께 보존하며 PASS로 승격하지 않는다. 모든 문단이 완료·진행되면 문제를 연다. 질문은 최대 3회, 후속 응답을 누적해 다시 판정한다.
- 통과 기준은 중심축 description에 표현된 의미뿐이다. 원문은 의미 해석·학생 주장 사실 확인용 보조자료이며 새 통과 조건을 만들 수 없다.
- 청킹·압축 측정과 보상·처벌은 보류([D-0012](./decisions/D-0012-paragraph-compression-measurement-deferred.md)).
- **근본 검토 중**([D-0138](./decisions/D-0138-paragraph-fundamental-review-question-quality-first.md)): 축 구조 전제를 재검토한다. 단순 형식+질문 규칙 4가 후보([D-0139](./decisions/D-0139-paragraph-simple-format-question-rules.md)), 검증은 사용자 직접 사용감 기록([D-0140](./decisions/D-0140-paragraph-simple-holistic-dev-mode.md)). 사용감 메모로 v2·v3·v4(D-0142·D-0144·D-0145) 구현·검토 완료, 판정 모델 luna. 다음: v4로 사용자 직접 사용, 메모 6(이미 말한 관계 GAP) 재발 관찰.
- 보여 주기 개발자 모드(D-0134~D-0137)는 근본 검토가 끝날 때까지 구현 중지. 경계 규칙 방향은 (나″)([D-0133](./decisions/D-0133-paragraph-boundary-rule-na-double-prime.md)), 운영 미변경.
- 중심 이야기 2단계 골드 생성은 v3에서 멈춤(과적합 우려, 재개 여부 미정, [체크포인트](./checkpoints/2026-10-08-two-stage-paused-at-v3.md)). 원문 분할·JEV 흐름은 중단([D-0094](./decisions/D-0094-source-jev-gold-flow-stopped.md)). JEV 제품 적용은 `PARKED`([D-0036](./decisions/D-0036-jev-product-work-parked.md)).
- 축 묶임 문제는 [Q-0036](./OPEN_QUESTIONS.md)(gold-v2 미변경).

## 학습자 생각 진단·분석 지도

- 문단 분석 지도([D-0141](./decisions/D-0141-paragraph-analysis-map-direction.md)): 대화용 골드와 분리한 상향 위계 지도, 1회 생성 후 동결. 공손룡 기준선(판정 v3)과 도파민 일반화 기준 통과([D-0146](./decisions/D-0146-analysis-map-dopamine-generalization.md)). 관계 유형 4갈래 18유형([D-0147](./decisions/D-0147-relation-vocabulary-sampling.md)). 분석 골드 동결·입장은 코드 에이전트 검토로 운용([D-0158](./decisions/D-0158-analysis-gold-claude-review-without-further-calibration.md)), 동결 지도 6장. 학생 이해 지문 집계 규칙([D-0160](./decisions/D-0160-student-fingerprint-aggregation.md)), 학생별 18유형 칸은 표본 부족.
- 선지 연결 층([D-0162](./decisions/D-0162-choice-link-layer-direction.md)): 오프라인 진단용 먼저(D-0002 유지). 비틂 목록 확정, UI 6지문 동결 완료(120선지, [기록](./checkpoints/2026-10-22-choice-link-ui-freeze.md)).
- 사고 진단 v0.1([D-0111](./decisions/D-0111-thought-diagnosis-v0-experiment.md)): 가상 풀이 36/36·과잉 분류 0. 실시간 아닌 주기 실행·모델 sol 고정([D-0115](./decisions/D-0115-thought-diagnosis-periodic-sol.md)). 다음: 처음 보는 사례·실제 학생 풀이로 검증. 함정 강도·선택률 예측은 LLM·JEV 모두 실패해 목표를 재정의했다([D-0109](./decisions/D-0109-trap-map-v0-external-rate-experiment.md)). 큰 논의는 문단·문제 안정화 뒤 재개(Q-0034).

## 학생 상태 모델

- [D-0048](./decisions/D-0048-student-state-model-next-goal.md)에 따라 V1 코어·증거 JSONL·7/30/90일 피드백·개발자 리포트 UI·기본 비활성 학생 `/progress` 프리뷰를 구현했다([완료 감사](../docs/STUDENT-STATE-MODEL-V1-COMPLETION-AUDIT.md)).
- 학생 피드백 플래그를 켜도 기본은 loopback Host에서만 열리고, 공개 Host는 두 번째 명시 플래그가 필요하다. 출처 없는 과거 로그는 백필하지 않는다.
- 남은 것: 최신 서버 재시작 뒤 새 형식 실제 로그, 학생 문구·주기 승인, 공개 노출 별도 결정. 단일 능력 점수·적응형 제시는 미승인.

## 골드 자산

- 문단 골드 운영 생산 기준선 `PG-PROD-BATCH004-AUDIT-V1`: 11지문·60문단(독립 감사 PASS 57·사람 판정 승인 3). 이 60문단은 웹앱에 연결되지 않았다. 웹앱은 별도 `gold-v2` fixture 31개를 읽는다. 미처리 80문단 생산과 감사 고도화는 `PARKED`.
- 개발자 UI용 생성 흐름 명칭: 중심 이야기 기반 L1·L2 공동 생성([D-0073](./decisions/D-0073-current-gold-generation-name.md)), 자산 `conditional-meta-gold-v1`.
- 문항 골드: `PARKED_OFFLINE`. 후보 23개 모두 사람 검토 `PENDING`, 승인·웹앱 연결 0개. 공식 해설 없이 생성돼 교차 검증 골드가 아니다. 오프라인 감사·회귀 기대값·검토·비교 연구에만 쓴다.

## 웹 흐름·서버

- 학생용 `/dialogue`는 연결 가능한 6개 지문을 제공한다. 웹 루트 `/`는 `/dialogue`로 간다. 이전 문단 훈련 UI는 `/legacy`에 보존한다.
- 개발자 화면: `/dialogue/dev`(문단), `/problem/dev/v4`(문제, v4 API는 5175 분리 실행). 앞으로 URL은 개발자 화면만 안내하며 학생용 UI는 개발자 UI 확정 전 수정하지 않는다([D-0031](./decisions/D-0031-developer-ui-url-only.md)).
- Cloudflare Named Tunnel `csat-dialogue` → `https://dialogue.cogaxis.net`. 상시 서버는 보류. 로컬 ingress 파일이 없어 `--url http://127.0.0.1:5173`이 필요하고, 자동 시작 미등록이라 프로세스가 살아 있어야 한다. 인증 없는 골드·내부 판정 공개는 기존 사용자 승인 범위다. 인증·서버 재시작 복원은 미완료.
- 2026-09-12 사용자가 학생 역할로 6지문·30문단·연결 문항 6개를 직접 수행했다(문단 최종 PASS 30/30, 문제 최종 정답 6/6). UI 실사용 자료이지 외부 학생 효과 자료가 아니다.

## 검증된 핵심 결론

- 자유형 문단 요약의 기본 채점축은 세부 개수가 아니라 핵심 의미 관계의 보존 여부다.
- 문제 풀이 최초 판정 비교에서는 원문 직접 방식이 간결·상세 문제 골드 방식보다 품질, 지연, 비용, 학생 발화 보존 측면에서 가장 나았다.
- 문단 요약에서는 원문 직접 방식보다 간결 골드가 부분 누락을 더 잘 포착했다. 상세 골드는 저정보 응답의 다음 질문 대상을 고르는 데 도움이 되지만, 전면 사용하면 질문 누출과 과도한 개입을 늘린다.
- 문단 골드 통합 감사 v2 계열은 정상 대조군 과잉 판정과 비용 증가로 운영 기준선으로 승격하지 않았다.

## 현재 우선순위

1. 실제 학생 사용성·학습 흐름 확인과 지문·문항 세트 확장. 반복되거나 학습을 방해하는 실패만 일반화된 수정으로 연결한다.
2. 문단: 단순 형식 v4 사용자 직접 사용(근본 검토).
3. 문제: 개발자 경로 메모장 논의, 출제자 전략 화면 연결.
4. 학생 상태 모델: 남은 승인 항목(위 절).

## 금지선

- 구조화 문제 골드를 별도 비교와 사용자 결정 없이 학생용 런타임에 다시 넣지 않는다.
- 문제 골드의 오프라인 확대와 런타임 입력 필요성을 같은 결정으로 취급하지 않는다.
- 문단 골드 60개를 웹앱에 이미 배포된 자산으로 표현하지 않는다.
- 통합 감사 v2나 원칙–예외 판정기 실험을 현재 운영 감사로 표현하지 않는다.
- 실제 학생 데이터가 없는 합성 실험을 학습 효과의 증거로 표현하지 않는다.
- 명제 evidence와 `argumentCoverage`를 기본 점수로 사용하지 않는다.

## 가장 큰 잔여 위험

- 외부 실제 학생 데이터가 없고, 생성기·평가기·심사자가 같은 모델 계열인 합성 실험이 대부분이다.
- 문제 풀이 표본과 문단 요약 표본이 작고 지문 안에서 군집되어 있다.
- 실제 학생의 회피, 부분 답변, 새 오류 같은 후속 행동에서 회복률이 확인되지 않았다. 도움 없이 새 지문으로 전이되는지, 효과가 유지되는지도 확인되지 않았다.
- 정답 선택 학생의 짧은 관련 소재를 충분한 근거로 보충하거나, 설명에서 충돌을 찾고도 `CLEAR_ERROR` 대신 `UNCERTAIN`으로 내리는 사례가 있다.
- 동일 프롬프트·모델·응답에서도 경계 응답의 `SUPPORTED`/`UNCERTAIN`과 진단 질문 전제가 실행마다 달라질 수 있어, 단일 샘플 통과만으로 경계 안정성을 보장하기 어렵다.
- 부정 발문에서 오답 선지 선택을 선지 내용에 대한 동의처럼 해석하면, 내용 오해가 남았는데도 `SELECTION_EXECUTION`과 `CORRECTED`로 승격하고 재선택 뒤 전체 회복으로 집계할 수 있다([사례](./checkpoints/2026-10-01-information-asymmetry-q13-user-review.md)).
- 문단 게이트 계약 오류 자동 재시도 경로는 코드 회귀로만 확인했고, 실제 운영 표본에서 재시도 회복률은 측정하지 않았다.

## 현재 근거

- [`문제 풀이 원문 직접 운영 정책`](../docs/PROBLEM-SOLVING-SOURCE-DIRECT-OPERATIONAL-POLICY-2026-09-08.md)
- [`문단 요약 대화 운영 정책 V4`](../docs/PARAGRAPH-SUMMARY-DIALOGUE-OPERATIONAL-POLICY-V4-2026-09-19.md)
- [`판정·피드백 실험 종합`](../docs/experiments/TEST-SYNTHESIS-2026-09-09.md)
- [`문단 골드 자산 원장`](../docs/PARAGRAPH-GOLD-ASSET-REGISTER-2026-09-09.md)
- [`문항 골드 자산 원장`](../docs/PROBLEM-GOLD-ASSET-REGISTER-2026-09-09.md)
- [`문제 풀이 v3 전체 회귀`](../docs/experiments/problem-source-direct-v3-targeted-canary-2026-09-11/FULL-REGRESSION-REPORT.md)
