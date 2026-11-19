# 오답 카드 생성 지시문 v1 (초안, 2026-11-19)

- 목적: 진단 결과 ② 오답 카드의 **1층 한 문장, 2층 근거 짝, 3층 출제자 의도**를 문항 하나당 한 번 호출로 만든다.
- 카드 틀: `docs/handoffs/2026-11-19-wrong-answer-card-3-layer.md`
- 상태: 초안. 웹 스레드가 이 지시문대로 손으로 5장을 먼저 만들었다(`HAND-CARDS.md`). Ghootae 판정 후 CLI에서 같은 5장을 모델로 돌린다.

## 코드가 미리 정하는 것 (모델에 맡기지 않음)

`case`는 코드가 정해서 입력에 넣는다.

| case | 조건 |
|---|---|
| `WRONG_PROVIDED` | 오답 + 첫 응답 근거 있음 + 발문 "적절한 것" |
| `WRONG_OMITTED` | 오답 + 첫 응답 근거 없음 |
| `WRONG_TRUE_CHOSEN` | 오답 + 발문 "적절하지 않은 것" (고른 선지는 맞는 말) |
| `CORRECT_WEAK` | 정답 + 첫 근거 판정 INSUFFICIENT 또는 ERROR |

선택률·정답률, 기호 목록(지문의 ㉠ⓐ 등과 그 위치)도 코드가 넣는다.

## 입력

```
case, item(지문 이름·번호), stem, stemPolarity,
chosen {position, text}, answer {position, text},
studentRationale  // 첫 응답만. WRONG_OMITTED면 없음
rationaleJudgment // CORRECT_WEAK만
chosenTwists[] / answerTwists[] {twistDetail, choiceQuote, evidenceQuote}
passage           // 지문 원문
examinerStrategy  // 있으면 (출제자 전략 글)
```

## 출력 (JSON)

```
{
  "layer1": "1층 문장 (2문장 이내, 130자 이내)",
  "symbolGlosses": [{"symbol": "㉠", "gloss": "30자 이내 내용 풀이"}],
  "pair": {
    "top": "WRONG_OMITTED면 선지에서 맞는 부분(선지 그대로 인용), 아니면 학생 근거 그대로(어긋난 부분만 **굵게**)",
    "source": "지문 문장 하나, 글자 그대로",
    "conclusion": "그래서 한 줄"
  },
  "missedAnswer": {"text": "정답 선지에서 틀린 곳 한 줄", "source": "지문 문장 그대로"},   // WRONG_TRUE_CHOSEN만
  "examinerIntent": "3층, 1~2문장",
  "matchesTrap": true,           // 학생 근거가 출제자가 비튼 곳과 같은 곳에서 어긋났는가 (근거 있을 때만)
  "selfCheckOptions": ["…", "…", "…"]   // WRONG_OMITTED만, 버튼 3개
}
```

## 규칙

1. **1층 순서는 "맞은 데까지 → 갈린 곳".** 맞은 부분은 실제로 맞아야 한다. 맞은 게 없으면 갈린 곳부터 쓴다. 지어내지 않는다.
2. **근거가 없으면 학생 생각을 짐작하지 않는다.** 1층은 선지 기준("⑤는 …까지는 맞아. 그런데 …")으로 쓴다.
3. **학생 근거가 출제자 함정과 다른 곳에서 어긋났으면** 1층은 학생의 실제 실수를 짚는다. 3층 `examinerIntent`에서 "너는 그 함정에 바로 걸린 게 아니라, …해서 같은 곳에 도착했어"로 잇는다.
4. **범주 이름을 쓰지 않는다.** 금지 예: 뒤집기, 비틂, 함정 유형, 조건 축소, 범위, 방향, 긍정·부정, 인과 왜곡, 상식 개입. 무엇을 무엇으로 읽었는지 내용으로 쓴다.
5. **원문은 2층 `source`에 한 번만** 글자 그대로 넣는다. 1층은 원문을 풀어 말해도 되지만 같은 문장을 통째로 인용하지 않는다.
6. **기호 풀이는 1층에 나온 기호만** `symbolGlosses`에 넣는다. 1층·2층·3층 본문에는 기호 뒤에 괄호 설명을 붙이지 않는다.
7. **`pair.top`의 학생 근거는 글자 그대로** 옮기고, 어긋난 부분만 `**…**`로 굵게 한다.
8. `CORRECT_WEAK`: 1층은 "답은 맞았는데 근거에서 …"로 시작하고, 다음에 흔들릴 수 있는 지점을 2층 `conclusion`에 쓴다.
9. `WRONG_TRUE_CHOSEN`: 1층은 "고른 선지가 왜 맞는 말인지 + 학생이 무엇으로 판단했는지", `missedAnswer`로 진짜 틀린 선지를 짚는다. `examinerIntent`는 진짜 틀린 선지에 대해 쓴다.
10. 말투: 반말, 학생을 "너"로. 판정·훈계 말투 금지("주의해야 해" 대신 무엇을 읽었는지).

## 코드 검사 (생성 뒤)

- `source`, `missedAnswer.source`가 지문에 글자 그대로 있는가
- `pair.top`에서 `**`를 뺀 글이 학생 근거(또는 선지)에 글자 그대로 있는가
- 금지어(규칙 4)가 없는가, 1층 130자 이내인가
- `symbolGlosses`의 기호가 모두 1층에 나오는가, 2·3층에 "기호(" 형태가 없는가
- 실패하면 1회 다시 생성, 그래도 실패면 카드는 11/17 형식(선지·원문만)으로 대체
