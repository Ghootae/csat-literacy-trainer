# 순서표 ② 칸 집계. 실행(저장소 루트): python3 docs/experiments/set-pattern-2026-11-18/cell2/aggregate.py
# 측정값만 적는다. 판정 이름(통과/거의/미달)·결론·규칙 후보는 쓰지 않는다(웹이 한다).
import json, re, collections
C='docs/experiments/set-pattern-2026-11-18/cell2/'; B=C+'blind/'; V5='docs/experiments/deep-item-v5-2026-11-18/'
KEY=json.load(open(B+'KEY-cell2.json')); SC={'수능 같음':2,'중':1,'수능 아님':0}
def blocks(t): return json.loads(re.findall(r'```json\s*(.*?)```',t,re.S)[-1])
EV={i:{r['item']:r for r in blocks(open(B+f'REPORT-cell2-eval{i}.md',encoding='utf8').read())} for i in range(1,5)}
assert all(len(EV[i])==5 for i in EV)
OUT=[]; W=OUT.append
def kind(k): return k['source'].split(' (')[0]
ROW={}
for k in KEY:
    it=k['item']; gs=[EV[i][it]['grade'] for i in EV]; ans=[EV[i][it]['answer'] for i in EV]; df=collections.Counter(d for i in EV for d in (EV[i][it].get('defects') or []))
    ROW[kind(k)]=dict(k=k,it=it,grades=gs,mean=sum(SC[g] for g in gs)/4,ok=sum(a==k['answer'] for a in ans),defects=df,ans=ans,
        reasons=[EV[i][it]['reason'] for i in EV],gnotes=[EV[i][it].get('graphNote') or '' for i in EV],same=gs.count('수능 같음'),mid=gs.count('중'),no=gs.count('수능 아님'))
ORD=['표 A-V1','표 B-V1','그래프 A-V2','그래프 B-V2','기출 12번']
W('# 순서표 ② 경제 표·그래프 v6.2 칸 집계 (자동 생성, 측정만)\n')
W('## a. 문항별 4회 등급·평균 (수능 같음 2, 중 1, 수능 아님 0)\n')
W('| 문항 | 라벨 | 정답 | 평가자1~4 등급 | 평균 | 같음/중/아님 | 정답 일치 | 평가자 답 | 결함 표시 빈도 |'); W('|---|---|---|---|---|---|---|---|---|')
for n in ORD:
    r=ROW[n]; W(f"| {n} | {r['it']} | {r['k']['answer']} | {' / '.join(r['grades'])} | {r['mean']:.2f} | {r['same']}/{r['mid']}/{r['no']} | {r['ok']}/4 | {' '.join(r['ans'])} | {dict(r['defects']) or '없음'} |")
W('\n## b. 칸별 판정 값 (PLAN 5절, 값만)\n')
W('| 칸 | A 아님 횟수 | B 아님 횟수 | 같음 3회 이상 문항 수 | 기출 같음 횟수 |'); W('|---|---|---|---|---|')
g=ROW['기출 12번']
for cell,(a,b) in {'표 칸':('표 A-V1','표 B-V1'),'그래프 칸':('그래프 A-V2','그래프 B-V2')}.items():
    A=ROW[a]; Bq=ROW[b]; W(f"| {cell} | {A['no']} | {Bq['no']} | {(A['same']>=3)+(Bq['same']>=3)} (A {A['same']}, B {Bq['same']}) | {g['same']} |")
W('\n## c. 그림·읽기 판을 탓한 평가자 지적 (그래프 3문항, 평가자 이유·그래프 평 원문과 키워드 표시)\n')
KW=r'납작|읽기 어렵|읽기 판|그림|기호|밀집|겹|접함|시점|어색|부정확|설명|표현|선분|꺾|가로축|축'
for n in ['그래프 A-V2','그래프 B-V2','기출 12번']:
    r=ROW[n]; W(f"### {n} (문항 {r['it']}, 등급 {r['grades']})")
    hits=0
    for i in range(4):
        gl=r['gnotes'][i]; rs=r['reasons'][i]; flag=bool(re.search(KW,gl))
        hits+=flag
        W(f"- e{i+1} [{r['grades'][i]}] 이유: {rs}"); W(f"  - 그래프 평: {gl or '(없음)'}  [키워드 일치: {'예' if flag else '아니오'}]")
    W(f"- 키워드 일치 평가자 수(그래프 평 기준): {hits}/4. 그림·읽기 판 탓 여부의 최종 분류는 원문을 읽고 보고서에서 한다.")
