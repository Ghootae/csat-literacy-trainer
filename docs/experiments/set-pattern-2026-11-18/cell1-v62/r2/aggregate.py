# 순서표 ① 2회차 집계. 실행(저장소 루트): python3 docs/experiments/set-pattern-2026-11-18/cell1-v62/r2/aggregate.py
# 1회차 cell1-v62/aggregate.py의 a~e 그대로(경로만 r2) + f(GN1 점검, 1·2회차) + g(회차별 v6.2·앵커 평균).
# 측정값만 적는다. 판정 이름(통과/거의/미달)·결론·규칙 후보는 쓰지 않는다(웹이 한다).
import json, re, glob, collections, os
SP1='docs/experiments/set-pattern-2026-11-18/cell1-v62/'; SP=SP1+'r2/'; B=SP+'blind/'; V5='docs/experiments/deep-item-v5-2026-11-18/'
KEY=json.load(open(B+'KEY-cell1r2.json')); SC={'수능 같음':2,'중':1,'수능 아님':0}
PIDS={1:'information-asymmetry-free-marketplace',2:'gongsun-long-later-mohists'}; PN={1:'정보 비대칭(사회 관점)',2:'공손룡(인문 사례)'}
def blocks(t):
    m=re.findall(r'```json\s*(.*?)```',t,re.S); return json.loads(m[-1])
EV={}
for i in range(1,5): EV[i]={r['item']:r for r in blocks(open(B+f'REPORT-cell1r2-eval{i}.md',encoding='utf8').read())}
assert all(len(EV[i])==10 for i in EV), {i:len(EV[i]) for i in EV}
OUT=[]; W=OUT.append
def kind(k): return 'v6.2' if k['source'].startswith('v6.2') else 'v5 앵커' if k['source'].startswith('v5') else '기출'
def tag(k): return f"{k['source'].split(' (')[0]}"
ROW={}
for k in KEY:
    it=k['item']; gs=[EV[i][it]['grade'] for i in EV]; ans=[EV[i][it]['answer'] for i in EV]; df=collections.Counter(d for i in EV for d in EV[i][it].get('defects',[]) or [])
    ROW[it]=dict(k=k,kind=kind(k),grades=gs,mean=sum(SC[g] for g in gs)/4,ok=sum(a==k['answer'] for a in ans),defects=df,reasons=[EV[i][it]['reason'] for i in EV],ans=ans,
                 same=gs.count('수능 같음'),mid=gs.count('중'),no=gs.count('수능 아님'))
W('# 순서표 ① 2회차 v6.2 칸 집계 (자동 생성, 측정만)\n')
W('## a. 문항별 4회 등급·평균 (수능 같음 2, 중 1, 수능 아님 0)\n')
W('| 지문 | 문항 | 종류 | 정답 | 평가자1~4 등급 | 평균 | 같음/중/아님 | 정답 일치 | 결함 표시 빈도 |'); W('|---|---|---|---|---|---|---|---|---|')
for n in (1,2):
    for it,r in ROW.items():
        if r['k']['passage']!=n: continue
        W(f"| {PN[n]} | {it} | {r['k']['source']} | {r['k']['answer']} | {' / '.join(r['grades'])} | {r['mean']:.2f} | {r['same']}/{r['mid']}/{r['no']} | {r['ok']}/4 | {dict(r['defects']) or '없음'} |")
def pick(n,src):
    return [r for r in ROW.values() if r['k']['passage']==n and r['k']['source'].startswith(src)]
W('\n## b. 칸별 판정 값 (PLAN 4절, 값만)\n')
W('| 칸 | v6.2 A 아님 횟수 | v6.2 B 아님 횟수 | 같음 3회 이상 문항 수 | 기출 같음 횟수 |'); W('|---|---|---|---|---|')
for n in (1,2):
    a=pick(n,'v6.2 A')[0]; b=pick(n,'v6.2 B')[0]; g=pick(n,'기출')[0]
    W(f"| {PN[n]} | {a['no']} | {b['no']} | {(a['same']>=3)+(b['same']>=3)} (A {a['same']}, B {b['same']}) | {g['same']} |")
W('\n## c. 참고: v6.2 평균 대 같은 회차 앵커(v5) 평균\n')
W('| 칸 | v6.2 A | v6.2 B | v6.2 평균 | 앵커 A | 앵커 B | 앵커 평균 | 차이(v6.2−앵커) | 기출 평균 |'); W('|---|---|---|---|---|---|---|---|---|')
for n in (1,2):
    a=pick(n,'v6.2 A')[0]['mean']; b=pick(n,'v6.2 B')[0]['mean']; aa=pick(n,'v5 A')[0]['mean']; ab=pick(n,'v5 B')[0]['mean']; g=pick(n,'기출')[0]['mean']
    W(f"| {PN[n]} | {a:.2f} | {b:.2f} | {(a+b)/2:.2f} | {aa:.2f} | {ab:.2f} | {(aa+ab)/2:.2f} | {(a+b)/2-(aa+ab)/2:+.2f} | {g:.2f} |")
