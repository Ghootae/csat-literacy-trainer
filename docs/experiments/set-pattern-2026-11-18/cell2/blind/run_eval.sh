#!/bin/zsh
# 평가자 4명 병렬. 평가자마다 새 임시 폴더(BLIND-cell2.md + pic-*.png만). 판정 모델 codex gpt-6.1-sol. 이미지는 -i로 첨부.
H=$(cd $(dirname $0) && pwd)
for i in 1 2 3 4; do
  T=$(mktemp -d /tmp/cell2eval$i.XXXX); cp $H/BLIND-cell2.md $H/imgs/pic-*.png $T/
  (cd $T && codex exec -i pic-*.png -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/CODEX-PROMPT-cell2.md > $T/log.txt 2>&1; echo "eval$i exit=$?"; cp $T/answer.md $H/REPORT-cell2-eval$i.md) &
done
wait
