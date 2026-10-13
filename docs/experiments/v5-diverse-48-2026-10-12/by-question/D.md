# 도파민의 합성, 수용체, 수의적 운동 조절 13번 — 8개 세션

발문: 윗글을 바탕으로 <보기>를 이해한 내용으로 적절하지 않은 것은?

정답: 2번

## D-CT — 2번 선택

구성 의도: 정답·소재만 언급; 질문이 생기면 내용 없는 답으로 종료

실제 상태: **UNVERIFIED_CORRECT**

[원자료 JSON](cases/D-CT.json) · [세션 원장](cases/D-CT.records.jsonl)

의미 검토: **PASS** — 정답 번호와 관련 소재·사실만 제시했지만 선택 선지를 가르는 판단 관계는 확인되지 않는다. SUPPORTED로 보충하지 않고 UNVERIFIED_CORRECT로 종료한 것이 응답과 부합한다.

결과:

```json
{
  "outcome": "UNVERIFIED_CORRECT",
  "selectedChoiceId": "C2",
  "choiceCorrect": true,
  "selectionCount": 1,
  "rationaleVerified": false,
  "correctionSucceeded": false,
  "answerRevealed": false,
  "resolvedByStudent": true,
  "answer": null
}
```

### 실제 대화

**피드백** (AWAITING_SELECTION)

선지와 판단 근거를 제출하세요. 명시적으로 근거 없이 답만 제출할 수도 있습니다.

**학생** (AWAITING_SELECTION)

2번 선택
②요. 카르비도파가 나와서요.

**피드백** (COMPLETED)

정답입니다. 다만 근거는 검증되지 않았습니다.

### 판정 기록

**SELECTION** — UNKNOWN / UNKNOWN

학생은 “②요. 카르비도파가 나와서요.”라고 했습니다. ②는 카르비도파에 관한 선지이지만, 이 말만으로는 해당 선지를 참으로 본 것인지 거짓으로 본 것인지, 또는 어떤 근거로 판단했는지 확인할 수 없습니다. 따라서 전체 판단을 재구성할 수 없습니다.

### 제출·재시도 이력

- o1: SELECT → AWAITING_EVALUATION, 11ms — Frozen initial response
  - SELECTION: ERROR, gpt-6-luna — Error: Connection error.
- o2: RESUME → COMPLETED, 10810ms — Resume the same submission after network failure; no new student answer
  - SELECTION: SUCCESS, gpt-6-luna

## D-CP — 2번 선택

구성 의도: 정답·관련 사실만 언급; 질문이 생기면 국소 보완 후 설명 요청

실제 상태: **UNVERIFIED_CORRECT**

[원자료 JSON](cases/D-CP.json) · [세션 원장](cases/D-CP.records.jsonl)

의미 검토: **PASS** — 정답 번호와 관련 소재·사실만 제시했지만 선택 선지를 가르는 판단 관계는 확인되지 않는다. SUPPORTED로 보충하지 않고 UNVERIFIED_CORRECT로 종료한 것이 응답과 부합한다.

결과:

```json
{
  "outcome": "UNVERIFIED_CORRECT",
  "selectedChoiceId": "C2",
  "choiceCorrect": true,
  "selectionCount": 1,
  "rationaleVerified": false,
  "correctionSucceeded": false,
  "answerRevealed": false,
  "resolvedByStudent": true,
  "answer": null
}
```

### 실제 대화

**피드백** (AWAITING_SELECTION)

선지와 판단 근거를 제출하세요. 명시적으로 근거 없이 답만 제출할 수도 있습니다.

**학생** (AWAITING_SELECTION)

2번 선택
②가 답 같아요. 카르비도파는 레보도파가 도파민으로 바뀌는 효소를 억제해요.

**피드백** (COMPLETED)

정답입니다. 다만 근거는 검증되지 않았습니다.

### 판정 기록

**SELECTION** — UNKNOWN / UNKNOWN

학생은 "②가 답 같아요."라고 선택을 밝히고, "카르비도파는 레보도파가 도파민으로 바뀌는 효소를 억제해요."라고 덧붙였습니다. 뒤의 내용은 시나리오와 일치하지만, 카르비도파가 말초 조직에서만 작용한다는 점이나 이 작용이 흑질에서 이미 합성된 도파민의 작용 기간을 연장하는지에 대한 판단은 드러나지 않습니다. 따라서 ②를 부적절하다고 본 근거의 결론을 확인할 수 없습니다.

### 제출·재시도 이력

- o1: SELECT → AWAITING_EVALUATION, 13ms — Frozen initial response
  - SELECTION: ERROR, gpt-6-luna — Error: Connection error.
- o2: RESUME → COMPLETED, 14665ms — Resume the same submission after network failure; no new student answer
  - SELECTION: SUCCESS, gpt-6-luna

## D-A1 — 1번 선택

구성 의도: 오답 A·낮음·막연한 근거; 질문에도 확인 불가

실제 상태: **COACHING_TERMINATED**

[원자료 JSON](cases/D-A1.json) · [세션 원장](cases/D-A1.records.jsonl)

의미 검토: **PASS** — 막연한 근거에서 구체적 오류를 역산하지 않고 확인 불가로 종료했다. 종료 설명은 학생이 밝히지 않은 생각을 학생의 오류로 귀속하지 않으며 고른 선지와 정답을 구분했다.

결과:

