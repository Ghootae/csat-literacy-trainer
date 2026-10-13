# mRNA 백신과 지질 나노 입자 19번 — 8개 세션

발문: <보기>는 ‘mRNA-지질 나노 입자 복합체’의 형성 과정을 나타낸 것이다. 윗글을 참고하여 <보기>를 이해한 내용으로 적절하지 않은 것은?

정답: 5번

## M-CT — 5번 선택

구성 의도: 정답·소재만 언급; 질문이 생기면 내용 없는 답으로 종료

실제 상태: **UNVERIFIED_CORRECT**

[원자료 JSON](cases/M-CT.json) · [세션 원장](cases/M-CT.records.jsonl)

의미 검토: **PASS** — pH 소재 또는 투석의 사실만 말하고 소수성·크기로 이어지는 선지의 관계는 판단하지 않았다. 충분 근거로 보충하지 않고 근거 미확인으로 종료했다.

결과:

```json
{
  "outcome": "UNVERIFIED_CORRECT",
  "selectedChoiceId": "C5",
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

5번 선택
⑤요. pH에 관한 설명이라서요.

**피드백** (COMPLETED)

정답입니다. 다만 근거는 검증되지 않았습니다.

### 판정 기록

**SELECTION** — INSUFFICIENT / UNKNOWN

학생은 "⑤요. pH에 관한 설명이라서요."라고 했습니다. ⑤에 pH가 언급된다는 점은 확인되지만, pH와 관련 있다는 이유만으로 그 설명이 왜 적절하지 않은지에 대한 판단은 확인되지 않습니다. 따라서 선택한 선지를 참 또는 거짓으로 본 근거의 결론을 복원할 수 없습니다.

학생 판단 재구성:

- ⑤를 선택하고, pH에 관한 설명이라는 이유를 제시함
- 이 이유가 ⑤를 적절하지 않다고 판단한 것인지는 확인할 수 없음

### 제출·재시도 이력

- o1: SELECT → AWAITING_EVALUATION, 11ms — Frozen initial response
  - SELECTION: ERROR, gpt-6-luna — Error: Connection error.
- o2: RESUME → COMPLETED, 15627ms — Resume the same submission after network failure; no new student answer
  - SELECTION: SUCCESS, gpt-6-luna

## M-CP — 5번 선택

구성 의도: 정답·관련 사실만 언급; 질문이 생기면 국소 보완 후 설명 요청

실제 상태: **UNVERIFIED_CORRECT**

[원자료 JSON](cases/M-CP.json) · [세션 원장](cases/M-CP.records.jsonl)

의미 검토: **PASS** — pH 소재 또는 투석의 사실만 말하고 소수성·크기로 이어지는 선지의 관계는 판단하지 않았다. 충분 근거로 보충하지 않고 근거 미확인으로 종료했다.

결과:

```json
{
  "outcome": "UNVERIFIED_CORRECT",
  "selectedChoiceId": "C5",
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

5번 선택
⑤가 답 같아요. 투석으로 pH를 높이고 에탄올을 제거해요.

**피드백** (COMPLETED)

정답입니다. 다만 근거는 검증되지 않았습니다.

### 판정 기록

**SELECTION** — INSUFFICIENT / UNKNOWN

학생은 "⑤가 답 같아요. 투석으로 pH를 높이고 에탄올을 제거해요."라고 했습니다. 선택한 선지와 답의 방향은 정답 기준과 일치하지만, 뒤의 두 사실만으로는 ⑤의 주장이 왜 적절하지 않은지 판단한 근거를 확인할 수 없습니다. 따라서 학생의 선지 판단 근거를 재구성할 수 없습니다.

### 제출·재시도 이력

- o1: SELECT → AWAITING_EVALUATION, 10ms — Frozen initial response
  - SELECTION: ERROR, gpt-6-luna — Error: Connection error.
- o2: RESUME → COMPLETED, 17643ms — Resume the same submission after network failure; no new student answer
  - SELECTION: SUCCESS, gpt-6-luna

## M-A1 — 3번 선택

구성 의도: 오답 A·낮음·막연한 근거; 질문에도 확인 불가

실제 상태: **COACHING_TERMINATED**

[원자료 JSON](cases/M-A1.json) · [세션 원장](cases/M-A1.records.jsonl)

의미 검토: **PASS** — 막연한 근거에서 구체적 오류를 역산하지 않고 확인 불가로 종료했다. 종료 설명은 학생이 밝히지 않은 생각을 학생의 오류로 귀속하지 않으며 고른 선지와 정답을 구분했다.

결과:

```json
{
  "outcome": "COACHING_TERMINATED",
  "selectedChoiceId": "C3",
  "choiceCorrect": false,
  "selectionCount": 1,
  "rationaleVerified": false,
  "correctionSucceeded": false,
  "answerRevealed": true,
  "resolvedByStudent": false,
  "answer": {
    "choiceId": "C5",
    "position": 5,
    "text": "pH가 높아지면 이온화 지질의 소수성이 약해져 소수성 분자 간의 인력이 감소하므로 더욱 미세한 크기의 mRNA-지질 나노 입자 복합체가 형성되겠군."
  }
}
```

### 실제 대화

**피드백** (AWAITING_SELECTION)

선지와 판단 근거를 제출하세요. 명시적으로 근거 없이 답만 제출할 수도 있습니다.

**학생** (AWAITING_SELECTION)

3번 선택
③이 틀린 것 같아요. 전하가 붙는 부분이 잘 모르겠어요.

**피드백** (COMPLETED)

전하가 생기는 과정은 용액의 pH와 연결해서 보면 이해하기 쉬워요. 원문에 따르면 pH가 낮은 산성 용액에는 수소 이온이 많아서 이온화 지질이 양이온화돼요. 즉, 양전하를 띠게 되는 거예요. 반면 mRNA는 음전하를 띠므로, 낮은 pH에서 이온화 지질과 mRNA가 결합할 수 있어요.

따라서 마지막으로 고른 ③은 적절한 설명이어서 이 문제의 답이 아니에요. 에탄올의 pH가 7이라고 해도, 산성 용액과 혼합된 뒤의 상태까지 그대로 유지되는 것은 아니에요. <보기>의 혼합 과정은 원문에서 설명한 ‘낮은 pH에서 mRNA와 이온화 지질을 결합’시키는 과정에 해당해요.

정답은 ⑤예요. 결합 이후 투석 처리로 pH를 높이면, 이온화 지질이 수소 이온을 적게 받아들여 전기적으로 중성이 돼요. 하지만 원문에는 pH가 높아질 때 이온화 지질의 소수성이 약해진다거나, 소수성 분자 간의 인력이 감소해 복합체가 더 작아진다는 내용은 없어요. ⑤는 ‘전기적으로 중성이 된다’는 변화를 근거 없이 ‘소수성이 약해지고 크기가 작아진다’는 변화로 이어 놓았기 때문에 적절하지 않아요.

### 판정 기록

**SELECTION** — INSUFFICIENT / UNKNOWN

학생은 "③이 틀린 것 같아요."라고 했지만, 근거로는 "전하가 붙는 부분이 잘 모르겠어요."라고만 밝혔습니다. 낮은 pH와 이온화 지질의 전하 변화 사이의 관계를 어떻게 판단했는지 확인할 수 없어 전체 판단 경로는 재구성할 수 없습니다. 원문상 ③의 설명은 뒷받침되지만, 오답 선택과 이해의 어려움만으로 구체적인 내용 오류를 추정하지 않습니다.

### 제출·재시도 이력

- o1: SELECT → AWAITING_EVALUATION, 13ms — Frozen initial response
  - SELECTION: ERROR, gpt-6.1-sol — Error: Connection error.
- o2: RESUME → COMPLETED, 28269ms — Resume the same submission after network failure; no new student answer
  - SELECTION: SUCCESS, gpt-6.1-sol
  - END_EXPLANATION: SUCCESS, gpt-6.1-sol

## M-A2 — 3번 선택

구성 의도: 오답 A·중간·명시적 오류; 국소 수정 후 정답·충분 근거 재선택

실제 상태: **VERIFIED_CORRECT**

[원자료 JSON](cases/M-A2.json) · [세션 원장](cases/M-A2.records.jsonl)

의미 검토: **PASS** — 최초의 명시적 오류를 실제 교정 답변으로 고친 뒤 정답을 새로 선택했다. 최종 근거에는 선지를 가르는 원문 관계가 명시되어 있어 VERIFIED_CORRECT와 부합한다.

결과:

```json
{
  "outcome": "VERIFIED_CORRECT",
  "selectedChoiceId": "C5",
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

3번 선택
③이 틀려요. 낮은 pH에서는 이온화 지질이 전기적으로 중성이어서 음전하 mRNA와 결합할 수 없어요.

**피드백** (AWAITING_CORRECTION)

"낮은 pH에서는 이온화 지질이 전기적으로 중성이어서"라고 했는데, 지문의 수소 이온 농도 설명에 따르면 낮은 pH에서 이온화 지질은 어떤 전하 상태가 되나요?

**학생** (AWAITING_CORRECTION)

양전하를 띠어요. 그래서 음전하를 띤 mRNA와 결합할 수 있어요.

**피드백** (AWAITING_POST_REPAIR_CHOICE)

핵심 오류를 잘 고쳤어요. 처음에 ③를 고르게 된 생각 중 어디가 잘못됐는지 알 것 같다면 다시 선택해 볼까요?

**학생** (AWAITING_POST_REPAIR_CHOICE)

다시 선택

**피드백** (AWAITING_RESELECTION)

확인된 오류의 수정이 확인됐습니다. 선지와 근거를 마지막으로 한 번 제출하세요.

**학생** (AWAITING_RESELECTION)

5번 선택
⑤가 적절하지 않아요. 높은 pH에서 이온화 지질이 중성이 된다는 것은 나와 있지만, 소수성이 약해져 인력이 감소하고 더 작은 복합체가 된다는 연결은 지문과 보기에 없어요.

**피드백** (COMPLETED)

정답과 근거가 확인됐습니다.

### 판정 기록

**SELECTION** — ERROR / INVALID

학생은 "낮은 pH에서는 이온화 지질이 전기적으로 중성이어서 음전하 mRNA와 결합할 수 없어요."를 근거로 "③이 틀려요."라고 판단했다. 판단 경로는 확인되지만, 원문은 낮은 pH에서 이온화 지질이 양이온화되고 mRNA와 결합한다고 설명하므로 내용에 명시적 오류가 있다. 근거의 결론은 INVALID로, 이번 선택이 뜻하는 판단과는 일치한다.

학생 판단 재구성:

- 학생은 "낮은 pH에서는 이온화 지질이 전기적으로 중성이어서"라고 전제했다.
- 이 전제를 "음전하 mRNA와 결합할 수 없어요."라는 판단에 연결했다.
- 학생 관점의 결론은 "③이 틀려요."이며, 선지를 거짓으로 판단한 것이다(INVALID).

**REPAIR** —  / 

이번 답변에서 학생은 "양전하를 띠어요."라고 답해 낮은 pH에서 이온화 지질의 전하 상태를 바로잡았고, "음전하를 띤 mRNA와 결합할 수 있어요."라고 하여 mRNA와 결합할 수 없다는 기존 판단도 명시적으로 수정했다.

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
  "rationaleSufficient": false,
  "newErrors": []
}
```

**SELECTION** — SUPPORTED / INVALID

학생은 "⑤가 적절하지 않아요"라고 판단했고, 높은 pH에서 이온화 지질이 중성이 된다는 내용은 지문에 있지만 소수성 약화·인력 감소·복합체 크기 감소의 연결은 지문과 보기에 없다고 설명했습니다. 이 근거는 ⑤를 부적절한 설명으로 판단하기에 충분하며, 선택이 뜻하는 INVALID와도 일치합니다.

학생 판단 재구성:

- 학생은 높은 pH에서 이온화 지질이 중성이 된다는 점을 지문에 있는 내용으로 확인함.
- 학생은 이 사실로부터 소수성 약화, 인력 감소, 더 작은 복합체 형성이 이어진다는 설명은 지문과 보기에 없다고 판단함.
- 따라서 학생의 판단으로는 ⑤가 적절하지 않음(INVALID).

### 제출·재시도 이력

- o1: SELECT → AWAITING_EVALUATION, 9ms — Frozen initial response
  - SELECTION: ERROR, gpt-6.1-sol — Error: Connection error.
- o2: RESUME → AWAITING_CORRECTION, 25620ms — Resume the same submission after network failure; no new student answer
  - SELECTION: SUCCESS, gpt-6.1-sol
- o3: CORRECT → AWAITING_POST_REPAIR_CHOICE, 9509ms — Actual first question targets low-pH charge. This mid-level response corrects the charge and its explicitly recorded binding consequence together; let the runtime decide whether to skip E2.
  - REPAIR: SUCCESS, gpt-6-luna
- o4: RESELECT → AWAITING_RESELECTION, 1ms — Frozen behavior: choose reselection after local repair; next choice is separately authored.
- o5: SELECT → COMPLETED, 11257ms — Frozen behavior: after local correction, independently select the correct option with explicit sufficient source-based rationale.
  - SELECTION: SUCCESS, gpt-6-luna

## M-A3 — 3번 선택

구성 의도: 오답 A·높음·복합 오류; 첫 오류 수정·다음 오류 유지

실제 상태: **COACHING_TERMINATED**

[원자료 JSON](cases/M-A3.json) · [세션 원장](cases/M-A3.records.jsonl)

의미 검토: **PASS** — 첫 국소 오류의 수정은 유지했고, 나중 답변에서 재확인한 나머지 오류는 남겨 REPAIR_FAILED 코칭으로 종료했다. 종료 설명도 고친 부분과 남은 부분을 나누었다.

결과:

```json
{
  "outcome": "COACHING_TERMINATED",
  "selectedChoiceId": "C3",
  "choiceCorrect": false,
  "selectionCount": 1,
  "rationaleVerified": false,
  "correctionSucceeded": false,
  "answerRevealed": true,
  "resolvedByStudent": false,
  "answer": {
    "choiceId": "C5",
    "position": 5,
    "text": "pH가 높아지면 이온화 지질의 소수성이 약해져 소수성 분자 간의 인력이 감소하므로 더욱 미세한 크기의 mRNA-지질 나노 입자 복합체가 형성되겠군."
  }
}
```

### 실제 대화

**피드백** (AWAITING_SELECTION)

선지와 판단 근거를 제출하세요. 명시적으로 근거 없이 답만 제출할 수도 있습니다.

**학생** (AWAITING_SELECTION)

3번 선택
③이 틀려요. 낮은 pH에서는 이온화 지질이 중성이고, mRNA도 양전하라서 둘이 반발한다고 생각해요.

**피드백** (AWAITING_CORRECTION)

"낮은 pH에서는 이온화 지질이 중성이고"라고 했는데, 원문의 낮은 pH 조건에서 이온화 지질은 어떤 전하 상태가 되나요?

**학생** (AWAITING_CORRECTION)

양전하를 띠어요.

**피드백** (AWAITING_CORRECTION)

"mRNA도 양전하라서"라고 했는데, 원문에서 mRNA가 띠는 전하는 무엇인가요?

**학생** (AWAITING_CORRECTION)

mRNA는 양전하를 띠어요.

**피드백** (AWAITING_CORRECTION)

"둘이 반발한다고 생각해요."라고 했는데, 원문의 낮은 pH에서 복합체를 만드는 설명에 따르면 mRNA와 이온화 지질은 반발하나요, 결합하나요?

**학생** (AWAITING_CORRECTION)

반발해요.

**피드백** (COMPLETED)

처음에 “낮은 pH에서는 이온화 지질이 중성이고”라고 했지만, 이후 “양전하를 띠어요.”라고 답하며 이 부분은 바르게 고쳤어요. 다만 “mRNA도 양전하라서”, “둘이 반발한다고 생각해요.”라는 판단은 아직 바로잡아야 해요. 원문에서 mRNA는 음전하를 띤다고 했어요. 낮은 pH에서 양전하를 띠는 이온화 지질과 음전하를 띠는 mRNA는 반발하는 것이 아니라 결합해요.

이 과정을 순서대로 보면, 먼저 산성 용액과 이온화 지질이 녹은 에탄올을 혼합할 때 낮은 pH에서 이온화 지질이 양이온화되어 mRNA와 결합해요. 그다음 투석 처리로 pH를 높이면 이온화 지질이 수소 이온을 적게 받아들여 전기적으로 중성이 돼요. 즉, pH 변화에 따라 달라지는 것으로 원문이 설명한 것은 이온화 지질의 전하 상태예요.

정답은 ⑤예요. 원문과 <보기>에는 pH가 높아지면 이온화 지질의 소수성이 약해진다거나, 소수성 분자 간의 인력이 감소하여 더 작은 복합체가 만들어진다는 설명이 없어요. 따라서 전하 상태의 변화를 소수성의 약화와 복합체 크기의 감소로 연결한 ⑤는 적절하지 않아요.

마지막으로 고른 ③은 산성 조건에서 이온화 지질이 양전하를 띠며 mRNA와 결합한다고 설명하므로 원문에 맞아요. 이 문제는 ‘적절하지 않은 것’을 묻기 때문에, 원문에 맞는 ③이 아니라 근거 없는 변화를 제시한 ⑤를 골라야 해요.

### 판정 기록

**SELECTION** — ERROR / INVALID

학생은 "낮은 pH에서는 이온화 지질이 중성이고, mRNA도 양전하라서 둘이 반발한다고 생각해요."를 근거로 "③이 틀려요."라고 판단했다. 판단 경로는 재구성 가능하며, 근거의 결론은 선택이 뜻하는 INVALID와 일치한다. 그러나 원문에서는 낮은 pH에서 이온화 지질이 양이온화되고 mRNA는 음전하를 띠며, 이 조건에서 둘이 결합한다고 설명하므로 학생 근거에는 명시적인 내용 오류가 있다.

학생 판단 재구성:

- 학생은 "낮은 pH에서는 이온화 지질이 중성이고"라고 판단했다.
- 학생은 "mRNA도 양전하라서 둘이 반발한다고 생각해요."라고 판단했다.
- 이를 근거로 학생은 "③이 틀려요."라고 결론 내렸다.
- 학생 관점의 파생 결론: 선택한 선지는 거짓이다(INVALID).

**REPAIR** —  / 

이번 답변에서 학생은 질문에 대해 "양전하를 띠어요."라고 답했고, 낮은 pH에서 이온화 지질의 전하 상태를 바로잡았습니다. 그러나 이전에 말한 "mRNA도 양전하라서"와 "둘이 반발한다고 생각해요."는 이번 누적 답변에서 수정되지 않았습니다. 원문은 mRNA가 음전하를 띠며, 낮은 pH에서 mRNA와 이온화 지질을 결합한다고 설명합니다.

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
    },
    {
      "errorId": "E3",
      "status": "REMAINING"
    }
  ],
  "verificationComplete": true,
  "rationaleSufficient": false,
  "newErrors": []
}
```

**REPAIR** —  / 

이번 답변을 읽었습니다. E1은 이전 답변의 "양전하를 띠어요."로 바로잡혔습니다. 다만 이번 답변의 "mRNA는 양전하를 띠어요."는 E2의 잘못된 판단을 다시 나타내며, E3의 "둘이 반발한다고 생각해요."도 누적 발화에서 수정되지 않았습니다. 따라서 모든 오류의 상태는 확인 가능하지만, 근거는 아직 충분하지 않습니다.

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
    },
    {
      "errorId": "E3",
      "status": "REMAINING"
    }
  ],
  "verificationComplete": true,
  "rationaleSufficient": false,
  "newErrors": []
}
```

