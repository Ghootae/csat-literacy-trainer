# 4단계 3회차(v6.2) 집계. 실행(저장소 루트): python3 docs/experiments/rule-audit-2026-11-23/step4/aggregate-r3.py [--check]
# 측정값만 적는다. 채택 결론·규칙 후보는 쓰지 않는다(웹이 한다).
import json, re, glob, sys, collections, os
RA='docs/experiments/rule-audit-2026-11-23/'; S=RA+'step4/'; MK=S+'marking-r3/'; V5='docs/experiments/deep-item-v5-2026-11-18/'
KEY=json.load(open(MK+'KEY-r3-marking.json')); J=['J1','J2','J3']
def extract(text):
    dec=json.JSONDecoder(); out=[]; i=0
    while True:
        j=text.find('{',i)
        if j<0: break
        try:
            o,e=dec.raw_decode(text,j)
            if isinstance(o,dict) and 'packet_id' in o: out.append(o); i=e; continue
        except Exception: pass
        i=j+1
    return out
F_OK={'F1':{'참','거짓','판정 불가','애매'},'F2':{'지문만','〈보기〉만','둘 다','둘 없이도 가능','판정 불가','애매'},'F4':{'내용 확인','짝짓기','원리 적용','애매'}}
def val_v2(o):
    if o.get('packet_id') not in KEY or o.get('answer') not in (1,2,3,4,5): return False
    ops=o.get('options')
    if not isinstance(ops,list) or [x.get('n') for x in ops]!=[1,2,3,4,5]: return False
    return all(x.get(f) in F_OK[f] for x in ops for f in F_OK)
PK={}
for p in KEY:
    t=open(MK+f'packets-v1/{p}.md').read(); bs=re.findall(r'^b(\d+)\. (.*)$',t,re.M)
    PK[p]=dict(c=['c'+x for x in re.findall(r'^- c(\d+):',t,re.M)],p=['p'+x for x in re.findall(r'^- p(\d+):',t,re.M)],b=['b'+n for n,_ in bs],bogi='\n'.join(s for _,s in bs))
OK1={'서술자 풀이','인물·학자의 말','표지 아님','애매'}; OK4a={'예','아니오','애매'}
def val_v1(o):
    p=o.get('packet_id')
    if p not in KEY or o.get('answer') not in (1,2,3,4,5): return False
    P=PK[p]; k1=o.get('K1'); k2=o.get('K2'); k3=o.get('K3'); k4=o.get('K4a')
    if not isinstance(k1,dict) or sorted(k1)!=sorted(P['c']) or any(v not in OK1 for v in k1.values()): return False
    if not isinstance(k2,dict) or sorted(k2)!=['1','2','3','4','5'] or any(not isinstance(v,list) for v in k2.values()): return False
    if not isinstance(k3,dict) or sorted(k3)!=sorted(P['b']): return False
    if not isinstance(k4,dict) or sorted(k4)!=sorted(P['p']) or any(v not in OK4a for v in k4.values()): return False
    need=[x for x,v in k4.items() if v=='예']; k4b=o.get('K4b')
    return isinstance(k4b,dict) and sorted(k4b)==sorted(need)
def load(d,valid):
    data={j:{} for j in J}
    for j in J:
        for fn in sorted(glob.glob(MK+f'{d}/{j}/raw*.txt')):
            for o in extract(open(fn).read()):
                if valid(o): data[j][o['packet_id']]=o
    return data
D2=load('judges-v2',val_v2); D1=load('judges-v1',val_v1)
if '--check' in sys.argv:
    for n,D in (('v2',D2),('v1',D1)):
        for j in J: print(n,j,len(D[j]),'/4 없음:',[p for p in KEY if p not in D[j]])
    sys.exit()
def maj(vals):
    c=collections.Counter(vals).most_common(1)[0]; return c[0] if c[1]>=2 else '갈림'
