# 2단계 본 감사 1회 집계(표 v2). 실행: python3 main-r1/aggregate.py [--check] (저장소 루트에서)
# 판정자 원문(judges/J*/raw*.txt) → 검사·집계 → REPORT-main-r1.md, OPTIONS-majority.csv, aggregate-out.json
import json, glob, itertools, collections, csv, sys
M='docs/experiments/rule-audit-2026-11-23/main-r1/'; P2='docs/experiments/rule-audit-2026-11-23/pilot-r2/'
KEY=json.load(open(M+'KEY-main-r1.json'))
J=['J1','J2','J3']; pairs=list(itertools.combinations(J,2))
F3V=['정의·주장','조건·범위·예외','이유·인과','비교·귀속','개별 사실','애매']
OK={'F1':{'참','거짓','판정 불가','애매'},'F2':{'지문만','〈보기〉만','둘 다','둘 없이도 가능','판정 불가','애매'},
 'F4':{'내용 확인','짝짓기','원리 적용','애매'},'F4b':{'1','2 이상'},
 'F5':{'뒤집기','범위 넓히기','조건 바꾸기','원인 바꾸기','대상 바꾸기','단계 바꾸기','귀속 바꾸기','예외 만들기','짝 바꾸기','복수','기타','애매','해당 없음'},
 'F7':{'없음','사실 변경','추가','애매'}}
SINGLE=['F1','F2','F4','F4b','F5','F7']; CELLS=['F1','F2','F3','F4','F4b','F5','F7']
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
        f3=x.get('F3')
        if not isinstance(f3,list) or not 1<=len(f3)<=2 or any(v not in F3V for v in f3): errs.append(f"n{x.get('n')}.F3={f3!r}")
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
    for j in J: print(j,'유효',len(data[j]),'미유효/없음',{p:fails[j].get(p,'없음') for p in KEY if p not in data[j]})
    sys.exit()
FAIL={j:sorted(p for p in KEY if p not in data[j]) for j in J}
pids_all=[p for p in KEY if all(p in data[j] for j in J)]
def opt(j,p,n): return data[j][p]['options'][n-1]
def val(j,p,n,f):
    x=opt(j,p,n)
    return set(x['F3']) if f=='F3' else {x[f]}
fmt=lambda x:'-' if x is None else f'{x:.3f}'
def verdict(r): return '-' if r is None else ('유지(≥0.75)' if r>=0.75 else ('정의 고침(0.60~0.75)' if r>=0.60 else '합치거나 뺌(<0.60)'))
def pair_mean(pids,eq):
    res=[]
    for a,b in pairs:
        t=m=0
        for p in pids:
            for n in range(1,6): t+=1; m+=eq(a,b,p,n)
        res.append(m/t if t else None)
    v=[r for r in res if r is not None]; return (sum(v)/len(v) if v else None),res
def agree_single(f,pids): return pair_mean(pids,lambda a,b,p,n:val(a,p,n,f)==val(b,p,n,f))
F3_USED=[v for v in F3V if any(v in val(j,p,n,'F3') for j in J for p in pids_all for n in range(1,6))]
def f3_agree(pids):
    per={v:pair_mean(pids,lambda a,b,p,n,v=v:(v in val(a,p,n,'F3'))==(v in val(b,p,n,'F3'))) for v in F3V}
    vals=[per[v][0] for v in F3_USED if per[v][0] is not None]; return sum(vals)/len(vals),per
def rate(f,pids):
    if f=='F3': return f3_agree(pids)[0],None
    return agree_single(f,pids)
SETS={'전체':pids_all}
for k in ['사례','관점','자료','기타']: SETS[k]=[p for p in pids_all if KEY[p]['audit_kind']==k]
def valstats(f,pids):
    cnt=collections.defaultdict(lambda:[0,0,0,0]); total=0
    for p in pids:
        for n in range(1,6):
            total+=1; vals=[val(j,p,n,f) for j in J]
            for v in set().union(*vals):
                k=sum(v in s for s in vals); c=cnt[v]; c[0]+=1; c[1]+=k==3; c[2]+=k>=2; c[3]+=k
    return total,{v:dict(any=c[0],all3=c[1],ge2=c[2],share=c[3]/3/total) for v,c in cnt.items()}
def maj(p,n,f):
    if f=='F3':
        vs=[v for v in F3V if sum(v in val(j,p,n,'F3') for j in J)>=2]; return vs or ['갈림']
    c=collections.Counter(next(iter(val(j,p,n,f))) for j in J).most_common(1)[0]; return [c[0] if c[1]>=2 else '갈림']
