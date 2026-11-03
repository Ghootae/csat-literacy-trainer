# 1차 판정 지시: luna 출력의 기호 오독

## 배경

`batches/batch-N.jsonl`의 각 줄은 문제 풀이 판정 모델(luna)이 쓴 출력 하나다. 학생이 수능 국어 문항을
풀고 쓴 근거(`studentText`)를 luna가 판정하며 남긴 문장 칸이 `fields`([{path, text}])에 있다.
`studentEvidence`·`sourceEvidence`·`quote` 같은 인용 칸은 이미 빠져 있다.

할 일: luna **자신이 단정한 문장**에서 기호(ⓐ~ⓔ, (가)~(다))가 가리키는 대상·뜻을 원자료와 다르게 썼는지
판정한다. 기준은 `../MARKER-KEY.md`(기호 정답표)뿐이다. 반드시 먼저 읽는다. 정답표의 **핵심 기호**만 판정한다.

## 오독의 종류

- **A**: 한 기호의 지시 대상·뜻을 정답표와 다르게 씀.
  예(공손룡): "ⓓ는 빨간 옷이 필요한데 없다는 뜻" — ⓓ는 한정하지 않은 일반적인 옷이므로 A.
- **B**: 기호끼리의 관계를 정답표와 다르게 씀.
  예: "ⓓ와 ⓔ는 같은 대상을 가리킨다"를 luna가 사실로 단정 — B.
- **C**(따로 적기만): 기호와 무관한 원문·선지 오독이 눈에 띄면 적는다. 찾으러 다니지는 않는다.

## 오독이 아닌 것 (중요)

- **학생 주장을 옮긴 문장**: "학생은 ⓓ가 빨간 옷이라고 했다", 재구성 경로(`reconstructedPath`)처럼 학생의
  (틀린) 주장을 그대로 옮긴 것. luna가 그 주장이 맞다고 단정하지 않는 한 오독이 아니다.
  단, 학생의 틀린 주장을 luna가 "맞다/원문과 일치한다"고 인정하면 A 또는 B다.
- **선지 내용을 옮긴 문장**: "④는 ⓓ와 ⓔ가 같은 대상을 지시한다고 말한다"처럼 선지 주장을 소개만 한 것.
- **교정 질문의 오답 보기**: "ⓓ는 일반적인 옷일까, 빨간 옷일까?"처럼 정답 보기와 오답 보기를 함께 낸
  질문은 정상이다. 보기 가운데 **정답표와 맞는 보기가 하나도 없거나**, 질문의 전제가 틀렸으면 A/B다.
- 정답표보다 덜 자세하거나 다른 말로 바꿔 쓴 것(뜻이 같으면 정상).
- 참고 기호(정답표의 '참고 기호')에 관한 문장.

## 판정 값

- `MISREAD`: A 또는 B가 하나 이상 있음.
- `OK`: 핵심 기호 문장이 모두 정답표와 맞거나 옮긴 문장뿐임.
- `UNCLEAR`: 학생 주장 소개인지 luna 단정인지 구분이 어렵거나, 정답표로 판단이 어려움.

## 출력

`verdicts/batch-N.jsonl`에 입력과 같은 순서로 한 줄에 하나:

```json
{"id":"...","verdict":"MISREAD|OK|UNCLEAR",
 "misreads":[{"kind":"A|B","path":"fields의 path","marker":"ⓓ","quote":"해당 문장 그대로(짧게)","why":"정답표와 어떻게 다른지 한 문장"}],
 "unclear":"UNCLEAR일 때 이유, 아니면 null",
 "otherMisreadsC":[{"path":"...","quote":"...","why":"..."}]}
```

입력 줄 수와 출력 줄 수가 같아야 한다. 모든 `id`를 빠짐없이 판정한다.

## 추가: v5.8 표적 재현 출력(`judge/repro-input.jsonl`)

v5.8 출력에는 칸이 더 있다. luna 자신의 단정으로 보는 칸과 옮긴 칸은 다음과 같다.

- luna 단정: `reason`, `errors[].description`, `errors[].question`(학생에게 보임), `studentClaims[].sourceBasis`(원문이 무엇을 말하는지에 대한 luna의 설명), `judgment.*`, `ground.*`.
- 옮긴 것(학생·선지 주장): `studentClaims[].claimAsStated`, `choiceReading.claims[].studentReading`, `choiceReading.claims[].choiceText`, `reconstructedPath[]`. 이 칸에서 luna가 그 주장을 맞다고 인정한 경우만 오독.
- 노출: `errors[].question`, `selectionMismatchQuestion`만 STUDENT. 나머지는 INTERNAL(단 `reason`은 마지막 설명의 재료로 넘어감).
- MISREAD마다 `exposure` 필드를 넣는다.
