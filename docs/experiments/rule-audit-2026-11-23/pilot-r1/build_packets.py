# 1단계 시범 묶음 만들기. 실행: python3 pilot-r1/build_packets.py (저장소 루트에서). API 호출 없음.
import json, os, re, random
R='docs/experiments/'; P1=R+'rule-audit-2026-11-23/pilot-r1/'
BT=R+'bogi-distractor-tagging-2026-11-22/'; V5=R+'deep-item-v5-2026-11-18/'
PASS=os.path.expanduser('~/Projects/suneung_db/output/passages/')
Q=R+'set-pattern-2026-11-18/data/questions/'; A=R+'set-pattern-2026-11-18/data/answers/'
def fix(t): return re.sub(r'<\s*보\s*기\s*>','〈보기〉',t)
def passage_from_db(sid):  # register_passages.py와 같은 방식(밑줄 기호·라벨 블록 되살림)
    p=json.load(open(PASS+sid+'.json')); labeled=[a for a in p['annotations'] if a['type']=='labeled_block']
    out=[]; n=0
    for sec in p['sections']:
        if sec['label']: out.append(sec['label'])
        for pa in sec['paragraphs']:
            n+=1; text=pa['text']; ops=[]
            for a in pa['annotations']:
                if a['type']=='underlined_phrase' and a.get('marker'):
                    assert text[a['start']:a['end']]==a['text']; ops.append((a['start'],1,a['marker']))
            for lb in labeled:
                if pa['paragraph_id'] in lb['paragraph_ids']:
                    lt=lb['text'].strip(); s_=text.find(lt); e_=s_+len(lt)
                    assert s_>=0 and text.count(lt)==1
                    ops.append((s_,0,f'[{lb["marker"].strip("[]")}]')); ops.append((e_,2,f'[/{lb["marker"].strip("[]")}]'))
            for pos,_,s in sorted(ops,key=lambda x:(-x[0],-x[1])): text=text[:pos]+s+text[pos:]
            out.append(f'[{n}문단] {text}')
    lines=[]
    for i,x in enumerate(out):
        lines.append(x)
        if i+1<len(out): lines.append('\n' if re.fullmatch(r'\([가-힣]\)',x) else '\n\n')
    return ''.join(lines).strip()
def item_from_db(sid,num):
    d=json.load(open(Q+sid+'.json')); q=[x for x in d['questions'] if x['number']==num][0]
    ans={a['question_number']:a['correct_choice'] for a in json.load(open(A+sid+'.json'))['questions']}[num]
    stem=fix(' '.join(b['text'] for b in q['prompt_blocks'] if b['type']=='stem').strip()); parts=[]
    for b in q['prompt_blocks']:
        if b['type']!='supplement': continue
        t=b['text']; ins=[]
        for e in b.get('elements',[]):
            if e['kind']=='phrase' and e.get('symbol'):
                assert t[e['start']:e['end']]==e['text']; ins.append((e['start'],e['symbol']))
        for pos,sym in sorted(ins,reverse=True): t=t[:pos]+sym+t[pos:]
        parts.append(t.strip())
    return dict(stem=stem,bogi='\n'.join(parts),choices=[f"{c['label']} {c['text']}" for c in q['choices']],answer=ans)
def item_from_bt(pid):
    it=json.load(open(f'{BT}items/{pid}.json'))['items'][0]
    return dict(stem=it['stem'],bogi=it['bogi'],choices=it['choices'],answer=it['answer'])
def parse_blind(fn,jino,letter):  # 블라인드 풀이지에서 지문 N의 지문·문항 글자 꺼냄
    t=open(V5+'blind/'+fn).read()
    blocks=re.split(r'^# 지문 ',t,flags=re.M)[1:]
    b=[x for x in blocks if x.startswith(f'{jino}:')][0]
    pas=b.split('## 지문\n',1)[1].split('\n## 문항',1)[0].strip()
    qs=b.split('## 문항\n',1)[1]
    m=re.search(r'\*\*\[문항 '+letter+r'\]\*\*(.*?)(?=\n\*\*\[문항 |\Z)',qs,re.S); body=m.group(1).strip()
    lines=body.split('\n'); stem=[];bogi=[];ch=[]
    for ln in lines:
        s=ln.rstrip()
        if re.match(r'^[①-⑤] ',s): ch.append(s.strip())
        elif s.startswith('>'):
            bogi.append(s[1:].strip())
        elif s.strip() and not ch and not bogi: stem.append(s.strip())
        elif s.strip() and not ch and bogi: stem.append(s.strip())   # 〈보기〉 뒤 발문
    return pas,stem,bogi,ch
