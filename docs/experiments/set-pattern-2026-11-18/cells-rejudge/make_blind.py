# 남은 세 칸 새 기준 재판정 (2026-11-27). calib-judge/make_blind.py(old_block·passage_db·question·block·그림 판 문안)와
# case-check/lure-check/make_blind.py(풀이지 HDR·CODEX-PROMPT·run_eval.sh 문안)를 복사해 씀. 문항마다 단독 블라인드, 지문 제목은 "# 지문" 한 줄.
# 사용(저장소 루트): python3 docs/experiments/set-pattern-2026-11-18/cells-rejudge/make_blind.py
import json, os, re, random, shutil
HERE=os.path.dirname(os.path.abspath(__file__)); SP=os.path.abspath(HERE+'/..')+'/'; DB='/Users/mac/Projects/suneung_db/output/'
CIRC='①②③④⑤'
def old_block(blind,label):
    t=open(blind,encoding='utf8').read()
    m=re.search(r'\*\*\[문항 '+re.escape(label)+r'\]\*\*(.*?)(?=\n\n\*\*\[문항 |\n\n# 지문|\n---|\Z)',t,re.S); assert m,(blind,label)
    body=re.sub(r'^ \(지문: [^)]*\)','',m.group(1).rstrip())
    return '**[문항 1]**'+body+'\n\n---\n'
def old_passage(blind,n=1):
    t=open(blind,encoding='utf8').read(); ps=re.split(r'\n# 지문[^\n]*\n',t)[1:]
    p=ps[n-1].split('\n## 문항')[0]; assert p.lstrip().startswith('## 지문'); return p.split('## 지문\n',1)[1].strip()
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
    stem=[b for b in it['prompt_blocks'] if b['type']=='stem'][0]['text'].replace('<보기>','〈보기〉')
    sup=[b for b in it['prompt_blocks'] if b['type']=='supplement'][0]
    bogi=sup['text']
    for e in sorted([e for e in sup['elements'] if e['kind']=='phrase' and e.get('symbol')],key=lambda e:-e['start']): bogi=bogi[:e['start']]+e['symbol']+bogi[e['start']:]
    ch=[f"{c['label']} {c['text'].replace('<보기>','〈보기〉')}" for c in it['choices']]
    return stem,bogi.strip(),ch,ans
def block(stem,bogi,ch,pic=False):
    b='\n'.join('> '+l if l.strip() else '>' for l in bogi.split('\n'))
    return f"**[문항 1]** {stem}\n\n> 〈보기〉\n>\n{'> (그림: pic-1.png)'+chr(10)+'>'+chr(10) if pic else ''}{b}\n\n"+'  \n'.join(ch)+'  \n\n---\n'
B1=SP+'cell3/blind/solid-catalyst/BLIND-r1.md'; B2=SP+'cell3/blind-r2/solid-catalyst/BLIND-r1.md'
V1=SP+'cell1-v62/blind/BLIND-cell1.md'; V2=SP+'cell1-v62/r2/blind/BLIND-cell1r2.md'; G=SP+'cell2/blind/BLIND-cell2.md'
ITEMS=[]  # dict(key, cell, kind, passage, block, answer, img, reading(그림에 읽기 판 있는지))
def old(key,cell,blind,lab,ans,pn=1,img=None):
    b=old_block(blind,lab)
    if img: b=re.sub(r'\(그림: pic-[^)]*\.png\)','(그림: pic-1.png)',b)
    ITEMS.append(dict(key=key,cell=cell,kind='생성',passage=old_passage(blind,pn),block=b,answer=ans,img=img,reading=bool(img)))
