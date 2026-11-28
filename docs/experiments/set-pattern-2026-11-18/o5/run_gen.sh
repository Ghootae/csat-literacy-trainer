#!/bin/zsh
# usage: run_o5.sh PID MODE K1 K2 [outname] [ONLY] [KEEP]
PID=$1; MODE=$2; K1=$3; K2=$4; ON=${5:-out-o5}; ONLY=$6; KEEP=$7
V5=docs/experiments/deep-item-v5-2026-11-18
export RULES_V=6; [ -n "$ONLY" ] && export ONLY; [ -n "$KEEP" ] && export KEEP_OUT=$KEEP
case $PID in gen31-*) export PASSAGE_FIELD=science;; esac
LOG=$V5/$ON-$PID-$MODE.log
{
PASSAGE=$PID MODE=$MODE KIND_V1=$K1 KIND_V2=$K2 OUT_NAME=$ON node $V5/run.mjs &&
PASSAGE=$PID IN=$V5/$ON/$PID-$MODE/items.json OUT_DIR=$V5/$ON/$PID-$MODE/repair REPAIR=1 node $V5/eval-repair.mjs &&
PASSAGE=$PID IN=$V5/$ON/$PID-$MODE/repair/items-final.json OUT_DIR=$V5/$ON/$PID-$MODE/leakfix node $V5/leak-fix.mjs
} > $LOG 2>&1
echo "$PID $MODE exit=$?"
