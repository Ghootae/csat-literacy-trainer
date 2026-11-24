#!/bin/zsh
# 사용: run_gen.sh <passage> <kind> <viewdir> <A|B> [outname]
# run.mjs → eval-repair.mjs(REPAIR=1) → leak-fix.mjs, 모두 RULES_V=6. 저장소 루트에서 실행. (4단계 scripts_run_gen.sh와 같은 명령, PASSAGE·KEEP_OUT·OUT_NAME만 다름)
PID=$1; KIND=$2; KEEP=$3; MODE=$4; ON=${5:-out-cell1-v62}
V5=docs/experiments/deep-item-v5-2026-11-18
export RULES_V=6
LOG=$V5/$ON-$PID-$MODE.log
{
PASSAGE=$PID MODE=$MODE KIND_V1=$KIND KIND_V2=$KIND ONLY=V1 KEEP_OUT=$KEEP OUT_NAME=$ON node $V5/run.mjs &&
PASSAGE=$PID IN=$V5/$ON/$PID-$MODE/items.json OUT_DIR=$V5/$ON/$PID-$MODE/repair REPAIR=1 node $V5/eval-repair.mjs &&
PASSAGE=$PID IN=$V5/$ON/$PID-$MODE/repair/items-final.json OUT_DIR=$V5/$ON/$PID-$MODE/leakfix ONLY=V1 node $V5/leak-fix.mjs
} > $LOG 2>&1
echo "$PID $MODE exit=$?"
