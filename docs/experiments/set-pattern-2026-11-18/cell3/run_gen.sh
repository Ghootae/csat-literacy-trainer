#!/bin/zsh
# 사용: run_gen.sh <solid-catalyst|auxin-growth> <A|B> [outname] [ONLY V1|V2] [KEEP_OUT]. 저장소 루트에서. 순서표 ③-1 과학 칸.
# run.mjs → eval-repair(REPAIR=1) → leak-fix, 모두 RULES_V=6. solid-catalyst: KIND_V1=case KIND_V2=case, auxin-growth: KIND_V1=graph KIND_V2=table.
PID=$1; MODE=$2; ON=${3:-out-cell3-v62}; ONLY=$4; KEEP=$5
V5=docs/experiments/deep-item-v5-2026-11-18
export RULES_V=6
case $PID in solid-catalyst) K1=case; K2=case;; auxin-growth) K1=graph; K2=table;; *) echo bad pid; exit 2;; esac
LOG=$V5/$ON-$PID-$MODE.log
{
PASSAGE=$PID MODE=$MODE KIND_V1=$K1 KIND_V2=$K2 OUT_NAME=$ON ${ONLY:+ONLY=$ONLY} ${KEEP:+KEEP_OUT=$KEEP} node $V5/run.mjs &&
PASSAGE=$PID IN=$V5/$ON/$PID-$MODE/items.json OUT_DIR=$V5/$ON/$PID-$MODE/repair REPAIR=1 node $V5/eval-repair.mjs &&
PASSAGE=$PID IN=$V5/$ON/$PID-$MODE/repair/items-final.json OUT_DIR=$V5/$ON/$PID-$MODE/leakfix ${ONLY:+ONLY=$ONLY} node $V5/leak-fix.mjs
} > $LOG 2>&1
echo "$PID $MODE exit=$?"
