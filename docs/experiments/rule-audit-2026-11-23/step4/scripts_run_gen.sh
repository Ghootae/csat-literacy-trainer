#!/bin/zsh
# 사용: run_gen.sh <v6|v5> <passage> <kind> <viewdir> <A|B> [outsuffix]
# run.mjs → eval-repair.mjs(REPAIR=1) → leak-fix.mjs. 저장소 루트에서 실행.
VER=$1; PID=$2; KIND=$3; KEEP=$4; MODE=$5; SUF=$6
V5=docs/experiments/deep-item-v5-2026-11-18
ON=out-step4-$VER$SUF
[[ $VER == v6 ]] && export RULES_V=6 || unset RULES_V
LOG=$V5/$ON-$PID-$MODE.log
{
PASSAGE=$PID MODE=$MODE KIND_V1=$KIND KIND_V2=$KIND ONLY=V1 KEEP_OUT=$KEEP OUT_NAME=$ON node $V5/run.mjs &&
PASSAGE=$PID IN=$V5/$ON/$PID-$MODE/items.json OUT_DIR=$V5/$ON/$PID-$MODE/repair REPAIR=1 node $V5/eval-repair.mjs &&
PASSAGE=$PID IN=$V5/$ON/$PID-$MODE/repair/items-final.json OUT_DIR=$V5/$ON/$PID-$MODE/leakfix ONLY=V1 node $V5/leak-fix.mjs
} > $LOG 2>&1
echo "$VER $PID $MODE exit=$?"
