# 인계: 정답 선택의 "근거 충분"은 핵심 관계의 모든 조각을 학생이 말했을 때만 (UI 메모장 29번)

- 날짜: 2026-10-21
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet, [D-0128](../../memory/decisions/D-0128-claude-subagent-work-division.md))
- 관련 결정: 승인 뒤 `memory/decisions/`에 새 번호로 기록. 근거: [29번 논의 자료](../review/backlog-29-supported-scope-2026-10-21.md),
  사용자 결정(2026-10-21): 다른 Claude 의견(M2·L1 모두 근거 부족, 출력 칸·서버 검증 필요)을 바탕으로 한 Claude 권고에 동의.
- 선행: [25번 인계](./2026-10-21-v5-correct-unverified-judgment-method.md)(커밋 1edb2be). 이 문서는 그 위에 더한다.
- 상태: 구현됨. 실모델 1·2차 뒤 보강 2회(Claude 직접), [D-0161](../../memory/decisions/D-0161-supported-needs-key-relation-coverage.md)

## 왜 하나

도파민 13번 ②(정답, "적절하지 않은 것은?") 반자동 시험에서 첫 판정이 아래 두 근거를 `SUPPORTED`로 봤다.

- M2: "카르비도파는 도파민 작용 기간을 늘리는 약이 아니라고 배웠어. 그래서 2번은 적절하지 않아." — 원문 밖 지식, 선지를 부정한 말의 되풀이.
- L1: "카르비도파는 말초 조직에서만 작용함." — 원문 사실 한 줄. "그래서 흑질 도파민에는 작용 못 한다"는 판정기가 이었다.

지시문에는 이미 "관련 대상이나 조건만 언급하면 SUPPORTED로 인정하지 않는다", "평가자가 원문에서 올바른 관계를 찾아낼 수 있다는
사실은 학생이 그 관계를 이해했다는 증거가 아니다"가 있는데 지켜지지 않았다. 23·24번에서 확인했듯 지시문만으로는 행동이 바뀌지 않고,
출력 칸과 서버 검증을 두면 바뀐다.

"평가자가 보탠 내용" 칸을 두는 방식은 쓰지 않는다. 이미 충분으로 기운 모델이 칸을 비우면 서버가 확인할 수 없다(24번 1차의 조각 잇기와
같은 위험). 대신 판정기가 핵심 관계를 조각으로 나누고, 조각마다 학생 발화 인용을 붙이게 한다. 학생이 하지 않은 말은 인용할 수 없으므로
빈 조각으로 드러난다.

## 목표

- SELECTION 출력에 `keyRelationCoverage`를 둔다. 판정기가 선지의 참·거짓을 가르는 관계를 조각으로 나누고, 조각마다 그 내용을 말한
  학생 발화를 인용하거나 "없음"으로 표시한다.
- **정답 선택**에서 `SUPPORTED`는 모든 조각이 인용으로 덮일 때만 서버가 받는다. 하나라도 비면 `INSUFFICIENT`이어야 한다
  (이때 `insufficiencyKind`는 D-0159대로 판정기가 정한다).

## 범위 밖

- **오답 선택의 SUPPORTED는 검사하지 않는다.** 오답 선택에서 SUPPORTED·CONSISTENT는 정답 기준 충돌 검토(ITEM_REVIEW)로 가는 안전장치라
  낮추면 그 검토가 사라진다. 그 밖의 오답 흐름은 SUPPORTED와 INSUFFICIENT가 같아 바꿀 이유가 없다. 칸 기록은 오답 선택에도 남긴다.
- 교정 뒤 근거 확인(REPAIR `sufficiencyEvidence`, D-0157). 방금 확인했으니 이번엔 그대로 둔다.
- 결론 재구성 규칙(D-0120), 오류 판정, 질문, 종료 흐름, 마지막 설명, UI, 다른 세션 파일.

## 손댈 파일과 계약

### 1. SELECTION 확장 스키마·검증 `packages/pipeline/src/problem-solving/feedback-v5-claims.ts`

- `extendedSelectionSchema`에 `keyRelationCoverage`를 더한다.
  - 배열, `minItems: 1`. 항목 `{ element: string, covered: boolean, observationId: string, quote: string }`,
    `additionalProperties: false`, 모두 required. `schema.required`에도 넣는다.
  - **속성 순서:** `claimConflicts` 바로 뒤, 기존 속성들보다 앞(`contentAssessment`보다 먼저 생성되게). 다른 속성의 상대 순서는 그대로.
