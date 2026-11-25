#!/bin/zsh
H=$(cd $(dirname $0) && pwd)
for n in 1 2 3 4 5 6 7 8; do
  have=$(ls $H/blind-*/REPORT-eval-*.md 2>/dev/null | wc -l | tr -d ' ')
  echo "시도 $n: 완료 $have/16 $(date +%H:%M)"
  [ "$have" -ge 16 ] && break
  zsh $H/rerun_missing.sh
  have=$(ls $H/blind-*/REPORT-eval-*.md 2>/dev/null | wc -l | tr -d ' ')
  [ "$have" -ge 16 ] && echo "완료 16/16" && break
  sleep 300
done
echo "끝 $(ls $H/blind-*/REPORT-eval-*.md | wc -l)/16"
