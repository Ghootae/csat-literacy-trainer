# 단계 B2: items/<id>.json 생성 (calib-gold 형식) + items/_manifest.json. API 호출 없음.
import json, os, re, shutil
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.abspath(os.path.join(HERE, '..'))
EXP = os.path.abspath(os.path.join(BASE, '..'))
Q = f'{EXP}/set-pattern-2026-11-18/data/questions/'; A = f'{EXP}/set-pattern-2026-11-18/data/answers/'
GOLD = f'{EXP}/deep-item-v5-2026-11-18/calib-gold/'
db = {x['set_id']: x for x in json.load(open(f'{EXP}/megastudy-rate-coverage-2026-11-05/db-sets.json'))}
KIND = {'사례(case)': 'case', '관점(view)': 'view', '표(table)': 'table'}
os.makedirs(f'{BASE}/items', exist_ok=True)
manifest = []
def fix_bogi_mark(t): return re.sub(r'<\s*보\s*기\s*>', '〈보기〉', t)
rows = []
for line in open(f'{BASE}/SELECTION.md'):
    m = re.match(r'\| (사례\(case\)|관점\(view\)|표\(table\)) \| (bt-[0-9a-f]{8}) \| ([0-9a-f]{24}) \| (\d+) \|', line)
    if m: rows.append((KIND[m.group(1)], m.group(2), m.group(3), int(m.group(4))))
for kind, pid, sid, num in rows:
    d = json.load(open(Q + sid + '.json')); q = [x for x in d['questions'] if x['number'] == num][0]
    ans = {a['question_number']: a['correct_choice'] for a in json.load(open(A + sid + '.json'))['questions']}[num]
    stem = fix_bogi_mark(' '.join(b['text'] for b in q['prompt_blocks'] if b['type'] == 'stem').strip())
    if kind == 'table':
        body = open(f'{BASE}/bogi-transcribed/{pid}.md').read()
        assert body.startswith('원 이미지:'); body = body.split('\n\n', 1)[1].rstrip('\n')
        bogi = body
    else:
        parts = []
        for b in q['prompt_blocks']:
            if b['type'] != 'supplement': continue
            t = b['text']; ins = []
            for e in b.get('elements', []):
                if e['kind'] == 'phrase' and e.get('symbol'):
                    assert t[e['start']:e['end']] == e['text'], (pid, e)
                    ins.append((e['start'], e['symbol']))
            for pos, sym in sorted(ins, reverse=True): t = t[:pos] + sym + t[pos:]
            parts.append(t.strip())
        bogi = '\n'.join(parts)
    choices = [f"{c['label']} {c['text']}" for c in q['choices']]
    note = None
    if pid == 'bt-69bbf8bd':
        mk = re.search(r'｢[^｣]*｣', bogi).group(0)
        choices = [f"{c['label']} {mk}{c['text']}" if c['text'].startswith('에서') else None for c in q['choices']]
        assert all(choices), '선지가 모두 "에서"로 시작해야 함'; note = '복원(추정): 선지 앞 ' + mk
    item = {'version': 'V1', 'kind': kind, 'stem': stem, 'bogi': bogi, 'choices': choices, 'answer': ans,
            'source': {'setId': sid, 'number': num, 'label': db[sid]['label']}}
    json.dump({'items': [item]}, open(f'{BASE}/items/{pid}.json', 'w'), ensure_ascii=False, indent=1)
    manifest.append({'id': pid, 'passage': pid, 'kind': kind, 'setId': sid, 'number': num, 'answer': ans, 'note': note})
for k, src, pid, passage in [('case', 'disclosure-12', 'disclosure-12', 'disclosure-insider'), ('case', 'gongsun-12', 'gongsun-12', 'gongsun-long-later-mohists'),
                             ('view', 'meaning-23', 'meaning-23', 'meaning-internalism-externalism'), ('case', 'infoasym-13', 'bt-6a213e93', 'bt-6a213e93')]:
    shutil.copyfile(f'{GOLD}{src}.json', f'{BASE}/items/{pid}.json')
    it = json.load(open(f'{GOLD}{src}.json'))['items'][0]
    manifest.append({'id': pid, 'passage': passage, 'kind': k, 'setId': it['source']['setId'], 'number': it['source']['number'], 'answer': it['answer'], 'note': f'calib-gold/{src}.json 복사'})
json.dump(manifest, open(f'{BASE}/items/_manifest.json', 'w'), ensure_ascii=False, indent=1)
print(len(manifest), 'items')
