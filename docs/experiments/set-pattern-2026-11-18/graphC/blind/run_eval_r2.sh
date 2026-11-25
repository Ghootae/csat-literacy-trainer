#!/bin/zsh
# 평가자 4명 병렬. 평가자마다 새 임시 폴더(BLIND-r2.md + pic 파일만). 판정 모델 codex gpt-6.1-sol.
H=$(cd $(dirname $0) && pwd)
for i in 1 2 3 4; do
  T=$(mktemp -d /tmp/gcCr2eval$i.XXXX); cp $H/BLIND-r2.md $H/pic-*.png $T/
  (cd $T && codex exec -i pic-1.png -i pic-2.png -i pic-3.png -i pic-4.png -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/CODEX-PROMPT-r2.md > $T/log.txt 2>&1; echo "r2 eval$i exit=$?"; cp $T/answer.md $H/REPORT-eval-r2-$i.md) &
done
wait
