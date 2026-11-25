#!/bin/zsh
# 재생성 블라인드: 빠진 평가자만 다시. 사용: zsh rerun_missing_regen.sh
H=$(cd $(dirname $0) && pwd)
for r in r1 r2; do
  miss=""; for i in 1 2 3 4; do [ -s $H/blind-T4-regen/REPORT-eval-$r-$i.md ] || miss="$miss $i"; done
  [ -n "$miss" ] && IDX="$miss" zsh $H/blind-T4-regen/run_eval_$r.sh
done
