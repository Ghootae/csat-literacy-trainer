# 결과 — 학생 S-58 한 명 (2026-11-18)

채점은 하지 않았다. 웹 스레드가 KEY와 대조한다. KEY.md·students.py·codes.json은 읽지도 모델에 넣지도 않았다.

## 실행 조건

- 대상: `inputs/S-58.json` 한 명. 실행 스크립트 `run-one.mjs`(저장소 루트에서 `node --env-file=.env docs/experiments/reading-error-2026-11-18/run-one.mjs S-58`).
- 모델: 사고 진단·생성·검토 모두 `gpt-6.1-sol`(sol), reasoning effort medium. 사고 진단은 앱의 현재 지시문·요청 함수(`diagnoseThought`, `docs/experiments/thought-diagnosis-v01-2026-10-10/prompts.json`)를 그대로 썼다.
- README와 다른 점: 생성은 학생당 3회가 아니라 **1회**(사용자 지시). 검토도 1회.
- 모델 호출: 사고 진단 5회, 생성 2회 시도(첫 시도는 `text.format=json_object` 요청이 입력에 `json` 단어가 없다는 400 에러로 실패해 결과 없음 → 형식 지정 없이 JSON만 요구하는 지시문 그대로 재호출해 성공), 검토 1회. 사고 진단은 첫 시도에서 저장한 출력을 재사용했다(재호출 없음).
- `PROMPT-v1.md`는 지시에 따라 삭제했다.
- 호출 토큰: 생성 입력 6879·출력 1358, 검토 입력 6214·출력 166.

## 1단계: 사고 진단 태그

| 문항 | 고른 선지 | 정오 | outcomeType | firstFailedStep | errors (step / tag) |
|---|---|---|---|---|---|
| 경마식 보도와 선거 방송 토론회 5번 | 4번 | 오답 | ERROR | S4_INTERPRET | S4_INTERPRET / CONDITION |
| 경마식 보도와 선거 방송 토론회 6번 | 5번 | 오답 | ERROR | S2_CHOICE | S2_CHOICE / CONDITION |
| 플라스틱의 중합 반응과 물리적 성질 10번 | 2번 | 오답 | ERROR | S4_INTERPRET | S4_INTERPRET / DIRECTION |
| 오디오 신호의 디지털 저장과 지각부호화 압축 16번 | 5번 | 정답 | UNJUDGEABLE | - | (없음) |
| 오디오 신호의 디지털 저장과 지각부호화 압축 17번 | 3번 | 오답 | ERROR | S5_JUDGE | S5_JUDGE / CONDITION |

## 2단계: 거르기 (코드)

규칙: `errors` 중 하나 이상이 step ∈ {S2_CHOICE, S4_INTERPRET}이면서 tag ∈ {CONDITION, SCOPE, DIRECTION, POLARITY, REFERENT, MAPPING, PARAPHRASE_DISTANCE, MISREAD_FACT}.

- 대상 3개(서로 다른 문항 3개, 2개 이상이라 생성 진행): 경마식 보도와 선거 방송 토론회 5번 / 경마식 보도와 선거 방송 토론회 6번 / 플라스틱의 중합 반응과 물리적 성질 10번
- 제외(`excludedEntries`): 오디오 신호의 디지털 저장과 지각부호화 압축 16번 (태그: 없음) / 오디오 신호의 디지털 저장과 지각부호화 압축 17번 (태그: CONDITION)
- 저장: `inputs-filtered/S-58.json`

## 3단계: 생성 결과 (1회)

| 항목 | 값 |
|---|---|
| result | NONE |
| kind | null |
| headline | null |
| featured | null |
| otherCases 문항 | (없음) |

생성 모델이 적은 문항별 판단(`perEntry`)과 기각 사유(`rejected`)는 아래 전체 JSON에 있다.

## 4단계: 검토 결과 (1회)

verdict **PASS**. quotesVerbatim true, distinctItems true, inScope true, formsAccurate true, notContentOnly true, notGeneric true, noneJustified true, problems [].