```json
{
  "outcome": "COACHING_TERMINATED",
  "selectedChoiceId": "C1",
  "choiceCorrect": false,
  "selectionCount": 1,
  "rationaleVerified": false,
  "correctionSucceeded": false,
  "answerRevealed": true,
  "resolvedByStudent": false,
  "answer": {
    "choiceId": "C2",
    "position": 2,
    "text": "(나)는 효소의 작용을 억제하여 흑질에서 합성된 도파민의 작용 기간을 연장할 수 있겠군."
  }
}
```

### 실제 대화

**피드백** (AWAITING_SELECTION)

선지와 판단 근거를 제출하세요. 명시적으로 근거 없이 답만 제출할 수도 있습니다.

**학생** (AWAITING_SELECTION)

1번 선택
①이 틀린 것 같아요. 장벽을 통과한다는 부분이 좀 이상해요.

**피드백** (COMPLETED)

이 문제는 적절하지 않은 설명을 고르는 문제이므로 정답은 ②예요. 핵심은 카르비도파가 ‘어디에서’, ‘어떤 효소에’ 작용하는지 구분하는 거예요.

<보기>에 따르면 카르비도파는 혈액-뇌 장벽을 통과하지 못해 말초 조직에서만 작용하고, 레보도파를 도파민으로 바꾸는 효소를 억제해요. 따라서 뇌의 흑질에서 이미 합성된 도파민의 작용 기간을 연장하는 약물이 아니에요. 도파민을 만드는 효소를 억제하는 것과 이미 만들어진 도파민의 분해를 막는 것은 다른 작용이에요. 그래서 ②가 적절하지 않아요.

마지막으로 고른 ①은 원문과 <보기>에 부합하는 설명이라 답이 아니에요. 원문에서 혈액-뇌 장벽을 통과하지 못한다고 한 물질은 도파민이에요. 반면 <보기>의 레보도파는 흑질의 도파민성 뉴런으로 흡수되어 도파민 합성을 증가시킨다고 했으므로, 뇌로 들어갈 수 있음을 알 수 있어요. 즉, 도파민과 그 재료인 레보도파는 장벽 통과 여부가 달라요. 레보도파가 뇌에 도달하기 전에 말초 조직에서 도파민으로 바뀌면 뇌로 들어가지 못하므로, 카르비도파를 함께 투여해 이 전환을 억제하는 거예요.

### 판정 기록

**SELECTION** — INSUFFICIENT / INVALID

학생은 "①이 틀린 것 같아요."라고 판단하고, "장벽을 통과한다는 부분이 좀 이상해요."라고 판단 대상을 밝혔으므로 선택한 선지를 거짓으로 보는 결론은 재구성할 수 있다. 그러나 장벽 통과가 왜 부적절한지에 관한 사실이나 관계는 제시하지 않았다. 레보도파가 장벽을 통과하지 못한다고 명시한 것도 아니므로 내용 오류로 단정하지 않고 근거 부족으로 판정한다. 학생 근거의 결론은 선택이 뜻하는 INVALID와 일치한다.

학생 판단 재구성:

- 학생은 "장벽을 통과한다는 부분이 좀 이상해요."라고 의문을 표시했다.
- 학생은 "①이 틀린 것 같아요."라고 결론을 밝혔다.
- 학생 관점의 결론: 선택한 선지는 거짓이다.

### 제출·재시도 이력

- o1: SELECT → AWAITING_EVALUATION, 12ms — Frozen initial response
  - SELECTION: ERROR, gpt-6.1-sol — Error: Connection error.
- o2: RESUME → COMPLETED, 28197ms — Resume the same submission after network failure; no new student answer
  - SELECTION: SUCCESS, gpt-6.1-sol
  - END_EXPLANATION: SUCCESS, gpt-6.1-sol

## D-A2 — 1번 선택

구성 의도: 오답 A·중간·명시적 오류; 국소 수정 후 정답·충분 근거 재선택

실제 상태: **VERIFIED_CORRECT**

[원자료 JSON](cases/D-A2.json) · [세션 원장](cases/D-A2.records.jsonl)

의미 검토: **CONCERN** — 레보도파의 장벽 통과 여부를 바로잡은 국소 수정은 인정했다. 그러나 REPAIR의 reason과 rationaleSufficient=false는 선택한 선지가 부적절하다는 판단을 뒷받침하지 않는다는 이유로, 옛 오답 선택을 충분성 기준으로 다시 사용하는 것으로 보인다. 국소 수정 후 재선택 흐름은 막지 않았다.

결과:

```json
{
  "outcome": "VERIFIED_CORRECT",
  "selectedChoiceId": "C2",
  "choiceCorrect": true,
  "selectionCount": 2,
  "rationaleVerified": true,
  "correctionSucceeded": true,
  "answerRevealed": false,
  "resolvedByStudent": true,
  "answer": null
}
```

### 실제 대화

**피드백** (AWAITING_SELECTION)

선지와 판단 근거를 제출하세요. 명시적으로 근거 없이 답만 제출할 수도 있습니다.

**학생** (AWAITING_SELECTION)

1번 선택
①이 틀려요. 레보도파도 도파민처럼 혈액-뇌 장벽을 못 지나가니까 뇌로 들어갈 수 없어요.

**피드백** (AWAITING_CORRECTION)

"레보도파도 도파민처럼 혈액-뇌 장벽을 못 지나가니까 뇌로 들어갈 수 없어요."라고 했는데, <보기>에서 입으로 투여한 레보도파가 흑질의 도파민성 뉴런으로 흡수된다는 설명을 보면 레보도파의 혈액-뇌 장벽 통과 여부를 어떻게 판단해야 할까요?

