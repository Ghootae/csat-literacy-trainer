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


---

# v2.1 (학생 S-58 한 명, 2026-11-18)

채점은 하지 않았다. 위 v2 절의 결과와 비교하려고 같은 사고 진단 원본을 재사용했다. KEY.md·students.py·codes.json은 읽지도 모델에 넣지도 않았다.

## 실행 조건

- 1단계: `runs/S-58.diagnosis.json`을 **재사용**했다(사고 진단 재호출 0회). 위 v2 절 1단계 표와 같다.
- 2단계 거르기: **태그만**(단계 제한 없음). `errors` 중 하나 이상의 tag ∈ {CONDITION, SCOPE, DIRECTION, POLARITY, REFERENT, MAPPING, PARAPHRASE_DISTANCE, MISREAD_FACT}. 저장 `inputs-filtered/S-58-v2.1.json`(v2의 `S-58.json`은 그대로 둠).
- 3·4단계: `PROMPT-v2.1.md`, 모델 `gpt-6.1-sol`(sol), reasoning medium, 각 1회. 실행 `node --env-file=.env docs/experiments/reading-error-2026-11-18/run-one.mjs S-58 --version v2.1`(`run-one.mjs`에 `--version` 옵션 추가).
- 호출: 생성 1·검토 1 성공. 첫 시도는 서버 과부하(503 `server_is_overloaded`)로 실패했고 저장된 출력이 없어 같은 조건으로 한 번 재시도했다.
- 토큰: 생성 입력 7974·출력 2195, 검토 입력 7370·출력 368.
- 저장: `runs/S-58-v2.1-r1.gen.json`, `runs/S-58-v2.1-r1.review.json`.

## 2단계: 거르기 (태그만)

- 대상 4개: 경마식 보도와 선거 방송 토론회 5번 / 경마식 보도와 선거 방송 토론회 6번 / 플라스틱의 중합 반응과 물리적 성질 10번 / 오디오 신호의 디지털 저장과 지각부호화 압축 17번
- 제외: 오디오 신호의 디지털 저장과 지각부호화 압축 16번 (태그: 없음)
- v2 대비: 오디오 17번(S5_JUDGE / CONDITION)이 대상에 새로 들어옴. 나머지는 같다.

## 3단계: 생성 결과 (1회)

| 항목 | 값 |
|---|---|
| result | PATTERN |
| kind | CONDITION+SCOPE |
| headline | 종합적으로 보면, 너는 범위·때·정도를 정하는 말을 빼고 문장의 뼈대만으로 판단한 경우가 있었어. |
| featured | 경마식 보도와 선거 방송 토론회 5번: ｢공직선거법｣의 규정에 따르면, 당선인을 예상케 하는 여론조사를 실시하는 것은 언제든지 가능하지만, 그 결과의 보도는 선거일 6일 전부터 투표 마감 시각까지 금지된다. (sourceForm: A를 실시하는 것은 언제든지 가능하지만, 그 결과의 B는 C부터 D까지 금지된다. / studentForm: A 결과의 B는 선거일에는 금지된다.) |
| otherCases 문항 | 경마식 보도와 선거 방송 토론회 6번, 오디오 신호의 디지털 저장과 지각부호화 압축 17번 |
| secondary | null |
| nextTime | '~까지', '가장', '~할 때'에 동그라미를 치고, 판단 근거를 쓸 때도 그 말을 그대로 넣어서 적용 범위가 같은지 확인해 봐. |
| perEntry 제외(eligible=false) | 플라스틱의 중합 반응과 물리적 성질 10번 |

## 4단계: 검토 결과 (1회)

verdict **FAIL**. quotesVerbatim false, distinctItems true, inScope false, formsAccurate true, notContentOnly true, notGeneric true, noneJustified null.

problems:
- otherCases의 두 sentence에 각각 '**가장 효율적인 방법**', '**압축할 때**'라는 마크다운 강조가 삽입되어 있어 선지 원문과 그대로 일치하지 않는다.
- 오디오 신호의 디지털 저장과 지각부호화 압축 17번은 학생이 '압축 전엔'이라는 조건을 명시적으로 보존하면서 그 규칙을 압축 상황의 판단에 적용한 사례다. '압축할 때'를 문장에서 빼고 읽었다는 직접 근거는 없으므로, 이를 문장 하나의 오독 사례로 포함하면 적용·추론 실패가 섞인다.

측정 메모(해석 아님): 검토의 첫째 problem은 `otherCases.sentence`에 들어간 `**굵게**` 표시를 원문 불일치로 본 것이다. `PROMPT-v2.1.md` 생성 지시문은 `otherCases`의 `sentence`에 "바뀐 말은 **굵게**"를 요구하고, 검토 지시문 1번은 `sentence`가 원문에 그대로 있는지를 묻는다. 두 지시문이 서로 어긋난다.

# 부록 (v2.1): 원본 출력 (그대로)

## D. 생성 JSON 전체 (`runs/S-58-v2.1-r1.gen.json`의 output)

