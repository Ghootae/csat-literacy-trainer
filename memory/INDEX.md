# 프로젝트 지식 지도

질문과 관련된 원문만 열기 위한 주제별 색인이다. 이 파일의 설명은 탐색용이며, 사실의 최종
근거는 연결된 정책·코드·실험 산출물이다.

## 먼저 읽을 정본

- 작업 지시 확인 절차: [D-0069](./decisions/D-0069-clarify-user-instructions-before-work.md), [적용 기록](./checkpoints/2026-10-02-user-instruction-clarification-rule.md). 이해 불충분한 부분은 작업 전에 목록으로 제시하고 하나씩 질문한 뒤 사용자 답변으로 해소 여부를 확인한다. `AGENTS.md`에 적용.
- 업무 분장: [D-0128](./decisions/D-0128-claude-subagent-work-division.md)(D-0092 대체), [인계 문서 형식](../docs/handoffs/TEMPLATE.md). 확정 설계 실행은 executor 하위 에이전트(sonnet)에 위임, 충돌 시 중단·보고, 메인 세션이 diff 검토. `AGENTS.md`에 적용.
- 작업 수형도: [`WORK_TREE.md`](./WORK_TREE.md) — 제품 기능별 갈래·상태·다음 한 단계([D-0113](./decisions/D-0113-work-tree-entry-map.md))
- 현재 상태: [`CURRENT_STATE.md`](./CURRENT_STATE.md)
- 결정: [`DECISIONS.md`](./DECISIONS.md)
- 열린 질문: [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md)
- 작업 delta: [`checkpoints/`](./checkpoints/)

## 문제 풀이 대화

- v5 6문항·48개 가상 세션 실제 기록(2026-10-12): [작업 기록](./checkpoints/2026-10-12-v5-diverse-48-recorded.md), [문항별 전체 과정](../docs/experiments/v5-diverse-48-2026-10-12/REVIEW-INDEX.md), [보고서](../docs/experiments/v5-diverse-48-2026-10-12/REPORT.md). 정답·불충분 12개, 오답 36개를 수정·재선택·코칭까지 실행. 원응답·실패 보존, 3개 검토 항목 대기, 운영 변경 없음.

- 기호 해석본·인용 형식(2026-10-06): [작업 기록](./checkpoints/2026-10-06-gongsun-marker-gloss-and-quote-format.md), [D-0084](./decisions/D-0084-local-marker-gloss-direction.md), [D-0085](./decisions/D-0085-relation-only-rationale-sufficient.md), [해석본](../packages/pipeline/fixtures/experiments/problem-solving/marker-glosses/gongsun-long-later-mohists-q12.json). Claude·GPT 공동 검토, 학생 주장 분리·응답 유형·세 조건·인용 형식 실험(총121요청). 해석본은 과잉 교정을 줄였고 귀속 대체 부작용은 인용 규칙으로 억제. 운영 미연결.
- 기호 해석본 자동 생성(2026-10-07): [작업 기록](./checkpoints/2026-10-07-gongsun-auto-gloss-generation.md). 공통 생성기 v1·v2, 예시 포함 대 대상만, 자동 생성 두 형식 판정 비교(총148요청). 자동 생성본은 두 형식 모두 S5 과잉 교정을 막지 못함.
- 문제 판정기 명칭(2026-10-07): [D-0090](./decisions/D-0090-problem-evaluator-v5-naming.md). v3 기반 v4 후보 = v5(운영 후보), v4 미사용, v3 학생용 기본값.
- v3 기호 실험 마무리·v5 이식(2026-10-07): [D-0091](./decisions/D-0091-v3-marker-phase-closed-port-to-v5.md), [이식 설계안](../docs/review/v5-marker-port-design-2026-10-07.md). 옮길 것 3개, 미해결 3개, 결정 필요 4개.
- v5 구성·자동 해석본 파이프라인(2026-10-07): [D-0093](./decisions/D-0093-v5-composition-auto-gloss-pipeline.md), `scripts/lib/marker-gloss-pipeline.mjs`, 1단계 `scripts/test-marker-gloss-pipeline-gongsun.mjs`(준비, API 0). [작업 기록](./checkpoints/2026-10-07-v5-composition-and-gloss-pipeline.md).
- v5 공급자 비교(2026-10-08): `scripts/lib/provider-adapter.mjs`, `scripts/test-v5-provider-compare-gongsun.mjs`, `scripts/build-v5-provider-compare-review.mjs`. [작업 기록](./checkpoints/2026-10-08-v5-provider-compare-gongsun.md).
- v5 다문항 luna·sol(2026-10-09): `scripts/test-v5-multi-item-models.mjs`, `scripts/test-v5-multi-item-effort-probe.mjs`, `scripts/lib/v5-boundary-arms.mjs`, `scripts/build-v5-multi-item-review.mjs`. [작업 기록](./checkpoints/2026-10-09-v5-multi-item-luna-sol.md)

- Claude 검토용 종합 문서: [문서](../docs/review/claude-gongsun-judgment-consultation-2026-10-05.md), [작성 기록](./checkpoints/2026-10-05-claude-gongsun-consultation-document.md). 지문·문항·응답 전문, 호출 구조, 최신 해석표20요청까지의 결과, 대표 원출력·프롬프트를 한 파일로 정리. 관측/가설·실험/운영 구분, 추가 호출/전송/정책 변경 없음.

- 원문 표시+해석표 두 방식 시험: [결과](./checkpoints/2026-10-03-gongsun-interpretation-modes-completed.md), [D-0083](./decisions/D-0083-inline-marker-interpretation-modes-pilot.md). 각3반복·20요청. 표 의미는 양쪽3/3, 같은 호출은 학생 역전 발화 덮어쓰기/과수용1회, 별도 호출은 역전 오류3/3 검출. 인용 태그5출력 복구·원출력 보존, 질문 명료성/일반화 미확정·제품 미반영.

- ChatGPT 논의용 종합 보고서: [본문](../docs/review/gongsun-marker-judgment-discussion-report-2026-10-03.md), [본문 포함 원자료·프롬프트·출력 첨부](../docs/review/gongsun-marker-judgment-discussion-bundle-2026-10-03.txt), [작성 체크포인트](./checkpoints/2026-10-03-gongsun-discussion-report.md). 판정 오류·기호 감사·후속33요청·가설/한계·일반화 논의 질문을 정리, 추가 호출/정책 변경 없음.

- 기호 범위 직접 표시 단독 시험: [결과](./checkpoints/2026-10-03-inline-source-marker-pilot-completed.md), [D-0082](./decisions/D-0082-inline-source-marker-pilot.md).동일 v3/응답 각3반복·12요청. 최초 설명 혼동 control0/3·inline1/3, 양쪽 오류/질문 분기3/3. 가까운 표시만으로 해소 안 됨·소표본 우열 미확정·제품 미적용.

- 원래 v3 공손룡 역전 응답 검증: [결과](./checkpoints/2026-10-02-gongsun-v3-reversed-completed.md), [D-0081](./decisions/D-0081-original-v3-gongsun-transfer-approved.md).6요청·최초 오류3/3·교정 질문3/3이나 최초 reason2건에 지시 범위 혼동, r3에서 같은 오류 명확히 재현. v4 변경만의 문제 아님·우열 미입증·제품 미변경. [준비 당시 승인 대기](./checkpoints/2026-10-02-gongsun-v3-reversed-prepared.md)는 해소됨.

- 공손룡 기호 보완 A/B 완료: [결과](./checkpoints/2026-10-02-gongsun-marker-ab-completed.md), [D-0078](./decisions/D-0078-gongsun-marker-ab-transfer-approved.md), [집계](../docs/experiments/gongsun-marker-input-ab-2026-10-02/RESULTS.json).15요청·분기 수정 전5/7→후7/7·후속1통과. 수정 후 내부 의미 설명 오류1회 잔존·완전 해결/운영 승격 아님. [준비 당시 승인 대기](./checkpoints/2026-10-02-gongsun-marker-ab-prepared.md)는 해소됨.

- UI 연결6문항 기호 확인·보완: [체크포인트](./checkpoints/2026-10-02-ui-linked-problem-source-markers.md), [원자료 대조29범위](../docs/experiments/problem-source-markers-2026-10-02/audit.json). 공손룡 ⓒ 위치 정정·범위 메타데이터 v3/v4 전달·관련140테스트 통과. 서버 재시작 전·실모델 개선 미검증·추가 호출0. [입력 검토](./checkpoints/2026-10-02-gongsun-marker-range-input-review.md), [구 DB 확인](./checkpoints/2026-10-02-gongsun-db-marker-metadata.md), [새 DB와 과거 작업](./checkpoints/2026-10-02-source-db-history-recovered.md)은 수정 전 이력이다.

- 승인 후보 3문항 간단 시험: [결과](../docs/experiments/problem-v3-based-v4-smoke-2026-10-02/REPORT.md), [D-0072](./decisions/D-0072-v3-based-problem-candidate-accepted-test-requested.md), [전송 승인 D-0074](./decisions/D-0074-problem-candidate-smoke-transfer-approved.md), [완료 기록](./checkpoints/2026-10-02-v3-based-problem-smoke-completed.md). 18요청·후보 최초8/10 기대 일치. 공손룡 과잉 교정·대상 역전 과수용, 충분성 범위 문제가 남음. 후속3경로 일치·1경로 진입 불가. 개선 미입증·UI 미교체. 이전 준비 API0·후보 검토 대기는 해소된 이력.

- v3 기반 v4 후보 초안: [검토할 세 부분·변경 대조](../docs/review/problem-v3-based-v4-candidate-review-2026-10-02.md), [D-0070](./decisions/D-0070-v3-based-problem-prompt-draft-review.md), [체크포인트](./checkpoints/2026-10-02-v3-based-problem-prompt-candidate.md). 사용자 후보 검토 대기·실행 프롬프트 미변경·모델 호출0.

