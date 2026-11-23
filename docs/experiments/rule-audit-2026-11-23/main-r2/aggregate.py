# 2단계 2회 집계(BOGI-SCHEMA-v0). 실행: python3 main-r2/aggregate.py [--check] (저장소 루트에서)
import json, glob, itertools, collections, csv, sys, re
M='docs/experiments/rule-audit-2026-11-23/main-r2/'
KEY=json.load(open(M+'KEY-main-r2.json'))
J=['J1','J2','J3']; pairs=list(itertools.combinations(J,2))
OK={'B1':{'0','1','2','3 이상','애매'},'B1a':{'0','1','2 이상','애매'},
 'B2':{'없음','있음-정오에 안 쓰임','있음-정오에 쓰임','애매'},'B3':{'아니오','예','애매'},
 'B4':{'1','2','3 이상','해당 없음','애매'},'B4b':{'1','2','3 이상','애매'},'B5':{'0','1','2 이상','애매'},
 'B6':{'〈보기〉는 평가자만','〈보기〉는 대상만','〈보기〉가 둘 다','해당 없음','애매'},
 'B7':{'지문에 없음','있음-〈보기〉가 씀','있음-〈보기〉가 안 씀','애매'},
 'B8':{'지문에 예시 없음','구조가 다름','이름만 바꾼 꼴','애매'},
 'B9':{'발화 없음','행동·판단·근거만','지문 원칙과 맞대는 선언 있음','애매'},
 'B10':{'해당 없음','결과까지 있음','행위만 있는 문장 있음','애매'},'B11':{'없음','있음','애매'}}
BC=list(OK)
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
def norm_o1(v):
    if v=='지문 근거 없음': return []
    if isinstance(v,list) and all(isinstance(x,int) for x in v): return sorted(set(v))
    return None
def validate(o):
    errs=[]
    if o.get('packet_id') not in KEY: errs.append('packet_id')
    if o.get('answer') not in (1,2,3,4,5): errs.append('answer')
    for f in BC:
        v=o.get(f)
        if not isinstance(v,str) or v not in OK[f]: errs.append(f'{f}={v!r}')
    o1=o.get('O1')
    if not isinstance(o1,dict) or sorted(o1)!=['1','2','3','4','5']: errs.append('O1 키')
    else:
        for n in o1:
            if norm_o1(o1[n]) is None: errs.append(f'O1[{n}]={o1[n]!r}')
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
def verdict(r): return '-' if r is None else ('유지(≥0.75)' if r>=0.75 else ('정의 고침(0.60~0.75)' if r>=0.60 else '합치거나 뺌(<0.60)'))
def o1(j,p,n): return norm_o1(data[j][p]['O1'][str(n)])
def agree(f,pids):
    res=[]
    for a,b in pairs: res.append(sum(data[a][p][f]==data[b][p][f] for p in pids)/len(pids))
    return sum(res)/3,res
def jac(x,y): 
    x,y=set(x),set(y); return 1.0 if not x and not y else len(x&y)/len(x|y)
def o1_rates(pids):
    js=[];fs=[]
    for p in pids:
        for n in range(1,6):
            for a,b in pairs:
                x,y=o1(a,p,n),o1(b,p,n); js.append(jac(x,y))
                fs.append(None if (not x and not y) else (None if (not x or not y) and False else (min(x)==min(y) if x and y else False)))
    jm=sum(js)/len(js); f=[v for v in fs if v is not None]
    return jm,sum(f)/len(f),len(f),len(fs)
def maj(p,f):
    c=collections.Counter(data[j][p][f] for j in J).most_common(1)[0]; return c[0] if c[1]>=2 else '갈림'
def o1maj(p,n):
    c=collections.Counter(x for j in J for x in o1(j,p,n)); return sorted(x for x,k in c.items() if k>=2)
