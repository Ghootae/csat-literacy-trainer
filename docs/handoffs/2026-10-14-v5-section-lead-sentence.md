# 인계: 마지막 설명 칸의 첫 판정 문장을 코드가 쓰기

- 날짜: 2026-10-14
- 작성: Claude
- 실행: 미정(사용자 결정. 작은 작업이라 Claude 직접 실행도 가능)
- 관련 결정: 승인 후 `memory/decisions/`에 새 번호로 기록. 근거 사례는 UI 메모장 19번
  (`docs/review/v4-dev-ui-feedback-backlog-2026-10-11.md`).
- 상태: 사용자 동의(2026-10-14). Claude 직접 실행

## 왜 하나

공손룡 문항("적절하지 않은 것은?")에서 학생은 "②가 틀려요"라고 했다. 마지막 설명의 ②번 칸은
"처음에 ②가 틀렸다고 본 건 아니야."로 시작했다
([기록](../experiments/v5-reselection-sections-2026-10-14/TRANSCRIPTS.md) P3-G). 판정, 재구성,
질문은 모두 정확했다. 모델이 판정을 자기 말로 옮기다 문장이 꼬여, 학생 말을 뒤집은 것처럼 읽혔다.
기록된 '처음 고른 선지' 칸 18개 중 1개다.

이 문장에 필요한 사실(고른 번호, 정답인지, 학생이 그 선지를 맞다고 봤는지 틀리다고 봤는지)은
코드가 이미 안다. 그래서 이 문장은 코드가 정해진 틀로 쓰고 모델은 바꾸지 않는다. 모델은 그 문장을
입력으로 받아 바로 뒤에 이어질 문장부터 쓴다. 판정의 방향은 코드가 맡고, 표현의 연결은 모델이 맡는다.

## 목표

- `firstChoice`·`reselection` 칸의 첫 문장(이하 '판정 문장')을 코드가 정하고, 화면에서 모델이
  쓴 칸 내용 앞에 그대로 붙인다.
- 모델은 판정 문장을 입력으로 받고, 그 문장을 되풀이하거나 다시 판정하지 않는다.
- `answer` 칸은 바꾸지 않는다. 앞 안내 "이제 ⑤번이 정답인 이유를 볼게."가 이미 판정을 맡는다.
- 추가 API 요청은 없다. 기존 마지막 설명 요청 입력에 판정 문장이 더해질 뿐이다.

## 판정 문장 표

선택 n번(1 또는 2)의 학생 입장은 `s.selectionComparisons` 중 `selectionNumber`가 n인 관찰의
**마지막** 항목으로 정한다(근거 보충이 있으면 보충 평가가 마지막 항목이다). 기호 ②는 실제 번호다.

| 고른 선지 | 학생 입장(그 선택의 마지막 비교) | 판정 문장 |
|---|---|---|
| 정답 | 무엇이든 | `②를 고른 건 맞아.` |
| 오답, "적절하지 않은 것" 문항(`SELECT_INCORRECT`) | `CONSISTENT` | `②가 틀렸다고 봤지만, ②는 답이 아니야.` |
| 오답, "적절한 것" 문항(`SELECT_CORRECT`) | `CONSISTENT` | `②가 맞다고 봤지만, ②는 답이 아니야.` |
| 오답 | `MISMATCH`·`UNKNOWN`·비교 없음 | `②는 답이 아니야.` |

원칙:
- 학생 입장을 말하는 문장은 학생의 근거와 선택이 같은 방향일 때(`CONSISTENT`)만 쓴다. 근거가 없거나,
  재구성되지 않았거나, 선택과 근거가 어긋나면(`MISMATCH`) 결과만 말한다. 학생이 말하지 않은 판단을
  학생의 생각으로 쓰지 않는다는 기존 규칙과 같은 방향이다.
- 학생이 쓰는 말("틀려요", "맞아요")에 맞춰 '틀렸다/맞다'를 쓴다. 문항 발문의 어휘(일치하지 않는,
  옳지 않은 등)는 쓰지 않는다. 문항마다 달라 코드가 안정적으로 고를 수 없기 때문이다.
- 앞 안내에 이미 "처음에 고른 ②번"이 있으므로 판정 문장에는 "처음에"를 넣지 않는다.

## 범위 밖

- 판정·재구성·질문 지시문(`source-direct-problem-feedback-v5.md`)과 판정 코드.
- `answer` 칸, 앞 안내(CONNECTOR)·게이트(GATE) 문장.
- 세션 저장 형식. 판정 문장은 저장하지 않고 세션에서 매번 계산한다.

## 손댈 파일과 계약

