#!/bin/zsh
# 429(요청 한도)로 실패한 평가자만 다시 돌린다. 묶음·회차를 차례로, 회차 안에서는 병렬. 사용: zsh rerun_missing.sh
H=$(cd $(dirname $0) && pwd)
for b in T4 T5; do for r in r1 r2; do
  miss=""; for i in 1 2 3 4; do [ -s $H/blind-$b/REPORT-eval-$r-$i.md ] || miss="$miss $i"; done
  [ -n "$miss" ] && IDX="$miss" zsh $H/blind-$b/run_eval_$r.sh
done; done
