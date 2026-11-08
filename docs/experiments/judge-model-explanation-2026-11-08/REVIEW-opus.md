# 독립 검토: 모델 × 해설 실험 칸 출력 (opus)

- 날짜: 2026-11-08
- 검토자: 하위 에이전트(opus, 읽기 전용, 이 파일만 씀)
- 범위: `runs/` 183칸 전부. 이해 용이성(쉬운지·문체)은 판정하지 않았다.
- 대조한 자료: 지시문 `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.8.md`(아래 "지시문 N행"은 이 파일의 행 번호), 서버 코드 `packages/pipeline/src/problem-solving/feedback-claims.ts`·`feedback-evaluator.ts`·`feedback.ts`·`feedback-end-explanation.ts`, 앱 `packages/app/src/server/problem-feedback.ts`, 원자료 `packages/pipeline/fixtures/experiments/sns-diagnostic/public/<questionId>.json`, 정답·해설 `packages/pipeline/fixtures/experiments/sns-diagnostic/runtime-reference.json`.
- 칸 파일은 `runs/<caseId>__<cond>__r<n>.json`. 아래에서는 확장자 없이 칸 이름만 적는다.
- 용어: "판정기 원 판정" = 칸 파일 `requests[]` 중 마지막 `problem_feedback_assessment`의 `output_text`에 든 contentAssessment(모델이 낸 값). "최종 판정" = `judge.contentAssessment`(서버 정리 뒤 값). 둘이 다를 수 있다.

---

## 0. 핵심 결론 (먼저 읽기)

1. **판정기가 정답이나 원문 사실을 틀리게 읽은 칸은 없다.** L-none(해설 없음) 33칸 포함, 정답 선지·오디오 17 계산(25 대 49)·경마 5 헌재 쟁점을 모두 맞게 읽었다. 틀린 것은 사실 읽기가 아니라 **규칙 적용**이다(1.1).
2. **SUMMARY의 "luna 0/4"는 판정기 탓만이 아니다.** 판정기 원 판정이 SUPPORTED였는데 서버가 INSUFFICIENT로 내린 칸이 **14칸**이다. 이 14칸은 모두 이유 문장이 "뒷받침한다/충분하다"로 끝난다(과제 3).
3. 14칸 중 13칸을 내린 것은 서버의 세 칸(선지 이해·근거·판단) 충족 검사의 한 조건이다. `feedback-claims.ts:294`가 근거 인용(ground.quote)에 걸리는 학생 주장이 **전부 CONSISTENT**이기를 요구한다. 그런데 학생이 선지 사례를 해석한 말은 지시문 330행 끝 규칙에 따라 CHOICE_READING으로 분류된다. 이 말이 근거 인용에 들어가면 그 칸은 통과할 수 없다. 지시문 164–167행(근거 인용은 선지와 맞서는 마지막 단계까지)과 330행 끝(선지 읽기는 CHOICE_READING)이 함께 적용되면 생기는 구조적 탈락이다. 과제 2의 후보 (a)~(d)에는 없고 (e) 기타에 해당한다.
4. 이 탈락을 빼고 판정기 원 판정으로 다시 세면 기준 사례 풀림은 L-now 1/4, L-lab 1/4, L-none 0/4, S-now 2/4, S-lab 1/4다. B 묶음은 B-horse6가 S-now에서 3/3, B-plas10이 S-now에서 3/3이 된다. **"B-horse6는 sol도 0/3"이라는 SUMMARY 값은 판정기의 판단이 아니라 서버 규칙에서 나온 결과다.**
5. luna에만 있는 엄격함은 둘이다. ① 판정을 바꾸지 않는 낱말 차이를 걸림돌로 본다(c): "인지 후"/"지각"을 UNDETERMINED·CONTRADICTED로, "의미로 전환되는"/"의미를 나타내는"을 CONTRADICTED로 봤다. 이 때문에 ERROR 8칸이 나왔다. ② 선지의 비교·조건 주장을 학생이 말하지 않으면 relation을 WEAKER로 단다(b). sol은 같은 문장을 EXACT·CONSISTENT로 받았다.
6. sol에만 남은 걸림돌은 지시문 171행("참인 선지는 모든 주장 지지")이다. 의식 14에서 6/6 UNTOUCHED와 holds=false, 플라 10 S-lab에서 2/3 holds=false가 나왔다.
7. 오디오 16은 15/15 UNKNOWN이다. 판정기가 학생 말("임계대역은 차폐가 일어나는 범위")이 선지 주장에 **닿지 않는다(UNTOUCHED)**고 보면, 서버가 세 칸 미충족으로 UNKNOWN을 확정한다(`feedback-claims.ts:252–262`). 실제 진단 1회분은 WEAKER로 달려 INSUFFICIENT였다. UNTOUCHED와 WEAKER 사이의 표기 흔들림이다.
8. 정답을 고른 학생에게 UNKNOWN과 INSUFFICIENT는 같은 결과(UNVERIFIED_CORRECT, 진단 집계 NOT_SUPPORTED)로 이어진다. 다른 것은 관문 문장과 마지막 설명의 틀(UNVERIFIABLE/GAP)뿐이다. **C 반례의 UNKNOWN 30/30은 "부족 계열의 올바른 거부"로 봐도 된다.** 다만 A-aud16도 같은 UNKNOWN이라, 지금 판정기는 "관련 있지만 덜 간 근거"와 "무관한 사실"을 가르지 못한다.
9. 질문 위반은 모두 luna 칸에 있다. 답 표현을 넣은 질문 7개, 판정을 바꾸지 않는 차이를 짚은 질문(P2) 8개가 있다. sol 질문은 이 두 위반이 0이다. 대신 sol은 오디오 17에서 "어느 쪽이 얼마나 더 커" 같이 사실 두 개를 묻는 질문이 6/6이다.
10. 마지막 설명 위반: 판정은 INSUFFICIENT인데 설명이 "잘 연결했어/타당해"로 끝나 빠진 것이 없다고 말하는 칸이 4개다(모두 S-now, 서버가 내린 칸). P2 차이를 빠진 것으로 짚은 칸은 7개다(모두 luna). 원문 칠하기(mark) 인용 오류는 3개다(luna, "가지를 친"을 "가지가 친"으로 씀).

