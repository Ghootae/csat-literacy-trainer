#!/bin/zsh
# 시험한 C04를 뺀 나머지 17개 폴더를 차례로(폴더 안은 8회 병렬) 실행.
H=$(cd $(dirname $0) && pwd)
for d in $H/C*/; do k=$(basename $d); [ $k = C04 ] && continue; $d/run_eval.sh; done
echo ALLDONE
