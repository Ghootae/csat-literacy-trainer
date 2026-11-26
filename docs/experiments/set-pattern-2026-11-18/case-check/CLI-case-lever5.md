# CLI 지시문: 기본값 되돌리기 + 사회 사례 재시험(청약 철회) (웹 2026-11-26 13시대 KST)

결정: Ghootae 2026-11-26 "CLI-case-close.md 벌써 돌렸어. 되돌리고 시험을 한번 더 한 후 결정" + 시험 설계 "B형은 새 순서로 돌려서 통과하는지만 테스트. A형은 옛 순서, 새 순서 모두 돌려서 결과를 살피기."
**추정 비용: 약 $1.9 (상한 $3.5).** 생성 3회(A 옛, A 새, B 새)다. 공손룡 ONLY=V1 2회 실측이 $1.24였으니 1회에 약 $0.6이다. 블라인드는 codex라 0원. 되돌리기는 0원.
이 지시문을 붙여 넣는 것이 아래 되돌리기·API 실행(상한 $3.5)과 커밋·푸시의 승인이다.

```
기본값 되돌리기 + 사회 사례 재시험(CLI-case-lever5.md). V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18, CC=$SP/case-check.

0. 지킬 것: 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)와 그래프 파일은 건드리지 않는다. 규칙 파일(rules-*-v6.md, kind-*-v6.md, strategies-v6.md)도 고치지 않는다. checkout·stash·restore 금지, force push 금지, git reset 금지. git log -1이 e04c9b01인지 적는다.

1. 되돌리기 (API 비용 없음, 새 커밋으로)
   a. e04c9b01의 두 파일 변경만 거꾸로 적용한다:
      git show e04c9b01 -- $V5/run.mjs $SP/PROGRESS-hard.md | git apply -R
      실패하면 손으로 되돌린다: run.mjs의 v6.7 주석 한 줄과 "v6.7 기본값" if 블록을 지우고 "let LEVER"를 "const LEVER"로 돌린다. PROGRESS-hard.md는 e04c9b01이 바꾼 세 곳(과학 사례 칸 앞 문구, 인문 사례 칸 앞 문구, 기록 맨 끝 줄)을 원래대로 돌린다.
      CLI-case-close.md와 docs/handoffs/2026-11-26-case-check-done.md는 지우지 않는다(기록으로 남긴다).
   b. PROGRESS-hard.md 기록 맨 끝에 한 줄을 더한다:
      "- 2026-11-26 e04c9b01(사례 순서 기본값) 되돌림: 증거가 얇다(지문 3개, 잡음 ±0.4, 도덕적 운 통과는 2회 합친 것, B/A 구분은 결과 뒤에 그음). CASE_FLOW=lever는 켤 때만 도는 스위치로 돌아감. 판정 = 유망, 미확정. 사회 사례 재시험 = CLI-case-lever5(청약 철회). 인계 handoffs/2026-11-26-case-check-done.md."
   c. 인계서 docs/handoffs/2026-11-26-case-check-done.md는 웹이 Mac에 새 문구(유망·미확정)로 덮어써 두었다. 첫 줄 제목에 "미확정"이 있는지 확인만 한다. 없으면 멈추고 보고한다.
   d. 확인: grep으로 run.mjs에 "v6.7"이 없는지, "const LEVER = V6 && process.env.CASE_FLOW === 'lever'"가 있는지 본다. classify-v6 시험이 전체 통과하는지 본다.
   e. 커밋(목록 먼저): $V5/run.mjs, $SP/PROGRESS-hard.md, docs/handoffs/2026-11-26-case-check-done.md, $CC/CLI-case-lever5.md.
      메시지: "사례 순서 기본값 되돌림(e04c9b01): CASE_FLOW=lever는 스위치로만, 판정 미확정". push(force 금지).

2. 생성 준비 (API 비용 없음)
   - 지문 = gen32-T3-2(청약 철회, 생성 v3.2, 사회 법). 사례 칸은 V1만 만든다. 1-search·2-select와 확정 다른 버전(V2 case)은 KEEP_OUT=out-cell5에서 가져온다(공손룡 때와 같은 방식).
   - 건조 실행 두 번:
     · 옛 순서: RULES_V=6 DRY_RUN=1 PASSAGE=gen32-T3-2 MODE=A KIND_V1=case KIND_V2=case ONLY=V1 KEEP_OUT=out-cell5 OUT_NAME=out-case-lever5-dry → 사례 갈림 사실 블록이 없어야 하고, 2-select 재료가 들어가야 한다.
     · 새 순서: 위에 CASE_FLOW=lever를 더한다 → "[재료 없음]" 한 줄, 사례 블록, pair 예시가 있어야 하고, 2-select 본문은 없어야 한다.
     끝나면 건조 폴더를 지운다.
   - 비용 추산을 적는다. 상한을 넘을 것 같으면 멈추고 보고한다.

3. 생성 (API). 이 순서로 한다. zsh는 export 방식. 로그는 $V5/out-case-lever5<-old>-gen32-T3-2-<A|B>.log.
   - A 옛: RULES_V=6 PASSAGE=gen32-T3-2 MODE=A KIND_V1=case KIND_V2=case ONLY=V1 KEEP_OUT=out-cell5 OUT_NAME=out-case-lever5-old   (CASE_FLOW는 주지 않는다)
   - A 새: 위와 같고 CASE_FLOW=lever, OUT_NAME=out-case-lever5
   - B 새: RULES_V=6 CASE_FLOW=lever PASSAGE=gen32-T3-2 MODE=B KIND_V1=case KIND_V2=case ONLY=V1 KEEP_OUT=out-cell5 AVOID_OUT=out-case-lever5 OUT_NAME=out-case-lever5
   각각 run.mjs → eval-repair.mjs(RULES_V=6 REPAIR=1) → 필요하면 leak-fix.mjs. 각 1회뿐이고, 결함이 나와도 기록만 한다.
   기록 $CC/lever5-record.md (문항 3개):
   - 새 판 두 개: lever-check(처음, 재호출, 최종 일치/유사/없음), pair, principleCards·leverTable, 선지별 facts·misread
   - 셋 다: 수리 여부, 발문 되돌림, 결함 표시
   - A 옛·A 새의 〈보기〉·선지·정답 나란히, B 새와 참고용 옛 B(out-cell5/gen32-T3-2-B V1 최종)의 〈보기〉·선지·정답 나란히
   - 결정 선지 원문 표(웹 손 분류용, 분류는 하지 않는다)

4. 블라인드 $CC/blind-lever5/ (codex gpt-6.1-sol, 0원, 요청문은 $SP/o4/blind-T4 CODEX-PROMPT 그대로, make_blind 스크립트는 지난 것을 고쳐 쓴다)
   - 문항 5개(지문 두 개: 청약 철회, 공시):
     · 새 B-V1, 새 A-V1 (out-case-lever5 최종: leakfix 채택본, 없으면 repair/items-final.json)
     · 옛 A-V1 (out-case-lever5-old 최종)
     · 참고 옛 B-V1 (out-cell5/gen32-T3-2-B V1 최종) — 판정 기준에는 안 쓴다
     · 자격 기출 공시 12번(①·⑤칸 블라인드에서 쓴 것)
   - 평가자 4명 × 3회(seed 20261321·22·23), 순서는 회차마다 섞는다.
   - 점검: 문항 수, KEY, 출처 표기 0, 결함 표시 문항이 섞이지 않았는지.

5. 집계 $CC/aggregate-lever5.md (aggregate_lever4.py를 고쳐 쓴다)
   - 문항별 회차별 등급·평균(3회 합 = 12표)
   - 미리 정한 판정 (결과를 보고 바꾸지 않는다):
     · 블라인드 유효: 공시 12번 3회 합 평균 ≥ 1.5. 아니면 "블라인드 무효"로 적고 판정하지 않는다.
     · B형: 새 B-V1 평균 ≥ 1.5 → "B형 통과", 1.0~1.5 → "거의", < 1.0 → "미달". 참고 옛 B와의 차이는 적기만 한다.
     · A형: 새 A − 옛 A ≥ +0.5 → "새 순서 나음", ≤ −0.5 → "옛 순서 나음", 그 사이 → "차이 없음(잡음 안)".
   - 회차별로도 같은 판정을 적어, 세 회차가 같은 쪽인지 본다.
   - ㉯·㉲·㉳ 문항별 수, 평가 이유 분류(지난번과 같은 묶음).

6. 보고서 $CC/REPORT-case-lever5.md(측정만) + -human.md(5~8줄). 실제 비용도 적는다.

7. 커밋(목록 먼저): $V5/out-case-lever5/, $V5/out-case-lever5-old/, 새 로그, $CC/blind-lever5/, $CC/lever5-record.md, $CC/aggregate-lever5.md, $CC/aggregate_lever5.py, $CC/make_blind*.py(새것), $CC/REPORT-case-lever5*.md.
   메시지: "사례 갈림 사실 순서: 청약 철회 재시험(B 새, A 옛·새)". push(force 금지).

8. 보고하고 멈춘다. 보고할 것: 1단계 되돌리기 커밋 해시와 grep·시험 결과, 건조 두 개, 비용, lever-check 표, 문항별 평균, 미리 정한 판정 세 줄(블라인드 유효·B형·A형)과 회차별 판정, ㉯·㉲·㉳, 평가 이유 분류, git log -2 --oneline, 푸시 결과, git status --short | wc -l.
```

