# 2회차 집계(표 v1). 실행: python3 pilot-r2/aggregate.py (저장소 루트에서). 판정자 원문(judges/J*/raw*.txt) → 검사·집계 → REPORT-pilot-r2.md
import json, re, glob, itertools, collections, sys
P2='docs/experiments/rule-audit-2026-11-23/pilot-r2/'; P1='docs/experiments/rule-audit-2026-11-23/pilot-r1/'
KEY=json.load(open(P2+'KEY-r2.json')); R1=json.load(open(P1+'aggregate-out.json'))
J=['J1','J2','J3']; pairs=list(itertools.combinations(J,2))
OK={'F1':{'참','거짓','판정 불가','애매'},'F2':{'지문만','〈보기〉만','둘 다','둘 없이도 가능','판정 불가','애매'},
 'F3':{'정의·주장','조건·범위·예외','이유·인과','비교·귀속','개별 사실','애매'},'F4':{'내용 확인','짝짓기','원리 적용','애매'},'F4b':{'1','2','3 이상'},
 'F5':{'뒤집기','범위 넓히기','조건 바꾸기','원인 바꾸기','대상 바꾸기','단계 바꾸기','귀속 바꾸기','예외 만들기','짝 바꾸기','복수','기타','애매','해당 없음'},
 'F6':{'전부','일부','없음','해당 없음','애매'},'F7':{'없음','사실 변경','추가','애매'}}
SINGLE=['F1','F2','F3','F4','F4b','F5','F6','F7']
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
    errs=[]
    if o.get('packet_id') not in KEY: errs.append('packet_id')
    if o.get('answer') not in (1,2,3,4,5): errs.append('answer')
    ops=o.get('options')
    if not isinstance(ops,list) or [x.get('n') for x in ops]!=[1,2,3,4,5]: return errs+['options 1~5 아님']
    for x in ops:
        for f in SINGLE:
            if x.get(f) not in OK[f]: errs.append(f"n{x.get('n')}.{f}={x.get(f)!r}")
        b=x.get('F3b','')
        if b!='' and b not in OK['F3']: errs.append(f"n{x.get('n')}.F3b={b!r}")
    return errs
def load(j):
    items={}; bad={}
    for fn in sorted(glob.glob(P2+f'judges/{j}/raw*.txt')):
        for o in extract(open(fn).read()):
            e=validate(o); pid=o.get('packet_id')
            if not e: items[pid]=o; bad.pop(pid,None)
            elif pid not in items: bad[pid]=e
    return items,bad
data={};fails={}
for j in J: data[j],fails[j]=load(j)
if '--check' in sys.argv:
    for j in J: print(j,'유효',len(data[j]),'실패',fails[j]); 
    sys.exit()
def opt(j,p,n): return data[j][p]['options'][n-1]
grp=lambda p:KEY[p]['group']
sets={'시범 11':[p for p in KEY if grp(p)=='시범'],'대조 9':[p for p in KEY if grp(p)!='시범'],'전체 20':list(KEY)}
def fmt(x): return '-' if x is None else f'{x:.3f}'
def verdict(r): return '-' if r is None else ('유지(≥0.75)' if r>=0.75 else ('정의 고침(0.60~0.75)' if r>=0.60 else '합치거나 뺌(<0.60)'))
def agree(f,pids,cond=None):
    res=[]
    for a,b in pairs:
        t=m=0
        for p in pids:
            if p in data[a] and p in data[b]:
                for n in range(1,6):
                    oa,ob=opt(a,p,n),opt(b,p,n)
                    if cond and not cond(oa,ob): continue
                    t+=1; m+=oa[f]==ob[f]
        res.append(m/t if t else None)
    v=[r for r in res if r is not None]; return (sum(v)/len(v) if v else None),res
def valstats(f,pids):
    cnt=collections.defaultdict(lambda:[0,0,0,0]); total=0
    for p in pids:
        if not all(p in data[j] for j in J): continue
        for n in range(1,6):
            total+=1; vals=[opt(j,p,n)[f] for j in J]
            for v in set(vals):
                k=vals.count(v); c=cnt[v]; c[0]+=1; c[1]+=k==3; c[2]+=k>=2; c[3]+=k
    return total,{v:dict(any=c[0],all3=c[1],ge2=c[2],share=c[3]/3/total) for v,c in cnt.items()}