**REPAIR** —  / 

이번 답변을 확인했습니다. E1은 o3의 "양전하를 띠어요."로 바로잡혔습니다. E2는 o4의 "mRNA는 양전하를 띠어요."에서 여전히 확인되고, 이번 답변의 "반발해요."는 E3의 판단을 다시 나타냅니다. 따라서 모든 오류의 현재 상태는 확인 가능하지만 근거는 아직 충분하지 않습니다.

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
    },
    {
      "errorId": "E3",
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
- o2: RESUME → AWAITING_CORRECTION, 31513ms — Resume the same submission after network failure; no new student answer
  - SELECTION: SUCCESS, gpt-6.1-sol
- o3: CORRECT → AWAITING_CORRECTION, 13963ms — Actual first question targets lipid charge. Repair only that slot; keep the separate mRNA-charge error for the next actual question.
  - REPAIR: SUCCESS, gpt-6-luna
- o4: CORRECT → AWAITING_CORRECTION, 9547ms — Actual second question read; preserve this originally stated error after correcting the first one.
  - REPAIR: SUCCESS, gpt-6-luna
- o5: CORRECT → COMPLETED, 16327ms — Actual third question read; keep the originally wrong target judgment after repairing the first local error.
  - REPAIR: SUCCESS, gpt-6-luna
  - END_EXPLANATION: SUCCESS, gpt-6.1-sol

## M-B1 — 4번 선택

구성 의도: 오답 B·낮음·근거 미제출을 유지

실제 상태: **COACHING_TERMINATED**

[원자료 JSON](cases/M-B1.json) · [세션 원장](cases/M-B1.records.jsonl)

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
    "choiceId": "C5",
    "position": 5,
    "text": "pH가 높아지면 이온화 지질의 소수성이 약해져 소수성 분자 간의 인력이 감소하므로 더욱 미세한 크기의 mRNA-지질 나노 입자 복합체가 형성되겠군."
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

이 문제는 적절하지 않은 설명을 고르는 문제이므로 정답은 ⑤예요. 핵심은 pH가 높아질 때 이온화 지질의 ‘전하’가 어떻게 변하는지와, ‘소수성이나 복합체의 크기’가 어떻게 변하는지를 구분하는 거예요.

원문에서는 낮은 pH에서 이온화 지질이 양이온화되어 음전하를 띤 mRNA와 결합하고, 이후 pH를 높이면 수소 이온을 적게 받아들여 전기적으로 중성이 된다고 설명해요. <보기>의 투석 처리는 이렇게 pH를 높여 중성의 mRNA-지질 나노 입자 복합체를 만드는 과정이에요.

⑤는 pH가 높아지면 이온화 지질의 소수성이 약해지고, 소수성 분자 간의 인력이 감소해 더 작은 복합체가 형성된다고 설명해요. 하지만 원문과 <보기>에는 이런 변화가 나타난다는 근거가 없어요. 전기적으로 중성이 된다는 설명을 소수성의 약화나 복합체 크기의 감소로 연결할 수는 없으므로, ⑤가 적절하지 않아요.

마지막으로 고른 ④는 원문에 맞는 설명이라 답이 아니에요. <보기>에서는 투석 처리로 pH를 높인다고 했고, 원문에서는 pH가 높은 용액에서 이온화 지질이 수소 이온을 적게 받아들여 중성이 된다고 했어요. 따라서 ④의 ‘수소 이온의 농도가 낮아져 이온화 지질이 전기적으로 중성이 된다’는 설명은 이 과정에 부합해요.

### 판정 기록

### 제출·재시도 이력

- o1: SELECT → AWAITING_RATIONALE, 1ms — Frozen initial response
- o2: RATIONALE → COMPLETED, 7585ms — Keep omitted rationale as frozen B1 behavior
  - END_EXPLANATION: SUCCESS, gpt-6.1-sol

## M-B2 — 4번 선택

구성 의도: 오답 B·중간·명시적 오류; 짧게 국소 수정 후 코칭 요청

실제 상태: **COACHING_TERMINATED**

[원자료 JSON](cases/M-B2.json) · [세션 원장](cases/M-B2.records.jsonl)

의미 검토: **PASS** — 실제 질문에 대한 짧은 국소 답으로 오류를 고쳤고, 재선택 대신 코칭을 요청했다. 종료 설명은 실제 수정 인정과 처음 고른 선지의 정오 설명을 구분했다.

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
    "choiceId": "C5",
    "position": 5,
    "text": "pH가 높아지면 이온화 지질의 소수성이 약해져 소수성 분자 간의 인력이 감소하므로 더욱 미세한 크기의 mRNA-지질 나노 입자 복합체가 형성되겠군."
  }
}
```

### 실제 대화

**피드백** (AWAITING_SELECTION)

선지와 판단 근거를 제출하세요. 명시적으로 근거 없이 답만 제출할 수도 있습니다.

**학생** (AWAITING_SELECTION)

4번 선택
④가 틀려요. 투석으로 pH가 높아지면 수소 이온 농도가 올라가서 이온화 지질이 더 강한 양전하를 띠어요.

**피드백** (AWAITING_CORRECTION)

"투석으로 pH가 높아지면 수소 이온 농도가 올라가서"라고 했는데, 지문의 pH와 수소 이온 농도 관계에 따르면 투석으로 pH가 높아질 때 수소 이온 농도는 어떻게 변하나요?

**학생** (AWAITING_CORRECTION)

낮아져요.

**피드백** (AWAITING_CORRECTION)

"이온화 지질이 더 강한 양전하를 띠어요."라고 했는데, 지문에서 높은 pH의 용액에 놓인 이온화 지질은 어떤 전기적 상태가 되나요?

**학생** (AWAITING_CORRECTION)

전기적으로 중성이에요.

**피드백** (AWAITING_POST_REPAIR_CHOICE)

핵심 오류를 잘 고쳤어요. 처음에 ④를 고르게 된 생각 중 어디가 잘못됐는지 알 것 같다면 다시 선택해 볼까요?

**학생** (AWAITING_POST_REPAIR_CHOICE)

코칭 보기

**피드백** (COMPLETED)

처음에 “투석으로 pH가 높아지면 수소 이온 농도가 올라가서 이온화 지질이 더 강한 양전하를 띠어요.”라고 한 부분은 원문과 반대였어요. 다만 교정 질문에서 수소 이온 농도는 “낮아져요.”, 이온화 지질은 “전기적으로 중성이에요.”라고 답하면서 두 부분을 모두 바르게 고쳤어요.

원문에서는 낮은 pH에서 수소 이온 농도가 높아 이온화 지질이 양이온화되고, 높은 pH에서는 수소 이온을 적게 받아들여 전기적으로 중성이 된다고 설명해요. 따라서 <보기>에서 투석 처리로 pH를 높이면 수소 이온 농도가 낮아지고 이온화 지질이 중성이 돼요. 마지막으로 고른 ④는 이 과정과 일치하는 적절한 설명이므로, ‘적절하지 않은 것’을 묻는 이 문제의 답이 아니에요.

정답은 ⑤예요. 원문에서 pH 상승에 따라 달라진다고 설명한 것은 이온화 지질의 전기적 상태예요. pH가 높아지면 소수성이 약해진다거나, 소수성 분자 간의 인력이 감소해 더 작은 복합체가 만들어진다는 설명은 원문과 <보기>에 없어요. 즉, ⑤는 ‘전기적으로 중성이 된다’는 내용을 근거 없이 ‘소수성이 약해지고 크기가 더 작아진다’는 내용으로 이어 갔기 때문에 적절하지 않아요.

### 판정 기록

**SELECTION** — ERROR / INVALID

학생은 "④가 틀려요."라고 판단하고, "투석으로 pH가 높아지면 수소 이온 농도가 올라가서 이온화 지질이 더 강한 양전하를 띠어요."를 근거로 제시했다. 선지를 거짓으로 보는 판단 경로는 재구성 가능하며 선택의 의미와도 일치한다. 그러나 원문은 높은 pH에서 수소 이온을 적게 받아들여 이온화 지질이 전기적으로 중성이 된다고 설명하므로, 학생이 제시한 농도 변화와 전하 변화는 원문과 충돌한다.

학생 판단 재구성:

- 학생은 "투석으로 pH가 높아지면 수소 이온 농도가 올라가서"라고 전제했다.
- 그 결과를 "이온화 지질이 더 강한 양전하를 띠어요."라고 설명했다.
- 학생 관점의 결론: "④가 틀려요."라는 발화에 따라 선택 선지는 거짓이다.

**REPAIR** —  / 

이번 답변에서 학생은 "낮아져요."라고 답해 E1의 교정 질문에 맞게 pH가 높아질 때 수소 이온 농도가 낮아진다는 판단을 보였습니다. 다만 E2와 관련해 앞서 말한 "이온화 지질이 더 강한 양전하를 띠어요."와 "④가 틀려요."를 바로잡는 답변은 없어, 높은 pH에서 이온화 지질이 중성이 된다는 판단은 확인되지 않았습니다.

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

이번 답변의 "전기적으로 중성이에요."는 E2의 교정 질문에 맞게 높은 pH에서 이온화 지질의 상태를 바로잡았습니다. 앞서 제출한 "낮아져요."도 E1을 수정하는 답변으로 확인됩니다. 다만 선택한 ④가 적절하지 않다는 판단을 뒷받침하는 충분한 근거는 확인되지 않습니다.

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
  "rationaleSufficient": false,
  "newErrors": []
}
```

