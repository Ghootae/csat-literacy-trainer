# 인계: 선지와 다른 대상을 판단한 근거를 오류로 잡고 먼저 묻기

- 날짜: 2026-10-14
- 작성: Claude
- 실행: executor 하위 에이전트([D-0128](../../memory/decisions/D-0128-claude-subagent-work-division.md))
- 관련 결정: 승인 후 `memory/decisions/`에 새 번호로 기록. 근거 사례는 UI 메모장 21번
  (`docs/review/v4-dev-ui-feedback-backlog-2026-10-11.md`).
- 상태: 사용자 승인(2026-10-14, "승인, 진행해줘")

## 왜 하나

공손룡 12번에서 학생은 ②(ⓐ·ⓓ 비교)를 ⓐ·ⓔ 비교로 읽고 판단했다. 판정 기록(`.omc/logs/problem-feedback-v4/events.jsonl`,
세션 `983184e1…`)을 보면 이렇다.

- "ⓐ는 찾고 있는 빨간옷, ⓔ는 빨간옷을 지시"는 ⓐ·ⓔ에 대한 설명으로 사실이다. 그래서 오류가 되지 않았다.
- "하나의 명이 두가지 실을 지시하는 경우"는 원문과 어긋난다. 그래서 오류 E1이 되어 질문으로 나갔다.
- 판정기는 교정 판정 이유에 "②가 비교하는 ⓐ와 ⓓ의 관계를 설명하지 않는다"고 적었다. 대상이 틀린 것은
  알았지만 오류로 만들지 못했다.

원인은 오류를 만드는 규칙이다. 오류는 원문과 어긋난(CONTRADICTED) 학생 주장에서만 생긴다
(`feedback-v5-claims.ts`, 판정 지시문 "학생 주장 분리 기록"). 선지와 **다른 대상**에 대한 **맞는** 말은
이 규칙상 오류가 될 수 없다.

결과도 나빴다. 학생의 처음 판단은 두 오류가 상쇄돼 ②에 대해 우연히 맞았다("뒷받침 → 적절"). 그런데
엉뚱한 대상(ⓐ·ⓔ)에 대한 오류만 고치자 판단이 "뒷받침하지 않아"로 뒤집혔다. 오답을 굳힌 채 끝났다.

같은 유형은 기호(ⓓ↔ⓔ), 입장(후기 묵가↔공손룡), 조건(둘 다 바뀜↔하나만 바뀜)을 바꿔 읽을 때
문항마다 생길 수 있다.

## 목표

- 학생 주장이 선지가 판단하는 대상과 다른 대상을 판단하면, 그 주장을 `OFF_TARGET`으로 기록한다.
  원문상 참·거짓보다 이 판정이 먼저다.
- `OFF_TARGET` 주장에서 **대상 오류**(`errorType: 'TARGET'`)를 만든다. 대상 오류는 다른 오류보다 먼저 묻는다.
- 엉뚱한 대상에 대한 주장은 내용 오류(`CONTENT`)를 만들지 않는다. 그 주장은 이미 `OFF_TARGET`으로
  기록되고, 대상 오류 하나로 묶인다.
- 대상 오류가 있으면 선택 불일치 질문은 내지 않는다. 학생 결론은 다른 대상을 두고 낸 것이라, 선택과
  비교해도 의미가 없다. 대상을 바로잡은 뒤의 판단은 학생이 다시 고르는 단계에서 드러난다.

## 대상의 정의 (판정 지시문에 넣을 내용)

선지가 판단하는 대상은 선지 문장에 적힌 다음 요소다.

- 기호와 가리키는 표현(ⓐ, ⓓ, ㉠ 등)과 그 짝
- 판단하는 사람이나 입장(공손룡, 후기 묵가, 소수 의견 등)
- 조건과 상황(무엇이 바뀌고 무엇이 그대로인지, 어떤 시점인지)

`OFF_TARGET`은 학생이 선지의 대상 **대신** 다른 대상을 판단한 주장에만 쓴다. 학생이 선지의 대상을
판단하면서 지문의 다른 정보를 근거로 끌어오는 것은 `OFF_TARGET`이 아니다. 어느 쪽인지 확실하지 않으면
`OFF_TARGET`을 쓰지 않고 기존 판정을 따른다.

