# 3단계 확인 집계(BOGI-SCHEMA-v1). 실행: python3 docs/experiments/rule-audit-2026-11-23/main-r3/aggregate.py [--check] (저장소 루트에서)
# 일치율과 준수 계산은 BOGI-SCHEMA-v1 '일치율과 준수 계산' 그대로. 층 판정·권고는 쓰지 않는다.
import json, glob, itertools, collections, csv, sys, re, os
M='docs/experiments/rule-audit-2026-11-23/main-r3/'
KEY=json.load(open(M+'KEY-main-r3.json'))
J=['J1','J2','J3']; pairs=list(itertools.combinations(J,2))
OK1={'서술자 풀이','인물·학자의 말','표지 아님','애매'}; OK4a={'예','아니오','애매'}
PK={}  # 문항별 packet 정보: 후보·문장 번호, 〈보기〉 원문
for p in KEY:
    t=open(M+f'packets/{p}.md').read()
    bs=re.findall(r'^b(\d+)\. (.*)$',t,re.M)
    PK[p]=dict(c=['c'+x for x in re.findall(r'^- c(\d+):',t,re.M)],p=['p'+x for x in re.findall(r'^- p(\d+):',t,re.M)],
               b=['b'+n for n,_ in bs],bogi='\n'.join(s for _,s in bs))
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
def validate(o):
    errs=[]; p=o.get('packet_id')
    if p not in KEY: return ['packet_id']
    P=PK[p]
    if o.get('answer') not in (1,2,3,4,5): errs.append('answer')
    k1=o.get('K1')
    if not isinstance(k1,dict) or sorted(k1)!=sorted(P['c']) or any(v not in OK1 for v in k1.values()): errs.append('K1')
    k2=o.get('K2')
    if not isinstance(k2,dict) or sorted(k2)!=['1','2','3','4','5'] or any(not isinstance(v,list) or not all(isinstance(x,str) for x in v) for v in k2.values()): errs.append('K2')
    k3=o.get('K3')
    if not isinstance(k3,dict) or sorted(k3)!=sorted(P['b']) or any(not (v=='소개' or (isinstance(v,list) and all(isinstance(x,int) and 1<=x<=5 for x in v))) for v in k3.values()): errs.append('K3')
    k4=o.get('K4a')
    if not isinstance(k4,dict) or sorted(k4)!=sorted(P['p']) or any(v not in OK4a for v in k4.values()): errs.append('K4a')
    else:
        k4b=o.get('K4b'); need=[x for x,v in k4.items() if v=='예']
        if not isinstance(k4b,dict) or sorted(k4b)!=sorted(need) or any(not (v in('없음','애매') or (isinstance(v,str) and re.fullmatch(r'b\d+',v) and v in P['b'])) for v in k4b.values()): errs.append('K4b')
    return errs
def load(j):
    items={}; bad={}
    for fn in sorted(glob.glob(M+f'judges/{j}/raw*.txt')):
        for o in extract(open(fn).read()):
            e=validate(o); pid=o.get('packet_id')
            if not e: items[pid]=o; bad.pop(pid,None)
            elif pid not in items: bad[pid]=e
    return items,bad
data={};fails={}
for j in J: data[j],fails[j]=load(j)
if '--check' in sys.argv:
    for j in J: print(j,'유효',len(data[j]),'없음/실패',{p:fails[j].get(p,'없음') for p in KEY if p not in data[j]})
    sys.exit()
FAIL={j:sorted(p for p in KEY if p not in data[j]) for j in J}
P=[p for p in KEY if all(p in data[j] for j in J)]
SETS={'전체':P}
for k in ['사례','관점','자료','기타']: SETS[k]=[p for p in P if KEY[p]['audit_kind']==k]
fmt=lambda x:'-' if x is None else f'{x:.3f}'
def verdict(r): return '-' if r is None else ('≥0.75' if r>=0.75 else ('0.60~0.75' if r>=0.60 else '<0.60'))
def jac(x,y):
    x,y=set(x),set(y); return 1.0 if not x and not y else len(x&y)/len(x|y)
def k3set(v): return {'소개'} if v=='소개' else set(v)
# 단위: (문항, 단위id) -> 판정자별 값. 칸마다 단위 목록을 만든다.
def units(cell,pids):
    out=[]
    for p in pids:
        if cell=='K1': out+=[(p,c) for c in PK[p]['c']]
        elif cell=='K2': out+=[(p,str(n)) for n in range(1,6)]
        elif cell=='K3': out+=[(p,b) for b in PK[p]['b']]
        elif cell=='K4a': out+=[(p,x) for x in PK[p]['p']]
        elif cell=='K4b': out+=[(p,x) for x in PK[p]['p'] if maj4a(p,x)=='예']
    return out
