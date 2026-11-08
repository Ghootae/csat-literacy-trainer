# 체크포인트: 문제 풀이 판정 과적합 — 원인 사실과 해결 후보

- 날짜: 2026-11-07
- 상태: 논의 중. 해결 방안은 후보로만 기록(사용자: "일단 후보로 기록해두고 논의해보자"). 결정 기록·외부 전송·지시문 수정 없음.
- 이어지는 문서: [첫 완주 문제 목록](./2026-11-07-sns-diagnostic-first-run-issues.md)의 A1. 열린 질문 Q-0044.

## 확인한 사실 (코드 에이전트, 2026-11-07)

1. 같은 판정기: lab(`packages/app/src/server/index.ts:183`)과 진단(`packages/app/src/server/diagnostic/controller.ts:141`) 모두 `ProblemFeedbackController` 기본 판정기 `OpenAIFeedbackEvaluator`(`problem-feedback.ts:63`), 지시문 `problem-feedback-v5.8`, 정답 luna·오답 sol·교정 luna.
2. 판정기 입력 자료가 다름: 원자료 묶음의 `officialExplanation`이 판정 입력에 들어간다(`feedback-evaluator.ts:60-66`, `feedbackEvaluationInput`의 source).
   - lab: `packages/pipeline/fixtures/experiments/problem-solving/source-direct-runtime-v1.json`, 6문항, 해설 114~139자("정답은 ②입니다. …" 수준).
   - 진단: `packages/pipeline/fixtures/experiments/sns-diagnostic/runtime-reference.json`, 16문항, 해설 254~482자(enrichment `detailed_explanation_ko` 전문 + 정답 선지 해설, 인계 `docs/handoffs/2026-11-05-sns-diagnostic-runtime-bundles.md:50`).
3. 발문 분포: lab 6문항 중 `SELECT_CORRECT` 1개(surface-tension-laplace-q16), 나머지 5개 `SELECT_INCORRECT`. 세트 E 16문항 중 `SELECT_CORRECT` 9개.
4. v5.8 실험(`docs/experiments/v58-conclusion-2026-10-29/`)에 나오는 문항 ID는 lab 6문항뿐이다.
5. 진단 엄격 사례 6건의 발문: 의식 14·경마 6·플라 10·오디오 16 = `SELECT_CORRECT`(정답이 참인 선지 → 171행 "모든 주장 지지" 작동), 의식 16·플라 8 = `SELECT_INCORRECT`(낱말 차이 오류 판정, 대상 모호 UNKNOWN).

## 해석 (가설)

- 과적합: 지시문을 6문항, 주로 "적절하지 않은 것" 발문(정답 = 거짓 선지, 한 지점 반박이면 충분)에 맞춰 다듬었다. "적절한 것" 발문의 정답 선택은 거의 시험되지 않았다.
- 긴 해설이 판정기에게 "갖춰야 할 단계 목록"으로 읽혀 엄격함을 더했을 수 있다(미확인).

## 해결 후보 (미채택)

1. 원인 분리 실험: 엄격 사례 4~6건을 해설만 짧게 바꿔 재판정. 풀리면 해설 탓, 그대로면 171행 탓. 저장 요청 재사용(D-0168), 외부 전송은 승인 뒤.
2. 충분 기준 원리 재정의: "그 근거로 이 선지를 고르고 다른 선지와 구별되는가". 선지 문장이 이미 말하는 결론은 다시 요구하지 않음(P1), 판정을 바꾸지 않는 낱말 차이는 오류 아님(P2).
3. 시험 문항 분리: 연습용(lab 6 + 세트 E 16)으로 고치고, 처음 보는 용(미사용 8~10문항, 발문 반반)은 마지막에 한 번만. 처음 보는 용에서 깨지면 문항 땜질이 아니라 원리로 돌아간다.
4. 기대 판정 선결정: 문항마다 학생 답 유형(핵심만, 결론만, 틀림 등)을 두고 사용자가 기대 판정을 먼저 정한다. 경계 사례(오디오 16)·관대 반례 포함.
- 권고 순서: 1 → 2 → 3·4.

## 같은 세션의 미커밋 변경 (논의 전 구현, 사용자 판단 대기)

- `packages/app/src/client/diagnostic/FeedbackScreen.tsx`: M4 칠하기(`sectionMarks`)·스크롤 연결
- `packages/app/src/server/diagnostic/store.ts`, `controller.ts`: 요약 대화 기록 기본 위치를 `sessions/diagnostic/summary-logs/`로(B7)
- `packages/app/src/server/diagnostic/controller.test.ts`: 위치 테스트 1개
- 진단 테스트 77개·타입 검사 통과. `packages/app` 전체 383개 중 1개 실패(어느 것인지 미확인).