### 제출·재시도 이력

- o1: SELECT → AWAITING_EVALUATION, 13ms — Frozen initial response
  - SELECTION: ERROR, gpt-6.1-sol — Error: Connection error.
- o2: RESUME → AWAITING_CORRECTION, 28223ms — Resume the same submission after network failure; no new student answer
  - SELECTION: SUCCESS, gpt-6.1-sol
- o3: CORRECT → AWAITING_CORRECTION, 11141ms — Actual question asks the direction of hydrogen-ion concentration with rising pH; answer that slot only.
  - REPAIR: SUCCESS, gpt-6-luna
- o4: CORRECT → AWAITING_POST_REPAIR_CHOICE, 10612ms — Actual second question read; give a short correct answer to the remaining local error.
  - REPAIR: SUCCESS, gpt-6-luna
- o5: REQUEST_EXPLANATION → COMPLETED, 8347ms — Frozen B2 behavior: all actual local questions answered; request coaching rather than reselect.
  - END_EXPLANATION: SUCCESS, gpt-6.1-sol

## M-B3 — 4번 선택

구성 의도: 오답 B·높음·옳은 내용 판단과 선택 행동 충돌; 인정 후 다시 오답 선택

실제 상태: **COACHING_TERMINATED**

[원자료 JSON](cases/M-B3.json) · [세션 원장](cases/M-B3.records.jsonl)