R=[];W=R.append
W('# 규칙 감사 2단계 2회 보고: 〈보기〉·문항 단위 표시 + 글자 세기 (표 BOGI-SCHEMA-v0)\n')
W('- 측정만 적는다. 뜻풀이·권고·규칙별 준수율은 쓰지 않는다. 스크립트 `main-r2/aggregate.py`·`main-r2/text-counts.py`, 대응표 `main-r2/KEY-main-r2.json`(판정자에게는 주지 않음), 판정자 원문 `main-r2/judges/`. 문항·packet은 main-r1과 같다(26문항, 문단 번호는 모든 packet에 이미 있어 붙이지 않음).\n')
W('## 1. 판정자 실행·형식\n')
W('- 나눈 방식: 판정자마다 새 세션 3번(M01~M09 / M10~M18 / M19~M26). 폴더에는 해당 packet과 `BOGI-SCHEMA-v0.md`만, 지시 문장 뒤에 packet 파일 이름 목록을 붙였다.')
for j in J: W(f"- {j}: 유효 {len(data[j])}/{len(KEY)}문항, 형식 실패(재질문 뒤) {len(FAIL[j])}개 {FAIL[j]}")
for fn in sorted(glob.glob(M+'judges/J*/raw-retry-*.txt')): W(f"- 재질문: `{fn.replace(M,'')}`")
W('\n### 판정자 답이 출제 정답과 다른 문항\n'); W('| 문항 | 문항 키 | 출제 정답 | J1 | J2 | J3 | 비고 |\n|---|---|---|---|---|---|---|'); nd=0
for p,k in KEY.items():
    ans=[data[j][p]['answer'] if p in data[j] else None for j in J]
    if any(a is not None and a!=k['official_answer'] for a in ans) or k['answer_disputed']:
        nd+=1; W(f"| {p} | {k['key']} | {k['official_answer']} | "+' | '.join('-' if a is None else str(a) for a in ans)+f" | {'정답 시비 있음' if k['answer_disputed'] else ''} |")
if not nd: W('| (없음) | | | | | | |')
W('\n(답이 다른 문항의 표시도 일치율 계산에 넣었다.)\n')
W('## 2. 칸별 일치율 (판정자 쌍 J1-J2 / J1-J3 / J2-J3의 문항 단위 일치율 평균)\n')
W(' / '.join(f'{s} {len(ps)}문항' for s,ps in SETS.items())+'. 판정은 PLAN 2-2 기준을 전체 26에 적용(갈래별은 문항 수가 적어 참고). 이번에는 다시 표시하지 않으므로 0.75 미만 칸은 준수율 집계에서 뺀다.\n')
W('| 칸 | 전체 26 | 사례 | 관점 | 자료 | 기타 | 쌍별(전체) | 판정(전체) | 준수율 집계 |\n|---|---|---|---|---|---|---|---|---|')
rate={}; rr={}
for f in BC:
    rr[f]={s:agree(f,ps) for s,ps in SETS.items()}; rate[f]=rr[f]['전체'][0]
    W(f"| {f} | "+' | '.join(fmt(rr[f][s][0]) for s in SETS)+' | '+' / '.join(fmt(x) for x in rr[f]['전체'][1])+f" | {verdict(rate[f])} | {'뺌' if rate[f]<0.75 else '넣음'} |")
O={s:o1_rates(ps) for s,ps in SETS.items()}
W(f"| O1 자카드 평균(선지별, 세 쌍 평균) | "+' | '.join(fmt(O[s][0]) for s in SETS)+f" | - | {verdict(O['전체'][0])} | {'뺌' if O['전체'][0]<0.75 else '넣음'} |")
W(f"| O1 가장 앞 문단 같은 비율 | "+' | '.join(fmt(O[s][1]) for s in SETS)+f" | - | {verdict(O['전체'][1])} | {'뺌' if O['전체'][1]<0.75 else '넣음'} |")
W(f"\n- O1 가장 앞 문단 비율: 쌍 안에서 한쪽만 '지문 근거 없음'이면 불일치로 세고, 둘 다 '지문 근거 없음'이면 분모에서 뺀다(분모 {O['전체'][2]} / (선지×쌍) {O['전체'][3]}).\n")
W('## 3. 값별 분포 (문항별 다수값 기준, 갈림은 따로 센다)\n')
for f in BC:
    W(f'### {f}\n'); vals=sorted({maj(p,f) for p in P}|set()); 
    W('| 값 | '+' | '.join(f'{s} ({len(ps)})' for s,ps in SETS.items())+' |\n|---|'+'---|'*len(SETS))
    for v in vals:
        W(f'| {v} | '+' | '.join(f"{sum(1 for p in ps if maj(p,f)==v)} ({sum(1 for p in ps if maj(p,f)==v)/len(ps):.0%})" if ps else '-' for ps in SETS.values())+' |')
    W('')