```json
{
  "perEntry": [
    {
      "item": "경마식 보도와 선거 방송 토론회 5번",
      "eligible": true,
      "sentence": "｢공직선거법｣의 규정에 따르면, 당선인을 예상케 하는 여론조사를 실시하는 것은 언제든지 가능하지만, 그 결과의 보도는 선거일 6일 전부터 투표 마감 시각까지 금지된다.",
      "sourceForm": "A를 실시하는 것은 언제든지 가능하지만, 그 결과의 B는 C부터 D까지 금지된다.",
      "studentForm": "A 결과의 B는 선거일에는 금지된다.",
      "changed": "금지가 끝나는 때인 '투표 마감 시각까지'를 버리고, 금지 범위를 선거일 전체로 넓힘",
      "kind": "CONDITION+SCOPE",
      "tagDisagreement": null
    },
    {
      "item": "경마식 보도와 선거 방송 토론회 6번",
      "eligible": true,
      "sentence": "유권자들이 뛰어난 역량을 가진 소수 정당 후보자를 주요 후보자들과 동시에 비교할 수 있는 가장 효율적인 방법이 선거 방송 초청 대상 후보자 토론회라면 ⓑ의 입장은 약화되겠군.",
      "sourceForm": "A가 B를 C와 동시에 비교할 수 있는 가장 효율적인 방법이 D라면 E의 입장은 약화된다.",
      "studentForm": "A가 D에서 B를 C와 같이 비교할 수 있으면 E의 입장은 약화된다.",
      "changed": "'가장 효율적인 방법'이라는 한정을 빼고, 함께 비교할 수 있다는 가능성만으로 조건을 바꿈",
      "kind": "CONDITION+SCOPE",
      "tagDisagreement": null
    },
    {
      "item": "플라스틱의 중합 반응과 물리적 성질 10번",
      "eligible": false,
      "sentence": "",
      "sourceForm": "UNKNOWN",
      "studentForm": "UNKNOWN",
      "changed": "확인할 수 없음. 조밀한 배열이면 빛이 더 잘 통과할 것이라는 인과를 스스로 만들어 판단했으며, 특정 문장의 방향을 뒤집어 읽었다는 근거는 없음",
      "kind": "",
      "tagDisagreement": "DIRECTION 태그와 달리, 학생 근거에는 원문의 관계를 뒤집어 읽은 흔적보다 지문에 없는 인과를 만들어 판단한 흔적이 드러남"
    },
    {
      "item": "오디오 신호의 디지털 저장과 지각부호화 압축 17번",
      "eligible": true,
      "sentence": "A와 B는 소리 크기가 같으므로 압축할 때 두 소리 크기에 같은 개수의 비트가 할당되겠군.",
      "sourceForm": "A와 B는 C가 같으므로 D할 때 같은 개수의 E가 할당된다.",
      "studentForm": "A와 B는 C가 같으므로 같은 개수의 E가 할당된다.",
      "changed": "판단 대상의 '압축할 때'를 반영하지 않고, 학생 자신이 '압축 전엔'이라고 한정해 읽은 규칙을 압축 상황에도 적용함",
      "kind": "CONDITION",
      "tagDisagreement": null
    }
  ],
  "result": "PATTERN",
  "kind": "CONDITION+SCOPE",
  "headline": "종합적으로 보면, 너는 범위·때·정도를 정하는 말을 빼고 문장의 뼈대만으로 판단한 경우가 있었어.",
  "featured": {
    "item": "경마식 보도와 선거 방송 토론회 5번",
    "sentence": "｢공직선거법｣의 규정에 따르면, 당선인을 예상케 하는 여론조사를 실시하는 것은 언제든지 가능하지만, 그 결과의 보도는 선거일 6일 전부터 투표 마감 시각까지 금지된다.",
    "studentQuote": "선거일에는 여론조사 결과 보도가 금지라서 보도할 수 없음.",
    "sourceForm": "A를 실시하는 것은 언제든지 가능하지만, 그 결과의 B는 C부터 D까지 금지된다.",
    "studentForm": "A 결과의 B는 선거일에는 금지된다.",
    "explanation": "'C부터 D까지'는 금지가 적용되는 시작과 끝을 정하는 말이야. 여기서 '투표 마감 시각까지'를 빼고 '선거일에는 금지된다'로 읽으면, 금지가 끝나는 시각 뒤까지 금지 범위를 넓히게 돼."
  },
  "otherCases": [
    {
      "item": "경마식 보도와 선거 방송 토론회 6번",
      "sentence": "유권자들이 뛰어난 역량을 가진 소수 정당 후보자를 주요 후보자들과 동시에 비교할 수 있는 **가장 효율적인 방법**이 선거 방송 초청 대상 후보자 토론회라면 ⓑ의 입장은 약화되겠군.",
      "studentQuote": "소수 정당 후보도 토론회에서 주요 후보랑 같이 비교할 수 있으면 모든 후보를 동시에 비교 못 하게 한다는 ⓑ 비판이 안 맞게 되니까 약화되는 게 맞음",
      "changed": "'가장 효율적인 방법'이라는 한정을 빼고 '같이 비교할 수 있으면'만 남김"
    },
    {
      "item": "오디오 신호의 디지털 저장과 지각부호화 압축 17번",
      "sentence": "A와 B는 소리 크기가 같으므로 **압축할 때** 두 소리 크기에 같은 개수의 비트가 할당되겠군.",
      "studentQuote": "압축 전엔 소리 크기마다 같은 개수의 비트를 할당한다고 했으니까 A랑 B 크기가 같으면 비트도 같음",
      "changed": "'압축할 때'라는 적용 시점을 빼고, '압축 전엔' 성립하는 규칙으로 판단함"
    }
  ],
  "secondary": null,
  "nextTime": "'~까지', '가장', '~할 때'에 동그라미를 치고, 판단 근거를 쓸 때도 그 말을 그대로 넣어서 적용 범위가 같은지 확인해 봐.",
  "counterCheck": "오디오 신호의 디지털 저장과 지각부호화 압축 15번에서는 '압축 전에는'이라는 시점 한정을 정확히 적었다. 의식과 인지 과정에 대한 철학적 논의 16번에서도 '해석에 의존해서만'이라는 한정을 보존했고, 플라스틱의 중합 반응과 물리적 성질 9번에서는 '사슬 끝'을 '양쪽 끝'으로 넓히지 않았다. 따라서 한정 표현을 늘 놓치는 습관으로 단정하지 않고, 한정을 빼거나 적용 과정에서 유지하지 못한 경우가 있었다고 진단한다.",
  "rejected": [
    {
      "kind": "DIRECTION",
      "why": "플라스틱의 중합 반응과 물리적 성질 10번은 학생이 만든 인과에 따른 판단이므로 제외했다. 문장의 비교·방향·순서를 뒤집어 읽은 사례가 서로 다른 두 문항에서 확인되지 않는다."
    }
  ]
}
```

## E. 검토 JSON 전체 (`runs/S-58-v2.1-r1.review.json`의 output)

```json
{
  "quotesVerbatim": false,
  "distinctItems": true,
  "inScope": false,
  "formsAccurate": true,
  "notContentOnly": true,
  "notGeneric": true,
  "noneJustified": null,
  "verdict": "FAIL",
  "problems": [
    "otherCases의 두 sentence에 각각 '**가장 효율적인 방법**', '**압축할 때**'라는 마크다운 강조가 삽입되어 있어 선지 원문과 그대로 일치하지 않는다.",
    "오디오 신호의 디지털 저장과 지각부호화 압축 17번은 학생이 '압축 전엔'이라는 조건을 명시적으로 보존하면서 그 규칙을 압축 상황의 판단에 적용한 사례다. '압축할 때'를 문장에서 빼고 읽었다는 직접 근거는 없으므로, 이를 문장 하나의 오독 사례로 포함하면 적용·추론 실패가 섞인다."
  ]
}
```


---

# v2.2 (7명) (2026-11-18)

채점은 하지 않았다. 웹 스레드가 KEY와 대조한다. KEY.md·students.py·codes.json은 읽지도 모델에 넣지도 않았다.

## 실행 조건

- 1단계 사고 진단: S-58은 `runs/S-58.diagnosis.json` 재사용(재호출 없음), 나머지 6명(S-07·S-12·S-23·S-31·S-44·S-66)은 새로 돌려 `runs/S-xx.diagnosis.json`에 저장(28회). 앱의 현재 지시문·모델·요청 함수 그대로, 모델 `gpt-6.1-sol`.
- 2단계 거르기: 태그만(단계 제한 없음). 태그 ∈ {CONDITION, SCOPE, DIRECTION, POLARITY, REFERENT, MAPPING, PARAPHRASE_DISTANCE, MISREAD_FACT}. 저장 `inputs-filtered/S-xx-v2.2.json`. 대상이 서로 다른 문항 2개 미만이면 생성·검토 호출 없이 NONE.
- 3·4단계: `PROMPT-v2.2.md`, sol(reasoning medium), 학생당 생성 3회 + 각 생성에 대한 검토 3회. 결과 `runs/S-xx-v2.2-rN.gen.json`, `runs/S-xx-v2.2-rN.review.json`(원본 출력 전체는 이 파일들에 있다).
- 호출: 사고 진단 28 + 생성 18 + 검토 18 = 64회(S-12는 대상 1개라 생성·검토 없음 → 계획 70회 중 6회 감소). 누적 추정 비용 약 $1.27(가정 단가 입력 $2/M·출력 $10/M, 승인 상한 $3). 재시도 횟수는 로그에 남기지 않았다.
- 실행 `run-one.mjs S-xx --version v2.2 --runs 3`(`--runs`, `--ledger` 옵션 추가). 학생당 3회는 병렬로 호출했다.

## 1단계: 학생별 사고 진단 태그 (S-58 제외 6명은 이번 실행, S-58은 위 v2 절 표와 같음)

### S-07

| 문항 | outcomeType | errors (step / tag) |
|---|---|---|
| 의식과 인지 과정에 대한 철학적 논의 15번 | ERROR | S5_JUDGE / SCOPE |
| 경마식 보도와 선거 방송 토론회 5번 | ERROR | S4_INTERPRET / CONDITION |
| 경마식 보도와 선거 방송 토론회 7번 | UNJUDGEABLE | (없음) |
| 플라스틱의 중합 반응과 물리적 성질 8번 | ERROR | S4_INTERPRET / OUTSIDE_KNOWLEDGE |
| 오디오 신호의 디지털 저장과 지각부호화 압축 15번 | ERROR | S5_JUDGE / OUTSIDE_KNOWLEDGE |