OUT=[]; W=OUT.append
SC={'수능 같음':2,'중':1,'수능 아님':0}
def read_blind(keyf,pat):
    bk={}
    for l in open(keyf):
        m=re.match(r'\| (\S) \| 지문 (\d) \| (.+?) \| (.) \|',l)
        if m: bk[m.group(1)]=(int(m.group(2)),m.group(3),'①②③④⑤'.index(m.group(4))+1)
    ev=collections.defaultdict(list)
    for i in range(1,5):
        t=open(pat%i).read(); jj=json.loads(re.findall(r'```json\n(.*?)```',t,re.S)[-1])
        for r in jj: ev[r['item']].append((int('①②③④⑤'.index(r['answer'])+1) if r['answer'] in '①②③④⑤' else 0,SC[r['grade']],r.get('defects',[]),r.get('reason','')))
    return bk,ev
def ver_of(src): return 'v5' if src.startswith('v5') else 'v6.2' if src.startswith('v6.2') else '기출'
bk,ev=read_blind(S+'blind-r3/KEY-r3.md',S+'blind-r3/REPORT-r3-eval%d.md')
G={}
W('## a. 블라인드 등급 (평가자 4회, 수능 같음 2 / 중 1 / 수능 아님 0) — 같은 회차에 v5·v6.2·기출\n')
W('| 문항 | 지문 | 출처 | 정답 | 평가자 답 4회 | 등급 4회 | 평균 | 정답 일치 | 결함 표시 |\n|---|---|---|---|---|---|---|---|---|')
for k,(ps,src,a) in sorted(bk.items(),key=lambda x:(x[1][0],ver_of(x[1][1]),x[1][1])):
    r=ev[k]; avg=sum(x[1] for x in r)/4; G[k]=dict(p=ps,src=src,v=ver_of(src),avg=avg,grades=[x[1] for x in r],n2=[x[1] for x in r].count(2),n0=[x[1] for x in r].count(0))
    d=collections.Counter(c for x in r for c in x[2])
    W(f"| {k} | {ps} | {src} | {'①②③④⑤'[a-1]} | {''.join('①②③④⑤'[x[0]-1] if x[0] else '-' for x in r)} | {' '.join(str(x[1]) for x in r)} | {avg:.2f} | {sum(x[0]==a for x in r)}/4 | {' '.join(f'{c}×{n}' for c,n in sorted(d.items())) or '-'} |")
def mean(xs): return sum(xs)/len(xs) if xs else float('nan')
def grp(v,p=None): return [g['avg'] for g in G.values() if g['v']==v and (p is None or g['p']==p)]
W('\n| 묶음 | v5 평균 | v6.2 평균 | 차이(v6.2−v5) |\n|---|---|---|---|')
for name,p in [('전체',None),('지문 1 공시',1),('지문 2 의미',2)]: W(f"| {name} | {mean(grp('v5',p)):.3f} (n={len(grp('v5',p))}) | {mean(grp('v6.2',p)):.3f} (n={len(grp('v6.2',p))}) | {mean(grp('v6.2',p))-mean(grp('v5',p)):+.3f} |")
W('\n기출: '+', '.join(f"{g['src']} {g['avg']:.2f}(등급 {g['grades']})" for g in G.values() if g['v']=='기출'))
W('\n## b. PROPOSAL-v62 4절 기준 ①②③④ 값 (결론은 웹이 쓴다)\n')
v61=[g for g in G.values() if g['v']=='v6.2']
W('- ① v6.2 문항별 \'수능 아님\' 횟수: '+', '.join(f"{g['src'].split(' (')[0]}[지문{g['p']}]={g['n0']}회" for g in v61)+f" → 2회 이상 받은 문항 {sum(g['n0']>=2 for g in v61)}개")
W(f"- ② v6.2 평균 − 같은 회차 v5 평균 = {mean(grp('v6.2'))-mean(grp('v5')):+.3f} (전체), 지문 1 {mean(grp('v6.2',1))-mean(grp('v5',1)):+.3f}, 지문 2 {mean(grp('v6.2',2))-mean(grp('v5',2)):+.3f}")
W('- ③ v6.2 문항별 \'수능 같음\' 횟수: '+', '.join(f"{g['src'].split(' (')[0]}[지문{g['p']}]={g['n2']}회" for g in v61)+f" → 3회 이상 문항 {sum(g['n2']>=3 for g in v61)}개")
dfct=[]
for d in sorted(glob.glob(V5+'out-step4-v62/*/repair/eval.json')): dfct.append((d.split('/')[-3],json.load(open(d))['before']['V1'].get('defect')))
W('- ④ 재생성 뒤에도 결함이 남은 v6.2 문항: '+', '.join(f'{n}: 결함={x}' for n,x in dfct)+' (재생성 없음)')
# c. v5 4단계 대 이번
b0,e0=read_blind(S+'blind/KEY-step4.md',S+'blind/REPORT-step4-eval%d.md')
W('\n## c. v5 4문항: 4단계 등급 대 이번 등급 (같은 문항, 평가자 흔들림)\n')
W('| v5 문항 | 4단계 등급 4회 (평균) | 이번 등급 4회 (평균) | 평균 차 |\n|---|---|---|---|')
def srckey(s): return s.split(' (')[0]+'|'+re.search(r'\((.*?)\)',s).group(1)
prev={}
for k,(ps,src,a) in b0.items():
    if src.startswith('v5'): prev[(ps,src.split(' (')[0])]=[x[1] for x in e0[k]]
