# 문장 읽기 습관 묶기 실험 (2026-11-18)

목적: 진단 결과 맨 위 요약에 "이번 진단에서 두 번 이상 나온 문장 읽기 습관"을 하나(또는 없음)로 보여 주는 별도 호출을 가상 학생으로 시험한다. 설계 배경: `docs/handoffs/2026-11-17-diagnostic-result-solve-section-design.md` 8절, 웹 스레드 2026-11-18 결정.

## 결정 (Ghootae, 2026-11-18)

- 입력은 문제 풀이 근거만 쓴다. 요약은 제외하고, 요약 종합 분석은 나중에 따로 한다.
- 같은 종류가 하나뿐이면 요약 섹션을 보이지 않는다.
- 종류는 사고 진단 오류 태그 12종을 기준으로 한다.
- 학생에게는 문항 내용이 아니라 **문장 형식**을 보여 준다. 예: "A는 B를 하는 가장 좋은 C이다"를 "A에서 B를 할 수 있다"로 읽음. 같은 형식의 다른 사례도 함께 보여 주고, 다음에 할 행동을 한 줄로 붙인다.
- 대상은 **문장 하나를 잘못 읽은 근거**다(선지든 지문이든). 지문 밖 상식과 입장 주인 착각은 맨 위 요약에서 다루지 않는다.

## 파일

- `inputs/S-xx.json`: 가상 학생 7명의 입력(코드는 섞여 있음). 근거 쓴 오답 + 부족·틀린 정답(`evidenceEntries`), 근거까지 맞은 정답 근거, 근거 없는 오답 이름, 지문 원문.
- `PROMPT-v2.md`: 생성 지시문 + 검토 지시문.
- `KEY.md`, `students.py`, `codes.json`: **정답표. 모델 입력에 넣지 않는다.**
- `build.py`: `students.py`로 `inputs/`를 만드는 스크립트. 저장소 루트에서 `python3 docs/experiments/reading-error-2026-11-18/build.py docs/experiments/reading-error-2026-11-18`로 돌린다.

## 실행 순서 (CLI)

1. **사고 진단**: 각 입력의 `evidenceEntries`마다 진단평가 앱의 현재 사고 진단(운영 지시문·모델 그대로)을 돌린다. 결과 `thoughtDiagnosis: { outcomeType, steps, firstFailedStep, errors: [{ tag, step, studentQuote }] }`를 그 항목에 붙인다.
2. **거르기 (코드)**: 대상 = `errors` 중 하나 이상의 `tag ∈ {CONDITION, SCOPE, DIRECTION, POLARITY, REFERENT, MAPPING, PARAPHRASE_DISTANCE, MISREAD_FACT}`인 항목이다. 나머지는 `excludedEntries: [{ item, tags }]`로 옮긴다. 결과는 `inputs-filtered/S-xx.json`에 저장하고, 원본 `inputs/`는 건드리지 않는다. 대상이 서로 다른 문항 2개 미만이면 생성 호출 없이 `NONE`으로 기록한다.
3. **생성**: `PROMPT-v2.md`의 생성 부분과 `inputs-filtered/S-xx.json`. 모델은 sol이고, 학생당 3회 반복해 흔들림을 본다. 결과 `runs/S-xx-rN.gen.json`.
4. **검토**: 같은 입력과 생성 결과로 `PROMPT-v2.md`의 검토 부분을 돌린다. 결과 `runs/S-xx-rN.review.json`.
5. **요약표** `RESULTS.md`:
   - 학생별: 1단계 태그 목록, 2단계 거르기 결과(대상·제외), result, kind, headline, featured(문장, sourceForm, studentForm), otherCases 문항, 검토 verdict
   - 채점은 하지 않는다. 웹 스레드가 KEY와 대조한다.

호출 수는 사고 진단 약 33회, 생성·검토 최대 각 21회예요. 비용은 수 달러 이내로 예상해요.