- `packages/pipeline/src/problem-solving/feedback-v5-end-explanation.ts`
  - 순수 함수 `feedbackSectionLead(s: FeedbackSession, selectionNumber: 1 | 2): string`을 추가한다.
    위 표를 그대로 구현한다. 해당 선택이 없으면 오류를 던진다.
  - `feedbackEndExplanationContent` 입력에
    `sectionLeads: { firstChoice: string, reselection: string | null }`를 더한다.
    `reselection`은 선택이 두 번일 때만 값이 있다.
  - 두 지시문(INCORRECT·CORRECT)에 다음 문장을 칸 안내 문장 바로 뒤에 넣는다.
    > 입력 sectionLeads는 firstChoice·reselection 칸의 첫 문장이며, 화면에서 칸 내용 앞에 그대로
    > 붙는다. 칸은 이 문장 바로 다음에 이어질 문장부터 쓴다. 이 문장을 되풀이하거나, 선택이 맞았는지,
    > 학생이 그 선지를 어떻게 판단했는지를 다시 말하지 않는다.
  - CORRECT 지시문:
    - 말투 예시 `"②를 고른 건 맞아."`를 `"그 부분은 원문과 반대야."`로 바꾼다. 판정 문장과 겹치지
      않게 하기 위해서다.
    - firstChoice 항목에서 "선택이 맞았다고 짧게 인정하고, "를 지운다.
    - reselection 항목에서 "선택이 맞았다고 짧게 인정하고, "를 지운다.
    - 나머지 문장은 그대로 둔다.
- `packages/app/src/server/problem-feedback-v4.ts` (`appendCoach`, 223~228행 부근)
  - `-first-section`은 `feedbackSectionLead(s, 1) + ' ' + firstChoice`로 만든다.
  - `-reselection-section`은 `feedbackSectionLead(s, 2) + ' ' + reselection`으로 만든다.
  - 뒤에 붙는 "설명이 이해됐으면…" 문구는 그대로 둔다.
- 테스트
  - `feedback-v4.test.ts`:
    - 표의 모든 칸(정답, 오답 × 두 극성 × CONSISTENT, 오답 × MISMATCH/UNKNOWN/비교 없음,
      근거 보충 후 마지막 비교 우선)을 단위 시험한다.
    - 입력에 `sectionLeads`가 들어가는지 시험한다.
    - 지시문 전문 비교 두 곳(447·448행)을 갱신한다.
  - 서버 시험: 칸 메시지가 판정 문장으로 시작하는지 시험한다.
  - e2e(`problem-feedback-v4-workbench.spec.ts`): 모의 설명 앞에 판정 문장이 붙는 것에 맞춰 기대
    문구를 갱신한다.
- `scripts/run-v5-live-check.mjs`
  - 자동 검사 `LEAD_RESTATED`를 추가한다. 모델이 쓴 칸 내용의 첫 문장이 다시 판정하면 위반으로
    센다. 판정 여부는 "고른 건 맞", "답이 아니", "판단은 맞지 않", "틀렸다고 본", "맞다고 본" 등을
    포함하는지로 본다. 검사 범위는 판정 문장이 아니라 모델 부분이다.
  - 기존 `ANSWER_NUMBER_REPEATED` 검사는 그대로 둔다.

## 완료 조건

- [ ] `npm run build` 통과, 클라이언트 타입 검사 통과.
- [ ] vitest: 새 시험 통과. 실패는 기존 2건(`student-state.ts` 경계, axis-architecture 산출물 없음)만
      남는다.
- [ ] e2e 격리 실행 통과:
      `PLAYWRIGHT_CLIENT_PORT=5383 CSAT_API_PORT=5384 npx --no-install playwright test packages/app/e2e/problem-feedback-v4-workbench.spec.ts`
- [ ] 실모델 작동 확인(사용자 별도 승인 후, 1회): 표의 경우를 하나씩 덮는 소수 세션만 돌린다
      (정답 선택, 오답·두 극성의 CONSISTENT, 오답·근거 없음). 판정 문장이 표와 같고, 모델 부분이
      다시 판정하지 않고(`LEAD_RESTATED` 0), 이음이 자연스러운지 사람이 읽어 본다.
      사용자 결정(2026-10-14): "사실상 작동만 확인하는 거니까, 몇개에 대해서만 1회 검증".

## 알려진 영향

- 변경 전에 마지막 설명이 이미 만들어진 세션을 다시 그리면, 판정 문장이 옛 설명 앞에 붙어 판정이
  두 번 나올 수 있다. 개발용 도구라 옛 세션 이전은 하지 않는다.
- 판정 문장이 틀에 박혀 칸마다 첫 문장이 비슷해진다. 직전 시험에서 모델이 쓴 첫 문장 18개 중 17개가
  사실상 같은 뜻이었으므로, 잃는 표현은 크지 않다고 본다.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).
- `selectionComparisons`에 선택 번호를 이을 방법이 표와 다르게 필요해지면 멈춘다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `packages/pipeline/src/problem-solving/feedback-v5-end-explanation.ts`, `packages/pipeline/src/index.ts`,
  `packages/app/src/server/problem-feedback-v4.ts`, `packages/pipeline/src/problem-solving/feedback-v4.test.ts`,
  `packages/app/src/server/problem-feedback-v4.test.ts`, `scripts/run-v5-live-check.mjs`, `scripts/v5-lead-sentence-cases.mjs`(신규).
- 설계 대비 차이: 조사 규칙을 더했다(①·③은 을/이/은). e2e는 기대 문구를 바꿀 필요가 없었다.
- 테스트 결과: 빌드·클라이언트 타입 검사 통과. vitest 1180 통과, 기존 실패 2건. e2e 13/13. 실모델 4세션 위반 0, 0.169달러.
- 남은 문제: 없음. 경미한 점 1건(L-M "맞아" 연속)은 보고서에 적었다.
