# 정답 판정 원인 가르기 실험 (모델 × 해설) — Desktop 보고서

- 날짜: 2026-11-08
- 작성: 코드 에이전트. 칸 단위 검토는 opus 하위 에이전트([REVIEW-opus.md](./REVIEW-opus.md))가 했고, 핵심 주장은 코드 에이전트가 코드로 다시 확인했다.
- 설계: [DESIGN-DRAFT.md](./DESIGN-DRAFT.md) 개정 2(사용자 확정). 실행기 인계: `docs/handoffs/2026-11-08-judge-model-explanation-runner.md`
- 관련: Q-0044, Q-0045, D-0104·D-0107(모델 배정), D-0182(v5.3 서버 결론 확정), D-0185(선지 읽기 relation), D-0189(서버는 올리지 않음), D-0190(v5.8)

## 1. 실행 조건

| 항목 | 값 |
|---|---|
| 지시문 | `source-direct-problem-feedback-v5.8.md` sha256 `a4bb52ec…e168`, reasoning effort medium, 마지막 설명 layout v2.2 |
| 조건 | L-now·L-lab·L-none(luna), S-now·S-lab(sol). 마지막 설명은 판정 모델과 같은 모델 |
| 해설 | now = 세트 E 해설지 전문 + 선지 해설, lab = lab식 v2(`lab-style/FROZEN.md`, sha256 `bd6625…dcd4c`), none = "정답은 ⓧ입니다." |
| 사례 | A 실제 7, B 연결 넣음 3(L-now·S-now만), C 반례 4. 글은 설계 2.4 그대로 |
| 반복 | 3회. L-now도 새로 3회(원래 진단 1회분은 참고값) |
| 칸 | 183/183 실행, 판정 실패 3칸 |
| 비용 | $4.41 (sol $3.95, luna $0.47). 상한 $8 |
| 산출물 | `runs/`(칸 183 + `requests.jsonl` + `META.json`), `SUMMARY.md`·`SUMMARY.json`, `blind/`, `REVIEW-opus.md`, `run.log` |

## 2. 측정

### 2.1 최종 판정 분포 (3회, 충=SUPPORTED, 부=INSUFFICIENT, 오=ERROR, ?=UNKNOWN, X=판정 실패, ★=기대 판정 2회 이상)

| 사례 | 기대 | L-now | L-lab | L-none | S-now | S-lab | 참고(원래 진단) |
|---|---|---|---|---|---|---|---|
| A-cog14 | 충 | 부X부 | ?오부 | 부부부 | 부부부 | 부부부 | 부 |
| A-horse6 | 충 | 부부부 | 부부부 | 부부부 | 충충부★ | 충충충★ | 부 |
| A-plas10 | 충 | 부부충 | 부부부 | 부XX | 충충충★ | 충부부 | 부 |
| A-aud16 | 충 | ??? | ??? | ??? | ??? | ??? | 부 |
| A-cog16 | 충 | 오부부 | 부오오 | 오오부 | 충충충★ | 충충충★ | 오 |
| A-horse5 | 오 | 오오오★ | 오오오★ | 오오오★ | 오오오★ | 오오오★ | 오 |
| A-aud17 | 오 | 오오오★ | 오오오★ | 오오오★ | 오오오★ | 오오오★ | 오 |
| B-cog14 | 충 | 부오오 | · | · | 충충충★ | · | |
| B-horse6 | 충 | 부부부 | · | · | 부부부 | · | |
| B-plas10 | 충 | 충충충★ | · | · | 충부충★ | · | |
| C1-cog14 | 부 | 부부부 | 부부부 | 부부부 | 부부부 | 부부부 | |
| C1-plas10 | 부 | 부부부 | 부부부 | 부부부 | 부부부 | 부부부 | |
| C2-aud16 | 부 | ??? | ??? | ??? | ??? | ??? | |
| C2-horse6 | 부 | ??? | ??? | ??? | ??? | ??? | |

- 기준 사례 4건(A-cog14·horse6·plas10·aud16) 풀림: L-now 0, L-lab 0, L-none 0, S-now 2, S-lab 1.
- C 반례 '충분' 2회 이상: 모든 조건 0.
- UNKNOWN은 정답 선택 학생에게 INSUFFICIENT와 같은 결과로 이어진다(`CORRECT_UNVERIFIED`, 질문 없음, 진단 집계 NOT_SUPPORTED. REVIEW-opus 1.4). 그래서 C2의 UNKNOWN은 올바른 거부로 센다.