**학생** (AWAITING_CORRECTION)

레보도파는 혈액-뇌 장벽을 통과할 수 있어요.

**피드백** (AWAITING_POST_REPAIR_CHOICE)

핵심 오류를 잘 고쳤어요. 처음에 ①를 고르게 된 생각 중 어디가 잘못됐는지 알 것 같다면 다시 선택해 볼까요?

**학생** (AWAITING_POST_REPAIR_CHOICE)

다시 선택

**피드백** (AWAITING_RESELECTION)

확인된 오류의 수정이 확인됐습니다. 선지와 근거를 마지막으로 한 번 제출하세요.

**학생** (AWAITING_RESELECTION)

2번 선택
②가 적절하지 않아요. 카르비도파는 장벽을 통과하지 못하고 말초에서 레보도파의 전환을 막아요. 흑질에서 이미 합성된 도파민의 작용 기간을 늘리는 약물이라고 할 수 없어요.

**피드백** (COMPLETED)

정답과 근거가 확인됐습니다.

### 판정 기록

**SELECTION** — ERROR / INVALID

학생은 "레보도파도 도파민처럼 혈액-뇌 장벽을 못 지나가니까 뇌로 들어갈 수 없어요."를 근거로 "①이 틀려요."라고 판단했다. 선지를 거짓으로 보는 경로는 명확하며 선택의 의미와도 일치한다. 그러나 <보기>에서는 경구 투여된 레보도파가 흑질의 도파민성 뉴런으로 흡수된다고 설명하므로, 레보도파가 뇌로 들어갈 수 없다는 주장은 원문과 충돌한다.

학생 판단 재구성:

- 학생이 밝힌 전제는 "레보도파도 도파민처럼 혈액-뇌 장벽을 못 지나가니까 뇌로 들어갈 수 없어요."이다.
- 이를 근거로 학생은 "①이 틀려요."라고 판단했다.
- 학생 관점의 파생 결론: 선택한 선지는 거짓이다(INVALID).

**REPAIR** —  / 

이번 답변에서 학생은 "레보도파는 혈액-뇌 장벽을 통과할 수 있어요."라고 밝혀, 기존 오류인 레보도파의 혈액-뇌 장벽 통과 여부를 바로잡았습니다. 다만 이 수정만으로는 선택한 선지가 부적절하다는 판단을 뒷받침하는 근거가 확인되지 않습니다.

```json
{
  "repairs": [
    {
      "errorId": "E1",
      "status": "REPAIRED"
    }
  ],
  "verificationComplete": true,
  "rationaleSufficient": false,
  "newErrors": []
}
```

**SELECTION** — SUPPORTED / INVALID

학생은 "②가 적절하지 않아요"라고 판단했고, "카르비도파는 장벽을 통과하지 못하고 말초에서 레보도파의 전환을 막아요"라고 근거를 들었습니다. 이어 "흑질에서 이미 합성된 도파민의 작용 기간을 늘리는 약물이라고 할 수 없어요"라고 선지의 주장을 부정했습니다. 지문과 보기에서 카르비도파는 혈액-뇌 장벽을 통과하지 못하고 말초 조직에서 작용한다고 하므로, 학생의 근거와 C2를 거짓으로 보는 결론은 원문에 부합하며 선택 목표와도 일치합니다.

학생 판단 재구성:

- 학생은 "카르비도파는 장벽을 통과하지 못하고 말초에서 레보도파의 전환을 막아요"라고 근거를 제시했다.
- 학생은 "흑질에서 이미 합성된 도파민의 작용 기간을 늘리는 약물이라고 할 수 없어요"라고 판단했다.
- 따라서 학생 관점에서 C2는 거짓이다(INVALID).

### 제출·재시도 이력

- o1: SELECT → AWAITING_EVALUATION, 16ms — Frozen initial response
  - SELECTION: ERROR, gpt-6.1-sol — Error: Connection error.
- o2: RESUME → AWAITING_CORRECTION, 27728ms — Resume the same submission after network failure; no new student answer
  - SELECTION: SUCCESS, gpt-6.1-sol
- o3: CORRECT → AWAITING_POST_REPAIR_CHOICE, 9113ms — Actual question asks levodopa crossing the barrier; correct only that target, preserving A3 separate oral-dopamine error for the later question.
  - REPAIR: SUCCESS, gpt-6-luna
- o4: RESELECT → AWAITING_RESELECTION, 1ms — Frozen behavior: choose reselection after local repair; next choice is separately authored.
- o5: SELECT → COMPLETED, 13863ms — Frozen behavior: after local correction, independently select the correct option with explicit sufficient source-based rationale.
  - SELECTION: SUCCESS, gpt-6-luna

## D-A3 — 1번 선택

구성 의도: 오답 A·높음·복합 오류; 첫 오류 수정·다음 오류 유지

실제 상태: **COACHING_TERMINATED**

[원자료 JSON](cases/D-A3.json) · [세션 원장](cases/D-A3.records.jsonl)

의미 검토: **PASS** — 첫 국소 오류의 수정은 유지했고, 나중 답변에서 재확인한 나머지 오류는 남겨 REPAIR_FAILED 코칭으로 종료했다. 종료 설명도 고친 부분과 남은 부분을 나누었다.

결과:

```json
{
  "outcome": "COACHING_TERMINATED",
  "selectedChoiceId": "C1",
  "choiceCorrect": false,
  "selectionCount": 1,
  "rationaleVerified": false,
  "correctionSucceeded": false,
  "answerRevealed": true,
  "resolvedByStudent": false,
  "answer": {
    "choiceId": "C2",
    "position": 2,
    "text": "(나)는 효소의 작용을 억제하여 흑질에서 합성된 도파민의 작용 기간을 연장할 수 있겠군."
  }
}
```

