#!/bin/zsh
# 사용: run_gen.sh <A|B> [outname] [ONLY V1|V2] [KEEP_OUT]. 저장소 루트에서. 순서표 ② 경제 칸(조세 귀착). run.mjs → eval-repair(REPAIR=1) → leak-fix, 모두 RULES_V=6.
PID=tax-incidence-excise; MODE=$1; ON=${2:-out-cell2-v62}; ONLY=$3; KEEP=$4
V5=docs/experiments/deep-item-v5-2026-11-18
export RULES_V=6
LOG=$V5/$ON-$PID-$MODE.log
{
PASSAGE=$PID MODE=$MODE KIND_V1=table KIND_V2=graph OUT_NAME=$ON ${ONLY:+ONLY=$ONLY} ${KEEP:+KEEP_OUT=$KEEP} node $V5/run.mjs &&
PASSAGE=$PID IN=$V5/$ON/$PID-$MODE/items.json OUT_DIR=$V5/$ON/$PID-$MODE/repair REPAIR=1 node $V5/eval-repair.mjs &&
PASSAGE=$PID IN=$V5/$ON/$PID-$MODE/repair/items-final.json OUT_DIR=$V5/$ON/$PID-$MODE/leakfix ${ONLY:+ONLY=$ONLY} node $V5/leak-fix.mjs
} > $LOG 2>&1
echo "$PID $MODE exit=$?"