---

# 부록: 원본 출력 (그대로)

## A. 사고 진단 원본 출력 (문항별, `runs/S-58.diagnosis.json`의 calls)

### 경마식 보도와 선거 방송 토론회 5번

학생 근거: 선거일에는 여론조사 결과 보도가 금지라서 보도할 수 없음. 그러니까 4번이 틀린 내용

```json
{
  "output": {
    "caseId": "S-58:horse-race-reporting-q5",
    "outcomeType": "ERROR",
    "steps": {
      "S1_STEM": "PASS",
      "S2_CHOICE": "NOT_OBSERVED",
      "S3_LOCATE": "PASS",
      "S4_INTERPRET": "FAIL",
      "S5_JUDGE": "PASS"
    },
    "firstFailedStep": "S4_INTERPRET",
    "errors": [
      {
        "tag": "CONDITION",
        "step": "S4_INTERPRET",
        "studentQuote": "선거일에는 여론조사 결과 보도가 금지라서 보도할 수 없음."
      }
    ],
    "note": "보도 금지 규정은 찾았으나 ‘투표 마감 시각까지’라는 시간적 한정을 누락했다. 따라서 투표 마감 이후에는 보도할 수 있음을 놓쳤다. 다만 자신이 제시한 전제에서 4번을 부적절하다고 판단한 연결은 일관된다.",
    "unjudgeableReason": null,
    "guessed": false
  },
  "metadata": {
    "model": "gpt-6.1-sol",
    "durationMs": 12272,
    "inputTokens": 4304,
    "outputTokens": 406
  }
}
```

### 경마식 보도와 선거 방송 토론회 6번

학생 근거: 소수 정당 후보도 토론회에서 주요 후보랑 같이 비교할 수 있으면 모든 후보를 동시에 비교 못 하게 한다는 ⓑ 비판이 안 맞게 되니까 약화되는 게 맞음

```json
{
  "output": {
    "caseId": "S-58:horse-race-reporting-q6",
    "outcomeType": "ERROR",
    "steps": {
      "S1_STEM": "PASS",
      "S2_CHOICE": "FAIL",
      "S3_LOCATE": "PASS",
      "S4_INTERPRET": "PASS",
      "S5_JUDGE": "PASS"
    },
    "firstFailedStep": "S2_CHOICE",
    "errors": [
      {
        "tag": "CONDITION",
        "step": "S2_CHOICE",
        "studentQuote": "소수 정당 후보도 토론회에서 주요 후보랑 같이 비교할 수 있으면"
      }
    ],
    "note": "ⓑ의 동시 비교 제한 비판은 정확히 파악했지만, 선지의 ‘동시 비교에 가장 효율적인 방법’이라는 조건을 ‘소수 정당 후보도 실제로 참여하여 비교될 수 있음’으로 바꾸어 읽었다. 이 잘못된 전제에서 약화를 도출하는 연결 자체는 일관된다.",
    "unjudgeableReason": null,
    "guessed": false
  },
  "metadata": {
    "model": "gpt-6.1-sol",
    "durationMs": 11915,
    "inputTokens": 4453,
    "outputTokens": 461
  }
}
```

### 플라스틱의 중합 반응과 물리적 성질 10번

학생 근거: ㉯가 한 줄로 조밀하게 있으니까 빛이 더 잘 통과해서 투명할 것 같음

```json
{
  "output": {
    "caseId": "S-58:plastic-polymerization-q10",
    "outcomeType": "ERROR",
    "steps": {
      "S1_STEM": "PASS",
      "S2_CHOICE": "PASS",
      "S3_LOCATE": "PASS",
      "S4_INTERPRET": "FAIL",
      "S5_JUDGE": "PASS"
    },
    "firstFailedStep": "S4_INTERPRET",
    "errors": [
      {
        "tag": "DIRECTION",
        "step": "S4_INTERPRET",
        "studentQuote": "조밀하게 있으니까 빛이 더 잘 통과해서 투명할 것 같음"
      }
    ],
    "note": "㉯의 조밀한 배열은 찾았으나, 결정 영역이 많을수록 불투명해진다는 관계와 반대로 투명해진다고 해석했다. 이 잘못된 전제에서 투명한 포장재를 고르는 연결 자체는 일관된다.",
    "unjudgeableReason": null,
    "guessed": false
  },
  "metadata": {
    "model": "gpt-6.1-sol",
    "durationMs": 9936,
    "inputTokens": 4173,
    "outputTokens": 439
  }
}
```

