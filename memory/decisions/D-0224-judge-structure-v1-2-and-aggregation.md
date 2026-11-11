---
id: D-0224
status: accepted
date: 2026-11-10
scope: principle-application-item-generation
supersedes: none (D-0223 v1.1을 보완하고, D-0215 6항 주 결과의 보고 방식을 구체화한다)
---

# 구조 판정 v1.2(상황 확인 질문·거짓 선지 경계), 발문 방향 키, 주 지표는 범위로

## 결정

사용자(2026-11-10): 웹 검토 `docs/handoffs/2026-11-10-judge-v1.1-review-web.md`에 "데스크탑 에이전트의 의견에 동의해".

1. **기준표·판정 지시문 v1.2**
   - 파일: `docs/experiments/principle-application-structure-2026-11-09/JUDGE-STRUCTURE-v1.2.md`, `judge/JUDGE-INSTRUCTIONS-v1.2.md`
   - 3절의 '상황 아님' 첫 줄을 밑줄 여부가 아니라 **밑줄이 가리키는 것**으로 가른다.
     - 개념·용어를 가리키면 상황이 아니다.
     - 조건을 가진 구체 사례·현상을 가리키면 상황이다.
   - 확인 질문을 둔다. "그때 무슨 일이 일어나는가 / 왜 일어나는가"를 물을 수 있으면 상황이다.
   - 이유·원인을 묻는 발문의 현상도 상황이다.
   - 1절에 거짓 선지 문장을 둔다.
     - 지문·〈보기〉 문장(하나 또는 둘을 이은 것)과 직접 어긋나면 `STATED`·`COMBINED`다.
     - 계산해야만 틀림이 드러날 때만 `APPLIED`다.
     - "지문에 없는 주장"이라는 이유만으로는 `APPLIED`가 아니다.
   - 예시는 지어낸 진자 지문만 쓴다. 웹 검토가 든 평가 문항 예시(mRNA 20, 공손룡 11)는 지시문에 넣지 않았다.
2. **적용 범위(방안 가)**
   - E1 4지문과 P1 판정부터 v1.2를 쓴다.
   - 개발자 화면 4지문은 v1.1 결과로 두고 다시 판정하지 않는다. mRNA 20은 경계 사례로 보고한다.
3. **발문 방향 키**
   - `scripts/build-structure-judge-bundle.mjs`가 `blind-key.json`에 `direction`을 붙인다.
     - 발문에 이유·원인·때문이 있으면 `REVERSE`(결과 → 원인), 아니면 `FORWARD`(조건 → 결과)다.
   - 판정자 입력에는 넣지 않는다(`FORBIDDEN_KEYS`).
   - 현재 기출 31문항 가운데 `REVERSE`는 mRNA 20 하나다.
   - 판정자 입력 파일은 바뀌지 않았다(재생성 전후 비교).
4. **주 지표 보고 방식**
   - 엄격 값(두 판정자 모두 `APPLIED`)과 관대 값(하나라도 `APPLIED`)을 함께 낸다.
   - 실행이 둘 이상인 지문(개발자 4지문 v1·v1.1)은 실행 사이의 차이를 범위로 낸다(예: 4~5/17). 차이가 난 문항은 사례로 적는다.
   - 숫자 하나에 의미를 싣지 않는다. 같은 모델 판정자 둘은 함께 흔들릴 수 있어(mRNA 20 ①), 판정자 간 일치율은 신뢰도를 과대평가한다.
5. **P1 a는 유지한다.**
   - 〈보기〉 없는 원리 적용 문항은 드물지만 있다(표면 장력 15, 공손룡 11, mRNA 20).
   - 본설계에서 a·b의 우선순위는 P1 결과를 보고 정한다.
   - P1에서 b의 (나) 탈락이 많으면 먼저 `breaksStep`(어느 계산 단계를 비틀었나)으로 원인을 본다.
   - 생성 지시문은 고치지 않는다.

## 근거

- `docs/experiments/principle-application-structure-2026-11-09/REPORT-judge-v1.1-desktop.md` 5·6절
- 웹 검토 `docs/handoffs/2026-11-10-judge-v1.1-review-web.md`
- 시험: `node --test scripts/build-structure-judge-bundle.test.mjs` 10 통과(방향 키 시험 1개 추가)

## 다시 볼 조건

- v1.2로 판정한 E1 4지문·P1에서 `onItemSituation`이나 거짓 선지 `basis`가 문항 단위로 갈리면 기준을 다시 본다.