## 2026-11-08 추가

- 사용자 관찰: lab에서 테스트한 것은 대부분 오답(sol 판정·질문·설명), 진단은 대부분 정답(luna). 모델 차이가 실질적일 수 있다.
- 확인한 사실: 진단 근거 작성 13문항 중 12문항 luna. 틀린 부분 묻기 질문은 판정 호출 안에서 만들어진다(`packages/pipeline/src/problem-solving/feedback.ts:41`). D-0104(10-10)에서 luna는 정답 응답에 오히려 후했다.
- 사용자: 질문의 질도 실험에서 봐야 한다. 후보 ①을 모델 × 해설, 판정 + 질문·설명 질로 넓혀 기록하고 설계 초안 작성 지시.
- 초안: `docs/experiments/judge-model-explanation-2026-11-08/DESIGN-DRAFT.md`(사례 9 = 실제 7 + 관대 반례 2, 4조건 × 3회, 판정 약 101회 + 설명 최대 약 72회, 약 $4 상한 $6 제안). 사용자 검토 전, 외부 전송 없음.
- 웹 에이전트 검토(사용자 전달, 2026-11-08) 반영해 초안 개정 1. 짧은 해설(정답 선지 해설 줄)은 판정기가 빠졌다고 한 연결을 그대로 담아 길이만 시험하므로 폐기 → lab식 재작성(결과 모르는 하위 에이전트, 16문항, 실행 전 고정)·해설 없음. 지금 조건 새 3회(선택 편향으로 재사용 안 함). 연결 넣은 근거 B 3건, 반례 C 4건(결론만 2, 가르지 못하는 사실 2). 5조건, 판정 약 183회, 약 $5.5·상한 $8 제안. 범위 밖은 Q-0045.
- 사용자 결정(2026-11-08): 오디오 16 기대 판정 '충분'(기준 사례 4건, 대부분 = 4건 중 3건 이상), B·C 문구 그대로, 전송 상한 $8 승인. lab식 해설 v1 16개 사실 오류 없음(사용자 대조), 규칙 6(선지의 비교·조건까지 이어 씀) 추가해 결과 모르는 하위 에이전트가 v2 재작성 중. 경마 7 날짜 차이(조사일 대 보도일)는 의도된 차이로 확인 거리 아님.

## 2026-11-08 실험 결과 (`docs/experiments/judge-model-explanation-2026-11-08/`)

- 183칸 실행, $4.41, 판정 실패 3. 보고: `REPORT-human.md`, `REPORT-desktop.md`, 독립 검토 `REVIEW-opus.md`.
- 측정: 기준 4사례 풀림 L-now·L-lab·L-none 0/4, S-now 2/4, S-lab 1/4(최종 판정). C 반례 통과 0. 원문 오독 0.
- 새 사실(코드 에이전트 재확인): 판정기 SUPPORTED → 서버 INSUFFICIENT 14칸, 그중 13칸은 `feedback-claims.ts:294`(근거 인용 안 학생 주장 전부 CONSISTENT 요구)와 지시문 164–167행·330행 끝(CHOICE_READING)의 겹침. 선지 사례를 해석해 잇는 정답 근거가 구조적으로 막힘. 예 `runs/A-horse6__L-now__r1.json`.
- 해석(가설): 엄격함 = 서버 검사(모델 공통) + luna(낱말 차이·답 노출 질문) + 171행(sol에도 남음, 의식 14 6/6). 해설은 주원인 아님.
- 사용자 판단 대기: 서버 검사 고침 방안(A 추천), 질문 블라인드 판정 범위(질문만 추천).
- 사용자 결정: 서버 검사 방안 A 적용(D-0211), 블라인드 판정은 질문만. 저장 응답 재생 결과 9칸 부족→충분, 역방향·C 변화 0. 남은 걸림돌: 171행(의식 14), luna 낱말 차이, ground 범위 흔들림(경마 6 luna 2칸), 오디오 16.
- 2026-11-09 질문 블라인드 판정(사용자, `blind/JUDGMENT-user-questions.md`): 경마 5 sol 두 질문(학생 말 인용 + 틀린 칸 하나) 전 항목 좋음. 오디오 17은 방향만 묻는 질문이 표본에 없음(전체 15칸 중 luna 3칸만), sol은 모두 숫자를 물음 → 질문 규칙 쪽 원인 후보. 의식 16은 판정 문제(P2). 그림 근거는 칠하기에서 빠지는데 질문은 "표시한 표"라고 말함(`feedback.ts:557`).
