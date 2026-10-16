# 현재 프로젝트 상태
- 최근 판정기 결정: 2026-10-01 KST ([D-0063](./decisions/D-0063-problem-feedback-v4-hardening.md)): 네 실패 수정·재검증 승인 후 구현했다. [결과](../docs/experiments/problem-feedback-v4-hardening-2026-10-01/REPORT.md): 54요청·확인분 추정$0.5678646/미확정예약$0.13091, 최초33/34·후속10/10 사전필드 일치. 1회 API 거부는 시스템 오류로 보존했다. 공개 코칭 손상2건 차단·재생성, 원문1구절 복원. 모델 손상 생성·의미 검토는 남고 운영 v3는 유지한다.
- 개발자 문제 UI·터널 연결 승인([D-0065](./decisions/D-0065-developer-problem-v4-workbench-and-tunnel.md)): `/problem/dev/v4` 지문/문제/누적 대화 3단·평가 서랍·v4 연결 완료. 고유 관련98·브라우저38·build 통과, 공개 UI/세션/검사200. 기존 문단 API 세션을 유지하고 v4만5175로 분리 실행했다([구현 기록](./checkpoints/2026-10-02-developer-problem-v4-ui-live.md)). [공손룡12 실제 사용 검토](./checkpoints/2026-10-02-gongsun-q12-v4-user-review.md): 극성·선택 정오는 맞지만 지시 대상/기호 위치 혼동에 따른 과잉 교정 의심과 수정 증거 연결 문제가 관측됐다. 학생용v3 유지·이번 검토 제품 수정/추가 모델 호출0.
- 상태 정본 버전: 1
- 프로젝트 단계: 학생용 연결 UI 준비 완료 / 사용자 직접 전 구간 사용 완료 / 외부 학생 검증 대기 · 첫 집중 타겟(2026-10-14): 상위권 중등([D-0125](./decisions/D-0125-first-target-top-tier-middle-school.md)). 지문 고1 학평 확장은 합의만, 작업 미정. 보상 구조는 브레인스토밍 후 보류(Q-0035).
- 상세 출처 지도: [`INDEX.md`](./INDEX.md) · 작업 갈래 한눈에: [`WORK_TREE.md`](./WORK_TREE.md)
- 프로젝트 작업 지시 확인: [D-0069](./decisions/D-0069-clarify-user-instructions-before-work.md)에 따라 이해 불충분한 부분은 작업 전에 목록 제시 → 하나씩 질문 → 사용자 답변으로 해소 여부 확인 후 실행한다. 업무 분장([D-0128](./decisions/D-0128-claude-subagent-work-division.md), D-0092 대체, 2026-10-14 챗GPT 종료): 클로드 메인 세션은 주 사고 파트너, 확정 설계 실행(`docs/handoffs/` 인계 문서)은 executor 하위 에이전트(sonnet)에 위임. 모두 `AGENTS.md`에 적용.
이 문서는 **지금 참인 것만** 담는다. 변경 과정과 과거 수치는 결정 레코드, 체크포인트, 실험 보고서에서 찾는다.
## 목표
수능 국어 비문학 학습에서 학생이 원문의 핵심 관계를 스스로 파악하도록 돕는다. 제품에는
문단 자유 요약 대화와 객관식 문제 풀이 대화가 있으며, 정답을 대신 말하는 것보다 학생이 실제로
이해를 수정했는지를 확인하는 데 초점을 둔다.
## 현재 운영 설계
### 문제 풀이 대화
- 명칭([D-0090](./decisions/D-0090-problem-evaluator-v5-naming.md), 2026-10-07): 'v3 기반 v4 후보'를 **v5**로 부르며 실제 운영 후보다. v4는 운영 후보로 쓰지 않는다. 파일·코드 이름은 그대로다. 상태: `V3_STUDENT_DEFAULT / V4_DEVELOPER_UI_LIVE / REAL_STUDENT_USE_PENDING`. [D-0072](./decisions/D-0072-v3-based-problem-candidate-accepted-test-requested.md) 후보 승인·[D-0074](./decisions/D-0074-problem-candidate-smoke-transfer-approved.md) 전송 승인 뒤 [3문항 시험](../docs/experiments/problem-v3-based-v4-smoke-2026-10-02/REPORT.md)18요청 완료. 후보 최초8/10 일치지만 공손룡 과잉 교정1/3·대상 역전 과수용1건. 후속3경로 일치·공손룡1경로 진입 불가. 충분성 범위 문제도 남으며 개선 미입증·UI 평가기는 기존 v4다.
- 정책: `PS-PROBLEM-SOURCE-DIRECT-V1`. [기호 보완](./checkpoints/2026-10-02-ui-linked-problem-source-markers.md):29범위·ⓒ 정정·140테스트통과、서버 재시작 전。[직접 표시 단독](./checkpoints/2026-10-03-inline-source-marker-pilot-completed.md) 개선 미입증。[표 결합20요청](./checkpoints/2026-10-03-gongsun-interpretation-modes-completed.md):같은/별도 호출 표는 각3/3 올바름, 학생 역전 검출 같은2/3·별도3/3. 같은 호출 학생 주장 덮어쓰기1회、인용 태그5출력 복구。질문 명료성·일반화 미확정、운영 미반영。
- 모든 런타임 단계는 완전한 원문·문항·선지·정답·공식 해설·원자료 이미지를 직접 사용한다. 예외 방향으로 기호·도표 지칭에 한한 문항별 해석본(기호 해석만)과 인용 형식 규칙을 채택했으나([D-0084](./decisions/D-0084-local-marker-gloss-direction.md), 2026-10-06) 운영 판정기에는 아직 연결하지 않았다. 공손룡12에서 과잉 교정 감소·귀속 대체 억제를 관측했다([작업 기록](./checkpoints/2026-10-06-gongsun-marker-gloss-and-quote-format.md)). 관계만 말한 근거의 충분성은 [D-0085](./decisions/D-0085-relation-only-rationale-sufficient.md). 사람 검토 없는 자동 생성 해석본은 두 형식 모두 S5 과잉 교정을 막지 못했다([자동 생성 기록](./checkpoints/2026-10-07-gongsun-auto-gloss-generation.md)). v3 기호 실험은 마무리했다([D-0091](./decisions/D-0091-v3-marker-phase-closed-port-to-v5.md)). v5는 v5 규칙 + 자동 생성·자동 검수 중간안 해석본 + v3 판정 방법으로 구성하기로 했으나([D-0093](./decisions/D-0093-v5-composition-auto-gloss-pipeline.md), [설계안](../docs/review/v5-marker-port-design-2026-10-07.md)), 현재 v5는 해석본 없는 methods 조성이고 해석본 사용은 luna·sol 기호 오독 확인 전까지 보류한다([D-0114](./decisions/D-0114-v5-current-composition-methods-without-gloss.md)). 1단계 해석본 파이프라인 시험(57요청): 심은 오류 24/24 검출·오탐 0이나 사례 문장 검수가 약하고 대조 기준이 실행마다 흔들려 맞는 기호를 뺀 경우가 있다([결과](../docs/experiments/marker-gloss-pipeline-gongsun-2026-10-07/REVIEW-SUMMARY.json)). 대조 규칙을 고친 v2(Codex 구현)는 3회 모두 대상·화자 오류 없이 채택했고 사례 결함 1건이 남았다([v2 결과](../docs/experiments/marker-gloss-pipeline-v2-gongsun-2026-10-07/REVIEW-SUMMARY.json)). 2단계 v5 세 조건 비교: 판정 방법·해석본은 ⓓ=빨간 옷 오독을 4/24→0/24로 줄였으나 S5 과잉 교정을 0/3→2/3으로 늘렸다([결과](../docs/experiments/v5-marker-judgment-gongsun-2026-10-07/REVIEW-SUMMARY.json)). 원문 대입 확인·모델 비교: S5 과잉 교정과 ⓓ 오독은 terra에서만 나타났고 gpt-6.1-sol은 대입 확인 없이 65/66이었다(단가 미확인, [모델 비교](../docs/experiments/v5-substitution-check-review-2026-10-07/REVIEW-SUMMARY.json)). 공급자 비교(methods 조건, GPT 기준 전 항목 통과): gemini-3.8-flash 32/33·중앙값 24초, deepseek-flash low 25/33·high 22/33(S7 오독 통과), 같은 기준 sol 32·luna 29·terra 28([공급자 비교](./checkpoints/2026-10-08-v5-provider-compare-gongsun.md)). 판정기 모델은 미결정. v5 다문항 시험(2026-10-09, [작업 기록](./checkpoints/2026-10-09-v5-multi-item-luna-sol.md)): luna·sol medium, 5문항 180칸. 의미 검토 P1~P4 전부 통과 sol 88/90, luna 78/90(결론 중복을 P4 실패로 보면 67/90). luna 학생 노출 근거 오류 3·내부 번호 노출 17칸. 비용 luna 0.18·sol 2.74달러, 칸 중앙값 16.9·23.9초. 판정기 모델은 선택 정오 라우팅으로 결정([D-0104](./decisions/D-0104-problem-evaluator-model-routing-by-choice.md): 정답 luna, 오답 sol, 운영 코드 미변경·REPAIR 미검증). 2026-10-14 Gemini 가격 재확인 뒤에도 이 구성을 유지한다([D-0129](./decisions/D-0129-keep-luna-sol-over-gemini-after-price-check.md)). 교정 판정은 국소 오류만 [D-0108](./decisions/D-0108-repair-judges-local-error-only.md)(지시문 미변경). 세션 안 배정 [D-0107](./decisions/D-0107-session-model-routing-repair-reselect-coaching.md)(선택은 정오, REPAIR luna, 코칭은 세션 모델). 교정 성공 뒤 [다시 선택]/[코칭 보기] 흐름 [D-0106](./decisions/D-0106-post-repair-choice-reselect-or-coaching.md)(구현 미착수). 교정 질문 권장 규칙 [D-0105](./decisions/D-0105-correction-question-covers-choice-deciding-relation.md)(선지 정오를 가르는 관계까지 한 질문으로, 권장), REPAIR 탁상 점검은 [작업 기록](./checkpoints/2026-10-10-v5-repair-desk-check.md). 종료 코칭 의미 검토(183칸): sol 원문 오류 0·경미 1, 종료 사유와 어긋남 4(D-0108 v2에선 발생 안 함); luna 정답 세션 설명은 원문 오류 0·경미 2이나 내부 번호 14/57·3인칭 지칭으로 공개 형식 미달([작업 기록](./checkpoints/2026-10-10-v5-repair-coaching-review.md)). 실패 케이스만 수정 확인 시험: luna 정답 설명에 해요체 지시문을 주자 12유형 36칸 형식·내용 문제 0, sol은 v2 REPAIR 상태에서 지어낸 실패 이유 0/9([작업 기록](./checkpoints/2026-10-10-v5-coaching-fix-test.md), 운영 미반영). 개발자 v4 경로에 v5·라우팅·교정 후 버튼·별도 종료 설명을 연결 구현(코덱스, Claude diff 검토, 테스트 342/342; 실모델 확인 전, 파일 다수 git 미추적) [D-0112](./decisions/D-0112-v5-developer-path-connection-end-states.md), [작업 기록](./checkpoints/2026-10-10-v5-developer-path-connected.md). 실모델 확인 시험(2026-10-11): 34칸 중 32칸 예정 경로·모델 일치, 마지막 설명 28칸 원문 오류 0(GPT 28/28), 0.42달러, 한 제출 최장 중앙값 13.9초([작업 기록](./checkpoints/2026-10-11-v5-live-connection-test.md)). 이어서 종료 코칭에 마지막으로 고른 선지 설명을 넣고 서버 정답 줄을 뺐다(D-0112 4·5항, 입력에 고른 선지 번호 누락 버그 수정, 재확인 10/10) [작업 기록](./checkpoints/2026-10-11-v5-chosen-option-and-answer-line.md).
- v5 다양한 수준·경로 전체 기록(2026-10-12): 사용자 직접 실행·전송 승인 뒤 현재 6문항 각각 8개, 총 48개 가상 세션을 실제 평가기로 종료했다. 검증된 정답 6·정답 근거 미확인 12·코칭 종료 30, 국소 교정 성공 19는 최종 해결 수와 구별한다. Claude 재검토([REVIEW-claude](../docs/experiments/v5-diverse-48-2026-10-12/REVIEW-claude.md)): 코칭 30개 원문 오류 0, D-A2는 기록 잡음(오답 REPAIR의 충분성 필드 미사용), D-B2 3인칭 확인, I-A1은 판정 수용·질문 대상 빗나감. 새 발견: 정답·약한 근거 12/12가 한 줄로 종료(D-0104 관대함 규칙대로, 정상) → 사용자 결정으로 이 경우도 luna 설명 종료로 바꿨다(D-0112 6항). 학생용 문장은 모두 반말로 통일했다(D-0116). 이어서 개발자 화면 입력 영역 고정, 마지막 설명 칸 나눔·시작/이해 확인(D-0117), 직접 교정 질문·지문 표시(D-0118)까지 2026-10-13에 구현했다. 테스트 442/442. 이어 결론 생략 재구성 규칙(D-0120)을 지시문에 넣고 새 실행기로 실모델 확인 시험(26세션, 0.81달러)을 했다. 결론 생략 7/8 질문, 대조군 변화 없음, 자동 검사 위반 0, 오답 경로 정답 칸 첫 문장 겹침 8/8 발견([결과](../docs/experiments/v5-live-check-2026-10-13/REPORT.md)). 지난 실험 실행기 테스트는 새 흐름과 비호환이다([작업 기록](./checkpoints/2026-10-13-v5-tone-banmal-correct-unverified.md)), 오답·막연한 근거 5/6 되묻지 않음(규칙대로), 공개 코칭 "교정 질문" 노출 6/30, 서버 고정 문구 합쇼체·"①를" 조사. 제출 대기 중앙값 약 14초·최대 48.5초. 128개 실제 API 응답, 기존 단가 비용 추정 $1.65; 원응답·실패·복원 이력을 보존했고 운영 코드·지시문·학생 기본값은 유지했다. 실제 학생 효과나 운영 정확도 검증은 아니다. [작업 기록](./checkpoints/2026-10-12-v5-diverse-48-recorded.md), [문항별 과정](../docs/experiments/v5-diverse-48-2026-10-12/REVIEW-INDEX.md), [보고서](../docs/experiments/v5-diverse-48-2026-10-12/REPORT.md).
- 구조화 문제 골드는 학생용 런타임 입력과 실행 조건으로 사용하지 않는다.
- 명시적 오류는 교정하고, 불충분하거나 모호한 근거는 진단한다.
- 일반 질문 경로는 실제 수정 확인 뒤 재선택한다. 다만 현행 코드는 1·2차 오답의 질문 한도 소진 시 현재 선지 코칭 확인 뒤에도 재선택한다. 정책 문서의 ‘코칭 후 종료’와 불일치하며, 코드·회귀 정의를 근거로 현행 동작을 구분한다([확인 기록](./checkpoints/2026-10-01-problem-feedback-policy-runtime-discrepancy.md)).
- 신규 7문항 v2 전체 사이클에서 오답 호출은 49/49 기대 행동과 일치했고, 모호한 오답 최초
  응답은 7/7 진단으로 보류됐다.
