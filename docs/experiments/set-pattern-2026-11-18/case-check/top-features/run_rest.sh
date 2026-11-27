#!/bin/zsh
cd $(dirname $0)
for d in S02 S03 S04 S05 S06 S07 S08 S09 S10 S11 S12; do ./$d/run_eval.sh; done
./run_feat.sh K27_부관 S01/BLIND.md f2
while IFS=$'\t' read k g b; do [ "$k" = "K27_부관" ] && continue; ./run_feat.sh "$k" "$b"; done < feat.tsv
echo ALLDONE