### S-12

| 문항 | outcomeType | errors (step / tag) |
|---|---|---|
| 의식과 인지 과정에 대한 철학적 논의 13번 | ERROR | S4_INTERPRET / ATTRIBUTION |
| 의식과 인지 과정에 대한 철학적 논의 14번 | ERROR | S4_INTERPRET / MISREAD_FACT, S4_INTERPRET / SURFACE_MATCH |
| 의식과 인지 과정에 대한 철학적 논의 15번 | ERROR | S4_INTERPRET / ATTRIBUTION |
| 플라스틱의 중합 반응과 물리적 성질 9번 | UNJUDGEABLE | (없음) |
| 오디오 신호의 디지털 저장과 지각부호화 압축 16번 | UNJUDGEABLE | (없음) |

### S-23

| 문항 | outcomeType | errors (step / tag) |
|---|---|---|
| 경마식 보도와 선거 방송 토론회 6번 | ERROR | S4_INTERPRET / ATTRIBUTION |
| 경마식 보도와 선거 방송 토론회 7번 | ERROR | S4_INTERPRET / CONDITION |
| 플라스틱의 중합 반응과 물리적 성질 10번 | ERROR | S4_INTERPRET / DIRECTION |
| 오디오 신호의 디지털 저장과 지각부호화 압축 15번 | ERROR | S4_INTERPRET / CONDITION |
| 오디오 신호의 디지털 저장과 지각부호화 압축 16번 | ERROR | S4_INTERPRET / DIRECTION |

### S-31

| 문항 | outcomeType | errors (step / tag) |
|---|---|---|
| 경마식 보도와 선거 방송 토론회 4번 | UNJUDGEABLE | (없음) |
| 경마식 보도와 선거 방송 토론회 7번 | ERROR | S4_INTERPRET / CONDITION |
| 플라스틱의 중합 반응과 물리적 성질 9번 | ERROR | S4_INTERPRET / MISREAD_FACT |
| 오디오 신호의 디지털 저장과 지각부호화 압축 14번 | ERROR | S4_INTERPRET / MISREAD_FACT |

### S-44

| 문항 | outcomeType | errors (step / tag) |
|---|---|---|
| 의식과 인지 과정에 대한 철학적 논의 12번 | UNJUDGEABLE | (없음) |
| 플라스틱의 중합 반응과 물리적 성질 8번 | ERROR | S5_JUDGE / SCOPE |
| 플라스틱의 중합 반응과 물리적 성질 9번 | ERROR | S4_INTERPRET / SCOPE |
| 플라스틱의 중합 반응과 물리적 성질 10번 | ERROR | S4_INTERPRET / MAPPING |
| 오디오 신호의 디지털 저장과 지각부호화 압축 16번 | ERROR | S4_INTERPRET / MISREAD_FACT |

### S-58

| 문항 | outcomeType | errors (step / tag) |
|---|---|---|
| 경마식 보도와 선거 방송 토론회 5번 | ERROR | S4_INTERPRET / CONDITION |
| 경마식 보도와 선거 방송 토론회 6번 | ERROR | S2_CHOICE / CONDITION |
| 플라스틱의 중합 반응과 물리적 성질 10번 | ERROR | S4_INTERPRET / DIRECTION |
| 오디오 신호의 디지털 저장과 지각부호화 압축 16번 | UNJUDGEABLE | (없음) |
| 오디오 신호의 디지털 저장과 지각부호화 압축 17번 | ERROR | S5_JUDGE / CONDITION |

### S-66

| 문항 | outcomeType | errors (step / tag) |
|---|---|---|
| 경마식 보도와 선거 방송 토론회 4번 | ERROR | S2_CHOICE / MISREAD_FACT |
| 경마식 보도와 선거 방송 토론회 7번 | ERROR | S4_INTERPRET / ATTRIBUTION |
| 플라스틱의 중합 반응과 물리적 성질 10번 | ERROR | S1_STEM / REFERENT |
| 오디오 신호의 디지털 저장과 지각부호화 압축 16번 | ERROR | S4_INTERPRET / MISREAD_FACT |

## 2단계 거르기 결과

| 학생 | 대상 문항(서로 다른 문항 수) | 제외 문항 (태그) | 생성·검토 |
|---|---|---|---|
| S-07 | 의식과 인지 과정에 대한 철학적 논의 15번 / 경마식 보도와 선거 방송 토론회 5번 (2개) | 경마식 보도와 선거 방송 토론회 7번 (없음) / 플라스틱의 중합 반응과 물리적 성질 8번 (OUTSIDE_KNOWLEDGE) / 오디오 신호의 디지털 저장과 지각부호화 압축 15번 (OUTSIDE_KNOWLEDGE) | 3회 생성·검토 |
| S-12 | 의식과 인지 과정에 대한 철학적 논의 14번 (1개) | 의식과 인지 과정에 대한 철학적 논의 13번 (ATTRIBUTION) / 의식과 인지 과정에 대한 철학적 논의 15번 (ATTRIBUTION) / 플라스틱의 중합 반응과 물리적 성질 9번 (없음) / 오디오 신호의 디지털 저장과 지각부호화 압축 16번 (없음) | 호출 없음(대상 2개 미만 → NONE) |
| S-23 | 경마식 보도와 선거 방송 토론회 7번 / 플라스틱의 중합 반응과 물리적 성질 10번 / 오디오 신호의 디지털 저장과 지각부호화 압축 15번 / 오디오 신호의 디지털 저장과 지각부호화 압축 16번 (4개) | 경마식 보도와 선거 방송 토론회 6번 (ATTRIBUTION) | 3회 생성·검토 |
| S-31 | 경마식 보도와 선거 방송 토론회 7번 / 플라스틱의 중합 반응과 물리적 성질 9번 / 오디오 신호의 디지털 저장과 지각부호화 압축 14번 (3개) | 경마식 보도와 선거 방송 토론회 4번 (없음) | 3회 생성·검토 |
| S-44 | 플라스틱의 중합 반응과 물리적 성질 8번 / 플라스틱의 중합 반응과 물리적 성질 9번 / 플라스틱의 중합 반응과 물리적 성질 10번 / 오디오 신호의 디지털 저장과 지각부호화 압축 16번 (4개) | 의식과 인지 과정에 대한 철학적 논의 12번 (없음) | 3회 생성·검토 |
| S-58 | 경마식 보도와 선거 방송 토론회 5번 / 경마식 보도와 선거 방송 토론회 6번 / 플라스틱의 중합 반응과 물리적 성질 10번 / 오디오 신호의 디지털 저장과 지각부호화 압축 17번 (4개) | 오디오 신호의 디지털 저장과 지각부호화 압축 16번 (없음) | 3회 생성·검토 |
| S-66 | 경마식 보도와 선거 방송 토론회 4번 / 플라스틱의 중합 반응과 물리적 성질 10번 / 오디오 신호의 디지털 저장과 지각부호화 압축 16번 (3개) | 경마식 보도와 선거 방송 토론회 7번 (ATTRIBUTION) | 3회 생성·검토 |

## 3·4단계: 학생별·회차별 결과 (생성 3회, 검토 3회)

secondary는 `line`과 `items`. problems는 검토가 적은 문제 전부.

