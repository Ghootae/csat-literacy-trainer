# CLI 지시문: 갈림 사실 순서(CASE_FLOW=lever)를 공손룡 사례 칸에서 확인 (웹 2026-11-26 12시대 KST)

결정: Ghootae 2026-11-26 12:07 KST 카드 "인문·사회만, 공손룡 확인". 새 순서는 법·윤리·인문 사례에만 쓰고, 과학 사례는 옛 순서를 유지한다. 이번 실행은 인문 사례 하나로 그 범위를 확인한다.
근거: $CC/REPORT-case-lever2.md(도덕적 운 통과 1.542, 옛 대비 +0.917), REPORT-case-lever3.md(고체 촉매 0.917, 옛 대비 −0.19).
**추정 비용: 약 $1.2 (상한 $2.5).** 공손룡 ONLY=V1 1회 실측은 생성 $0.33~0.36이고, 여기에 검사·수리 약 $0.2와 노출 수리 약 $0.03이 더해진다. 이것을 A·B 두 번 하고 출력 증가분을 더했다. 블라인드는 codex라 0원.
이 지시문을 붙여 넣는 것이 아래 API 실행(상한 $2.5)과 커밋·푸시의 승인이다. 코드는 고치지 않는다.

```
공손룡 사례 lever 확인(CLI-case-lever4.md). V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18, CC=$SP/case-check.

0. 지킬 것: CLI-case-lever.md 0단계와 같다. 오답 카드 파일 4개와 그래프 파일은 건드리지 않는다. 규칙 파일과 코드도 고치지 않는다. checkout·stash·restore 금지, force push 금지. git log -1이 cacb3769 이후인지 적는다.

1. 준비 (API 비용 없음)
   a. 공손룡 사례 칸 = A-V1·B-V1이다(①칸과 같다). ONLY=V1로 만들고, 확정 다른 버전(V2 case)과 1-search·2-select는 KEEP_OUT=out-case-hs에서 가져온다(①칸과 같은 방식). 만드는 버전이 사례 하나뿐이라 재료 끊기가 걸린다.
   b. 건조 실행: RULES_V=6 CASE_FLOW=lever DRY_RUN=1 PASSAGE=gongsun-long-later-mohists MODE=A KIND_V1=case KIND_V2=case ONLY=V1 KEEP_OUT=out-case-hs OUT_NAME=out-case-lever4-dry
      - "[재료 없음]" 한 줄, 사례 블록, pair 예시가 있는지 확인한다. 2-select 본문은 없어야 한다.
      - 끝나면 건조 폴더를 지운다.
   c. 비용 추산을 적는다. 상한을 넘을 것 같으면 멈추고 보고한다.

2. 생성 (API). A를 먼저, B를 나중에 한다. zsh는 export 방식으로 넘긴다. 로그는 $V5/out-case-lever4-gongsun-long-later-mohists-<A|B>.log에 남긴다.
   - A: RULES_V=6 CASE_FLOW=lever PASSAGE=gongsun-long-later-mohists MODE=A KIND_V1=case KIND_V2=case ONLY=V1 KEEP_OUT=out-case-hs OUT_NAME=out-case-lever4
   - B: RULES_V=6 CASE_FLOW=lever PASSAGE=gongsun-long-later-mohists MODE=B KIND_V1=case KIND_V2=case ONLY=V1 KEEP_OUT=out-case-hs AVOID_OUT=out-case-lever4 OUT_NAME=out-case-lever4
   각각 run.mjs → eval-repair.mjs(RULES_V=6 REPAIR=1) → 필요하면 leak-fix.mjs 순서로 돌린다. 1회뿐이고, 결함이 나와도 기록만 한다.
   기록 $CC/lever4-record.md (문항 2개):
   - lever-check: 처음, 재호출, 최종(일치/유사/없음)
   - pair
   - principleCards·leverTable
   - 선지별 facts·misread
   - 수리 여부, 발문 되돌림, 결함 표시
   - 옛 판과 새 판의 〈보기〉·선지·정답 나란히
   - 결정 선지 원문 표(새·옛). 웹 손 분류용이니 분류는 하지 않는다.

3. 블라인드 $CC/blind-lever4/ (codex gpt-6.1-sol, 0원, 요청문은 $SP/o4/blind-T4 CODEX-PROMPT 그대로)
   - 문항 5개:
     - 새 A-V1, 새 B-V1 (out-case-lever4 최종)
     - 옛 A-V1, 옛 B-V1 (out-cell1-v62-r2/gongsun-long-later-mohists-{A,B} 최종: leakfix 채택본, 없으면 repair/items-final.json)
     - 자격 기출 공손룡 12번
   - 평가자 4명 × 3회(seed 20261311·12·13), 순서는 회차마다 섞는다.
   - 점검: 문항 수, KEY, 출처 표기 0.

4. 집계 $CC/aggregate-lever4.md (aggregate_lever.py 재사용)
   - 문항별 회차별 등급·평균
   - 칸 평균(회차별 + 3회 합): 새 칸 / 옛 칸 / 차이
   - 자격 기출 회차별 평균
   - ㉯·㉲·㉳ 문항별 수
   - 평가 이유 분류(지난번과 같은 묶음)

5. 보고서 $CC/REPORT-case-lever4.md(측정만) + -human.md(5~8줄). 실제 비용도 적는다.

6. 커밋(목록 먼저): $V5/out-case-lever4/, 새 로그, $CC/blind-lever4/, $CC/lever4-record.md, $CC/aggregate-lever4.md, $CC/REPORT-case-lever4*.md, 이 지시문.
   메시지: "사례 갈림 사실 순서: 공손룡 사례 칸 확인". push(force 금지).

7. 보고하고 멈춘다. 보고할 것: 건조 확인, 비용, lever-check 표, 칸 평균(새·옛·차이, 회차별), 자격 기출, ㉯·㉲·㉳, 평가 이유 분류, git log -1 --oneline, 푸시 결과, git status --short | wc -l.
```

## 설명 (쉬운 말)

- **무엇을:** 새 순서(원리 카드 → 〈보기〉와 갈림 사실 표 → 사실을 잘못 읽은 오답 → 정답 마지막)로 공손룡 사례 문항 2개를 다시 만듭니다. 옛 문항(①칸 2회차 최종본)과 같은 블라인드에서 3회 비교합니다.
- **왜:** 새 순서가 통한 곳은 도덕적 운(윤리)뿐이었고, 과학(고체 촉매)에서는 오르지 않았습니다. 인문 사례에서도 통하면 "법·윤리·인문 사례 = 새 순서"를 규칙으로 굳힐 근거가 생깁니다. 공손룡의 갈림 사실은 "어떤 말이 몇 개의 대상을 가리키나"처럼 딱 떨어지는 편입니다.
- **판정:** 새 칸 평균이 1.5 이상이고 옛 칸보다 0.5 이상 높으면 통과입니다. 통과하면 진척표에 "인문·사회 사례 = CASE_FLOW=lever"를 기록하고 이 일을 마무리합니다. 오르지 않으면 도덕적 운 한 번의 성공으로만 기록하고, 스위치로만 남깁니다.