def majority(vals):
    c=collections.Counter(vals).most_common(1)[0]
    return c[0] if c[1]>=2 else '갈림'
R=[];W=R.append
W('# 규칙 감사 1단계 시범 2회차 보고 (표 v1) + 알려진 문제 문항 대조\n')
W('- 이 보고는 측정만 적는다. 뜻풀이·권고는 쓰지 않는다. 집계 스크립트 `pilot-r2/aggregate.py`, 판정자 원문 `pilot-r2/judges/`, 대응표 `pilot-r2/KEY-r2.json`(판정자에게는 주지 않음).\n')
W('## 1. 문항 목록\n'); W('| 묶음 | 문항 키 | 출처 | 갈래 | 발문 | 출제 정답 | 고른 이유(등급·지적 원문 한 줄·출처 파일) |\n|---|---|---|---|---|---|---|')
for q,k in KEY.items(): W(f"| {q} | {k['group']} | {k['key']} | {k['source']} | {k['kind']} | {'부정(A)' if k['direction']=='A' else '긍정(B)'} | {k['official_answer']} | {k['reason']} |".replace('| '+q+' | '+k['group']+' |','| '+k['group']+' |',1) if False else f"| {k['group']} ({q}) | {k['key']} | {k['source']} | {k['kind']} | {'부정(A)' if k['direction']=='A' else '긍정(B)'} | {k['official_answer']} | {k['reason']} |")
W('')
W('## 2. 판정자 형식·답\n')
for j in J: W(f"- {j}: 유효 {len(data[j])}/{len(KEY)}문항, 형식 실패(재질문 뒤) {len([p for p in KEY if p not in data[j]])}개 {sorted(p for p in KEY if p not in data[j])}")
for fn in sorted(glob.glob(P2+'judges/J*/raw-retry-*.txt')): W(f"- 재질문: `{fn.replace(P2,'')}`")
W('\n### 판정자 답이 출제 정답과 다른 문항\n'); W('| 문항 | 묶음 | 문항 키 | 출제 정답 | J1 | J2 | J3 |\n|---|---|---|---|---|---|---|'); nd=0
for p,k in KEY.items():
    ans=[data[j][p]['answer'] if p in data[j] else None for j in J]
    if any(a is not None and a!=k['official_answer'] for a in ans): nd+=1; W(f"| {p} | {k['group']} | {k['key']} | {k['official_answer']} | "+' | '.join('-' if a is None else str(a) for a in ans)+' |')
if not nd: W('| (없음) | | | | | | |')
W('\n(답이 다른 문항의 표시도 일치율 계산에 넣었다.)\n')
W('## 3. 칸별 일치율\n')
W('판정자 쌍 셋의 선지 단위 일치율 평균. F3은 주된 값만(F3b 제외). F6 보조 = 쌍 안에서 두 판정자 중 한 명이라도 F6이 \'해당 없음\'이 아닌 선지만. 판정과 1회차 비교는 시범 11 기준.\n')
W('| 칸 | 시범 11 | 대조 9 | 전체 20 | 쌍별(시범 11: J1-J2 / J1-J3 / J2-J3) | PLAN 2-2 판정(시범 11) | 1회차 값·판정(v0) |\n|---|---|---|---|---|---|---|')
r1map={'F1':'F1','F2':'F2','F3':'F3','F4':'F4','F5':'F5','F6':'F6','F7':'F7'}
rate={}
for f in SINGLE:
    r={s:agree(f,ps) for s,ps in sets.items()}; rate[f]=r['시범 11'][0]
    r1=R1['cell_rates'].get(f) if f in r1map else None
    r1txt='(새 칸)' if r1 is None else f"{r1:.3f} · {R1['verdict'][f]}"+(' (F3은 값별 평균)' if f=='F3' else '')+(' (F4 v0=대응·분류 등 5값)' if f=='F4' else '')
    W(f"| {f} | {fmt(r['시범 11'][0])} | {fmt(r['대조 9'][0])} | {fmt(r['전체 20'][0])} | "+' / '.join(fmt(x) for x in r['시범 11'][1])+f" | {verdict(r['시범 11'][0])} | {r1txt} |")
