# CLI 지시문: v6 코드 반영 (웹 2026-11-24 00:2x KST)

이 지시문을 붙여 넣는 것이 `PROPOSAL-code-v6.md`의 승인이자 아래 커밋·푸시의 승인이다.

```
규칙 감사 3단계 마무리: v6 코드 반영 (웹 2026-11-24, PROPOSAL-code-v6.md)

0. 지킬 것
   - v5 동작을 바꾸지 않는다. 새 동작은 모두 RULES_V=6일 때만 켠다(기본값 5).
   - v5 규칙 파일은 고치지 않는다. v6 규칙 파일은 PROPOSAL-code-v6 3절의 세 곳만 고친다.
   - API를 부르는 실행(run.mjs, eval-repair.mjs 실제 실행)은 하지 않는다.
   - 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)는 건드리지 않는다. checkout·stash·restore 금지. .git 잠금 파일이 있으면 기다린다.
1. 전제 확인(없으면 멈추고 묻는다): docs/experiments/rule-audit-2026-11-23/PROPOSAL-code-v6.md, docs/experiments/deep-item-v5-2026-11-18/의 *-v6.md 9개.
2. PROPOSAL-code-v6 3절대로 v6 규칙 파일 세 곳을 고치고 grep으로 확인한다.
3. PROPOSAL-code-v6 2절대로 docs/experiments/deep-item-v5-2026-11-18/run.mjs에 RULES_V=6 분기를 넣는다. 지시 문안은 2-2~2-5의 따옴표 안 문장을 그대로 쓴다. 줄 전체를 다시 읽고(REPORT-v6-migration은 230자까지만 봤다) 옛 번호가 v6 분기 문자열에 남지 않게 한다.
4. PROPOSAL-code-v6 4절대로 eval-repair.mjs에 RULES_V=6 분기를 넣는다. 판정은 순수 함수 classifyV6로 떼어 내고, 4-4절 시험 사례 6개를 테스트 파일로 만든다(예: docs/experiments/deep-item-v5-2026-11-18/classify-v6.test.mjs, node로 바로 실행되게).
5. 확인(API 비용 없음):
   - node --check run.mjs, node --check eval-repair.mjs
   - 시험 사례 6개 실행 결과
   - v5 경로 확인: 기존 out 폴더에 저장된 e1~e3 결과가 있으면 그것으로 v5 판정을 다시 계산해 저장된 diag와 같은지(없으면 없다고 적는다)
   - RULES_V=6에서 3단계 지시 문자열을 만들어 파일로만 써 보는 건조 실행(dry run) 옵션이 있으면 그것으로 문자열을 뽑아 옛 번호(C숫자, K-S, K-E, "규칙 숫자") grep. 없으면 문자열 조립 부분만 떼어 node로 출력해 본다. API는 부르지 않는다.
6. 보고서 docs/experiments/rule-audit-2026-11-23/REPORT-v6-code.md에 바꾼 곳(파일:줄), 5단계 결과, PROPOSAL 문안과 다르게 할 수밖에 없었던 곳(후보)을 적는다.
7. 커밋할 파일(먼저 목록을 보여 준다):
   docs/experiments/rule-audit-2026-11-23/PROPOSAL-code-v6.md, CLI-step3b-code-v6.md, REPORT-v6-code.md
   docs/experiments/deep-item-v5-2026-11-18/run.mjs, eval-repair.mjs, classify-v6 테스트 파일, 고친 v6 규칙 파일 3개
   그 밖의 파일(.omc/, .DS_Store, 오답 카드 4개 등)은 넣지 않는다.
   메시지 예: "규칙 감사 3단계: v6 코드 반영(RULES_V=6, strategies 칸, e3 task·bogi_only, 판정 재분류)"
   커밋 뒤 git push origin experiment/problem-solving-mvp (force 금지).
8. memory/CURRENT_STATE.md의 "다음 = 웹이 코드 수정안(...) → CLI 반영 →" 부분을 "v6 코드 반영 끝(RULES_V=6). 다음 = R1~R3·S12 재표시(비용 없음) → 4단계 시험 생성(v5·v6 나란히, 확인용 6개, 순서표 수정 포함)."으로 바꾼다.
9. 보고하고 멈춘다: 5단계 결과, git log -1 --oneline, 푸시 결과, git status --short | wc -l.

추정 비용: API 비용 없음(코드 수정·문법 검사·가짜 데이터 시험만).
```