dsum=[]
for k,g in G.items():
    if g['v']!='v5': continue
    pg=prev[(g['p'],g['src'].split(' (')[0])]; d=mean(g['grades'])-mean(pg); dsum.append(d)
    W(f"| 지문{g['p']} {g['src']} | {pg} ({mean(pg):.2f}) | {g['grades']} ({g['avg']:.2f}) | {d:+.2f} |")
W(f"\nv5 4문항 평균: 4단계 {mean([mean(v) for v in prev.values()]):.3f} → 이번 {mean(grp('v5')):.3f}")
# d. strategies
W('\n## d. v6.2 선택 전략\n')
def nums(t):
    r=[ '①②③④⑤'.index(c)+1 for c in re.findall(r'[①-⑤]',t)]+[int(m) for m in re.findall(r'([1-5])\s*번',t)]+[int(m) for m in re.findall(r'(?:선지|정답|rival|경쟁)\s*([1-5])',t)]
    return set(r)
for p,k in KEY.items():
    path=V5+k['path'].replace('deep-item-v5-2026-11-18/','')
    it=json.load(open(path))['items'][0]; base=path.rsplit('/leakfix',1)[0]
    ev_=json.load(open(base+'/repair/eval.json'))['before']['V1']
    depth=[s for s in it['strategies'] if s in {'S1','S2','S3','S4','S8','S10','S11','S12','S13','S14','S15','S16','S17','S18'}]
    on={s:(it['answer'] in nums(it['strategyUse'].get(s,'')) or it['rival'] in nums(it['strategyUse'].get(s,''))) for s in depth}
    chk=[c for c in json.load(open(base+'/checks.json'))] if os.path.exists(base+'/checks.json') else []
    W(f"- {k['name']}: 정답 {it['answer']}, rival {it.get('rival')}; strategies {it['strategies']}; 깊이 전략 {depth or '없음'}, 정답·rival에 씀 {on}; strategyUse {json.dumps(it['strategyUse'],ensure_ascii=False)}; 전략 경고(e3) {ev_.get('strategyWarnings') or '없음'}; 기계 점검(checks.json) 전략 항목 {[c for c in (chk if isinstance(chk,list) else []) if '전략' in str(c)] or '없음'}")
asm=open(V5+'out-step4-v62/disclosure-insider-A/3-assemble.md',encoding='utf8').read()
hits=[l.strip()[:300] for l in asm.split('\n') if 'S13' in l]
W('\n공시 A 3-assemble.md에서 S13이 나온 줄(최대 6줄):\n'); 
for l in hits[:6]: W('- '+l)
W(f"\n(\"S13 안 씀\" 문구 있음: {'예' if 'S13 안 씀' in asm else '아니오'})")
# e. 표시
ok=[p for p in KEY if all(p in D2[j] for j in J)]; ok1=[p for p in KEY if all(p in D1[j] for j in J)]
def item_stats(p):
    ch={}
    for n in range(1,6): ch[n]={f:maj([next(x for x in D2[j][p]['options'] if x['n']==n)[f] for j in J]) for f in ('F1','F2','F4')}
    jonly=[n for n in ch if ch[n]['F2']=='지문만']; rec=[n for n in jonly if ch[n]['F4']=='내용 확인']
    m2=[n for n in ch if ch[n]['F2']=='〈보기〉만']; m3=[n for n in ch if ch[n]['F1']=='참' and ch[n]['F4']=='내용 확인']
    return dict(jonly=jonly,rec=rec,M2=bool(m2),M3=bool(m3),M4=len(rec)>=2)
