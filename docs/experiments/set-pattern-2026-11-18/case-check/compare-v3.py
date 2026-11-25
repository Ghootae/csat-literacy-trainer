# v3(함정 위치) 비교: 결정 선지의 trap "지문"=손 '원', "보기"=손 '보'. 섞임·없음=null(세지 않음). 표 1~4 + 맨 위 세 열 비교(v1fixed·v2·v3).
import json,re,os,statistics as st
H=os.path.dirname(os.path.abspath(__file__)); hand=json.load(open(f'{H}/hand-codes.json'))
def load(tag,r,k):
    p=f'{H}/out{tag}-{r}/{k}.md'
    if not os.path.exists(p): return None
    ms=re.findall(r'```json\s*(\{.*?\})\s*```',open(p,encoding='utf-8').read(),re.S)
    if not ms: return None
    try: d=json.loads(ms[-1])
    except Exception: return None
    return {int(c['n']):c for c in d['choices']}
hand_v=lambda c:{'원':'원','보':'보'}.get(c)
def cx(tag,x,n):  # codex 코드: 원/보/None
    if tag=='-v3':
        t=x[n].get('trap') if x and n in x else None
        return {'지문':'원','보기':'보'}.get(t)
    if not x or n not in x: return None
    fs=x[n].get('fact_sensitive'); return '보' if fs is True else '원' if fs is False else None
def stuck_hand(k):
    v=hand[k]; codes=[hand_v(c) for c in v['codes'].values()]
    if v['neg']: return None if codes[0] is None else codes[0]=='원'
    return sum(c=='원' for c in codes)>=3
def stuck_cx(tag,r,k,res):
    v=hand[k]; x=res[tag][r][k]
    if x is None: return None
    ns=[int(n) for n in v['codes']]
    cs=[cx(tag,x,n) for n in ns]
    if v['neg']: return cs[0]=='원'
    return sum(c=='원' for c in cs)>=3
TAGS=['-v1fixed','-v2','-v3']
res={t:{r:{k:load(t,r,k) for k in hand} for r in ('r1','r2')} for t in TAGS}
dec=[(k,int(n),hand_v(c)) for k,v in hand.items() for n,c in v['codes'].items() if hand_v(c)]
def metrics(tag):
    m={}
    for r in ('r1','r2'):
        a=b=nul=0
        for k,n,h in dec:
            x=res[tag][r][k]; c=cx(tag,x,n) if x else None
            if c is None: nul+=1; continue
            b+=1; a+=(c==h)
        m[f'agree_{r}']=f'{a}/{b} ({a/b*100:.0f}%)' + (f', null {nul}' if nul else '')
        ks=[k for k in hand if k[0]=='K' and stuck_hand(k) is not None]
        m[f'Kstuck_{r}']=','.join(k for k in hand if k[0]=='K' and stuck_cx(tag,r,k,res)) or '없음'
        gk=[k for k in hand if k[0]=='G' and stuck_hand(k) is not None and stuck_cx(tag,r,k,res) is not None]
        m[f'Ggen_{r}']=f"{sum(stuck_hand(k)==stuck_cx(tag,r,k,res) for k in gk)}/{len(gk)}"
        for g in ('걸림','안걸림'):
            want=(g=='걸림'); v=[hand[k]['score'] for k in hand if stuck_cx(tag,r,k,res) is want]
            m[f'{g}_{r}']=f'{st.mean(v):.3f}(n={len(v)})' if v else '-'
    same=tot=0
    for k,n,h in dec:
        x,y=res[tag]['r1'][k],res[tag]['r2'][k]
        if x and y:
            a,b=cx(tag,x,n),cx(tag,y,n)
            if a is not None and b is not None: tot+=1; same+=(a==b)
    m['same']=f'{same}/{tot}'
    return m
