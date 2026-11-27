#!/bin/zsh
cd $(dirname $0)
LC=../lure-check
for d in R01 R02 R03 R04 R05 R06 R07 R08 R10 R11 R12; do ./$d/run_eval.sh; done
./run_steps.sh R09/BLIND.md R09 R09 s2
for d in R01 R02 R03 R04 R05 R06 R07 R08 R10 R11 R12; do ./run_steps.sh $d/BLIND.md $d $d; done
for n in N-K16 N-K04 N-K24 P-K01 P-K08 P-K22 P-K42 P-K12; do
  f=$(python3 -c "import json,sys;print([k['folder'] for k in json.load(open('$LC/KEY.json')) if k['key'].startswith('$n ')][0])")
  ./run_steps.sh $LC/$f/BLIND.md steps-LC/$n $n
done
echo ALLDONE
