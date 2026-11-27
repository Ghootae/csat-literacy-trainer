#!/bin/zsh
O=docs/experiments/easy-items-2026-11-27/ul-a
for grp in "M02 M03 M04 M05 M06 M07" "M08 M09 M10 M11 M12"; do
  for m in ${=grp}; do $O/$m/run_eval.sh > $O/$m/run.log 2>&1 & done; wait
done
echo ALLDONE