의미 검토: **PASS** — 처음의 올바른 내용 판단과 선택 실행 오류를 구별했다. 불일치를 인정한 뒤 다른 오답과 새 오류 근거를 제출하자 RESELECTION_WRONG으로 끝냈고, 앞선 국소 수정을 최종 회복으로 집계하지 않았다.

결과:

```json
{
  "outcome": "COACHING_TERMINATED",
  "selectedChoiceId": "C3",
  "choiceCorrect": false,
  "selectionCount": 2,
  "rationaleVerified": false,
  "correctionSucceeded": true,
  "answerRevealed": true,
  "resolvedByStudent": false,
  "answer": {
    "choiceId": "C5",
    "position": 5,
    "text": "pH가 높아지면 이온화 지질의 소수성이 약해져 소수성 분자 간의 인력이 감소하므로 더욱 미세한 크기의 mRNA-지질 나노 입자 복합체가 형성되겠군."
  }
}
```

### 실제 대화

**피드백** (AWAITING_SELECTION)

선지와 판단 근거를 제출하세요. 명시적으로 근거 없이 답만 제출할 수도 있습니다.

**학생** (AWAITING_SELECTION)

4번 선택
④는 맞아요. pH가 높아지면 수소 이온 농도가 낮아지고 이온화 지질은 중성이 돼요. 그래서 맞는 ④를 답으로 골랐어요.