### 2.2 서버가 내린 판정 (코드 에이전트 재확인)

- 판정기 출력은 SUPPORTED인데 최종 판정이 INSUFFICIENT인 칸이 14개다(REVIEW-opus 1.3). 그중 13칸은 서버 검사 한 조건에 걸렸다.
- 조건: `packages/pipeline/src/problem-solving/feedback-claims.ts:294`
  `cellsSupported = ground.kind === 'FACT' && groundClaims.length > 0 && groundClaims.every(c => c.sourceCheck === 'CONSISTENT') && claimsOk && judgment.holds`
- 막히는 이유는 세 규칙이 함께 걸리기 때문이다.
  1. 지시문 164–167행은 근거 인용을 "선지와 맞서는(지지면 선지로 이어지는) 마지막 단계까지" 이어서 잡으라고 한다.
  2. 330행 끝은 "학생이 선지가 무슨 말을 하는지 말한 주장(선지 읽기)은 … CHOICE_READING"으로 분류하라고 한다.
  3. 294행은 인용 안의 학생 주장이 모두 CONSISTENT이기를 요구한다.
  → 학생이 선지 사례를 해석해 결론으로 잇는 근거(예: "2번 선지의 케이스는 제한에 의해 불합리가 발생한 경우 → a의 입장이 약화")는 인용 안에 CHOICE_READING이 들어가는 순간 탈락한다.
- 확인 사례: `runs/A-horse6__L-now__r1.json`
  - 판정기 원 응답은 `contentAssessment: SUPPORTED`이고, 학생 주장은 CONSISTENT 1개와 CHOICE_READING 2개였다. 최종 판정은 INSUFFICIENT다.
  - 같은 칸의 reason은 "학생 근거의 결론은 선지의 결론과 일치하고, 내용상 충분하다."이다.
- 확인 사례: `runs/B-horse6__S-now__r1.json`. 판정기 SUPPORTED, CHOICE_READING 1개, 최종 INSUFFICIENT.
- 판정기 원 판정으로 다시 센 기준 사례 풀림(REVIEW-opus 1.2): L-now 1/4, L-lab 1/4, S-now 2/4. B-horse6 S-now는 판정기 기준 3/3이다.

### 2.3 엄격함의 원인 분류 (기대 SUPPORTED 8사례, 최종 판정이 SUPPORTED가 아닌 69칸, 칸마다 주 원인 하나, REVIEW-opus 1.2)

| 조건 | 171행 모든 주장 | 선지 읽기 relation(WEAKER 등) | 낱말 차이 오류 | UNKNOWN | 서버 근거 검사(294행) | 근거 종류 | 판정 실패 |
|---|---|---|---|---|---|---|---|
| L-now | 0 | 4 | 6 | 3 | 4 | 2 | 1 |
| L-lab | 0 | 3 | 4 | 4 | 4 | 0 | 0 |
| L-none | 0 | 1 | 5 | 3 | 1 | 3 | 2 |
| S-now | 4 | 0 | 0 | 3 | 4 | 0 | 0 |
| S-lab | 5 | 0 | 0 | 3 | 0 | 0 | 0 |

### 2.4 판정기 정확성

- 원문·정답을 틀리게 읽은 칸은 L-none을 포함해 0이다(오디오 17의 25 대 49 계산, 경마 5 모두 맞음).
- 규칙 적용 오류(낱말 차이를 내용 오류로 봄, 선지 조건을 WEAKER로 닮)는 모두 luna 칸이다.
- 판정 실패 3칸:
  - `A-cog14__L-now__r2`: 정답 선택인데 대상 오류(TARGET)를 만들어 질문에 정답 선지 문장이 들어갔다(`feedback.ts:414`). 막힌 것이 옳은 결과다.
  - `A-plas10__L-none__r2`·`r3`: <보기> "가지를 친"을 "가지가 친"으로 잘못 인용했다(`feedback.ts:383`).

### 2.5 질문·마지막 설명 규칙 점검 (REVIEW-opus 1.5)

