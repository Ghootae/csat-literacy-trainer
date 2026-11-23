# 확인용 기출 7개 → items/<키>.json (calib-gold 형식). API 호출 없음. build_items.py(11-22 태깅)와 같은 방식.
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.abspath(os.path.join(HERE, '..'))
REPO = os.path.abspath(os.path.join(HERE, '../../../../../..')); EXP = REPO + '/docs/experiments'
Q = f'{EXP}/set-pattern-2026-11-18/data/questions/'; A = f'{EXP}/set-pattern-2026-11-18/data/answers/'
db = {x['set_id']: x for x in json.load(open(f'{EXP}/megastudy-rate-coverage-2026-11-05/db-sets.json'))}
# 키, 갈래, 지문 id, 세트, 번호, 이미지 〈보기〉 전사 파일(없으면 글 〈보기〉)
ROWS = [('2025-11-수능-8','case','bt-69bbef9a','69bbef9a8937cf145518cb13',8,None),
        ('2025-06-평가원-8','case','bt-69bffa62','69bffa62fa5063deffe19c88',8,None),
        ('2025-11-수능-17','view','bt-69bff913','69bff91378128b2a9bedcdc8',17,None),
        ('2025-11-수능-16','other','bt-69bff913','69bff91378128b2a9bedcdc8',16,'2025-11-수능-16'),
        ('2024-06-평가원-16','view','bt-69bffc01','69bffc0178128b2a9bedcfe6',16,None),
        ('2024-06-평가원-14','other','bt-69bffc01','69bffc0178128b2a9bedcfe6',14,'2024-06-평가원-14'),
        ('2023-11-수능-7','table','bt-69c0041a','69c0041afa5063deffe1a036',7,'2023-11-수능-7')]
fix = lambda t: re.sub(r'<\s*보\s*기\s*>', '〈보기〉', t)
os.makedirs(f'{BASE}/items', exist_ok=True); man = []
for key, kind, pid, sid, num, tr in ROWS:
    d = json.load(open(Q + sid + '.json')); q = [x for x in d['questions'] if x['number'] == num][0]
    ans = {a['question_number']: a['correct_choice'] for a in json.load(open(A + sid + '.json'))['questions']}[num]
    stem = fix(' '.join(b['text'] for b in q['prompt_blocks'] if b['type'] == 'stem').strip())
    if tr:
        body = open(f'{BASE}/bogi-transcribed/{tr}.md').read(); assert body.startswith('원 이미지:'); bogi = body.split('\n\n', 1)[1].rstrip('\n')
    else:
        parts = []
        for b in q['prompt_blocks']:
            if b['type'] != 'supplement': continue
            t = b['text']; ins = []
            for e in b.get('elements', []):
                if e['kind'] == 'phrase' and e.get('symbol'):
                    assert t[e['start']:e['end']] == e['text'], (key, e); ins.append((e['start'], e['symbol']))
            for pos, sym in sorted(ins, reverse=True): t = t[:pos] + sym + t[pos:]
            parts.append(t.strip())
        bogi = '\n'.join(parts)
    choices = [f"{c['label']} {c['text']}" for c in q['choices']]
    item = {'version': 'V1', 'kind': kind, 'stem': stem, 'bogi': bogi, 'choices': choices, 'answer': ans,
            'source': {'setId': sid, 'number': num, 'label': db[sid]['label']}}
    json.dump({'items': [item]}, open(f'{BASE}/items/{key}.json', 'w'), ensure_ascii=False, indent=1)
    man.append({'id': key, 'passage': pid, 'kind': kind, 'setId': sid, 'number': num, 'answer': ans})
json.dump(man, open(f'{BASE}/items/_manifest.json', 'w'), ensure_ascii=False, indent=1)
for m in man: print(m)
