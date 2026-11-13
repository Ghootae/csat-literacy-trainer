# 현재 프로젝트 상태

이 문서는 **지금 참인 것만** 담고 20KB 이하로 유지한다([D-0171](./decisions/D-0171-session-usage-rules.md)). 변경 과정·과거 수치는 결정 기록·체크포인트·실험 보고서에서 찾는다. 2026-10-24 정리 전 전문: [`CURRENT_STATE-ARCHIVE-2026-10-24.md`](./CURRENT_STATE-ARCHIVE-2026-10-24.md). 작업 갈래: [`WORK_TREE.md`](./WORK_TREE.md) · 출처 지도: [`INDEX.md`](./INDEX.md)(소제목 먼저 읽기).

- 상태 정본 버전: 1
- 프로젝트 단계: 학생용 연결 UI 준비 완료 / 사용자 직접 전 구간 사용 완료 / 외부 학생 검증 대기. 첫 집중 타겟은 상위권 중등([D-0125](./decisions/D-0125-first-target-top-tier-middle-school.md)). 지문 고1 학평 확장은 합의만, 작업 미정. 보상 구조는 보류(Q-0035).
- 작업 규칙(지시 확인 D-0069, 업무 분장 D-0128, 실행 주체 명칭 D-0169, 보고 형식 D-0163, 기존 자료 재활용 D-0168, 사용량 절감 D-0171)은 `AGENTS.md`에 있다.

## 목표

수능 국어 비문학 학습에서 학생이 원문의 핵심 관계를 스스로 파악하도록 돕는다. 제품에는 문단 자유 요약 대화와 객관식 문제 풀이 대화가 있으며, 정답을 대신 말하는 것보다 학생이 실제로 이해를 수정했는지를 확인하는 데 초점을 둔다.

## 문제 풀이 대화