## 설명 (쉬운 말)

- **무엇을:**
  - 먼저 방금 커밋(e04c9b01)의 "기본값" 부분을 새 커밋으로 되돌립니다. 새 순서는 다시 켤 때만 도는 스위치가 됩니다. 진척표에는 "유망, 미확정"으로 적습니다.
  - 그다음 아직 안 써 본 사회 법 사례 지문(청약 철회)으로 Ghootae 설계대로 시험합니다.
    - B형은 새 순서로만 만들고, 1.5를 넘는지 봅니다.
    - A형은 옛 순서와 새 순서로 하나씩 만들어 같은 블라인드에서 비교합니다.
- **왜 청약 철회인가:**
  - 새 순서를 실제로 쓸 곳이 생성 지문이고, 사회 사례는 아직 시험하지 않았습니다.
  - 옛 판 점수(1.375)에 오를 여지가 있습니다. 공시 지문은 옛 판이 이미 1.75라 차이가 보이기 어렵습니다.
- **판정은 미리 정해 둡니다:** 결과를 보고 기준을 바꾸지 않으려는 것입니다(지난번 약점). 옛 B형은 참고로만 같이 넣습니다(codex라 0원).
- **그다음:** 결과가 오면 웹에서 문항을 직접 읽어 보고, 기본값을 다시 넣을지 Ghootae가 정합니다.
