#!/bin/zsh
# 순서표 ④ 2단계 생성. 사용(저장소 루트): run_gen.sh <T4|T5> <A|B> [outname] [ONLY V1|V2] [KEEP_OUT]
# run.mjs → eval-repair(REPAIR=1) → leak-fix, 모두 RULES_V=6 (cell3/run_gen.sh와 같은 형식). T4: view/case, T5: table/table.
T=$1; MODE=$2; ON=${3:-out-o4}; ONLY=$4; KEEP=$5
V5=docs/experiments/deep-item-v5-2026-11-18; PID=gen32-o4-$T-1
export RULES_V=6; [ -n "$ONLY" ] && export ONLY; [ -n "$KEEP" ] && export KEEP_OUT=$KEEP
case $T in T4) K1=view; K2=case;; T5) K1=table; K2=table;; *) echo bad; exit 2;; esac
LOG=$V5/$ON-$PID-$MODE.log
{
PASSAGE=$PID MODE=$MODE KIND_V1=$K1 KIND_V2=$K2 OUT_NAME=$ON node $V5/run.mjs &&
PASSAGE=$PID IN=$V5/$ON/$PID-$MODE/items.json OUT_DIR=$V5/$ON/$PID-$MODE/repair REPAIR=1 node $V5/eval-repair.mjs &&
PASSAGE=$PID IN=$V5/$ON/$PID-$MODE/repair/items-final.json OUT_DIR=$V5/$ON/$PID-$MODE/leakfix node $V5/leak-fix.mjs
} > $LOG 2>&1
echo "$PID $MODE exit=$?"