---

## 1. 측정

### 1.1 판정기 정확성

**(가) 정답·원문 사실 읽기: 오류 0칸**

- 오디오 17(15칸): 모든 칸이 C 25(63−38), D 49(55−6)로 계산했고, 학생의 "C 차이가 더 큼"을 CONTRADICTED로 잡았다. 예: `A-aud17__L-none__r1`의 reason "표에서 C의 차이는 63-38=25 dB, D의 차이는 55-6=49 dB".
- 경마 5(15칸): 모든 칸이 지문 "이러한 규정이 국민의 알 권리와 언론의 자유를 침해하는지에 대해 헌법재판소는 … 합헌 결정을 내렸다"로 학생 말을 반박했다.
- L-none 33칸: 정답 선지의 참·거짓을 잘못 본 칸, 지문 사실을 잘못 옮긴 칸이 없다. 설계 2.7(나)의 "판정기가 스스로 풀다 틀린 칸"은 **0칸**이므로 엄격함 집계에서 뺄 칸도 없다.

**(나) 규칙 적용 오류(원문은 맞게 읽었으나 지시문 규칙을 잘못 적용): 아래 목록**

| # | 유형 | 지시문 근거 | 칸 | 수 |
|---|---|---|---|---|
| R1 | "인지 후"를 원문 "지각"과 어긋난 사실로 봄(CONTRADICTED → ERROR) | 33–35행("원문으로 뒷받침되지 않는다는 사실만으로 곧바로 거짓 명제라고 단정하지 않는다") | A-cog14__L-lab__r2, B-cog14__L-now__r2, B-cog14__L-now__r3 | 3 |
| R2 | "의미로 전환되는 상태"를 정의 위반으로 봄(CONTRADICTED → ERROR). 근거 문장은 모두 "…라고 정의하지 않는다"(없음) | 33–35행 | A-cog16__L-lab__r2, __L-lab__r3, __L-none__r1, __L-none__r2, __L-now__r1 | 5 |
| R3 | 학생이 선지 조건을 되풀이한 말("막대의 진동은 해석에 의존")을 <보기> 사실 주장으로 보고 UNDETERMINED | 330행 끝("선지가 무슨 말을 하는지 말한 주장은 … CHOICE_READING") | A-cog16__L-lab__r2, __L-lab__r3, __L-none__r1, __L-none__r2, __L-none__r3, __L-now__r1 | 6 |
| R4 | "(나)는 결정화된 플라스틱"을 UNDETERMINED로 봄. <보기> "한 방향으로 서로 나란히 조밀하게 배열"에 지문의 결정 영역 정의("사슬들이 일정한 방향으로 나란히 배열되어 있는 결정 영역")를 한 번 적용한 결과다 | 330행(정의·일반 진술 한 번 적용 → 원문만으로 판단 가능) | A-plas10__L-lab__r3, __L-none__r1, __L-none__r2, __L-none__r3, __L-now__r1, __L-now__r2 | 6 |
| R5 | "역량 있는 정치 신인"을 선지 "치명적 허점을 지적하고 좋은 대안을 제시해 유명해진 정치 신인"보다 약한 읽기(WEAKER)로 봄 | 85행("같은 뜻의 다른 말로 풀어 쓴 것 … EXACT") | B-horse6__L-now__r1, __r2, __r3 | 3 |
| R6 | 학생 결론 "확장된 인지 이론을 타당하지 않다"를 다른 대상(OTHER_TARGET)으로 봄 | 88행, 331행("어느 쪽인지 확실하지 않으면 OFF_TARGET을 쓰지 않고") | A-cog14__L-lab__r1, __L-none__r2, __L-now__r2 | 3 |
| R7 | 거짓 선지를 반박한 학생 읽기에 relation REVERSED를 닮(relation은 반박·지지와 따로 정함) | 86행 | A-cog16__L-lab__r2, __L-lab__r3, __L-none__r3, __L-now__r1, __L-now__r3 | 5 |
| R8 | 정답 선택인데 TARGET 오류와 두 갈래 질문을 만듦 | 97행(정답 선택의 읽기 차이는 충족 판단에서 다룸), 281행 | A-cog14__L-now__r2(2차 시도) | 1 |

- 위 오류는 **전부 luna 칸**이다. sol 75칸에는 R1~R8이 없다. 같은 학생 말을 sol은 CONSISTENT·EXACT로 받았다(예: `A-cog16__S-now__r1`의 세 주장 모두 CONSISTENT, `A-plas10__S-now__r1` EXACT).
- 경계 사례(오류로 세지 않음): A-aud16 15칸 전부가 학생 말을 UNTOUCHED로 봤다. 64·68행("선지가 여러 주장을 묶고 있으면 학생이 그중 어느 하나에만 닿아도 ①은 채워진다")에 비추면 "임계대역"이 선지에 있으므로 닿았다고 볼 여지가 있다. 반면 학생이 선지의 조건에 대해서는 아무 판단도 하지 않았으므로 UNTOUCHED도 지지된다. 실제 진단 1회분(`sessions/diagnostic/events.jsonl`)은 WEAKER였다.
- L-none 중 규칙 적용 오류가 있는 칸: A-cog16__L-none__r1·r2(R2·R3), A-cog16__L-none__r3(R3·R7), A-plas10__L-none__r1·r2·r3(R4), A-cog14__L-none__r2(R6). L-none 33칸 중 7칸이다. A-horse6__L-none 3칸은 근거 종류를 JUDGMENT_METHOD로 봤다(학생의 "불합리" 평가를 사실 없는 판단으로 봄, 145행). 해설이 있는 조건에서는 6칸 중 1칸(L-now__r3)만 그랬으므로, 해설이 없을 때 이 해석이 늘어난 것으로 보인다. 오류로 세지는 않았다.