### 오디오 신호의 디지털 저장과 지각부호화 압축 16번

학생 근거: 지문에 그렇게 나와 있음

```json
{
  "output": {
    "caseId": "S-58:audio-perceptual-coding-q16",
    "outcomeType": "UNJUDGEABLE",
    "steps": {
      "S1_STEM": "NOT_OBSERVED",
      "S2_CHOICE": "NOT_OBSERVED",
      "S3_LOCATE": "NOT_OBSERVED",
      "S4_INTERPRET": "NOT_OBSERVED",
      "S5_JUDGE": "NOT_OBSERVED"
    },
    "firstFailedStep": null,
    "errors": [],
    "note": "정답을 선택했지만, '지문에 그렇게 나와 있음'만으로는 구체적인 근거 내용이나 선지와의 연결을 확인할 수 없다.",
    "unjudgeableReason": "NO_CONTENT",
    "guessed": false
  },
  "metadata": {
    "model": "gpt-6.1-sol",
    "durationMs": 5785,
    "inputTokens": 3531,
    "outputTokens": 227
  }
}
```

### 오디오 신호의 디지털 저장과 지각부호화 압축 17번

학생 근거: 압축 전엔 소리 크기마다 같은 개수의 비트를 할당한다고 했으니까 A랑 B 크기가 같으면 비트도 같음

```json
{
  "output": {
    "caseId": "S-58:audio-perceptual-coding-q17",
    "outcomeType": "ERROR",
    "steps": {
      "S1_STEM": "PASS",
      "S2_CHOICE": "PASS",
      "S3_LOCATE": "PASS",
      "S4_INTERPRET": "PASS",
      "S5_JUDGE": "FAIL"
    },
    "firstFailedStep": "S5_JUDGE",
    "errors": [
      {
        "tag": "CONDITION",
        "step": "S5_JUDGE",
        "studentQuote": "압축 전엔 소리 크기마다 같은 개수의 비트를 할당한다고 했으니까 A랑 B 크기가 같으면 비트도 같음"
      }
    ],
    "note": "압축 전의 균일한 비트 할당과 A·B의 같은 소리 크기는 정확히 짚었으나, 압축 전의 규칙을 압축할 때에도 적용했다. 압축 시에는 소리 크기와 차폐 문턱값의 차이를 고려해야 한다.",
    "unjudgeableReason": null,
    "guessed": false
  },
  "metadata": {
    "model": "gpt-6.1-sol",
    "durationMs": 10913,
    "inputTokens": 4247,
    "outputTokens": 458
  }
}
```

## B. 생성 JSON 전체 (`runs/S-58-r1.gen.json`의 output)

