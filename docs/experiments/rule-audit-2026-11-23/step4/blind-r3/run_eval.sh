#!/bin/zsh
# 평가자 4명 병렬. 평가자마다 새 임시 폴더(BLIND-r3.md만).
H=$(cd $(dirname $0) && pwd)
for i in 1 2 3 4; do
  T=$(mktemp -d /tmp/r3eval$i.XXXX); cp $H/BLIND-r3.md $T/
  (codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/CODEX-PROMPT-r3.md > $T/log.txt 2>&1; cp $T/answer.md $H/REPORT-r3-eval$i.md; echo "eval$i exit=$?") &
done
wait