**(다) 판정 실패 3칸(EVALUATION_ERROR) 원인**

| 칸 | 1차 시도 | 2차 시도(마지막) | 분류 |
|---|---|---|---|
| A-cog14__L-now__r2 | CONTENT 오류("인지 후" CONTRADICTED, R1)를 만들었으나 judgment 대상이 UNTOUCHED 주장(C1-2)이었다. 서버가 대상을 지워 verdict NONE이 되자 `CLAIMS_CONTRACT: reconstructability must follow the three cells`(`feedback-claims.ts:92`) | 정답 선택에 TARGET 오류를 만들고(R6·R8), 질문에 선지 전문을 넣었다. `교정 질문에 미공개 정답이 포함됐습니다.`(`feedback.ts:414`, `question.includes(answer.text)`) | 판정 규칙 오류(R1→R8)와 형식 계약 위반이 겹침. 재시도 한도 1(`META.json` maxRetries 1) |
| A-plas10__L-none__r2 | <보기> 인용을 "가지**가** 친 구조의 사슬들은…"으로 씀(원문 "가지**를** 친") → `원문 근거 인용이 일치하지 않습니다: SCENARIO`(`feedback.ts:383`) | 같은 인용 오류 반복 | 원문 인용 복사 실패. 복구 함수 `recoverFeedbackSourceQuote`는 공백·따옴표만 무시하므로 조사 한 글자 차이는 복구하지 못함 |
| A-plas10__L-none__r3 | 같음 | 같음 | 같음 |

- 같은 "가지가 친" 오인용이 마지막 설명의 원문 칠하기(mark)에서도 3번 나왔다(1.5 E3). luna의 고정된 복사 실수로 보이며, L-none 조건 자체와 관련이 있다는 증거는 없다.
- 판정 실패는 아니지만 형식 재시도로 넘어간 칸이 9개 더 있다. 모두 luna(L-now·L-none)이고 sol·L-lab은 0이다.

### 1.2 엄격함의 원인 분류 (기대 SUPPORTED 8사례, 최종 판정이 SUPPORTED가 아닌 69칸)

**칸마다 서버 판정을 막은 조건(코드 재현)**

판정기 출력의 세 칸을 `feedback-claims.ts` `readingJudgment`(282–306행)의 조건에 그대로 넣어, 막힌 조건을 칸마다 확인했다. 주 원인은 그 조건이 없으면 통과했을 가장 직접적인 것 하나다.

| 분류 | 뜻과 근거 행 | 칸 |
|---|---|---|
| (a) 171행: 참인 선지의 모든 주장 지지 | 지시문 171행 "참인 선지는 선지의 모든 주장이 지지되어야 한다", 168–170행 holds. 코드 `feedback-claims.ts:293`(touched.length === claims.length), 294(holds) | A-cog14__S-now__r1·r2·r3, A-cog14__S-lab__r1·r2·r3, A-plas10__S-lab__r2·r3, A-horse6__S-now__r3 (9) |
| (b) 선지 읽기 relation(D-0185 계열) | 160–161행 "참인 선지를 지지할 때는 … WEAKER는 인정하지 않는다", 83–88행 relation 정의. 코드 287행 relationOk | A-plas10__L-lab__r1·r2·r3, A-plas10__L-none__r1, A-plas10__L-now__r1·r2(WEAKER = "㉮보다" 비교를 말하지 않음, (a)와 겹침), B-horse6__L-now__r1·r3(WEAKER = 같은 뜻 바꿔 쓰기, R5) (8) |
| (c) 학생 낱말이 원문과 다름 | 21–26행(밝히지 않은 관계 복원 금지), 33–35행. 실제로는 R1·R2 | A-cog14__L-lab__r2·r3, A-cog14__L-none__r1·r2·r3, A-cog14__L-now__r1·r3, B-cog14__L-now__r1·r2·r3("인지 후"), A-cog16__L-lab__r2·r3, A-cog16__L-none__r1·r2, A-cog16__L-now__r1("의미로 전환되는", 모두 ERROR) (15) |
| (d) UNKNOWN / 재구성 불가 | 53–56·64–68행 세 칸, 114–118행. 코드 252–262행(세 칸이 다 차지 않으면 서버가 UNKNOWN 확정) | A-aud16 15칸 전부, A-cog14__L-lab__r1 (16) |
| (e1) **서버 근거 검사: 근거 인용 안의 학생 주장이 모두 CONSISTENT여야 함** | 지시문 166–167행 "이 구간의 학생 주장이 모두 원문과 맞아야(CONSISTENT) 2)를 통과한다"와 330행 끝 "선지 읽기는 … CHOICE_READING"이 함께 걸림. 코드 `feedback-claims.ts:292–294` | A-horse6__L-lab__r1·r2·r3, A-horse6__L-now__r1·r2, A-cog16__L-lab__r1, A-cog16__L-now__r2·r3, A-cog16__L-none__r3(R3의 UNDETERMINED), B-horse6__S-now__r1·r2·r3, B-plas10__S-now__r2 (13). **13칸 모두 판정기 원 판정은 SUPPORTED** |
| (e2) 근거 종류가 FACT가 아님 | 145–146·162–163행(JUDGMENT_METHOD, CONCLUSION_RESTATED). 코드 294행 ground.kind | A-horse6__L-none__r1·r2·r3, A-horse6__L-now__r3, B-horse6__L-now__r2 (5) |
| (e3) 판정 실패 | 1.1(다) | A-cog14__L-now__r2, A-plas10__L-none__r2·r3 (3) |