def listmaj(p,key,cell,D):
    c=collections.Counter(x for j in J for x in set(D[j][p][cell][key])); return sorted(x for x,k in c.items() if k>=2)
def rs(p):
    k1=[maj([D1[j][p]['K1'][c] for j in J]) for c in PK[p]['c']]
    lit=sorted({w for n in range(1,6) for w in listmaj(p,str(n),'K2',D1) if w in PK[p]['bogi']})
    blank=0
    for b in PK[p]['b']:
        vals=[D1[j][p]['K3'][b] for j in J]
        if sum(v=='소개' for v in vals)>=2: continue
        if not sorted(x for x,k in collections.Counter(x for v in vals for x in (set(v) if isinstance(v,list) else {v})).items() if k>=2): blank+=1
    yes=[x for x in PK[p]['p'] if maj([D1[j][p]['K4a'][x] for j in J])=='예']
    k4b=[maj([D1[j][p].get('K4b',{}).get(x) for j in J]) for x in yes]
    return dict(R1='아니오' if any(v=='서술자 풀이' for v in k1) else '예',R2='아니오' if lit else '예',R3='아니오' if blank else '예',S12='해당 없음' if not yes else ('예' if any(re.fullmatch(r'b\d+',str(v)) for v in k4b) else '아니오'))
ST={p:item_stats(p) for p in ok}; RSV={p:rs(p) for p in ok1}
W('\n## e. 표시 판정 (판정자 셋 다수값, v6.2 4문항)\n')
W(f"- 유효: 선지 표시(v2) {len(ok)}/4, 〈보기〉 표시(v1) {len(ok1)}/4. 형식 실패 {4-len(ok)+4-len(ok1)}건.\n")
W('| 문항 | 이름 | 지문만 선지 | 그중 내용 확인 | M2 | M3 | M4 | R1 | R2 | R3 | S12 |\n|---|---|---|---|---|---|---|---|---|---|---|')
for p in KEY:
    if p not in ST: W(f"| {p} | {KEY[p]['name']} | (형식 실패) |"); continue
    s=ST[p]; r=RSV.get(p,{})
    W(f"| {p} | {KEY[p]['name']} | {len(s['jonly'])} ({','.join(map(str,s['jonly'])) or '-'}) | {len(s['rec'])} | {'위반' if s['M2'] else '-'} | {'위반' if s['M3'] else '-'} | {'위반' if s['M4'] else '-'} | {r.get('R1','-')} | {r.get('R2','-')} | {r.get('R3','-')} | {r.get('S12','-')} |")
n=len(ok); jo=sum(len(ST[p]['jonly']) for p in ok); rc=sum(len(ST[p]['rec']) for p in ok)
W(f"\nv6.2 4문항 합: 문항당 지문만 선지 {jo/max(1,n):.2f}, 지문만∧내용 확인 {rc/max(1,n):.2f}, 내용 확인 비율 {rc}/{jo}; M2 위반 {sum(ST[p]['M2'] for p in ok)}, M3 위반 {sum(ST[p]['M3'] for p in ok)}, M4 위반 {sum(ST[p]['M4'] for p in ok)} 문항")
for f in ('R1','R2','R3','S12'): pass
W('R 준수(지킴/적용): '+', '.join(f"{f} {sum(r[f]=='예' for r in RSV.values())}/{sum(r[f] in ('예','아니오') for r in RSV.values())}" for f in ('R1','R2','R3','S12')))
W('\n4단계 값(같은 방법, aggregate-out.md에서 옮김):\n')
for l in open(S+'aggregate-out.md',encoding='utf8'):
    if re.match(r'\| (v5 생성|v6 생성|확인용 기출|\(참고\))',l): W(l.rstrip())

