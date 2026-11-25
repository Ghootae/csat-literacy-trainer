#!/bin/zsh
# 평가자 4명 병렬. 평가자마다 새 임시 폴더(BLIND-r1.md + pic-1.png만). 판정 모델 codex gpt-6.1-sol. cell3 run_eval_r1.sh와 같은 명령.
H=$(cd $(dirname $0) && pwd)
for i in ${=IDX:-1 2 3 4}; do
  T=$(mktemp -d /tmp/o4T5r1eval$i.XXXX); cp $H/BLIND-r1.md $T/; cp $H/pic-1.png $T/
  (cd $T && codex exec -i pic-1.png -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/CODEX-PROMPT-r1.md > $T/log.txt 2>&1; echo "T5 r1 eval$i exit=$?"; cp $T/answer.md $H/REPORT-eval-r1-$i.md) &
done
wait