**피드백** (AWAITING_CORRECTION)

"④는 맞아요."라고 판단했는데, 적절하지 않은 설명을 고르는 이 문항에서 맞다고 판단한 선지를 답으로 고르는 것은 그 판단과 일치하나요?

**학생** (AWAITING_CORRECTION)

아니요.

**피드백** (AWAITING_POST_REPAIR_CHOICE)

핵심 오류를 잘 고쳤어요. 처음에 ④를 고르게 된 생각 중 어디가 잘못됐는지 알 것 같다면 다시 선택해 볼까요?

**학생** (AWAITING_POST_REPAIR_CHOICE)

다시 선택

**피드백** (AWAITING_RESELECTION)

확인된 오류의 수정이 확인됐습니다. 선지와 근거를 마지막으로 한 번 제출하세요.

**학생** (AWAITING_RESELECTION)

3번 선택
③이 틀려요. 낮은 pH에서는 이온화 지질이 음전하를 띠므로 mRNA와 반발해요.

**피드백** (COMPLETED)

처음에 “④는 맞아요. pH가 높아지면 수소 이온 농도가 낮아지고 이온화 지질은 중성이 돼요.”라고 한 내용 판단은 옳았어요. 다만 “그래서 맞는 ④를 답으로 골랐어요.”라는 선택이 문제였어요. 이 문항은 ‘적절하지 않은 것’을 고르므로, 맞는 설명인 ④는 답이 될 수 없어요. 이 선택과 판단의 불일치는 교정 질문에 “아니요.”라고 답하면서 바로잡았어요.