cond=lambda a,b:(a['F6']!='해당 없음' or b['F6']!='해당 없음')
r={s:agree('F6',ps,cond) for s,ps in sets.items()}
W(f"| F6 보조('해당 없음' 아닌 선지만) | {fmt(r['시범 11'][0])} | {fmt(r['대조 9'][0])} | {fmt(r['전체 20'][0])} | "+' / '.join(fmt(x) for x in r['시범 11'][1])+f" | {verdict(r['시범 11'][0])} | (새 칸) |")
rate['F6s']=r['시범 11'][0]
W('')
W('## 4. 값별 일치 (시범 11 기준)\n')
W('- 한 명이라도 쓴 선지 중 셋 다 쓴 비율(셋 다), 둘 이상 쓴 비율(둘 이상). 점유 = 판정자 평균 사용 비율. F4b는 값 1·2·3 이상 각각이다.\n')
rare=[]
for f in ['F2','F3','F4','F4b','F5','F6','F7']:
    tot,st=valstats(f,sets['시범 11']); W(f'### {f} (선지 {tot})\n'); W('| 값 | 셋 다 | 둘 이상 | 점유 |\n|---|---|---|---|')
    for v,d in sorted(st.items(),key=lambda x:-x[1]['share']):
        W(f"| {v} | {d['all3']/d['any']:.2f} ({d['all3']}/{d['any']}) | {d['ge2']/d['any']:.2f} ({d['ge2']}/{d['any']}) | {d['share']:.2f} |")
        if d['share']<0.10 and d['all3']/d['any']<0.5: rare.append((f,v,d['all3'],d['any'],d['share']))
    W('')
W('### 드문 값(점유 10% 미만)이면서 셋 다 일치 0.5 미만 (시범 11 기준)\n')
if rare:
    W('| 칸 | 값 | 셋 다 / 한 명↑ | 점유 |\n|---|---|---|---|')
    for f,v,a,b,s in rare: W(f'| {f} | {v} | {a}/{b} | {s:.2f} |')
else: W('(없음)')
W('\n1회차 드문 값 목록(v0): '+('; '.join(f'{f}={v}({a}/{b})' for f,v,a,b,s in R1['rare_low_agree']) or '(없음)')+'\n')
# 대조
GR={'기출':[p for p in KEY if KEY[p]['source']=='기출'],
    '생성-비교(시범 생성 5 + 비교 3)':[p for p in KEY if KEY[p]['source']=='생성' and KEY[p]['group'] in('시범','비교')],
    '생성-문제':[p for p in KEY if KEY[p]['group']=='문제']}
W('## 5. 대조 (선지별 다수값: 판정자 둘 이상 같은 값, 없으면 \'갈림\')\n')
W('묶음: '+' / '.join(f'{g} {len(v)}문항' for g,v in GR.items())+'. 선지 수 = 문항 × 5.\n')
def maj(p,n,f): return majority([opt(j,p,n)[f] for j in J])
def dist(items,f,pred=None):
    c=collections.Counter(); tot=0
    for p in items:
        if not all(p in data[j] for j in J): continue
        for n in range(1,6):
            if pred and not pred(p,n): continue
            c[maj(p,n,f)]+=1; tot+=1
    return c,tot
def table(title,f,pred=None,order=None):
    W(f'### {title}\n'); res={g:dist(v,f,pred) for g,v in GR.items()}
    vals=sorted(set().union(*[set(c) for c,_ in res.values()]),key=lambda v:(order or []).index(v) if order and v in order else 99)
    W('| 값 | '+' | '.join(f'{g} (n={res[g][1]})' for g in GR)+' |\n|---|'+'---|'*len(GR))
    for v in vals: W(f'| {v} | '+' | '.join(f"{res[g][0][v]} ({res[g][0][v]/res[g][1]:.0%})" if res[g][1] else '-' for g in GR)+' |')
    W('')