## 범위 밖

- 마지막 설명(`feedback-v5-end-explanation.ts`)과 첫 판정 문장(D-0127, UI 메모장 20번).
- 정답·오답 라우팅, 질문 수 상한, 종료 사유.
- `scripts/lib/v5-marker-judgment.mjs`와 이를 쓰는 옛 실험 스크립트. 옛 계약을 유지한다.

## 손댈 파일과 계약

- `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.md` (판정 지시문)
  - "학생 주장 분리 기록"
    - sourceCheck에 `OFF_TARGET`을 더한다. 위 '대상의 정의'를 넣고, 대상 판정이 원문 대조보다 먼저라고
      쓴다. sourceBasis에는 선지가 실제로 다루는 대상을 쓴다.
    - 오류 생성 규칙을 바꾼다.
      - `CONTRADICTED` 주장 → `errorType: 'CONTENT'` 오류.
      - `OFF_TARGET` 주장(하나 이상) → `errorType: 'TARGET'` 오류 **하나**. 같은 대상 혼동에서 나온 주장은
        한 오류로 묶는다.
      - `CONTRADICTED`나 `OFF_TARGET` 주장이 하나라도 있으면 contentAssessment는 `ERROR`다.
  - "질문 규칙"에 대상 오류 질문을 더한다.
    > 대상 오류의 질문은 선지가 실제로 다루는 대상과 학생이 판단한 대상을 나란히 놓고, 선지 문장의 낱말로
    > 묻는다(예: "②가 ⓐ와 함께 비교하는 건 ⓓ야, ⓔ야?"). 학생이 그 대상에 대해 한 판단의 정오는 묻지 않는다.
    - 지시문에 넣는 예시는 이 한 문장만이다. 사례에 맞춘 예시를 늘리지 않는다(D-0118 보완 때의 사용자 지적).
  - "REPAIR"에 한 줄을 더한다. 학생이 선지의 실제 대상을 바르게 짚으면 대상 오류는 `REPAIRED`다.
  - `selectionMismatchQuestion`: 대상 오류가 있으면 null로 둔다.
- `packages/pipeline/src/problem-solving/feedback-v5-claims.ts`
  - 스키마: sourceCheck 열거값에 `OFF_TARGET`을 더한다.
  - `validateClaims`(RECONSTRUCTABLE일 때):
    - `CONTRADICTED` 주장마다 그 인용을 가진 `CONTENT` 오류가 있다.
    - `OFF_TARGET` 주장마다 그 인용을 가진 `TARGET` 오류가 있다.
    - 각 오류는 자기 종류에 맞는 주장 하나 이상에 대응한다.
    - `TARGET` 오류는 많아야 하나다.
    - 대응하는 주장이 없는데 `ERROR`면 실패한다.
- `packages/pipeline/src/problem-solving/feedback-v4.ts`
  - `ErrorSchema`(SELECTION `errors`, REPAIR `newErrors` 공용)에 `errorType: 'TARGET' | 'CONTENT'`를 필수로 더한다.
  - `applyFeedbackAssessment`(SELECTION):
    - 오류 순서를 `TARGET` 먼저, 그다음 `CONTENT`(원래 순서 유지)로 정한다.
    - `TARGET` 오류가 있으면 `selection-mismatch`를 넣지 않는다.
    - 그 밖의 흐름(질문 수, 종료)은 그대로다.
  - 모델 출력 스키마(JSON Schema 변환)에도 같은 필드가 반영되는지 확인한다.
- 테스트(`feedback-v4.test.ts`)
  - 주장·오류 대응 규칙의 성공·실패 경우.
  - 오류 순서와 선택 불일치 생략.
  - 판정 지시문 승인 문구 비교 시험(421행 부근)에 새 문장을 반영한다.
  - 기존 시험 고정 데이터에 `errorType: 'CONTENT'`를 더한다.

## 완료 조건

- [ ] `npm run build`, `npm run typecheck:client` 통과.
- [ ] vitest: 새 시험 통과. 실패는 기존 2건(`student-state.ts` 경계, axis-architecture 산출물 없음)만 남는다.
- [ ] e2e 격리 실행 통과:
      `PLAYWRIGHT_CLIENT_PORT=5383 CSAT_API_PORT=5384 npx --no-install playwright test packages/app/e2e/problem-feedback-v4-workbench.spec.ts`