원문에 따르면 낮은 pH에서는 수소 이온 농도가 높아 이온화 지질이 양이온화돼요. 이때 양전하를 띤 이온화 지질이 음전하를 띤 mRNA와 결합해요. 이후 투석 처리로 pH를 높이면 이온화 지질이 수소 이온을 적게 받아들여 전기적으로 중성이 돼요. 따라서 ④는 원문에 맞는 설명이에요.

정답은 ⑤예요. 원문은 pH가 높아질 때 이온화 지질의 ‘전하 상태’가 중성으로 바뀐다고 설명할 뿐, 소수성이 약해지거나 소수성 분자 사이의 인력이 감소한다고 설명하지 않아요. 그 때문에 복합체의 크기가 더욱 작아진다는 근거도 없어요. 보기의 ‘균일한 상태’ 역시 ‘더 미세한 크기’를 뜻하지는 않아요. 따라서 ⑤는 원문과 보기로 뒷받침할 수 없는 설명이에요.

마지막에 고른 ③은 적절한 설명이므로 답이 아니에요. “낮은 pH에서는 이온화 지질이 음전하를 띠므로 mRNA와 반발해요.”라고 했지만, 원문에서는 반대로 낮은 pH에서 이온화 지질이 양전하를 띤다고 했어요. 따라서 산성 용액과 에탄올이 혼합되면 이온화 지질이 양이온화되어 음전하를 띤 mRNA와 결합한다는 ③의 설명은 맞아요.

