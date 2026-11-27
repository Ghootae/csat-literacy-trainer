#!/bin/zsh
H=$(cd $(dirname $0) && pwd)
(T=$(mktemp -d /tmp/otherT-B-3.XXXX); cd $T && codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/T-B-3/PROMPT.md > $T/log.txt 2>&1; echo "T-B-3 exit=$?"; cp $T/answer.md $H/T-B-3/ANSWER.md) &
(T=$(mktemp -d /tmp/otherC-B-1.XXXX); cd $T && codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/C-B-1/PROMPT.md > $T/log.txt 2>&1; echo "C-B-1 exit=$?"; cp $T/answer.md $H/C-B-1/ANSWER.md) &
(T=$(mktemp -d /tmp/otherC-B-2.XXXX); cd $T && codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/C-B-2/PROMPT.md > $T/log.txt 2>&1; echo "C-B-2 exit=$?"; cp $T/answer.md $H/C-B-2/ANSWER.md) &
(T=$(mktemp -d /tmp/otherC-B-3.XXXX); cd $T && codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/C-B-3/PROMPT.md > $T/log.txt 2>&1; echo "C-B-3 exit=$?"; cp $T/answer.md $H/C-B-3/ANSWER.md) &
(T=$(mktemp -d /tmp/otherC-B-5.XXXX); cd $T && codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/C-B-5/PROMPT.md > $T/log.txt 2>&1; echo "C-B-5 exit=$?"; cp $T/answer.md $H/C-B-5/ANSWER.md) &
wait
