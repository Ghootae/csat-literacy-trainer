#!/bin/zsh
# 사용: ./run.sh r1|r2   (동시 4개, codex gpt-6.1-sol, 무료)
H=$(cd $(dirname $0) && pwd); R=$1; mkdir -p $H/out-$R; PROMPT=${PROMPT:-CODEX-PROMPT.md}; SHEETS=${SHEETS:-sheets}
run_one() {
  k=$1; T=$(mktemp -d /tmp/cfc-$R-$k.XXXX); cp $H/$SHEETS/$k.md $T/SHEET.md
  (cat $H/$PROMPT; echo; echo '--- SHEET.md ---'; cat $T/SHEET.md) > $T/prompt.txt
  (cd $T && codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $T/prompt.txt > $T/log.txt 2>&1; echo "$R $k exit=$?"; cp $T/answer.md $H/out-$R/$k.md)
}
keys=(${(f)"$(python3 -c "import json;print('\n'.join(json.load(open('$H/order.json'))))")"})
i=0
for k in $keys; do
  [[ -s $H/out-$R/$k.md ]] && continue
  run_one $k &
  (( i++ )); (( i % 4 == 0 )) && wait
done
wait