| 학생 | 회 | result | kind | headline | featured 문항 | otherCases 문항 | secondary | 검토 verdict | problems |
|---|---|---|---|---|---|---|---|---|---|
| S-07 | r1 | NONE | null | null | null | (없음) | null | PASS | (없음) |
| S-07 | r2 | NONE | null | null | null | (없음) | null | PASS | (없음) |
| S-07 | r3 | NONE | null | null | null | (없음) | null | PASS | (없음) |
| S-12 | - | NONE(코드) | - | - | - | - | - | (검토 없음) | 대상 1개(<2) |
| S-23 | r1 | PATTERN | DIRECTION | 종합적으로 보면, 너는 전과 후나 어느 쪽이 더 큰지를 나타내는 말을 반대로 바꿔 읽은 경우가 있었어. | 오디오 신호의 디지털 저장과 지각부호화 압축 15번 | 플라스틱의 중합 반응과 물리적 성질 10번 / 오디오 신호의 디지털 저장과 지각부호화 압축 16번 | null | PASS | (없음) |
| S-23 | r2 | PATTERN | DIRECTION | 종합적으로 보면, 너는 문장에서 크고 작음이나 앞뒤를 나타내는 말을 반대로 바꿔 읽은 경우가 있었어. | 오디오 신호의 디지털 저장과 지각부호화 압축 15번 | 플라스틱의 중합 반응과 물리적 성질 10번 / 오디오 신호의 디지털 저장과 지각부호화 압축 16번 | null | PASS | (없음) |
| S-23 | r3 | PATTERN | DIRECTION+CONDITION | 종합적으로 보면, 너는 문장에서 높고 낮음, 넓고 좁음, 전과 후를 나타내는 말을 반대로 읽은 경우가 있었어. | 오디오 신호의 디지털 저장과 지각부호화 압축 15번 | 플라스틱의 중합 반응과 물리적 성질 10번 / 오디오 신호의 디지털 저장과 지각부호화 압축 16번 | null | PASS | (없음) |
| S-31 | r1 | NONE | null | null | null | (없음) | null | PASS | (없음) |
| S-31 | r2 | NONE | null | null | null | (없음) | null | PASS | (없음) |
| S-31 | r3 | NONE | null | null | null | (없음) | null | PASS | (없음) |
| S-44 | r1 | NONE | null | null | null | (없음) | null | FAIL | 플라스틱 8번과 9번에서 반복되는 범위 축소를 놓쳤다. 8번은 '분자 전체'의 결합을 '탄소끼리'의 결합으로 좁혀 판단했고, 9번은 '성장 과정이 종결되기 전까지 계속'을 '처음 한 번만'으로 좁혔다. 대상 범위와 시간 범위라는 차이는 있지만, 문장이 포괄하는 범위를 일부로 축소해 적용했다는 같은 종류의 변화이므로, 세부 문장 형식이 다르다는 이유로 묶지 않고 NONE으로 판정한 것은 부적절하다. |
| S-44 | r2 | NONE | null | null | null | (없음) | null | FAIL | 플라스틱 8번과 9번에서 범위를 일부로 좁혀 판단하는 변화가 반복되므로 NONE 판정은 정당하지 않음. 8번은 분자 전체의 결합을 '탄소끼리'의 결합으로 한정했고, 9번은 성장 과정이 끝나기 전까지 계속되는 발생을 '처음에 한 번만'으로 한정했음. 대상 범위와 시간 범위라는 차이만으로 별개로 배제하지 말고, 문장이 포괄하는 범위를 일부로 축소하는 같은 형식 변화로 묶어야 함. |
| S-44 | r3 | NONE | null | null | null | (없음) | null | FAIL | 플라스틱 8번과 9번에서 반복되는 범위 축소를 놓쳤다. 8번은 분자 전체의 결합을 탄소 사이의 결합으로, 9번은 성장 과정 내내 반복되는 발생을 최초 한 번의 발생으로 좁혀 판단했다. 대상 범위와 시간·횟수 범위라는 차이는 있지만, 문장이 포괄하는 범위를 일부로 제한해 적용한 동일한 종류의 형식 변화로 묶을 수 있으므로 NONE 판정은 정당하지 않다. |
| S-58 | r1 | PATTERN | CONDITION+SCOPE | 종합적으로 보면, 너는 문장의 뼈대는 잡았지만 언제까지인지, 얼마나 효율적인지처럼 뜻을 좁혀 주는 말을 빼고 읽거나 적용한 경우가 있었어. | 경마식 보도와 선거 방송 토론회 6번 | 경마식 보도와 선거 방송 토론회 5번 / 오디오 신호의 디지털 저장과 지각부호화 압축 17번 | null | PASS | (없음) |
| S-58 | r2 | PATTERN | CONDITION+SCOPE | 종합적으로 보면, 너는 문장에서 때나 정도를 정하는 말을 빼고 뼈대만 읽거나 적용한 경우가 있었어. | 경마식 보도와 선거 방송 토론회 6번 | 경마식 보도와 선거 방송 토론회 5번 / 오디오 신호의 디지털 저장과 지각부호화 압축 17번 | null | PASS | (없음) |
| S-58 | r3 | PATTERN | CONDITION+SCOPE | 종합적으로 보면, 너는 문장에서 언제까지인지, 어느 정도인지를 정하는 말을 빼고 읽거나 적용한 경우가 있었어. | 경마식 보도와 선거 방송 토론회 6번 | 경마식 보도와 선거 방송 토론회 5번 / 오디오 신호의 디지털 저장과 지각부호화 압축 17번 | null | PASS | (없음) |
| S-66 | r1 | NONE | null | null | null | (없음) | null | PASS | (없음) |
| S-66 | r2 | NONE | null | null | null | (없음) | null | PASS | (없음) |
| S-66 | r3 | NONE | null | null | null | (없음) | null | FAIL | 플라스틱 10번을 <보기> 원문이 없다는 이유만으로 제외하여 반복되는 대상 연결 변경을 놓쳤다. 제공된 chosenTwists에는 유연하고 충격에 강한 소재로 적합한 ㉮를 ㉯로 바꾼 오류가 명시되어 있고, 학생 근거에도 그 성질을 ㉯에 연결한 내용이 확인된다. 가지 구조의 정확한 대응까지 확정하지 않더라도, 성질을 다른 대상에 연결한 사례로 판단할 수 있다. 이는 오디오 16번에서 명칭을 다른 대상에 연결한 사례와 대상 연결을 바꾸는 수준에서 묶을 수 있으므로 NONE은 정당하지 않다. |

## 회차별 featured 문장 (PATTERN인 회차만)

