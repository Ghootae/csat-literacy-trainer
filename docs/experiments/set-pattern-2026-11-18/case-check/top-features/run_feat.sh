#!/bin/zsh
# 사용: run_feat.sh <키> <BLIND.md 경로> [f1 f2]. 점수·출처 없는 새 세션, 임시 폴더에 BLIND.md만.
H=$(cd $(dirname $0) && pwd); K=$1; B=$(realpath $2); shift 2; F=(${@}); [ ${#F} -eq 0 ] && F=(f1 f2)
mkdir -p $H/features/$K; O=$H/features/$K
for s in $F; do
  T=$(mktemp -d /tmp/feat$s.XXXX); cp $B $T/BLIND.md
  (cd $T && codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/FEATURE-PROMPT.md > $T/log.txt 2>&1; echo "$K $s exit=$?"; cp $T/answer.md $O/FEAT-$s.md) &
done; wait