W('\n## d. 다음 감사 칸 자료 (평가자 이유 속 "정답이 〈보기〉 한 단계 / 지문 한 문장" 지적, 문항별)\n')
KD=r'한 단계|한 열|한 문장|한 칸|한 줄|바로 정해|곧바로|직접 대응|하나의 관찰|하나만|단순|그대로'
for n in ORD:
    r=ROW[n]; hit=[i+1 for i,t in enumerate(r['reasons']) if re.search(KD,t)]
    W(f"- {n} (문항 {r['it']}): ㉲ 표시 {r['defects'].get('㉲',0)}회, 키워드({KD}) 일치 평가자 {hit or '없음'}")
    for i,t in enumerate(r['reasons'],1):
        if i in hit: W(f"  - e{i}: {t}")
W('\n### GN1 \'지문만\' 오답 자리 (생성 문항 4개)\n')
for n,(m,v) in {'표 A-V1':('A','V1'),'그래프 A-V2':('A','V2'),'표 B-V1':('B','V1'),'그래프 B-V2':('B','V2')}.items():
    d=f'{V5}out-cell2-v62/tax-incidence-excise-{m}/'; it=[x for x in json.load(open(d+'leakfix/items-leakfix.json'))['items'] if x['version']==v][0]
    ev=json.load(open(d+'repair/eval.json'))['before'][v]
    easy=[i+1 for i,x in enumerate(it['roles']) if x=='쉬움']
    W(f"- {n}: roles(선지1~5) {it['roles']}, 정답 {it['answer']}, 쉬움 자리 {easy}, 검사기 easyChoices {ev.get('easyChoices')}, bogiOnly {ev.get('bogiOnly')}")
W('\n## 문항별 평가자 이유 (한 줄씩)\n')
for n in ORD:
    r=ROW[n]; W(f"- {n} (문항 {r['it']}, 평균 {r['mean']:.2f}, 결함 {dict(r['defects']) or '없음'}):")
    for i,(gr,t) in enumerate(zip(r['grades'],r['reasons']),1): W(f"  - e{i} {gr}: {t}")
W('\n## 2문항 이상에서 반복된 결함 표시\n')
ca=collections.Counter(); cai=collections.defaultdict(set)
for n in ORD:
    for d,c in ROW[n]['defects'].items(): ca[d]+=c; cai[d].add(n)
W(f"- 5문항 전체: { {d:(ca[d],sorted(cai[d])) for d in ca} or '표시 없음'}")
W('\n## e. 생성 문항별 전략·GN1·수리·표 칸 점검 경고\n')
for n,(m,v) in {'표 A-V1':('A','V1'),'그래프 A-V2':('A','V2'),'표 B-V1':('B','V1'),'그래프 B-V2':('B','V2')}.items():
    d=f'{V5}out-cell2-v62/tax-incidence-excise-{m}/'; it=[x for x in json.load(open(d+'items.json'))['items'] if x['version']==v][0]
    ev=json.load(open(d+'repair/eval.json'))['before'][v]; t=open(d+'3-assemble.md',encoding='utf8').read().split('\n')
    kc=json.load(open(d+'kind-check.json')).get(v,[]); sc=json.load(open(d+'scene-check.json')).get(v,[]); dc=json.load(open(d+'design-check.json')).get(v,[])
    lf=[x for x in json.load(open(d+'leakfix/items-leakfix.json'))['items'] if x['version']==v][0].get('leakfix',{})
    W(f"- {n}: 정답 {it['answer']}, rival {it.get('rival')}, strategies {it['strategies']}, roles {it['roles']}, 정답 비튼 방식 {it.get('answerTwist')}")
    W(f"  - strategyUse: {json.dumps(it['strategyUse'],ensure_ascii=False)}")
    W(f"  - 3-assemble.md: GN1 언급 {sum('GN1' in l for l in t)}줄")
    for l in t:
        if 'GN1' in l: W(f"    · {l.strip()[:240]}")
    W(f"  - 수리 대상(repair) {ev['repair']}, 결함(defect) {ev['defect']}, 방식 위반 {ev['methodViolations']}, 전략 경고 {ev['strategyWarnings'] or '없음'}")
    W(f"  - 검사기 경고: {ev['warnings'] or '없음'}")
    W(f"  - kind-check(표: 같은 행 = 같은 변수·결과 행 금지 / 그래프: 읽기 판): {json.dumps(kc,ensure_ascii=False) if kc else '없음'}")
    W(f"  - scene-check: {json.dumps(sc,ensure_ascii=False) if sc else '없음'}")
    W(f"  - design-check: {json.dumps(dc,ensure_ascii=False) if dc else '없음'}")
    W(f"  - 노출 수리(leakfix): {lf.get('status')}")
W('\n## 형식 실패·정답 불일치\n')
W(f"- 평가자 JSON 5문항 완결: {[len(EV[i]) for i in EV]}")
W(f"- 정답 불일치: { {n:(ROW[n]['ok'],ROW[n]['ans']) for n in ORD if ROW[n]['ok']<4} or '없음'}")
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(OUT)+'\n'); print('\n'.join(OUT))