### 실제 대화

**피드백** (AWAITING_SELECTION)

선지와 판단 근거를 제출하세요. 명시적으로 근거 없이 답만 제출할 수도 있습니다.

**학생** (AWAITING_SELECTION)

1번 선택
①이 틀려요. 레보도파도 장벽을 못 통과하고, 입으로 먹은 도파민이 대신 뇌로 들어가서 운동을 돕는다고 생각해요.

**피드백** (AWAITING_CORRECTION)

"레보도파도 장벽을 못 통과하고"라고 했는데, 입으로 투여된 레보도파가 뇌의 흑질 뉴런으로 흡수된다는 보기의 설명을 고려하면 레보도파의 혈액-뇌 장벽 통과 가능성을 어떻게 판단해야 할까요?

**학생** (AWAITING_CORRECTION)

레보도파는 혈액-뇌 장벽을 통과할 수 있어요.

**피드백** (AWAITING_CORRECTION)

"입으로 먹은 도파민이 대신 뇌로 들어가서 운동을 돕는다고 생각해요."라고 했는데, 지문의 첫 문단에 따르면 입으로 섭취한 도파민은 혈액-뇌 장벽을 통과하여 뇌로 들어갈 수 있나요?

**학생** (AWAITING_CORRECTION)

입으로 먹은 도파민도 혈액-뇌 장벽을 통과할 수 있어요.

**피드백** (COMPLETED)

처음에 “레보도파도 장벽을 못 통과하고”라고 생각했지만, 이후 “레보도파는 혈액-뇌 장벽을 통과할 수 있어요.”라고 바르게 고쳤어요. 다만 처음 말한 “입으로 먹은 도파민이 대신 뇌로 들어가서 운동을 돕는다고 생각해요.”는 원문과 달라요. 지문 첫 문단에서는 음식이나 약물로 섭취한 도파민은 혈액-뇌 장벽을 통과할 수 없다고 명확히 설명해요.

핵심은 레보도파와 도파민을 구별하는 거예요. 레보도파는 뇌로 들어가 흑질의 도파민성 뉴런에 흡수된 뒤 도파민으로 합성될 수 있어요. 반면 뇌 밖에서 이미 도파민으로 바뀌면 혈액-뇌 장벽을 통과하지 못해요.

따라서 적절하지 않은 선지는 ②예요. 카르비도파는 혈액-뇌 장벽을 통과하지 못해 말초 조직에서만 작용하며, 레보도파를 도파민으로 바꾸는 효소의 작용을 억제해요. 즉, 뇌에 도달하기 전에 레보도파가 도파민으로 바뀌는 것을 막는 약이지, 흑질에서 이미 합성된 도파민의 작용 기간을 늘리는 약은 아니에요.

마지막으로 고른 ①은 원문과 보기에 맞는 설명이므로 답이 아니에요. 보기에서 입으로 투여한 레보도파가 뇌의 흑질 뉴런으로 흡수된다고 했으므로, 레보도파는 도파민과 달리 혈액-뇌 장벽을 통과할 수 있다고 판단해야 해요.

### 판정 기록

**SELECTION** — ERROR / INVALID

학생은 "①이 틀려요."라고 판단하면서 "레보도파도 장벽을 못 통과하고"와 "입으로 먹은 도파민이 대신 뇌로 들어가서 운동을 돕는다고 생각해요."를 근거로 제시했다. 선지를 거짓으로 보는 판단 경로는 재구성 가능하며 선택 의미와도 일치한다. 그러나 보기의 경구 투여된 레보도파가 흑질의 뉴런으로 흡수된다는 설명과 지문의 체내로 유입된 도파민은 혈액-뇌 장벽을 통과할 수 없다는 설명에 각각 어긋나므로 내용 오류가 있다.

학생 판단 재구성:

- 학생은 "레보도파도 장벽을 못 통과하고"라고 판단했다.
- 학생은 "입으로 먹은 도파민이 대신 뇌로 들어가서 운동을 돕는다고 생각해요."라고 설명했다.
- 이 근거에 따른 학생 관점의 결론은 "①이 틀려요."이며, 선택한 선지를 거짓으로 보는 판단이다.

**REPAIR** —  / 

이번 답변에서 학생은 "레보도파는 혈액-뇌 장벽을 통과할 수 있어요."라고 답해 E1의 잘못된 판단을 바로잡았다. 그러나 E2의 근거였던 "입으로 먹은 도파민이 대신 뇌로 들어가서 운동을 돕는다고 생각해요."는 이번 답변에서 다루지 않아 그 오류의 수정 여부는 확인할 수 없다. 지문은 섭취한 도파민이 혈액-뇌 장벽을 통과할 수 없다고 설명하므로, 현재 누적된 근거만으로는 전체 근거가 충분하다고 볼 수 없다.

```json
{
  "repairs": [
    {
      "errorId": "E1",
      "status": "REPAIRED"
    },
    {
      "errorId": "E2",
      "status": "UNCONFIRMED"
    }
  ],
  "verificationComplete": false,
  "rationaleSufficient": false,
  "newErrors": []
}
```

**REPAIR** —  / 

