#!/bin/zsh
# 확인용 기출 7개 e3 (RULES_V=6, 수리 끔). 저장소 루트에서 실행.
C=docs/experiments/rule-audit-2026-11-23/step4/confirm
python3 -c "
import json;[print(m['id'],m['passage']) for m in json.load(open('$C/items/_manifest.json'))]" | xargs -P 4 -L 1 zsh -c 'RULES_V=6 PASSAGE=$1 IN='$C'/items/$0.json OUT_DIR='$C'/e3/$0 node docs/experiments/deep-item-v5-2026-11-18/eval-repair.mjs > '$C'/logs/$0.log 2>&1; echo "$0 exit=$?"'
