#!/bin/zsh
# 평가자 4명 병렬. 평가자마다 새 임시 폴더(BLIND-r2.md만). 판정 모델 codex gpt-6.1-sol. cell3 run_eval_r1.sh와 같은 명령.
H=$(cd $(dirname $0) && pwd)
for i in 1 2 3 4; do
  T=$(mktemp -d /tmp/cell3dr2eval$i.XXXX); cp $H/BLIND-r2.md $T/
  (cd $T && codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/CODEX-PROMPT-r2.md > $T/log.txt 2>&1; echo "eval$i exit=$?"; cp $T/answer.md $H/REPORT-eval-r2-$i.md) &
done
wait