- S-23 r1: 오디오 신호의 디지털 저장과 지각부호화 압축 15번 / sentence: 파일로 저장된, 압축 전의 오디오 신호는 소리 크기마다 할당된 비트의 개수가 동일하다. / studentQuote: 압축하고 나면 소리 크기마다 할당되는 비트 개수가 같아짐 / sourceForm: A로 저장된, B 전의 C는 D마다 할당된 E의 개수가 동일하다. / studentForm: B 후의 C는 D마다 할당된 E의 개수가 동일하다.
- S-23 r2: 오디오 신호의 디지털 저장과 지각부호화 압축 15번 / sentence: 파일로 저장된, 압축 전의 오디오 신호는 소리 크기마다 할당된 비트의 개수가 동일하다. / studentQuote: 압축하고 나면 소리 크기마다 할당되는 비트 개수가 같아짐 / sourceForm: 파일로 저장된, A 전의 B는 C마다 할당된 D의 개수가 동일하다. / studentForm: A하고 나면 C마다 할당되는 D의 개수가 같아진다.
- S-23 r3: 오디오 신호의 디지털 저장과 지각부호화 압축 15번 / sentence: 파일로 저장된, 압축 전의 오디오 신호는 소리 크기마다 할당된 비트의 개수가 동일하다. / studentQuote: 압축하고 나면 소리 크기마다 할당되는 비트 개수가 같아짐 / sourceForm: A로 저장된, B 전의 C는 D마다 할당된 E의 개수가 동일하다. / studentForm: B하고 나면 C는 D마다 할당되는 E의 개수가 같아진다.
- S-58 r1: 경마식 보도와 선거 방송 토론회 6번 / sentence: 유권자들이 뛰어난 역량을 가진 소수 정당 후보자를 주요 후보자들과 동시에 비교할 수 있는 가장 효율적인 방법이 선거 방송 초청 대상 후보자 토론회라면 ⓑ의 입장은 약화되겠군. / studentQuote: 소수 정당 후보도 토론회에서 주요 후보랑 같이 비교할 수 있으면 모든 후보를 동시에 비교 못 하게 한다는 ⓑ 비판이 안 맞게 되니까 약화되는 게 맞음 / sourceForm: A가 B를 C와 동시에 비교할 수 있는 가장 효율적인 방법이 D라면 E는 약화되겠군. / studentForm: D에서 B를 C와 동시에 비교할 수 있으면 E는 약화된다.
- S-58 r2: 경마식 보도와 선거 방송 토론회 6번 / sentence: 유권자들이 뛰어난 역량을 가진 소수 정당 후보자를 주요 후보자들과 동시에 비교할 수 있는 가장 효율적인 방법이 선거 방송 초청 대상 후보자 토론회라면 ⓑ의 입장은 약화되겠군. / studentQuote: 소수 정당 후보도 토론회에서 주요 후보랑 같이 비교할 수 있으면 모든 후보를 동시에 비교 못 하게 한다는 ⓑ 비판이 안 맞게 되니까 약화되는 게 맞음 / sourceForm: A를 B와 동시에 비교할 수 있는 가장 효율적인 방법이 C라면 D는 약화된다. / studentForm: C에서 A를 B와 동시에 비교할 수 있으면 D는 약화된다.
- S-58 r3: 경마식 보도와 선거 방송 토론회 6번 / sentence: 유권자들이 뛰어난 역량을 가진 소수 정당 후보자를 주요 후보자들과 동시에 비교할 수 있는 가장 효율적인 방법이 선거 방송 초청 대상 후보자 토론회라면 ⓑ의 입장은 약화되겠군. / studentQuote: 소수 정당 후보도 토론회에서 주요 후보랑 같이 비교할 수 있으면 모든 후보를 동시에 비교 못 하게 한다는 ⓑ 비판이 안 맞게 되니까 약화되는 게 맞음 / sourceForm: A가 B를 C와 동시에 비교할 수 있는 가장 효율적인 방법이 D라면 E는 약화된다. / studentForm: A가 D에서 B를 C와 같이 비교할 수 있으면 E는 약화된다.

## 측정 요약 (해석 아님)

| 학생 | 생성 result 3회 | 검토 verdict 3회 |
|---|---|---|
| S-07 | NONE, NONE, NONE | PASS, PASS, PASS |
| S-12 | NONE(코드) | - |
| S-23 | PATTERN(DIRECTION), PATTERN(DIRECTION), PATTERN(DIRECTION+CONDITION) | PASS, PASS, PASS |
| S-31 | NONE, NONE, NONE | PASS, PASS, PASS |
| S-44 | NONE, NONE, NONE | FAIL, FAIL, FAIL |
| S-58 | PATTERN(CONDITION+SCOPE), PATTERN(CONDITION+SCOPE), PATTERN(CONDITION+SCOPE) | PASS, PASS, PASS |
| S-66 | NONE, NONE, NONE | PASS, PASS, FAIL |


---

# v2.3 (7명) (2026-11-19)

채점은 하지 않았다. 웹 스레드가 KEY와 대조한다. KEY.md·students.py·codes.json은 읽지도 모델에 넣지도 않았다.

## 실행 조건

- 입력: 바뀐 `inputs/`(〈보기〉 `scenario` 필드 추가, S-66 문항 교체). `scenario`는 가공 없이 생성·검토 입력 JSON에 그대로 들어간다(`inputs-filtered/S-xx-v2.3.json`에 `scenario`가 있는 항목: S-07 0개, S-12 0개, S-23 1개, S-31 0개, S-44 1개, S-58 2개, S-66 2개).
- 1단계 사고 진단: **S-66만 새로 실행**(4회, `--fresh-diagnosis`, 문항 교체 때문), 나머지 6명은 `runs/`의 기존 진단 재사용(문항 목록이 기존 진단과 일치함을 확인). S-66의 이전 진단은 `runs/S-66.diagnosis-before-input-change.json`에 복사해 두었다.
- 2단계 거르기: 태그만(단계 제한 없음). 태그 ∈ {CONDITION, SCOPE, DIRECTION, POLARITY, REFERENT, MAPPING, PARAPHRASE_DISTANCE, MISREAD_FACT}. 대상이 서로 다른 문항 2개 미만이면 호출 없이 NONE.
- 3·4단계: `PROMPT-v2.3.md`, `gpt-6.1-sol`(reasoning medium), 학생당 생성 3회 + 각 생성에 대한 검토 3회. 결과 `runs/S-xx-v2.3-rN.gen.json`, `runs/S-xx-v2.3-rN.review.json`(원본 출력 전체는 이 파일들에 있다).
- 호출: 사고 진단 4 + 생성 18 + 검토 18 = 40회(S-12는 대상 1개라 호출 없음). 누적 추정 비용 약 $1.02(가정 단가 입력 $2/M·출력 $10/M, 승인 상한 $2).
- 중간 실패: 첫 일괄 실행에서 S-23·S-31·S-44·S-58이 네트워크 오류(DNS 조회 실패 `ENOTFOUND api.openai.com`, `ETIMEDOUT`)로 호출에 실패했다. 저장된 결과가 없어 이 4명만 같은 조건으로 다시 실행했다. 재실행 전에 네트워크 오류도 호출당 최대 2회 재시도하도록 `run-one.mjs`를 고쳤다(그 전에는 서버 오류 429·5xx만 재시도).

## 1단계: 사고 진단 태그 (S-66 새 실행. 나머지 6명은 v2.2 절 표와 같음)

| 문항 | outcomeType | errors (step / tag) |
|---|---|---|
| 의식과 인지 과정에 대한 철학적 논의 16번 | ERROR | S4_INTERPRET / REFERENT |
| 경마식 보도와 선거 방송 토론회 4번 | ERROR | S2_CHOICE / MISREAD_FACT |
| 플라스틱의 중합 반응과 물리적 성질 10번 | ERROR | S1_STEM / REFERENT |
| 오디오 신호의 디지털 저장과 지각부호화 압축 16번 | ERROR | S4_INTERPRET / MISREAD_FACT |

## 2단계 거르기 결과

