import json, itertools, statistics
C = json.load(open('candidates.json'))
slot = lambda f: '인문' if f.startswith(('인문', '예술')) else f[:2]
by = {}
for o in C:
    o['rates'] = sorted(sum(i['correctRate']) / 2 for i in o['items'] if not i['vocab'])
    by.setdefault(slot(o['field']), []).append(o)
BINS = [(0, 40), (40, 55), (55, 70), (70, 85), (85, 101)]
res = []
for combo in itertools.product(by['인문'], by['사회'], by['과학'], by['기술']):
    r = [x for o in combo for x in o['rates']]
    if not 15 <= len(r) <= 17:
        continue
    counts = [sum(lo <= x < hi for x in r) for lo, hi in BINS]
    res.append({'titles': [o['title'] for o in combo], 'n': len(r), 'counts': counts,
                'covered': sum(c > 0 for c in counts), 'minBin': min(counts),
                'sd': round(statistics.pstdev(r), 1), 'mean': round(statistics.mean(r), 1),
                'min': min(r), 'max': max(r), 'suneung': sum('11월' in o['label'] for o in combo)})
res.sort(key=lambda x: (-x['covered'], -x['minBin'], -x['sd']))
json.dump(res[:20], open('spread-top.json', 'w'), ensure_ascii=False, indent=1)
print(len(res))
for x in res[:12]:
    print(x['covered'], x['counts'], x['n'], x['mean'], x['sd'], x['min'], x['max'], '수능', x['suneung'], ' / '.join(x['titles']))
