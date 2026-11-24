#!/bin/zsh
# 10문항 × 8회 = 80회. 문항 3개씩 동시(24 병렬). 사용: zsh run_all.sh
H=$(cd $(dirname $0) && pwd)
ls -d $H/*/ | xargs -n1 -P3 -I{} zsh {}run_eval.sh
