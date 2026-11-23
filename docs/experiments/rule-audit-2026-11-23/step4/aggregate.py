# 4단계 집계. 실행(저장소 루트): python3 docs/experiments/rule-audit-2026-11-23/step4/aggregate.py [--check]
# 측정값만 적는다. 채택·e4·순서표 결론과 규칙 후보는 쓰지 않는다(웹이 한다).
import json, re, glob, csv, sys, collections, itertools, os
RA='docs/experiments/rule-audit-2026-11-23/'; S=RA+'step4/'; MK=S+'marking/'; V5='docs/experiments/deep-item-v5-2026-11-18/'
KEY=json.load(open(MK+'KEY-step4-marking.json')); J=['J1','J2','J3']
# ---------- 판정자 원문 읽기
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
        for j in J: print(n,j,len(D[j]),'/15 없음:',[p for p in KEY if p not in D[j]])
    sys.exit()
def maj(vals):
    c=collections.Counter(vals).most_common(1)[0]; return c[0] if c[1]>=2 else '갈림'
OUT=[]; W=OUT.append
# ---------- a. 블라인드 등급
bk={}
for l in open(S+'blind/KEY-step4.md'):
    m=re.match(r'\| (\S) \| 지문 (\d) \| (.+?) \| (.) \|',l)
    if m: bk[m.group(1)]=(int(m.group(2)),m.group(3),'①②③④⑤'.index(m.group(4))+1)
SC={'수능 같음':2,'중':1,'수능 아님':0}; ev=collections.defaultdict(list)
for i in range(1,5):
    t=open(S+f'blind/REPORT-step4-eval{i}.md').read(); jj=json.loads(re.findall(r'```json\n(.*?)```',t,re.S)[-1])
    for r in jj: ev[r['item']].append((int('①②③④⑤'.index(r['answer'])+1) if r['answer'] in '①②③④⑤' else 0,SC[r['grade']],r.get('defects',[]),r.get('reason','')))
def ver_of(src): return 'v5' if src.startswith('v5') else 'v6' if src.startswith('v6') else '기출'
G={}
W('## a. 블라인드 등급 (평가자 4회, 수능 같음 2 / 중 1 / 수능 아님 0)\n')
W('| 문항 | 지문 | 출처 | 정답 | 평가자 답 4회 | 등급 4회 | 평균 | 정답 일치 | 결함 표시 |\n|---|---|---|---|---|---|---|---|---|')
for k,(ps,src,a) in bk.items():
    r=ev[k]; avg=sum(x[1] for x in r)/4; G[k]=dict(p=ps,src=src,v=ver_of(src),avg=avg,grades=[x[1] for x in r])
    d=collections.Counter(c for x in r for c in x[2])
    W(f"| {k} | {ps} | {src} | {'①②③④⑤'[a-1]} | {''.join('①②③④⑤'[x[0]-1] if x[0] else '-' for x in r)} | {' '.join(str(x[1]) for x in r)} | {avg:.2f} | {sum(x[0]==a for x in r)}/4 | {' '.join(f'{c}×{n}' for c,n in sorted(d.items())) or '-'} |")
def mean(xs): return sum(xs)/len(xs) if xs else float('nan')
def grp(v,p=None): return [g['avg'] for g in G.values() if g['v']==v and (p is None or g['p']==p)]
W('\n| 묶음 | v5 평균 | v6 평균 | 차이(v6−v5) |\n|---|---|---|---|')
for name,p in [('전체',None),('지문 1 공시',1),('지문 2 의미',2)]: W(f"| {name} | {mean(grp('v5',p)):.3f} (n={len(grp('v5',p))}) | {mean(grp('v6',p)):.3f} (n={len(grp('v6',p))}) | {mean(grp('v6',p))-mean(grp('v5',p)):+.3f} |")
W('\n기출: '+', '.join(f"{g['src']} {g['avg']:.2f}(등급 {g['grades']})" for g in G.values() if g['v']=='기출'))
W('\n### b. PLAN 4-1 판정 ①②③ 값 (결론은 웹이 쓴다)\n')
v6=[(k,g) for k,g in G.items() if g['v']=='v6']
W('- ① v6 4문항 중 \'수능 아님\'(0)을 받은 횟수: '+', '.join(f"{g['src']}={g['grades'].count(0)}회" for k,g in v6))
W(f"- ② v6 평균 − v5 평균 = {mean(grp('v6'))-mean(grp('v5')):+.3f} (전체), 지문 1 {mean(grp('v6',1))-mean(grp('v5',1)):+.3f}, 지문 2 {mean(grp('v6',2))-mean(grp('v5',2)):+.3f}")
dfct=[]
for d in sorted(glob.glob(V5+'out-step4-v6/*/repair/eval.json')):
    dfct.append((d.split('/')[-3],json.load(open(d))['before']['V1'].get('defect')))