- 덧붙여 겹친 원인: A-cog14 luna 칸은 (c)에 UNTOUCHED·WEAKER·holds=false가 함께 붙어 있다. (c)가 풀려도 (a)·(b)로 막혔을 가능성이 크다. A-plas10 luna 칸은 (b) WEAKER와 holds=false("㉮보다 더 적합하다는 비교까지 뒷받침되지 않는다")가 함께 있고, 그 가운데 4칸은 R4 UNDETERMINED도 겹친다.
- relation=ADDED는 걸림돌이 아니다. A-horse6 luna 칸은 학생의 "제한에 의해 불합리가 발생한 경우"를 9/9 ADDED로 달았지만, 참인 선지에서 ADDED는 인정된다(지시문 160–161행, 코드 287행). 이 칸들을 막은 것은 (e1)이다.

**조건별 분포(주 원인 기준, 칸 수)**

| 조건 | (a) 171행 | (b) relation | (c) 낱말 | (d) UNKNOWN | (e1) 서버 근거 검사 | (e2) 근거 종류 | (e3) 실패 | 계 |
|---|---|---|---|---|---|---|---|---|
| L-now (B 포함) | 0 | 4 | 6 | 3 | 4 | 2 | 1 | 20 |
| L-lab | 0 | 3 | 4 | 4 | 4 | 0 | 0 | 15 |
| L-none | 0 | 1 | 5 | 3 | 1 | 3 | 2 | 15 |
| S-now (B 포함) | 4 | 0 | 0 | 3 | 4 | 0 | 0 | 11 |
| S-lab | 5 | 0 | 0 | 3 | 0 | 0 | 0 | 8 |

(주 원인 하나씩만 센 칸 수다. 합계 69칸이다. S-now의 (a)는 A-cog14 3칸과 A-horse6 1칸, S-lab의 (a)는 A-cog14 3칸과 A-plas10 2칸이다.)

- **모델별 차이가 해설별 차이보다 크다.** luna는 (b)·(c)·(e2)가 주이고, sol은 (a) 하나다. (d)는 두 모델 모두 같은 3칸씩(A-aud16)이다. (e1)은 luna(L-now·L-lab)와 sol(S-now, B 묶음) 양쪽에서 나온다.
- 해설별: L-none에서 (e2) JUDGMENT_METHOD가 늘었다(A-horse6 3/3). L-lab은 형식 재시도가 0이고 (c)가 L-now와 비슷하다. lab식 해설이 luna의 낱말 엄격함을 줄이지는 못했다. sol에서는 lab식 해설(S-lab)일 때 A-plas10이 3/3에서 1/3으로 떨어졌다. 떨어진 2칸은 holds=false, 이유는 "㉮보다 ㉯가 더 적합하다는 비교까지 따라 나오지 않는다"이다. lab 해설 원문은 "㉯는 … ㉮보다 결정 영역이 많고"로 비교를 명시한다. sol이 그 비교를 학생 근거에 요구한 것으로 보이지만 3회 표본이라 추정이다.

**판정기 원 판정으로 다시 센 풀림 (최종/원)**