- `validateClaims`에 세 번째 인자 `options: { correctChoice: boolean }`를 더하고(기존 호출이 깨지지 않게 기본값 `{ correctChoice: false }`),
  아래를 검사한다. 실패 메시지는 `CLAIMS_CONTRACT: …`.
  - 배열이고 비어 있지 않음, 항목 구조(키 4개, 타입).
  - `covered === true`: `quote`가 비어 있지 않고 같은 `observationId` 학생 발화 안에 있다(기존 `normalize` 포함 검사).
  - `covered === false`: `observationId`와 `quote`가 모두 빈 문자열.
  - `options.correctChoice && reconstructability === 'RECONSTRUCTABLE' && contentAssessment === 'SUPPORTED'`이면 모든 항목이
    `covered === true`. 아니면 실패: `SUPPORTED requires every key relation element covered by a student quote`.
- 머리 주석의 "TS 쪽에만 있음" 줄에 `keyRelationCoverage`를 더한다. `scripts/lib/v5-marker-judgment.mjs`는 건드리지 않는다.

### 2. 평가기 `packages/pipeline/src/problem-solving/feedback-v4-evaluator.ts`

- `validateClaims` 호출에 `{ correctChoice: <마지막 선택 choiceId === source.answerChoiceId> }`를 넘긴다.
- SELECTION 후처리에서 `keyRelationCoverage`도 `studentClaims`·`claimConflicts`처럼 떼어 낸다.

### 3. 판정 지시문 `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.md`

**(가) `## 학생 주장 분리 기록` 절**, `claimConflicts` 항목들 뒤에 아래 뜻의 항목을 더한다. 문체는 다듬어도 되지만 조건은 바꾸지 않는다.

> - keyRelationCoverage: 이 선지의 참·거짓을 가르는 관계를, 원문의 근거 사실에서 선지가 맞거나 틀리는 지점까지 조각(element)으로
>   나눠 적는다. 조각은 학생 근거와 상관없이 원문과 선지로 정한다. 마지막 판정("이 선지는 적절하지 않다") 자체는 조각으로 넣지 않는다.
> - 조각마다 그 내용을 말한 학생 발화가 있으면 covered=true와 그 부분의 정확한 quote를, 없으면 covered=false와 빈 observationId·quote를
>   쓴다. 표현이 달라도 뜻이 같으면 덮은 것이다. 선지의 결론을 바꿔 말한 발화는 원문 사실 조각을 덮지 않는다. 평가자가 원문에서 찾아
>   이은 연결은 덮은 것이 아니다.
> - 학생이 고른 선지가 정답이면, contentAssessment=SUPPORTED는 모든 조각이 covered일 때만 쓴다. 하나라도 covered=false이면
>   INSUFFICIENT이고 insufficiencyKind를 정한다. keyRelationCoverage는 contentAssessment를 정하기 전에 기록한다.

**(나) `### 내용 오류와 충분성`의 "평가자가 원문에서 올바른 관계를 찾아낼 수 있다는 사실은 …" 문장 뒤**에 한 문장:
> 정답 선택에서 이 판단은 `keyRelationCoverage`의 조각별 학생 인용으로 기록한다.

### 4. 시험

- `validateClaims` 시험: 정상(정답·SUPPORTED·모두 covered), 정답·SUPPORTED·빈 조각 거부, 오답·SUPPORTED·빈 조각 통과, 정답·INSUFFICIENT·빈
  조각 통과, covered인데 quote가 발화에 없음 거부, uncovered인데 quote가 있음 거부, 빈 배열 거부, 스키마 속성 순서(`claimConflicts` 다음,
  `reconstructability`·`contentAssessment`보다 앞).
- 평가기: `correctChoice`가 넘어가는지, 새 칸이 떼어지는지(기존 `rawOutput` 비교 시험 방식).
- `studentClaims`/`claimConflicts`를 담은 기존 SELECTION fixture에 `keyRelationCoverage`를 더한다. 정답·SUPPORTED fixture는 실제 학생 발화
  인용으로 모든 조각을 덮는다.
- 지시문 해시·문구 시험이 있으면 새 문구를 반영한다.

### 5. 반자동 사용자 시험 사례 `scripts/v5-supported-coverage-user-cases.mjs` (새 파일)

기존 사례 모듈과 같은 형식, `full: true`, replies 없음. 각 근거를 두 번씩(…a, …b). 실행하지 않는다.