def val(cell,j,p,u):
    o=data[j][p]
    if cell=='K1': return o['K1'][u]
    if cell=='K2': return o['K2'][u]
    if cell=='K3': return o['K3'][u]
    if cell=='K4a': return o['K4a'][u]
    if cell=='K4b': return o.get('K4b',{}).get(u)
def same(cell,a,b):
    if cell=='K2': return jac(a,b)
    if cell=='K3': return jac(k3set(a),k3set(b))
    return 1.0 if a==b else 0.0
def maj_val(vals):
    c=collections.Counter(vals).most_common(1)[0]; return c[0] if c[1]>=2 else '갈림'
def maj4a(p,x): return maj_val([data[j][p]['K4a'][x] for j in J])
def rate(cell,pids):
    us=units(cell,pids)
    if not us: return None,[None]*3,0
    per=[]
    for a,b in pairs: per.append(sum(same(cell,val(cell,a,p,u),val(cell,b,p,u)) for p,u in us)/len(us))
    return sum(per)/3,per,len(us)
def listmaj(p,key,cell):  # 둘 이상 판정자가 적은 낱말(K2) / 선지 번호(K3)
    c=collections.Counter(x for j in J for x in set(val(cell,j,p,key))); return sorted(x for x,k in c.items() if k>=2)
def k3maj(p,b):
    vals=[data[j][p]['K3'][b] for j in J]
    if sum(v=='소개' for v in vals)>=2: return '소개'
    return listmaj(p,b,'K3') if True else None
CELLS=['K1','K2','K3','K4a','K4b']
R=[];W=R.append
W('# 규칙 감사 3단계 확인 보고: R1·R2·R3·S12 재표시 (표 BOGI-SCHEMA-v1)\n')
W('- 측정만 적는다. 층 판정·권고는 쓰지 않는다(웹이 한다). 스크립트 `main-r3/build_packets.py`·`aggregate.py`·`run_judges.sh`, 대응표 `main-r3/KEY-main-r3.json`(판정자에게는 주지 않음), 판정자 원문 `main-r3/judges/`, 후보 수 `main-r3/CANDIDATES.csv`. 문항 26개는 main-r2와 같다.\n')
W('## 1. 판정자 실행·형식\n')
W('- 판정자마다 새 세션 3번(M01~M09 / M10~M18 / M19~M26). 폴더에는 해당 packet과 `BOGI-SCHEMA-v1.md`만, 지시 문장 뒤에 packet 파일 이름 목록을 붙였다. 이전 표시표·결과는 주지 않았다.')
for j in J: W(f"- {j}: 유효 {len(data[j])}/{len(KEY)}문항, 형식 실패(재질문 뒤) {len(FAIL[j])}개 {FAIL[j]}")
for fn in sorted(glob.glob(M+'judges/J*/raw-retry-*.txt')): W(f"- 재질문: `{fn.replace(M,'')}`")
W('\n### 판정자 답이 출제 정답과 다른 문항\n'); W('| 문항 | 문항 키 | 출제 정답 | J1 | J2 | J3 | 비고 |\n|---|---|---|---|---|---|---|'); nd=0
for p,k in KEY.items():
    ans=[data[j][p]['answer'] if p in data[j] else None for j in J]
    if any(a is not None and a!=k['official_answer'] for a in ans) or k['answer_disputed']:
        nd+=1; W(f"| {p} | {k['key']} | {k['official_answer']} | "+' | '.join('-' if a is None else str(a) for a in ans)+f" | {'정답 시비 있음' if k['answer_disputed'] else ''} |")
if not nd: W('| (없음) | | | | | | |')
W('\n(답이 다른 문항의 표시도 일치율 계산에 넣었다.)\n')
W('## 2. 칸별 일치율 (판정자 쌍 J1-J2 / J1-J3 / J2-J3의 단위 일치율 평균)\n')
W(' / '.join(f'{s} {len(ps)}문항' for s,ps in SETS.items())+'. 단위: K1 = 후보, K2 = 선지(자카드), K3 = 〈보기〉 문장(자카드, "소개"는 "소개"끼리만 일치), K4a = 후보, K4b = K4a 다수값이 "예"인 후보. 괄호 안은 단위 수. 기준 ≥0.75 / 0.60~0.75 / <0.60. 이번에는 다시 표시하지 않는다.\n')
W('| 칸 | 전체 | 사례 | 관점 | 자료 | 기타 | 쌍별(전체) | 판정(전체) |\n|---|---|---|---|---|---|---|---|')
RT={}
for c in CELLS:
    RT[c]={s:rate(c,ps) for s,ps in SETS.items()}
    W(f"| {c} | "+' | '.join(f"{fmt(RT[c][s][0])} ({RT[c][s][2]})" for s in SETS)+' | '+' / '.join(fmt(x) for x in RT[c]['전체'][1])+f" | {verdict(RT[c]['전체'][0])} |")