이번 답변에서 학생은 "입으로 먹은 도파민도 혈액-뇌 장벽을 통과할 수 있어요."라고 하여 E2의 잘못된 판단을 다시 명시했습니다. 지문은 음식이나 약물로 체내에 유입된 도파민은 혈액-뇌 장벽을 통과할 수 없다고 설명하므로 E2는 남아 있습니다. 앞서 학생이 "레보도파는 혈액-뇌 장벽을 통과할 수 있어요."라고 답해 E1은 수정되었습니다. E2가 남아 있으므로 전체 근거는 충분하지 않습니다.

```json
{
  "repairs": [
    {
      "errorId": "E1",
      "status": "REPAIRED"
    },
    {
      "errorId": "E2",
      "status": "REMAINING"
    }
  ],
  "verificationComplete": true,
  "rationaleSufficient": false,
  "newErrors": []
}
```

### 제출·재시도 이력

- o1: SELECT → AWAITING_EVALUATION, 10ms — Frozen initial response
  - SELECTION: ERROR, gpt-6.1-sol — Error: Connection error.
- o2: RESUME → AWAITING_CORRECTION, 29847ms — Resume the same submission after network failure; no new student answer
  - SELECTION: SUCCESS, gpt-6.1-sol
- o3: CORRECT → AWAITING_CORRECTION, 16298ms — Actual question asks levodopa crossing the barrier; correct only that target, preserving A3 separate oral-dopamine error for the later question.
  - REPAIR: SUCCESS, gpt-6-luna
- o4: CORRECT → COMPLETED, 14432ms — Actual second question read; preserve this originally stated error after correcting the first one.
  - REPAIR: SUCCESS, gpt-6-luna
  - END_EXPLANATION: SUCCESS, gpt-6.1-sol

## D-B1 — 4번 선택

구성 의도: 오답 B·낮음·근거 미제출을 유지

실제 상태: **COACHING_TERMINATED**

[원자료 JSON](cases/D-B1.json) · [세션 원장](cases/D-B1.records.jsonl)

의미 검토: **PASS** — 근거 미제출을 학생의 내용 오류로 만들어 내지 않고 코칭으로 종료했다. 마지막 오답 선지가 왜 답이 아닌지와 정답 관계를 원문에 근거해 설명했다.

결과:

```json
{
  "outcome": "COACHING_TERMINATED",
  "selectedChoiceId": "C4",
  "choiceCorrect": false,
  "selectionCount": 1,
  "rationaleVerified": false,
  "correctionSucceeded": false,
  "answerRevealed": true,
  "resolvedByStudent": false,
  "answer": {
    "choiceId": "C2",
    "position": 2,
    "text": "(나)는 효소의 작용을 억제하여 흑질에서 합성된 도파민의 작용 기간을 연장할 수 있겠군."
  }
}
```

### 실제 대화

**피드백** (AWAITING_SELECTION)

선지와 판단 근거를 제출하세요. 명시적으로 근거 없이 답만 제출할 수도 있습니다.

**학생** (AWAITING_SELECTION)

4번 선택
근거 미제출

**피드백** (AWAITING_RATIONALE)

오답입니다. 근거 없는 오답은 감점 대상입니다(개발 버전에서는 실제 차감하지 않습니다). 판단 근거를 제출하거나 근거 미제출을 선택하세요.

**학생** (AWAITING_RATIONALE)

근거 미제출

**피드백** (COMPLETED)

이 문제는 적절하지 않은 설명을 찾는 문제이므로 정답은 ②예요. 핵심은 카르비도파가 ‘어디에서’, ‘어떤 효소’를 억제하는지 구분하는 거예요.

<보기>에 따르면 카르비도파는 혈액-뇌 장벽을 통과하지 못해 말초 조직에서만 작용해요. 또 억제하는 대상은 레보도파를 도파민으로 합성하는 효소이지, 도파민을 분해하는 효소가 아니에요. 따라서 카르비도파가 흑질에서 이미 합성된 도파민의 작용 기간을 연장한다는 ②의 설명은 적절하지 않아요.

마지막으로 고른 ④는 원문에 맞는 설명이어서 정답이 아니에요. 레보도파는 흑질의 도파민성 뉴런에 흡수되어 도파민 합성을 늘리지만, 투여된 상당량은 뇌에 도착하기 전에 말초 조직에서 도파민으로 바뀌어요. 그런데 도파민은 혈액-뇌 장벽을 통과하지 못해요. 카르비도파를 함께 투여하면 말초 조직에서 레보도파가 도파민으로 바뀌는 것을 억제하므로, 레보도파 상태로 뇌에 전달되는 양이 증가해요. 즉, 카르비도파는 ‘뇌 속 도파민을 오래 작용하게 하는 약’이 아니라 ‘레보도파가 뇌에 도달하기 전에 도파민으로 바뀌는 것을 막는 약’으로 이해하면 돼요.

### 판정 기록

### 제출·재시도 이력

- o1: SELECT → AWAITING_RATIONALE, 1ms — Frozen initial response
- o2: RATIONALE → COMPLETED, 6790ms — Keep omitted rationale as frozen B1 behavior
  - END_EXPLANATION: SUCCESS, gpt-6.1-sol

## D-B2 — 4번 선택

구성 의도: 오답 B·중간·명시적 오류; 짧게 국소 수정 후 코칭 요청

실제 상태: **COACHING_TERMINATED**

[원자료 JSON](cases/D-B2.json) · [세션 원장](cases/D-B2.records.jsonl)

의미 검토: **CONCERN** — 국소 오류 두 개의 수정과 마지막 선지 설명은 원문 및 실제 답변과 부합한다. 그러나 공개 종료 코칭의 “학생이 고친 답변”은 학생을 3인칭으로 부르지 말라는 지시를 위반한다. 내용 오류와 분리한 형식 문제다.