- 같은 시험에서 정답 불충분 근거를 `SUPPORTED`로 과수용한 명확한 사례 2건과 경계 사례 1건,
  정답의 명시적 오류를 `UNCERTAIN`으로 낮춰 잡은 사례 1건이 확인됐다.
- v3 중간 검증은 통제 대조 8/8이 통과했다. 미사용 문항까지 포함한 사람 의미 판정은 13/14로,
  표현대리와 기본대리권을 구별해야 한다는 메타 판단을 실제 구별 방향까지 이해한 것으로 보충한
  과수용 1건이 남았다.
- v3 전체 회귀 원 실행은 82호출 중 80회 기대 행동과 일치했다. 정확 인용 계약 실패 1건과
  상태 머신 허용 행동 실패 1건이 있었고, 해당 두 경로 재실행 5호출은 모두 통과했다.
- 사람 검토에서는 결측치 모호 응답의 진단 질문이 아직 확인되지 않은 ‘지난다’를 전제한 1건도
  확인됐다. 같은 경계 응답이 실행에 따라 `SUPPORTED`와 `UNCERTAIN`으로 달라지는 변동성이 있다. [정보 비대칭 13번 사용자 직접 실행](./checkpoints/2026-10-01-information-asymmetry-q13-user-review.md)은 최종 ⑤ 정답과 지지되는 근거로 종료됐지만, ④의 ‘다른 이름 반복 게시가 소수 의견의 우려를 약화한다’는 내용 오해가 수정되지 않았다. 판정기는 ‘적절하지 않은 것’을 고르는 부정 발문에서 ④ 선택이 그 선지 내용에 대한 동의인 것처럼 해석해 `SELECTION_EXECUTION`으로 바꾸고 `RESELECTION_CORRECT_VERIFIED`로 종료했다. 최종 정답 도달과 오류 경로 전체 교정은 구분해야 한다.