| 학생 | 대상 문항(서로 다른 문항 수) | 제외 문항 (태그) | 생성·검토 |
|---|---|---|---|
| S-07 | 의식과 인지 과정에 대한 철학적 논의 15번 / 경마식 보도와 선거 방송 토론회 5번 (2개) | 경마식 보도와 선거 방송 토론회 7번 (없음) / 플라스틱의 중합 반응과 물리적 성질 8번 (OUTSIDE_KNOWLEDGE) / 오디오 신호의 디지털 저장과 지각부호화 압축 15번 (OUTSIDE_KNOWLEDGE) | 3회 생성·검토 |
| S-12 | 의식과 인지 과정에 대한 철학적 논의 14번 (1개) | 의식과 인지 과정에 대한 철학적 논의 13번 (ATTRIBUTION) / 의식과 인지 과정에 대한 철학적 논의 15번 (ATTRIBUTION) / 플라스틱의 중합 반응과 물리적 성질 9번 (없음) / 오디오 신호의 디지털 저장과 지각부호화 압축 16번 (없음) | 호출 없음(대상 2개 미만 → NONE) |
| S-23 | 경마식 보도와 선거 방송 토론회 7번 / 플라스틱의 중합 반응과 물리적 성질 10번 / 오디오 신호의 디지털 저장과 지각부호화 압축 15번 / 오디오 신호의 디지털 저장과 지각부호화 압축 16번 (4개) | 경마식 보도와 선거 방송 토론회 6번 (ATTRIBUTION) | 3회 생성·검토 |
| S-31 | 경마식 보도와 선거 방송 토론회 7번 / 플라스틱의 중합 반응과 물리적 성질 9번 / 오디오 신호의 디지털 저장과 지각부호화 압축 14번 (3개) | 경마식 보도와 선거 방송 토론회 4번 (없음) | 3회 생성·검토 |
| S-44 | 플라스틱의 중합 반응과 물리적 성질 8번 / 플라스틱의 중합 반응과 물리적 성질 9번 / 플라스틱의 중합 반응과 물리적 성질 10번 / 오디오 신호의 디지털 저장과 지각부호화 압축 16번 (4개) | 의식과 인지 과정에 대한 철학적 논의 12번 (없음) | 3회 생성·검토 |
| S-58 | 경마식 보도와 선거 방송 토론회 5번 / 경마식 보도와 선거 방송 토론회 6번 / 플라스틱의 중합 반응과 물리적 성질 10번 / 오디오 신호의 디지털 저장과 지각부호화 압축 17번 (4개) | 오디오 신호의 디지털 저장과 지각부호화 압축 16번 (없음) | 3회 생성·검토 |
| S-66 | 의식과 인지 과정에 대한 철학적 논의 16번 / 경마식 보도와 선거 방송 토론회 4번 / 플라스틱의 중합 반응과 물리적 성질 10번 / 오디오 신호의 디지털 저장과 지각부호화 압축 16번 (4개) |  | 3회 생성·검토 |

## 3·4단계: 학생별·회차별 결과 (생성 3회, 검토 3회)

secondary는 `line`과 `items`. problems는 검토가 적은 문제 전부.

| 학생 | 회 | result | kind | strength | headline | featured 문항 | otherCases 문항 | secondary | 검토 verdict | problems |
|---|---|---|---|---|---|---|---|---|---|---|
| S-07 | r1 | NONE | null | null | null | null | (없음) | null | PASS | (없음) |
| S-07 | r2 | NONE | null | null | null | null | (없음) | null | PASS | (없음) |
| S-07 | r3 | NONE | null | null | null | null | (없음) | null | PASS | (없음) |
| S-12 | - | NONE(코드) | - | - | - | - | - | - | (검토 없음) | 대상 1개(<2) |
| S-23 | r1 | PATTERN | DIRECTION | THREE_PLUS | 이번 진단에서는 '높아진다·넓다'를 반대로 읽거나 '전'을 '후'로 바꿔 읽은 경우가 여러 번 있었어. | 오디오 신호의 디지털 저장과 지각부호화 압축 15번 | 플라스틱의 중합 반응과 물리적 성질 10번 / 오디오 신호의 디지털 저장과 지각부호화 압축 16번 | null | PASS | (없음) |
| S-23 | r2 | PATTERN | DIRECTION+CONDITION | THREE_PLUS | 이번 진단에서는 늘고 줄거나 넓고 좁은 관계, 일의 전후를 나타내는 말을 반대로 읽은 경우가 여러 번 있었어. | 오디오 신호의 디지털 저장과 지각부호화 압축 15번 | 플라스틱의 중합 반응과 물리적 성질 10번 / 오디오 신호의 디지털 저장과 지각부호화 압축 16번 | null | FAIL | strength가 THREE_PLUS인데 headline은 '이번 진단에서는 … 여러 번 있었어'라는 사례 발생 사실만 진술하고 있어, 3개 이상이면 경향을 표현한다는 말투 규칙에 맞지 않는다. |
| S-23 | r3 | PATTERN | DIRECTION | THREE_PLUS | 이번 진단에서는 커지는지 작아지는지, 어느 쪽이 더 넓은지, 전인지 후인지를 거꾸로 읽은 경우가 여러 번 있었어. | 오디오 신호의 디지털 저장과 지각부호화 압축 15번 | 플라스틱의 중합 반응과 물리적 성질 10번 / 오디오 신호의 디지털 저장과 지각부호화 압축 16번 | null | PASS | (없음) |
| S-31 | r1 | NONE | null | null | null | null | (없음) | null | PASS | (없음) |
| S-31 | r2 | NONE | null | null | null | null | (없음) | null | PASS | (없음) |
| S-31 | r3 | NONE | null | null | null | null | (없음) | null | PASS | (없음) |
| S-44 | r1 | NONE | null | null | null | null | (없음) | null | FAIL | 플라스틱 8번과 9번에서 반복된 범위 축소를 놓쳤다. 8번은 분자 전체의 결합을 탄소끼리의 결합으로, 9번은 종결 전까지 계속되는 발생을 최초 한 번의 발생으로 좁혔다. 대상 범위와 시간 범위라는 차이는 있지만, 문장이 포괄하는 범위를 일부로 제한해 판단한 동일한 형식 변화로 묶을 수 있으므로 NONE은 정당하지 않다. ; 다른 문항에서 한정이나 대상을 정확히 읽었다는 반례는 습관을 전반적 경향으로 단정하지 않을 근거이지, 두 문항에서 확인된 형식 변화 자체를 배제할 근거는 아니다. |
| S-44 | r2 | NONE | null | null | null | null | (없음) | null | FAIL | 플라스틱 8번과 9번에서 반복되는 범위 축소를 놓쳤다. 8번은 '분자 전체'를 '탄소끼리'로, 9번은 '성장 과정이 종결되기 전까지 계속'을 '처음에 한 번만'으로 좁혀 판단했다. 범위가 적용되는 대상과 시간이 다르더라도 문장에 제시된 범위를 일부로 축소하는 같은 형식 변화로 묶을 수 있으므로, 읽기 동작이 다르다는 이유로 NONE을 판정한 것은 부적절하다. |
| S-44 | r3 | NONE | null | null | null | null | (없음) | null | FAIL | 플라스틱 8번과 9번에서 반복되는 범위 축소를 놓쳤다. 8번은 분자 전체의 결합을 탄소끼리의 결합으로 좁혀 판단했고, 9번은 성장 과정이 종결되기 전까지 계속되는 발생을 처음 한 번으로 좁혔다. 제한되는 것이 각각 대상과 시간이라는 차이는 있지만, 문장이 포괄하는 범위를 일부로 좁혀 판단한다는 같은 종류의 형식 변화로 묶을 수 있으므로 NONE은 정당하지 않다. |
| S-58 | r1 | PATTERN | CONDITION+SCOPE | THREE_PLUS | 이번 진단에서는 문장에서 때나 정도를 정하는 말을 빼고, 남은 내용만으로 판단한 경우가 여러 번 있었어. | 경마식 보도와 선거 방송 토론회 6번 | 경마식 보도와 선거 방송 토론회 5번 / 오디오 신호의 디지털 저장과 지각부호화 압축 17번 | null | PASS | (없음) |
| S-58 | r2 | PATTERN | CONDITION+SCOPE | THREE_PLUS | 이번 진단에서는 언제까지인지, 어느 때인지, 얼마나 효율적인지를 정하는 말을 빼고 문장의 뼈대만으로 판단한 경우가 여러 번 있었어. | 경마식 보도와 선거 방송 토론회 6번 | 경마식 보도와 선거 방송 토론회 5번 / 오디오 신호의 디지털 저장과 지각부호화 압축 17번 | null | PASS | (없음) |
| S-58 | r3 | PATTERN | CONDITION+SCOPE | THREE_PLUS | 이번 진단에서 문장이 언제, 어떤 경우에 성립하는지 정하는 말을 빼고 읽거나 적용한 경우가 여러 번 있었어. | 경마식 보도와 선거 방송 토론회 6번 | 경마식 보도와 선거 방송 토론회 5번 / 오디오 신호의 디지털 저장과 지각부호화 압축 17번 | null | PASS | (없음) |
| S-66 | r1 | PATTERN | MAPPING+REFERENT | TWO | 이번 진단에서 이름이나 기호에 붙은 행동·역할을 다른 대상의 것으로 바꿔 읽은 곳이 두 번 있었어. | 오디오 신호의 디지털 저장과 지각부호화 압축 16번 | 의식과 인지 과정에 대한 철학적 논의 16번 | null | PASS | (없음) |
| S-66 | r2 | PATTERN | MAPPING+REFERENT | TWO | 이번 진단에서 이름이나 기호에 붙은 역할을 다른 대상의 역할로 바꿔 읽은 곳이 두 번 있었어. | 의식과 인지 과정에 대한 철학적 논의 16번 | 오디오 신호의 디지털 저장과 지각부호화 압축 16번 | null | PASS | (없음) |
| S-66 | r3 | PATTERN | MAPPING+REFERENT | TWO | 이번 진단에서 이름이나 기호에 연결된 대상을 다른 대상으로 바꿔 읽은 곳이 두 번 있었어. | 오디오 신호의 디지털 저장과 지각부호화 압축 16번 | 의식과 인지 과정에 대한 철학적 논의 16번 | null | PASS | (없음) |

