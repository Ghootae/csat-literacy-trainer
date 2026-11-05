import json, os, sys
from parse_rate import parse
DB = '/Users/mac/Projects/suneung_db/output'
TR = '/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records'
match = json.load(open('../megastudy-rate-coverage-2026-11-05/match.json'))
FIELD = json.load(open('fields.json'))
VOCAB = ('어휘', '문맥')
out = []
for m in match:
    s = m['set']
    if s['grade'] != 3 or not s['label'] or not any(k in s['label'] for k in ('수능', '평가원')):
        continue
    seq = m['mega']['seq']
    tabs = [parse(f'raw/rate-{seq}-{t}.html') for t in ('1004', '1005')]
    qs = json.load(open(f"{DB}/questions/{s['set_id']}.json"))['questions']
    tr = json.load(open(f"{TR}/{s['set_id']}.json"))['questions'] if os.path.exists(f"{TR}/{s['set_id']}.json") else []
    key = {q['question_number']: q['correct_choice'] for q in tr}
    items = []
    for q in qs:
        n = q['number']
        tags = q.get('source_tags') or []
        prompt = ' '.join(b.get('text', '') for b in (q.get('prompt_blocks') or []) if isinstance(b, dict))
        vocab = any(v in t for t in tags for v in VOCAB) or '문맥상' in prompt
        r = [t[n] for t in tabs]
        items.append({'number': n, 'tags': tags, 'vocab': vocab,
                      'answer': r[0]['ans'], 'keyMatch': key.get(n) == r[0]['ans'] == r[1]['ans'],
                      'correctRate': [x['pct'][x['ans'] - 1] for x in r],
                      'choicePercents': [x['pct'] for x in r]})
    use = [i for i in items if not i['vocab']]
    rates = [sum(i['correctRate']) / 2 for i in use]
    out.append({'setId': s['set_id'], 'label': s['label'], 'seq': seq, 'title': s['title'],
                'field': FIELD.get(s['set_id']), 'questions': len(items), 'usable': len(use),
                'keyMatch': f"{sum(i['keyMatch'] for i in items)}/{len(items)}",
                'meanRate': round(sum(rates) / len(rates), 1), 'minRate': min(rates), 'maxRate': max(rates),
                'items': items})
json.dump(out, open('candidates.json', 'w'), ensure_ascii=False, indent=1)
for o in sorted(out, key=lambda o: (o['field'] or '', o['label'])):
    print(o['field'], '|', o['label'].split(' - ')[0], '|', o['title'], '|', o['usable'], '|', o['keyMatch'], '|', o['meanRate'], o['minRate'], o['maxRate'])