- [D-0049](./decisions/D-0049-stem-polarity-normalization-deferred.md)의 일회 극성 정규화·학생 결론 분리는 별도 v4에 구현했다. [첫 합성](../docs/experiments/problem-feedback-v4-synthetic-2026-10-01/REPORT.md)의 학생 결론 역전에 대해 D-0063에서 충돌 후보의 별도 발화 확인을 추가했다. [재검증](../docs/experiments/problem-feedback-v4-hardening-2026-10-01/REPORT.md)은 표면 장력 유효2/2에서 학생 VALID와 내용 오류만 유지(추가1회 API 거부), 올바른 정보 비대칭 수정3/3을 인식했다. 과거 선택과 수정 답변 비교는 계속 금지하며 의미 정확성을 코드로 보장한 것은 아니다.
- 통합 설계 [D-0059](./decisions/D-0059-problem-feedback-clarifications-consolidated.md)는 D-0060 UI 제외 구현 뒤 [네 실패 보완](./checkpoints/2026-10-01-problem-feedback-v4-hardened-revalidated.md)을 완료했다. 최신 답변 인용·공개 코칭 검사·제한적 인용 복원·실패 이유 재시도를 적용했다. 당시 v4 77테스트·build·클라이언트 검사 통과, 전체1005중1003통과/기존2실패다. 실모델 공개 코칭9건 손상0이나 미사용 코칭9개 손상·오류 분절/귀속 표현 검토가 남는다. D-0065로 개발자 v4 UI만 연결했고 학생용v3·학생 집계는 유지한다. Q-0028~Q-0030은 open이다.
- v3 전체 계보의 누적 과금은 145호출, USD 1.752641다.
- 2026-09-11 사용자 결정으로 v3를 운영 기본값으로 승인·고정했다. v2는 명시적인 과거 회귀와
  비교용으로만 보존한다.
- 인용·상태 계약 오류는 학생 선택·근거·후속 답변을 보존한 `EVALUATION_ERROR`에서 자동 1회와
  수동 재개가 가능하다. 정답 근거 평가의 계약 오류도 미검증 종료 대신 같은 입력으로 재개한다.
- 다음 행동: 학생 입장에서 문단 이해부터 문제 풀이까지 직접 사용하며 질문 이해 가능성, 생각을
  짚는 정확성, 답변 이후 흐름을 관찰한다. 동시에 지문·문제 세트를 확장해 반복되거나 학습을
  방해하는 문제만 일반화된 수정 후보로 모은다.
- 학생용 웹 흐름은 `/dialogue`에서 연결 가능한 6개 지문을 제공한다. V4 소스는 각 문단의
  PASS 또는 명시적 진행 선택 뒤 문항으로 넘어간다. 문제 화면은 내부 상태 표기를 감춘다.
- 웹 루트 `/`는 `/dialogue`로 정규화되어 최신 학생용 연결 학습을 연다. 이전 문단 훈련 UI는
  회귀 확인용 `/legacy` 경로에 보존한다.
- [개인 워크벤치](../docs/experiments/dialogue-workbench-2026-09-20/REPORT.md): `/dialogue/dev` 3단·맵·턴 검사. 현재 이해를 오른쪽의 골드·평가 위로 이동했고, 가운데는 고정 입력창과 `응답→피드백→확인 질문` 누적 스레드를 사용한다. 선택적 질문 전 피드백도 별도 보존한다([D-0032](./decisions/D-0032-developer-dialogue-thread-ui.md)). 사용자 위험 승인 아래 고정 터널에서 UI·API HTTP 200 확인. 앞으로 URL은 개발자 화면만 안내하며 학생용 UI는 개발자 UI 확정 전 수정하지 않는다([D-0031](./decisions/D-0031-developer-ui-url-only.md)). 인증·서버 재시작 복원은 미완료.
- 2026-09-11 로컬·모바일 브라우저와 공개 임시 터널에서 시작 화면을 확인했다.
- 2026-09-12 최신 빌드로 UI·API를 재시작하고 새 Cloudflare Quick Tunnel을 연결했다.
  공개 `/dialogue`와 API가 모두 HTTP 200이며 사용 가능 지문 6개를 확인했다. 주소는 프로세스가
  살아 있는 동안만 유효한 임시 주소다.
- Cloudflare Named Tunnel `csat-dialogue`는 고정 호스트 `https://dialogue.cogaxis.net`을 쓴다.
  2026-09-29 개발 단계에서는 상시 서버를 보류하고 이 터널을 계속 쓰기로 했으며, 최신 빌드로
  앱·API·터널을 재실행했다. [2026-10-02 복구](./checkpoints/2026-10-02-dialogue-developer-tunnel-restored.md)에서도 종료된 앱·터널을 기존 승인 개발자 모드로 재실행하고 공개 `/dialogue/dev`·지문 API·개발자 맵 HTTP 200을 확인했다. 인증 없는 골드·내부 판정 공개는 기존 사용자 승인 범위이며, 로컬 ingress 파일이 없어 `--url http://127.0.0.1:5173`이 필요하고 자동 시작 미등록으로 프로세스가 살아 있어야 한다.
- 같은 날 프로젝트 사용자가 학생 역할로 6지문·30문단·연결 문항 6개를 전부 직접 수행했다.
  문단은 최종 PASS 30/30, 최초 즉시 PASS 20/30, 후속 질문 13회였고, 문제는 최종 정답 6/6
  (첫 선택 정답 5건, 재선택 정답 1건)이다. 이는 UI 실사용 자료이지 외부 학생 효과 자료는 아니다.

### 문단 요약 대화
- 청킹·압축 측정 및 그에 따른 보상·처벌은 사용자 요청으로 [보류(D-0012)](./decisions/D-0012-paragraph-compression-measurement-deferred.md).
  현재 작업 논의는 새 판정 규칙과 학생의 선택적 진행으로 한정하며 압축 점수를 추가하지 않는다.
- **근본 검토 중(2026-10-15, [D-0138](./decisions/D-0138-paragraph-fundamental-review-question-quality-first.md)):** 축 구조 전제를 검토 대상으로 두고, 보여 주기 개발자 모드(D-0134~0137) 구현은 멈췄다. 사용자 제안 단순 형식은 H0와 같고 33시점 판정은 V4와 비슷했다. 질문 10쌍 블라인드 비교([결과](../docs/experiments/question-quality-h0-vs-v4-2026-10-15/RESULTS.md)) H0 4·V4 6, 축 우세 없음 → [D-0139](./decisions/D-0139-paragraph-simple-format-question-rules.md) 단순 형식+질문 규칙 4를 후보로, 조정에 안 쓴 새 응답으로 검증 예정. 운영 V4는 그대로다. 학생 상태 분석 자료(Q-0037)는 대화용 골드와 분리한 상향 위계 지도로 방향 합의([D-0141](./decisions/D-0141-paragraph-analysis-map-direction.md): 1회 생성 후 동결, 지문 단위 표본으로 닫힌 라벨 목록, 생성형 판정·JEV 미사용, 구현·API 0).
- [D-0013](./decisions/D-0013-paragraph-optional-revision-v4.md)으로 축별 공개·선택적 보완 V4를 구현했다.
  불필요한 개입 최소화를 우선하고 OK는 확인된 부분만 공개·자동 질문하지 않는다.
  학생의 보완 요청은 저장된 1차 판정을 재사용해 2차 질문만 생성한다.
- 기존 V4의 SERIOUS/ERROR는 질문을 제시하지만 모든 상태에서 진행 선택이 가능하다. SKIPPED와
  기존 판정을 함께 보존하며 PASS로 승격하지 않는다. 모든 문단이 완료/진행되면 문제를 연다.