- **지금의 학생용은 폐기**([D-0202](./decisions/D-0202-current-student-version-discarded.md), 기록 수준·코드 유지): 문제 v3·문단 V4·학생용 화면은 기준이 아니다. 개발자 경로가 정본이고, 학생용은 확정된 개발자용을 고쳐 새로 만든다.
- 운영 후보는 **v5**([D-0090](./decisions/D-0090-problem-evaluator-v5-naming.md): 'v3 기반 v4 후보'의 이름, 파일·코드 이름은 그대로). 실제 학생 사용 전.
- v5 구성: 해석본 없는 methods 조성. 기호 해석본 사용은 luna·sol 기호 오독 확인 전까지 보류([D-0114](./decisions/D-0114-v5-current-composition-methods-without-gloss.md)). 기호 해석본 파이프라인 v2는 완성돼 있으나 v5에 미포함([D-0093](./decisions/D-0093-v5-composition-auto-gloss-pipeline.md)).
- 판정 모델: 선택 정오 라우팅, 정답 luna·오답 sol([D-0104](./decisions/D-0104-problem-evaluator-model-routing-by-choice.md)), 세션 안 배정([D-0107](./decisions/D-0107-session-model-routing-repair-reselect-coaching.md)). Gemini·DeepSeek·terra 시험 뒤에도 유지(D-0129·D-0165·D-0192·D-0199).
- 교정·피드백 규칙: 교정은 국소 오류만 판정([D-0108](./decisions/D-0108-repair-judges-local-error-only.md)), 교정 질문은 선지 정오를 가르는 관계까지([D-0105](./decisions/D-0105-correction-question-covers-choice-deciding-relation.md)), 교정 뒤 "다시 선택"/"코칭 보기" 버튼([D-0106](./decisions/D-0106-post-repair-choice-reselect-or-coaching.md)), 학생용 문장 반말([D-0116](./decisions/D-0116-student-facing-tone-banmal.md)), 선택 충돌 인용은 충분성 인용 가능([D-0164](./decisions/D-0164-selection-mismatch-quote-allowed-as-sufficiency.md)), "원문에 없음" 근거는 반박 여부로 판정([D-0166](./decisions/D-0166-absence-rationale-by-refutation.md)).
- 판정 지시문은 `source-direct-problem-feedback-v5.8.md`(`promptVersion: problem-feedback-v5.8`, [D-0190](./decisions/D-0190-problem-feedback-v58-default.md)): v5.7-2([D-0188](./decisions/D-0188-problem-feedback-v57-2-direct-questions.md), 교정 질문 직접형)에 ground를 반박 단계까지·holds는 논리만·정의 한 번 적용 규칙을 더함. 2026-10-29 회귀 18세션 17 같음·1 흔들림. K4는 결함 문항으로 닫음(D-0196). v5.1·v5.3~v5.7-2는 재현용.
- 개발자 경로 `/problem/lab`([D-0173](./decisions/D-0173-problem-lab-version-free-code-names.md), 작동 순서 [문서](../docs/PROBLEM-LAB-FLOW-2026-10-24.md))에 v5·라우팅·교정 후 버튼·별도 종료 설명이 연결돼 있다([D-0112](./decisions/D-0112-v5-developer-path-connection-end-states.md)). 최신 48세션 회귀: [판정 기록](../docs/experiments/v5-diverse-48-regression-2026-10-22/REVIEW.md)(가상 답변).
- 마지막 설명(M4) 기본값은 layout v2.2([D-0194](./decisions/D-0194-end-explanation-layout-v22-default.md)): 칸마다 문단 목록과 칠할 곳, 서버가 문장 단위 칠하기·겹침 지우기, 화면은 문단 넘기기([D-0193](./decisions/D-0193-end-explanation-paragraph-steps-with-marks.md)). 회사법 ②·XS-r1 선지 읽기 문장은 미해결. layout v1([D-0184](./decisions/D-0184-end-explanation-layout-v1-adopted.md))·v5.3은 재현용.
- 서버는 판정기 INSUFFICIENT를 SUPPORTED로 올리지 않는다(내리기만, [D-0189](./decisions/D-0189-server-never-raises-insufficient.md)). 충족 검사에서 근거 인용 안 선지 읽기는 원문 대조 요구에서 뺀다([D-0211](./decisions/D-0211-ground-choice-reading-excluded-from-consistent.md)).
- 판정기 형식 실수 두 종류(결론 문장 표시, 줄인 인용)는 서버가 고친다([D-0195](./decisions/D-0195-judge-format-slip-normalization.md)). 회사법 13번 ②는 선지 결함 문항, K4 닫음·선지 읽기 보류([D-0196](./decisions/D-0196-corporate-law-q13-c2-defective-choice.md)). luna 기호 오독(Q-0030)은 관찰([D-0197](./decisions/D-0197-luna-marker-misread-observe.md)).
- 선택형 출제자 전략 피드백([D-0170](./decisions/D-0170-optional-examiner-strategy-feedback.md)): FALSE 선지 57편 생성·검토 완료([FINAL.json](../docs/experiments/examiner-strategy-2026-10-23/FINAL.json)), 개발자 문제 화면 연결(커밋 `dc6c295`, 선지 직접 누르기 [D-0172](./decisions/D-0172-problem-ui-choice-direct-select.md)). 문제 세트 흐름은 별도 과제.
- 구조화 문제 골드는 학생용 런타임 입력과 실행 조건으로 쓰지 않는다. 모든 런타임 단계는 완전한 원문·문항·선지·정답·공식 해설·원자료 이미지를 직접 쓴다.
- 명시적 오류는 교정하고, 불충분·모호한 근거는 진단한다.
- 정책·코드 불일치: 정책 문서는 '코칭 후 종료'인데 현행 코드는 1·2차 오답의 질문 한도 소진 시 현재 선지 코칭 확인 뒤에도 재선택한다. 현행 동작은 코드·회귀 정의 기준([확인 기록](./checkpoints/2026-10-01-problem-feedback-policy-runtime-discrepancy.md)).
- 인용·상태 계약 오류는 `EVALUATION_ERROR`(학생 입력 보존)에서 자동 1회·수동 재개된다.

## 문단 요약 대화

