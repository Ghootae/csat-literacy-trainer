#!/bin/zsh
# 판정자 셋 × 새 세션 3번(9·9·8문항). 저장소 루트에서 실행. 임시 폴더는 저장소 밖(scratchpad).
R=docs/experiments/rule-audit-2026-11-23; SC=$1; ROOT=$PWD
B1="M01 M02 M03 M04 M05 M06 M07 M08 M09"; B2="M10 M11 M12 M13 M14 M15 M16 M17 M18"; B3="M19 M20 M21 M22 M23 M24 M25 M26"
run_one() { # $1=판정자 $2=배치번호 $3=문항 목록
  local J=$1 N=$2 LIST=($=3) D=$SC/$1-b$2
  mkdir -p $D; cp $ROOT/$R/BOGI-SCHEMA-v1.md $D/; for p in $LIST; do cp $ROOT/$R/main-r3/packets/$p.md $D/; done
  local FILES=""; for p in $LIST; do FILES="$FILES $p.md"; done
  local P="BOGI-SCHEMA-v1.md의 '판정자에게 주는 안내'대로 ${LIST[1]}~${LIST[-1]}를 표시하고, 출력 형식의 JSON을 문항마다 한 줄씩 낸다. 표는 $D/BOGI-SCHEMA-v1.md 이고 packet 파일은 $D 폴더의 다음 파일이다:$FILES. Read 도구로 읽는다."
  local OUTD=$ROOT/$R/main-r3/judges/$J
  if [ $J = J1 ]; then (cd $D && claude -p "$P" --allowedTools Read > $OUTD/raw-b$N.txt 2> $OUTD/stderr-b$N.txt)
  else codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $D -o $OUTD/raw-b$N.txt "$P" > $OUTD/stdout-b$N.log 2> $OUTD/stderr-b$N.txt < /dev/null; fi
}
for J in J1 J2 J3; do for N in 1 2 3; do run_one $J $N "$(eval echo \$B$N)" & done; done; wait
echo done