| 점검 | L-now | L-lab | L-none | S-now | S-lab |
|---|---|---|---|---|---|
| 질문에 답 표현 포함(+전제로 깔음) | 0(+1) | 4(+2) | 3 | 0 | 0 |
| 판정을 바꾸지 않는 차이를 짚은 질문 | 3 | 3 | 2 | 0 | 0 |
| 사실 둘 이상을 묻는 질문(오디오 17) | 1 | 3 | 0 | 3 | 3 |
| 설명이 판정과 반대(빠진 것이 없다고 함) | 0 | 0 | 0 | 4 | 0 |
| 설명이 판정을 바꾸지 않는 차이를 빠진 것으로 짚음 | 6 | 0 | 1 | 0 | 0 |
| 원문 칠하기 인용이 원문과 다름 | 2 | 0 | 1 | 0 | 0 |

- "설명이 판정과 반대" 4칸(`A-horse6__S-now__r3`, `B-horse6__S-now__r1~r3`)은 모두 서버가 내린 칸이다. 관문 문장은 "더 이어야 할 연결은 설명에서 같이 볼게"인데, 설명은 "흐름도 잘 이어져 있어"라고 한다.
- 질문 사례:
  - 답 표현 포함: `A-cog14__L-lab__r2` "“인지 후”라고 썼는데, (나)에서 지각이 일어난 이후 비로소 무엇이 확정된다고 했어?"
  - 판정을 바꾸지 않는 차이: `B-cog14__L-now__r2` "주체와 대상은 무엇이 일어난 뒤에 비로소 확정된다고 했어?"
- 원문 칠하기(mark.quote)는 서버가 검사하지 않는다(`feedback.ts:242–248`은 본문 ‘…’ 인용만 본다).

## 3. 해석

1. **엄격함은 세 층이 겹친 것이다.**
   - (가) **서버 근거 검사:** 모델 공통이다. 선지 사례를 해석해 잇는 정상 근거를 막는다.
   - (나) **luna 판정기:** 낱말 차이와 선지 조건 반복 요구에 민감하다. 해설을 바꿔도 줄지 않았다.
   - (다) **171행:** sol에도 남는다. 참인 선지의 이유절을 학생이 말하지 않으면 막는다. A-cog14는 6/6이다.
2. **해설은 주된 원인이 아니다.** luna에서 now·lab·none 사이의 차이는 작다. sol에서 lab식이 A-plas10을 3/3에서 1/3으로 떨어뜨린 것은 3회 표본이라 확정하지 않는다.
3. **모델 차이는 있다.** 기준 사례에서 sol은 2건이 풀렸고 luna는 0건이었다. 질문 규칙 위반(답 표현, P2)은 모두 luna에서 나왔다. 다만 미리 정한 "대부분(3/4 이상)" 기준에는 sol도 못 미친다.
4. **과적합 이야기와의 관계.**
   - 서버 근거 검사(D-0182 서버 결론 확정)는 lab 6문항, 그중 거짓 선지 반박형 5개로 다듬어졌다.
   - 거짓 선지 반박은 근거가 대개 원문 사실이라 CONSISTENT로 통과한다.
   - 참인 선지, 특히 "반응으로 적절한 것" 같은 적용형은 근거가 선지 사례 해석을 포함할 수밖에 없다. 그래서 세트 E에서 처음 드러났다(해석, 미검증).
5. **오디오 16은 지금 판정기가 가르지 못하는 경계다.** 15/15가 UNKNOWN이다. "선지와 관련 있지만 한 단계 덜 간 근거"와 "선지와 무관한 사실"(C2)이 같은 판정을 받는다.

## 4. 정정 (앞선 채팅 1차 집계 대비)

- 1차 집계에서 "B 경마 6은 연결을 넣어도 두 모델 모두 부족"이라고 했다. **정정:** sol 판정기는 3/3 SUPPORTED를 냈고, 서버 검사(294행)가 내렸다. 걸림돌은 낱말 차이가 아니라 서버 검사다.
- 1차 집계의 "luna 세 조건 모두 0/4"는 최종 판정 기준이다. 판정기 원 판정 기준으로는 L-now·L-lab 각 1/4다.

## 5. 제안 (후보, 결정 아님)