- 상태: `STUDENT_AGENCY_V4_IMPLEMENTED / DEVELOPER_THREAD_UI_IMPLEMENTED / LIVE_RESTART_VERIFIED`. [질문 검토12호출](../docs/experiments/question-actionability-corporate-p2-2026-09-29/REPORT.md)·[재확인24호출](../docs/experiments/axis-expression-recheck-corporate-p2-2026-09-29/REPORT.md)은 개선미입증. [기존V4 동일본문3회](../docs/experiments/corporate-ui-exact-replay-2026-09-29/REPORT.md)는AX3 PASS/PASS/OK. 최신 [판정원칙교체 법인2·4문단48호출](../docs/experiments/axis-concrete-meaning-two-paragraphs-2026-09-29/REPORT.md): 실제P4 AX1 PASS1/3→3/3, P2AX3양쪽3/3; 후보표적충분·누락·오류보호충족. P2귀속판단·OK/S강도변동남음·일반화미검증·운영미승격.
- 정책: `PS-DIALOGUE-STUDENT-AGENCY-V4`; D-0010 축 범위와 D-0011 학생 선택 원칙을 계승한다. [구체 인정 후보](./decisions/D-0037-concrete-meaning-realization-candidate.md)는 학생 기본값에 미적용, D-0047 개발자 실험에서만 사용. [민감6문단 확대](../docs/experiments/dual-routing-sensitive-six-2026-09-30/REPORT.md) 생성6·판정180회: 구체간접/기능답L1각18/18통과·명시오류18/18검출. L2추가효용0·인용실패5; 후속 자연8에서 완화3회 관측·사용자 사후 수용(D-0046), 독립 정확도 아님.
- [개발자 실험 연결](../docs/experiments/conditional-meta-ui-2026-10-01/REPORT.md): PASS/OK무보완통과·SERIOUS만L2·ERROR교정질문. L2충족은선택보완이며진행시정책PASS, 원래L1은보존. 축·로그·세션은기존V4와분리. build/client·브라우저8·기존누락fixture1제외회귀917통과, 공개UI/API200·실험축로딩확인. 추가생성22호출·판정0호출. 후속L2실모델품질·사용감은미검증.
- 모든 턴의 유일한 통과 기준은 중심축 description에 표현된 의미다. 원문은 의미 해석과
  실제 학생 주장 사실 확인을 위한 보조자료이며 새 통과 조건을 만들 수 없다.
- 중심 이야기는 1차 판정과 2차 질문 입력에서 제외했다. 축별 누락 근거를 중심축 직접 인용으로
  기록하며 코드가 출처를 검사한다. 의미적 범위까지 문자열 검사로 보장하지는 않는다.
- 학생용 소스·빌드 기본값은 `axis-dialogue-selective-v4`, 1차 `central-story-gate-prompt-v4-claims-v2`,
  2차 `dialogue-selective-feedback-prompt-v4-guide-v1`다. SERIOUS 위치 안내 포함 기록은 v7, 과거 안내 없는 계약·재생은 보존한다.
  누적 학생 의미와 공개 기준 텍스트를 분리하며 `questionCall`·진행 선택을 기록한다.
- SERIOUS의 현재 질문에 원문 정확 인용을 옅게 표시하고 제공한 도움을 학생 근거와 구분해 기록한다. 문자열 검증 완료, 위치 선택의 실모델 의미 품질은 미검증이다 ([D-0016](./decisions/D-0016-personal-reading-workbench.md)).
- [현재 주장 기록 확장](../docs/experiments/dialogue-current-claims-fix-2026-09-19/REPORT.md): 1차 claimLedger의 current만 expressedClaims로 저장·2차 전달하고 수정/철회 이력은 보존한다. 코드·모의 검증 완료, 모델의 상태 분류 품질은 미검증이다.
- [mRNA 2문단 표적 시험](../docs/experiments/dialogue-axis-v3-mrna-2026-09-18/REPORT.md)은
  5조건·8판정 턴·12 API 호출이었다. 추가 원인 없는 충분 요약은 PASS했지만 축 밖 원인
  질문 1건, 특징 누락 통과 1조건과 사전 기대 ERROR 대비 PASS 1조건이 기록됐다. 마지막
  조건의 PASS를 확정 오류로 본 해석은 후속 사용자 검토에서 철회됐다. 네 사전 기대 경로 중
  2개 일치는 당시 기준 집계이며, 별도 기존 응답 재생은 최종 PASS해도 질문 범위 실패다.
- 이번 실패에서는 사후 판정 보정·계약 재시도가 없었다. 원모형 의미 판정과 2차 질문의 문제다.
  코드 build와 관련 72테스트는 통과했으나 의미 품질 검증 통과를 뜻하지 않는다.
- V3.1은 과거 비교 후보로 보존한다. questionIntent 계약은 V4에 계승했지만 의미 성능 승격은 아니다.
  [6문단 32사례 V3/V3.1 대조](../docs/experiments/dialogue-axis-v31-cross-paragraph-2026-09-18/REPORT.md)는
  외부 전송·비용 범위를 사용자가 명시적으로 승인한 뒤 94호출로 완료했다. 사전 기대 라벨은
  V3 30/32, 후보 31/32로 mRNA 특징 누락 한 사례만 차이가 났다. 다른 다섯 문단은 동일했다.
- 충분 요약, 고정 짧은 보완, 고정 교정 뒤 판정은 각각 두 버전 모두 6/6 PASS했다.
  실제 생성 질문 뒤 짧은 답을 연결한 5턴도 PASS했으나 합성 응답이므로 질문의 학습 효과는 아니다.
- mRNA 원인 문구가 합성에서 생략된 원출력은 보존돼 있으나, 사용자는 해당 응답을 문맥상
  허용 가능한 압축으로 보았으며 에이전트는 PASS를 확정 실패로 본 해석을 철회했다.
  [재해석 기록](../docs/review/paragraph-optional-revision-proposal-2026-09-19.md)을 과거 보고서와 함께 읽는다.
  V3.1 질문 목적에 축 밖 기존 백신 비교가 이미 들어가는 사례, 두 버전의 질문이 미확인된
  귀속을 먼저 제공하는 헤겔 사례를 Codex 검토에서 지적했다. 독립 사람 심사 결과는 아니다.
  판정 사후 보정·계약 재시도·API 실패는 없었다. 추가 운영 승격이나 서버 재시작은 하지 않았다.
- `ERROR`와 좁은 `UNCLEAR`는 간결 입력으로 처리한다.
- 소재만 언급했거나 다음 대상이 모호한 `UNCLEAR`에서만 상세 골드를 질문 대상 선택기로 쓴다.
- 질문은 최대 3회이며 후속 학생 응답을 누적해 다시 판정한다.
- 사용자 직접 사용의 공손룡 3문단에서 확인된 `CAPTURED → UNCLEAR` 사후 역전은 수정했다.
  상태 전이 근거 계약이 맞지 않으면 이전 상태로 조용히 복원하지 않고 같은 학생 응답을 보존해
  1회 재시도하며, 재시도 전 원출력도 감사 자료에 남긴다. 단위·통합 문단 대화 테스트 64/64와
  전체 TypeScript build가 통과했다. 실제 모델 동일 입력 유료 canary에서도 첫 후속 답변 뒤
  원판정·검증 판정이 모두 `CAPTURED`였고 추가 질문 없이 PASS했다.
- 회고 조사에서 사용자 직접 30문단 중 같은 역전은 공손룡 3문단만 확인됐다. 다만 과거 42사례
  초기 산출물에는 14턴·6사례의 상태 복원이 있었고, 정보 비대칭 3·4문단과 공손룡 2문단에서도
  학생의 명시적 오류 수정 뒤 이전 `distorted`를 유지해 교정을 반복하는 동일 계열 실패가 있었다.
  최종 재실행본에서는 0회였으므로 실행 변동에 따라 잠복한 결함으로 본다.
- [V4 민감 6문단 시험](../docs/experiments/dialogue-v4-sensitive-2026-09-19/REPORT.md): 초기 28건+후속 4판정, 46호출, 추정 $0.435589. 충분 답 6/6 PASS·생략 답 6/6 자동 질문 없음, 오류 6/6 교정. 실제 공손룡 재생 PASS, 실제 mRNA 재생은 두 축 OK였다.
  PASS/OK 경계·질문 단서는 남았다. [오류 구절 지정·저장](../docs/experiments/dialogue-error-quotes-fix-2026-09-19/REPORT.md)은 현재 주장 인용 검증·재시도·2차 전달까지 구현했다. 새 오류 인용 선택 품질과 실모델 opt-in은 미검증이며 논쟁적 mRNA PASS를 확정 실패로 취급하지 않는다.
  짧은 보완·철회는 고정 입력으로 확인했지만 실제 학생 회복 효과는 미검증이다.
  별도의 15문단 최초 PASS canary와 전체 회귀는 미완료이며 과거 V2 회귀를 V3 검증으로 취급하지 않는다.