- 옛 학생용 V4(골드 축 판정, D-0013)는 D-0202로 폐기. 판정기 V4 비교 기록은 [D-0132](./decisions/D-0132-paragraph-judge-keep-v4.md).
- 청킹·압축 측정과 보상·처벌은 보류([D-0012](./decisions/D-0012-paragraph-compression-measurement-deferred.md)).
- **운영 후보: 단순 형식**([D-0174](./decisions/D-0174-paragraph-simple-v47-operating-candidate.md)): 근본 검토(D-0138) 뒤 확정. 지시문 v4.8(`8b05f6dc`, 관대 판정 [D-0191](./decisions/D-0191-paragraph-gap-answer-lenient-judgment-accepted.md)), 판정 모델 luna(코드 기본값), 개발자 주소 `/dialogue/lab`(옛 `/dialogue/dev/simple` 넘김), 골드 미사용, 학생 상태 원장·문제 판정 미연결. 작동 순서 [문서](../docs/PARAGRAPH-LAB-FLOW-2026-10-25.md).
- 축 기반 쪽(개발자 화면 `/dialogue/dev`, 보여 주기 개발자 모드 D-0134~D-0137, Q-0036)은 단순 형식 채택으로 보류(D-0174). 코드 정리는 학생용을 새로 만들 때(D-0202).
- 중심 이야기 2단계 골드 생성은 v3에서 멈춤(과적합 우려, 재개 여부 미정, [체크포인트](./checkpoints/2026-10-08-two-stage-paused-at-v3.md)). 원문 분할·JEV 흐름은 중단([D-0094](./decisions/D-0094-source-jev-gold-flow-stopped.md)). JEV 제품 적용은 `PARKED`([D-0036](./decisions/D-0036-jev-product-work-parked.md)). 근거 작성 중 신호 탐색 2회(충분성·선택 확률 이동)도 보류([Q-0040](./OPEN_QUESTIONS.md), [체크포인트](./checkpoints/2026-10-30-jev-choice-shift-parked.md)).
- 축 묶임 문제는 [Q-0036](./OPEN_QUESTIONS.md)(gold-v2 미변경).

## 학습자 생각 진단·분석 지도

- 문단 분석 지도(지문을 명제→묶음→요지로 쌓은 동결 지도에 학생 요약을 대어 무엇을 잡고 놓쳤는지 기록, [D-0141](./decisions/D-0141-paragraph-analysis-map-direction.md)): 대화용 골드와 분리한 상향 위계 지도, 1회 생성 후 동결. 공손룡 기준선(판정 v3)과 도파민 일반화 기준 통과(D-0146). 관계 유형 4갈래 18유형(D-0147). 분석 골드 동결·입장은 코드 에이전트 검토로 운용(D-0158), 동결 지도 6장. 학생 이해 지문 집계 규칙([D-0160](./decisions/D-0160-student-fingerprint-aggregation.md)), 학생별 18유형 칸은 표본 부족. 화면 사용([D-0183](./decisions/D-0183-paragraph-analysis-ui-tree-and-relation-graphs.md)): 수형도(마지막 차례, 보상)+관계 유형 그래프(첫 차례, 진단). 1단계 개발자 화면 `/dialogue/lab/analysis` 구현. 다음: 사용자 화면 확인 → 2단계(요약 직후 판정, 시간·비용 측정 승인).
- 선지 연결 층([D-0162](./decisions/D-0162-choice-link-layer-direction.md)): 오프라인 진단용 먼저(D-0002 유지). 비틂 목록 확정, UI 6지문 동결 완료(120선지, [기록](./checkpoints/2026-10-22-choice-link-ui-freeze.md)).
- 사고 진단 v0.1(풀이 이유 문장으로 무너진 단계·걸린 함정 판정, [D-0111](./decisions/D-0111-thought-diagnosis-v0-experiment.md)): 학생이 쓴 선택 이유로 다섯 단계(발문·선지 해석·근거 위치·근거 해석·대조) 중 처음 실패한 단계와 함정 유형 12종을 판정하고, 근거가 없으면 판단 불가로 둔다. 가상 풀이 36/36·과잉 분류 0. 실시간 아닌 주기 실행·모델 sol 고정([D-0115](./decisions/D-0115-thought-diagnosis-periodic-sol.md)). 다음: 처음 보는 사례·실제 학생 풀이로 검증. 함정 강도 예측은 실패(D-0109). 활용 논의는 D-0200으로 재개.
- 정답 경로 분석(문항마다 정답에 이르는 노드 지도를 만들고, 학생이 어느 노드·요소에서 틀렸는지 기록, [D-0119](./decisions/D-0119-answer-path-elements-and-depth.md)·[D-0121~D-0124](./decisions/D-0124-answer-path-element-override-on-evidence.md)): sol이 문항 지도(READ·LINK·APPLY 노드, 요소 E1~E10)를 1회 생성·동결하고, 정답은 경로 전체 성공, 오답은 실패 노드·요소로 채점한다(추가 질문 없음). 깊이는 노드 수. sol 종단 검증 대체로 양호(실패 종류 17/20, 3회 일관성 33/35, [기록](./checkpoints/2026-10-14-answer-path-sol-e2e-results.md)). 다음: 실제 학생 풀이, 여러 문항에서 노드 분할 일관성.
- 활용 방향([D-0200](./decisions/D-0200-sns-diagnostic-mode-result-screen-direction.md), 방향만): SNS 진단평가 모드를 따로 두고 결과 화면(내 위치 → 풀이 결과[정답의 질·무너진 단계 경향·걸린 비틂] → 독해 패턴)과 맛보기 추천에 쓴다. 선택률은 DB 752문항 모두 메가스터디 회차와 대응, 미수집. 원래 수치 공개·위치만 보정(D-0203).
- 문제 쪽 오류 분류([D-0181](./decisions/D-0181-problem-error-taxonomy-two-axes-later.md)): 함정 태그 12종·요구 요소 E1~E10·비틂 14종을 지금은 [대응표](../docs/review/problem-error-taxonomy-crosswalk-2026-10-27.md)로 묶는다. 실제 학생 풀이로 재검증할 때 내용 축(비틂 14종)·과정 축(읽기 과정 7가지)으로 재구성한다.