W('\n## d. 정보 B의 ㉳(정답 시비)와 평가자 이유\n')
for src in ('v6.2 B','v5 B'):
    r=pick(1,src)[0]; W(f"- 정보 {src}: ㉳ {r['defects'].get('㉳',0)}회, 등급 {r['grades']}, 정답 일치 {r['ok']}/4")
    for i,(g,t) in enumerate(zip(r['grades'],r['reasons']),1):
        d=EV[i][r['k']['item']].get('defects') or []
        W(f"  - 평가자{i} [{g}] 결함 {d or '없음'}: {t}")
    hit=[i for i,t in enumerate(r['reasons'],1) if re.search(r'더 |상대적|비교',t)]
    W(f"  - 이유에 '더 ~/상대적/비교' 낱말이 든 평가자: {hit or '없음'}")
W('\n## 문항별 평가자 이유 (한 줄씩)\n')
for n in (1,2):
    for it,r in ROW.items():
        if r['k']['passage']!=n: continue
        W(f"- [{PN[n]}] {it} {r['k']['source']} (평균 {r['mean']:.2f}, 결함 {dict(r['defects']) or '없음'}):")
        for i,(g,t) in enumerate(zip(r['grades'],r['reasons']),1): W(f"  - e{i} {g}: {t}")
W('\n## 2문항 이상에서 반복된 결함 표시(v6.2 문항만 / 전체)\n')
cv=collections.Counter(); cvi=collections.defaultdict(set); ca=collections.Counter(); cai=collections.defaultdict(set)
for it,r in ROW.items():
    for d,c in r['defects'].items():
        ca[d]+=c; cai[d].add(it)
        if r['kind']=='v6.2': cv[d]+=c; cvi[d].add(it)
W(f"- v6.2 4문항: { {d:(cv[d],sorted(cvi[d])) for d in cv} or '표시 없음'}")
W(f"- 10문항 전체: { {d:(ca[d],sorted(cai[d])) for d in ca} or '표시 없음'}")
W('\n## e. v6.2 문항별 전략·GN1·KC2·수리·관점 방식 경고\n')
for n in (1,2):
    for m in 'AB':
        d=f'{V5}out-cell1-v62-r2/{PIDS[n]}-{m}/'; it=json.load(open(d+'items.json'))['items'][0]; ev=json.load(open(d+'repair/eval.json'))['before']['V1']
        t=open(d+'3-assemble.md',encoding='utf8').read().split('\n'); lab=[r['k']['item'] for r in ROW.values() if r['k']['passage']==n and r['k']['source']==f'v6.2 {m}-V1'][0]
        W(f"- [{PN[n]}] {m}형 (문항 {lab}): 정답 {it['answer']}, rival {it.get('rival')}, strategies {it['strategies']}, roles {it['roles']}, 정답 비튼 방식 {it.get('answerTwist')}")
        W(f"  - strategyUse: {json.dumps(it['strategyUse'],ensure_ascii=False)}")
        W(f"  - 3-assemble.md: GN1 언급 {sum('GN1' in l for l in t)}줄, KC2 언급 {sum('KC2' in l for l in t)}줄, S13 언급 {sum('S13' in l for l in t)}줄")
        for l in t:
            if 'GN1' in l or 'S13' in l: W(f"    · {l.strip()[:240]}")
        W(f"  - 수리 대상(repair) {ev['repair']}, 결함(defect) {ev['defect']}, 방식 위반 {ev['methodViolations']} {ev.get('methodDetails') or ''}, 전략 경고 {ev['strategyWarnings'] or '없음'}")
        W(f"  - 경고: {ev['warnings'] or '없음'}")
        W(f"  - 〈보기〉쉬움 자리(easyChoices) {ev.get('easyChoices')}, bogiOnly {ev.get('bogiOnly')}")
        lf=json.load(open(d+'leakfix/items-leakfix.json'))['items'][0].get('leakfix',{}); W(f"  - 노출 수리(leakfix): {lf.get('status')}")