W('### O1 (선지당 다수 문단 수: 둘 이상 판정자가 든 문단)\n')
W('| 다수 문단 수 | '+' | '.join(f'{s} 선지 ({5*len(ps)})' for s,ps in SETS.items())+' |\n|---|'+'---|'*len(SETS))
for k in range(0,4):
    W(f'| {k}{"개 이상" if k==3 else "개"} | '+' | '.join(f"{sum(1 for p in ps for n in range(1,6) if (len(o1maj(p,n)) if len(o1maj(p,n))<3 else 3)==k)}" for ps in SETS.values())+' |')
W('')
# CSV
with open(M+'ITEMS-majority.csv','w',newline='') as fh:
    w=csv.writer(fh); w.writerow(['문항','문항 키','감사 갈래','발문','출제 정답']+BC+[f'O1 선지{n} 다수 문단' for n in range(1,6)]+['갈림 칸'])
    for p in P:
        k=KEY[p]; mv=[maj(p,f) for f in BC]
        w.writerow([p,k['key'],k['audit_kind'],k['direction'],k['official_answer']]+mv+[' '.join(map(str,o1maj(p,n))) for n in range(1,6)]+[' '.join(f for f,v in zip(BC,mv) if v=='갈림')])
W('## 4. 문항별 다수값 표\n\n- `main-r2/ITEMS-majority.csv` (문항 26줄: 문항 키, 감사 갈래, 발문, 출제 정답, B1~B11 다수값, 선지별 O1 다수 문단, 갈림 칸).\n')
# 글자 세기 요약
rows=list(csv.DictReader(open(M+'TEXT-counts.csv')))
W('## 5. 글자 세기 요약 (`main-r2/TEXT-counts.csv`, 셈 규칙은 `text-counts.py` 머리말)\n')
W('- 셈 규칙: 문장 수 = \'.\' \'?\' \'!\'(소수점 제외) 개수; 가정 표현 수 = \'~면\'으로 끝나는 어절(표면·단면 등 명사 제외) + \'~ㄹ 경우\'; 글자 수 = 공백 제외; 길이 순위 1 = 문항 안에서 가장 긺(공동 순위); 단정어 = 모든·반드시·항상·오직·전혀·결코 합; 조사 \'만\' = \'만\'으로 끝나는 어절 중 숫자 뒤·\'~지만\'·\'그만\'·\'가만\'·\'얼마만\' 제외(오탐 많음).\n')
def avg(xs): return sum(xs)/len(xs) if xs else None
W('### 5-1. 갈래·발문별 선지 평균\n'); W('| 갈래 발문 | 문항 | 선지 | 문장 수 | 가정 표현 수 | 글자 수 | 단정어 수 | 조사 만 수 |\n|---|---|---|---|---|---|---|---|')
keys=[(c,d) for c in ['사례','관점','자료','기타'] for d in 'AB' if any(r['감사 갈래']==c and r['발문']==d for r in rows)]+[('전체','')]
def sel(c,d): return [r for r in rows if (c=='전체' or (r['감사 갈래']==c and r['발문']==d))]
for c,d in keys:
    rs=sel(c,d); W(f"| {c} {d} | {len({r['문항'] for r in rs})} | {len(rs)} | {avg([int(r['문장 수']) for r in rs]):.2f} | {avg([int(r['가정 표현 수']) for r in rs]):.2f} | {avg([int(r['글자 수(공백 제외)']) for r in rs]):.1f} | {avg([int(r['단정어 수(모든·반드시·항상·오직·전혀·결코)']) for r in rs]):.2f} | {avg([int(r['조사 만 수(오탐 많음)']) for r in rs]):.2f} |")