| 후보 | 겨냥 | 위험·확인 |
|---|---|---|
| 서버 294행: 근거 인용 안 CHOICE_READING 주장은 CONSISTENT 요구에서 빼고 사실 주장만 본다(사실 주장 1개 이상은 유지) | 층 (가) | 결론 되풀이 근거가 통과할 수 있음. C1 반례·`ground.kind=FACT` 조건으로 확인 |
| 지시문 164–167행과 330행 끝의 충돌을 문장으로 해소 | 층 (가) | 위와 같음 |
| 171행을 P1 원리로 재정의(선지 이유절이 학생이 짚은 사실에서 한 단계로 따라 나오면 지지) | 층 (다) | 과대 인정 위험(D-0189 재검토 축) |
| 정답 판정 모델 재검토(D-0104·D-0107) | 층 (나), 질문 품질 | 정답 세션 비용 약 20배 |
| 서버가 판정을 내린 경우 설명 입력에 표시 | 설명–판정 반대 4칸 | 설명 지시문 변경 |
| 원문 칠하기 mark.quote 서버 검사 | 칠하기 인용 3칸 | 작음 |

순서 제안: 서버 294행 고침 → 같은 183칸 중 영향 칸만 재판정(저장 응답 재사용 가능 여부 확인, D-0168) → 그다음 모델과 171행.

## 6. 열린 질문

1. A-aud16이 이번 15/15는 UNTOUCHED였는데 원래 진단 1회는 WEAKER였다. 무엇이 가르나? 입력이 원래 진단과 글자 단위로 같은지는 확인하지 않았다(REVIEW-opus 4-1).
2. A-cog16 luna의 "의미로 전환되는" 오류 판단 중 `A-cog16__L-now__r1`은 지문의 다른 문장을 근거로 들었다. 이것을 낱말 차이로 볼지는 사용자 판단이 필요하다(REVIEW-opus 4-2).
3. 오디오 16 기대 판정('충분')을 유지하면, 고칠 곳은 지시문 64–66행 ③ 판단 칸 정의다(REVIEW-opus 4-3).
4. 질문의 "사실 하나" 경계: 253–254행(한 비교의 요소는 함께 물을 수 있음)과 274행(한 질문에는 사실 하나만)이 겹친다.
5. 블라인드 이해 용이성 판정 범위. 질문 묶음 21KB, 설명 묶음 92KB다. 설명은 서버가 내린 칸 때문에 판정과 설명이 엇갈리는 칸이 섞여 있다.

## 7. 파일

- 칸 결과: `docs/experiments/judge-model-explanation-2026-11-08/runs/`
- 요약: `SUMMARY.md`, `SUMMARY.json` (최종 판정 기준)
- 독립 검토: `REVIEW-opus.md`
- 블라인드 묶음: `blind/QUESTIONS.md`, `blind/EXPLANATIONS.md`, `blind/KEY.json`
- 실행기: `scripts/run-judge-model-explanation.mjs`, `scripts/summarize-judge-model-explanation.mjs`, `scripts/build-judge-model-explanation-blind.mjs`, `scripts/run-judge-model-explanation.test.mjs`

## 8. 추가: 방안 A 적용 재생 (2026-11-08)

- 코드: `feedback-claims.ts` readingJudgment. `factClaims = groundClaims.filter(c => c.sourceCheck !== 'CHOICE_READING')`, `factClaims.length > 0 && factClaims.every(CONSISTENT)`. 결정 D-0211.
- 재생 방법: `scripts/replay-judge-model-explanation-server-a.mjs`. 저장된 `requests[].output_text`를 가짜 transport로 같은 순서대로 넣고, 지금 빌드의 OpenAIFeedbackEvaluator로 다시 판정한다. 외부 호출 0. 결과 `replay-server-a.json`.
- 변화: 9칸 INSUFFICIENT → SUPPORTED. `A-horse6__L-now__r1`, `A-horse6__L-lab__r2`·`r3`, `A-cog16__L-now__r2`, `A-cog16__L-lab__r1`, `B-horse6__S-now__r1~r3`, `B-plas10__S-now__r2`. 반대 방향 0, C 변화 0, NEEDS_NEW_CALL 0.
- 판정기 SUPPORTED·최종 INSUFFICIENT로 남은 5칸:
  - `A-cog16__L-none__r3`·`L-now__r3`: 사실 주장 UNDETERMINED, relation REVERSED.
  - `A-horse6__S-now__r3`: 선지 주장 UNTOUCHED(171행).
  - `A-horse6__L-lab__r1`·`L-now__r2`: ground quote가 CHOICE_READING 부분에만 걸려 사실 주장 0.
- 시험: pipeline 1237 통과, 실패 1(`axis-architecture-experiment.test.ts` ENOENT, 무관한 기존 실패).
- 열린 질문 추가: ground quote 범위의 칸마다 흔들림(luna). 인용 밖 사실 주장을 인정할지는 D-0211 다시 볼 조건.

