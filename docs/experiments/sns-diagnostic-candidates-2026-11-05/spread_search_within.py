import json, itertools, statistics
C = json.load(open('candidates.json'))
slot = lambda f: '인문' if f.startswith(('인문', '예술')) else f[:2]
by = {}
for o in C:
    o['rates'] = sorted(sum(i['correctRate']) / 2 for i in o['items'] if not i['vocab'])
    o['range'] = o['rates'][-1] - o['rates'][0]
    by.setdefault(slot(o['field']), []).append(o)
BINS = [(0, 40), (40, 55), (55, 70), (70, 85), (85, 101)]
res = []
for combo in itertools.product(by['인문'], by['사회'], by['과학'], by['기술']):
    r = [x for o in combo for x in o['rates']]
    if not 15 <= len(r) <= 17:
        continue
    counts = [sum(lo <= x < hi for x in r) for lo, hi in BINS]
    means = [statistics.mean(o['rates']) for o in combo]
    res.append({'titles': [o['title'] for o in combo], 'n': len(r), 'counts': counts,
                'covered': sum(c > 0 for c in counts), 'minRange': min(o['range'] for o in combo),
                'meanGap': round(max(means) - min(means), 1), 'sd': round(statistics.pstdev(r), 1),
                'mean': round(statistics.mean(r), 1), 'min': min(r), 'max': max(r),
                'passages': [(o['title'], o['label'].split(' - ')[0][3:], o['rates']) for o in combo]})
ok = [x for x in res if x['covered'] >= 4 and x['minRange'] >= 25]
ok.sort(key=lambda x: (-x['covered'], x['meanGap'], -x['sd']))
json.dump(ok[:20], open('spread-within-top.json', 'w'), ensure_ascii=False, indent=1)
print(len(ok))
for x in ok[:8]:
    print(x['covered'], x['counts'], x['n'], 'mean', x['mean'], 'sd', x['sd'], 'gap', x['meanGap'], 'minRange', x['minRange'])
    for p in x['passages']: print('    ', p)