W('\n### 5-2. 정답 선지의 길이 순위(문항당 한 번씩)와 선지 평균(F1 다수값별)\n')
W('| 갈래 발문 | 문항 | 정답 길이 순위 평균 | 순위 1 문항 수 | 참 선지 글자 수 | 거짓 선지 글자 수 | 참 선지 단정어 | 거짓 선지 단정어 | 참 선지 가정 표현 | 거짓 선지 가정 표현 | 참 선지 문장 수 | 거짓 선지 문장 수 |\n|---|---|---|---|---|---|---|---|---|---|---|---|')
for c,d in keys:
    rs=sel(c,d); it={}
    for r in rs: it[r['문항']]=int(r['정답 선지 길이 순위'])
    t=[r for r in rs if r['F1 다수값(main-r1)']=='참']; fl=[r for r in rs if r['F1 다수값(main-r1)']=='거짓']
    g=lambda L,col:avg([int(r[col]) for r in L])
    c1='글자 수(공백 제외)'; c2='단정어 수(모든·반드시·항상·오직·전혀·결코)'
    W(f"| {c} {d} | {len(it)} | {avg(list(it.values())):.2f} | {sum(1 for v in it.values() if v==1)} | {g(t,c1):.1f} | {g(fl,c1):.1f} | {g(t,c2):.2f} | {g(fl,c2):.2f} | {g(t,'가정 표현 수'):.2f} | {g(fl,'가정 표현 수'):.2f} | {g(t,'문장 수'):.2f} | {g(fl,'문장 수'):.2f} |")
W(f"\n- 정답 번호 분포: "+', '.join(f"{n}번 {sum(1 for k in KEY.values() if k['official_answer']==n)}" for n in range(1,6))+'\n')
# 갈린 문항
W('## 6. 일치율 0.75 미만 칸의 갈린 문항 상위 5개\n')
W('대상 = 전체 26 일치율이 0.75 미만인 칸(B 칸·O1). 문항 단위 갈림 정도 = 값이 다른 판정자 쌍 수(0~3), 큰 순, 같으면 문항 번호 순. O1은 선지 단위(세 쌍 자카드 평균이 낮은 순). 값은 J1 / J2 / J3 순. note 원문 그대로.\n')
low=[f for f in BC if rate[f]<0.75]
if not low and O['전체'][0]>=0.75 and O['전체'][1]>=0.75: W('(없음)\n')
for f in low:
    rows_=[]
    for p in P:
        v=[data[j][p][f] for j in J]; dis=sum(v[J.index(a)]!=v[J.index(b)] for a,b in pairs)
        if dis: rows_.append((-dis,p,v))
    rows_.sort(key=lambda r:(r[0],r[1])); W(f"### {f} (전체 26 {fmt(rate[f])})\n")
    for d,p,v in rows_[:5]:
        W(f"- **{p}({KEY[p]['key']})** (갈린 쌍 {-d}/3) — 값: "+' / '.join(f'{j}={x}' for j,x in zip(J,v)))
        for j in J: W(f"  - {j} note: {data[j][p].get('note','')}")
    W('')
if O['전체'][0]<0.75 or O['전체'][1]<0.75:
    rows_=[]
    for p in P:
        for n in range(1,6):
            s=[o1(j,p,n) for j in J]; jm=sum(jac(s[J.index(a)],s[J.index(b)]) for a,b in pairs)/3
            fs=[(min(s[J.index(a)])==min(s[J.index(b)])) if s[J.index(a)] and s[J.index(b)] else False for a,b in pairs]
            rows_.append((jm,sum(not x for x in fs),p,n,s))
    rows_.sort(key=lambda r:(r[0],-r[1],r[2],r[3])); W(f"### O1 (자카드 {fmt(O['전체'][0])}, 가장 앞 문단 {fmt(O['전체'][1])}; 선지 단위 자카드 낮은 순)\n")
    for jm,_,p,n,s in rows_[:5]:
        W(f"- **{p}({KEY[p]['key']}) {n}번** (자카드 {jm:.2f}) — 문단: "+' / '.join(f"{j}={x if x else '근거 없음'}" for j,x in zip(J,s)))
        for j in J: W(f"  - {j} note: {data[j][p].get('note','')}")
    W('')
open(M+'REPORT-main-r2.md','w').write('\n'.join(R)+'\n')
json.dump({'rates_all26':rate,'rates_by_kind':{f:{s:rr[f][s][0] for s in SETS} for f in BC},'O1':{s:{'jaccard':O[s][0],'first':O[s][1]} for s in SETS},'excluded':[f for f in BC if rate[f]<0.75]+(['O1 자카드'] if O['전체'][0]<0.75 else [])+(['O1 앞 문단'] if O['전체'][1]<0.75 else []),'format_failures':FAIL},open(M+'aggregate-out.json','w'),ensure_ascii=False,indent=1)
print({f:round(v,3) for f,v in rate.items()},{s:(round(O[s][0],3),round(O[s][1],3)) for s in ['전체']})
