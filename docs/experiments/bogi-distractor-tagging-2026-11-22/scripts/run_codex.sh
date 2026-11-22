#!/bin/zsh
# 단계 X: 코덱스 평가자 1명 실행. 사용: scripts/run_codex.sh <묶음 n> <평가자 k>. 새 세션, 임시 폴더에 BLIND·PROMPT 두 파일만 복사.
B=$(cd "$(dirname "$0")/.." && pwd); n=$1; k=$2
T=/private/tmp/claude-501/-Users-mac-Projects-csat-literacy-problem-solving-mvp/920970ee-37d0-44d7-accc-3a1786b04b48/scratchpad/codex-$n-$k
rm -rf $T; mkdir -p $T; cp $B/codex/$n/BLIND-$n.md $B/codex/$n/CODEX-PROMPT-$n.md $T/
codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $T/CODEX-PROMPT-$n.md > $T/stdout.log 2>&1
echo "exit=$?" >> $T/stdout.log
{ echo "# 평가자 $k (묶음 $n) 출력 원문"; echo; echo "실행: \`codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C <BLIND-$n.md·CODEX-PROMPT-$n.md만 있는 임시 폴더> -o answer.md - < CODEX-PROMPT-$n.md\` (새 세션, 이전 맥락 없음, 정답표 없는 폴더). 판정 모델 gpt-6.1-sol."; echo; echo '---'; echo; cat $T/answer.md; } > $B/codex/$n/REPORT-eval$k.md
echo "bundle $n eval $k $(tail -1 $T/stdout.log) $(wc -c < $T/answer.md) bytes"