### 판정 기록

**SELECTION** — SUPPORTED / VALID

학생은 "④는 맞아요."라고 판단하고, "pH가 높아지면 수소 이온 농도가 낮아지고 이온화 지질은 중성이 돼요."라는 근거를 제시했다. 이는 지문과 보기에 부합하며 해당 선지를 참으로 판단하기에 충분하다. 내용 오류는 없다. 다만 "그래서 맞는 ④를 답으로 골랐어요."라는 선택 이유는 적절하지 않은 선지를 골라야 하는 선택 목표와 충돌한다.

학생 판단 재구성:

- 학생은 "pH가 높아지면 수소 이온 농도가 낮아지고 이온화 지질은 중성이 돼요."라고 설명했다.
- 학생은 "④는 맞아요."라고 판단했다.
- 학생 근거가 뜻하는 선지 판단은 참이다.

**REPAIR** —  / 

학생은 이번 답변에서 “아니요.”라고 답해, ④가 맞다고 판단하면서 적절하지 않은 설명을 고르는 문항의 답으로 ④를 고른 것이 판단과 일치하지 않음을 인정했습니다. 따라서 기존 선택 불일치 오류는 수정된 것으로 확인됩니다. 처음 근거는 ④의 내용이 지문과 일치함을 설명하지만, 적절하지 않은 설명을 뒷받침하지는 않아 전체 근거는 선지 판단에 충분하지 않습니다.