결과:

```json
{
  "outcome": "COACHING_TERMINATED",
  "selectedChoiceId": "C4",
  "choiceCorrect": false,
  "selectionCount": 1,
  "rationaleVerified": false,
  "correctionSucceeded": true,
  "answerRevealed": true,
  "resolvedByStudent": false,
  "answer": {
    "choiceId": "C2",
    "position": 2,
    "text": "(나)는 효소의 작용을 억제하여 흑질에서 합성된 도파민의 작용 기간을 연장할 수 있겠군."
  }
}
```

### 실제 대화

**피드백** (AWAITING_SELECTION)

선지와 판단 근거를 제출하세요. 명시적으로 근거 없이 답만 제출할 수도 있습니다.

**학생** (AWAITING_SELECTION)

4번 선택
④는 틀려요. 카르비도파가 뇌 안에서 도파민 합성을 막으니 뇌로 가는 레보도파도 줄어들어요.

**피드백** (AWAITING_CORRECTION)

"카르비도파가 뇌 안에서 도파민 합성을 막으니"라고 했는데, 보기의 혈액-뇌 장벽 통과 여부에 따르면 카르비도파가 효소의 작용을 억제하는 곳은 어디인가요?

**학생** (AWAITING_CORRECTION)

말초 조직이요.

**피드백** (AWAITING_CORRECTION)

"뇌로 가는 레보도파도 줄어들어요."라고 했는데, 말초 조직에서 레보도파가 도파민으로 바뀌는 것을 억제하면 뇌로 전달될 레보도파의 양은 어떻게 달라질까요?

**학생** (AWAITING_CORRECTION)

뇌로 전달되는 레보도파의 양은 늘어나요.

**피드백** (AWAITING_POST_REPAIR_CHOICE)

핵심 오류를 잘 고쳤어요. 처음에 ④를 고르게 된 생각 중 어디가 잘못됐는지 알 것 같다면 다시 선택해 볼까요?

**학생** (AWAITING_POST_REPAIR_CHOICE)

코칭 보기

**피드백** (COMPLETED)

처음에 “카르비도파가 뇌 안에서 도파민 합성을 막으니”라고 한 부분과 “뇌로 가는 레보도파도 줄어들어요.”라고 한 부분이 잘못됐어요. 다만 이후에 “말초 조직이요.”, “뇌로 전달되는 레보도파의 양은 늘어나요.”라고 답하면서 두 부분 모두 바르게 고쳤어요.

보기에서 카르비도파는 혈액-뇌 장벽을 통과하지 못하고 말초 조직에서만 작용한다고 했어요. 따라서 뇌 안의 도파민 합성을 막는 것이 아니라, 뇌에 도달하기 전 말초 조직에서 레보도파가 도파민으로 바뀌는 것을 억제해요. 도파민은 혈액-뇌 장벽을 통과하지 못하지만 레보도파는 뇌로 들어갈 수 있으므로, 말초 조직에서 도파민으로 바뀌지 않고 남은 레보도파가 많아지면 뇌로 전달되는 레보도파의 양도 늘어나요.

정답은 ②예요. 카르비도파가 억제하는 것은 레보도파를 도파민으로 바꾸는 효소이지, 이미 합성된 도파민을 분해하는 효소가 아니에요. 게다가 카르비도파는 뇌 안으로 들어가지 못하므로, 흑질에서 합성된 도파민의 작용 기간을 연장한다는 ②의 설명은 적절하지 않아요.

마지막으로 고른 ④는 정답이 아니에요. 카르비도파를 레보도파와 함께 투여하면 말초 조직에서 레보도파가 도파민으로 바뀌는 것이 억제되어 뇌로 전달되는 레보도파의 양이 늘어난다는 설명은 보기와 맞아요. 학생이 고친 답변도 바로 이 내용을 뒷받침해요. 이 문제는 ‘적절하지 않은 것’을 고르는 문제이므로, 맞는 설명인 ④가 아니라 틀린 설명인 ②를 골라야 해요.

### 판정 기록

**SELECTION** — ERROR / INVALID

학생은 "④는 틀려요."라고 판단하고, "카르비도파가 뇌 안에서 도파민 합성을 막으니"와 "뇌로 가는 레보도파도 줄어들어요."를 근거로 제시했다. 판단 경로와 선지를 거짓으로 보는 결론은 확인된다. 그러나 카르비도파는 말초 조직에서만 작용하며, 말초에서 레보도파가 도파민으로 전환되는 것을 억제하면 뇌로 전달되는 레보도파의 양은 증가한다. 두 근거 모두 원문과 충돌하므로 내용 오류로 판정한다. 학생 근거의 결론은 선택이 뜻하는 INVALID와 일치한다.

학생 판단 재구성:

- 학생은 "카르비도파가 뇌 안에서 도파민 합성을 막으니"라고 작용 위치와 작용을 판단했다.
- 이를 근거로 "뇌로 가는 레보도파도 줄어들어요."라고 판단했다.
- 학생 관점의 결론: "④는 틀려요."에 따라 선택 선지를 거짓으로 판단한다.

**REPAIR** —  / 