# f. GN1 점검: 1·2회차 v6.2 문항별 검사기 easyChoices(〈보기〉 없이 지문 한 사실로 지워지는 오답) 수와 평가자 ㉯ 횟수
KEY1=json.load(open(SP1+'blind/KEY-cell1.json')); EV1={i:{r['item']:r for r in blocks(open(SP1+f'blind/REPORT-cell1-eval{i}.md',encoding='utf8').read())} for i in range(1,5)}
def stats(key,ev,base):
    rows={}
    for k in key:
        it=k['item']; gs=[ev[i][it]['grade'] for i in ev]
        rows[(k['pid'],k['source'])]=dict(item=it,mean=sum(SC[g] for g in gs)/4,g=gs,yu=sum('㉯' in (ev[i][it].get('defects') or []) for i in ev))
    return rows
R1=stats(KEY1,EV1,'out-cell1-v62'); R2=stats(KEY,EV,'out-cell1-v62-r2')
W('\n## f. GN1 점검 (〈보기〉 없이 풀리는 선지: 검사기 easyChoices 수 / 평가자 ㉯ 횟수, 2개 이상 또는 ㉯ 2회 이상이면 ⚠)\n')
W('| 회차 | 칸 | 형 | 블라인드 문항 | 검사기 easyChoices | 그중 출제 역할 "쉬움" | 평가자 ㉯ | 표시 |'); W('|---|---|---|---|---|---|---|---|')
for rn,base,RR in (('1회차','out-cell1-v62',R1),('2회차','out-cell1-v62-r2',R2)):
    for n in (1,2):
        for m in 'AB':
            d=f'{V5}{base}/{PIDS[n]}-{m}/'; ev=json.load(open(d+'repair/eval.json'))['before']['V1']; it=json.load(open(d+'items.json'))['items'][0]
            ez=ev.get('easyChoices') or []; roles=it.get('roles') or []; ezr=[c for c in ez if len(roles)>=c and roles[c-1]=='쉬움']
            r=RR[(PIDS[n],f'v6.2 {m}-V1')]
            W(f"| {rn} | {PN[n]} | {m} | {r['item']} | {len(ez)} {ez} | {len(ezr)} | {r['yu']}/4 | {'⚠' if len(ez)>=2 or r['yu']>=2 else ''} |")
W('\n- 출처: 검사기 = repair/eval.json before.V1.easyChoices(eval-repair.mjs 121행, 정답 아닌 선지 중 지문 한 사실로 지워지는 것). 재생성(-regen) 문항이 있으면 이 표는 원 생성본 기준.')
# g. 회차별 v6.2·앵커·기출 평균
W('\n## g. 1·2회차 v6.2 문항과 앵커·기출 평균 (회차별 앵커 변화 = 평가자 엄하기 참고)\n')
W('| 칸 | 출처 | 1회차 평균 (등급) | 2회차 평균 (등급) | 변화 |'); W('|---|---|---|---|---|')
def ab(g): return f"{g.count('수능 같음')}/{g.count('중')}/{g.count('수능 아님')}"
for n in (1,2):
    srcs=[s for s in ('v6.2 A-V1','v6.2 B-V1','v5 A-V1 (out-gen62)','v5 B-V1 (out-gen62)')]+[k['source'] for k in KEY if k['passage']==n and k['source'].startswith('기출')]
    for s in srcs:
        a=R1[(PIDS[n],s)]; b=R2[(PIDS[n],s)]
        W(f"| {PN[n]} | {s}{' (문항 다름)' if s.startswith('v6.2') else ''} | {a['mean']:.2f} ({ab(a['g'])}) | {b['mean']:.2f} ({ab(b['g'])}) | {b['mean']-a['mean']:+.2f} |")
    for lab,pre in (('v6.2 평균','v6.2'),('앵커 평균','v5')):
        a=[R1[(PIDS[n],s)]['mean'] for s in srcs if s.startswith(pre)]; b=[R2[(PIDS[n],s)]['mean'] for s in srcs if s.startswith(pre)]
        W(f"| {PN[n]} | **{lab}** | {sum(a)/2:.2f} | {sum(b)/2:.2f} | {sum(b)/2-sum(a)/2:+.2f} |")
# 형식 실패 수: 평가자 JSON 항목 수, 정답 불일치
W('\n## 형식 실패·정답 불일치\n')
W(f"- 평가자 JSON 10문항 완결: {[len(EV[i]) for i in EV]} (형식 실패 0이면 모두 10)")
W(f"- 정답 불일치: { {it:(r['ok'],r['ans']) for it,r in ROW.items() if r['ok']<4} or '없음'}")
open(SP+'aggregate-out.md','w',encoding='utf8').write('\n'.join(OUT)+'\n'); print('\n'.join(OUT))