```json
{
  "repairs": [
    {
      "errorId": "selection-mismatch",
      "status": "REPAIRED"
    }
  ],
  "verificationComplete": true,
  "rationaleSufficient": false,
  "newErrors": []
}
```

**SELECTION** — ERROR / INVALID

학생은 "③이 틀려요."라고 판단하고, "낮은 pH에서는 이온화 지질이 음전하를 띠므로 mRNA와 반발해요."를 근거로 제시했다. 따라서 선지를 거짓으로 보는 판단 경로는 재구성되며 선택의 의미와도 일치한다. 그러나 원문은 낮은 pH에서 이온화 지질이 양이온화되고 mRNA와 결합한다고 설명하므로, 제시한 근거에는 명시적 내용 오류가 있다.

학생 판단 재구성:

- 학생은 "낮은 pH에서는 이온화 지질이 음전하를 띠므로 mRNA와 반발해요."라고 설명했다.
- 이 근거에 따라 학생은 "③이 틀려요."라고 판단했다.
- 학생 관점의 결론: 선택한 선지는 거짓이다.

### 제출·재시도 이력

- o1: SELECT → AWAITING_EVALUATION, 14ms — Frozen initial response
  - SELECTION: ERROR, gpt-6.1-sol — Error: Connection error.
- o2: RESUME → AWAITING_CORRECTION, 23832ms — Resume the same submission after network failure; no new student answer
  - SELECTION: SUCCESS, gpt-6.1-sol
- o3: CORRECT → AWAITING_POST_REPAIR_CHOICE, 8140ms — Actual question asks whether choosing a valid statement matches an incorrect-option task; admit mismatch only.
  - REPAIR: SUCCESS, gpt-6-luna
- o4: RESELECT → AWAITING_RESELECTION, 2ms — Frozen behavior: choose reselection after local repair; next choice is separately authored.
- o5: SELECT → COMPLETED, 35854ms — Frozen behavior: after admitting the first selection mismatch, select a different wrong option with a new explicit content error. Do not count local repair as final recovery.
  - SELECTION: SUCCESS, gpt-6.1-sol
  - END_EXPLANATION: SUCCESS, gpt-6.1-sol