- v3/v4 프롬프트 비교: [검토 기록](./checkpoints/2026-10-02-problem-v3-v4-prompt-comparison.md). 운영 v3 검증본 해시 일치 확인. v4의 새 운영 규칙과 별개로 문맥 복원·명시 오류 경계·짧은 충분 근거 인정·교정 질문의 대상 보존 지침이 축약됨. 오판 인과·성능 우열은 미검증, 제품 변경 없음.

- 개발자 v4 3단 UI·터널 연결: [D-0065](./decisions/D-0065-developer-problem-v4-workbench-and-tunnel.md), [실행·검증](./checkpoints/2026-10-02-developer-problem-v4-ui-live.md). 지문/문제/대화·선택/근거·평가 서랍, 관련98·브라우저38 통과. 공개 UI/API200, 기존 문단 세션 유지·v4 API5175 분리. 추가 모델 호출0, 학생용v3 유지. [공손룡12 실제 사용 검토](./checkpoints/2026-10-02-gongsun-q12-v4-user-review.md)는 과잉 교정 의심·기호 찾기 질문/의미 수정 증거 연결을 기록했으며 제품 미수정이다. 아래 D-0064는 최초 서랍 구현 이력이다.

- 개발자 응답 평가 서랍: [D-0064](./decisions/D-0064-developer-response-evaluation-drawer.md), [구현·검증](./checkpoints/2026-10-02-developer-response-evaluation-drawer.md). 현행 v3 판정 이력·학생 인용·재구성·정오/근거 검증 분리. 브라우저5·서버18 통과, 기존 터널/API 재시작 미실행. PPT 전체 UI·v4 연결·학생 UI는 미변경.

- v4 네 실패 보완 완료: [D-0063](./decisions/D-0063-problem-feedback-v4-hardening.md), [체크포인트](./checkpoints/2026-10-01-problem-feedback-v4-hardened-revalidated.md), [재검증 보고서](../docs/experiments/problem-feedback-v4-hardening-2026-10-01/REPORT.md). 최초33/34(1 API 거부)·후속10/10 사전필드 일치, 공개 코칭2건 재생성·인용1구절 복원. 54요청·확인분 추정$0.5678646, 미확정 예약$0.13091. 미사용 코칭 손상·의미 검토·일반화는 남고 UI·운영 미변경. 아래 가능성 검토는 구현 전 이력이다.

- v4 네 실패 수정 가능성: [검토 기록](./checkpoints/2026-10-01-problem-feedback-v4-fix-feasibility.md). 동일 요청 재시도·최신 발화 읽기 증거 부재·코칭 문자열 검사만 존재·v3 제한적 인용 복원 미사용을 확인했다. 수정안은 제안이며 구현/추가 호출 없음.

- v4 합성 응답 시험 완료: [보고서](../docs/experiments/problem-feedback-v4-synthetic-2026-10-01/REPORT.md), [전체 출력](../docs/experiments/problem-feedback-v4-synthetic-2026-10-01/REVIEW-PACKET.md), [D-0061 계획](./decisions/D-0061-problem-feedback-v4-synthetic-test.md), [D-0062 전송 승인](./decisions/D-0062-problem-feedback-v4-external-transfer-approved.md), [완료](./checkpoints/2026-10-01-problem-feedback-v4-synthetic-completed.md), [준비 이력](./checkpoints/2026-10-01-problem-feedback-v4-synthetic-prepared.md). 45요청·추정$0.5191258, 최초사전필드30/32·후속7/8. 결론 역전·수정 미인식·코칭 손상·인용 실패; 독립 사람 정확도 아님·운영 미변경.

- 후속 설계 최신 정본: [D-0059](./decisions/D-0059-problem-feedback-clarifications-consolidated.md), [전체 수형도 HTML](../docs/review/problem-feedback-policy-tree-2026-10-01.html), [텍스트](../docs/review/problem-feedback-policy-tree-2026-10-01.txt), [검증 기록](./checkpoints/2026-10-01-problem-feedback-tree-consolidated.md). 마지막 네 명료화 승인 완료. 아래 D-0049~D-0058은 계보이며 현행 운영 v3는 아직 변경하지 않았다.
- UI 제외 구현 완료: [D-0060](./decisions/D-0060-problem-feedback-v4-headless-implementation.md), [구현 문서](../docs/PROBLEM-FEEDBACK-V4-IMPLEMENTATION-2026-10-01.md), [체크포인트](./checkpoints/2026-10-01-problem-feedback-v4-headless-implemented.md). v4 코어·평가기·로컬 개발자 API·저장·신규64테스트. 실모델 검증·UI·실제 차감·운영 전환은 제외했다. [준비 점검](./checkpoints/2026-10-01-problem-feedback-headless-readiness.md) 및 아래 설계 항목의 ‘구현 보류’는 당시 이력이다.

- 현행 정책: [`PROBLEM-SOLVING-SOURCE-DIRECT-OPERATIONAL-POLICY-2026-09-08.md`](../docs/PROBLEM-SOLVING-SOURCE-DIRECT-OPERATIONAL-POLICY-2026-09-08.md)
- 정책 문서와 질문 소진 후 실제 전이의 불일치: [확인 기록](./checkpoints/2026-10-01-problem-feedback-policy-runtime-discrepancy.md). 1·2차 오답은 코칭 확인 뒤 재선택하며, 운영 정책 변경 승인이 아니라 코드·회귀 정의 확인이다.
- 전체 근거 종합: [`TEST-SYNTHESIS-2026-09-09.md`](../docs/experiments/TEST-SYNTHESIS-2026-09-09.md)
- 세 입력 조건 비교: [`REPORT.md`](../docs/experiments/problem-evaluator-three-reference-combined-15-item-2026-09-06/REPORT.md)
- 대표 상태 canary: [`FINAL-REPORT.md`](../docs/experiments/problem-source-direct-live-canary-2026-09-08/FINAL-REPORT.md)
- 고위험 형식 canary: [`FINAL-REPORT.md`](../docs/experiments/problem-source-direct-risk-format-canary-2026-09-08/FINAL-REPORT.md)
- 다중 이미지 canary: [`FINAL-REPORT.md`](../docs/experiments/problem-source-direct-multi-image-canary-2026-09-09/FINAL-REPORT.md)
- v2 신규 7문항 전체 사이클: [`FINAL-REPORT.md`](../docs/experiments/problem-source-direct-v2-full-cycle-seven-2026-09-11/FINAL-REPORT.md)
- v3 운영 기본값 결정: [`D-0008`](./decisions/D-0008-problem-dialogue-v3-operational-default.md)
- 발문 극성·선택 의미 정규화 후속 설계: [D-0049](./decisions/D-0049-stem-polarity-normalization-deferred.md), [체크포인트](./checkpoints/2026-10-01-stem-polarity-normalization-design-deferred.md). 선택 의미·학생 추론·근거 파생 결론·내용 정확성을 분리하며, 현재 구현은 보류한다.
- 학생 추론 가능성 게이트 후보: [D-0050](./decisions/D-0050-reasoning-reconstructability-gate-deferred.md), [체크포인트](./checkpoints/2026-10-01-reasoning-reconstructability-gate-deferred.md). 파편·모순·복수 해석 발화에서 단일 경로와 선지 결론을 억지로 만들지 않으며, D-0049와 함께 구현 대기한다.
- 개입·종료 흐름 후보: [D-0051](./decisions/D-0051-bounded-problem-feedback-flow-deferred.md), [체크포인트](./checkpoints/2026-10-01-bounded-problem-feedback-flow-deferred.md). 근거 기본·답만 제출 선택, 선택 최대 2회·성공 시만 재선택. 당시 교정 총 1회 제한은 최초 오답 복수 오류에서 D-0055로 갱신됐다. 게이트 후 진단 대신 확인 어려움 안내·코칭 종료하며, 구현·실제 차감은 하지 않는다.
- 세 후보 분기·충돌 감사: [검토 기록](./checkpoints/2026-10-01-problem-candidates-path-audit.md). 이후 D-0052~D-0059로 학습 분기를 명료화했다. 감사 당시의 미정 항목을 현재 미정으로 오독하지 않는다. 실모델 검증·운영 구현은 미완료다.
- 전체 확인 불가 우선 후속 합의: [D-0053](./decisions/D-0053-global-unknown-priority-deferred.md), [체크포인트](./checkpoints/2026-10-01-global-unknown-priority-agreed.md). 전체 결론 UNKNOWN 우선. 오답은 코칭 종료, 정답은 D-0059에서 국소 오류가 있어도 미검증 종료하기로 확정했다.
- 참이지만 불충분한 오답 근거 합의: [D-0054](./decisions/D-0054-insufficient-wrong-rationale-exit-deferred.md), [체크포인트](./checkpoints/2026-10-01-insufficient-wrong-rationale-exit-agreed.md). 선지 판단 연결이 확인되지 않으면 추가 진단 없이 확인 불가·코칭 종료하며, 실제 잘못된 연결이 확인되는 경우와 구별한다.
- 복수 오류 순차 교정: [D-0055](./decisions/D-0055-multiple-error-correction-batch-deferred.md), [체크포인트](./checkpoints/2026-10-01-multiple-error-correction-batch-agreed.md). 중간 성공/실패와 무관하게 순차 질문 후 누적 재평가한다. [D-0056](./decisions/D-0056-question-count-per-error-deferred.md)으로 오류 N개에 질문 N개·총수 상한 없음 확정([체크포인트](./checkpoints/2026-10-01-question-count-per-error-agreed.md)). 모두 수정 시만 재선택하며 실패/확인 불가는 코칭 종료·구현 보류.
- 근거 제출 경계: [D-0057](./decisions/D-0057-explicit-rationale-submission-deferred.md), [체크포인트](./checkpoints/2026-10-01-explicit-rationale-submission-agreed.md). 명시적 미제출/입력 후 제출과 입력 대기를 구분한다. 최초 오답의 근거 확인 불가 답변은 코칭 종료하며 교정 묶음 중간 종료로 확대하지 않는다.
- 코칭 종료: [D-0058](./decisions/D-0058-terminal-coaching-answer-reveal-deferred.md), [체크포인트](./checkpoints/2026-10-01-terminal-coaching-answer-reveal-agreed.md). 최초 오답 즉시 종료를 포함해 코칭 종료에는 정답 공개·재선택 금지를 적용한다. 회차 기반 공개 조건을 후속 설계에서 대체하며 구현은 보류한다.
- 과거 v3 후보 검증 결정: [`D-0007`](./decisions/D-0007-problem-dialogue-v3-candidate.md)
- v3 후보 프롬프트와 회귀 계약:
  `packages/pipeline/experiments/problem-solving/source-direct-problem-dialogue-prompt-v3.md`,
  `packages/pipeline/experiments/problem-solving/source-direct-problem-dialogue-v3-regression-contract-v1.json`