# ---------- f. 〈보기〉 안 봐도 풀리는 선지 수: 판정자 표시(F2 '지문만') / 평가자 ㉯ 표시 횟수
def jonly_by(mkdir,keyname):
    K=json.load(open(mkdir+keyname)); out={}
    for p,k in K.items():
        per=[]
        for j in J:
            fs=sorted(glob.glob(mkdir+f'judges-v2/{j}/raw*.txt')); got=None
            for fn in fs:
                for o in extract(open(fn).read()):
                    if o.get('packet_id')==p and isinstance(o.get('options'),list) and [x.get('n') for x in o['options']]==[1,2,3,4,5]: got=o
            per.append(got)
        if any(x is None for x in per): continue
        c=0
        for n in range(1,6):
            if maj([next(x for x in g['options'] if x['n']==n)['F2'] for g in per])=='지문만': c+=1
        out[(k['version'],k['name'])]=c
    return out
def blind_def(keyf,pat):
    bk_,ev_=read_blind(keyf,pat); out={}
    for k,(ps,src,a) in bk_.items():
        cell=('공시' if ps==1 else '의미')+' '+('A' if ' A-V1' in src else 'B' if ' B-V1' in src else '기출')
        out[(src.split(' ')[0],cell)]=sum('㉯' in x[2] for x in ev_[k])
    return out
J1=jonly_by(S+'marking/','KEY-step4-marking.json'); J2=jonly_by(S+'marking-r2/','KEY-r2-marking.json'); J3=jonly_by(MK,'KEY-r3-marking.json')
B1=blind_def(S+'blind/KEY-step4.md',S+'blind/REPORT-step4-eval%d.md'); B2=blind_def(S+'blind-r2/KEY-r2.md',S+'blind-r2/REPORT-r2-eval%d.md'); B3=blind_def(S+'blind-r3/KEY-r3.md',S+'blind-r3/REPORT-r3-eval%d.md')
W('\n## f. 〈보기〉 안 봐도 풀리는 선지 수 — 판정자 표시(F2 \'지문만\' 선지 수, 다수값) / 평가자 ㉯ 표시(4회 중 몇 회)\n')
W('| 칸 | v5 (4단계) | v6 (1회차) | v6.1 (2회차) | v6.2 (이번) |\n|---|---|---|---|---|')
tot={'v5':[0,0,0],'v6':[0,0,0],'v6.1':[0,0,0],'v6.2':[0,0,0]}
for cell in ['공시 A','공시 B','의미 A','의미 B']:
    row=[]
    for ver,Jd,Bd in (('v5',J1,B1),('v6',J1,B1),('v6.1',J2,B2),('v6.2',J3,B3)):
        jv=Jd.get((ver,cell+'-V1')); bv=Bd.get((ver,cell))
        row.append(f"{jv if jv is not None else '-'} / ㉯ {bv if bv is not None else '-'}회")
        if jv is not None: tot[ver][0]+=jv; tot[ver][1]+=bv or 0; tot[ver][2]+=1
    W(f"| {cell} | "+' | '.join(row)+' |')
W('| 합계(문항당 평균) | '+' | '.join(f"{tot[v][0]/max(1,tot[v][2]):.2f} / ㉯ {tot[v][1]/max(1,tot[v][2]):.2f}회" for v in ('v5','v6','v6.1','v6.2'))+' |')
# ---------- g. 3-assemble.md의 GN1·쉬움 자리 기록
W('\n## g. v6.2 3-assemble.md: GN1 언급과 \'쉬움\' 선지 기록\n')
for p,k in KEY.items():
    base=V5+k['path'].replace('deep-item-v5-2026-11-18/','').rsplit('/leakfix',1)[0]
    t=open(base+'/3-assemble.md',encoding='utf8').read()
    gl=[l.strip()[:260] for l in t.split('\n') if 'GN1' in l or '쉬움' in l]
    it=json.load(open(base+'/leakfix/items-leakfix.json'))['items'][0]
    W(f"- {k['name']}: GN1 언급 {sum('GN1' in l for l in t.split(chr(10)))}줄, '쉬움' 언급 {sum('쉬움' in l for l in t.split(chr(10)))}줄; roles {it.get('roles')}")
    for l in gl[:5]: W('  - '+l)

open(S+'aggregate-r3-out.md','w').write('\n'.join(OUT)+'\n'); print('\n'.join(OUT))