- [ ] 실모델 확인(사용자 별도 승인 후, Claude가 실행):
  - **대상 혼동 6세션**: 현재 6문항마다 하나씩, 학생이 선지의 대상을 바꿔 읽은 근거를 둔다. 사례는 Claude가
    문항을 보고 쓰고, 사용자가 확인한 뒤 실행한다. 공손룡은 사용자 원문 근거를 그대로 쓴다.
    - 첫 질문이 대상 오류인지 본다.
    - 엉뚱한 대상에 대한 내용 오류 질문이 나오지 않는지 본다.
  - **오탐 대조군 6세션**: 대상을 바르게 다루는 기존 근거(diverse-48의 A2)를 둔다. `OFF_TARGET`이
    하나도 나오지 않는지 본다.
  - 첫 판정만 본다. 공손룡 1세션만 교정 답변까지 진행해, 대상을 바로잡은 뒤 흐름을 사람이 읽어 본다.
  - 비용 상한 1달러.

## 알려진 영향

- 대상 오류만 바로잡고 끝나면, 학생이 엉뚱한 대상에 대해 가졌던 다른 오해(이번 E1)는 묻지 않은 채 남는다.
  선지의 정오와 상관없는 오해이므로 받아들인다. 필요하면 마지막 설명에서 다룬다.
- 판정기가 지문의 다른 정보를 끌어온 정상 근거를 `OFF_TARGET`으로 잘못 볼 위험이 있다. 대조군으로 확인한다.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).
- REPAIR `newErrors`에 `errorType`을 더하는 것이 기존 교정 흐름과 충돌하면 멈춘다.

## 결과 보고 (실행 후 작성)

- 변경 파일: 판정 지시문 `source-direct-problem-feedback-v5.md`, `feedback-v5-claims.ts`, `feedback-v4.ts`,
  시험 `feedback-v4.test.ts`, `source-markers.test.ts`, 앱 시험 `problem-feedback-v4.test.ts`·`problem-feedback-v4-http.test.ts`,
  e2e 모의 `problem-feedback-v4-workbench.spec.ts`(고정 데이터에 `errorType: 'CONTENT'` 추가).
- 테스트 결과: `npm run build`·`typecheck:client` 통과. vitest 1190건 중 1188 통과, 실패 2건은 기존 것
  (boundary.test.ts node:fs, axis-architecture 산출물 없음). e2e 13건 통과.
- 설계와 달라진 점: (1) `validateFeedbackAssessment`의 선택 불일치 질문 필수 검사도 TARGET 오류가 있으면 건너뛴다
  (null 질문이 계약 실패가 되지 않도록). (2) REPAIR `newErrors`는 `ErrorSchema`와 별개 객체라 `errorType`을 따로 더했다.
  (3) 옛 스크립트 대조 시험은 sourceCheck 열거값에 OFF_TARGET을 더해 비교한다(옛 mjs는 그대로). (4) 저장된 합성 산출물
  (`docs/experiments/...`)은 읽을 때 `errorType: 'CONTENT'`를 보충한다(산출물 파일은 수정하지 않음).
- 남은 문제: 실모델 확인(대상 혼동 6세션·오탐 대조군 6세션)은 아직 하지 않았다. 앱 시험은 `packages/pipeline` 빌드
  결과(dist)를 쓰므로 스키마 변경 뒤 `npm run build` 선행이 필요하다.
- Claude 검토 후 수정(2026-10-14, 사용자 승인): 지시문 예시가 시험 문항과 같아 과적합 위험이 있었다. 질문 예시를 "③이 ㉠과 함께 비교하는 건 ㉡이야, ㉢이야?"로, 입장 예시를 "갑, 을, 글쓴이 등"으로 바꿨다.
- 실모델 확인(Claude, 2026-10-14): 대상 혼동 6/6 첫 질문 대상 오류, 대조군 대상 오류 0/6, T-G 교정 성공 → 다시 고르기. 0.475달러. 칠한 곳 없음 5건(근거가 선지뿐). [보고서](../experiments/v5-target-mismatch-2026-10-14/REPORT.md)
