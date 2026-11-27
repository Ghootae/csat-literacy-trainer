# 공통: $CR/make_blind.py 의 passage_db 와 question 을 〈보기〉 없는 일치 문항용으로 옮김 (2026-11-27)
import json
SP='docs/experiments/set-pattern-2026-11-18/'; DB='/Users/mac/Projects/suneung_db/output/'
CIRC='①②③④⑤'
def passage_db(sid):
    d=json.load(open(DB+f'passages/{sid}.json')); t=d['full_text']
    marks=sorted([(e['start'],e['symbol']) for e in d['elements'] if e['kind']=='phrase' and e.get('symbol')],reverse=True)
    for s,sym in marks: t=t[:s]+sym+t[s:]
    out=[];n=0
    for l in t.split('\n'):
        l=l.strip()
        if not l: continue
        if l.startswith('*'): out.append(l)
        else: n+=1; out.append(f'[{n}문단] {l}')
    return '\n\n'.join(out)
def question(sid,num):
    q=json.load(open(SP+f'data/questions/{sid}.json')); it=[x for x in q['questions'] if x['number']==num][0]
    ans=[x for x in json.load(open(SP+f'data/answers/{sid}.json'))['questions'] if x['question_number']==num][0]['correct_choice']
    stem=[b for b in it['prompt_blocks'] if b['type']=='stem'][0]['text']
    ch=[f"{c['label']} {c['text']}" for c in it['choices']]
    return stem,ch,ans