| id | 문항·선택 | rationale | 기대 |
|---|---|---|---|
| M2a·b | `dopamine-motor-control-q13` `C2` | `카르비도파는 도파민 작용 기간을 늘리는 약이 아니라고 배웠어. 그래서 2번은 적절하지 않아.` | INSUFFICIENT + JUDGMENT_METHOD |
| L1a·b | 같음 | `카르비도파는 말초 조직에서만 작용함.` | INSUFFICIENT + MISSING_LINK |
| B1a·b | 같음 | `카르비도파는 뇌에 못 들어가.` | 경계 사례. 사용자 판정 |
| S1a·b | 같음 | `카르비도파는 혈액-뇌 장벽을 통과하지 못해 말초 조직에서만 작용하니까 흑질 도파민에는 영향을 못 줘. 그래서 2번은 적절하지 않아.` | SUPPORTED(대조) |
| U2a·b | `gongsun-long-later-mohists-q12` `C4` | `d는 그냥 옷이고 e는 빨간 옷이라서 둘이 가리키는 대상이 달라. 그러니 4번은 옳지 않아.` | SUPPORTED(대조) |
| K1a·b | `corporate-law-q13` `C2` | `갑이 자산을 운용할 수 있는 건 대표 이사로서 정관이나 법령으로 권한을 받았기 때문이지, 설립할 때 재산을 출연해서가 아니야. 그래서 2번은 적절하지 않아.` | SUPPORTED(대조, 다른 문항) |

- B1·K1은 Claude가 썼다. `cases.length === 12`와 id 중복 검사를 둔다.

## 완료 조건

- [ ] 확장 스키마에 `keyRelationCoverage`가 정해진 순서로 있고, 검증이 시험으로 확인된다.
- [ ] 평가기가 `correctChoice`를 넘기고 새 칸을 떼어 낸다.
- [ ] 지시문 (가)·(나) 반영.
- [ ] 기존 fixture가 새 스키마·검증을 통과한다.
- [ ] 새 사례 모듈이 12개를 내보낸다.
- [ ] `npm run build`, `npm run typecheck:client` 통과.
- [ ] `npm test`: 기존 실패 2개(`boundary.test.ts`, axis-architecture) 외 새 실패 없음.
- [ ] e2e: `PLAYWRIGHT_CLIENT_PORT=5383 CSAT_API_PORT=5384 npx --no-install playwright test packages/app/e2e/problem-feedback-v4-workbench.spec.ts`
      → 기존 실패 1개(`DevPartNav` "문제" 버튼 중복) 외 새 실패 없음.

## 중단·보고 조건

- 이 문서와 코드·시험·결정 기록이 충돌하거나 설계 판단이 필요하면 멈추고 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송 금지. `.env`를 열지 않는다.
- 커밋하지 않는다. `git stash`를 쓰지 않는다. 다른 세션 파일을 건드리지 않는다. `scripts/`의 `*.test.mjs` 모의 시험은 건드리지 않는다.

## 결과 보고 (실행 후 작성)


### 변경 파일
- `packages/pipeline/src/problem-solving/feedback-v5-claims.ts`: 확장 스키마에 `keyRelationCoverage`(`claimConflicts` 바로 뒤, minItems 1, required), `validateClaims(…, options = { correctChoice: false })`에 구조·quote·정답 SUPPORTED 전 조각 covered 검사, 머리 주석.
- `packages/pipeline/src/problem-solving/feedback-v4-evaluator.ts`: `correctChoice`(마지막 선택 == `answerChoiceId`) 전달, 후처리에서 `keyRelationCoverage` 제거.
- `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.md`: (가) `학생 주장 분리 기록`에 항목 3개, (나) "증거가 아니다." 뒤 한 문장.
- `packages/pipeline/src/problem-solving/feedback-v4.test.ts`: `withClaims`에 모두 covered인 `keyRelationCoverage`, 새 검증 시험 6종, 평가기 `correctChoice` 시험 2종, 지시문 복원 시험에 새 문구 2개 반영, 참조 스크립트 비교 시험에서 새 칸 제외.
- `scripts/v5-supported-coverage-user-cases.mjs`(새): 12개 사례(M2·L1·B1·S1·U2·K1 각 a·b), 실행하지 않음.

### 검증
- `npm run build`, `npm run typecheck:client`: 통과.
- `npm test`: 1342 통과, 2 실패(기존 `boundary.test.ts`, axis-architecture). 새 실패 없음.
- e2e: 12 통과, 1 실패(기존 `DevPartNav` "문제" 버튼 중복). 새 실패 없음.

### 남은 문제·메모
- 설계 충돌·공백 없음. 해시 시험은 없고, 지시문 복원 시험(`assessment instructions change only …`)에 새 문구를 더했다.
- 정답 선택 SUPPORTED 판정은 실모델 시험(12세션)으로만 효과를 확인할 수 있다. 실행하지 않았다.
- 커밋하지 않았다.

### 실모델 시험 뒤 보강 (Claude 직접, 사용자 승인)

- 2차: 정답·SUPPORTED는 조각 2개 이상·서로 다른 조각의 인용이 겹치지 않음(`validateClaims`), 원문 밖 출처·결론 되풀이는 JUDGMENT_METHOD(지시문).
- 3차: 조각은 판정에 꼭 필요한 것만, 해설에 있어도 판정에 필요 없으면 넣지 않음(지시문).
- 판정 기록: `docs/experiments/v5-supported-coverage{,-r2,-r3}-user-2026-10-21/REVIEW.md`.