- v3 표적 canary: [`FINAL-REPORT.md`](../docs/experiments/problem-source-direct-v3-targeted-canary-2026-09-11/FINAL-REPORT.md)
- v3 최종 해시 표적 재실행 체크포인트:
  [`2026-09-11-problem-dialogue-v3-final-hash-targeted.md`](./checkpoints/2026-09-11-problem-dialogue-v3-final-hash-targeted.md)
- v3 중간 검증 계획:
  [`PLAN.md`](../docs/experiments/problem-source-direct-v3-intermediate-canary-2026-09-11/PLAN.md)
- v3 중간 검증 보고:
  [`INTERIM-REPORT.md`](../docs/experiments/problem-source-direct-v3-intermediate-canary-2026-09-11/INTERIM-REPORT.md)
- v3 전체 회귀 보고:
  [`FULL-REGRESSION-REPORT.md`](../docs/experiments/problem-source-direct-v3-targeted-canary-2026-09-11/FULL-REGRESSION-REPORT.md)
- v3 운영 기본값 전환 체크포인트:
  [`2026-09-11-problem-dialogue-v3-operational-default.md`](./checkpoints/2026-09-11-problem-dialogue-v3-operational-default.md)
- 코드 진입점: `packages/pipeline/src/problem-solving/source-direct-evaluator.ts`,
  `packages/app/src/server/problem-solving.ts`, `packages/app/src/client/ProblemApp.tsx`

## 문단 요약 대화

- 개발자 고정 터널 최신 복구: [2026-10-02 기록](./checkpoints/2026-10-02-dialogue-developer-tunnel-restored.md). 종료된 로컬 앱·Named Tunnel을 기존 승인 설정으로 재실행. 공개 개발자 화면·지문 API·개발자 맵 HTTP 200 확인, UI/정책 변경과 유료 판정 호출 없음.

- 구체 인정 L1 + 조건부 L2 개발자 연결: [보고서](../docs/experiments/conditional-meta-ui-2026-10-01/REPORT.md), [30문단 축](../docs/experiments/conditional-meta-ui-2026-10-01/AXES.md), [D-0047](./decisions/D-0047-conditional-meta-developer-mode.md), [체크포인트](./checkpoints/2026-10-01-conditional-meta-developer-ui.md). 8재사용+22생성·51축쌍, 새 생성물2문구 교정·원본보존. 개발자모드만연결, 학생기본V4유지. 후속L2실사용품질은대기.
- 조건부 메타8 사후 결과 수용: [D-0046](./decisions/D-0046-conditional-meta-results-accepted.md), [체크포인트](./checkpoints/2026-10-01-conditional-meta-results-accepted.md). 사용자가 관대한 결과를 수용·OK무보완통과 재확인. 실행 전 기준과다른9회를실패로취급하지않음. 독립정확도/운영승격아님.
- 실제8응답 조건부 메타 판정: [보고서](../docs/experiments/conditional-meta-natural-eight-2026-10-01/REPORT.md), [전체 원문·응답·판정](../docs/experiments/conditional-meta-natural-eight-2026-10-01/REVIEW-PACKET.md), [D-0045](./decisions/D-0045-conditional-meta-natural-eight-experiment.md), [체크포인트](./checkpoints/2026-10-01-conditional-meta-natural-eight-completed.md). 생성2+L1 24+L2 6 모두유효. 동결기준일치12/24→15/24·L2완화3회, 사전경로차이9회·OK/S변동. D-0046사후수용을함께읽음·운영미변경.

- 실제8건 최신 정정: [D-0044](./decisions/D-0044-natural-eight-acceptable-routes.md), [체크포인트](./checkpoints/2026-10-01-natural-eight-routing-revised.md). 8번선택보완, 7번질문/선택보완복수허용. D-0043은최초이력. 과거V4처리8/8허용범위·결과공개후정정으로독립검증아님.

- 실제 최초 응답8건 사람 기준: [기준·과거V4비교](../docs/review/natural-eight-human-routing-2026-10-01.md), [JSON](../docs/review/natural-eight-human-routing-2026-10-01.json), [D-0043](./decisions/D-0043-natural-eight-human-routing.md), [체크포인트](./checkpoints/2026-10-01-natural-eight-human-routing.md). 통과4·선택보완3·질문1, N36최신질문기준은과거OK승인과다름. 추가API0·새L1미측정.

- 공손룡3 생략 표현 ERROR 사용자 허용: [D-0042](./decisions/D-0042-gongsun-ambiguous-error-accepted.md), [체크포인트](./checkpoints/2026-10-01-gongsun-ambiguous-error-accepted.md). G3-sufficient를 수정필요 오탐으로 취급하지 않음. 사례 한정·사전 기대/원출력 보존·추가 호출0.

- 민감6문단 비개입 이중 판정 확장: [보고서](../docs/experiments/dual-routing-sensitive-six-2026-09-30/REPORT.md), [응답별표](../docs/experiments/dual-routing-sensitive-six-2026-09-30/CASE-RESULTS.md), [D-0041](./decisions/D-0041-regenerated-dual-sensitive-expansion.md), [체크포인트](./checkpoints/2026-09-30-dual-routing-sensitive-six-completed.md). 공동생성6+판정180·181유효, 유효85쌍 L2추가효용0. 기능답L1도통과, 중의문ERROR·OK/S변동·L2인용실패5; 운영미변경.

- 비개입 우선 이중 판정 기준: [D-0040](./decisions/D-0040-low-intervention-dual-routing.md), [체크포인트](./checkpoints/2026-09-30-low-intervention-dual-routing.md). L1 PASS/OK는 L2와 무관하게 보완 표시 없이 통과. SERIOUS는 L2로 질문/선택적 보완 구분. ERROR는 질문 제시 필수이나 응답·교정 없이 진행 가능(D-0011 유지). 기준 확정·운영 미적용, 추가 API0.

- 구체 인정·이중 판정 통합 보고서: [종합본](../docs/experiments/meaning-evaluation-combined-2026-09-29/REPORT.md), [체크포인트](./checkpoints/2026-09-29-meaning-evaluation-combined-report.md). D-0037 '구체 인정'과 D-0039 '기능·구체 이중 판정(이중 판정)'을 사례별로 연결. 판정84호출·82유효, 생성6회는별도; 축문구차이로 순수전후비교금지. 기본PASS/추가보상 경계미분리, 새호출·정책변경없음.

- 기능적 메타 축 이중 판정 v1: [보고서](../docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29/REPORT.md), [전체응답·판정](../docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29/REVIEW-PACKET.md), [D-0039](./decisions/D-0039-two-level-meta-axis-evaluation-pilot.md), [체크포인트](./checkpoints/2026-09-29-two-level-meta-axis-evaluation-pilot.md). 반복2고정36호출·35유효. 차이만표현시기본PASS는사용자승인이나L1도PASS3/3여서보상경계불일치; 메타충족과명시오류검사분리·운영미변경. 필요정보는실행전질문.

- 구체적 의미 실현 판정 후보 보존: [D-0037](./decisions/D-0037-concrete-meaning-realization-candidate.md), [명명 체크포인트](./checkpoints/2026-09-29-concrete-meaning-candidate-retained.md). `v4-concrete-meaning-v1`; 사용자 후보 보존 승인, 운영 미적용·일반화 검증 대기.

- 구체적 의미 실현 원칙 교체: [법인2·4문단48호출](../docs/experiments/axis-concrete-meaning-two-paragraphs-2026-09-29/REPORT.md), [전체 응답·이유](../docs/experiments/axis-concrete-meaning-two-paragraphs-2026-09-29/REVIEW-PACKET.md), [체크포인트](./checkpoints/2026-09-29-axis-concrete-meaning-two-paragraphs.md). 실제P4 AX1 PASS1/3→3/3, P2 AX3양쪽3/3. 후보표적대조·P4실제누락보호충족. P2귀속판단·강도변동잔존, 운영미승격.

- 법인4문단 실제 테스트: [검토](../docs/review/corporate-p4-user-session-2026-09-29.md), [체크포인트](./checkpoints/2026-09-29-corporate-p4-user-review.md). AX2 실제 연결 보완과 AX1 구체적 배당 대조를 추상적으로 재진술하는 보완을 구분. 최종PASS·AX1 과도 보류 의심은 Codex 의견, 유료 호출/수정 없음.