W('- K4b 계산 주: K4a에서 "아니오"라고 한 판정자는 그 후보의 K4b를 적지 않는다(값 없음). 다수값이 "예"인 후보에서 이런 판정자의 값 없음은 불일치로 센다(표 v1 그대로). 5절의 `null`이 그것이다.')
W('')
# ---- 문항별 다수값과 준수
rows=[]
def item_row(p):
    k=KEY[p]; r=dict(문항=p,문항키=k['key'],감사갈래=k['audit_kind'],발문=k['direction'])
    c1=[maj_val([data[j][p]['K1'][c] for j in J]) for c in PK[p]['c']]
    r['K1후보수']=len(c1); r['K1서술자풀이후보수']=sum(v=='서술자 풀이' for v in c1); r['K1갈림후보수']=sum(v=='갈림' for v in c1)
    k2={}
    for n in range(1,6):
        ws=listmaj(p,str(n),'K2'); k2[n]=ws
    lit=sorted({w for ws in k2.values() for w in ws if w in PK[p]['bogi']})
    r['K2다수목록']=' | '.join(f"{n}:{','.join(ws)}" for n,ws in k2.items() if ws) or '(없음)'
    r['K2〈보기〉에그대로나온낱말']=','.join(lit)
    blank=0; k3d=[]
    for b in PK[p]['b']:
        m=k3maj(p,b)
        if m=='소개': continue
        if not m: blank+=1; k3d.append(b)
    r['K3빈문장수']=blank; r['K3빈문장']=','.join(k3d)
    pm=[(x,maj4a(p,x)) for x in PK[p]['p']]; yes=[x for x,v in pm if v=='예']
    r['K4적용']='예' if yes else '아니오'; r['K4a예후보수']=len(yes); r['K4a후보수']=len(pm)
    k4b=[maj_val([data[j][p].get('K4b',{}).get(x) for j in J]) for x in yes]
    r['K4b다수값']=','.join(map(str,k4b))
    r['R1준수']='아니오' if r['K1서술자풀이후보수'] else '예'
    r['R2준수']='아니오' if lit else '예'
    r['R3준수']='아니오' if blank else '예'
    r['S12준수']='해당 없음' if not yes else ('예' if any(re.fullmatch(r'b\d+',str(v)) for v in k4b) else '아니오')
    return r
