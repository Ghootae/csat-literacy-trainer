#!/bin/zsh
O=docs/experiments/easy-items-2026-11-27/vocab-c
for m in M02 M03 M04 M05 M06; do $O/$m/run_eval.sh > $O/$m/run.log 2>&1 & done; wait
for m in M07 M08 M09 M10 M11 M12; do $O/$m/run_eval.sh > $O/$m/run.log 2>&1 & done; wait
echo ALLDONE
