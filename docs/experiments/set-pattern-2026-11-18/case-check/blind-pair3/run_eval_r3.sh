#!/bin/zsh
# 평가자 4명 병렬. 평가자마다 새 임시 폴더(BLIND-r3.md만). 판정 모델 codex gpt-6.1-sol.
H=$(cd $(dirname $0) && pwd)
for i in ${=IDX:-1 2 3 4}; do
  T=$(mktemp -d /tmp/casepair3r3eval$i.XXXX); cp $H/BLIND-r3.md $T/
  (cd $T && codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/CODEX-PROMPT-r3.md > $T/log.txt 2>&1; echo "pair3 r3 eval$i exit=$?"; cp $T/answer.md $H/REPORT-eval-r3-$i.md) &
done
wait
