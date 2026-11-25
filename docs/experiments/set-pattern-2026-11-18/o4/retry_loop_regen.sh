#!/bin/zsh
H=$(cd $(dirname $0) && pwd)
for n in 1 2 3 4 5 6 7 8; do
  zsh $H/rerun_missing_regen.sh
  c=$(ls $H/blind-T4-regen/REPORT-eval-r?-?.md 2>/dev/null | wc -l | tr -d ' ')
  echo "시도 $n: 완료 $c/8 $(date +%H:%M)"
  [ "$c" -ge 8 ] && break; sleep 300
done