- 누락 확정 전 학생 표현 재확인: [법인2문단 결과](../docs/experiments/axis-expression-recheck-corporate-p2-2026-09-29/REPORT.md), [체크포인트](./checkpoints/2026-09-29-axis-expression-recheck-corporate.md). 4조건×2프롬프트×3회24호출. 실제AX3 기존PASS3/3·후보2/3, 대조구별 유지·개선 미관측·운영 미변경. 사용자는 설명에 실제 사례와 구체적 대조를 요청했다.
- 법인UI/실험 요청 대조: [무호출 감사](./checkpoints/2026-09-29-corporate-ui-request-comparison.md). 복원UI의 빈 revealedAxisContent:[]만 실험에서 생략. 과거 원요청 미저장으로 엄밀한 동일성은 미확정이며 인과도 미확정. 후보 내3회는 동일해시에서PASS/OK/PASS 변동 확인.
- 기존V4 동일 UI 복원요청3회: [결과](../docs/experiments/corporate-ui-exact-replay-2026-09-29/REPORT.md), [체크포인트](./checkpoints/2026-09-29-corporate-ui-exact-replay.md). 실제 전송본문 해시 동일·빈 공개이력 포함인데AX3 PASS/PASS/OK, 기존 자체 변동 관측. 과거와 완전동일성·변동원인·운영해법은 미확정.

- 질문 진단 가치 법인2문단 파일럿: [결과](../docs/experiments/question-actionability-corporate-p2-2026-09-29/REPORT.md), [완료](./checkpoints/2026-09-29-question-actionability-corporate-completed.md), [준비](./checkpoints/2026-09-29-question-actionability-corporate-prepared.md). 외부 전송 승인 뒤12호출·계약12/12. 귀속 질문 보존·범위 질문 개선 없음(후보도각ASK3/3), 미승격·운영 미변경.

- 개발자 3단 누적 대화 UI: [D-0032](./decisions/D-0032-developer-dialogue-thread-ui.md), [체크포인트](./checkpoints/2026-09-22-developer-dialogue-thread-ui.md). 현재 이해를 오른쪽 검사 패널로 이동하고, `UNCLEAR_OK`의 고정 입력창과 `응답→피드백→확인 질문` 누적 기록을 구현했다. 학생용 UI는 유지.
- V4 운영 유지·출력 절삭 보류: [D-0030](./decisions/D-0030-v4-operational-output-ablation-paused.md), [체크포인트](./checkpoints/2026-09-22-v4-output-ablation-paused.md). V4-light·S1·S2·S3·A·B1 결과는 미승격 연구 자료로 보존하고 B2·추가 절삭은 실제 비용·체감 지연 병목이 확인될 때까지 보류.
- 학생용 고정 터널 Error 1033 복구: [체크포인트](./checkpoints/2026-09-22-named-tunnel-recovered.md). 앱과 tunnel을 재실행했고 공개 화면·API HTTP 200 확인. 로컬 ingress 파일이 없어 `cloudflared tunnel --url http://127.0.0.1:5173 run csat-dialogue`로 실행해야 하며 자동 시작은 미등록.
- 공개 개인 개발자 모드 활성화: [체크포인트](./checkpoints/2026-09-22-public-developer-mode-enabled.md). 사용자가 인증 없는 골드·내부 평가 노출 위험을 명시적으로 승인했으며 `/dialogue/dev`와 개발자 맵 API의 HTTP 200을 확인.
- 개인 테스트 URL 안내 정책: [D-0031](./decisions/D-0031-developer-ui-url-only.md), [체크포인트](./checkpoints/2026-09-22-developer-ui-url-only.md). 앞으로 개발자용 `/dialogue/dev`만 안내하고 학생용 UI는 개발자 화면 확정 전 수정하지 않는다.
- V4 출력 절삭 해석 정정: [D-0029](./decisions/D-0029-v4-output-ablation-interpretation-correction.md). S2 재실행 회복은 안정성 증거가 아니며 첫 실행을 주 지표로 사용. 운영 계약 재시도와 연구 의미 재실행 비용 분리. B1은 설계 타당성만 확인·제품 실익 미입증, N03은 별도 인용 정규화 문제로 분리.
- B1 자연 응답·질문 연결: [결과](../docs/experiments/v4-output-b1-natural-2026-09-22/REPORT.md), [질문 검토](../docs/experiments/v4-output-b1-natural-2026-09-22/QUESTION-REVIEW.md), [계획](../docs/experiments/v4-output-b1-natural-2026-09-22/PLAN.md), [체크포인트](./checkpoints/2026-09-22-v4-output-b1-natural-completed.md). 자연15+재실행2+질문4호출; 원장 복원·질문 연결은 유지했으나 새 질문1·반복 계약실패1, 실제 출력 토큰 증가로 미승격·운영 미변경.
- V4 출력 절삭 독립 분기 A·B1: [A 결과](../docs/experiments/v4-output-branch-a-short-intent-2026-09-22/REPORT.md), [B1 결과](../docs/experiments/v4-output-branch-b1-compact-ledger-2026-09-22/REPORT.md), [체크포인트](./checkpoints/2026-09-22-v4-output-independent-branches-ab.md). A15호출은 계획을 짧게 했으나 새 질문1·계약실패1·비용0.9% 절감으로 미승격. B1 8호출은 압축 원장 복원·수명주기 불변식8/8, 자연 응답·질문 흐름 검증 대기. 운영 미변경.
- V4 기록 필드 단계적 제거: [1차 결과](../docs/experiments/v4-output-field-ablation-v1-2026-09-22/REPORT.md), [계획](../docs/experiments/v4-output-field-ablation-v1-2026-09-22/PLAN.md), [D-0028](./decisions/D-0028-v4-output-optimization-human-policy.md), [완료 체크포인트](./checkpoints/2026-09-22-v4-field-ablation-first-bundle-completed.md), [준비 체크포인트](./checkpoints/2026-09-22-v4-field-ablation-plan.md). 사람 승인15건에서 중심 대상·중심 이야기 표상만 제거해30호출; 질문 정책15/15·지연8.9%·비용9.2% 개선, 계약 유효13/15로 미승격·운영 미변경.
- V4 누적 절삭 S2: [결과](../docs/experiments/v4-output-field-ablation-s2-2026-09-22/REPORT.md), [계획](../docs/experiments/v4-output-field-ablation-s2-2026-09-22/PLAN.md), [체크포인트](./checkpoints/2026-09-22-v4-output-ablation-s2-screened.md). S1에 `decisionSummary` 제거를 누적해15호출+제한 재실행2호출; 질문 정책·계약15/15 확인, 축 상태 사람 일치7/15로 조건부 통과·미승격·운영 미변경.
- V4 누적 절삭 S3: [결과](../docs/experiments/v4-output-field-ablation-s3-2026-09-22/REPORT.md), [질문 비교](../docs/experiments/v4-output-field-ablation-s3-2026-09-22/QUESTION-REVIEW.md), [계획](../docs/experiments/v4-output-field-ablation-s3-2026-09-22/PLAN.md), [체크포인트](./checkpoints/2026-09-22-v4-output-ablation-s3-completed.md). 판정15+질문24호출; OK intent null에서 target4건 소실·새 질문1건으로 미통과, 짧은 계획 질문8/8로 다음 S3.1 근거 확보·운영 미변경.
- V4 출력 최적화 사람 기준: [15건 사람 판정](../docs/experiments/v4-light-output-v1-2026-09-22/HUMAN-ADJUDICATION.md), [기계 판독 정답표](../docs/experiments/v4-light-output-v1-2026-09-22/HUMAN-ADJUDICATION.json), [정책 메모](../docs/review/v4-output-optimization-human-policy-2026-09-22.md), [D-0028](./decisions/D-0028-v4-output-optimization-human-policy.md), [정정 체크포인트](./checkpoints/2026-09-22-v4-light-fifteen-human-approved.md). 불일치15건 각각에서 V4 표시 결과 승인; 짧은 판정 발판·조건부 질문/오류 필드·묶음별 제거를 다음 후보 원칙으로 확정.
- V4-light 최소 출력 대조: [결과](../docs/experiments/v4-light-output-v1-2026-09-22/REPORT.md), [불일치15건](../docs/experiments/v4-light-output-v1-2026-09-22/REVIEW-PACKET.md), [D-0027](./decisions/D-0027-v4-light-output-experiment.md), [완료 체크포인트](./checkpoints/2026-09-22-v4-light-output-completed.md), [준비 이력](./checkpoints/2026-09-22-v4-light-output-prepared.md).90호출·속도/비용 개선, 질문 후보4→9로 품질 보존 실패·미승격·운영 미변경.
- 자연 응답 불일치 검토: [결과](../docs/experiments/natural-response-disagreement-v1-2026-09-21/REPORT.md), [블라인드20건](../docs/experiments/natural-response-disagreement-v1-2026-09-21/BLIND-REVIEW.md), [판정 비교](../docs/experiments/natural-response-disagreement-v1-2026-09-21/COMPARISON-KEY.md), [D-0026](./decisions/D-0026-natural-response-disagreement-mining.md), [완료 체크포인트](./checkpoints/2026-09-21-natural-response-disagreement-completed.md).90호출·$0.7349302,45시점 중14불일치·질문 후보4→11, 사람 검토 대기·운영 미변경. [준비 이력](./checkpoints/2026-09-21-natural-response-disagreement-prepared.md) 보존.