rows=[item_row(p) for p in P]
with open(M+'ITEMS-v1-majority.csv','w',newline='') as fh:
    w=csv.DictWriter(fh,fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
W('## 3. 문항별 다수값 표\n\n- `main-r3/ITEMS-v1-majority.csv` (문항 26줄). 다수값 = 둘 이상 같은 값, 없으면 "갈림". R1 후보가 없는 문항은 "예"로 센다(후보 없음 수는 아래). R2는 선지별 다수 목록의 낱말이 〈보기〉 원문에 글자 그대로 나오면 "아니오", R3는 "소개"가 아닌 문장 중 다수 선지 목록이 빈 문장이 있으면 "아니오", S12는 K4a "예" 후보가 없으면 "해당 없음".\n')
def comp(field,rs):
    y=sum(r[field]=='예' for r in rs); n=sum(r[field]=='아니오' for r in rs); na=sum(r[field]=='해당 없음' for r in rs)
    return y,n,na
W('## 4. 문항 준수 (다수값 기준)\n')
GROUPS=[('전체',lambda r:True)]+[(k,lambda r,k=k:r['감사갈래']==k) for k in ['사례','관점','자료','기타']]+[('사례 A',lambda r:r['감사갈래']=='사례' and r['발문']=='A'),('사례 B',lambda r:r['감사갈래']=='사례' and r['발문']=='B'),('관점 A',lambda r:r['감사갈래']=='관점' and r['발문']=='A')]
W('| 규칙(칸) | '+' | '.join(g for g,_ in GROUPS)+' |\n|---|'+'---|'*len(GROUPS))
for name,field in [('R1 목적·까닭 (K1)','R1준수'),('R2 판정 개념어 (K2)','R2준수'),('R3 쓰이는 문장 (K3)','R3준수'),('S12 예외·단서 경계 (K4)','S12준수')]:
    cells=[]
    for g,f in GROUPS:
        rs=[r for r in rows if f(r)]; y,n,na=comp(field,rs)
        cells.append(f"{y}/{y+n}"+(f" (해당 없음 {na})" if na else ''))
    W(f"| {name}: 지킴/적용 문항 | "+' | '.join(cells)+' |')
W(f"\n- 문항 수: "+' / '.join(f"{g} {sum(1 for r in rows if f(r))}" for g,f in GROUPS))
W(f"- R1: 후보가 하나도 없는 문항 {sum(1 for r in rows if r['K1후보수']==0)}개(\"예\"로 셈). 다수값 \"갈림\" 후보 {sum(r['K1갈림후보수'] for r in rows)}개(\"서술자 풀이\"로 세지 않음). 후보 전체 {sum(r['K1후보수'] for r in rows)}개, 다수값 서술자 풀이 {sum(r['K1서술자풀이후보수'] for r in rows)}개.")
W(f"- R2: 선지별 다수 목록이 모두 빈 문항 {sum(1 for r in rows if r['K2다수목록']=='(없음)')}개(\"예\"로 셈).")
W(f"- R3: 〈보기〉 문장 중 다수값이 \"소개\"가 아닌 문장 대비 빈 문장 합 {sum(r['K3빈문장수'] for r in rows)}개.")
W(f"- S12: K4a \"예\" 후보가 하나 이상인 문항(적용) {sum(1 for r in rows if r['K4적용']=='예')}개 / 26.\n")
W('### 문항별 R·S 준수 (다수값)\n')
W('| 문항 | 문항 키 | 갈래 | 발문 | R1 | R2 | R3 | S12 | R1 서술자 풀이 후보 | R2 〈보기〉에 그대로 나온 낱말 | R3 빈 문장 | K4b 다수값 |\n|---|---|---|---|---|---|---|---|---|---|---|---|')
for r in rows: W(f"| {r['문항']} | {r['문항키']} | {r['감사갈래']} | {r['발문']} | {r['R1준수']} | {r['R2준수']} | {r['R3준수']} | {r['S12준수']} | {r['K1서술자풀이후보수']}/{r['K1후보수']} | {r['K2〈보기〉에그대로나온낱말'] or '-'} | {r['K3빈문장'] or '-'} | {r['K4b다수값'] or '-'} |")
W('')
# ---- 갈린 문항 상위 5
W('## 5. 일치율 0.75 미만 칸의 갈린 문항 상위 5개\n')
def item_dis(cell,p):
    us=[u for q,u in units(cell,[p])]
    if not us: return None
    return 1-sum(sum(same(cell,val(cell,a,p,u),val(cell,b,p,u)) for a,b in pairs)/3 for u in us)/len(us)
shown=0
for c in CELLS:
    r=RT[c]['전체'][0]
    if r is None or r>=0.75: continue
    shown+=1
    W(f"### {c} (전체 {fmt(r)})\n")
    ds=sorted(((item_dis(c,p),p) for p in P if item_dis(c,p) is not None),reverse=True)[:5]
    for d,p in ds:
        W(f"- **{p}** ({KEY[p]['key']}, {KEY[p]['audit_kind']} {KEY[p]['direction']}) 갈린 정도 {d:.2f}")
        for u in units(c,[p]):
            if u[0]!=p: continue
            vs=[val(c,j,p,u[1]) for j in J]
            if len({json.dumps(v,ensure_ascii=False,sort_keys=True) for v in vs})>1: W(f"  - {u[1]}: "+' / '.join(f"{j} {json.dumps(v,ensure_ascii=False)}" for j,v in zip(J,vs)))
        for j in J:
            if data[j][p].get('note'): W(f"  - note {j}: {data[j][p]['note']}")
if not shown: W('(0.75 미만 칸 없음)')
W('')
W('## 6. K2에서 〈보기〉에 그대로 나온 낱말\n')
any_=False
for r in rows:
    if r['K2〈보기〉에그대로나온낱말']: any_=True; W(f"- {r['문항']} ({r['문항키']}): {r['K2〈보기〉에그대로나온낱말']} (다수 목록 {r['K2다수목록']})")
if not any_: W('(없음)')
open(M+'REPORT-main-r3.md','w').write('\n'.join(R)+'\n')
json.dump({'rates':{c:{s:RT[c][s][0] for s in SETS} for c in CELLS},'fail':FAIL},open(M+'aggregate-out.json','w'),ensure_ascii=False,indent=1)
print('\n'.join(R[:40]))
