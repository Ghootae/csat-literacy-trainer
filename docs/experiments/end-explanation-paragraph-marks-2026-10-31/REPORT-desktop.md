# 마지막 설명 레이아웃 v2 초안(문단 목록 + 칠할 곳) 12건 생성 — Desktop 보고

날짜: 2026-10-31. 사용자 승인: "승인, 12건 생성 진행해". 방향 결정: [D-0193](../../../memory/decisions/D-0193-end-explanation-paragraph-steps-with-marks.md).

## 조건

- 입력: `end-explanation-layout-2026-10-28/requests/<사례>.request.json` 12건 그대로(input 동일 검사). 모델 배정도 그대로: luna 9(KC-r1, QP-r1, QP-r2, XA-r1, XS-r1, K4-r3, K4-r1, KF-r1, C-CT), sol 3(D-A3, S-A1, C-B3). reasoning medium, max_output_tokens 8000.
- 지시문: 저장 요청의 v1(sha256 `d9f55a68…`, 10-28 RUN.json 기록과 같음)에서 `[칸과 화면]` 문단만 교체하고 `[문단과 칠할 곳]` 절을 추가(`instructions-v2.txt`, sha256 `5bd14cc3…`, 초안 `PROMPT-DRAFT.md`).
- 출력 형식: `{ firstChoice: Paragraph[], reselection: Paragraph[] | null, answer: Paragraph[] }`, `Paragraph = { text, mark: { location: PASSAGE|SCENARIO, quote } | null }`(strict json_schema).
- 검사(재시도 사유): reselection 유무, 문단 한글 4자 이상, 내부 식별자·'교정 질문' 금지, 첫 문단의 sectionLeads 되풀이. 최대 2회.
- 기준(재활용, D-0168): 같은 입력의 v1 출력 `end-explanation-layout-2026-10-28/RESULTS.json`(사용자 판정 11/12 긍정).
- 스크립트 `scripts/run-end-explanation-paragraph-marks.mjs`. 결과 `responses/`, `ledger.jsonl`, `FIXTURE.json`(미리보기용), `COMPARE.md`(v1·v2 나란히).
- 미리보기: 서버 `startEndPreview`가 caseId 접두 `v2:`이면 이 폴더의 FIXTURE를 읽게 고침(`packages/app/src/server/problem-feedback.ts`). `/problem/lab?endPreview=v2:<사례>`. 12건 모두 `AWAITING_UNDERSTANDING`으로 열림 확인.

## 측정

- 형식: 12/12 첫 시도 통과, 재시도 0. 비용 $0.088(luna $0.012, sol $0.077).
- 문단: 총 69개. 칸별 문단 수 firstChoice 1~3, answer 2~4, reselection 3(C-B3).
- 칠할 곳: 48/69 문단에 지정, **48/48 원문에서 정확히 한 번 찾아짐**. null 21.
- 분량(전체 글자 수): luna 4,684 → 5,000(+7%), sol 3,868 → 3,632(−6%). 사례별로는 KF-r1 정답 칸 504 → 337처럼 줄어든 것도 있다.
- 60자 미만 문단 5개:
  - 결론 한 문장 단독 3개: K4-r1 정답 27자, QP-r2 정답 20자("그러므로 ③은 가장 적절한 내용이야."), XS-r1 정답 27자.
  - 짧은 문단 2개: K4-r1 firstChoice 48자, XA-r1 정답 56자.
- 요점 하나짜리로 사용자가 나누지 말자고 한 모양(QP-r2 정답 칸, v1 281자 한 문단)이 v2에서 3문단(141+129+20)으로 나뉨. 1·2문단 칠할 곳이 같은 문장.

## 해석

1. quote 정확도는 문제없다. luna도 원문을 그대로 옮겼다. 원문에 정확히 한 번 나오는지만 코드가 확인하면 된다.
2. 문단 나누기는 너무 잘다(특히 luna). 지시문의 "칸 전체의 요점이 하나뿐이면 문단도 하나", "짧은 단계는 앞뒤 단계와 한 문단에 묶는다"가 결론 문장에는 지켜지지 않았다. 결론 한 문장 문단은 [다음]을 한 번 더 누르게 만든다.
3. 글 품질(풀어 쓰기·정확성)은 사용자 판정이 필요하다(코드 에이전트 판정은 이해 용이성에 부적합, 메모리 규칙).

## 제안·열린 질문

- 사용자 판정 대기: 12건 미리보기·`COMPARE.md`로 (가) 글 품질이 v1보다 나빠지지 않았는지, (나) 문단 나누기, (다) 칠한 곳이 핵심인지.
- 형식 문제 보완 후보(판정 뒤 결정): 지시문에 "마지막 결론 문장은 앞 문단 끝에 붙인다", "한 문단은 두 문장 이상" 추가. 또는 코드에서 60자 미만 마지막 문단을 앞 문단에 합치기(칠할 곳은 앞 문단 것 유지).

## 정정

- 채팅 중간 보고에서 "문단 87개 중 64개에 칠할 곳 지정"이라고 했으나 실제는 69개 중 48개다.
- 같은 보고의 "분량도 v1보다 줄었다"는 KF-r1 한 사례 이야기였다. 전체로는 luna +7%, sol −6%다.