## 회차별 featured 문장 (PATTERN인 회차만)

- S-23 r1: 오디오 신호의 디지털 저장과 지각부호화 압축 15번 / sentence: 파일로 저장된, 압축 전의 오디오 신호는 소리 크기마다 할당된 비트의 개수가 동일하다. / studentQuote: 압축하고 나면 소리 크기마다 할당되는 비트 개수가 같아짐 / sourceForm: A로 저장된, B 전의 C는 D마다 할당된 E의 개수가 동일하다. / studentForm: B하고 나면 D마다 할당되는 E의 개수가 같아진다.
- S-23 r2: 오디오 신호의 디지털 저장과 지각부호화 압축 15번 / sentence: 파일로 저장된, 압축 전의 오디오 신호는 소리 크기마다 할당된 비트의 개수가 동일하다. / studentQuote: 압축하고 나면 소리 크기마다 할당되는 비트 개수가 같아짐 / sourceForm: A로 저장된, B 전의 C는 D마다 할당된 E의 개수가 동일하다. / studentForm: B하고 나면 D마다 할당되는 E의 개수가 같아진다.
- S-23 r3: 오디오 신호의 디지털 저장과 지각부호화 압축 15번 / sentence: 파일로 저장된, 압축 전의 오디오 신호는 소리 크기마다 할당된 비트의 개수가 동일하다. / studentQuote: 압축하고 나면 소리 크기마다 할당되는 비트 개수가 같아짐 / sourceForm: A로 저장된, B 전의 C는 D마다 할당된 E의 개수가 동일하다. / studentForm: B하고 나면 C는 D마다 할당되는 E의 개수가 동일해진다.
- S-58 r1: 경마식 보도와 선거 방송 토론회 6번 / sentence: 유권자들이 뛰어난 역량을 가진 소수 정당 후보자를 주요 후보자들과 동시에 비교할 수 있는 가장 효율적인 방법이 선거 방송 초청 대상 후보자 토론회라면 ⓑ의 입장은 약화되겠군. / studentQuote: 소수 정당 후보도 토론회에서 주요 후보랑 같이 비교할 수 있으면 모든 후보를 동시에 비교 못 하게 한다는 ⓑ 비판이 안 맞게 되니까 약화되는 게 맞음 / sourceForm: A가 B를 C와 동시에 비교할 수 있는 가장 효율적인 방법이 D라면 E의 입장은 약화된다. / studentForm: A가 D에서 B를 C와 동시에 비교할 수 있으면 E의 입장은 약화된다.
- S-58 r2: 경마식 보도와 선거 방송 토론회 6번 / sentence: 유권자들이 뛰어난 역량을 가진 소수 정당 후보자를 주요 후보자들과 동시에 비교할 수 있는 가장 효율적인 방법이 선거 방송 초청 대상 후보자 토론회라면 ⓑ의 입장은 약화되겠군. / studentQuote: 소수 정당 후보도 토론회에서 주요 후보랑 같이 비교할 수 있으면 모든 후보를 동시에 비교 못 하게 한다는 ⓑ 비판이 안 맞게 되니까 약화되는 게 맞음 / sourceForm: A가 B를 C와 동시에 비교할 수 있는 가장 효율적인 방법이 D라면 E의 입장은 약화되겠군. / studentForm: A가 D에서 B를 C와 동시에 비교할 수 있으면 E의 입장은 약화된다.
- S-58 r3: 경마식 보도와 선거 방송 토론회 6번 / sentence: 유권자들이 뛰어난 역량을 가진 소수 정당 후보자를 주요 후보자들과 동시에 비교할 수 있는 가장 효율적인 방법이 선거 방송 초청 대상 후보자 토론회라면 ⓑ의 입장은 약화되겠군. / studentQuote: 소수 정당 후보도 토론회에서 주요 후보랑 같이 비교할 수 있으면 모든 후보를 동시에 비교 못 하게 한다는 ⓑ 비판이 안 맞게 되니까 약화되는 게 맞음 / sourceForm: A가 B를 C와 동시에 비교할 수 있는 가장 효율적인 방법이 D라면 ⓑ의 입장은 약화된다. / studentForm: A가 B를 C와 동시에 비교할 수 있으면 ⓑ의 입장은 약화된다.
- S-66 r1: 오디오 신호의 디지털 저장과 지각부호화 압축 16번 / sentence: 한편, 큰 소리로 인해 작은 소리가 들리지 않는 현상을 차폐라고 하며 차폐를 일으키는 큰 소리를 차폐음이라 한다. / studentQuote: 큰 소리 때문에 들리지 않게 되는 작은 소리를 차폐음이라고 했음 / sourceForm: B로 인해 C가 들리지 않는 현상을 A라고 하며 A를 일으키는 B를 D라 한다. / studentForm: B로 인해 들리지 않게 되는 C를 D라 한다.
- S-66 r2: 의식과 인지 과정에 대한 철학적 논의 16번 / sentence: A는 막대기로 주변을 더듬어 사물의 위치를 파악한다. / studentQuote: 막대기로 더듬는 사람은 B고 A는 BCI로 정보를 받으니까 막대기가 A의 몸의 일부라는 건 틀림 / sourceForm: A는 C로 D한다. / studentForm: B는 C로 D한다.
- S-66 r3: 오디오 신호의 디지털 저장과 지각부호화 압축 16번 / sentence: 한편, 큰 소리로 인해 작은 소리가 들리지 않는 현상을 차폐라고 하며 차폐를 일으키는 큰 소리를 차폐음이라 한다. / studentQuote: 큰 소리 때문에 들리지 않게 되는 작은 소리를 차폐음이라고 했음 / sourceForm: A로 인해 B가 들리지 않는 현상을 C라고 하며 C를 일으키는 A를 D라 한다. / studentForm: A로 인해 들리지 않게 되는 B를 D라 한다.