## 학생 상태 모델

- V1은 폐기, 논의에서 제외([D-0180](./decisions/D-0180-student-state-model-v1-discarded.md)). 구현 코드는 그대로 두고(기본 비활성) 얇은 학생판 설계 때 정리를 함께 본다.

## 골드 자산

- 문단 골드 운영 생산 기준선 `PG-PROD-BATCH004-AUDIT-V1`: 11지문·60문단(독립 감사 PASS 57·사람 판정 승인 3). 이 60문단은 웹앱에 연결되지 않았다. 웹앱은 별도 `gold-v2` fixture 31개를 읽는다. 미처리 80문단 생산과 감사 고도화는 `PARKED`.
- 개발자 UI용 생성 흐름 명칭: 중심 이야기 기반 L1·L2 공동 생성([D-0073](./decisions/D-0073-current-gold-generation-name.md)), 자산 `conditional-meta-gold-v1`.
- 문항 골드: `PARKED_OFFLINE`. 후보 23개 모두 사람 검토 `PENDING`, 승인·웹앱 연결 0개. 공식 해설 없이 생성돼 교차 검증 골드가 아니다. 오프라인 감사·회귀 기대값·검토·비교 연구에만 쓴다.

## 웹 흐름·서버

- 학생용 `/dialogue`는 연결 가능한 6개 지문을 제공한다. 웹 루트 `/`는 `/dialogue`로 간다. 이전 문단 훈련 UI는 `/legacy`에 보존한다.
- 개발자 화면: `/dialogue/lab`(문단 단순 형식), `/dialogue/dev`(문단 축 기반), `/problem/lab`(문제, API는 5175 분리 실행 `problem-feedback-entry.js`). 앞으로 URL은 개발자 화면만 안내하며 학생용 UI는 개발자 UI 확정 전 수정하지 않는다([D-0031](./decisions/D-0031-developer-ui-url-only.md)).
- Cloudflare Named Tunnel `csat-dialogue` → `https://dialogue.cogaxis.net`. 상시 서버는 보류. 로컬 ingress 파일이 없어 `--url http://127.0.0.1:5173`이 필요하고, 자동 시작 미등록이라 프로세스가 살아 있어야 한다. 인증 없는 골드·내부 판정 공개는 기존 사용자 승인 범위다. 인증·서버 재시작 복원은 미완료.
- 2026-09-12 사용자가 학생 역할로 6지문 전 구간 수행(문단 PASS 30/30, 문제 6/6). 학생 효과 자료 아님.

## 검증된 핵심 결론

- 자유형 문단 요약의 기본 채점축은 세부 개수가 아니라 핵심 의미 관계의 보존 여부다.
- 문제 풀이 최초 판정 비교에서는 원문 직접 방식이 간결·상세 문제 골드 방식보다 품질, 지연, 비용, 학생 발화 보존 측면에서 가장 나았다.
- 문단 요약에서는 원문 직접 방식보다 간결 골드가 부분 누락을 더 잘 포착했다. 상세 골드는 저정보 응답의 다음 질문 대상을 고르는 데 도움이 되지만, 전면 사용하면 질문 누출과 과도한 개입을 늘린다.
- 문단 골드 통합 감사 v2 계열은 정상 대조군 과잉 판정과 비용 증가로 운영 기준선으로 승격하지 않았다.

## 현재 우선순위

학생용 전환 순서는 [D-0176](./decisions/D-0176-student-switch-roadmap-pilot-before-expansion.md): 1′ 6지문으로 개발자 경로 알려진 문제 0건 → 얇은 학생판 준비 → 방식과 무관한 원자료 확대만 먼저 → (섭외 뒤) 실제 학생 확인 → 운영 방식 확정 → 부가 자산 확대 → 정식 전환. 실제 학생 섭외처는 아직 없다(2026-10-25).