old('SC-A1','과학 사례',B1,'3','④'); old('SC-A2','과학 사례',B1,'5','②'); old('SC-B1','과학 사례',B1,'2','②'); old('SC-B2','과학 사례',B1,'1','⑤')
old('SC-rB1','과학 사례',B2,'1','②'); old('SC-rB2','과학 사례',B2,'5','⑤')
old('SV-A1','사회 관점',V1,'가','④'); old('SV-B1','사회 관점',V1,'나','②'); old('SV-rA1','사회 관점',V2,'마','④'); old('SV-rB1','사회 관점',V2,'나','②')
old('SG-A2','사회 그래프',G,'가','⑤',img=SP+'cell2/blind/imgs/pic-가.png'); old('SG-B2','사회 그래프',G,'마','④',img=SP+'cell2/blind/imgs/pic-마.png')
def new(key,cell,sid,num,pic=False):
    stem,bogi,ch,a=question(sid,num); img=None
    if pic:
        q=json.load(open(SP+f'data/questions/{sid}.json')); it=[x for x in q['questions'] if x['number']==num][0]
        im=[i for b in it['prompt_blocks'] if b['type']=='supplement' for i in b.get('images',[])]
        p=DB+im[0]['local_path'] if im else None
        if not p or not os.path.exists(p): print('그림 없음 → 제외',key); return
        img=p
    ITEMS.append(dict(key=key,cell=cell,kind='기출',passage=passage_db(sid),block=block(stem,bogi,ch,bool(img)),answer=CIRC[a-1],img=img,reading=False))
new('KV-신문사','사회 관점','69bbf8c9a029f488d9e5217f',12); new('KV-방송법','사회 관점','69c08d6c78128b2a9bedeee8',23)
new('KV-하딘','사회 관점','69c0a5b778128b2a9bee10fc',37); new('KV-효율성','사회 관점','6a2294ff86fd308968e1110f',27)
new('KG-관세','사회 그래프','69bffdf378128b2a9bedd0cd',6,True); new('KG-소비','사회 그래프','69c097c0fa5063deffe1d595',18,True)
HDR_TXT='''# 블라인드 풀이지: 〈보기〉 문항 1개 (지문 하나) (2026-11-27)

지문 하나에 〈보기〉 문항이 1개 있습니다. 출처는 가렸습니다. 〈보기〉에 그림은 없고 글만 있습니다.
'''
RULE='''
아래를 적어 주세요. 답과 등급을 모두 정한 뒤에 정답표를 여세요.
- 고른 답
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 3점 〈보기〉 문항으로 그대로 낼 수 있는가)
- 한 줄 이유
- 결함 표시(해당하면): ㉮ 〈보기〉가 지문 예시를 이름만 바꿔 옮김 ㉯ 〈보기〉를 안 봐도 풀리는 선지 2개 이상 ㉰ 〈보기〉에 쓰이지 않는 사실이 있음 ㉱ 〈보기〉가 서로 무관한 사건을 나열함 ㉲ 정답이 지문 한 문장으로 바로 정해짐 ㉳ 정답 시비(이의 제기) 위험 ㉴ 학생이 내려야 할 판정(누가 긍정·부정하는지, 어느 쪽과 같은지)까지 〈보기〉가 말함(비판 전제 제시는 제외)
'''
PIC_R='〈보기〉가 그림을 포함하면 그림을 PNG(pic-1.png)로 첨부했고, 같은 그림을 글로 옮긴 읽기 판을 문항에 함께 적었습니다.'
PIC_N='〈보기〉의 그림을 PNG(pic-1.png)로 첨부했습니다. 읽기 판은 없습니다.'
def hdr(it):
    if not it['img']: return HDR_TXT+RULE
    return '# 블라인드 풀이지: 〈보기〉 문항 1개 (지문 하나) (2026-11-27)\n\n지문 하나에 〈보기〉 문항이 1개 있습니다. 출처는 가렸습니다. '+(PIC_R if it['reading'] else PIC_N)+'\n'+RULE
