# CLI 지시문: 사실 바꾸기 검사(M6)를 검사기에 넣고, 고체 촉매·도덕적 운 사례 칸 재시험 (웹 2026-11-25 22시 KST)

근거: $SP/case-check/REVIEW-case-false-spot-web.md(손 집계), REPORT-case-fact-check.md(무료 검증 통과: 선지 일치 86~88%, 기출 걸림 K2·K4뿐, 생성 걸림 22~23/24).
결정: Ghootae 2026-11-25 21:42 KST 카드 "넣고 사례 두 칸 재시험". 이 지시문을 붙여 넣는 것이 아래 코드 수정, API 실행(상한 $3), 커밋·푸시의 승인이다.
**추정 비용: 약 $1.3 (상한 $3).** 새로 만들지 않고 지금 칸의 최종 문항 8개(파일 4개)에 새 검사·수리만 돌린다. 근거: 검사+수리 파일당 약 $0.27(③·④ usage 실측 0.10~0.17 + 수리 0.1~0.15), 노출 수리 약 $0.03. 블라인드는 codex라 0원.

```
사례 칸 재시험(CLI-case-fact-repair.md). V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18.

0. 지킬 것·전제
   - 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md), 그래프 스레드 파일($SP/graph*, $V5/graph/, $V5/out-graph*)은 건드리지 않고 커밋에 넣지 않는다. checkout·stash·restore 금지.
   - 생성 규칙 파일(rules-*-v6.md, kind-*-v6.md, strategies-v6.md)과 run.mjs는 고치지 않는다. 이번에 고치는 코드는 eval-repair.mjs와 classify-v6.mjs(+시험 파일)뿐.
   - 앞 작업 $SP/case-check/(무료 검증) 커밋이 아직이면 먼저 따로 커밋·푸시한다: "사례 검사 기준: 틀린 곳 위치 손 집계 + 사실 바꾸기 검사 무료 검증". 해시를 적는다.
   - 수리 기준 RULES_V=6, 생성·검사 모델 기본값(gpt-6.2-sol), 판정 codex gpt-6.1-sol.

1. 코드 (API 비용 없음) — v6.4
   a. eval-repair.mjs e3(V6일 때) 선지별 칸에 하나 더:
      - fact_sensitive: 〈보기〉의 사실(값, 일어난 일, 일어난 순서, 누가 무엇을 알았거나 할 수 있었나) 가운데 하나를 그럴듯하게 바꾸었을 때 이 선지의 정오가 바뀌는가? 바뀌면 true와 fact_change("바꾼 사실 → 바뀐 결과" 한 줄). 〈보기〉에서 이름·정체(누가 누구인지, 무엇이 무엇인지)만 가져오고 어떤 사실을 바꿔도 정오가 그대로면 false와 fact_change에 정오를 정하는 지문 문장 한 줄. 선지가 〈보기〉 속 이름을 쓴다는 것만으로 true로 하지 않는다. 선지 안의 '~라면' 조건은 선지의 일부로 본다.
      (문구는 $SP/case-check/CODEX-PROMPT.md와 같게. JSON 예시에도 "fact_sensitive":true,"fact_change":"..." 추가)
   b. classify-v6.mjs에 방식 위반 M6(원리 뒤집기 선지):
      - 부정 발문: 정답 선지의 fact_sensitive === false → M6 "정답이 지문 원리를 뒤집어 만든 선지: n"
      - 긍정 발문: 정답 아닌 선지 중 fact_sensitive === false가 3개 이상 → M6 "오답 중 지문 원리를 뒤집어 만든 선지: a,b,c"
      - null·없음은 세지 않는다. 기존 규칙 그대로: 방식 위반 1개 이상이면 수리, kind가 view면 수리 없이 경고(관점은 경고만).
      - 결과에 factSensitive 배열([true/false/null ×5])과 m6Choices를 넣는다.
   c. e4 수리 지시(V6)에 M6 한 줄 추가:
      "M6 원리 뒤집기: 사유에 적힌 선지만 고친다. 그 선지의 지문 원리 부분은 지문대로 맞게 쓰고, 〈보기〉의 사실(값·일어난 일·순서·누가 무엇을 알았거나 할 수 있었나) 하나와 어긋나서 정오가 정해지게 바꾼다. 부정 발문의 정답이면 여전히 거짓, 긍정 발문의 오답이면 여전히 거짓이어야 한다. 그렇게 하려면 〈보기〉에 사실 한 문장을 더하거나 바꿀 수 있다(갈래 길이 안, 판정어·목적·까닭은 쓰지 않음). 다른 선지가 그 〈보기〉 변경으로 정오가 바뀌지 않는지 확인한다."
   d. 파일 머리 주석에 v6.4 설명 한 줄(근거 case-check 두 문서, 결정 카드 시각).
   e. classify-v6.test.mjs에 시험 5개 추가: 부정 발문 정답 false → M6·수리 / 긍정 발문 오답 false 3개 → M6 / 2개 → M6 없음 / null 3개 → M6 없음 / kind view + M6 → 수리 없음·경고. 전체 시험 통과 확인(옛 시험 그대로 통과).
   f. 건조 확인: e3 지시문에 fact_sensitive 문단이 들어갔는지(DRY_RUN이 eval-repair에 없으면 grep으로 확인).

2. 비용 추산(실행 전): 아래 4개 파일 × (e1·e2·e3 + 걸리면 e4·e1r~e3r) + 노출 수리. 이전 usage.json(out-cell3-v62*/…/repair, out-o4-regen/…/repair)로 예상치를 적고, $3을 넘을 것 같으면 멈추고 보고.

3. 검사·수리 실행(API). 입력 = 지금 칸의 최종본(노출 수리본). 결과는 새 폴더 $V5/out-case-m6/<이름>/ 에:
   - solid-A:  PASSAGE=solid-catalyst IN=$V5/out-cell3-v62/solid-catalyst-A/leakfix/items-leakfix.json
   - solid-B:  PASSAGE=solid-catalyst IN=$V5/out-cell3-v62-regen/solid-catalyst-B/leakfix/items-leakfix.json
   - moral-A:  PASSAGE=gen32-o4-T4-1 IN=$V5/out-o4-regen/gen32-o4-T4-1-A/leakfix/items-leakfix.json   (V1 view는 검사만, 수리 안 됨)
   - moral-B:  PASSAGE=gen32-o4-T4-1 IN=$V5/out-o4-regen/gen32-o4-T4-1-B/leakfix/items-leakfix.json
   각각 RULES_V=6 REPAIR=1 node $V5/eval-repair.mjs (OUT_DIR=$V5/out-case-m6/<이름>/repair) → 수리된 파일만 leak-fix.mjs (OUT_DIR=…/leakfix).
   기록: 문항별 factSensitive 5개, M6 걸림 여부·선지, 수리 여부, 수리 후 M6이 풀렸는지, 정답 번호 유지, 수리 전·후 고친 선지와 〈보기〉 문장 나란히.
   웹 손 분류 예상(참고): 고체 B-V1·B-V2, 도덕 A-V2·B-V2 걸림 / 고체 A-V1 안 걸림 / 고체 A-V2 애매.

4. 블라인드(codex, 0원). 요청문·결함 목록은 $SP/o4/blind-T4 CODEX-PROMPT 그대로, 회차마다 평가자 4명, 새 임시 폴더, 2회(seed 20261261, 20261262).
   - $SP/case-check/blind-solid/: 고체 촉매 사례 A-V1, A-V2, B-V1, B-V2 = 수리 후 최종본(안 걸린 문항은 원본 그대로) + 수리된 문항은 수리 전 판도 + 자격 기출 플라스틱 10번.
   - $SP/case-check/blind-moral/: 도덕적 운 사례 A-V2, B-V2 = 수리 후 최종본 + 수리 전 판 + 자격 기출 공손룡 12번.
   - 점검: 문항 수, KEY 정답, 출처 표기 grep 0, 지문 ㉮·㉯ 표시가 풀이지에 남아 있는지(무료 검증 때 빠졌던 듯함).

5. 집계 $SP/case-check/aggregate-m6.md:
   - 문항별 회차별 등급·평균, 수리 전·후 나란히
   - 칸 평균(두 회차): 고체 사례 = 4문항 수리 후판, 도덕 사례 = 2문항 수리 후판. 옆에 같은 블라인드 안의 수리 전판 칸 평균과, 이전 값(고체 1.094, 도덕 0.688)
   - 자격 기출 회차별 평균(1.5 미만이면 그 회차는 멈춤 회차로 표시)
   - 결함 표시 ㉯·㉲ 수(수리 전·후), 평가 이유를 '정답이 지문 한 문장', '오답이 지문 원칙만으로 지워짐', '〈보기〉 수리 흔적(어색·장황)', '정답 시비', 기타로 묶어 센다.

6. 보고서 $SP/case-check/REPORT-case-fact-repair.md(측정만)와 -human.md(쉬운 말 5~8줄). 실제 비용(usage.json 합).

7. 커밋(목록을 먼저 보여 준다): $V5/eval-repair.mjs, $V5/classify-v6.mjs, $V5/classify-v6.test.mjs, $V5/out-case-m6/, $SP/case-check/(이 지시문 포함). 메시지: "검사기 v6.4: 사실 바꾸기 검사(M6) + 고체 촉매·도덕적 운 사례 수리 재시험". git push origin experiment/problem-solving-mvp (force 금지).

8. 보고하고 멈춘다: 시험 결과, 비용 추산·실제, 문항별 M6·수리 표, 등급표, 칸 평균(수리 후·수리 전·이전 값), 자격 기출, 결함·이유 분류, git log -1 --oneline, 푸시 결과, git status --short | wc -l. 판정은 웹이 한다.
```

