#!/bin/zsh
H=$(cd $(dirname $0) && pwd)
for r in 1 2; do
  T=$(mktemp -d /tmp/guessM12r$r.XXXX); cp $H/BLIND.md $T/
  (cd $T && codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/PROMPT.md > $T/log.txt 2>&1; echo "M12 r$r exit=$?"; cp $T/answer.md $H/GUESS-r$r.md) &
done
wait