- [D-0033](./decisions/D-0033-jev-semantic-measurement-layer.md)의 OpenAI 후처리 graph 기준선은 [도파민 AX1 3회](../docs/experiments/jev-semantic-elements-dopamine-pilot-v1-2026-09-23/OPENAI-DECOMPOSITION-REPORT.md)에서 C1·C2 core claim3/3, C3 contrast0/3, O1 optional cause0/3이었다. schema·인용은3/3 유효했지만 요소 수3·2·2로 의미 구조가 불안정해 자동 자산·JEV 단계·운영은 미승격이다.
### 문단 골드 자산
- [D-0075 UI5지문 비교](../docs/experiments/axis-candidate-jev-five-passages-2026-10-02/COMPARISON.md): mRNA제외25문단·생성75회/133후보·JEV180·OpenAI전체135성공,기존43→선택71→병합70축.근소규칙전환4·의심9/병합1.분리이점과도입부과분해·첫문구손실·부분병합누락은Codex검토·사용자판정대기.운영미변경. 다음시험은 [D-0076](./decisions/D-0076-l2-suspected-duplicate-auto-merge.md)으로 L2의심그룹을재확인없이자동병합·FA회피우선,규칙확정. [D-0077](./decisions/D-0077-post-merge-axis-auditor.md) 감사 역할을 [D-0079](./decisions/D-0079-auto-merge-auditor-execution.md)에서 직접 수정·실행 승인. [D-0080](./decisions/D-0080-auto-merge-audit-external-transfer-approved.md) 명시전송승인 뒤 [후처리시험](../docs/experiments/axis-auto-merge-audit-five-passages-2026-10-02/REPORT.md)37호출 완료·71→60→46축(최종1축12문단). 추가병합10그룹·삭제1·단일축수정4,구조검증통과. Codex검토상 도파민2누락미검출·표면장력2과병합의심·한문장형식2미준수;사용자검토대기·운영미반영. [운영43축 대 최종46축 비교](../docs/experiments/axis-auto-merge-audit-five-passages-2026-10-02/OPERATIONAL-VS-AUDIT.md)(무호출·Claude의견): 실험우세7·운영우세4·혼재3·동등11, L1평균82→106자. 이점은 중심이야기 생략 세부 복원, 도파민2·표면장력2·5는 운영보다 후퇴. 길이 증가의 FA 영향은 미측정. [감사기 과병합 Codex 논의](../docs/experiments/axis-auto-merge-audit-five-passages-2026-10-02/AUDITOR-OVERMERGE-DISCUSSION.md): 추가병합10중9 문단전체·3축→1축3건 모두 문제/경계. 관계중심기준+원질문별요구·손실대조계약 우선, FA문구수정·재확인게이트는 사용자 결정 대기(무변경). 도파민2는 감사병합실패 아닌 최초선택 결함 미검출로 정정. [D-0086](./decisions/D-0086-auditor-min-two-axes-and-merge-contract.md): 감사기만 도입·정리 외 일반 문단 최소2축(예외 없음, 기능은 모델 판정·불확실 시 일반), FA문구 수정·관계중심 기준·병합 기록 계약 수용. [v2 준비](../docs/experiments/axis-audit-v2-min-two-2026-10-06/PLAN.md) 사전검증 통과·API0, [D-0087](./decisions/D-0087-axis-audit-v2-transfer-approved.md) 승인 뒤 [v2 실행](../docs/experiments/axis-audit-v2-min-two-2026-10-06/REPORT.md) 25회 성공·계약위반0: 60→56축(v1 46), 추가병합1·삭제3·1축3문단·L1평균89자. 과병합 해소, 최소2축으로 연결축 잔존(표면장력3 AX1·정보비대칭2 AX2), 도파민2 D1 대비 미해결. Claude 의견·운영 미반영. 사용자 판정: 표면장력3·정보비대칭2 1축 적당, 공손룡3 경계 → [D-0088](./decisions/D-0088-substantive-axis-minimum-two.md)로 최소2축을 실질 설명 축 기준으로 수정(원문 한 문장 소개·연결 축 흡수 허용·코드 검사). [D-0089](./decisions/D-0089-axis-audit-v3-transfer-approved.md) 승인 뒤 [v3 실행](../docs/experiments/axis-audit-v3-substantive-min-two-2026-10-07/REPORT.md): 25회·계약실패2(법인1 keep표시 오류, 정보비대칭1 인용 생략부호; 재시도 없음). 성공23문단 54→48축, 표면장력3·정보비대칭2 판정대로 1축, 과병합 미재발. 소개·연결 5건 모두 삭제·흡수0, 공손룡1 논쟁 주체 정보 손실, 도파민2 D1/D2 대비 미해결. Claude 의견·운영 미반영. 이후 [D-0094](./decisions/D-0094-source-jev-gold-flow-stopped.md)으로 원문 분할·JEV 흐름은 중단(결과 보존)하고, [D-0095](./decisions/D-0095-central-story-two-stage-generation.md) 중심 이야기 두 단계 생성(원문 대조 보강·덧붙이기만 → 실질 설명 최소2축 우선 축 생성)을 25문단 별도 실험으로 준비 중. [인계](../docs/handoffs/2026-10-07-central-story-two-stage-generation.md) 작성 → Codex 구현·사전검증 완료, Claude 검토 통과(테스트 70/70·프롬프트 일치·보호 파일 불변). [D-0096](./decisions/D-0096-central-story-two-stage-transfer-approved.md) 승인 뒤 [실행](../docs/experiments/central-story-two-stage-2026-10-07/REPORT.md): 47회·1단계 계약 실패3(도파민3·정보비대칭2 입력 필드 변경, 표면장력1 문구 치환; 재시도 없음). 성공22문단 48축(운영39·v3 41)·1축3·L1평균83자(운영79). 세부 복원·본론1축 해소·이전 손실 미재발, 최소2축의 개관·요약 축 분리(도파민4·표면장력6)와 부수 보강(표면장력2·5) 잔존. Claude 의견·운영 미반영. 사용자 판정 도파민4 AX1·표면장력6 AX2 잉여 → [D-0097](./decisions/D-0097-central-story-two-stage-v2.md) v2(개관·요약 문장 CONNECTIVE, CONNECTIVE 내용·부수 정의 보충 금지, centralStory 필드 제거) 25문단 재실행 준비, [인계](../docs/handoffs/2026-10-07-central-story-two-stage-v2.md) → Codex 구현·Claude 검토 통과(인용 구간 규칙 1건 직접 수정, 테스트 108/108). [D-0098](./decisions/D-0098-central-story-two-stage-v2-transfer-approved.md) 승인 뒤 [v2 실행](../docs/experiments/central-story-two-stage-v2-2026-10-07/REPORT.md): 49회·실패1(법인2 문구 치환). 성공24문단 44축(운영40), 1축 10문단(v1 3). 사람 판정 일치3/4(정보비대칭2 불일치). 지적 사례 해소, 도입 문단 뭉침(도파민1·정보비대칭1)·원리+적용 합침(정보비대칭3)·실행 변동 새로 관측. Claude 의견·운영 미반영. → [D-0099](./decisions/D-0099-central-story-two-stage-v3-no-role-exemption.md) v3: 최소 축 수에서 도입·정리 면제 제거, v2 1단계 재사용·4문단 2단계만 재실행. [인계](../docs/handoffs/2026-10-07-central-story-two-stage-v3.md) → Codex 구현·Claude 검토 통과(136/136, 대상 4문단 요청은 minimumAxes만 다름). [D-0100](./decisions/D-0100-central-story-two-stage-v3-transfer-approved.md) 승인 뒤 [v3 실행](../docs/experiments/central-story-two-stage-v3-2026-10-07/REPORT.md): 4회 성공, 도파민1 1→3축·정보비대칭1 1→2축. 성공24문단 47축·1축8문단(운영10·v2 10). 판정 일치3/4 유지(정보비대칭2 불일치). Claude 의견·운영 미반영. [사용자 판정](../docs/experiments/central-story-two-stage-v3-2026-10-07/HUMAN-REVIEW.md): 정보비대칭3 2축(원리/적용, v3 1축과 불일치), 정보비대칭2 v3 2축이 더 나음(이전 1축 판정은 연결축 남은 분할 대상). v3 판정 일치 4/5(경계1 제외). 사용자 과적합 우려(같은 25문단으로 조정·평가, 사례별 규칙 추가, 실행 변동 미측정)로 v3에서 멈춤. 원리/적용 규칙은 미채택, v3 고정·반복 실행·조정에 안 쓴 문단 검증 권고는 미승인([체크포인트](./checkpoints/2026-10-08-two-stage-paused-at-v3.md)). 이후 새 방향: [D-0101](./decisions/D-0101-holistic-verdict-shadow-experiment.md) 문단 전체 판정 그림자 실험: 운영 V4는 그대로 두고 실데이터 72시점(gold-v2·terra medium)과 블라인드 판정·고정한 탐침 13개에 그림자 판정 H0/H1을 오프라인으로 덧붙여 비교. 실데이터는 V4 미해결 8/72라 비열등성만, FA 감소는 탐침으로 본다. 성공 규칙 확정, [인계](../docs/handoffs/2026-10-08-holistic-verdict-shadow.md) 작성 → Codex 구현·모의 검증 대기. [D-0102](./decisions/D-0102-holistic-verdict-shadow-transfer-approved.md) 승인 뒤 [1차](../docs/experiments/holistic-verdict-shadow-2026-10-08/REPORT.md) 220회·계약실패0·$1.54: 최초45 갈림 H0 3·H1 5, 탐침 오류 3/3 포착·FA감소2(뚜렷 미충족)·그림자 miss2. [사람 판정 1회차](./checkpoints/2026-10-08-holistic-verdict-shadow-human-review-1.md): 최초 갈림 동의 H0 그림자 2:1·H1 V4 3:2, 오류 놓침 0(flag 2건 모두 사람 충분·질문 불필요), 20시점 불일치 V4 6·H0 4·H1 6. 잠정 V4 유지(H0 갈림<5·FA 방향 4<6, 비열등 확인·FA 효과 미확인), 며칠 뒤 REVIEW-SECOND 재판정 대기. [비블라인드 결과 검토](./checkpoints/2026-10-08-holistic-verdict-shadow-user-result-review.md) 51/85행: 불일치 V4 8·H0 3, 철회 규칙이 정답 미해결을 지운 사례 1, H0 미확인 목록 과다. [D-0103](./decisions/D-0103-holistic-verdict-axis-recording-direction.md) 방향 합의: 판정은 H0, 기록·질문 생성은 축 근거, 철회 규칙 누락 통과 결함 확인(운영 미변경, Q-0033 기록/질문 경계 미정) [D-0132](./decisions/D-0132-paragraph-judge-keep-v4.md): 판정기 V4 유지(판정은 H0 부분 대체), C1 미진행. [지연 재판정](./checkpoints/2026-10-14-holistic-verdict-second-review.md) 33시점 사람 일관 32/33, 경계 보여 주기 계산 (나) FA 7→2·질문 필요 8/11 강등, (가) 질문 불변. [D-0133](./decisions/D-0133-paragraph-boundary-rule-na-double-prime.md): 경계 규칙 방향 (나″)(ERROR·전체 SERIOUS 질문, 일부 SERIOUS 보여 주기, OK만 통과; 33시점 질문 9·FA 2·질문 필요 7/11). 운영 미변경. [D-0134](./decisions/D-0134-boundary-show-dev-mode-central-object.md): 사용감 먼저 시험, 개발자 모드 `v4-boundary-show`(질문 최대 1회, centralObject 밑줄 보여 주기, 3지문 손 연결 자산) 구현 인계([인계](../docs/handoffs/2026-10-15-boundary-show-dev-mode.md)) → 구현·Claude 검토 완료(모의 테스트 25/25, build 통과, 화면 미확인), 첫 사용 피드백 12건 기록([메모](../docs/review/boundary-show-dev-ui-feedback-2026-10-15/README.md): 미색 하이라이트, 지문 하이라이트 검토, 버튼·대화 분리, 입력창 일원화, 상호작용 예시, 오류 말투 반말 미유지, 오류 시 지문 하이라이트 검토, 재시도 시 코드 고정 메시지, 오류→SERIOUS 흐름 예시, 두 축 SERIOUS 흐름 예시, 보여 주기 카드 내 요약이 1차 응답만·자산 없는 지문에 밑줄 안내 고정, 무관 응답 거르기 검토 보류). 미구현. [D-0135](./decisions/D-0135-boundary-show-error-question-per-axis.md): 질문 1회 상한을 1차 ERROR 축 수로 바꿈(축마다 한 번, 실패 알림 후 다음 오류 축, 남은 ERROR·SERIOUS 모두 표시). 미구현. [D-0136](./decisions/D-0136-boundary-show-banmal-question-feedback.md): 이 모드의 질문·피드백 반말(전용 프롬프트 변형, 운영은 시험 후 별도 승인). 미구현. [D-0137](./decisions/D-0137-boundary-show-effective-response-restatement.md): 재구성 응답·"내 요약"은 `effectiveResponse`. 미구현. 축 묶임 문제는 [Q-0036](./OPEN_QUESTIONS.md)(gold-v2 미변경, 법인p1 시험).
- 현재 개발자 UI용 생성 흐름 명칭: **중심 이야기 기반 L1·L2 공동 생성**([D-0073](./decisions/D-0073-current-gold-generation-name.md)). 자산 `conditional-meta-gold-v1`; 판정기 v4·원문/JEV 후속 실험과 구분.
- [D-0067 mRNA전체문맥+1/2/3/4축시험](../docs/experiments/axis-candidate-jev-mrna-passage-2026-10-02/REVIEW.md): 생성15·24후보·JEV30·L2 5성공, 선택4/3/3/3/4(17쌍).1/2문단gap0.054/0.008·회차제외변동,4문단은사용자가과분해로판정. [D-0071 후처리시험](../docs/experiments/mrna-p4-l2-merge-2026-10-02/REVIEW.md) 3호출로L2중복탐지·원문확인→기존C2(2축)선택·L2재생성.단회성공·일반화미검증·운영미채택·원시출력유지. [D-0068](./decisions/D-0068-near-score-fewer-axes-next-test.md): 다음시험1/2위점수근소시적은축우선, 평균점수차≤0.10/4점으로확정·과거결과유지.
- [D-0066 한정 JEV 후보 시험](../docs/experiments/axis-candidate-jev-eight-2026-10-02/SUMMARY.md): 새2/3/4축 생성24회·72분할→33고유후보, JEV45성공·후보별5회. 평균선택 사람exact3/8·경계F1 75.7%, exact후보존재3문단 모두선택·5문단미생성. 한회제외평균1위유지7/8이나 매회1위동일3/8·도파민3민감. 안정화가능성 관측이며 정의대체·운영승격 근거아님. 제품JEV보류·기존골드유지. [새사용자판정미열람 Codex 검토](../docs/experiments/axis-candidate-jev-eight-2026-10-02/CODEX-INDEPENDENT-ADJUDICATION.md)는JEV우위1·인정7·명백열위0의잠정의견. exact불일치를의미결함으로동일시하지않으며사람승인아님.
- [UI 연결 단일 축 정적 검토](../docs/review/ui-linked-single-axis-review-2026-10-02.md): 기존30문단48축·단일14, 조건부30문단51축·단일12. Codex 원문 대조는 mRNA5의 전달·방출·면역 및 정보 비대칭2의 대응·범위 논쟁을 우선 분리 후보로 제안했다. 무손실과 진단 단위 적절성은 별개이며 사람 승인·실모델 효과 검증 없음. 골드·UI 유지, Q-0031 open. [원문 직접 단회 시험](../docs/experiments/question-shift-mrna-p5-2026-10-02/REVIEW.md)은 목표 개수 없이 mRNA5를4축으로 생성하고 “내포 작용이란…” 앞을 경계로 잡았다. [두 보조 지시 삭제 재실행](../docs/experiments/question-shift-mrna-p5-no-helpers-2026-10-02/REVIEW.md)은3축, “이 복합체는…” 앞 경계. 각각 단회 관측이며 의미 채택·반복·학생 효과 미검증. [사용자 경계8문단 대조](../docs/experiments/question-shift-human-eight-2026-10-02/REVIEW.md)는16성공, 이전/현재 완전일치3/8·1/8(F1 66.7%·61.1%). 과분해·과결합과 앞선 단회 대비 변동이 남고 운영 미채택.
- [메타 생성6호출](../docs/experiments/meta-axis-generation-corporate-p4-2026-09-29/REPORT.md) 후 사용자는 방향 생략을 메타 수준에서 허용([D-0039](./decisions/D-0039-two-level-meta-axis-evaluation-pilot.md)). [반복2 고정 두 수준 판정36호출](../docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29/REPORT.md)·35유효: 차이만 쓴 답 L2충족3/3이나 L1도PASS3/3으로 기본PASS 기대와 보상 불일치. 보상기준·일반화 미확정. 현재는 D-0047에 따라 보상 없이 개발자 실험 UI만 연결하며 학생 기본 V4 유지.
- [정보 비대칭 1문단 JEV materiality 파일럿](../docs/experiments/jev-materiality-information-asymmetry-v1-2026-09-23/REPORT.md)은 기존 MR 역할을5/5회 분리했다. [AX1 가상 응답 MR coverage](../docs/experiments/jev-mr-coverage-information-asymmetry-v1-2026-09-23/REPORT.md)는 충분·MR2/3누락을 구분하고 AX제거도 순위를 보존했으나 score 백분율은 미통과했다. 후속 [collision 단일 질문 대조](../docs/experiments/jev-collision-single-question-ab-v1-2026-09-23/REPORT.md)는 생략0.05–0.08·인접오류0.45–0.63·직접오류0.92–0.97이며, 질문 분리로 교차값이 사라지지 않아 semantic spillover로 해석한다.
- [승인 골드 JEV candidate sensor 무호출 감사](../docs/experiments/jev-candidate-sensor-audit-v1-2026-09-23/REPORT.md): 60문단·92축에서 P 후보92/92, 내부 E87/92 회수. 경고77축·비대상 MR region 공유50축·최종 P 누락4축으로 자동 센서 확정은 미통과. API/JEV0회; MR별 P/E 직접 연결 보존이 후속 후보.
- [도파민 AX1 P/E 정규화 단회 시험](../docs/experiments/jev-element-normalization-dopamine-v1-2026-09-23/REPORT.md)은 `AX→MR→region→P`를 고정하지 않고 API가 요소·중요도를 재판정한 설계 오류로 정정했다. 정규화 성능 집계 제외·JEV 입력 미승격. 후속은 기존 산출물 연결 감사다.
- [JEV–V4 자연 응답 shadow](../docs/experiments/jev-v4-natural-agreement-v1-2026-09-29/REPORT.md)는 역할 완전29건·50축에서 coverage AUC0.670·collision AUC0.445, 보수 조건 적용5/46축·사람 비교1축이었다. AX-only V4와 required-MR JEV의 계약 불일치, 역할 없는16건·24축, 대상 귀속 ERROR collision0.05가 확인됐다. [D-0036](./decisions/D-0036-jev-product-work-parked.md)에 따라 JEV 자동 PASS·MR 게이지 UI·추가 rubric/collision 연구와 추가 호출은 `PARKED`이며 운영 V4를 유지한다.
- 운영 생산 기준선: `PG-PROD-BATCH004-AUDIT-V1`. 후보 24지문·140문단 중 11지문·60문단이 생산 자격을 얻었다.
- 승인 경로는 자동 감사 44문단과 사용자–에이전트 협업 승인 16문단으로 구분한다. 2026-09-09 재감사·수리 뒤 구성은 독립 감사 PASS 57문단과 사람 판정 승인 3문단이다.
- 이 60문단은 현재 웹앱에 연결되지 않았다. 웹앱은 별도 `gold-v2` fixture 31개를 읽는다.
- 미처리 80문단의 추가 생산과 감사 고도화는 현재 `PARKED`다.

