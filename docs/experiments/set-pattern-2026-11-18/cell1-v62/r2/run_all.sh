#!/bin/zsh
# 순서표 ① 2회차: 1회차 run_gen.sh 그대로, OUT_NAME=out-cell1-v62-r2만 바꿈. A 다음 B(B는 이번 회차 A를 피함).
S=docs/experiments/set-pattern-2026-11-18/cell1-v62/run_gen.sh; ON=${1:-out-cell1-v62-r2}
( $S information-asymmetry-free-marketplace view out-view-hs A $ON && $S information-asymmetry-free-marketplace view out-view-hs B $ON ) &
( $S gongsun-long-later-mohists case out-case-hs A $ON && $S gongsun-long-later-mohists case out-case-hs B $ON ) &
wait