사전 점검: 중학교 교사 2~3명 원격 시연 준비 완료([D-0198](./decisions/D-0198-teacher-demo-pilot.md)). 다음(사용자): 설문 링크·연락처, 공유, 서버·터널.

1. 1′ 첫 과제: 문제 판정 v5.1 `coaching` 필드 정리 완료([D-0177](./decisions/D-0177-problem-feedback-v51-drop-unused-coaching.md)).
2. 1′ 나머지: 문단 작동 순서 문서 남김 1건(골드 없는 지문 추가 때 목록 필터).
3. 얇은 학생판 범위 설계(내부 정보 숨김, 로그 저장, 최소 인증, 서버 상시 실행).
4. SNS 진단평가 모드(D-0200): 세트 E(D-0201) 자료 동결(`docs/experiments/sns-diagnostic-gold-2026-11-05/`). ⑥ 설계 확정: [D-0203](./decisions/D-0203-megastudy-rates-public-display-and-calibration.md), [D-0204](./decisions/D-0204-sns-diagnostic-keeps-service-feedback.md), [D-0205](./decisions/D-0205-sns-diagnostic-design-issues-2-5.md), [D-0207](./decisions/D-0207-sns-diagnostic-position-calibration-method.md), [D-0208](./decisions/D-0208-sns-diagnostic-skip-item-review-rationale-prompt.md). 인계 A(백엔드)·B(화면 `/diagnostic`) 구현·검토 완료, 표현 [D-0209](./decisions/D-0209-sns-diagnostic-student-wording.md). 측정 1차([기록](./checkpoints/2026-11-07-sns-diagnostic-cost-measurement-1.md)): 1인 $0.5~1.2, 대기 20~70초. L 재측정·17번 재현은 보류(사용자 2026-11-07). 사용자 첫 완주 문제 목록: [체크포인트](./checkpoints/2026-11-07-sns-diagnostic-first-run-issues.md). 공개 전: 인계 B 끝 절.
   - **판정 과적합(Q-0044)** [보고](../docs/experiments/judge-model-explanation-2026-11-08/REPORT-human.md): 해설은 주원인 아님, 엄격함 = 서버 검사(고침, D-0211) + luna + 171행(sol에도). [체크포인트](./checkpoints/2026-11-07-feedback-overfitting-candidates.md) 끝 절이 다음 시작점.
   - 판정 흐름 (나) 확정 [D-0213](./decisions/D-0213-diagnostic-judgment-split-option-na.md)(11-09): 정답의 질 3단계·버튼 둘·정답 sol(진단만 시험)·문항별 피드백 열기.
   - v5.9·v5.10 시험([보고](../docs/reports/REPORT-v59-v510-run-human.md)): v5.10 통과. 후보는 v5.10 하나([D-0216](./decisions/D-0216-v510-single-candidate-diagnostic-first-lab-held.md)): 질문 블라인드 판정 4/5 통과, **진단 기본값 v5.10 전환**(11-10, [기록](./checkpoints/2026-11-10-question-rules-blind-result.md)). lab은 v5.8 보류. 오디오 16 경계, Q-0045.
   - [학생 관점16문항 검토](../docs/experiments/diagnostic-student-review-2026-11-11/REPORT-student-review-human.md): 확인불가 칭찬·분모 명칭·함정 해석 문제 관측, 수정 미착수(Q-0048).
   - 진단 화면 M4 칠하기·B7 기록 위치 유지(11-09). 답은 입력창 안 버튼으로 확정([D-0226](./decisions/D-0226-diagnostic-answer-submit-buttons-conclusion.md)), 소거법은 [소거법] 버튼(D-0228).
5. 골드 기반 문항 생성: E1 종료·E2 보류(D-0210), [P1 중단](./decisions/D-0230-p1-principle-application-generation-stopped.md). API 생성 방향 확정([D-0231](./decisions/D-0231-deep-item-generation-api-pipeline-confirmed.md), promising), 계산 양식 규칙은 후보. 플라스틱 v4.1 4문항 [Codex 검토](./checkpoints/2026-11-13-deep-item-v41-codex-review.md): 정오 유지·가독성 양호, 쉬운 선지·중복 판단 보완 권고. 사용자 판단 대기(Q-0049), 이전 음향·깊이 쟁점 미해결.

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

운영 정책·종합 보고·자산 원장·회귀 출처는 [출처 지도](./INDEX.md)의 관련 절에서 찾는다(소제목 먼저 읽기).
