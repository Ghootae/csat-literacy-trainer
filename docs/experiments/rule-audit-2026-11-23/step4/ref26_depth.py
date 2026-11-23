# 본 감사 기출 26문항 중 깊이 전략 S1·S3·S4 가운데 하나 이상을 지키는 문항 수 (main-r1 OPTIONS-majority.csv 다수값, API 없음)
# S1 = 정답 F4b '2 이상', S3 = 정답 F2 '둘 다', S4 = 거짓 선지 모두 F4b '2 이상' (REPORT-rule-compliance-r1.md 표의 정의와 같음)
import csv, collections
rows = list(csv.DictReader(open('../main-r1/OPTIONS-majority.csv', encoding='utf8')))
items = collections.OrderedDict()
for r in rows: items.setdefault(r['문항 키'], []).append(r)
tot = collections.Counter(); hit = collections.Counter(); by = {}
out = ['문항 키,갈래,발문,S1,S3,S4,하나 이상']
for k, ch in items.items():
    kind = ch[0]['감사 갈래']; stem = ch[0]['발문']
    ans = [c for c in ch if c['출제 정답 여부'] == '정답'][0]
    s1 = ans['F4b'] == '2 이상'; s3 = ans['F2'] == '둘 다'
    fl = [c for c in ch if c['F1'] == '거짓']; s4 = bool(fl) and all(c['F4b'] == '2 이상' for c in fl)
    any_ = s1 or s3 or s4
    out.append(f'{k},{kind},{stem},{int(s1)},{int(s3)},{int(s4)},{int(any_)}')
    for g in ('전체', kind): tot[g] += 1; hit[g] += any_
    for n, v in (('S1', s1), ('S3', s3), ('S4', s4)): by[n] = by.get(n, 0) + v
print('\n'.join(out)); print()
print('S1', by['S1'], 'S3', by['S3'], 'S4', by['S4'], '(/%d)' % tot['전체'])
for g in tot: print(g, f'{hit[g]}/{tot[g]}')
