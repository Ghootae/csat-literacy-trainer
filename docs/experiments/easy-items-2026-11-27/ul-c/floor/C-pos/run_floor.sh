#!/bin/zsh
H=$(cd $(dirname $0) && pwd)
for r in 1 2; do
  T=$(mktemp -d /tmp/floorC-posr$r.XXXX); cp $H/BLIND.md $T/
  (cd $T && codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/../FLOOR-PROMPT.md > $T/log.txt 2>&1; echo "C-pos r$r exit=$?"; cp $T/answer.md $H/SOLVE-r$r.md) &
done
wait
