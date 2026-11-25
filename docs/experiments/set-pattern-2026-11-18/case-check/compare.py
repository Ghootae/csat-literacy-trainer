import json,re,os,sys,statistics as st
H=os.path.dirname(os.path.abspath(__file__)); TAG=os.environ.get('TAG',''); hand=json.load(open(f'{H}/hand-codes.json'))
def load(r,k):
    p=f'{H}/out{TAG}-{r}/{k}.md'
    if not os.path.exists(p): return None
    t=open(p,encoding='utf-8').read()
    ms=re.findall(r'```json\s*(\{.*?\})\s*```',t,re.S)
    if not ms: return None
    try: d=json.loads(ms[-1])
    except Exception: return None
    return {int(c['n']):c for c in d['choices']}
def hand_fs(c): return {'원':False,'보':True}.get(c)  # 섞 -> None
res={}  # r -> k -> {n:bool|None}
for r in ('r1','r2'):
    res[r]={k:load(r,k) for k in hand}
def groups(k): return 'K' if k.startswith('K') else 'G'
out=[]
# 1
out.append('## 표 1. 결정 선지 단위 일치율\n')
out.append('| 회차 | 대상 | 일치 | 비율 |\n|---|---|---|---|')
dec=[(k,int(n),hand_fs(c)) for k,v in hand.items() for n,c in v['codes'].items() if hand_fs(c) is not None]
def rate(r,filt):
    a=b=0
    for k,n,h in dec:
        if not filt(k): continue
        x=res[r][k]
        if not x or n not in x: continue
        b+=1; a+= (bool(x[n]['fact_sensitive'])==h)
    return a,b
for name,f in (('전체',lambda k:True),('기출 K',lambda k:k[0]=='K'),('생성 G',lambda k:k[0]=='G')):
    for r in ('r1','r2'):
        a,b=rate(r,f); out.append(f'| {r} | {name} | {a}/{b} | {a/b*100:.0f}% |' if b else f'| {r} | {name} | - | - |')
same=tot=0
for k,n,h in dec:
    x,y=res['r1'][k],res['r2'][k]
    if x and y and n in x and n in y:
        tot+=1; same+= bool(x[n]['fact_sensitive'])==bool(y[n]['fact_sensitive'])
out.append(f'\n두 회차 같은 답(결정 선지): {same}/{tot}\n')
# 2
def stuck_hand(k):
    v=hand[k]; codes=[hand_fs(c) for c in v['codes'].values()]
    if v['neg']: return codes[0]==False if codes[0] is not None else None
    return sum(1 for c in codes if c is False)>=3
def stuck_codex(r,k):
    v=hand[k]; x=res[r][k]
    if not x: return None
    ns=[int(n) for n in v['codes'] if hand_fs(v['codes'][n]) is not None or True]
    fs=[bool(x[n]['fact_sensitive']) for n in ns if n in x]
    if v['neg']: return fs[0]==False if fs else None
    return sum(1 for f in fs if f is False)>=3
out.append('## 표 2. 문항 걸림 (긍정: 결정 선지 중 false≥3 / 부정: 정답이 false)\n')
out.append('| 회차 | 걸림 일치 문항 | 어긋난 문항 |\n|---|---|---|')
for r in ('r1','r2'):
    for name,f in (('전체',lambda k:True),('K',lambda k:k[0]=='K'),('G',lambda k:k[0]=='G')):
        ok=0;n=0;bad=[]
        for k in hand:
            if not f(k): continue
            h=stuck_hand(k); c=stuck_codex(r,k)
            if h is None or c is None: continue
            n+=1
            if h==c: ok+=1
            else: bad.append(f'{k}(손 {"걸림" if h else "안걸림"}/codex {"걸림" if c else "안걸림"})')
        out.append(f'| {r} {name} | {ok}/{n} | {", ".join(bad) or "-"} |')
out.append('\n문항별 걸림:\n\n| 문항 | 손 | r1 | r2 | 점수 |\n|---|---|---|---|---|')
for k in hand:
    f=lambda b:'-' if b is None else ('걸림' if b else '안걸림')
    out.append(f'| {k} | {f(stuck_hand(k))} | {f(stuck_codex("r1",k))} | {f(stuck_codex("r2",k))} | {hand[k]["score"]} |')
# 3
out.append('\n## 표 3. 걸림·안 걸림 문항 점수 평균\n')
out.append('| 기준 | 걸림 n | 걸림 평균 | 안걸림 n | 안걸림 평균 |\n|---|---|---|---|---|')
def avg(sel): 
    v=[hand[k]['score'] for k in sel]; return (len(v),f'{st.mean(v):.3f}' if v else '-')
for name,fn in (('손 분류',lambda k:stuck_hand(k)),('codex r1',lambda k:stuck_codex('r1',k)),('codex r2',lambda k:stuck_codex('r2',k))):
    a=[k for k in hand if fn(k) is True]; b=[k for k in hand if fn(k) is False]
    out.append(f'| {name} | {avg(a)[0]} | {avg(a)[1]} | {avg(b)[0]} | {avg(b)[1]} |')
# 4
out.append('\n## 표 4. 어긋난 선지와 codex why\n')
out.append('| 문항·선지 | 손 | 회차 | codex fs | codex why |\n|---|---|---|---|---|')
mis={}
for k,n,h in dec:
    for r in ('r1','r2'):
        x=res[r][k]
        if not x or n not in x: continue
        if bool(x[n]['fact_sensitive'])!=h:
            w=str(x[n].get('why','')).replace('|','/').replace('\n',' ')
            out.append(f'| {k}-{n} | {"보" if h else "원"} | {r} | {x[n]["fact_sensitive"]} | {w} |')
            mis[(k)]=mis.get(k,0)+1
out.append('\n어긋남 많은 문항: '+', '.join(f'{k}({v})' for k,v in sorted(mis.items(),key=lambda a:-a[1])[:10]))
miss=[(r,k) for r in res for k,v in res[r].items() if v is None]
out.append(f'\n파싱 실패/누락: {miss or "없음"}')
open(f'{H}/compare-output{TAG}.md','w',encoding='utf-8').write('\n'.join(out)+'\n'); print('\n'.join(out[:40]))
