# 1단계 시범 집계. 실행: python3 pilot-r1/aggregate.py (저장소 루트에서). 판정자 원문(judges/J*/raw*.txt)을 읽어 JSON을 뽑고 검사·집계한다.
import json, re, os, glob, itertools, collections, sys
P1='docs/experiments/rule-audit-2026-11-23/pilot-r1/'
KEY=json.load(open(P1+'KEY-pilot-r1.json'))
J=['J1','J2','J3']
OK={'F1':{'참','거짓','판정 불가','애매'},'F2':{'지문만','〈보기〉만','둘 다','둘 없이도 가능','판정 불가','애매'},
 'F3':{'정의·주장','조건·범위·예외','이유·인과','비교·귀속','개별 사실','애매'},'F4':{'명시된 내용 확인','대응·분류','관계 적용','조건 결합','애매'},
 'F5':{'뒤집기','범위 넓히기','조건 바꾸기','원인 바꾸기','대상 바꾸기','단계 바꾸기','귀속 바꾸기','예외 만들기','짝 바꾸기','복수','기타','애매','해당 없음'},
 'F6':{'전부','일부','없음','애매'},'F7':{'없음','사실 변경','추가','애매'}}
SINGLE=['F1','F2','F4','F5','F6','F7']
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
        if not isinstance(f3,list) or not f3 or any(v not in OK['F3'] for v in f3): errs.append(f"n{x.get('n')}.F3={f3!r}")
    return errs
def load(j):
    items={}; bad={}
    for fn in sorted(glob.glob(P1+f'judges/{j}/raw*.txt')):
        for o in extract(open(fn).read()):
            e=validate(o); pid=o.get('packet_id')
            if not e: items[pid]=o; bad.pop(pid,None)
            elif pid not in items: bad[pid]=e
    return items,bad
data={}; fails={}
for j in J: data[j],fails[j]=load(j)
if '--check' in sys.argv:
    for j in J: print(j,'유효',sorted(data[j]),'실패',fails[j])
    sys.exit()
def group(pid): return KEY[pid]['source']
def optrows(pid):  # 판정자 셋이 모두 유효한 문항만 쌍 계산에 쓰되, 쌍마다 그 쌍이 모두 유효한 문항을 쓴다
    return [x for x in range(1,6)]
pairs=list(itertools.combinations(J,2))
sets={'전체':list(KEY),'기출':[p for p in KEY if KEY[p]['source']=='기출'],'생성':[p for p in KEY if KEY[p]['source']=='생성']}
def opt(j,pid,n): return data[j][pid]['options'][n-1]
def pair_agree(f,pids):
    res=[]
    for a,b in pairs:
        t=m=0
        for p in pids:
            if p in data[a] and p in data[b]:
                for n in range(1,6): t+=1; m+= opt(a,p,n)[f]==opt(b,p,n)[f]
        res.append(m/t if t else None)
    v=[r for r in res if r is not None]; return (sum(v)/len(v) if v else None),res
def f3_value_agree(v,pids):
    res=[]
    for a,b in pairs:
        t=m=0
        for p in pids:
            if p in data[a] and p in data[b]:
                for n in range(1,6): t+=1; m+=((v in opt(a,p,n)['F3'])==(v in opt(b,p,n)['F3']))
        res.append(m/t if t else None)
    r=[x for x in res if x is not None]; return sum(r)/len(r) if r else None
def jaccard(pids):
    res=[]
    for a,b in pairs:
        s=[];
        for p in pids:
            if p in data[a] and p in data[b]:
                for n in range(1,6):
                    x=set(opt(a,p,n)['F3']); y=set(opt(b,p,n)['F3']); s.append(len(x&y)/len(x|y))
        res.append(sum(s)/len(s) if s else None)
    r=[x for x in res if x is not None]; return sum(r)/len(r) if r else None
def verdict(r): return '-' if r is None else ('유지(≥0.75)' if r>=0.75 else ('정의 고침(0.60~0.75)' if r>=0.60 else '합치거나 뺌(<0.60)'))
def fmt(x): return '-' if x is None else f'{x:.3f}'
def valstats(f,pids):  # 값별: 한 명이라도 쓴 선지 중 셋 다 / 둘 이상 / 전체 선지에서 차지 비율
    cnt=collections.defaultdict(lambda:[0,0,0,0,0]) # any, all3, >=2, usage sum(judge-uses), options
    total=0
    for p in pids:
        if not all(p in data[j] for j in J): continue
        for n in range(1,6):
            total+=1
            vals=[set(opt(j,p,n)['F3']) if f=='F3' else {opt(j,p,n)[f]} for j in J]
            for v in set().union(*vals):
                k=sum(v in s for s in vals); c=cnt[v]; c[0]+=1; c[1]+=k==3; c[2]+=k>=2; c[3]+=k
    return total,{v:dict(any=c[0],all3=c[1],ge2=c[2],share_any=c[0]/total,share_mean=c[3]/3/total) for v,c in cnt.items()}