W('- ③ 재생성 뒤에도 결함이 남은 v6 문항: '+', '.join(f'{n}: 결함={x}' for n,x in dfct)+' (재생성 없음)')
# ---------- c. 표시 판정
def item_stats(p):
    ch={}
    for n in range(1,6):
        ch[n]={f:maj([next(x for x in D2[j][p]['options'] if x['n']==n)[f] for j in J]) for f in ('F1','F2','F4')}
    jonly=[n for n in ch if ch[n]['F2']=='지문만']; rec=[n for n in jonly if ch[n]['F4']=='내용 확인']
    m2=[n for n in ch if ch[n]['F2']=='〈보기〉만']; m3=[n for n in ch if ch[n]['F1']=='참' and ch[n]['F4']=='내용 확인']
    return dict(jonly=jonly,rec=rec,M2=bool(m2),M3=bool(m3),M4=len(rec)>=2,nM=int(bool(m2))+int(bool(m3))+int(len(rec)>=2),ch=ch)
def maj4a(p,x,D): return maj([D[j][p]['K4a'][x] for j in J])
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
    yes=[x for x in PK[p]['p'] if maj4a(p,x,D1)=='예']
    k4b=[maj([D1[j][p].get('K4b',{}).get(x) for j in J]) for x in yes]
    return dict(R1='아니오' if any(v=='서술자 풀이' for v in k1) else '예',R2='아니오' if lit else '예',R3='아니오' if blank else '예',
        S12='해당 없음' if not yes else ('예' if any(re.fullmatch(r'b\d+',str(v)) for v in k4b) else '아니오'))
ok=[p for p in KEY if all(p in D2[j] for j in J)]; ok1=[p for p in KEY if all(p in D1[j] for j in J)]
ST={p:item_stats(p) for p in ok}; RSV={p:rs(p) for p in ok1}
W('\n## c. 표시 판정 (판정자 셋 다수값)\n')
W(f"- 유효: 선지 표시(v2) {len(ok)}/15문항, 〈보기〉 표시(v1) {len(ok1)}/15문항. 형식 실패 {15-len(ok)+15-len(ok1)}건.")
W('- 잰 규칙: M2(〈보기〉만으로 정오가 정해지는 선지가 있음 = F2 다수값 \'〈보기〉만\'), M3(내용상 참인 선지가 F4 \'내용 확인\'), M4(\'지문만\' ∧ \'내용 확인\' 선지가 2개 이상). M5(거울 짝), M1·M6~M11은 두 표(MARKING-v2·BOGI-v1)에 칸이 없어 잴 수 없다. R1·R2·R3·S12는 BOGI-v1 칸으로 잰다.\n')
W('| 문항 | 묶음 | 이름 | 지문만 선지 | 그중 내용 확인 | M2 | M3 | M4 | M2~M4 위반 수 | R1 | R2 | R3 | S12 |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|')
for p in KEY:
    k=KEY[p]
    if p not in ST: W(f"| {p} | {k['version']} | {k['name']} | (형식 실패) |"); continue
    s=ST[p]; r=RSV.get(p,{})
    W(f"| {p} | {k['version']} | {k['name']} | {len(s['jonly'])} ({','.join(map(str,s['jonly'])) or '-'}) | {len(s['rec'])} | {'위반' if s['M2'] else '-'} | {'위반' if s['M3'] else '-'} | {'위반' if s['M4'] else '-'} | {s['nM']} | {r.get('R1','-')} | {r.get('R2','-')} | {r.get('R3','-')} | {r.get('S12','-')} |")
def agg(sel,label):
    ps=[p for p in ok if sel(KEY[p])]
    if not ps: return f'| {label} | 0 | - | - | - | - | - | - |'
    jo=sum(len(ST[p]['jonly']) for p in ps); rc=sum(len(ST[p]['rec']) for p in ps)
    return f"| {label} | {len(ps)} | {jo/len(ps):.2f} | {rc/len(ps):.2f} | {rc}/{jo} ({(rc/jo if jo else 0):.0%}) | {sum(ST[p]['M2'] for p in ps)} | {sum(ST[p]['M3'] for p in ps)} | {sum(ST[p]['M4'] for p in ps)} |"
# 본 감사 기출 26 (main-r1 OPTIONS-majority.csv, 같은 다수값 규칙)
rows=list(csv.DictReader(open(RA+'main-r1/OPTIONS-majority.csv',encoding='utf-8-sig'))); by=collections.defaultdict(dict)
for r in rows: by[r['문항']][int(r['선지'])]=r
a26=dict(jo=[],rc=[],M2=0,M3=0,M4=0)
for q,ch in by.items():
    jo=[n for n,r in ch.items() if r['F2']=='지문만']; rc=[n for n in jo if ch[n]['F4']=='내용 확인']
    a26['jo'].append(len(jo)); a26['rc'].append(len(rc)); a26['M2']+=any(r['F2']=='〈보기〉만' for r in ch.values())
    a26['M3']+=any(r['F1']=='참' and r['F4']=='내용 확인' for r in ch.values()); a26['M4']+=len(rc)>=2