def prompt(it):
    if it['img']: picn=('〈보기〉의 그림은 첨부한 pic-1.png이고, 문항에는 같은 그림을 글로 옮긴 읽기 판도 적혀 있어. 그림과 읽기 판을 같이 보고 풀어. ' if it['reading'] else '〈보기〉의 그림은 첨부한 pic-1.png야(읽기 판은 없어). 그림을 보고 풀어. ')
    else: picn='〈보기〉에 그림은 없고 글만 있어. '
    return f'''작업 폴더의 BLIND.md를 풀고 판정해 줘. 지문이 하나이고 〈보기〉 문항이 1개야. 출처는 가렸어. {picn}이 폴더의 파일 말고 다른 파일은 열지 마. 인터넷·API도 쓰지 마.

문항(1번)을 직접 풀어서 정해 줘.
- 고른 답(①~⑤)
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 3점 〈보기〉 문항으로 그대로 낼 수 있는가)
- 한 줄 이유(판정을 가른 이유)
- 결함 표시: 풀이지 맨 위 ㉮~㉴ 중 해당하는 것(없으면 빈칸)
- 그래프 한 줄 평(〈보기〉가 그림·그래프·표 이미지를 포함할 때만: 그림·읽기 판이 수능 〈보기〉로 읽히는지, 어색하거나 읽기 어려운 부분. 그림이 없으면 빈칸)

출력: 먼저 마크다운 표(문항|답|판정|이유|결함|그래프 평), 마지막에 같은 내용을 ```json 블록 하나로: [{{"item":"1","answer":"⑤","grade":"수능 같음","reason":"...","defects":["㉴"],"graphNote":"..."}}]. 파일은 쓰지 말고 답으로만 내 줘.
'''
order=list(range(len(ITEMS))); random.seed(20261131); random.shuffle(order)
KEYMD=['# KEY (남은 세 칸 새 기준 재판정, 2026-11-27)\n','| 폴더 | 키 | 칸 | 구분 | 정답 | 그림 | 글자 수 |','|---|---|---|---|---|---|---|']; KEYJ=[]
for pos,idx in enumerate(order,1):
    it=ITEMS[idx]; key=f'C{pos:02d}'; D=HERE+f'/{key}/'; os.makedirs(D,exist_ok=True)
    txt=hdr(it)+f"\n# 지문\n\n## 지문\n{it['passage']}\n\n## 문항\n{it['block']}"
    open(D+'BLIND.md','w',encoding='utf8').write(txt)
    if it['img']: shutil.copy(it['img'],D+'pic-1.png')
    open(D+'CODEX-PROMPT.md','w',encoding='utf8').write(prompt(it))
    pic=bool(it['img'])
    open(D+'run_eval.sh','w').write(f'''#!/bin/zsh
# 평가자 4명 × 2회차(r1·r2) 병렬. 회차·평가자마다 새 임시 폴더(BLIND.md{' + pic-1.png' if pic else ''}만). 판정 모델 codex gpt-6.1-sol.
H=$(cd $(dirname $0) && pwd)
for r in 1 2; do for i in 1 2 3 4; do
  T=$(mktemp -d /tmp/cj{key}r$r$i.XXXX); cp $H/BLIND.md $T/; {'cp $H/pic-1.png $T/' if pic else ':'}
  (cd $T && codex exec {'-i pic-1.png ' if pic else ''}-m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/CODEX-PROMPT.md > $T/log.txt 2>&1; echo "{key} r$r-$i exit=$?"; cp $T/answer.md $H/REPORT-eval-r$r-$i.md) &
done; done
wait
''')
    os.chmod(D+'run_eval.sh',0o755)
    KEYJ.append(dict(folder=key,key=it['key'],cell=it['cell'],kind=it['kind'],answer=it['answer'],hasImage=pic,chars=len(txt)))
    KEYMD.append(f"| {key} | {it['key']} | {it['cell']} | {it['kind']} | {it['answer']} | {'있음' if pic else '없음'} | {len(txt)} |")
open(HERE+'/KEY.md','w',encoding='utf8').write('\n'.join(KEYMD)+'\n'); json.dump(KEYJ,open(HERE+'/KEY.json','w'),ensure_ascii=False,indent=1)
print('\n'.join(KEYMD))