R=[];W=R.append
W('# 규칙 감사 1단계 시범 1회차 보고 (표시 항목 표 v0)\n')
W('- 이 보고는 측정만 적는다. 뜻풀이·권고는 쓰지 않는다. 집계 스크립트: `pilot-r1/aggregate.py`, 판정자 원문: `pilot-r1/judges/J1·J2·J3/`, 대응표: `pilot-r1/KEY-pilot-r1.json`.\n')
W('## 1. 시범 문항 목록\n')
W('| 묶음 | 칸 | 문항 키 | 출처 | 갈래 | 발문 | 출제 정답 |\n|---|---|---|---|---|---|---|')
for p,k in KEY.items(): W(f"| {p} | {k['cell']} | {k['key']} | {k['source']} | {k['kind']} | {'부정(A)' if k['direction']=='A' else '긍정(B)'} | {k['official_answer']} |")
W('\n- 칸(자료A 생성) 비어 있음: 자료A 칸에 맞는 6.2 생성 문항이 없다. 묶음은 11개, 선지는 55개다(지시문은 12개·60선지).')
W('')
W('## 2. 판정자 형식·답\n')
for j in J: W(f"- {j}: 유효 {len(data[j])}/{len(KEY)}문항, 형식 실패 {len([p for p in KEY if p not in data[j]])}개 {sorted(p for p in KEY if p not in data[j])}")
for fn in sorted(glob.glob(P1+'judges/J*/raw-retry-*.txt')): W(f"- 재질문: `{fn.replace(P1,'')}` (첫 출력이 형식 밖이라 그 문항만 새 세션으로 한 번 다시 물음. 첫 출력의 P01 answer=null)")
W('- 보고용 형식 실패(재질문 뒤에도 실패): J1 0 / J2 0 / J3 0')
W('')
W('### 판정자 답이 출제 정답과 다른 문항\n'); W('| 묶음 | 문항 키 | 출처 | 출제 정답 | J1 | J2 | J3 |\n|---|---|---|---|---|---|---|'); diffn=0
for p,k in KEY.items():
    ans=[data[j][p]['answer'] if p in data[j] else None for j in J]
    if any(a is not None and a!=k['official_answer'] for a in ans):
        diffn+=1; W(f"| {p} | {k['key']} | {k['source']} | {k['official_answer']} | "+' | '.join('-' if a is None else str(a) for a in ans)+' |')
if not diffn: W('| (없음) | | | | | | |')
W('\n(답이 다른 문항의 표시도 일치율 계산에 넣었다.)\n')
W('## 3. 칸별 일치율\n')
W('판정자 쌍 셋(J1-J2, J1-J3, J2-J3)의 선지 단위 일치율 평균. 판정 칸 = 전체 기준. 선지 수는 쌍마다 유효 문항×5.\n')
W('| 칸 | 전체 | 기출 | 생성 | 쌍별(전체: J1-J2 / J1-J3 / J2-J3) | PLAN 2-2 판정(전체) |\n|---|---|---|---|---|---|')
cellrate={}
for f in SINGLE:
    r={s:pair_agree(f,ps) for s,ps in sets.items()}; cellrate[f]=r['전체'][0]
    W(f"| {f} | {fmt(r['전체'][0])} | {fmt(r['기출'][0])} | {fmt(r['생성'][0])} | "+' / '.join(fmt(x) for x in r['전체'][1])+f" | {verdict(r['전체'][0])} |")
# F3
vals=['정의·주장','조건·범위·예외','이유·인과','비교·귀속','개별 사실','애매']
f3={s:{v:f3_value_agree(v,ps) for v in vals} for s,ps in sets.items()}
f3m={s:sum(x for x in f3[s].values() if x is not None)/len([x for x in f3[s].values() if x is not None]) for s in sets}
W(f"| F3 (값 6개 고름/안 고름 일치율 평균) | {fmt(f3m['전체'])} | {fmt(f3m['기출'])} | {fmt(f3m['생성'])} | - | {verdict(f3m['전체'])} |")
W(f"| F3 (자카드 평균, 참고) | {fmt(jaccard(sets['전체']))} | {fmt(jaccard(sets['기출']))} | {fmt(jaccard(sets['생성']))} | - | (판정 안 함) |")
cellrate['F3']=f3m['전체']
# (보조) F5: 한 명이라도 거짓으로 본 선지
def f5_false_only():
    out={}
    for s,ps in sets.items():
        res=[]
        for a,b in pairs:
            t=m=0
            for p in ps:
                if p in data[a] and p in data[b] and all(p in data[j] for j in J):
                    for n in range(1,6):
                        if any(opt(j,p,n)['F1']=='거짓' for j in J): t+=1; m+=opt(a,p,n)['F5']==opt(b,p,n)['F5']
            res.append(m/t if t else None)
        r=[x for x in res if x is not None]; out[s]=(sum(r)/len(r) if r else None)
    return out
