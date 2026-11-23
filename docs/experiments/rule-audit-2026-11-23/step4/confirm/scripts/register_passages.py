# 단계 B1: suneung_db 지문 → deep-item-v5-2026-11-18/passages/bt-<세트 id 앞 8자>/ (passage.txt, meta.json). API 호출 없음.
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.abspath(os.path.join(HERE, '..'))
REPO=os.path.abspath(os.path.join(HERE,'../../../../../..'))
EXP = os.path.join(REPO,'docs/experiments')
PASS = os.path.expanduser('~/Projects/suneung_db/output/passages/')
OUTROOT = f'{EXP}/deep-item-v5-2026-11-18/passages'
db = {x['set_id']: x for x in json.load(open(f'{EXP}/megastudy-rate-coverage-2026-11-05/db-sets.json'))}
targets = {'bt-69bbef9a':('69bbef9a8937cf145518cb13',8),'bt-69bff913':('69bff91378128b2a9bedcdc8',17),'bt-69bffa62':('69bffa62fa5063deffe19c88',8),'bt-69bffc01':('69bffc0178128b2a9bedcfe6',16),'bt-69c0041a':('69c0041afa5063deffe1a036',7)}
report = {}
for pid, (sid, num) in sorted(targets.items()):
    d = os.path.join(OUTROOT, pid)
    if os.path.exists(d): sys.exit(f'이미 있음: {d}')
    p = json.load(open(PASS + sid + '.json'))
    labeled = [a for a in p['annotations'] if a['type'] == 'labeled_block']
    out = []; n = 0; ins_count = 0
    for sec in p['sections']:
        if sec['label']: out.append(sec['label'])
        for pa in sec['paragraphs']:
            n += 1; text = pa['text']; ops = []  # (pos, order, string)
            for a in pa['annotations']:
                if a['type'] == 'underlined_phrase' and a.get('marker'):
                    assert text[a['start']:a['end']] == a['text'], (sid, a)
                    ops.append((a['start'], 1, a['marker']))
            base = pa['source_range']['start']
            for lb in labeled:
                if pa['paragraph_id'] in lb['paragraph_ids']:
                    lt = lb['text'].strip(); s_ = text.find(lt); e_ = s_ + len(lt)
                    assert s_ >= 0 and text.count(lt) == 1 and e_ <= len(text), (sid, lb['marker'])
                    ops.append((s_, 0, f'[{lb["marker"].strip("[]")}]')); ops.append((e_, 2, f'[/{lb["marker"].strip("[]")}]'))
            for pos, _, s in sorted(ops, key=lambda x: (-x[0], -x[1])):
                text = text[:pos] + s + text[pos:]; ins_count += 1
            out.append(f'[{n}문단] {text}\n' if False else f'[{n}문단] {text}')
        # 섹션 사이는 빈 줄
    # 문단·섹션 라벨 줄 조립: 라벨 줄 바로 뒤 문단은 줄바꿈 하나, 문단 사이는 빈 줄
    lines = []
    for i, x in enumerate(out):
        lines.append(x)
        if i + 1 < len(out): lines.append('\n' if re.fullmatch(r'\([가-힣]\)', x) else '\n\n')
    os.makedirs(d)
    open(f'{d}/passage.txt', 'w').write(''.join(lines) + '\n')
    json.dump({'title': p['exam']['title'], 'exam': db[sid]['label'], 'source': {'setId': sid, 'number': num},
               'note': '규칙 감사 4단계 확인용 등록(2026-11-24)'}, open(f'{d}/meta.json', 'w'), ensure_ascii=False, indent=1)
    report[pid] = {'paragraphs': n, 'inserted_marks': ins_count, 'images': [i['image_id'] + ' @' + str(i['anchor'].get('paragraph_id')) for i in p['images']]}
for k, v in report.items(): print(k, v)