이번 답변은 E1을 묻는 질문에 대한 실제 학생 답변으로, “말초 조직이요.”라고 답해 카르비도파가 작용하는 장소를 바로잡았습니다. E2에 해당하는 레보도파 양의 변화에 대해서는 이번 답변에서 판단을 확인할 수 없습니다. 처음 근거의 “뇌로 가는 레보도파도 줄어들어요.”는 말초에서 레보도파의 전환을 억제하면 뇌로 전달될 레보도파가 늘어난다는 보기의 설명과 어긋나지만, 이번에 그 판단을 반복하거나 수정하지는 않았습니다.

```json
{
  "repairs": [
    {
      "errorId": "E1",
      "status": "REPAIRED"
    },
    {
      "errorId": "E2",
      "status": "UNCONFIRMED"
    }
  ],
  "verificationComplete": false,
  "rationaleSufficient": false,
  "newErrors": []
}
```

**REPAIR** —  / 

이번 실제 답변에서 학생은 “뇌로 전달되는 레보도파의 양은 늘어나요.”라고 답해 E2의 양 변화 방향을 바로잡았습니다. 앞서 “말초 조직이요.”라고 답해 E1의 작용 장소도 바로잡았으므로 두 오류 모두 수정되었습니다. 보기에서는 카르비도파가 말초 조직에서 레보도파의 도파민 전환을 억제한다고 설명하며, 그 결과 뇌로 전달되는 레보도파의 양이 늘어납니다. 누적된 수정 답변은 이 판단을 뒷받침하기에 충분합니다.

```json
{
  "repairs": [
    {
      "errorId": "E1",
      "status": "REPAIRED"
    },
    {
      "errorId": "E2",
      "status": "REPAIRED"
    }
  ],
  "verificationComplete": true,
  "rationaleSufficient": true,
  "newErrors": []
}
```

### 제출·재시도 이력

- o1: SELECT → AWAITING_EVALUATION, 12ms — Frozen initial response
  - SELECTION: ERROR, gpt-6.1-sol — Error: Connection error.
- o2: RESUME → AWAITING_CORRECTION, 26926ms — Resume the same submission after network failure; no new student answer
  - SELECTION: SUCCESS, gpt-6.1-sol
- o3: CORRECT → AWAITING_CORRECTION, 15618ms — Actual question asks carbidopa action location; minimal correct slot answer, not a global correction.
  - REPAIR: SUCCESS, gpt-6-luna
- o4: CORRECT → AWAITING_POST_REPAIR_CHOICE, 7507ms — Actual second question read; give a short correct answer to the remaining local error.
  - REPAIR: SUCCESS, gpt-6-luna
- o5: REQUEST_EXPLANATION → COMPLETED, 7863ms — Frozen B2 behavior: all actual local questions answered; request coaching rather than reselect.
  - END_EXPLANATION: SUCCESS, gpt-6.1-sol

## D-B3 — 4번 선택

구성 의도: 오답 B·높음·옳은 내용 판단과 선택 행동 충돌; 인정 후 다시 오답 선택

실제 상태: **COACHING_TERMINATED**

[원자료 JSON](cases/D-B3.json) · [세션 원장](cases/D-B3.records.jsonl)

의미 검토: **PASS** — 처음의 올바른 내용 판단과 선택 실행 오류를 구별했다. 불일치를 인정한 뒤 다른 오답과 새 오류 근거를 제출하자 RESELECTION_WRONG으로 끝냈고, 앞선 국소 수정을 최종 회복으로 집계하지 않았다.

결과:

```json
{
  "outcome": "COACHING_TERMINATED",
  "selectedChoiceId": "C1",
  "choiceCorrect": false,
  "selectionCount": 2,
  "rationaleVerified": false,
  "correctionSucceeded": true,
  "answerRevealed": true,
  "resolvedByStudent": false,
  "answer": {
    "choiceId": "C2",
    "position": 2,
    "text": "(나)는 효소의 작용을 억제하여 흑질에서 합성된 도파민의 작용 기간을 연장할 수 있겠군."
  }
}
```

### 실제 대화

**피드백** (AWAITING_SELECTION)

선지와 판단 근거를 제출하세요. 명시적으로 근거 없이 답만 제출할 수도 있습니다.

**학생** (AWAITING_SELECTION)

4번 선택
④는 맞아요. 말초의 전환을 막으면 뇌에 전달되는 레보도파가 늘어요. 그래서 맞는 ④를 답으로 골랐어요.

**피드백** (AWAITING_CORRECTION)

"④는 맞아요."라고 판단했는데, 이 문항은 적절하지 않은 내용을 고르는 문제입니다. "그래서 맞는 ④를 답으로 골랐어요."라는 선택은 이 판단과 문항의 요구에 부합하나요?

**학생** (AWAITING_CORRECTION)

아니요.

**피드백** (AWAITING_POST_REPAIR_CHOICE)

핵심 오류를 잘 고쳤어요. 처음에 ④를 고르게 된 생각 중 어디가 잘못됐는지 알 것 같다면 다시 선택해 볼까요?

**학생** (AWAITING_POST_REPAIR_CHOICE)

다시 선택

**피드백** (AWAITING_RESELECTION)

확인된 오류의 수정이 확인됐습니다. 선지와 근거를 마지막으로 한 번 제출하세요.

**학생** (AWAITING_RESELECTION)

1번 선택
①이 틀려요. 먹은 레보도파와 도파민은 둘 다 혈액-뇌 장벽을 통과할 수 없어요.

**피드백** (COMPLETED)

처음에 “④는 맞아요. 말초의 전환을 막으면 뇌에 전달되는 레보도파가 늘어요.”라고 한 설명은 맞아요. 다만 “그래서 맞는 ④를 답으로 골랐어요.”라는 선택이 잘못됐어요. 이 문항은 ‘적절하지 않은 것’을 고르는 문제이기 때문이에요. 이 점은 교정 질문에 “아니요.”라고 답하면서 바로잡았어요.