R=[];W=R.append
# ---- A 절: 시범 재집계(표 v2) 결과 파일을 그대로 붙인다 ----
A=open(P2+'REPORT-pilot-r2-v2.md').read().split('\n',1)[1]
W('# 규칙 감사: 시범 재집계(표 v2) + 2단계 본 감사 표시 1회 보고\n')
W('- 측정만 적는다. 뜻풀이·권고·규칙별 준수율은 쓰지 않는다. 스크립트 `main-r1/aggregate.py`·`pilot-r2/aggregate-v2.py`, 대응표 `main-r1/KEY-main-r1.json`(판정자에게는 주지 않음), 판정자 원문 `main-r1/judges/`.\n')
W('# A. 시범 재집계 (표 v2, 새 판정 없음)\n'); W(A.replace('\n## ','\n### ').replace('\n### 대조','\n### 대조') if False else A.replace('\n# ','\n## ').replace('\n## ','\n### ',1) if False else A.replace('\n## ','\n### ').replace('\n### ','\n#### ') if False else A.replace('\n## ','\n### '))
a_rates=json.load(open(P2+'aggregate-v2-out.json'))
W('### A 결론 (Ghootae 결정: 0.75 미만 칸은 B 집계에서 빼고 판정자 출력에는 남긴다)\n')
bad=[f for f in ['F3','F4b'] if a_rates['rates_pilot11'][f]<0.75]
W(f"- 시범 11 기준 F3 {a_rates['rates_pilot11']['F3']:.3f}, F4b {a_rates['rates_pilot11']['F4b']:.3f}. 0.75 미만 칸: {bad or '(없음)'}. 표 v2로 B를 진행했고 B 집계에서 뺀 칸: {bad or '(없음)'}.\n")
W('# B. 2단계 본 감사 표시\n')
W('## B-1. 문항 목록\n')
W('| 묶음 | 문항 키 | 감사 갈래 | 원 갈래·하위 형태 | 발문 | 출제 정답 | 사용 이력 | 애매 | 정답 시비 |\n|---|---|---|---|---|---|---|---|---|')
for p,k in KEY.items(): W(f"| {p} | {k['key']} | {k['audit_kind']} | {k['kind']}{('·'+k['subkind']) if k['subkind'] else ''} | {'부정(A)' if k['direction']=='A' else '긍정(B)'} | {k['official_answer']} | {', '.join(k['history'])} | {'애매' if k['ambiguous'] else ''} | {'정답 시비 있음' if k['answer_disputed'] else ''} |")
W('\n- 감사 갈래별 문항 수: '+', '.join(f"{c} {sum(1 for k in KEY.values() if k['audit_kind']==c)}" for c in ['사례','관점','자료','기타'])+f" (합 {len(KEY)}). 시범에 쓴 기출 6개(2024-09-평가원-6, 2024-06-평가원-10, 2023-11-수능-16, 2024-09-평가원-16, 2024-11-수능-13, 2025-09-평가원-17)도 표 v2로 새로 표시했다.\n")
W('## B-2. 글로 옮긴 〈보기〉·그림 목록\n')
tr=[(p,k) for p,k in KEY.items() if k['transcribed']]
W('| 묶음 | 문항 키 | 무엇을 옮겼나 |\n|---|---|---|')
for p,k in tr: W(f"| {p} | {k['key']} | {k['transcribed']} |")
W('\n- 나머지 문항은 DB 원본 글을 그대로 썼다(그림·표 없음).\n')
W('## B-3. 판정자 실행·형식\n')
W('- 나눈 방식: 판정자마다 새 세션 3번. M01~M09 / M10~M18 / M19~M26(9·9·8문항). 세션마다 새 임시 폴더에 해당 packet과 `MARKING-SCHEMA-v2.md`만 복사.')
W('- J1 첫 실행 기록: 지시 문장만 주었더니 J1이 packet 파일 이름을 몰라(폴더 목록 도구 없음) 문항 없이 "파일 경로를 알려 달라"고 답했다(`judges/J1-attempt0-promptonly/`, 판정 없음, 형식 실패로 세지 않음). 같은 지시 문장 뒤에 packet 파일 이름·폴더 경로를 덧붙여 새 세션으로 다시 돌린 결과만 집계했다. J2·J3는 해당 없음.')
for j in J: W(f"- {j}: 유효 {len(data[j])}/{len(KEY)}문항, 형식 실패(재질문 뒤) {len(FAIL[j])}개 {FAIL[j]}")
for fn in sorted(glob.glob(M+'judges/J*/raw-retry-*.txt')): W(f"- 재질문: `{fn.replace(M,'')}`")
W('\n### 판정자 답이 출제 정답과 다른 문항\n'); W('| 문항 | 문항 키 | 출제 정답 | J1 | J2 | J3 | 비고 |\n|---|---|---|---|---|---|---|'); nd=0
for p,k in KEY.items():
    ans=[data[j][p]['answer'] if p in data[j] else None for j in J]
    if any(a is not None and a!=k['official_answer'] for a in ans) or k['answer_disputed']:
        nd+=1; W(f"| {p} | {k['key']} | {k['official_answer']} | "+' | '.join('-' if a is None else str(a) for a in ans)+f" | {'정답 시비 있음' if k['answer_disputed'] else ''} |")