- 반사실적 비대상 맥락 대조: [결과](../docs/experiments/axis-counterfactual-context-v1-2026-09-21/REPORT.md), [원문·응답·180판정](../docs/experiments/axis-counterfactual-context-v1-2026-09-21/REVIEW-PACKET.md), [D-0025](./decisions/D-0025-counterfactual-context-and-conditional-benchmark.md), [체크포인트](./checkpoints/2026-09-21-counterfactual-context-completed.md). v1 충분보류0·도파민 누락3→0,1문단 차이로 조건부 병렬 측정 건너뜀·운영 미변경.
- 축 맥락 격리 진단: [결과](../docs/experiments/axis-context-isolation-v1-2026-09-20/REPORT.md), [원문·전체 응답·60판정](../docs/experiments/axis-context-isolation-v1-2026-09-20/REVIEW-PACKET.md), [D-0024](./decisions/D-0024-axis-context-isolation-diagnostic.md), [체크포인트](./checkpoints/2026-09-20-axis-context-isolation-completed.md). 범위 영향 관측·잔여 도파민 과수용·운영 미변경.
- 직접 판정 관계 누락 경계 후속: [결과](../docs/experiments/axis-direct-judgment-v2-relational-boundary-2026-09-20/REPORT.md), [전체 원문·응답·판정](../docs/experiments/axis-direct-judgment-v2-relational-boundary-2026-09-20/REVIEW-PACKET.md), [D-0023](./decisions/D-0023-direct-relational-boundary-design.md), [완료 체크포인트](./checkpoints/2026-09-20-direct-relational-boundary-completed.md), [준비 이력](./checkpoints/2026-09-20-direct-relational-boundary-prepared.md). 120호출 완료·운영 미승격.
- 중심축 최소 출력 직접 판정: [결과](../docs/experiments/axis-direct-judgment-v1-2026-09-20/REPORT.md), [원문·응답·반복 판정](../docs/experiments/axis-direct-judgment-v1-2026-09-20/REVIEW-PACKET.md), [원출력](../docs/experiments/axis-direct-judgment-v1-2026-09-20/RAW-OUTPUTS.md), [D-0022](./decisions/D-0022-axis-direct-judgment-experiment.md), [체크포인트](./checkpoints/2026-09-20-axis-direct-judgment-compared.md)
- 동일 호출 내 누락 중요도 비교: [결과](../docs/experiments/single-call-materiality-2026-09-20/REPORT.md), [원문·응답·판정](../docs/experiments/single-call-materiality-2026-09-20/REVIEW-PACKET.md), [원출력](../docs/experiments/single-call-materiality-2026-09-20/RAW-OUTPUTS.md), [D-0021](./decisions/D-0021-single-call-materiality-experiment.md), [체크포인트](./checkpoints/2026-09-20-single-call-materiality-compared.md)
- 축 문장 관계 추출 단독 시험: [결과](../docs/experiments/axis-relation-decomposition-2026-09-20/REPORT.md), [실패 포함 원출력](../docs/experiments/axis-relation-decomposition-2026-09-20/RAW-OUTPUTS.md), [D-0020](./decisions/D-0020-axis-relation-decomposition-experiment.md), [체크포인트](./checkpoints/2026-09-20-axis-relation-decomposition-completed.md)

- 중심 대상→기능→정제 필터: [결과](../docs/experiments/axis-function-filter-six-2026-09-20/REPORT.md), [전문](../docs/experiments/axis-function-filter-six-2026-09-20/REVIEW-PACKET.md), [직전 비교](../docs/experiments/axis-function-filter-six-2026-09-20/HISTORY-COMPARISON.md), [D-0018](./decisions/D-0018-axis-function-filter-experiment.md), [체크포인트](./checkpoints/2026-09-20-axis-function-filter-compared.md)
- 최소 충분 의미 필터 단독 시험: [결과](../docs/experiments/axis-meaning-filter-only-2026-09-20/REPORT.md), [원문·분해·필터 전문](../docs/experiments/axis-meaning-filter-only-2026-09-20/REVIEW-PACKET.md), [D-0019](./decisions/D-0019-axis-meaning-filter-only-experiment.md), [체크포인트](./checkpoints/2026-09-20-axis-meaning-filter-only-completed.md)
- 축 2차 필터 6문단 비교: [결과](../docs/experiments/axis-core-filter-six-2026-09-20/REPORT.md), [원문·대화](../docs/experiments/axis-core-filter-six-2026-09-20/REVIEW-PACKET.md), [계획](../docs/experiments/axis-core-filter-six-2026-09-20/PLAN.md), [D-0017](./decisions/D-0017-axis-core-filter-experiment.md), [완료 체크포인트](./checkpoints/2026-09-20-axis-core-filter-compared.md)
- 개인 실사용 공손룡 1문단 과도 보류·계약 재시도 조사: [검토](../docs/review/gongsun-p1-personal-overhold-2026-09-20.md), [체크포인트](./checkpoints/2026-09-20-gongsun-p1-overhold-review.md). Q-0010 재개, 코드 수정 없음.
- 개인 3단 워크벤치·맵·SERIOUS 원문 안내: [구현·검증](../docs/experiments/dialogue-workbench-2026-09-20/REPORT.md), [D-0016](./decisions/D-0016-personal-reading-workbench.md), [체크포인트](./checkpoints/2026-09-20-personal-reading-workbench.md)
- 청킹·압축 측정 보류 및 재개할 문제의식:
  [`D-0012`](./decisions/D-0012-paragraph-compression-measurement-deferred.md)
- 축별 공개·선택적 보완 구현: [D-0013](./decisions/D-0013-paragraph-optional-revision-v4.md),
  [검증 체크포인트](./checkpoints/2026-09-19-paragraph-v4-implemented.md)
- JEV를 core·optional·collision 다중 질의 의미 측정 계층 후보로 연구:
  [D-0033](./decisions/D-0033-jev-semantic-measurement-layer.md), [통합 예비 결과](../docs/experiments/jev-attribution-v1-2026-09-23/USER-REPORT.md). D-0036에서 superseded.
- JEV MR 구간 게이지·학생 보완/진행·선택적 V4 호출 개인 UI 프로토타입:
  [D-0035](./decisions/D-0035-jev-mr-gauge-ui-prototype.md), [오늘 종료 체크포인트](./checkpoints/2026-09-23-jev-experiment-session-closed-ui-next.md). D-0036에서 superseded.
- JEV–V4 자연 응답 일치도 shadow: [보고서](../docs/experiments/jev-v4-natural-agreement-v1-2026-09-29/REPORT.md), [체크포인트](./checkpoints/2026-09-29-jev-v4-natural-agreement.md). 역할 완전29건·50축, coverage AUC0.670·collision AUC0.445, AX-only V4와 required-MR JEV의 계약 불일치 확인; 자동 PASS 미승인.
- JEV 제품 적용 연구 보류: [D-0036](./decisions/D-0036-jev-product-work-parked.md), [체크포인트](./checkpoints/2026-09-29-jev-product-work-parked.md). 자동 PASS·MR 게이지·추가 rubric/collision 연구 중단, 운영 V4 유지.
- JEV 의미 요소 첫 파일럿 동결: [도파민 AX1 계획](../docs/experiments/jev-semantic-elements-dopamine-pilot-v1-2026-09-23/PLAN.md), [구조화 축](../docs/experiments/jev-semantic-elements-dopamine-pilot-v1-2026-09-23/FROZEN-AXIS.json)
- OpenAI API 도파민 AX1 분해 기준선: [3회 결과 보고](../docs/experiments/jev-semantic-elements-dopamine-pilot-v1-2026-09-23/OPENAI-DECOMPOSITION-REPORT.md)
- V4 민감 6문단 실모델 시험 완료: [보고](../docs/experiments/dialogue-v4-sensitive-2026-09-19/REPORT.md), [원문·전체 응답·피드백](../docs/experiments/dialogue-v4-sensitive-2026-09-19/REVIEW-PACKET.md), [완료 체크포인트](./checkpoints/2026-09-19-paragraph-v4-sensitive-completed.md)
- 오류 인용/축 문맥 기록 구별: [수정·오프라인 검증](../docs/experiments/dialogue-error-recording-fix-2026-09-19/REPORT.md), [체크포인트](./checkpoints/2026-09-19-paragraph-error-recording-fixed.md)
- 오류 구절 별도 지정·저장: [구현·검증](../docs/experiments/dialogue-error-quotes-fix-2026-09-19/REPORT.md), [D-0015](./decisions/D-0015-explicit-error-quotations.md), [체크포인트](./checkpoints/2026-09-19-explicit-error-quotations.md)
- 현재 주장/수정 이력 분리: [구현·검증 및 한계](../docs/experiments/dialogue-current-claims-fix-2026-09-19/REPORT.md), [D-0014](./decisions/D-0014-current-claims-recording.md), [체크포인트](./checkpoints/2026-09-19-current-claims-recording.md)
- 모든 판정에서 학생의 진행 선택 허용 (V4로 구현):
  [`D-0011`](./decisions/D-0011-paragraph-student-controlled-progression.md)
- 선택적 수정·축별 공개 UI의 선행 검토안 및 mRNA 기대값 재해석:
  [`2026-09-19 검토 기록`](../docs/review/paragraph-optional-revision-proposal-2026-09-19.md)