## 설명 (쉬운 말)

- **무엇을:** 검사기에 "〈보기〉의 사실 하나를 바꾸면 이 선지의 참·거짓이 바뀌나?" 질문을 넣습니다. 걸린 선지는 "원리는 맞게, 〈보기〉 사실과 어긋나게" 고치게 합니다.
- **어떻게:** 새로 만들지 않고, 지금 미달인 두 칸(고체 촉매 사례, 도덕적 운 사례)의 최종 문항에 새 검사와 수리만 돌립니다. 그다음 수리 전·후 판을 같은 블라인드에 넣어 평가자 4명이 2회 봅니다.
- **왜 새로 안 만드나:** 새로 만들면 문항 자체가 바뀌어서, 점수가 올라도 검사 덕인지 운인지 알 수 없습니다. 같은 문항의 전·후를 비교하면 수리의 효과만 보입니다. 비용도 재생성(약 $3~4)보다 적습니다.
- **판정(웹, 4-3):** 수리 후 칸 평균이 1.5 이상이면 통과입니다. 수리 전판보다 올랐는지, '〈보기〉에 덧댄 흔적'이 새 감점 이유로 생기지 않았는지도 함께 봅니다.
- **그다음:** 통과하면 v6.4를 기본값으로 두고 다음 칸으로 갑니다. 안 오르면 수리가 아니라 3단계(〈보기〉 조립)에서 거짓을 〈보기〉 쪽에 두게 하는 방법을 검토합니다.
