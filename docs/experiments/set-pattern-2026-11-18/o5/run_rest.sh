#!/bin/zsh
# C02~C19를 3개씩 묶어 평가자 8회씩 실행
cd $(dirname $0)
for grp in "C02 C03 C04" "C05 C06 C07" "C08 C09 C10" "C11 C12 C13" "C14 C15 C16" "C17 C18 C19"; do
  for c in ${=grp}; do (cd $c && ./run_eval.sh > run.log 2>&1) & done
  wait
  echo "done $grp"
done