W('\n(답이 다른 문항의 표시도 일치율 계산에 넣었다. 2026-06-평가원-8은 정답 시비가 있는 문항으로 따로 표시했다.)\n')
W('## B-4. 칸별 일치율 (판정자 쌍 평균, 표 v2 규칙)\n')
excl=bad
W('F3 = 값 묶음 고름/안 고름 일치율의 값 평균(전체 26에서 한 번이라도 쓰인 값만). F4b = 1 / 2 이상. F6은 표 v2에서 뺐다. 판정은 PLAN 2-2 기준을 전체 26에 적용한 것(갈래별은 문항 수가 적어 참고).\n')
if excl: W(f"- 시범 11 기준 0.75 미만이라 B 집계에서 뺀 칸: {excl} (판정자 출력에는 남아 있음).\n")
W('| 칸 | 전체 26 | 사례 | 관점 | 자료 | 기타 | 쌍별(전체: J1-J2 / J1-J3 / J2-J3) | PLAN 2-2 판정(전체) |\n|---|---|---|---|---|---|---|---|')
allrate={}; rr={}
for f in CELLS:
    rr[f]={s:rate(f,ps) for s,ps in SETS.items()}; allrate[f]=rr[f]['전체'][0]
    pr=' / '.join(fmt(x) for x in rr[f]['전체'][1]) if rr[f]['전체'][1] else '-'
    W(f"| {f}{' (B 집계에서 뺌)' if f in excl else ''} | "+' | '.join(fmt(rr[f][s][0]) for s in SETS)+f" | {pr} | {verdict(allrate[f])} |")
W('\n'+' / '.join(f"{s} {len(ps)}문항" for s,ps in SETS.items())+'.\n')
W('### F3 값별 고름/안 고름 일치율 (판정자 쌍 평균)\n'); W('| 값 | '+' | '.join(SETS)+' |\n|---|'+'---|'*len(SETS))
per={s:f3_agree(ps)[1] for s,ps in SETS.items()}
for v in F3V: W(f'| {v} | '+' | '.join(fmt(per[s][v][0]) for s in SETS)+' |')
W('\n### 값별 일치 (전체 26 기준)\n')
W('- 한 명이라도 쓴 선지 중 셋 다 쓴 비율(셋 다), 둘 이상 쓴 비율(둘 이상). 점유 = 판정자 평균 사용 비율(F3은 한 선지가 값 2개면 둘 다 센다).\n')
rare=[]
for f in ['F2','F3','F4','F4b','F5','F7']:
    tot,st=valstats(f,pids_all); W(f'#### {f} (선지 {tot})\n'); W('| 값 | 셋 다 | 둘 이상 | 점유 |\n|---|---|---|---|')
    for v,d in sorted(st.items(),key=lambda x:-x[1]['share']):
        W(f"| {v} | {d['all3']/d['any']:.2f} ({d['all3']}/{d['any']}) | {d['ge2']/d['any']:.2f} ({d['ge2']}/{d['any']}) | {d['share']:.2f} |")
        if d['share']<0.10 and d['all3']/d['any']<0.5: rare.append((f,v,d['all3'],d['any'],d['share']))
    W('')
W('#### 드문 값(점유 10% 미만)이면서 셋 다 일치 0.5 미만 (전체 26)\n')
if rare:
    W('| 칸 | 값 | 셋 다 / 한 명↑ | 점유 |\n|---|---|---|---|')
    for f,v,a,b,s in rare: W(f'| {f} | {v} | {a}/{b} | {s:.2f} |')
else: W('(없음)')
W('')
# ---- OPTIONS-majority.csv ----
cols=['문항','문항 키','감사 갈래','발문','선지','출제 정답 여부']+CELLS+['갈림 칸']
with open(M+'OPTIONS-majority.csv','w',newline='') as fh:
    w=csv.writer(fh); w.writerow(cols)
    for p in pids_all:
        k=KEY[p]
        for n in range(1,6):
            mv={f:'+'.join(maj(p,n,f)) for f in CELLS}
            w.writerow([p,k['key'],k['audit_kind'],k['direction'],n,'정답' if n==k['official_answer'] else '',*[mv[f] for f in CELLS],' '.join(f for f in CELLS if '갈림' in mv[f].split('+'))])