### 문제 골드 자산
- 상태: `PARKED_OFFLINE`
- 2026-09-03 prospective 표본은 원천 입력·API 원응답 24개, 정규화 후 스키마 유효 후보
  23개, 의미 오류로 후보 생성 실패 1개다.
- 23개 후보는 모두 사람 검토 `PENDING`이며 승인·승격·웹앱 연결된 자산은 0개다.
- 이 생성에는 지문·문항·정답·미디어가 사용됐지만 공식 해설 본문은 입력되지 않았다. 따라서
  공식 해설 교차 검증을 마친 골드로 취급하지 않는다.
- 문단 골드 60개가 속한 11지문에는 표본 문항이 한 개씩 연결되며, 후보는 10개이고 승인본은
  없다.
- 기존 문제 골드는 오프라인 문항 감사, 회귀 기대값, 교사·개발자 검토와 비교 연구에만 쓴다.
- 생산 또는 승인 상태를 학생용 문제 풀이 런타임의 선행 조건으로 만들지 않는다.
## 검증된 핵심 결론

- 자유형 문단 요약의 기본 채점축은 세부 개수가 아니라 핵심 의미 관계의 보존 여부다.
- 문제 풀이 최초 판정 비교에서는 원문 직접 방식이 간결·상세 문제 골드 방식보다 품질, 지연,
  비용, 학생 발화 보존 측면에서 가장 나았다.
