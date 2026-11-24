#!/bin/zsh
# 사용: run_judges.sh <v2|v1> <임시폴더 루트>. 저장소 루트에서 실행. 판정자 셋 × 새 세션 3번(4문항). 임시 폴더는 저장소 밖.
R=docs/experiments/rule-audit-2026-11-23; MK=$R/step4/marking-r3; V=$1; SC=$2; ROOT=$PWD
[[ $V == v2 ]] && SCHEMA=MARKING-SCHEMA-v2.md PK=packets || SCHEMA=BOGI-SCHEMA-v1.md PK=packets-v1
B1="S01 S02 S03 S04"
run_one() { local J=$1 N=$2 LIST=($=3) D=$SC/$V-$1-b$2
  mkdir -p $D; cp $ROOT/$R/$SCHEMA $D/; for p in $LIST; do cp $ROOT/$MK/$PK/$p.md $D/; done
  local FILES=""; for p in $LIST; do FILES="$FILES $p.md"; done
  local P="$SCHEMA의 '판정자에게 주는 안내'대로 ${LIST[1]}~${LIST[-1]}를 표시하고, 출력 형식의 JSON을 문항마다 한 줄씩 낸다. 표는 $D/$SCHEMA 이고 packet 파일은 $D 폴더의 다음 파일이다:$FILES. Read 도구로 읽는다."
  local OUTD=$ROOT/$MK/judges-$V/$J
  if [ $J = J1 ]; then (cd $D && claude -p "$P" --allowedTools Read > $OUTD/raw-b$N.txt 2> $OUTD/stderr-b$N.txt)
  else codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $D -o $OUTD/raw-b$N.txt "$P" > $OUTD/stdout-b$N.log 2> $OUTD/stderr-b$N.txt < /dev/null; fi
}
for J in J1 J2 J3; do for N in 1; do run_one $J $N "$(eval echo \$B$N)" & done; done; wait
echo "$V done"
