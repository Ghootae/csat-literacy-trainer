#!/bin/zsh
# 평가자 4명 병렬. 평가자마다 새 임시 폴더(BLIND-r1.md만). 판정 모델 codex gpt-6.1-sol.
H=$(cd $(dirname $0) && pwd)
for i in ${=IDX:-1 2 3 4}; do
  T=$(mktemp -d /tmp/casepair2r1eval$i.XXXX); cp $H/BLIND-r1.md $T/
  (cd $T && codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/CODEX-PROMPT-r1.md > $T/log.txt 2>&1; echo "pair2 r1 eval$i exit=$?"; cp $T/answer.md $H/REPORT-eval-r1-$i.md) &
done
wait