- 문제 풀이 v2의 신규 7문항 시험에서 명시적 오류·모호한 근거·선택–근거 충돌의 오답 전체
  사이클 49호출이 기대 행동과 일치했다. 정답 근거 판정에는 과수용과 오류 미탐지 경계가 남았다.
- 문단 요약에서는 원문 직접 방식보다 간결 골드가 부분 누락을 더 잘 포착했다.
- 문단 요약의 상세 골드는 저정보 응답의 다음 질문 대상을 고르는 데는 도움이 되지만, 전면
  사용하면 질문 누출과 과도한 개입을 늘린다.
- 문단 골드 통합 감사 v2 계열은 일부 결함 검출을 개선했지만 정상 대조군 과잉 판정과 비용
  증가가 있어 운영 기준선으로 승격하지 않았다.
## 현재 우선순위

0. [D-0048](./decisions/D-0048-student-state-model-next-goal.md)에 따라 학생 상태 모델과 정기 피드백을 다음 개발 목표로 진행한다. V1 코어·증거 JSONL·맥락 격리·7/30/90일 피드백·개발자 리포트 UI와 기본 비활성 학생 `/progress` 프리뷰를 구현했고 관련42테스트·서버/클라이언트 typecheck·워크벤치 브라우저/HTTP7/7을 통과했다([코어](./checkpoints/2026-10-01-student-state-model-phase1.md), [연결](./checkpoints/2026-10-01-student-state-persistence-api.md), [출처 감사](./checkpoints/2026-10-01-student-state-provenance-audit.md), [개발자 UI](./checkpoints/2026-10-01-student-state-developer-report-ui.md), [학생 프리뷰](./checkpoints/2026-10-01-student-feedback-preview.md), [신뢰도 경계](./checkpoints/2026-10-01-student-state-determinate-reliability.md), [자기 점검 문구](./checkpoints/2026-10-01-student-feedback-confidence-headline.md), [다음 행동](./checkpoints/2026-10-01-student-feedback-next-action.md), [조건부 진입점](./checkpoints/2026-10-01-student-feedback-capability-navigation.md), [완료 시점 수집](./checkpoints/2026-10-01-student-state-completion-persistence.md), [원장 무결성](./checkpoints/2026-10-01-student-evidence-contract-integrity.md), [전 구간 검증](./checkpoints/2026-10-01-student-state-live-persistence-e2e.md), [로컬 전용 접근](./checkpoints/2026-10-01-student-feedback-local-only.md), [개발자 우회 차단](./checkpoints/2026-10-01-student-state-developer-bypass-closed.md), [완료 감사](../docs/STUDENT-STATE-MODEL-V1-COMPLETION-AUDIT.md)). 불확정 증거는 관측량으로 보존하지만 확정 패턴 신뢰도를 높이지 않는다. 수행 증거와 확신도 비교 증거를 헤드라인에서 구분해 자기 점검 피드백과 자료 부족 문구가 충돌하지 않는다. 연습 후보의 다음 행동은 각 차원이 직접 생성하며 설명 문장을 잘라 재사용하지 않는다. 학생 피드백 활성 플래그를 켜도 기본적으로 loopback Host에서만 학생 UI·API와 개발자 `context=student` 집계가 열리며 공개 Host는 두 번째 명시 플래그가 필요하다. 문단 증거는 연결 문제 클릭 여부와 무관하게 전체 지문 완료 즉시 한 번 저장되며, 관측 종류·차원·출처·확신도 계산이 불일치한 레코드는 거부한다. 브라우저에서 문제 미진입 지문 완료→원장→집계→학생 화면 갱신까지 확인했다. 과거 직접 사용 문제6세션 감사에서 알려진 결과를 재구성하고 잠정/반복 문구를 정정했다([감사](./checkpoints/2026-10-01-student-state-historical-six-audit.md)). 출처 없는 전체 로그는 백필하지 않는다. 방금 정보 비대칭 직접 실행은 서버가 11:07 KST에 시작된 뒤 12:17 KST 최신 서버 빌드로 재시작되지 않아 학생 상태 API가 없었고 새 증거 원장도 생성되지 않았다([실행 검토](./checkpoints/2026-10-01-information-asymmetry-q13-user-review.md)). 완료 감사 결과 최신 서버 재시작 뒤의 새 형식 실제 로그·학생 문구/주기 승인·공개 노출 별도 결정이 남아 있다. 단일 능력 점수·적응형 제시는 미승인이다.
1. [D-0036](./decisions/D-0036-jev-product-work-parked.md)에 따라 JEV 제품 적용 연구를 보류했다. 자동 PASS·MR 게이지·추가 rubric/collision 연구·추가 호출을 진행하지 않고 기존 결과만 보존한다. 운영 문단 평가기는 현재 V4를 유지하며, 다음 우선순위는 실제 학생 사용성·학습 흐름과 지문·문항 세트 확장이다.
2. 운영 문단 평가기는 현재 V4를 유지한다. [V4-light](../docs/experiments/v4-light-output-v1-2026-09-22/REPORT.md), [S1](../docs/experiments/v4-output-field-ablation-v1-2026-09-22/REPORT.md), [S2](../docs/experiments/v4-output-field-ablation-s2-2026-09-22/REPORT.md), [S3](../docs/experiments/v4-output-field-ablation-s3-2026-09-22/REPORT.md), [짧은 계획 A](../docs/experiments/v4-output-branch-a-short-intent-2026-09-22/REPORT.md), [압축 원장 B1](../docs/experiments/v4-output-branch-b1-compact-ledger-2026-09-22/REPORT.md)과 [자연15+질문4](../docs/experiments/v4-output-b1-natural-2026-09-22/REPORT.md)는 미승격 연구 자료로 보존한다. B2와 추가 필드 절삭은 보류하며, 실제 사용에서 V4 비용·체감 지연이 반복 병목으로 확인될 때만 재개한다([D-0030](./decisions/D-0030-v4-operational-output-ablation-paused.md)). N03 정확 인용 문제는 별도 검토한다. 아래는 이전 근거다.
   [공손룡 과도 보류](../docs/review/gongsun-p1-personal-overhold-2026-09-20.md)로 Q-0010 재개. [직접 필터](../docs/experiments/axis-core-filter-six-2026-09-20/REPORT.md) 후 [기능 필터](../docs/experiments/axis-function-filter-six-2026-09-20/REPORT.md)도 25조건×2시도 완료(47유효·3실패). 공손룡 보완 후보PASS이나 mRNA 원인 추가·원본 판정 변동이 있어 둘 다 미승격.
   [의미 필터](../docs/experiments/axis-meaning-filter-only-2026-09-20/REPORT.md)·[관계 추출](../docs/experiments/axis-relation-decomposition-2026-09-20/REPORT.md)·[동일 호출 중요도 비교](../docs/experiments/single-call-materiality-2026-09-20/REPORT.md)는 미승격. 최신 [최소 출력 직접 판정](../docs/experiments/axis-direct-judgment-v1-2026-09-20/REPORT.md)20응답×2조건×3회120호출($0.8665124 추정): 충분PASS17→18/18·오류12/12 유지, 반복 일치14→19/20·중앙값7.97→2.08초. 도파민 핵심 누락PASS3/3, 자동 질문26/60 동일로 운영 대체 미확정·미적용([D-0022](./decisions/D-0022-axis-direct-judgment-experiment.md)).
   [축 격리60호출](../docs/experiments/axis-context-isolation-v1-2026-09-20/REPORT.md) 뒤 [v1 반사실 맥락180호출](../docs/experiments/axis-counterfactual-context-v1-2026-09-21/REPORT.md)($0.4884107): 충분target PASS45/45씩·누락PASS 전체3/45→단일0/45, 도파민 한 조건에서만 차이. 공손룡 보류 미재현·축 간 공유 의미로 기제 미확정.2문단 재현 기준 미달로 병렬 성능 측정은 건너뜀. 운영 유지·원판정/후속 범위 검토가 다음 행동([D-0025](./decisions/D-0025-counterfactual-context-and-conditional-benchmark.md)).