| 사례 | L-now | L-lab | L-none | S-now | S-lab |
|---|---|---|---|---|---|
| A-cog14 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| A-horse6 | 0/**2** | 0/**3** | 0/0 | 2/**3** | 3/3 |
| A-plas10 | 1/1 | 0/0 | 0/0 | 3/3 | 1/1 |
| A-aud16 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| A-cog16 | 0/**2** | 0/**1** | 0/**1** | 3/3 | 3/3 |
| B-cog14 | 0/0 | - | - | 3/3 | - |
| B-horse6 | 0/0 | - | - | 0/**3** | - |
| B-plas10 | 3/3 | - | - | 2/**3** | - |

(3회 중 SUPPORTED 수. 굵은 값은 서버가 내리기 전 판정기 값.) C 반례에서 판정기 원 판정 SUPPORTED는 0이므로 "그냥 후함" 조건은 원 판정으로 세도 없다.

### 1.3 이유–판정 불일치

**(가) 이유는 "충분/뒷받침한다", 최종 판정은 INSUFFICIENT: 14칸**

| 칸 | 판정기 원 판정 | 서버를 막은 칸(필드) | reason 끝 문장(요지) |
|---|---|---|---|
| A-horse6__L-now__r1 | SUPPORTED | ground 인용에 CHOICE_READING 주장 2개 (`feedback-claims.ts:294`) | "내용상 충분하다." |
| A-horse6__L-now__r2 | SUPPORTED | 같음 | "선지의 결론을 뒷받침한다." |
| A-horse6__L-lab__r1 | SUPPORTED | 같음 | "선택지의 판단과 부합한다." |
| A-horse6__L-lab__r2 | SUPPORTED | 같음 | "결론은 뒷받침된다." |
| A-horse6__L-lab__r3 | SUPPORTED | 같음 | "②의 판단을 뒷받침한다." |
| A-horse6__S-now__r3 | SUPPORTED | choiceReading 주장 하나 UNTOUCHED (`:293`, 171행) | "근거가 충분하다." |
| A-cog16__L-lab__r1 | SUPPORTED | ground에 CHOICE_READING (`:294`) | "정의에 부합하고 … 일치한다." |
| A-cog16__L-now__r2 | SUPPORTED | 같음 | "이 차이가 판단을 바꾸지 않는다." |
| A-cog16__L-now__r3 | SUPPORTED | ground에 CHOICE_READING·UNDETERMINED | "판단을 반박하며 … 일치한다." |
| A-cog16__L-none__r3 | SUPPORTED | ground에 UNDETERMINED(R3) | "반박한 판단은 타당하다." |
| B-horse6__S-now__r1 | SUPPORTED | ground에 CHOICE_READING("2번 선지의 케이스는 …") | "관계를 충분히 설명했다." |
| B-horse6__S-now__r2 | SUPPORTED | 같음 | "근거가 충분하며" |
| B-horse6__S-now__r3 | SUPPORTED | 같음 | "충분히 뒷받침한다." |
| B-plas10__S-now__r2 | SUPPORTED | ground에 CHOICE_READING | "선지를 적절하다고 보는 방향으로 일치한다." |

- 조건별: L-now 4, L-lab 4, L-none 1, S-now 5, S-lab 0.
- 판정을 정한 것: 13칸은 `settleConclusion`(`feedback-claims.ts:270–277`)이 `readingJudgment`의 `groundClaims.every(c => c.sourceCheck === 'CONSISTENT')`(294행)로 내렸다. 1칸(A-horse6__S-now__r3)은 `touched.length === claims.length`(293행)로 내렸다. 서버는 reason을 고쳐 쓰지 않으므로, 판정기가 SUPPORTED용으로 쓴 이유가 그대로 남는다.
- 이 이유(`diagnosis`)와 `judgmentNote`는 마지막 설명의 재료로 넘어간다(`feedback-end-explanation.ts:234–235`). 그래서 1.5 E1의 칭찬형 설명이 나온다.

**(나) 이유는 "재구성된다/판단은 확인된다", 최종 판정은 UNKNOWN: 4칸**

| 칸 | 판정기 원 판정 | 서버 처리 |
|---|---|---|
| A-aud16__L-lab__r1 | RECONSTRUCTABLE · INSUFFICIENT | choiceReading 전부 UNTOUCHED → `feedback-claims.ts:257–259`가 UNKNOWN으로 확정 |
| A-aud16__L-none__r3 | 같음("VALID로 재구성되지만 근거는 충분하지 않다") | 같음 |
| A-aud16__L-now__r3 | 같음 | 같음 |
| C2-aud16__L-none__r1 | 같음("판단은 재구성되지만") | 같음 |

- sol 17칸(A-aud16 S-* 6, C2-aud16 S-* 6, C2-horse6 S-* 5)과 luna 3칸(C2-aud16__L-lab__r1, C2-horse6__L-lab__r1, C2-horse6__L-now__r2)은 판정기가 reconstructability=UNKNOWN에 contentAssessment=INSUFFICIENT를 함께 냈다. 서버가 contentAssessment를 UNKNOWN으로 맞췄다(`:260–262`). 이 칸들은 이유와 판정이 어긋나지 않는다.

### 1.4 UNKNOWN 해석

**측정(코드 흐름)**

1. 판정 뒤 `applyFeedbackAssessment`(`feedback.ts:505–506`): reconstructability=UNKNOWN이고 정답을 골랐으면 `endExplanation(s, 'CORRECT_UNVERIFIED', 'UNVERIFIED_CORRECT')`로 간다. INSUFFICIENT 정답 선택(`:525`)과 **같은 종료 사유, 같은 결과**다. 질문(교정)은 없다. 오답 선택이면 `unknown()`(`:197–200`) → `RATIONALE_UNVERIFIABLE`, `COACHING_TERMINATED`.
2. 화면 문구(`endExplanation`, `feedback.ts:211–215`): 정답 선택이면 "네 근거를 하나씩 같이 볼까?"로 두 경우가 같다.
3. 관문 문장(`packages/app/src/server/problem-feedback.ts:319–324`):
   - UNKNOWN: "네 근거만으로는 이 답에 어떻게 이르렀는지 다 보이지는 않았어. 빠진 연결은 설명에서 같이 볼게."
   - INSUFFICIENT(MISSING_LINK): "네 근거에서 맞는 부분은 살리고, 더 이어야 할 연결은 설명에서 같이 볼게."
4. 마지막 설명의 칸 틀(`feedback-end-explanation.ts:224–228`): UNKNOWN → UNVERIFIABLE("학생 말이 원문과 맞으면 인정한 뒤, 그 말이 선지의 어느 말에 대한 판단인지 드러나지 않았다는 것을 선지의 말을 인용해 짚는다"), INSUFFICIENT → GAP(빠진 것을 말함). readings는 UNTOUCHED를 걸러 비어 있다.
5. 진단 집계(`packages/app/src/server/diagnostic/controller.ts:306`): SUPPORTED가 아니면 둘 다 NOT_SUPPORTED다.

**판단: C 반례의 UNKNOWN은 "부족 계열의 올바른 거부"로 봐도 된다.**

- 학생이 받는 결과(UNVERIFIED_CORRECT, 질문 없음, 설명으로 마무리)와 진단 집계가 INSUFFICIENT와 같다. 기대 판정 INSUFFICIENT의 목적은 "충분하다고 인정하지 않기"이고, 그 목적은 달성됐다.
- 지시문 53–56행이 "관련 없는 사실 … 때문에 전체 판단을 확인할 수 없으면 UNKNOWN"이라고 명시한다. C2 근거("임계대역의 폭은 고음에서 저음보다 훨씬 넓다", "ⓐ는 다수 의견이고 ⓑ는 소수 의견이다")는 이 규칙에 맞는 UNKNOWN이다.
- C2 마지막 설명 30칸은 모두 "그 사실만으로는 ⑤의 '…' 판단까지 드러나지 않아" 꼴로, 학생 사실을 인정하고 무관함을 짚었다(예: `C2-aud16__S-now__r1`, `C2-horse6__L-lab__r3`). 판정을 뒤집거나 학생을 틀렸다고 한 칸은 없다.
- 단서: A-aud16(기대 SUPPORTED)도 15/15 같은 UNKNOWN이고, 설명도 같은 틀("판단했는지 알 수 없어")이다. 즉 판정기와 서버는 "정답 선지와 관련 있는 정의를 짚었지만 대입 한 단계를 말하지 않은 근거"와 "선지와 무관한 사실"을 같은 상자에 넣는다. C 반례가 맞게 거부된 것은 판정기가 정답을 가르는 능력을 보여 주는 증거가 아니라, 두 경우를 함께 거부한 결과다.

### 1.5 질문·마지막 설명 규칙 점검 (모든 칸)

**질문**: 학생에게 보이는 교정 질문 38개(ERROR 칸의 errors[].question)와 선택–근거 충돌 질문 15개(A-aud17 전 칸)를 봤다. `C1-cog14__L-now__r3`의 selectionMismatchQuestion은 판정 일치(CONSISTENT)라 화면에 나오지 않으므로 뺐다.

| 점검 | L-now (9) | L-lab (9) | L-none (8) | S-now (6) | S-lab (6) | 지시문 근거 |
|---|---|---|---|---|---|---|
| Q1 답 표현 포함(명시) | 0 | 4 | 3 | 0 | 0 | 263–265행 |
| Q1' 답을 전제로 깔고 물음(부분) | 1 | 2 | 0 | 0 | 0 | 263–265행 |
| Q2 사실 둘 이상 요구(오디오 17) | 1 | 3 | 0 | 3 | 3 | 274행("한 질문에는 사실 하나만"), 253–254행은 한 비교의 요소는 허용 |
| Q2' 방식·설명을 물음("어떻게 언급됐는지", "어떤 방식으로") | 1 | 2 | 0 | 0 | 0 | 272–274행 |
| Q3 판정을 바꾸지 않는 차이를 짚음(P2) | 3 | 3 | 2 | 0 | 0 | 255–257행, 설계 2.8 |
| Q4 학생·원문 인용 오류 | 0 | 0 | 0 | 0 | 0 | 336–337행 |
| Q5 예/아니오로도 답할 수 있는 꼴(경계) | 0 | 1 | 0 | 3 | 3 | 275–276행 |
| 참고: 선택–근거 충돌 질문이 이어 붙음(2단계) | 3 | 3 | 3 | 3 | 3 | 설계 2.10에서 범위 밖 |

대표 사례(질문 원문):
- Q1: `A-cog14__L-lab__r2` "“인지 후”라고 썼는데, (나)에서 **지각이 일어난 이후** 비로소 무엇이 확정된다고 했어?" 고쳐야 할 낱말 '지각'이 질문에 들어 있다. `A-cog16__L-lab__r2` "파생적 상태는 주체의 해석에 의존해 어떤 방식으로 **의미를 나타내는** 상태야?" `A-horse5__L-none__r3` "규정이 국민의 알 권리와 **언론의 자유를 침해하는지**에 대해 헌법재판소가 무엇을 했어?"
- Q1': `A-horse5__L-now__r2` "헌법재판소가 판단한 쟁점에 언론의 자유가 어떻게 언급됐는지 말해 봐."(Q2'와 겹침)
- Q2: `A-aud17__S-now__r1` "어느 쪽 차이가 **얼마나** 더 커?"(어느 쪽 + 크기), `A-aud17__L-lab__r1` "차이는 **각각** 얼마야?" 반면 `A-aud17__L-none__r2`·`r3`·`A-aud17__L-now__r3` "어느 쪽 차이가 더 커?"는 사실 하나다.
- Q3: `B-cog14__L-now__r2` "주체와 대상은 무엇이 일어난 뒤에 비로소 확정된다고 했어?" 질문 형식은 좋지만, 겨냥한 오류가 "인지/지각" 낱말 차이라 판정을 바꾸지 않는 차이다. `A-cog16__L-none__r2` "파생적 상태는 의미를 어떻게 나타내?"
- Q5: `A-horse5__S-now__r1` "보도 금지 규정이 무엇을 침해하는지 논의했어?" 무엇을 묻는 뜻으로 읽히지만 "응"으로도 답이 된다.

**마지막 설명**: 마지막 설명이 있는 118칸(L-now 28, L-lab 24, L-none 23, S-now 23, S-lab 20)을 봤다.

| 점검 | L-now | L-lab | L-none | S-now | S-lab |
|---|---|---|---|---|---|
| E1 판정(INSUFFICIENT)과 반대로 빠진 것이 없다고 말함(뚜렷함) | 0 | 0 | 0 | 4 | 0 |
| E1' 빠진 것을 "조금 더 풀면 돼"처럼 흐리게 말함 | 0 | 1 | 1 | 1 | 0 |
| E2 판정을 바꾸지 않는 차이를 빠진 것으로 짚음(P2·A3) | 6 | 0 | 1 | 0 | 0 |
| E3 원문 칠하기(mark) 인용이 원문과 다름 | 2 | 0 | 1 | 0 | 0 |
| E4 작은따옴표 인용이 원문·선지에 없음 | 0 | 0 | 0 | 0 | 0 |

- E1: `A-horse6__S-now__r3` "네 설명에는 이 연결이 드러나 있어.", `B-horse6__S-now__r1` "흐름도 잘 이어져 있어.", `B-horse6__S-now__r2` "선택을 뒷받침하는 근거도 잘 제시했어.", `B-horse6__S-now__r3` "설명한 것도 타당해." 넷 다 1.3(가)의 서버가 내린 칸이다. 관문 문장은 "더 이어야 할 연결은 설명에서 같이 볼게"라고 했는데 설명은 빠진 것이 없다고 한다.
- E1': `A-cog16__L-lab__r1`, `A-cog16__L-none__r3`, `B-plas10__S-now__r2`("조금 더 풀어 주면 돼"). 셋 다 서버가 내린 칸이다.
- E2: `B-cog14__L-now__r1` "인지와 지각이 어떤 관계인지 설명하지 않아서", `A-cog14__L-none__r2` "네가 말한 인지 이후가 지문에서 말하는 지각 이후와 같은 뜻인지는 드러나지 않아", `A-cog16__L-now__r2`·`r3`(선지의 '해석에 의존해서만'의 '만' 조건). r2는 판정기 reason 스스로 "이 차이가 판단을 바꾸지 않는다"고 썼다. `B-horse6__L-now__r1`·`r2`·`r3`(학생의 "역량 있는 정치 신인"에 대해 선지의 '치명적 허점을 지적하고 좋은 대안을 제시해 유명해진' 조건이 빠졌다고 함).
- E3: `C1-plas10__L-none__r1`, `C1-plas10__L-now__r2`, `C1-plas10__L-now__r3`. <보기> "가지를 친"을 "가지 쳐진/가지 친/가지가 친"으로 칠하기 인용에 씀. 서버의 마지막 설명 검사(`feedback.ts:242–248` `endQuoteProblems`)는 본문의 ‘…’ 인용만 보고 mark.quote는 검사하지 않는다.
- 경계(위반으로 세지 않음): A-horse6 luna 9칸의 설명은 "선지의 구체적인 상황('치명적 허점을 지적하고 …')이 왜 ⓐ를 약화하는지 짚어야 해"를 요구한다. 판정 이유와는 맞지만, 설계 2.8의 기대(ⓐ의 입장과 약화 방향을 짚으면 충분)보다 엄격한 기준을 학생에게 넘긴 것이다.

---

## 2. 해석

### 2.1 "엄격함"은 세 층이 겹친 것이다

1. **서버 근거 검사 층(모델 공통, 지금까지 드러나지 않았음).** 지시문 164–167행은 근거 인용을 "선지와 맞서는 마지막 단계까지" 이어서 잡으라고 한다. 330행 끝은 학생이 선지 사례를 해석한 말을 CHOICE_READING으로 분류하라고 한다. 코드 294행은 인용 안의 학생 주장이 모두 CONSISTENT이기를 요구한다. 그래서 "선지 사례는 X다 → 그러므로 입장이 약화된다"처럼 **선지 사례를 해석해 결론을 잇는 정상적인 근거**는 인용 안에 CHOICE_READING이 들어가는 순간 탈락한다. 경마 6과 B-horse6가 대표 사례다. sol의 B-horse6 3/3이 모두 여기서 막혔으므로, 설계 2.9 "B도 부족 → 다른 걸림돌"의 그 걸림돌은 낱말 차이가 아니라 이 검사다.
2. **luna 판정기 층.** 판정을 바꾸지 않는 낱말 차이에 민감하고(c), 선지의 비교·조건을 학생이 다시 말하지 않으면 WEAKER로 단다(b). 규칙 적용 오류 R1~R8이 전부 luna 칸이고, 해설 종류(now/lab/none)를 바꿔도 줄지 않았다. 따라서 이 층은 해설보다 모델 쪽 요인이다.
3. **지시문 171행 층(sol에서도 남음).** sol은 낱말·relation에서는 관대하지만, 참인 선지의 이유절("지각 이전에 확정된 주체를 전제한 것이므로")을 학생이 말하지 않으면 UNTOUCHED와 holds=false로 막는다(A-cog14 6/6). 설계 2.8의 P1("㉠과의 연결은 선지 문장이 말한다")과 171행이 직접 충돌한다. 172–173행 "평가자가 원문에서 올바른 관계를 찾아낼 수 있다는 사실은 학생이 그 관계를 이해했다는 증거가 아니다"가 이 층을 받친다.

### 2.2 설계 2.9 읽기 표에 대어 보기

- 최종 판정 기준: S-now 2/4, L-lab 0/4 → 표의 "S-now 대부분 풀림, L-lab은 아님"에 가깝지만 2/4는 "대부분"(3/4 이상)이 아니다. "어느 조건도 아님 → B 묶음으로 읽는다"에 해당한다.
- 판정기 원 판정 기준: S-now 2/4, L-lab 1/4, L-now 1/4. 역시 "대부분"은 없다.
- B 묶음: B-plas10은 두 모델 다 풀렸고, B-cog14는 sol만 풀렸다(luna는 "인지 후"에 막힘). B-horse6는 판정기 기준으로 sol이 풀었는데 서버가 막았다. 판정기가 요구한 연결을 넣으면 sol은 풀리고, luna는 낱말 차이가 남은 걸림돌이다. 설계가 두 가설로 세운 것(연결이 걸림돌 / 낱말이 걸림돌)이 모델에 따라 각각 맞다.
- 해설 효과는 작다. luna에서 now·lab·none 사이의 차이는 A-horse6에서 L-none만 JUDGMENT_METHOD로 바뀐 것 정도다. sol에서 lab식이 A-plas10을 떨어뜨린 것(3/3 → 1/3)은 3회 표본이라 확정할 수 없다.

### 2.3 고칠 곳 후보 (이 실험은 고치지 않는다는 설계 2.1을 따름. 후보로만 적음)

| 후보 | 겨냥하는 층 | 위험 |
|---|---|---|
| 서버 294행: 근거 인용 안의 CHOICE_READING 주장은 CONSISTENT 요구에서 빼고, 사실 주장(CONSISTENT/UNDETERMINED/CONTRADICTED 대상)만 본다 | 2.1-1 | 결론만 되풀이한 근거가 통과할 수 있다. ground.kind=FACT 조건과 사실 주장 1개 이상 조건이 이를 막는지 C1 반례로 확인해야 한다 |
| 지시문 164–167행과 330행 끝의 충돌을 문장으로 해소 | 2.1-1 | 위와 같음 |
| 171행을 P1 원리로 재정의(선지 이유절은 학생이 짚은 사실에서 한 단계로 따라 나오면 지지로 봄) | 2.1-3 | 과소 인정에서 과대 인정으로 넘어갈 수 있다(D-0189 재검토 조건과 같은 축) |
| 판정 이유·설명의 일치: 서버가 판정을 내리면 reason·judgmentNote에 내린 사유를 덧붙이거나, 설명 입력에 "서버가 내림" 표시 | 1.3, E1 | 설명 지시문 변경 필요 |
| luna 정답 판정 재검토(D-0104·D-0107) | 2.1-2 | 비용 약 20배(D-0104) |

---

## 3. SUMMARY 읽기에 대한 정정

- SUMMARY.md의 "L-now 0/4, L-lab 0/4"와 "B-horse6 S-now 0/3"은 **최종 판정** 값이다. 판정기의 판단만 비교하려면 1.2의 "판정기 원 판정으로 다시 센 풀림" 표를 함께 봐야 한다. 차이는 서버 근거 검사(1.2 (e1)) 때문이다.
- SUMMARY의 A-cog16 "ERROR"는 판정 결과 ERROR(학생 근거에 내용 오류)를 말한다. 이 실험에서는 모두 luna의 R2(낱말 차이를 오류로 봄)다.

---

## 4. 열린 질문

1. A-aud16의 UNTOUCHED(이번 15/15)와 WEAKER(실제 진단 1회)는 무엇이 가르는가. 이번 입력은 참가자 파일에서 다시 만들었다(설계 2.6). 실제 진단 입력과 글자 단위로 같은지는 이 검토에서 확인하지 않았다.
2. A-cog16 luna의 "의미로 전환되는" CONTRADICTED 판단 중 `A-cog16__L-now__r1`은 지문의 다른 문장("인지 과정은 파생적 상태가 심적 상태로 변환되는 과정이 아니라")을 근거로 댔다. 이 근거는 다른 4칸("정의하지 않는다")보다 방어할 여지가 있다. 그래도 "의미로 전환"과 "심적 상태로 변환"은 다른 말이라 R2로 셌다. 사용자 판단이 필요하다.
3. 설계 2.8 기대 판정 중 A-aud16(충분)은 지시문 64–66행 ③ 판단 칸(학생이 참·거짓을 밝혔거나 근거가 한 방향으로만 이어짐)을 이번 학생 말로 채울 수 있는지가 쟁점이다. 기대 판정을 유지하면 고칠 곳은 지시문 ③ 칸 정의다.
4. Q2(사실 둘 이상)는 253–254행("하나의 대응·비교 … 관계를 확인하는 데 필요한 연결된 요소는 함께 물을 수 있다")과 274행("한 질문에는 사실 하나만")이 함께 허용·금지하는 경계다. 어느 쪽을 우선할지는 정해져 있지 않다.
5. `validateQuestion`(`feedback.ts:414`)은 정답을 고른 뒤에도 질문에 정답 선지 전문이 들어가면 막는다. 번호 검사는 정답 선택 후 풀어 준다. 문장 검사도 같은 취지로 풀어 줄지는 정하지 않았다. 다만 이번 사례(A-cog14__L-now__r2)는 TARGET 오류 자체가 잘못이므로 막힌 것이 옳은 결과였다.

---

## 5. 근거 위치 모음

- 서버 충족 검사: `packages/pipeline/src/problem-solving/feedback-claims.ts` 245–279행 `settleConclusion`, 282–306행 `readingJudgment`(287 relationOk, 292–294 groundClaims·cellsSupported).
- 서버가 올리지 않는 규칙: `memory/decisions/D-0189-server-never-raises-insufficient.md`.
- relation 규칙: `memory/decisions/D-0185-judge-reading-added-vs-stronger-v56.md`, 지시문 83–88·158–173행.
- 상태 기계: `packages/pipeline/src/problem-solving/feedback.ts` 197–215, 505–526행.
- 관문 문장: `packages/app/src/server/problem-feedback.ts` 308–325행.
- 마지막 설명 칸 틀: `packages/pipeline/src/problem-solving/feedback-end-explanation.ts` 199–207, 224–235행.
- 판정 실패 메시지: `feedback.ts:383`(원문 인용), `:414`(미공개 정답), `feedback-claims.ts:92`(세 칸).
- 검토용 중간 산출(저장소 밖): 칸별 추출 `rows.json`, 원인 분류 `classify.json`·`prim.json`. 모두 세션 임시 폴더에 있고 저장소에 넣지 않았다.