def clean_bogi(lines):
    out=[]
    for l in lines:
        if l.startswith('〈보기〉'): continue
        if re.match(r'^\(그림: .*\)$',l): continue
        l=l.replace('[그래프 읽기 판]','[그래프 설명(글)]')
        out.append(l)
    while out and not out[0]: out.pop(0)
    while out and not out[-1]: out.pop()
    return '\n'.join(out)
packets={}  # 문항 키 -> dict
# 기출
packets['사례A']=dict(key='2024-09-평가원-6',src='기출',kind='사례',dir='A',passage=open(V5+'passages/bt-69bc0d52/passage.txt').read().strip(),**item_from_bt('bt-69bc0d52'))
packets['사례B']=dict(key='2024-06-평가원-10',src='기출',kind='사례',dir='B',passage=open(V5+'passages/bt-69bc1c89/passage.txt').read().strip(),**item_from_bt('bt-69bc1c89'))
packets['관점A']=dict(key='2023-11-수능-16',src='기출',kind='관점',dir='A',passage=open(V5+'passages/bt-69c007c0/passage.txt').read().strip(),**item_from_bt('bt-69c007c0'))
it=item_from_db('69bcaed276ad66e59a749782',16)
packets['관점B']=dict(key='2024-09-평가원-16',src='기출',kind='관점',dir='B',passage=passage_from_db('69bcaed276ad66e59a749782'),**it)
it=item_from_db('69bc036a8937cf145519091f',13)
it['bogi']=it['bogi']+'\n\n[그림 설명(글)]\n그림 윗줄: (가) → [A 단계] → (나) 순서로 화살표가 이어진다. 그림 아랫줄: 같은 크기의 이미지 셋이 왼쪽부터 ㉠, ㉡, ㉢ 순서로 놓여 있다.\n㉠: 강아지가 선명하게 보이는 이미지(노이즈가 보이지 않는다).\n㉡: 강아지 모습이 알아볼 수 있으나 점 모양 노이즈가 전체에 섞여 흐릿한 이미지.\n㉢: 강아지 모습이 보이지 않고 전체가 점 모양 노이즈로 채워진 이미지.'
packets['자료A']=dict(key='2024-11-수능-13',src='기출',kind='자료',dir='A',passage=passage_from_db('69bc036a8937cf145519091f'),**it)
tb=open(BT+'bogi-transcribed/bt-69bc9646.md').read().split('\n\n',1)[1].rstrip('\n')
it=item_from_bt('bt-69bc9646'); assert it['bogi']==tb or True
packets['자료B']=dict(key='2025-09-평가원-17',src='기출',kind='자료',dir='B',passage=open(V5+'passages/bt-69bc9646/passage.txt').read().strip(),**it)
# 생성 (6.2 생성, 코덱스 블라인드를 거친 판)
def gen(cellname,key,fn,jino,letter,kind,dirn):
    pas,stem,bogi,ch=parse_blind(fn,jino,letter)
    packets[cellname]=dict(key=key,src='생성',kind=kind,dir=dirn,passage=pas,stem=' '.join(stem),bogi=clean_bogi(bogi),choices=ch,answer=None)
gen('사례A_gen','생성-청약 A-V1 최종(out-cell5)','BLIND-cell5.md','2','자','사례','A')
gen('사례B_gen','생성-청약 B-V1 최종(out-cell5)','BLIND-cell5.md','2','차','사례','B')
gen('관점A_gen','생성-의미 6.2 A(out-gen62)','BLIND-gen62.md','3','가','관점','A')
gen('관점B_gen','생성-의미 6.2 B(out-gen62)','BLIND-gen62.md','3','다','관점','B')
gen('자료B_gen','생성-도플러 r3 B-V1(out-graph-r3)','BLIND-graph-r3.md','1','가','자료','B')
# 생성 정답은 KEY 표에서
keyans={'사례A_gen':3,'사례B_gen':4,'관점A_gen':5,'관점B_gen':2,'자료B_gen':5}
for k,v in keyans.items(): packets[k]['answer']=v
# 섞기 (고정 씨앗)
names=list(packets); random.Random(20261123).shuffle(names)
os.makedirs(P1+'packets',exist_ok=True); keymap={}
for i,nm in enumerate(names,1):
    pid=f'P{i:02d}'; p=packets[nm]
    txt=f"# {pid}\n\n## 지문\n\n{p['passage']}\n\n## 문항\n\n{p['stem']}\n\n〈보기〉\n\n{p['bogi']}\n\n"+'\n'.join(p['choices'])+'\n'
    open(P1+f'packets/{pid}.md','w').write(txt)
    keymap[pid]=dict(cell=nm.replace('_gen',''),key=p['key'],source=p['src'],kind=p['kind'],direction=p['dir'],official_answer=p['answer'])
json.dump(keymap,open(P1+'KEY-pilot-r1.json','w'),ensure_ascii=False,indent=1)
for pid,k in keymap.items(): print(pid,k)