3. 개발자 UI의 구체 인정 L1 + 조건부 L2 모드로 직접 사용하며 질문 이해도, 생각 추적, 흐름의 자연스러움을 관찰한다.
4. 지문·문제 세트를 확장하고 반복되거나 학습을 방해하는 실패만 일반화된 수정으로 연결한다.
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
- 실제 학생의 회피, 부분 답변, 새 오류와 같은 후속 행동에서 회복률이 확인되지 않았다.
- 도움 없이 새 지문으로 전이되는지, 효과가 유지되는지 확인되지 않았다.
- 정답 선택 학생의 짧은 관련 소재를 충분한 근거로 보충하거나, 설명에서 충돌을 찾고도
  `CLEAR_ERROR` 대신 `UNCERTAIN`으로 내리는 사례가 있다.
- v3에서도 압축 경계 사례의 `reason`이 학생이 말하지 않은 포함 대상·단계를 학생 발화로
  귀속하는 잔여 문제가 1건 관측됐다.
- 동일 프롬프트·모델·응답에서도 압축 경계의 `SUPPORTED`/`UNCERTAIN` 및 진단 질문 전제가
  실행마다 달라질 수 있어, 단일 샘플 통과만으로 경계 안정성을 보장하기 어렵다.
- 실제 학생의 짧고 불완전한 답에서 질문 이해도, 생각을 짚는 정확성, 후속 흐름의 자연스러움은 아직 검증되지 않았다. 부정 발문에서 오답 선지 선택을 선지 내용에 대한 동의처럼 해석하면, 내용 오해가 남아 있는데도 `SELECTION_EXECUTION`과 `CORRECTED`로 승격하고 재선택 뒤 전체 회복으로 집계할 수 있다.
- 문단 게이트 계약 오류 자동 재시도 경로는 코드 회귀로 확인했지만, 실제 계약 오류가 발생한
  운영 표본에서 모델의 재시도 회복률은 아직 측정하지 않았다.
## 현재 근거
- [`문제 풀이 원문 직접 운영 정책`](../docs/PROBLEM-SOLVING-SOURCE-DIRECT-OPERATIONAL-POLICY-2026-09-08.md)
- [`문단 요약 대화 운영 정책 V4`](../docs/PARAGRAPH-SUMMARY-DIALOGUE-OPERATIONAL-POLICY-V4-2026-09-19.md)
- [`V3 mRNA 표적 시험: 의미 검증 실패`](../docs/experiments/dialogue-axis-v3-mrna-2026-09-18/REPORT.md)
- [`판정·피드백 실험 종합`](../docs/experiments/TEST-SYNTHESIS-2026-09-09.md)
- [`문단 게이트 계약 재시도 유료 canary`](../docs/experiments/dialogue-gate-contract-retry-canary-2026-09-11/REPORT.md)
- [`문단 골드 자산 원장`](../docs/PARAGRAPH-GOLD-ASSET-REGISTER-2026-09-09.md)
- [`문항 골드 자산 원장`](../docs/PROBLEM-GOLD-ASSET-REGISTER-2026-09-09.md)
- [`문제 풀이 v2 신규 7문항 전체 사이클`](../docs/experiments/problem-source-direct-v2-full-cycle-seven-2026-09-11/FINAL-REPORT.md)
- [`문제 풀이 v3 표적 canary`](../docs/experiments/problem-source-direct-v3-targeted-canary-2026-09-11/FINAL-REPORT.md)
- [`문제 풀이 v3 전체 회귀`](../docs/experiments/problem-source-direct-v3-targeted-canary-2026-09-11/FULL-REGRESSION-REPORT.md)