- 현행 승인 정책: [`문단 V4 운영 정책`](../docs/PARAGRAPH-SUMMARY-DIALOGUE-OPERATIONAL-POLICY-V4-2026-09-19.md)
- 이전 V3 정책: [`PARAGRAPH-SUMMARY-DIALOGUE-OPERATIONAL-POLICY-V3-2026-09-18.md`](../docs/PARAGRAPH-SUMMARY-DIALOGUE-OPERATIONAL-POLICY-V3-2026-09-18.md)
- 중심축 범위 V3 결정: [`D-0010`](./decisions/D-0010-paragraph-axis-scope-v3.md)
- V3 mRNA 1차 검증 (잔여 실패): [`REPORT.md`](../docs/experiments/dialogue-axis-v3-mrna-2026-09-18/REPORT.md)
- V3/V3.1 공통 규칙 대조 (94호출 완료, 운영 승격 없음): [`REPORT.md`](../docs/experiments/dialogue-axis-v31-cross-paragraph-2026-09-18/REPORT.md)
- V3/V3.1 6문단 원문·응답·피드백 전체 비교: [`REVIEW-PACKET.md`](../docs/experiments/dialogue-axis-v31-cross-paragraph-2026-09-18/REVIEW-PACKET.md)
- 이전 V2 정책: [`PARAGRAPH-SUMMARY-DIALOGUE-OPERATIONAL-POLICY-V2-2026-09-09.md`](../docs/PARAGRAPH-SUMMARY-DIALOGUE-OPERATIONAL-POLICY-V2-2026-09-09.md)
- V2 42사례 회귀: [`FINAL-REPORT.md`](../docs/experiments/dialogue-selective-router-v2-regression-42-2026-09-09/FINAL-REPORT.md)
- 선택적 라우팅의 선행 비교: [`REPORT.md`](../docs/experiments/dialogue-three-turn-concise-vs-hybrid-42-2026-09-08/REPORT.md)
- 최초 판정 세 입력 비교: [`REPORT.md`](../docs/experiments/dialogue-three-reference-paragraph-summary-15-2026-09-07/REPORT.md)
- 코드 진입점: `packages/pipeline/src/dialogue-experiment/gate.ts`,
  `packages/pipeline/src/dialogue-experiment/selective-feedback.ts`,
  `packages/pipeline/src/dialogue-experiment/session.ts`
- 사용자 직접 6지문 전 구간 기록:
  [`REVIEW-PACKET.md`](../docs/experiments/user-direct-full-cycle-six-2026-09-11/REVIEW-PACKET.md)
- 최신 학생용 UI 임시 터널:
  [`2026-09-12-student-ui-tunnel-refreshed.md`](./checkpoints/2026-09-12-student-ui-tunnel-refreshed.md)
- 충분 판정 사후 역전 원인 체크포인트:
  [`2026-09-11-paragraph-captured-overridden-by-validator.md`](./checkpoints/2026-09-11-paragraph-captured-overridden-by-validator.md)
- 상태 전이 계약 재시도 결정과 구현:
  [`D-0009`](./decisions/D-0009-paragraph-gate-contract-retry.md),
  [`2026-09-11-paragraph-gate-contract-retry-implemented.md`](./checkpoints/2026-09-11-paragraph-gate-contract-retry-implemented.md)
- 공손룡 동일 입력 유료 canary:
  [`REPORT.md`](../docs/experiments/dialogue-gate-contract-retry-canary-2026-09-11/REPORT.md)
- 상태 전이 역전의 직접 사용·42사례 회고:
  [`REPORT.md`](../docs/experiments/dialogue-state-transition-rollback-retrospective-2026-09-11/REPORT.md)

## 문단 골드

- **현재 방향:** [D-0094](./decisions/D-0094-source-jev-gold-flow-stopped.md) 원문 분할·JEV 흐름 중단(결과 보존) → [D-0095](./decisions/D-0095-central-story-two-stage-generation.md) 중심 이야기 두 단계 생성(원문 대조 보강→최소2축 축 생성) 별도 실험. [인계 문서](../docs/handoffs/2026-10-07-central-story-two-stage-generation.md), [체크포인트](./checkpoints/2026-10-07-central-story-two-stage-handoff.md). Codex 구현 완료·Claude 검토 통과. [D-0096](./decisions/D-0096-central-story-two-stage-transfer-approved.md) 승인 뒤 [실행 결과](../docs/experiments/central-story-two-stage-2026-10-07/REPORT.md)·[체크포인트](./checkpoints/2026-10-07-central-story-two-stage-completed.md): 47회·1단계 실패3, 성공22문단 48축(운영39)·1축3. 세부 복원·본론1축 해소, 개관·요약 축 분리·부수 보강 잔존. [사용자 판정](../docs/experiments/central-story-two-stage-2026-10-07/HUMAN-REVIEW.md): 도파민4 AX1·표면장력6 AX2 잉여. → [D-0097](./decisions/D-0097-central-story-two-stage-v2.md) v2(개관·요약 CONNECTIVE·보강 제한·스키마 정리) [인계](../docs/handoffs/2026-10-07-central-story-two-stage-v2.md)·[체크포인트](./checkpoints/2026-10-07-central-story-two-stage-v2-handoff.md). [v2 결과](../docs/experiments/central-story-two-stage-v2-2026-10-07/REPORT.md)·[체크포인트](./checkpoints/2026-10-07-central-story-two-stage-v2-completed.md): 실패1, 1축 10문단, 판정 일치3/4, 도입 문단 뭉침·원리+적용 합침. → [D-0099](./decisions/D-0099-central-story-two-stage-v3-no-role-exemption.md) v3(면제 제거·4문단 2단계 재실행) [인계](../docs/handoffs/2026-10-07-central-story-two-stage-v3.md)·[체크포인트](./checkpoints/2026-10-07-central-story-two-stage-v3-handoff.md). [v3 결과](../docs/experiments/central-story-two-stage-v3-2026-10-07/REPORT.md)·[체크포인트](./checkpoints/2026-10-08-central-story-two-stage-v3-completed.md): 4회, 도입 문단 뭉침 해소, 47축·1축8. [판정](../docs/experiments/central-story-two-stage-v3-2026-10-07/HUMAN-REVIEW.md): 정보비대칭3 2축, 정보비대칭2 2축이 더 나음. → 사용자 과적합 우려로 v3에서 멈춤(원리/적용 규칙 미채택, 반복 실행 미승인) [체크포인트](./checkpoints/2026-10-08-two-stage-paused-at-v3.md).
- **문단 전체 판정 그림자 실험:** [D-0101](./decisions/D-0101-holistic-verdict-shadow-experiment.md) V4 축 판정 대 문단 전체 판정(H0 순수/H1 참조 해석) 오프라인 비교. [계획](../docs/experiments/holistic-verdict-shadow-2026-10-08/PLAN-DRAFT.md)·[인계](../docs/handoffs/2026-10-08-holistic-verdict-shadow.md)·[체크포인트](./checkpoints/2026-10-08-holistic-verdict-shadow-handoff.md). [D-0102](./decisions/D-0102-holistic-verdict-shadow-transfer-approved.md) 뒤 [1차 결과](../docs/experiments/holistic-verdict-shadow-2026-10-08/REPORT.md)·[체크포인트](./checkpoints/2026-10-08-holistic-verdict-shadow-first-run.md).

- 감사기 v3 실행 결과: [보고서](../docs/experiments/axis-audit-v3-substantive-min-two-2026-10-07/REPORT.md), [D-0089 전송 승인](./decisions/D-0089-axis-audit-v3-transfer-approved.md), [체크포인트](./checkpoints/2026-10-07-auditor-v3-substantive-completed.md). 25회·계약실패2(형식). 표면장력3·정보비대칭2 판정대로 1축, 과병합 미재발. 공손룡1 소개표시 삭제로 정보 손실, 도파민2 미해결.

- 감사기 v3 실질 설명 기준 최소 2축: [D-0088](./decisions/D-0088-substantive-axis-minimum-two.md), [계획](../docs/experiments/axis-audit-v3-substantive-min-two-2026-10-07/PLAN.md), [체크포인트](./checkpoints/2026-10-07-auditor-v3-substantive-prepared.md). D-0086 규칙2 수정: 원문 한 문장 소개·연결 축은 흡수·삭제 가능(코드 검사). 준비·API0, 전송 승인 대기.

- 감사기 v2 경계 3문단 사용자 판정: [판정](../docs/experiments/axis-audit-v2-min-two-2026-10-06/HUMAN-REVIEW.md), [체크포인트](./checkpoints/2026-10-06-auditor-v2-human-review-three.md). 표면장력3·정보비대칭2 1축 적당(최소2축 규칙과 불일치), 공손룡3 경계.

- 감사기 v2 실행 결과: [보고서](../docs/experiments/axis-audit-v2-min-two-2026-10-06/REPORT.md), [D-0087 전송 승인](./decisions/D-0087-axis-audit-v2-transfer-approved.md), [체크포인트](./checkpoints/2026-10-06-auditor-v2-min-two-completed.md). 25회 성공·계약 위반0, 60→56축(v1 46)·추가병합1·삭제3. 과병합 해소, 최소2축으로 연결축 잔존(표면장력3·정보비대칭2), 도파민2 D1 대비 미해결. 사용자 검토 대기.

- 감사기 v2 최소 2축·병합 기록 계약: [D-0086](./decisions/D-0086-auditor-min-two-axes-and-merge-contract.md), [계획](../docs/experiments/axis-audit-v2-min-two-2026-10-06/PLAN.md), [체크포인트](./checkpoints/2026-10-06-auditor-v2-min-two-prepared.md). 도입·정리 외 일반 문단은 감사 후 최소2축(감사기만, 예외 없음), v1 자동 병합 입력 재사용 감사25회 준비·API0, 전송 승인 대기.

- 감사기 과병합 Codex 2라운드 논의: [정리](../docs/experiments/axis-auto-merge-audit-five-passages-2026-10-02/AUDITOR-OVERMERGE-DISCUSSION.md), [1라운드](../docs/experiments/axis-auto-merge-audit-five-passages-2026-10-02/codex-overmerge-round1.md), [2라운드](../docs/experiments/axis-auto-merge-audit-five-passages-2026-10-02/codex-overmerge-round2.md), [체크포인트](./checkpoints/2026-10-06-auditor-overmerge-codex-discussion.md). 추가병합10중9가 문단전체병합. 관계중심기준+원질문별요구·손실대조계약 우선, FA문구 수정·재확인게이트는 사용자 결정 대기. 무변경·의견.

- 운영 골드 대 자동 병합·감사 최종본 비교: [비교 문서](../docs/experiments/axis-auto-merge-audit-five-passages-2026-10-02/OPERATIONAL-VS-AUDIT.md), [체크포인트](./checkpoints/2026-10-06-operational-vs-auto-merge-audit-comparison.md). 43→46축·L1 평균82→106자, Claude 의견 실험우세7·운영우세4·혼재3·동등11. 도파민2·표면장력2·5는 운영보다 후퇴. 무호출·사람 판정 아님.

