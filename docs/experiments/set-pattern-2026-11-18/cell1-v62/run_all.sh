#!/bin/zsh
S=docs/experiments/set-pattern-2026-11-18/cell1-v62/run_gen.sh
( $S information-asymmetry-free-marketplace view out-view-hs A && $S information-asymmetry-free-marketplace view out-view-hs B ) &
( $S gongsun-long-later-mohists case out-case-hs A && $S gongsun-long-later-mohists case out-case-hs B ) &
wait