정답은 ②예요. 카르비도파는 레보도파를 도파민으로 바꾸는 효소의 작용을 억제하지만, 혈액-뇌 장벽을 통과하지 못하므로 말초 조직에서만 작용해요. 따라서 말초에서 레보도파가 도파민으로 바뀌는 것을 억제해 뇌로 전달되는 레보도파의 양을 늘릴 수는 있어도, 흑질에서 이미 합성된 도파민의 작용 기간을 연장하는 것은 아니에요. ‘도파민을 합성하는 효소의 억제’와 ‘이미 합성된 도파민의 분해를 막는 것’은 구별해야 해요.

마지막에 고른 ①은 적절한 설명이므로 답이 아니에요. “먹은 레보도파와 도파민은 둘 다 혈액-뇌 장벽을 통과할 수 없어요.”라고 했지만, 원문에서 혈액-뇌 장벽을 통과할 수 없다고 한 물질은 도파민이에요. 반면 <보기>의 레보도파는 입으로 투여한 뒤 뇌에 있는 흑질의 도파민성 뉴런에 흡수되어 도파민 합성을 증가시키므로, 혈액-뇌 장벽을 통과해 뇌로 들어갈 수 있다는 것을 알 수 있어요. 말초에서 도파민으로 바뀐 것은 뇌에 들어갈 수 없지만, 레보도파로 남아 있는 것은 뇌에 전달될 수 있어요.

### 판정 기록

**SELECTION** — SUPPORTED / VALID

학생은 "④는 맞아요."라고 판단하고, "말초의 전환을 막으면 뇌에 전달되는 레보도파가 늘어요."라는 근거를 제시했다. 이는 카르비도파가 말초 조직에서 레보도파의 도파민 전환을 억제한다는 보기와 일치하며 선택 선지를 참으로 판단하기에 충분하다. 내용 오류는 없다. 다만 "그래서 맞는 ④를 답으로 골랐어요."라는 선택은 거짓인 선지를 고르는 목표와 충돌한다.

학생 판단 재구성:

- "말초의 전환을 막으면 뇌에 전달되는 레보도파가 늘어요."
- "④는 맞아요."
- 학생 근거가 함의하는 결론: 선택 선지는 참이다.

**REPAIR** —  / 

학생은 이번 답변에서 “아니요.”라고 답해, 앞서 맞다고 판단한 ④를 고른 것이 ‘적절하지 않은 것’을 고르는 문항의 요구와 부합하지 않음을 인정했습니다. 기존 선택 불일치 오류는 수정된 것으로 판단합니다. 초기 근거인 “말초의 전환을 막으면 뇌에 전달되는 레보도파가 늘어요.”는 ④가 적절한 설명이라는 판단을 뒷받침하므로, 근거 자체는 충분합니다. 다만 이 문항의 정답은 ②입니다. 카르비도파는 혈액-뇌 장벽을 통과하지 못해 말초에서 작용하므로, 흑질에서 이미 합성된 도파민의 작용 기간을 연장하지 못합니다.

```json
{
  "repairs": [
    {
      "errorId": "selection-mismatch",
      "status": "REPAIRED"
    }
  ],
  "verificationComplete": true,
  "rationaleSufficient": true,
  "newErrors": []
}
```

**SELECTION** — ERROR / INVALID

학생은 "①이 틀려요."라고 판단하고, 근거로 "먹은 레보도파와 도파민은 둘 다 혈액-뇌 장벽을 통과할 수 없어요."라고 밝혀 전체 판단을 재구성할 수 있다. 도파민이 혈액-뇌 장벽을 통과하지 못한다는 부분은 원문과 일치하지만, 레보도파까지 통과하지 못한다는 부분은 <보기>의 뇌 전달 및 흑질 뉴런 흡수 설명과 충돌한다. 따라서 내용에 명시적 오류가 있다. 근거가 뜻하는 INVALID 판단은 선택이 뜻하는 INVALID 판단과 일치한다.

학생 판단 재구성:

- 학생은 "먹은 레보도파와 도파민은 둘 다 혈액-뇌 장벽을 통과할 수 없어요."를 근거로 제시했다.
- 학생은 "①이 틀려요."라고 결론 내렸다. 학생 관점에서 선택 선지는 거짓이다.

### 제출·재시도 이력

- o1: SELECT → AWAITING_EVALUATION, 22ms — Frozen initial response
  - SELECTION: ERROR, gpt-6.1-sol — Error: Connection error.
- o2: RESUME → AWAITING_CORRECTION, 21159ms — Resume the same submission after network failure; no new student answer
  - SELECTION: SUCCESS, gpt-6.1-sol
- o3: CORRECT → AWAITING_POST_REPAIR_CHOICE, 6818ms — Acknowledge the explicit selection-versus-stem mismatch; no new content claim.
  - REPAIR: SUCCESS, gpt-6-luna
- o4: RESELECT → AWAITING_RESELECTION, 1ms — Frozen behavior: choose reselection after local repair; next choice is separately authored.
- o5: SELECT → COMPLETED, 33630ms — Frozen behavior: after admitting the first selection mismatch, select a different wrong option with a new explicit content error. Do not count local repair as final recovery.
  - SELECTION: SUCCESS, gpt-6.1-sol
  - END_EXPLANATION: SUCCESS, gpt-6.1-sol

