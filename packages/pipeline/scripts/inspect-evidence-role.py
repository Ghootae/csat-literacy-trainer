#!/usr/bin/env python3
"""evidenceRole 분류기 표본 검사.

평가 캐시에서 (evidenceRole, evidence) 쌍을 뽑아 사람이 눈으로 확인할 수 있게 출력한다.
게이트를 지게 된 새 축이 실제로 신뢰할 만한지 재는 유일한 실용적 방법이다.

  python3 inspect-evidence-role.py [--role relation|entity_identification|scope]
"""
import json
import glob
import sys
from collections import Counter

CACHE = '/Users/mac/Projects/csat-literacy-trainer/.omc/state/assess-cache/*.json'

want = None
if '--role' in sys.argv:
    want = sys.argv[sys.argv.index('--role') + 1]

rows = []
for f in glob.glob(CACHE):
    try:
        d = json.load(open(f))
    except Exception:
        continue
    for v in d.get('verdicts', []):
        role = v.get('evidenceRole')
        if role is None:
            continue  # 이 축 도입 전의 판정 — 표본에서 제외
        rows.append((role, v.get('semanticState'), v.get('expressionMode'),
                     v.get('queryId', ''), (v.get('evidence') or '').strip()))

if not rows:
    print('evidenceRole이 붙은 판정이 없다. 재측정이 아직 안 돌았거나 캐시가 비었다.')
    sys.exit(0)

print(f'evidenceRole이 붙은 판정 {len(rows)}건\n')
print('분포:')
for role, n in Counter(r[0] for r in rows).most_common():
    print(f'  {role:22s} {n}')

# preserved인데 관계 증거가 아닌 것 — 이 축을 도입한 이유. 가장 눈여겨볼 표본.
print('\n두 축이 어긋난 표본 (preserved + 관계 아님) — 이 축의 존재 이유:')
odd = [r for r in rows if r[1] == 'preserved' and r[0] != 'relation']
for role, _st, mode, qid, ev in sorted(set(odd), key=lambda r: r[4])[:25]:
    print(f'  [{role:21s}|{mode:8s}] {qid:22s} {ev[:64]}')

if want:
    print(f'\n--- role={want} 전체 ---')
    for role, st, mode, qid, ev in sorted(set(r for r in rows if r[0] == want), key=lambda r: r[4]):
        print(f'  [{st:13s}|{mode:8s}] {qid:22s} {ev[:70]}')

# 정합성 검사: preserved가 아닌데 none이 아닌 role은 스키마 위반이다.
bad = [r for r in rows if r[1] != 'preserved' and r[0] != 'none']
if bad:
    print(f'\n⚠ 스키마 위반 {len(bad)}건 (preserved 아닌데 role != none):')
    for role, st, _m, qid, ev in bad[:10]:
        print(f'  {qid:22s} {st:14s} role={role:22s} {ev[:44]}')
else:
    print('\n정합성: preserved가 아닌 판정은 전부 role=none ✓')