fo=f5_false_only()
W(f"| (보조) F5, 한 명이라도 F1을 거짓으로 본 선지만 | {fmt(fo['전체'])} | {fmt(fo['기출'])} | {fmt(fo['생성'])} | - | (판정 안 함) |")
W('\n### F3 값별 고름/안 고름 일치율\n'); W('| 값 | 전체 | 기출 | 생성 |\n|---|---|---|---|')
for v in vals: W(f"| {v} | {fmt(f3['전체'][v])} | {fmt(f3['기출'][v])} | {fmt(f3['생성'][v])} |")
W('\n## 4. 값별 일치\n')
W('- 한 명이라도 그 값을 쓴 선지 중: 셋 다 쓴 비율(셋 다), 둘 이상 쓴 비율(둘 이상). 점유 = 전체 선지 중 그 값을 쓴 판정자 평균 비율(판정자 3명의 사용 횟수 합 ÷ 3 ÷ 선지 수). 한 명이라도 쓴 선지 비율(한 명↑)도 적는다.')
W('- 선지 수는 셋 모두 유효한 문항×5.\n')
rare=[]
for f in SINGLE+['F3']:
    W(f'### {f}\n'); W('| 값 | 전체 셋 다 | 전체 둘 이상 | 전체 점유 | 전체 한 명↑ | 기출 셋 다 | 기출 점유 | 생성 셋 다 | 생성 점유 |\n|---|---|---|---|---|---|---|---|---|')
    st={s:valstats(f,ps) for s,ps in sets.items()}
    allv=sorted(set().union(*[set(st[s][1]) for s in sets]),key=lambda v:-st['전체'][1].get(v,{}).get('share_mean',0))
    for v in allv:
        g=lambda s,k: st[s][1].get(v,{}).get(k)
        def pc(x,n=None): return '-' if x is None else f'{x:.2f}'
        def tri(s):
            d=st[s][1].get(v);
            return '-' if not d else f"{d['all3']/d['any']:.2f} ({d['all3']}/{d['any']})"
        d=st['전체'][1].get(v)
        ge2='-' if not d else '%.2f (%d/%d)'%(d['ge2']/d['any'],d['ge2'],d['any'])
        W(f"| {v} | {tri('전체')} | {ge2} | {pc(g('전체','share_mean'))} | {pc(g('전체','share_any'))} | {tri('기출')} | {pc(g('기출','share_mean'))} | {tri('생성')} | {pc(g('생성','share_mean'))} |")
        if d and d['share_mean']<0.10 and d['all3']/d['any']<0.5: rare.append((f,v,d['all3'],d['any'],d['share_mean']))
    W('')
W('### 드문 값(점유 10% 미만)이면서 셋 다 일치 0.5 미만\n')
if rare:
    W('| 칸 | 값 | 셋 다 / 한 명↑ | 점유 |\n|---|---|---|---|')
    for f,v,a,b,s in rare: W(f'| {f} | {v} | {a}/{b} | {s:.2f} |')
else: W('(없음)')
W('')
# 갈린 선지 상위 5
W('## 5. 일치율 0.75 미만 칸의 갈린 선지 상위 5개\n')
W('갈림 정도 = 그 칸에서 판정자 쌍 셋 중 서로 다른 쌍의 수(0~3), 같으면 문항·선지 번호 순. 아래 값은 J1 / J2 / J3 순서. F2a·note는 원문 그대로.\n')
low=[f for f in SINGLE+['F3'] if cellrate[f] is not None and cellrate[f]<0.75]
if not low: W('(0.75 미만인 칸 없음)\n')
for f in low:
    rows=[]
    for p in KEY:
        if not all(p in data[j] for j in J): continue
        for n in range(1,6):
            v=[opt(j,p,n)[f] for j in J]
            key=lambda x: tuple(sorted(x)) if isinstance(x,list) else x
            dis=sum(key(a)!=key(b) for a,b in pairs)
            if dis: rows.append((-dis,p,n,v))
    rows.sort(key=lambda r:(r[0],r[1],r[2]))
    W(f'### {f} (전체 {fmt(cellrate[f])})\n')
    for d,p,n,v in rows[:5]:
        W(f"- **{p} ①~⑤ 중 {n}번** (갈린 쌍 {-d}/3) — 값: "+' / '.join(f'{j}={x}' for j,x in zip(J,v)))
        for j in J:
            o=opt(j,p,n); W(f"  - {j} F2a: {o.get('F2a','')} | note: {o.get('note','')}")
    W('')
open(P1+'REPORT-pilot-r1.md','w').write('\n'.join(R)+'\n')
json.dump({'cell_rates':cellrate,'verdict':{f:verdict(cellrate[f]) for f in cellrate},'rare_low_agree':rare,'format_failures':{j:sorted(p for p in KEY if p not in data[j]) for j in J}},open(P1+'aggregate-out.json','w'),ensure_ascii=False,indent=1)
print({f:(None if v is None else round(v,3)) for f,v in cellrate.items()})
