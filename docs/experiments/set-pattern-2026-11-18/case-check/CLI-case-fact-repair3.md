# CLI 지시문: 검사기 v6.5를 옛 질문(v1 문구)으로 마무리 + 도덕적 운·고체 A-V2 재시험 (웹 2026-11-26 01시대 KST)

근거: $SP/case-check/REPORT-case-fact-repair2.md(추가 실험 1·2), compare-output-v1fixed.md, compare-output-v3.md.
**추정 비용: 약 $0.8 (상한 $2).** 무료 재검증은 더 하지 않는다. 검사·수리 파일 3개(e3f 문항당 약 $0.02 + 걸리면 수리 약 $0.15) + 노출 수리. 블라인드는 codex라 0원.
이 지시문을 붙여 넣는 것이 아래 코드 수정, API 실행(상한 $2), 커밋·푸시의 승인이다.

## 판정 (웹)
- 세 질문 모두 통과 기준(기출 K2·K4만 걸림 + 생성 20/24)에 못 미쳤다. v1fixed 19/18, v2 18/16, v3 14/14. v3는 거짓 선지의 78%를 "지문" 탓으로 돌려 기출 K3·K5·K6까지 걸었다.
- 손 분류와의 일치를 빼고, 걸린 문항이 평가자에게 실제로 감점받는지만 보면 v1fixed가 가장 낫다. 걸림 0.97 / 안 걸림 1.47이고, 손 분류는 0.94 / 1.61이다. 기출도 r1은 K2·K4만 걸렸다.
- 그래서 v6.5는 v1 문구로 마무리한다. 한계: 도덕 G20은 세 질문 모두 놓쳤다. 도덕 칸은 한 문항만 수리될 가능성이 높다.

```
검사기 v6.5 마무리(CLI-case-fact-repair3.md). V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18, CC=$SP/case-check.

0. 지킬 것: CLI-case-fact-repair.md 0단계와 같다(오답 카드 파일 4개·그래프 파일 건드리지 않고 커밋에 넣지 않음, 생성 규칙·run.mjs 안 고침, checkout·stash·restore 금지, force push 금지). git log -1이 20f80e42인지 적는다. 커밋 안 된 v6.5 코드는 그대로 이어서 쓴다.

1. 먼저 무료 검증 파일만 따로 커밋·푸시한다: $CC의 CODEX-PROMPT-v2·v3, sheets-v2/, make_sheet.py, compare-v3.py, compare-output-v1fixed·v2·v3, out-v1fixed-*, out-v2-*, out-v3-*, run-*.log, run-v2.sh, REPORT-case-fact-repair2(.md, -human.md), CLI-case-trap-check.md, 이 지시문. 메시지 "사례 검사 기준: 고친 풀이지 재검증(v1·v2·v3 질문)". 해시를 적는다.

2. 코드 (API 비용 없음)
   a. eval-repair.mjs e3f 지시문을 CODEX-PROMPT-v2.md에서 CODEX-PROMPT.md(v1) 문구로 바꾼다. '장면은 그대로' 문장이 빠지는 것만 달라진다. 출력은 그대로 truth·fact_sensitive·why.
   b. 머리 주석 v6.5 줄에 "e3f 문구 = v1(CODEX-PROMPT.md), v2·v3 질문은 재검증 미달로 안 씀" 덧붙임.
   c. classify-v6.test.mjs 전체 통과 확인(문구를 검사하는 시험이 있으면 v1에 맞춘다).

3. CLI-case-fact-repair2.md의 3~7단계를 그대로 한다.
   - 비용 추산 → 도덕 A·B, 고체 A 검사·수리 → $V5/out-case-m6b/ → 블라인드 2회(seed 20261271·72) → aggregate-m6b.md → REPORT-case-fact-repair3.md(측정만) + -human.md.
   - 문항별로 e3f fact_sensitive 5개와 why, M6 여부, 수리 여부, 발문 되돌림 여부, 결함 표시 여부를 기록한다.

4. 커밋(목록 먼저): eval-repair.mjs, classify-v6.mjs, classify-v6.test.mjs, leak-fix.mjs, $V5/out-case-m6b/, $CC 새 파일들. 메시지 "검사기 v6.5: M6 별도 호출(e3f, v1 문구) + 수리 발문 보존·결함 내보내지 않기 + 도덕적 운 사례 재시험". push(force 금지).

5. 보고하고 멈춘다: 시험 결과, 문항별 M6·수리 표, 등급표(수리 전·후), 칸 평균(이전 고체 1.375, 도덕 0.688), 자격 기출 회차별, 실제 비용, 두 커밋 해시, 푸시 결과, git status --short | wc -l.
```

## 설명 (쉬운 말)

- **무엇을:** 검사 질문 세 가지 중 처음 질문(v1)으로 검사기 v6.5를 마무리합니다. 처음 질문은 "〈보기〉 사실 하나를 바꾸면 참·거짓이 바뀌나"입니다. 그다음 도덕적 운 두 문항과 고체 A-V2에만 검사·수리를 다시 돌리고 블라인드로 봅니다.
- **왜:** 세 질문 모두 손 분류와 충분히 맞지는 않았습니다. 그래도 처음 질문으로 걸린 문항은 평가자 점수가 실제로 낮았습니다(0.97 대 1.47). 수리가 점수를 올린다는 것은 고체 칸에서 이미 확인했습니다. 그래서 "완벽하지 않아도 낮은 문항을 골라 고치는 도구"로 쓰기로 합니다.
- **같이 들어가는 것:** 그래프 스레드에서 넘어온 수리 보완 두 가지가 함께 들어갑니다. 수리가 발문을 바꾸면 되돌리고, 수리 뒤에도 결함이 남으면 최종본에서 뺍니다.
- **한계:** 도덕 G20은 세 질문 모두 못 잡았습니다. 도덕 칸은 크게 오르지 않을 수 있습니다. 근본 해결은 생성 3단계(〈보기〉 조립)에서 거짓을 〈보기〉 쪽에 두는 방법이고, 이것은 따로 검토합니다.
