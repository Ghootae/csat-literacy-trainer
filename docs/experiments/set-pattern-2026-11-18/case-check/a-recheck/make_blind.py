# 생성 A형 재확인 + 단계 수 측정 (2026-11-27). lure-check/make_blind.py 형식을 따른다.
# 사용(저장소 루트): python3 docs/experiments/set-pattern-2026-11-18/case-check/a-recheck/make_blind.py
import json, os, re, random, shutil
HERE=os.path.dirname(os.path.abspath(__file__)); CC=os.path.abspath(HERE+'/..')+'/'; SP=os.path.abspath(CC+'..')+'/'
V=os.path.abspath(SP+'../deep-item-v5-2026-11-18')+'/'; LC=CC+'lure-check/'
CIRC='①②③④⑤'
LKEY={k['key']:k for k in json.load(open(LC+'KEY.json'))}
def lc_blind(name): return open(LC+LKEY[name]['folder']+'/BLIND.md',encoding='utf8').read()
lc0=lc_blind('N-K21 과징금'); HDR=lc0.split('\n# 지문\n',1)[0].replace('(2026-11-27)','(2026-11-27 재확인)')+'\n'
assert '재확인' in HDR
def build(p,b): return HDR+f'\n# 지문\n\n## 지문\n{p}\n\n## 문항\n{b}'
def block(stem,bogi,ch):
    q='\n'.join('> '+l if l.strip() else '>' for l in bogi.split('\n'))
    return f"**[문항 1]** {stem}\n\n> 〈보기〉\n>\n{q}\n\n"+'  \n'.join(ch)+'  \n\n---\n'
def gen(path,ver,pid):
    it=[x for x in json.load(open(V+path))['items'] if x['version']==ver][0]
    return build(open(V+f'passages/{pid}/passage.txt').read().strip(),block(it['stem'],it['bogi'],it['choices'])),CIRC[it['answer']-1]
ITEMS=[]  # (key, group, text, answer)
for key,path,ver,pid in [('G-cy-cell5','out-cell5/gen32-T3-2-A','V1','gen32-T3-2'),('G-cy-lever5','out-case-lever5-old/gen32-T3-2-A','V1','gen32-T3-2'),
  ('G-gs-old','out-cell1-v62-r2/gongsun-long-later-mohists-A','V1','gongsun-long-later-mohists'),('G-mo-pair3','out-case-pair3/gen32-o4-T4-1-A','V2','gen32-o4-T4-1'),
  ('G-mo-o4','out-o4/gen32-o4-T4-1-A','V2','gen32-o4-T4-1'),('G-mo-o4regen','out-o4-regen/gen32-o4-T4-1-A','V2','gen32-o4-T4-1')]:
    t,a=gen(path+'/leakfix/items-leakfix.json',ver,pid); ITEMS.append((key,'생성A',t,a))
# K-top-gongsun12
g=open(SP+'calib-judge/gongsun-12/BLIND.md',encoding='utf8').read()
gp=re.search(r'## 지문\n(.*?)\n\n## 문항\n',g,re.S).group(1).strip(); gb=g.split('\n## 문항\n',1)[1]
ITEMS.append(('K-top-gongsun12','기출상위',build(gp,gb),'④'))
# K-top-gongsi12 (make_blind13.gold 방식)
t=open(V+'blind/BLIND-cell5.md',encoding='utf8').read()
p=re.search(r'# 지문 1:.*?\n\n## 지문\n(.*?)\n\n## 문항',t,re.S).group(1).strip()
b=re.search(r'\*\*\[문항 가\]\*\*(.*?)\n\*\*\[문항 나\]',t,re.S).group(1).rstrip()
ITEMS.append(('K-top-gongsi12','기출상위',build(p,'**[문항 1]**'+b+'  \n\n---\n'),'⑤'))
for key,name,a,grp in [('K-top-K37 건축','N-K37 건축','①','기출상위'),('K-mid-K21 과징금','N-K21 과징금','③','기출보통'),('K-mid-K07 상계','P-K07 상계','③','기출보통'),('K-mid-K41 집합건물','N-K41 집합건물','④','기출보통')]:
    assert LKEY[name]['answer']==a
    ITEMS.append((key,grp,lc_blind(name).replace('(2026-11-27)','(2026-11-27 재확인)'),a))
assert len(ITEMS)==12
order=list(range(12)); random.seed(20261128); random.shuffle(order)
PROMPT=open(LC+'L01/CODEX-PROMPT.md',encoding='utf8').read()
RUN=open(LC+'L01/run_eval.sh',encoding='utf8').read()
KEYMD=['# KEY (생성 A형 재확인, 2026-11-27)\n','| 폴더 | 키 | 정답 | 구분 | 글자 수 |','|---|---|---|---|---|']; KEYJ=[]
for pos,idx in enumerate(order,1):
    key,grp,text,ans=ITEMS[idx]; f=f'R{pos:02d}'; D=HERE+f'/{f}/'; os.makedirs(D,exist_ok=True)
    open(D+'BLIND.md','w',encoding='utf8').write(text); open(D+'CODEX-PROMPT.md','w',encoding='utf8').write(PROMPT)
    open(D+'run_eval.sh','w').write(RUN.replace('lureL01','recheck'+f).replace('L01 r$r-$i',f+' r$r-$i')); os.chmod(D+'run_eval.sh',0o755)
    KEYJ.append({'folder':f,'key':key,'answer':ans,'group':grp,'chars':len(text)}); KEYMD.append(f'| {f} | {key} | {ans} | {grp} | {len(text)} |')
open(HERE+'/KEY.md','w',encoding='utf8').write('\n'.join(KEYMD)+'\n'); json.dump(KEYJ,open(HERE+'/KEY.json','w'),ensure_ascii=False,indent=1)
print('\n'.join(KEYMD))
