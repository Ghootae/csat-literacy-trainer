#!/bin/zsh
# 사용: run_steps.sh <BLIND.md 경로> <결과 폴더> <태그> [s1 s2]. 판정과 다른 새 세션, 임시 폴더에 BLIND.md만.
B=$(realpath $1); mkdir -p $2; O=$(realpath $2); G=$3; H=$(cd $(dirname $0) && pwd)
for s in ${@:4}; do :; done
S=(${@:4}); [ ${#S} -eq 0 ] && S=(s1 s2)
for s in $S; do
  T=$(mktemp -d /tmp/steps$G$s.XXXX); cp $B $T/BLIND.md
  (cd $T && codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/STEPS-PROMPT.md > $T/log.txt 2>&1; echo "$G $s exit=$?"; cp $T/answer.md $O/STEPS-$s.md) &
done; wait
