# 인계: 판정기 형식 실수 두 종류를 서버가 기계적으로 고치기

- 날짜: 2026-11-03
- 작성: 코드 에이전트(메인 세션)
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0190-problem-feedback-v58-default.md`, `memory/decisions/D-0189-server-never-raises-insufficient.md`(서버는 판정 결론을 올리지 않음)
- 사용자 승인: 2026-11-02 방안 (ㄱ) "서버가 기계적으로 고치기", 2026-11-03 설계 초안 승인

## 배경

판정 지시문 v5.8의 세 칸 판정(선지 읽기, 근거, 판단)에서 서버 계약 검사(`CLAIMS_CONTRACT`)에 걸려 재작성한 일이 저장 기록 86건 중 5건 있었다. 재작성 한 번에 30초 이상 걸린다. 5건 모두 판단은 재작성 전후로 같았다. 이 가운데 뜻이 분명한 실수 두 종류(3건)를 서버의 기계적 정리 단계에서 고친다. 나머지 2건(선지 읽기 인용 누락, 판단 대상 번호 오류)은 판단이 필요해서 재작성으로 남긴다.

| 사례(세션 앞 8자) | 위반 | 실수 |
|---|---|---|
| `206a362f` 도파민 ⑤ | `CONTRADICTED claim has no error` | studentClaims의 "그래서 5번이 틀렸어."를 CONTRADICTED로 두고 맞는 오류 항목이 없음 |
| `9924082b` 오네소르게 ⑤ | `CONTRADICTED claim has no error` | "5번이 맞아."를 CONTRADICTED로 둠(재작성 때 모델이 스스로 CHOICE_READING으로 고침) |
| `97a9de5f` 지질 나노 입자 ⑤ | `readingQuote not in observation` | 학생 말 "소수성 분자간의 인력이라는 부분이 있으므로, …"를 "소수성 분자간의 인력이 있으므로, …"로 줄여 인용 |

원기록: `.omc/logs/problem-feedback-v4/events.jsonl`(git 밖). 세션별 `SUBMITTED` 기록의 `session`이 평가 직전 상태이고, 바로 뒤 `EVALUATED` 기록의 `call.metadata.attempts`에 1차(ERROR)와 2차(SUCCESS)의 `rawOutput`이 있다.

## 목표

- 결론 문장 옮기기: studentClaims에서 아래 조건을 모두 만족하는 항목은 sourceCheck를 `CHOICE_READING`으로 바꾸고 note를 남긴다.
  - sourceCheck가 `CONTRADICTED`다.
  - 같은 assessment의 오류 항목(errors) 가운데 그 claim과 겹치는(`overlaps`) 것이 없다.
  - quote가 선지 판단만 담은 결론 문장이다. 꼴은 좁게 잡는다: 앞에 접속어(그래서·따라서·그러므로·그럼·즉 등)가 있어도 되고, 이어서 선지 번호(①~⑤ 또는 1~5번/숫자+번)가 오고, 조사 다음에 맞다·틀리다·옳다·옳지 않다·적절하다·적절하지 않다·정답·답 계열 서술과 문장 끝 표현만 온다. 다른 내용어(예: "5번은 점도가 커서 틀려")가 섞이면 제외한다.
- 인용 바로잡기: 아래 인용이 해당 학생 발화에 그대로(공백 정규화 후) 없으면 고친다.
  - 대상: `choiceReading.claims[].readingQuote`, `ground`(kind가 NONE이 아닐 때).
  - 조건: 인용의 앞 6자와 뒤 6자가 그 발화에서 각각 정확히 한 번씩, 앞이 뒤보다 먼저 나온다. 그 사이 구간 길이가 원래 인용 길이의 0.7~1.5배다.
  - 처리: 조건이 맞으면 인용을 그 원문 구간(앞 6자 시작부터 뒤 6자 끝까지)으로 바꾸고 note를 남긴다. 하나라도 어긋나면 손대지 않는다(검사가 재작성으로 보냄).
  - 인용이 12자 미만이면 손대지 않는다.
- 두 정리는 `OpenAIFeedbackEvaluator`의 SELECTION 경로에서 `normalizeCells` 다음, `settleConclusion` 앞에 적용되고, note가 `attempt.normalized`에 합쳐진다.

## 범위 밖

- 지시문(v5.8 md) 문구, 모델 배정, 재시도 횟수는 바꾸지 않는다.
- 다른 계약 규칙(`touched claim needs …`, `reconstructability must follow …` 등)은 고치지 않는다.
- studentClaims의 quote, claimConflicts, errors의 studentEvidence 인용은 이번 대상이 아니다.
- 외부 API 호출 금지.

## 손댈 파일과 계약

- `packages/pipeline/src/problem-solving/feedback-claims.ts`:
  - 결론 문장 옮기기는 `normalizeCells` 안에 넣는다(관찰 문장이 필요 없음).
  - 인용 바로잡기는 발화가 필요하므로 새 함수로 내보낸다. 예: `snapQuotes(assessment, observations): { assessment, notes }`. 입력을 바꾸지 않고 사본을 돌려준다(`normalizeCells`와 같은 관례).
- `packages/pipeline/src/problem-solving/feedback-evaluator.ts`: SELECTION 경로에서 `snapQuotes`를 호출한다. 관찰 목록은 `settleConclusion`에 넘기는 것과 같은 `{observationId, text}`다.
- 테스트(`feedback.test.ts` 또는 claims 테스트가 있는 파일):
  - 위 3건의 1차 답안을 최소 재현 자료로 테스트에 옮긴다. `.omc` 경로를 테스트에서 읽지 않는다.
  - 각 1차 답안이 정리 단계를 거친 뒤 `validateClaims`를 통과하는지 확인한다.
  - 결과 판단(`judgment.verdict`, `rationaleImpliedVerdict`, `contentAssessment`)이 실제 2차 답안과 같은지 확인한다.
  - 대상이 아닌 경우도 넣는다:
    - 내용어가 섞인 결론 문장은 옮기지 않는다.
    - 오류 항목과 겹치는 CONTRADICTED 결론 문장은 옮기지 않는다.
    - 앞 6자가 두 번 나오는 인용은 바꾸지 않는다.
    - 길이 비가 범위 밖인 인용은 바꾸지 않는다.
    - 12자 미만 인용은 바꾸지 않는다.

## 검증(외부 전송 없음)

- 재생 스크립트를 `scripts/replay-judge-normalization.mjs`로 만든다. 저장된 v5.8 판정 기록 전부를 대상으로 한다.
  - 대상 파일: `.omc/logs/problem-feedback-v4/events.jsonl`, 그리고 `docs/experiments/**/*.records.jsonl` 가운데 promptVersion이 `problem-feedback-v5.8`인 것.
  - 각 ASSESSMENT 시도의 `rawOutput`을 평가 직전 세션으로 새 정리 → `settleConclusion` → `validateClaims` 순서로 다시 통과시킨다.
  - 집계 1: 원래 ERROR였던 시도 가운데 이제 통과하는 것.
  - 집계 2: 원래 SUCCESS였던 시도 가운데 결과(검사 통과 여부, verdict, contentAssessment)가 달라진 것. 이 값은 0이어야 한다.
  - 평가 직전 세션을 찾기 어려우면, 저장된 세션의 observations·selections에서 그 시도에 필요한 입력을 재구성해도 된다. 방법은 보고에 적는다.
- 결과 수치를 보고에 적는다.

## 완료 조건

- [ ] `npm run build` 통과
- [ ] `npx vitest run packages/pipeline/src/problem-solving packages/app/src` 통과. 기존 실패 `packages/app/src/boundary.test.ts` 1건(`server/student-state.ts`의 `node:fs`)만 허용한다.
- [ ] 재생 결과: 위 3건 통과, 기존 SUCCESS 결과 변화 0
- [ ] `test.skip`·`.only`·빈 테스트 없음

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
  - 예: 결론 문장을 옮긴 뒤에도 다른 규칙에 걸려 통과하지 못할 때.
  - 예: 기존 SUCCESS 결과가 바뀔 때.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).

## 결과 보고 (실행 후 작성)

- 변경 파일: `packages/pipeline/src/problem-solving/feedback-claims.ts`(`normalizeCells`에 결론 문장 옮기기, 새 `snapQuotes`), `feedback-evaluator.ts`(SELECTION 경로에서 `normalizeCells` -> `snapQuotes` -> `settleConclusion`, note 합침), `feedback.test.ts`(3건 재현 + 대상 아님 5건), `scripts/replay-judge-normalization.mjs`(새 파일)
- 테스트 결과: `npm run build` 통과. vitest(pipeline/problem-solving + app/src) 792 통과 / 1 실패(허용된 `boundary.test.ts` 1건)
- 재생 결과: 저장된 v5.8 SELECTION ASSESSMENT 시도 71건(ERROR 5, SUCCESS 66). 원래 ERROR 중 3건 통과(97a9de5f, 206a362f, 9924082b), 2건은 그대로 실패(52447e1e `touched claim needs studentReading and readingQuote`, 15061f5b `reconstructability must follow the three cells`). 기존 SUCCESS 중 결과 변화 0. 세션은 각 EVALUATED 직전의 같은 transitionId SUBMITTED 기록에서 가져옴. SUCCESS 비교는 마지막 시도의 저장 결과(rationaleImpliedVerdict, contentAssessment)와 대조.
- 남은 문제: 위 2건(범위 밖, 재작성으로 남김). 지질 나노 입자 건은 ground 인용도 같이 바로잡힘(대상에 포함).