M={t:metrics(t) for t in TAGS}
out=['# v1fixed · v2 · v3 비교 (고친 풀이지 sheets-v2, 31문항 × 2회)\n','| 항목 | v1fixed(v1 문구) | v2(장면 고정 문장) | v3(함정 위치) |','|---|---|---|---|']
rows=[('결정 선지 일치 r1','agree_r1'),('결정 선지 일치 r2','agree_r2'),('기출 걸림 r1','Kstuck_r1'),('기출 걸림 r2','Kstuck_r2'),('생성 걸림 일치(24) r1','Ggen_r1'),('생성 걸림 일치(24) r2','Ggen_r2'),('두 회차 같은 답(결정 선지, null 제외)','same'),('걸린 문항 점수 r1','걸림_r1'),('안 걸린 문항 점수 r1','안걸림_r1'),('걸린 문항 점수 r2','걸림_r2'),('안 걸린 문항 점수 r2','안걸림_r2')]
for lab,key in rows: out.append(f'| {lab} | '+' | '.join(str(M[t][key]) for t in TAGS)+' |')
out+=['','손 분류 점수: 걸림 0.938(n=14) / 안걸림 1.613(n=16). 통과 조건(두 회차 모두): 기출 걸림 K2·K4뿐 + 생성 걸림 일치 20/24 이상.','']
f=lambda b:'-' if b is None else ('걸림' if b else '안걸림')
out.append('### 도덕 G19·G20·G21, 고체 G13·G14 걸림 여부\n\n| 문항 | 손 | v1fixed r1/r2 | v2 r1/r2 | v3 r1/r2 |\n|---|---|---|---|---|')
for k in ('G19','G20','G21','G13','G14'):
    out.append(f'| {k} | {f(stuck_hand(k))} | '+' | '.join(f'{f(stuck_cx(t,"r1",k,res))}/{f(stuck_cx(t,"r2",k,res))}' for t in TAGS)+' |')
T='-v3'
out+=['','## 표 1. v3 결정 선지 단위 일치율\n','| 회차 | 대상 | 일치 | 비율 |','|---|---|---|---|']
for name,fl in (('전체',lambda k:True),('기출 K',lambda k:k[0]=='K'),('생성 G',lambda k:k[0]=='G')):
    for r in ('r1','r2'):
        a=b=0
        for k,n,h in dec:
            if not fl(k): continue
            c=cx(T,res[T][r][k],n) if res[T][r][k] else None
            if c is None: continue
            b+=1; a+=(c==h)
        out.append(f'| {r} | {name} | {a}/{b} | {a/b*100:.0f}% |')
out+=['','## 표 2. v3 문항 걸림 (부정: 정답 trap=지문 / 긍정: 오답 중 trap=지문 ≥3)\n','| 회차 | 걸림 일치 | 어긋난 문항 |','|---|---|---|']
for r in ('r1','r2'):
    for name,fl in (('전체',lambda k:True),('K',lambda k:k[0]=='K'),('G',lambda k:k[0]=='G')):
        ok=n=0;bad=[]
        for k in hand:
            if not fl(k): continue
            h=stuck_hand(k); c=stuck_cx(T,r,k,res)
            if h is None or c is None: continue
            n+=1; ok+=(h==c)
            if h!=c: bad.append(f'{k}(손 {f(h)}/codex {f(c)})')
        out.append(f'| {r} {name} | {ok}/{n} | {", ".join(bad) or "-"} |')
out+=['','## 표 3. v3 걸림·안 걸림 문항 점수 평균\n','| 기준 | 걸림 n | 걸림 평균 | 안걸림 n | 안걸림 평균 |','|---|---|---|---|---|']
for name,fn in (('손 분류',lambda k:stuck_hand(k)),('v3 r1',lambda k:stuck_cx(T,'r1',k,res)),('v3 r2',lambda k:stuck_cx(T,'r2',k,res))):
    a=[hand[k]['score'] for k in hand if fn(k) is True]; b=[hand[k]['score'] for k in hand if fn(k) is False]
    out.append(f"| {name} | {len(a)} | {st.mean(a):.3f} | {len(b)} | {st.mean(b):.3f} |")
out+=['','## 표 4. v3에서 어긋난 선지와 codex why\n','| 문항·선지 | 손 | 회차 | codex trap | codex why |','|---|---|---|---|---|']
mis={}
for k,n,h in dec:
    for r in ('r1','r2'):
        x=res[T][r][k]
        if not x or n not in x: continue
        c=cx(T,x,n)
        if c!=h:
            w=str(x[n].get('why','')).replace('|','/').replace('\n',' ')
            out.append(f'| {k}-{n} | {h} | {r} | {x[n].get("trap")} | {w} |'); mis[k]=mis.get(k,0)+1
out.append('\n어긋남 많은 문항: '+', '.join(f'{k}({v})' for k,v in sorted(mis.items(),key=lambda a:-a[1])[:10]))
miss=[(t,r,k) for t in TAGS for r in res[t] for k,v in res[t][r].items() if v is None]
out.append(f'\n파싱 실패/누락: {miss or "없음"}')
open(f'{H}/compare-output-v3.md','w',encoding='utf-8').write('\n'.join(out)+'\n'); print('\n'.join(out[:32]))