```json
{
  "perEntry": [
    {
      "item": "경마식 보도와 선거 방송 토론회 5번",
      "eligible": true,
      "sentence": "｢공직선거법｣의 규정에 따르면, 당선인을 예상케 하는 여론조사를 실시하는 것은 언제든지 가능하지만, 그 결과의 보도는 선거일 6일 전부터 투표 마감 시각까지 금지된다.",
      "sourceForm": "A에 따르면, B를 하는 것은 언제든지 가능하지만, 그 결과의 C는 D 6일 전부터 E까지 금지된다.",
      "studentForm": "D에는 그 결과의 C가 금지된다.",
      "changed": "금지 기간인 'D 6일 전부터 E까지'를 'D에는'으로 바꾸어, 금지가 끝나는 시점인 'E까지'를 반영하지 않음.",
      "kind": "CONDITION+SCOPE",
      "tagDisagreement": null
    },
    {
      "item": "경마식 보도와 선거 방송 토론회 6번",
      "eligible": true,
      "sentence": "유권자들이 뛰어난 역량을 가진 소수 정당 후보자를 주요 후보자들과 동시에 비교할 수 있는 가장 효율적인 방법이 선거 방송 초청 대상 후보자 토론회라면 ⓑ의 입장은 약화되겠군.",
      "sourceForm": "A가 B를 C와 동시에 비교할 수 있는 가장 효율적인 방법이 D라면 E의 입장은 약화되겠군.",
      "studentForm": "A가 D에서 B를 C와 동시에 비교할 수 있다면 E의 입장은 약화된다.",
      "changed": "'동시에 비교할 수 있는 가장 효율적인 방법이 D'라는 조건을 'D에서 동시에 비교할 수 있음'이라는 가능성 조건으로 바꿈.",
      "kind": "CONDITION",
      "tagDisagreement": null
    },
    {
      "item": "플라스틱의 중합 반응과 물리적 성질 10번",
      "eligible": false,
      "sentence": "결정 영역이 많아질수록 플라스틱은 유연성이 낮아 충격에 약하고 가공성이 떨어지며 점점 불투명해지지만, 밀도가 높아져 단단해지고 화학 물질에 대한 민감성이 감소하며 열에 의해 잘 변형되지 않는다.",
      "sourceForm": "A가 많아질수록 B는 C가 낮아 D에 약하고 E가 떨어지며 점점 불투명해지지만, F가 높아져 단단해지고 G에 대한 H가 감소하며 I에 의해 잘 변형되지 않는다.",
      "studentForm": "UNKNOWN",
      "changed": "확인할 수 없음. 학생은 '조밀하게 있으니까 빛이 더 잘 통과해서'라는 자체 인과 설명을 제시했으며, 원문의 변화 방향을 어떻게 읽었는지는 드러내지 않음.",
      "kind": "",
      "tagDisagreement": "DIRECTION 태그와 달리, 학생 근거만으로는 원문의 방향 표현을 뒤집어 읽었다고 확인할 수 없다. 지문에 없는 인과 설명으로 판단한 사례이므로 제외한다."
    }
  ],
  "result": "NONE",
  "kind": null,
  "headline": null,
  "featured": null,
  "otherCases": [],
  "nextTime": null,
  "counterCheck": "근거까지 맞은 사례에서는 '해석에 의존해서만'이라는 제한을 유지했고, '사슬 끝'을 '양쪽 끝'으로 확대하지 않았으며, '압축 전에는'이라는 시간 구분도 보존했다. 따라서 조건이나 한정 표현을 전반적으로 버린다고 일반화하기 어렵다. 이번 후보에서도 시간 범위의 변경과 최상급 조건의 가능성 조건화는 각각 한 문항에서만 확인된다.",
  "rejected": [
    {
      "kind": "CONDITION+SCOPE",
      "why": "5번은 '~부터 ~까지'로 정해진 금지 기간을 특정 날짜 전체로 바꾼 사례다. 같은 시간 범위 변경이 다른 문항에서는 확인되지 않는다."
    },
    {
      "kind": "CONDITION",
      "why": "6번은 '가장 효율적인 방법이다'를 '그 방법으로 할 수 있다'로 바꾼 사례다. 5번의 시간 범위 변경과는 구체적인 형식 변화가 달라, 두 사례를 단순히 '조건을 놓침'으로 묶지 않는다."
    },
    {
      "kind": "DIRECTION",
      "why": "10번은 지문 밖 인과 설명을 보탠 근거이므로 문장 읽기 습관 진단에서 제외한다."
    }
  ]
}
```

## C. 검토 JSON 전체 (`runs/S-58-r1.review.json`의 output)

```json
{
  "quotesVerbatim": true,
  "distinctItems": true,
  "inScope": true,
  "formsAccurate": true,
  "notContentOnly": true,
  "notGeneric": true,
  "noneJustified": true,
  "verdict": "PASS",
  "problems": []
}
```