- 자동 병합·감사 직접 수정 완료: [결과](../docs/experiments/axis-auto-merge-audit-five-passages-2026-10-02/REPORT.md), [세 단계 전문](../docs/experiments/axis-auto-merge-audit-five-passages-2026-10-02/REVIEW.md), [D-0080 전송 승인](./decisions/D-0080-auto-merge-audit-external-transfer-approved.md), [체크포인트](./checkpoints/2026-10-02-auto-merge-audit-completed.md). 37호출·71→60→46축, 추가병합10·삭제1·문구수정4. 누락미검출/과병합의심·형식2미준수 잔존·운영미반영. [D-0079 준비](./decisions/D-0079-auto-merge-auditor-execution.md)의 전송 대기는 해소.

- 자동 병합 뒤 전체 축 감사: [D-0077](./decisions/D-0077-post-merge-axis-auditor.md), [체크포인트](./checkpoints/2026-10-02-post-merge-axis-auditor.md). 남은 과분해·불필요한 축·문구 결함 검토. 허용된 L2 추상화 유지·D-0080에서 별도 시험 완료.

- 다음 원문분할 후보의 L2 의심 자동 병합: [D-0076](./decisions/D-0076-l2-suspected-duplicate-auto-merge.md), [체크포인트](./checkpoints/2026-10-02-l2-auto-merge-policy.md). FA 회피 우선·추가 의미 확인 단계 제거. 후속 D-0080 별도 시험에 적용·과거 결과 보존.

- mRNA 제외 UI5지문 비교: [비교](../docs/experiments/axis-candidate-jev-five-passages-2026-10-02/COMPARISON.md), [양쪽 축·원문](../docs/experiments/axis-candidate-jev-five-passages-2026-10-02/REVIEW.md), [D-0075](./decisions/D-0075-five-passage-source-axis-jev-comparison.md), [체크포인트](./checkpoints/2026-10-02-five-passage-gold-comparison.md). 기존43→최종70축·중복 의심9/병합1, Codex 품질 검토·운영 미채택.

- 현재 개발자 골드 생성 명칭: **중심 이야기 기반 L1·L2 공동 생성**([D-0073](./decisions/D-0073-current-gold-generation-name.md)), 자산 `conditional-meta-gold-v1`.

- mRNA4문단 L2 중복 후처리: [실험](../docs/experiments/mrna-p4-l2-merge-2026-10-02/REVIEW.md), [D-0071](./decisions/D-0071-mrna-p4-l2-duplicate-merge-pilot.md). 중복 탐지·원문 확인 후 기존 C2 선택, 3축→2축·3호출 성공·단회 한정.

- 다음 시험의 근소 점수 차이에서 적은 축 우선: [D-0068](./decisions/D-0068-near-score-fewer-axes-next-test.md), [체크포인트](./checkpoints/2026-10-02-near-score-fewer-axes-rule.md). 평균 점수 차이≤0.10/4점 확정·코드/과거 결과 미변경.

- mRNA 전체문맥·1/2/3/4축+별도L2: [실제 결과](../docs/experiments/axis-candidate-jev-mrna-passage-2026-10-02/REVIEW.md), [D-0067](./decisions/D-0067-mrna-passage-axis-l1-l2-pilot.md), [체크포인트](./checkpoints/2026-10-02-mrna-passage-axis-l1-l2-pilot.md). 생성15·24후보·JEV30·L2 5성공, 선택4/3/3/3/4, 근소순위·4문단중복미검증·운영미변경.

- 새 사용자 판정 미열람 Codex 경계 심사: [고정 판정](../docs/experiments/axis-candidate-jev-eight-2026-10-02/CODEX-INDEPENDENT-ADJUDICATION.md), [체크포인트](./checkpoints/2026-10-02-axis-jev-codex-independent-adjudication.md). 잠정JEV우위1·인정7·명백열위0, 사람 승인 아님.

- 8문단2/3/4축 후보+JEV5회: [최종 요약](../docs/experiments/axis-candidate-jev-eight-2026-10-02/SUMMARY.md), [전체 분석](../docs/experiments/axis-candidate-jev-eight-2026-10-02/REVIEW.md), [D-0066](./decisions/D-0066-offline-axis-candidate-jev-pilot.md), [체크포인트](./checkpoints/2026-10-02-axis-candidate-jev-eight.md). 24생성·33후보·JEV45성공·사람exact3/8·F1 75.7%, 제품 보류·운영 미채택.

- 사용자 경계8문단과 이전/현재 프롬프트 비교: [보고서](../docs/experiments/question-shift-human-eight-2026-10-02/REVIEW.md), [체크포인트](./checkpoints/2026-10-02-question-shift-human-eight-api.md). 총16성공·완전일치3/8 대1/8·F1 66.7% 대61.1%, 미채택.

- 공손룡3 이전/현재 프롬프트 API 비교: [실제 결과](../docs/experiments/question-shift-gongsun-p3-2026-10-02/REVIEW.md), [체크포인트](./checkpoints/2026-10-02-question-shift-gongsun-p3-api.md). 각1회4축/3축·두 근거 통합 여부 차이·미채택.

- 도파민3 이전/현재 프롬프트 API 비교: [실제 결과](../docs/experiments/question-shift-dopamine-p3-2026-10-02/REVIEW.md), [체크포인트](./checkpoints/2026-10-02-question-shift-dopamine-p3-api.md). 각1회 모두3축·가바성 뉴런 문장 소속 차이·미채택.

- 중심 질문 전환 mRNA5 단회 API: [실제 결과](../docs/experiments/question-shift-mrna-p5-2026-10-02/REVIEW.md), [체크포인트](./checkpoints/2026-10-02-question-shift-mrna-p5-api.md). 원문만 입력·4축 생성·미채택.

- UI 연결 단일 축 정적 검토: [검토 문서](../docs/review/ui-linked-single-axis-review-2026-10-02.md), [체크포인트](./checkpoints/2026-10-02-ui-linked-single-axis-review.md). 기존/조건부 구분·전 단일 축 사례 판단·분리 후보, 자산 미변경.

- 기능적 메타 축 생성 v1: [보고서](../docs/experiments/meta-axis-generation-corporate-p4-2026-09-29/REPORT.md), [전체 출력](../docs/experiments/meta-axis-generation-corporate-p4-2026-09-29/RAW-OUTPUTS.md), [D-0038](./decisions/D-0038-functional-meta-axis-generation-pilot.md), [체크포인트](./checkpoints/2026-09-29-functional-meta-axis-generation-pilot.md). 법인4문단6호출·기존축과메타동시생성, 메타1방향누락·메타2위험약화. 학생평가미실행·운영미승격.

- 승인 골드 JEV sensor 후보 무호출 감사: [보고서](../docs/experiments/jev-candidate-sensor-audit-v1-2026-09-23/REPORT.md), [검토 패킷](../docs/experiments/jev-candidate-sensor-audit-v1-2026-09-23/REVIEW-PACKET.md), [체크포인트](./checkpoints/2026-09-23-jev-candidate-sensor-audit.md). P 후보 전축 회수, 자동 확정 미통과.
- 도파민 AX1 P/E 정규화 설계 정정: [보고서](../docs/experiments/jev-element-normalization-dopamine-v1-2026-09-23/REPORT.md), [체크포인트](./checkpoints/2026-09-23-jev-element-normalization-dopamine.md). API 재판정 과업이어서 의도한 정규화 성능 집계에서 제외.

- 현재 자산 원장: [`PARAGRAPH-GOLD-ASSET-REGISTER-2026-09-09.md`](../docs/PARAGRAPH-GOLD-ASSET-REGISTER-2026-09-09.md)
- 운영 생산 기준선: [`PARAGRAPH-GOLD-OPERATIONAL-BASELINE-2026-09-04.md`](../docs/PARAGRAPH-GOLD-OPERATIONAL-BASELINE-2026-09-04.md)
- 최신 독립 재감사: [`FINAL-REPORT.md`](../docs/experiments/paragraph-gold-collaborative-reaudit-16-2026-09-09/FINAL-REPORT.md)
- 통합 감사 v2 일반화 실패 근거: [`EVALUATION-REPORT.md`](../docs/experiments/paragraph-gold-audit-v2-batch003-retrospective-2026-09-04/EVALUATION-REPORT.md)
- 생성·감사 코드: `packages/pipeline/src/paragraph-analysis/`

## 문항 골드

- 현재 자산 원장: [`PROBLEM-GOLD-ASSET-REGISTER-2026-09-09.md`](../docs/PROBLEM-GOLD-ASSET-REGISTER-2026-09-09.md)
- 24문항 생성 보고서: [`REPORT.md`](../docs/experiments/problem-gold-prospective-blind-2026-09-03/REPORT.md)
- 공식 해설 포함 상태 감사: [`OFFICIAL-EXPLANATION-AUDIT.md`](../docs/experiments/problem-gold-prospective-blind-2026-09-03/OFFICIAL-EXPLANATION-AUDIT.md)
- 시각 자료 감사: [`VISUAL-RECOGNITION-AUDIT.md`](../docs/experiments/problem-gold-prospective-blind-2026-09-03/VISUAL-RECOGNITION-AUDIT.md)
- 오프라인 한정 결정: [`D-0003`](./decisions/D-0003-problem-gold-offline-only.md)
- 생성·검토 코드: `packages/pipeline/src/problem-solving/gold-generation-runtime.ts`,
  `packages/pipeline/src/problem-solving/prospective-gold-experiment.ts`

## 평가 이론과 초기 제품 설계