W('## B-5. 선지별 다수값 표\n'); W('- `main-r1/OPTIONS-majority.csv` (선지 '+str(5*len(pids_all))+'줄: 문항, 문항 키, 감사 갈래, 발문, 선지 번호, 출제 정답 여부, F1·F2·F3·F4·F4b·F5·F7 다수값, 갈림 칸). F3은 둘 이상이 고른 값을 \'+\'로 잇고 없으면 \'갈림\'. F6은 표 v2에서 뺐다.\n')
# ---- 묶음 표 ----
W('## B-6. 묶음 표: 감사 갈래 × 발문\n')
W('다수값 기준(판정자 둘 이상 같은 값, 없으면 \'갈림\'; F3은 둘 이상이 고른 값마다 1씩, 없으면 \'갈림\' 1). 퍼센트는 해당 선지 수 대비.\n')
GR=collections.OrderedDict()
for c in ['사례','관점','자료','기타']:
    for d in 'AB':
        ps=[p for p in pids_all if KEY[p]['audit_kind']==c and KEY[p]['direction']==d]
        if ps: GR[f'{c} {d}']=ps
def dist(items,f,pred=None):
    c=collections.Counter(); tot=0
    for p in items:
        for n in range(1,6):
            if pred and not pred(p,n): continue
            tot+=1
            for v in maj(p,n,f): c[v]+=1
    return c,tot
def table(title,f,pred=None,order=None):
    W(f'### {title}\n'); res={g:dist(v,f,pred) for g,v in GR.items()}
    vals=sorted(set().union(*[set(c) for c,_ in res.values()]),key=lambda v:(order or []).index(v) if order and v in order else 99)
    W('| 값 | '+' | '.join(f'{g} ({len(GR[g])}문항, 선지 n={res[g][1]})' for g in GR)+' |\n|---|'+'---|'*len(GR))
    for v in vals: W(f'| {v} | '+' | '.join(f"{res[g][0][v]} ({res[g][0][v]/res[g][1]:.0%})" if res[g][1] else '-' for g in GR)+' |')
    W('')
table('B-6-1. F2 값 분포(전체 선지)','F2')
W('### B-6-2. 문항당 F2=지문만 선지 수(다수값 기준)\n'); W('| 묶음 | 문항 수 | 지문만 선지 합 | 문항당 평균 |\n|---|---|---|---|')
jm=lambda p,n:maj(p,n,'F2')==['지문만']
for g,v in GR.items():
    s=sum(1 for p in v for n in range(1,6) if jm(p,n)); W(f'| {g} | {len(v)} | {s} | {s/len(v):.2f} |')
W('')
table('B-6-3. F2=지문만 선지의 F3 값 분포','F3',jm,F3V)
table('B-6-4. F2=지문만 선지의 F4 분포','F4',jm)
table('B-6-5. F2=지문만 선지의 F4b 분포','F4b',jm)
fm=lambda p,n:maj(p,n,'F1')==['거짓']
table('B-6-6. 거짓 선지의 F3 값 분포','F3',fm,F3V)
table('B-6-7. 거짓 선지의 F4 분포','F4',fm)
table('B-6-8. 거짓 선지의 F5 분포','F5',fm)
# ---- 갈린 선지 ----
W('## B-7. 일치율 0.75 미만 칸의 갈린 선지 상위 5개\n')
W('대상 칸 = 전체 26 일치율이 0.75 미만인 칸. 선지는 갈림 정도(판정자 쌍 셋 중 값이 다른 쌍 수, 0~3) 큰 순, 같으면 문항·선지 번호 순. 값은 J1 / J2 / J3 순. F2a·note 원문 그대로.\n')
low=[f for f in CELLS if allrate[f] is not None and allrate[f]<0.75]
if not low: W('(없음)\n')
for f in low:
    rows=[]
    for p in pids_all:
        for n in range(1,6):
            v=[val(j,p,n,f) for j in J]; dis=sum(v[J.index(a)]!=v[J.index(b)] for a,b in pairs)
            if dis: rows.append((-dis,p,n,v))
    rows.sort(key=lambda r:(r[0],r[1],r[2])); W(f"### {f} (전체 26 {fmt(allrate[f])})\n")
    for d,p,n,v in rows[:5]:
        W(f"- **{p}({KEY[p]['key']}) {n}번** (갈린 쌍 {-d}/3) — 값: "+' / '.join(f"{j}={'+'.join(sorted(x))}" for j,x in zip(J,v)))
        for j in J: o=opt(j,p,n); W(f"  - {j} F2a: {o.get('F2a','')} | note: {o.get('note','')}")
    W('')
open(M+'REPORT-main-r1.md','w').write('\n'.join(R)+'\n')
json.dump({'rates_all26':allrate,'rates_by_kind':{f:{s:rr[f][s][0] for s in SETS} for f in CELLS},'verdict':{f:verdict(v) for f,v in allrate.items()},'rare_low_agree':rare,'format_failures':FAIL,'excluded_cells':excl},open(M+'aggregate-out.json','w'),ensure_ascii=False,indent=1)
print({f:round(v,3) for f,v in allrate.items()})
