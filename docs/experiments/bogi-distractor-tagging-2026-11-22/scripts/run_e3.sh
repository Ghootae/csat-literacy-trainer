#!/bin/zsh
# 단계 B4: e3 실행. 저장소 루트에서: scripts/run_e3.sh <run1|run2> (동시 6개). 실패 문항 재시도는 따로.
B=docs/experiments/bogi-distractor-tagging-2026-11-22
RUN=$1
one() { id=$1; pass=$2; RUN=$3; B=docs/experiments/bogi-distractor-tagging-2026-11-22
  PASSAGE=$pass IN=$B/items/$id.json OUT_DIR=$B/e3/$RUN/$id node docs/experiments/deep-item-v5-2026-11-18/eval-repair.mjs > $B/e3/logs/$RUN-$id.log 2>&1; echo "$id exit=$?"; }
export -f one 2>/dev/null
cat $B/e3/run-list.tsv | xargs -P 6 -L 1 zsh -c 'B=docs/experiments/bogi-distractor-tagging-2026-11-22; id=$0; pass=$1; PASSAGE=$pass IN=$B/items/$id.json OUT_DIR=$B/e3/'$RUN'/$id node docs/experiments/deep-item-v5-2026-11-18/eval-repair.mjs > $B/e3/logs/'$RUN'-$id.log 2>&1; echo "$id exit=$?"'