- 문단 분석 지도 브레인스토밍(2026-10-16): [논의 기록](../docs/review/paragraph-analysis-map-brainstorm-2026-10-16.md), [D-0141](./decisions/D-0141-paragraph-analysis-map-direction.md), [체크포인트](./checkpoints/2026-10-16-paragraph-analysis-map-brainstorm.md). Q-0037 분석 자료: 상향 위계 지도·동결·닫힌 어휘·생성형 판정 합의, 판정 설계 세부는 Claude 제안 미합의.
- 학생 상태 모델 V1: [`STUDENT-STATE-MODEL-V1.md`](../docs/STUDENT-STATE-MODEL-V1.md), [D-0048](./decisions/D-0048-student-state-model-next-goal.md), [코어](./checkpoints/2026-10-01-student-state-model-phase1.md), [영속화·API](./checkpoints/2026-10-01-student-state-persistence-api.md), [기존 로그·출처 감사](./checkpoints/2026-10-01-student-state-provenance-audit.md), [개발자 리포트 UI](./checkpoints/2026-10-01-student-state-developer-report-ui.md), [기본 비활성 학생 프리뷰](./checkpoints/2026-10-01-student-feedback-preview.md), [판단 가능 증거 신뢰도](./checkpoints/2026-10-01-student-state-determinate-reliability.md), [플래그 기반 학생 진입점](./checkpoints/2026-10-01-student-feedback-capability-navigation.md), [지문 완료 시점 증거 저장](./checkpoints/2026-10-01-student-state-completion-persistence.md), [증거 계약 무결성](./checkpoints/2026-10-01-student-evidence-contract-integrity.md), [완료→집계→화면 E2E](./checkpoints/2026-10-01-student-state-live-persistence-e2e.md)
- 학생 내적 사고 추론·지문/문항 정량화 논의(2026-10-10, parked): [논의 기록](../docs/review/inner-thought-inference-moat-discussion-2026-10-10.md), [체크포인트](./checkpoints/2026-10-10-inner-thought-inference-moat-parked.md), Q-0034. 함정 지도 v0 실험: [D-0109](./decisions/D-0109-trap-map-v0-external-rate-experiment.md), [인계](../docs/handoffs/2026-10-10-trap-map-v0-external-rates.md), [체크포인트](./checkpoints/2026-10-10-trap-map-v0-handoff.md). [결과](./checkpoints/2026-10-10-trap-map-v0-results.md), [보고서](../docs/experiments/trap-map-v0-external-rates-2026-10-10/REPORT.md). 정답 경로 요소·추론 깊이(2026-10-13, 실행 보류): [D-0119](./decisions/D-0119-answer-path-elements-and-depth.md), [정의 문서](../docs/review/answer-path-element-vocabulary-v0-2026-10-13.md), [체크포인트](./checkpoints/2026-10-13-answer-path-elements-depth-parked.md). 파일럿 1차: [결과](./checkpoints/2026-10-13-answer-path-depth-pilot-v1-results.md), [보고서](../docs/experiments/answer-path-depth-pilot-2026-10-13/REPORT.md); 개정 [D-0121](./decisions/D-0121-answer-path-layers-and-failed-operation.md). 파일럿 2차: [결과](./checkpoints/2026-10-13-answer-path-depth-pilot-v2-results.md), [보고서](../docs/experiments/answer-path-depth-pilot-v2-2026-10-13/REPORT.md). 깊이=노드 수: [D-0122](./decisions/D-0122-answer-path-depth-node-count.md). 오답 지표 시험: [결과](./checkpoints/2026-10-13-answer-path-wrong-cases-results.md), [보고서](../docs/experiments/answer-path-wrong-cases-2026-10-13/REPORT.md). 오진술 우선: [D-0123](./decisions/D-0123-answer-path-explicit-misstatement-priority.md). 요소 덮어쓰기: [D-0124](./decisions/D-0124-answer-path-element-override-on-evidence.md). sol 종단 검증: [결과](./checkpoints/2026-10-14-answer-path-sol-e2e-results.md), [보고서](../docs/experiments/answer-path-sol-e2e-2026-10-13/REPORT.md). 요소 지표 = 실패 분포: [D-0126](./decisions/D-0126-answer-path-element-metric-failure-distribution.md), [체크포인트](./checkpoints/2026-10-14-answer-path-element-metric-failure-distribution.md). 외부 비율 베이지안 활용 아이디어(미착수): [체크포인트](./checkpoints/2026-10-14-bayesian-external-rates-idea.md).
- 학생 상태 모델 V1 완료 감사: [`STUDENT-STATE-MODEL-V1-COMPLETION-AUDIT.md`](../docs/STUDENT-STATE-MODEL-V1-COMPLETION-AUDIT.md), [체크포인트](./checkpoints/2026-10-01-student-state-completion-audit.md)
- 학생 피드백 로컬 전용 접근 경계: [체크포인트](./checkpoints/2026-10-01-student-feedback-local-only.md)
- 학생 자기 점검 헤드라인 정합성: [체크포인트](./checkpoints/2026-10-01-student-feedback-confidence-headline.md)
- 학생 피드백 차원별 다음 행동: [체크포인트](./checkpoints/2026-10-01-student-feedback-next-action.md)
- 개발자 API 학생 상태 우회 차단: [체크포인트](./checkpoints/2026-10-01-student-state-developer-bypass-closed.md)
- 과거 직접 사용 문제6세션 학생 상태 감사: [보고서](../docs/experiments/student-state-historical-direct-six-2026-10-01/REPORT.md), [체크포인트](./checkpoints/2026-10-01-student-state-historical-six-audit.md)

- 프로젝트 프롬프트 언어 기본값: [`D-0034`](./decisions/D-0034-korean-default-for-prompts.md)

- 전체 프로젝트 브리핑: [`PROJECT-BRIEFING.md`](../docs/PROJECT-BRIEFING.md)
- 아키텍처: [`ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
- 문단 평가 결정의 초기 기록: [`DECISIONS.md`](../docs/DECISIONS.md)
- 학생 루프: [`STUDENT-LOOP-DESIGN.md`](../docs/STUDENT-LOOP-DESIGN.md)
- 데이터 계약: [`DATA-SCHEMA.md`](../docs/DATA-SCHEMA.md)

## 이전 상태 문서

다음 문서는 삭제하지 않은 역사 자료다. 현재 상태 확인에는 이 디렉터리의
`CURRENT_STATE.md`를 먼저 사용한다.

- [`WORKSTREAM-STATE.md`](../docs/WORKSTREAM-STATE.md): 2026-09-09까지의 상세 누적 작업 흐름.
  현행 사실이 많지만 이력까지 한 파일에 들어 있어 탐색 비용이 크다.
- [`NEXT.md`](../docs/NEXT.md): 2026-08 초 기준의 긴 진행 로그. 최신 재개 지점으로 사용하지 않는다.
- [`PROBLEM-SOLVING-WORKTREE-HANDOFF-2026-08-26.md`](../docs/PROBLEM-SOLVING-WORKTREE-HANDOFF-2026-08-26.md): 과거 작업 이관 기록.

## 출처 우선순위

같은 주제의 내용이 충돌할 때는 다음 순서로 확인한다.

1. 원자료와 현재 코드·테스트
2. 현행 정책 ID가 있는 운영 문서와 자산 manifest
3. 입력·출력이 보존된 실험 보고서
4. accepted 결정 레코드와 `CURRENT_STATE.md`
5. 체크포인트, 브리핑, 과거 작업 흐름, 채팅 요약

상위 출처가 메모리와 충돌하면 메모리를 그대로 따르지 말고 충돌을 기록한 뒤 정본을 갱신한다.
- 제품 타겟·보상 구조(2026-10-14): 첫 타겟 상위권 중등 [D-0125](./decisions/D-0125-first-target-top-tier-middle-school.md). 보상 브레인스토밍(보류)·문단 요약 분리·영역 범위·문법 DB·독서 IRT 등급 추정 논의(미결정) [기록](../docs/review/reward-structure-brainstorm-2026-10-14.md), Q-0035, [체크포인트](./checkpoints/2026-10-14-reward-brainstorm-target.md).
- 단순 형식 개발자 모드 v2(2026-10-16): [D-0142](./decisions/D-0142-paragraph-simple-v2-restated-summary-attempts.md), [피드백 1~6](../docs/review/simple-holistic-dev-ui-feedback-2026-10-16/README.md), [인계](../docs/handoffs/2026-10-16-paragraph-simple-holistic-v2-feedback.md). 재구성 요약 칸(판정마다), 반복 시도·시도 메모, 말풍선 분리·상태 표시, 문장 전체 인용.
- 단순 형식 개발자 모드 v3(2026-10-17): [D-0144](./decisions/D-0144-paragraph-simple-v3-closing-bubbles-highlights.md), [인계](../docs/handoffs/2026-10-17-paragraph-simple-holistic-v3.md). 마무리 말풍선(도입+상자, 오류별), 한 문장 표시, 칭찬 외 항상 표시, targetGap 유지. 판정 모델 gpt-6-luna(환경 변수).
- 단순 형식 v4(2026-10-17): [D-0145](./decisions/D-0145-paragraph-simple-multi-gap-questions.md), [인계](../docs/handoffs/2026-10-17-paragraph-simple-holistic-v4.md). 구멍 번호 질문(최대 2)·물은 것만 평가·질문 뒤 마무리는 항상 문단 핵심.
- 단순 형식 전체 경로 시뮬레이션(2026-10-17~18): [README](../docs/experiments/simple-holistic-path-simulation-2026-10-17/README.md), [실행 결과](../docs/experiments/simple-holistic-path-simulation-2026-10-17/runs/2026-10-17/RESULTS.md). 29경로×2문단, luna 3회: 일치 57·부분 51·갈라짐 66, A만 말한 응답 판정 흔들림·겹질문·오류 단위.