W('\n| 묶음 | 문항 | 문항당 지문만 선지 | 문항당 지문만∧내용 확인 | 내용 확인 비율(합) | M2 위반 문항 | M3 위반 문항 | M4 위반 문항 |\n|---|---|---|---|---|---|---|---|')
for lab,f in [('v5 생성',lambda k:k['version']=='v5'),('v6 생성',lambda k:k['version']=='v6'),('확인용 기출',lambda k:k['group']=='confirm')]: W(agg(f,lab))
n26=len(by); W(f"| (참고) 본 감사 기출 {n26} (main-r1) | {n26} | {mean(a26['jo']):.2f} | {mean(a26['rc']):.2f} | {sum(a26['rc'])}/{sum(a26['jo'])} ({sum(a26['rc'])/max(1,sum(a26['jo'])):.0%}) | {a26['M2']} | {a26['M3']} | {a26['M4']} |")
r3=list(csv.DictReader(open(RA+'main-r3/ITEMS-v1-majority.csv',encoding='utf-8-sig')))
W('\n〈보기〉 표시 규칙 준수(지킴/적용 문항, 다수값):\n\n| 묶음 | R1 | R2 | R3 | S12 |\n|---|---|---|---|---|')
def rsline(lab,rl):
    out=[]
    for f in ('R1','R2','R3','S12'):
        y=sum(r[f]=='예' for r in rl); n=sum(r[f] in('예','아니오') for r in rl); out.append(f'{y}/{n}')
    return f"| {lab} | "+' | '.join(out)+' |'
for lab,f in [('v5 생성',lambda k:k['version']=='v5'),('v6 생성',lambda k:k['version']=='v6'),('확인용 기출',lambda k:k['group']=='confirm')]: W(rsline(lab,[RSV[p] for p in ok1 if f(KEY[p])]))
W(rsline('(참고) 본 감사 기출 26 (main-r3)',[{'R1':r['R1준수'],'R2':r['R2준수'],'R3':r['R3준수'],'S12':r['S12준수']} for r in r3]))
# ---------- d. e3 대 판정자
W('\n## d. e3의 M2~M4 판정 대 판정자 다수값\n')
E3={}
for p,k in KEY.items():
    path=None
    if k['group']=='confirm': path=S+f"confirm/e3/{k['name']}/eval.json"
    elif k['version']=='v6': path=V5+k['path'].replace('deep-item-v5-2026-11-18/','').rsplit('/leakfix',1)[0]+'/repair/eval.json'
    if path and os.path.exists(path):
        b=json.load(open(path))['before']['V1']
        if 'methodViolations' in b: E3[p]=b
W(f"- e3가 M 판정(methodViolations)을 내는 것은 RULES_V=6으로 돌린 v6 4 + 확인용 7 = {len(E3)}문항이다. v5 생성 4문항은 v5 e3라 M 칸이 없어 뺀다(공시 v5 2개는 지난 실행분).\n")
tot=agr=0; per=collections.Counter(); perN=collections.Counter(); rows_d=[]
for p,b in E3.items():
    if p not in ST: continue
    for m in ('M2','M3','M4'):
        e=m in b['methodViolations']; jd=ST[p][m]; per[m]+=(e==jd); perN[m]+=1; tot+=1; agr+=(e==jd)
        if e!=jd: rows_d.append((p,KEY[p]['name'],m,e,jd))
W('| 규칙 | 같은 문항 / 비교 문항 |\n|---|---|'); 
for m in ('M2','M3','M4'): W(f"| {m} | {per[m]}/{perN[m]} |")
W(f"| 합 | {agr}/{tot} ({agr/max(1,tot):.0%}) |\n\n불일치: "+('; '.join(f"{p}({n}) {m}: e3={'위반' if e else '통과'} / 판정자={'위반' if jd else '통과'}" for p,n,m,e,jd in rows_d) or '없음'))
# ---------- e. v6 선택 전략
W('\n## e. v6 선택 전략\n')
for p,k in KEY.items():
    if k['version']!='v6': continue
    it=json.load(open(V5+k['path'].replace('deep-item-v5-2026-11-18/','')))['items'][0]
    ev_=json.load(open(V5+k['path'].replace('deep-item-v5-2026-11-18/','').rsplit('/leakfix',1)[0]+'/repair/eval.json'))['before']['V1']
    W(f"- {k['name']} ({p}): 고른 전략 {it.get('strategies')}; strategyUse {json.dumps(it.get('strategyUse'),ensure_ascii=False)}; 전략 경고 {ev_.get('strategyWarnings') or '없음'}")
# ---------- f. 수리
W('\n## f. 수리 대상 여부\n')
W('- 생성 v6 4문항: 모두 수리 대상 아님(방식 위반 최대 1개, 경고로만 기록). 수리를 돌린 문항이 없어 수리 전·후 등급은 없다.')
W('- 확인용 기출 (수리 끔, e3 판정만):\n\n| 문항 | 수리 대상 | 방식 위반 | 경고 |\n|---|---|---|---|')
for p,k in KEY.items():
    if k['group']!='confirm' or p not in E3: continue
    b=E3[p]; W(f"| {k['name']} | {'예' if b['repair'] else '아니오'} | {','.join(b['methodViolations']) or '-'} | {' / '.join(b['warnings']) or '-'} |")
open(S+'aggregate-out.md','w').write('\n'.join(OUT)+'\n'); print('\n'.join(OUT))