table('5-1. F2 값 분포(전체 선지)','F2')
jm=lambda p,n:maj(p,n,'F2')=='지문만'
table('5-2. F2=지문만 선지의 F3 주된 값 분포','F3',jm)
table('5-3. F2=지문만 선지의 F4 분포','F4',jm)
table('5-4. F2=지문만 선지의 F4b 분포','F4b',jm)
fm=lambda p,n:maj(p,n,'F1')=='거짓'
table('5-5. 거짓 선지의 F3 주된 값 분포','F3',fm)
table('5-6. 거짓 선지의 F4 분포','F4',fm)
table('5-7. 거짓 선지의 F5 분포','F5',fm)
W('### 5-8. 문항당 F2=지문만 선지 수(다수값 기준)\n'); W('| 묶음 | 문항 수 | 지문만 선지 합 | 문항당 평균 |\n|---|---|---|---|')
for g,v in GR.items():
    v=[p for p in v if all(j in data and p in data[j] for j in J)]; s=sum(1 for p in v for n in range(1,6) if jm(p,n)); W(f'| {g} | {len(v)} | {s} | {s/len(v):.2f} |')
W('\n### 5-9. F3=정의·주장 이면서 F4=내용 확인인 선지(다수값 기준)\n'); W('| 묶음 | 선지 수 | 문항당 평균 | 문항별(문항 키: 개수) |\n|---|---|---|---|')
for g,v in GR.items():
    v=[p for p in v if all(p in data[j] for j in J)]; per={p:sum(1 for n in range(1,6) if maj(p,n,'F3')=='정의·주장' and maj(p,n,'F4')=='내용 확인') for p in v}
    W(f"| {g} | {sum(per.values())} | {sum(per.values())/len(v):.2f} | "+'; '.join(f"{KEY[p]['key']}: {c}" for p,c in per.items() if c)+' |')
W('')
# 갈린 선지
W('## 6. 일치율 0.75 미만 칸의 갈린 선지 상위 5개\n')
W('대상 칸 = 시범 11 또는 전체 20 일치율이 0.75 미만인 칸. 선지는 전체 20문항에서, 갈림 정도(판정자 쌍 셋 중 값이 다른 쌍 수, 0~3) 큰 순, 같으면 문항·선지 번호 순. 값은 J1 / J2 / J3 순. F2a·note 원문 그대로.\n')
allr={f:agree(f,sets['전체 20'])[0] for f in SINGLE}
low=[f for f in SINGLE if (rate[f] is not None and rate[f]<0.75) or (allr[f] is not None and allr[f]<0.75)]
if rate.get('F6s') is not None and rate['F6s']<0.75 and 'F6' not in low: low.append('F6')
if not low: W('(없음)\n')
for f in low:
    rows=[]
    for p in KEY:
        if not all(p in data[j] for j in J): continue
        for n in range(1,6):
            v=[opt(j,p,n)[f] for j in J]; dis=sum(v[J.index(a)]!=v[J.index(b)] for a,b in pairs)
            if dis: rows.append((-dis,p,n,v))
    rows.sort(key=lambda r:(r[0],r[1],r[2])); W(f"### {f} (시범 11 {fmt(rate[f])} / 전체 20 {fmt(allr[f])})\n")
    for d,p,n,v in rows[:5]:
        W(f"- **{p}({KEY[p]['key']}) {n}번** (갈린 쌍 {-d}/3) — 값: "+' / '.join(f'{j}={x}' for j,x in zip(J,v)))
        for j in J: o=opt(j,p,n); W(f"  - {j} F2a: {o.get('F2a','')} | note: {o.get('note','')}")
    W('')
open(P2+'REPORT-pilot-r2.md','w').write('\n'.join(R)+'\n')
json.dump({'rates_pilot11':rate,'rates_all20':allr,'verdict':{f:verdict(v) for f,v in rate.items()},'rare_low_agree':rare,'format_failures':{j:sorted(p for p in KEY if p not in data[j]) for j in J}},open(P2+'aggregate-out.json','w'),ensure_ascii=False,indent=1)
print({f:(None if v is None else round(v,3)) for f,v in rate.items()})
