# 사고 진단 라벨 가이드 v0

학생 한 명의 풀이(선택한 선지 + 근거 설명)를 보고, **어느 논리 단계에서 성공·실패했는지**와 **어떤 함정 유형에 걸렸는지**를 판정한다.
사람 라벨러(Claude, Codex)와 AI 분류기가 같은 가이드를 쓴다. 판정 근거는 학생이 **실제로 쓴 말**과 선택뿐이다. 쓰지 않은 생각을 추측하지 않는다.

## 1. 결과 유형 `outcomeType` (하나)

| 값 | 뜻 |
|---|---|
| `NONE` | 명시 오류가 없고, 선택 판단에 필요한 연결이 드러난다 |
| `ERROR` | 원문·선지 내용에 대한 명시적 오류가 하나 이상 있다(선택이 정답이어도) |
| `INSUFFICIENT` | 틀린 말은 없지만 선지 판단과 연결되지 않거나, 학생이 연결을 모른다고 밝혔다 |
| `POLARITY_MISMATCH` | 내용 이해는 맞는데 발문 방향(적절한/적절하지 않은)과 선택이 충돌한다 |
| `SELF_CONTRADICTION` | 서로 모순되는 진술을 함께 해서 학생의 판단을 확정할 수 없다 |

명시 오류와 "모른다"가 함께 있으면 `ERROR`로 두고 오류를 기록한다.

## 2. 논리 단계 `steps` (다섯 칸 모두)

| 단계 | 확인하는 것 |
|---|---|
| `S1_STEM` 발문 처리 | 발문의 방향(적절한/적절하지 않은)과 기호·지시 대상을 맞게 다뤘는가 |
| `S2_CHOICE` 선지 해석 | 선지가 무엇을 주장하는지 정확히 읽었는가 |
| `S3_LOCATE` 근거 위치 | 판단에 필요한 원문(지문·〈보기〉·그림) 부분을 찾았는가 |
| `S4_INTERPRET` 근거 해석 | 그 원문 내용을 정확히 이해했는가(방향·주체·조건·범위) |
| `S5_JUDGE` 대조·판정 | 선지와 근거를 연결해 정오를 판정했는가 |

각 칸의 값: `PASS`(풀이에 성공이 드러남) / `FAIL`(풀이에 실패가 드러남) / `NOT_OBSERVED`(풀이만으로 알 수 없음).
드러나지 않은 단계는 `PASS`로 추정하지 않는다. `firstFailedStep`은 `FAIL`인 첫 단계, 없으면 `null`.

## 3. 오류 목록 `errors`

`outcomeType`이 `ERROR` 또는 `POLARITY_MISMATCH`일 때만 채운다. 독립된 오류마다 하나씩 적는다.
`{ "tag": <함정 유형>, "step": <S1~S5>, "studentQuote": <학생 풀이의 해당 구절 그대로> }`

함정 유형(하나):

| 태그 | 뜻 |
|---|---|
| `POLARITY` | 발문의 적절/부적절 방향 처리 실패 |
| `REFERENT` | 기호·지시 대상 혼동 |
| `ATTRIBUTION` | 입장·주체 귀속 혼동 |
| `DIRECTION` | 인과·논리·증감 방향 오독 |
| `CONDITION` | 조건·한정 누락 |
| `SCOPE` | 범위 과잉 일반화·축소 |
| `MAPPING` | 〈보기〉 사례를 지문 개념에 잘못 대응 |
| `SURFACE_MATCH` | 표면적 어휘 일치에 기대 판단 |
| `PARAPHRASE_DISTANCE` | 맞는 내용을 재진술이 멀어 틀렸다고 판단 |
| `MULTI_STEP` | 여러 근거를 결합하다 이탈 |
| `OUTSIDE_KNOWLEDGE` | 배경지식·상식에 기대 판단 |
| `MISREAD_FACT` | 위에 해당하지 않는 단순 사실 오독(동일시, 값·속성 오인 등) |

## 4. 출력 형식 (풀이 하나당)

```json
{ "caseId": "M2", "outcomeType": "ERROR",
  "steps": { "S1_STEM": "PASS", "S2_CHOICE": "PASS", "S3_LOCATE": "PASS", "S4_INTERPRET": "FAIL", "S5_JUDGE": "NOT_OBSERVED" },
  "firstFailedStep": "S4_INTERPRET",
  "errors": [ { "tag": "DIRECTION", "step": "S4_INTERPRET", "studentQuote": "pH가 높아지면 수소 이온 농도가 높아져서" } ],
  "note": "한 문장 근거" }
```