## 측정 요약 (해석 아님)

| 학생 | 생성 result 3회 (kind / strength) | 검토 verdict 3회 |
|---|---|---|
| S-07 | NONE, NONE, NONE | PASS, PASS, PASS |
| S-12 | NONE(코드) | - |
| S-23 | PATTERN(DIRECTION / THREE_PLUS), PATTERN(DIRECTION+CONDITION / THREE_PLUS), PATTERN(DIRECTION / THREE_PLUS) | PASS, FAIL, PASS |
| S-31 | NONE, NONE, NONE | PASS, PASS, PASS |
| S-44 | NONE, NONE, NONE | FAIL, FAIL, FAIL |
| S-58 | PATTERN(CONDITION+SCOPE / THREE_PLUS), PATTERN(CONDITION+SCOPE / THREE_PLUS), PATTERN(CONDITION+SCOPE / THREE_PLUS) | PASS, PASS, PASS |
| S-66 | PATTERN(MAPPING+REFERENT / TWO), PATTERN(MAPPING+REFERENT / TWO), PATTERN(MAPPING+REFERENT / TWO) | PASS, PASS, PASS |


## v2.4 (S-58·S-23·S-66, 학생당 3회)

실행: `PROMPT-v2.4.md`, 거르기 태그만, 사고 진단은 저장본 재사용(재호출 없음), 생성·검토 각 1회씩 ×3. 누적 비용 약 $0.55(가정 단가, 상한 $1). 채점 없음.

### S-58 (거르기: 대상 4개, 제외 1개)

| run | result/kind | featured 문항 | sentence | sourceForm | studentForm | changed | 검토 | problems |
|---|---|---|---|---|---|---|---|---|
| r1 | PATTERN/CONDITION+SCOPE | 경마식 보도와 선거 방송 토론회 5번 | ｢공직선거법｣의 규정에 따르면, 당선인을 예상케 하는 여론조사를 실시하는 것은 언제든지 가능하지만, 그 결과의 보도는 선거일 6일 전부터 **투표 마감 시각까지** 금지된다. | … 보도는 선거일 6일 전부터 **투표 마감 시각까지** 금지된다. | … 보도는 선거일에는 금지된다. | 투표 마감 시각까지 | PASS | - |
| r2 | PATTERN/CONDITION+SCOPE | 경마식 보도와 선거 방송 토론회 6번 | 유권자들이 뛰어난 역량을 가진 소수 정당 후보자를 주요 후보자들과 동시에 비교할 수 있는 **가장 효율적인 방법이** 선거 방송 초청 대상 후보자 토론회라면 ⓑ의 입장은 약화되겠군. | A가 …동시에 비교할 수 있는 **가장 효율적인 방법이라면** … | A에서 …같이 비교할 수 있으면 … | 가장 효율적인 방법이라면 → 비교할 수 있으면 | FAIL | 경마식 보도와 선거 방송 토론회 6번의 sourceForm은 원문의 '가장 효율적인 방법이 … 토론회라면'을 '가장 효율적인 방법이라면'으로 재구성했다. 또한 featured.sentence에서 굵게 표시한 '가장 효율적인 방법이'와 sourceForm의 굵은 부분 및 featured.changed의 '가장 효율적인 방법이라면'이 일치하지 않는다. |
| r3 | PATTERN/CONDITION+SCOPE | 경마식 보도와 선거 방송 토론회 6번 | 유권자들이 뛰어난 역량을 가진 소수 정당 후보자를 주요 후보자들과 동시에 비교할 수 있는 **가장 효율적인 방법이** 선거 방송 초청 대상 후보자 토론회라면 ⓑ의 입장은 약화되겠군. | … 동시에 비교할 수 있는 **가장 효율적인 방법이** A라면 … | … A에서 동시에 비교할 수 있으면 … | 가장 효율적인 방법 | PASS | - |

### S-23 (거르기: 대상 4개, 제외 1개)

| run | result/kind | featured 문항 | sentence | sourceForm | studentForm | changed | 검토 | problems |
|---|---|---|---|---|---|---|---|---|
| r1 | PATTERN/DIRECTION | 오디오 신호의 디지털 저장과 지각부호화 압축 15번 | 파일로 저장된, **압축 전의** 오디오 신호는 소리 크기마다 할당된 비트의 개수가 동일하다. | … **압축 전의** 오디오 신호는 … 비트의 개수가 동일하다 | … 압축 후의 오디오 신호는 … 비트의 개수가 동일하다 | 압축 전 → 압축 후 | PASS | - |
| r2 | PATTERN/DIRECTION+CONDITION | 오디오 신호의 디지털 저장과 지각부호화 압축 15번 | 파일로 저장된, **압축 전의** 오디오 신호는 소리 크기마다 할당된 비트의 개수가 동일하다. | … **압축 전의** 오디오 신호는 … 비트의 개수가 동일하다. | 압축하고 나면 … 비트의 개수가 같아진다. | 압축 전의 → 압축하고 나면 | FAIL | 경마식 보도 7번의 studentForm과 changed가 학생 근거보다 강하게 일반화되어 있다. 학생은 '14일 전에 1위 2위 3위 순서로 보도하는 건 ㉯ 위반'이라고 특정 사례를 판단했을 뿐, 서열 보도 자체가 언제나 금지된다고 말하지 않았다. 따라서 '오차 범위 내'와 '이를 밝히지 않은 채로'라는 한정을 모두 삭제했다고 단정한 형식은 학생 근거에서 직접 확인되지 않는다. |
| r3 | PATTERN/DIRECTION | 오디오 신호의 디지털 저장과 지각부호화 압축 15번 | 파일로 저장된, **압축 전의** 오디오 신호는 소리 크기마다 할당된 비트의 개수가 동일하다. | … **압축 전의** 오디오 신호는 … 비트의 개수가 동일하다 | 압축하고 나면 … 비트의 개수가 같아진다 | 압축 전 → 압축하고 난 뒤 | PASS | - |

### S-66 (거르기: 대상 4개, 제외 0개)

| run | result/kind | featured 문항 | sentence | sourceForm | studentForm | changed | 검토 | problems |
|---|---|---|---|---|---|---|---|---|
| r1 | PATTERN/MAPPING | 의식과 인지 과정에 대한 철학적 논의 16번 | **A**는 막대기로 주변을 더듬어 사물의 위치를 파악한다. | **A**는 막대기로 … 위치를 파악한다 | B는 막대기로 … 위치를 파악한다 | A → B | PASS | - |
| r2 | PATTERN/MAPPING | 의식과 인지 과정에 대한 철학적 논의 16번 | **A**는 막대기로 주변을 더듬어 사물의 위치를 파악한다. | **A**는 막대기로 … 파악한다 | B는 막대기로 … 파악한다 | A → B | PASS | - |
| r3 | PATTERN/MAPPING | 오디오 신호의 디지털 저장과 지각부호화 압축 16번 | 한편, 큰 소리로 인해 작은 소리가 들리지 않는 현상을 차폐라고 하며 **차폐를 일으키는 큰 소리**를 차폐음이라 한다. | **차폐를 일으키는 큰 소리**를 차폐음이라 한다 | 큰 소리 때문에 들리지 않는 작은 소리를 차폐음이라 한다 | 차폐를 일으키는 큰 소리 → 들리지 않는 작은 소리 | PASS | - |

