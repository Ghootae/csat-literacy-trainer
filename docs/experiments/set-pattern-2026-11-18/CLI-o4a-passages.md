# CLI 지시문: 순서표 ④ 1단계 — 생성 지문 4편 + 충실도 (웹 2026-11-25, 추정 약 $2.2, 상한 $3)

계획: `docs/experiments/set-pattern-2026-11-18/PLAN-o4-generated-L3b.md` 3절.

```
순서표 ④ 1단계 (CLI-o4a-passages.md): 생성기 v3.2로 T4(인문 입장형)·T5(경제) 각 2편 + 충실도 검사

0. 지킬 것
   - 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)는 건드리지 않는다. git checkout·stash·restore 금지.
   - 규칙·프롬프트 파일(G32/prompts/*)은 고치지 않는다. 커밋하지 않는다.
   - G32 = docs/experiments/passage-gen-v3.2-2026-11-21

1. 전제 확인(하나라도 어긋나면 API 호출 없이 멈추고 보고)
   a. git log --oneline -5 에 순서표 ③ 마무리 커밋(CLI-cell3f-close)이 있는가. 없으면 먼저 CLI-cell3f-close.md를 실행할지 묻고 멈춘다.
   b. G32/commissions/T4.md 에 "- 목표 구조: S7-3" 1줄, G32/commissions/T5.md 에 "- 목표 구조: S2-4" 1줄.
   c. G32/out-o4 폴더가 없어야 한다(있으면 덮지 말고 보고).
   d. 주제 겹침: 158세트 기출 제목·세트 목록(docs/experiments/structure-catalog/ 의 INVENTORY.md 또는 suneung_db 제목)에서
      "도덕적 운", "운", "통제", "가격 상한", "가격 규제", "최고 가격" 을 찾는다.
      - T4 주제가 걸리면 T4.md의 주제 줄을 대체 주제(예술 작품의 정의: 제도론과 그 비판)로 바꾼다.
      - T5 주제가 걸리면 T5.md의 주제 줄을 대체 주제(관세와 국내 가격)로 바꾼다.
      - 바꿨으면 무엇을 왜 바꿨는지 보고에 적는다. 둘 다 대체 주제도 걸리면 멈추고 보고.

2. 비용 추산(실행 전): 생성 4편 × (G32/out-T3/usage.json 의 편당 실측) + 충실도 4 × (fidelity-check 편당 실측 약 $0.09).
   합이 $3를 넘을 것으로 보이면 멈추고 보고.

3. 생성
   GEN_MODEL=gpt-6.2-sol SAMPLES=2 TOPICS=T4,T5 OUT_DIR=out-o4 \
   node docs/experiments/passage-gen-v3.2-2026-11-21/run.mjs > docs/experiments/passage-gen-v3.2-2026-11-21/out-o4.log 2>&1
   - 로그에 "지정 구조 … 인데 설계서는 …" 경고가 있으면 보고에 적는다.

4. 충실도 검사 4편: ⑤ 1단계 재실행(out-T3)과 같은 스크립트·옵션으로 out-o4/T4-1, T4-2, T5-1, T5-2 의 final-passage.md 를 검사한다
   (목표 구조 T4 = S7-3, T5 = S2-4, 로그는 G32/out-o4-fidelity-<편>.log, 출력 이름은 v32-out-o4-<편>).

5. 보고서 docs/experiments/set-pattern-2026-11-18/REPORT-o4a-passages.md (한국어, 판정·선택은 하지 않는다)
   - 편마다: 충실도 판정·가장 가까운 구조·겹침, 글자 수·문단 수·문단별 문장 수, structure.txt
   - 편마다 계획 3-3절 기준에 쓸 사실만 옮겨 적는다(판단은 웹이 함):
     T4: 입장 이름과 각 입장의 판정 기준 문장(문단 번호와 함께 그대로 인용), 끝 문단 첫 문장·마지막 문장, 사람 이름에 귀속한 주장 목록
     T5: 끝 문단 전체, "무엇이 늘면/줄면 무엇이 어떻게 되는가" 형태의 관계 문장 목록(문단 번호)
   - final-passage.md 4편 전문을 보고서 끝에 붙인다.
   - 실제 비용: out-o4/usage.json + 충실도 비용 합.

6. 끝나면 멈춘다. 2단계(지도·문항)는 웹의 다음 지시문(CLI-o4b)을 기다린다.
```
