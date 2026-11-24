# 순서표 ③-1 과학 칸 집계. 실행(저장소 루트): python3 docs/experiments/set-pattern-2026-11-18/cell3/aggregate.py
# 측정값만 적는다. 판정 이름(통과/거의/미달)·결론·규칙 후보는 쓰지 않는다(웹이 한다).
import json, re, collections
C='docs/experiments/set-pattern-2026-11-18/cell3/'; V5='docs/experiments/deep-item-v5-2026-11-18/'
SC={'수능 같음':2,'중':1,'수능 아님':0}
PIDS={'solid-catalyst':dict(gold='기출 10번',gen=['사례 A-V1','사례 A-V2','사례 B-V1','사례 B-V2'],raw={'사례 A-V1':('A','V1'),'사례 A-V2':('A','V2'),'사례 B-V1':('B','V1'),'사례 B-V2':('B','V2')}),
      'auxin-growth':dict(gold='기출 17번',gen=['그래프 A-V1','그래프 B-V1','표 A-V2','표 B-V2'],raw={'그래프 A-V1':('A','V1'),'표 A-V2':('A','V2'),'그래프 B-V1':('B','V1'),'표 B-V2':('B','V2')})}
def blocks(t): return json.loads(re.findall(r'```json\s*(.*?)```',t,re.S)[-1])
def kind(k): return k['source'].split(' (')[0]
ROW={}   # ROW[pid][run][name]
for pid in PIDS:
    ROW[pid]={}
    for run in ('r1','r2'):
        D=f'{C}blind/{pid}/'; KEY=json.load(open(D+f'KEY-{run}.json'))
        EV={i:{r['item']:r for r in blocks(open(D+f'REPORT-eval-{run}-{i}.md',encoding='utf8').read())} for i in range(1,5)}
        assert all(len(EV[i])==5 for i in EV),(pid,run,[len(EV[i]) for i in EV])
        ROW[pid][run]={}
        for k in KEY:
            it=k['item']; gs=[EV[i][it]['grade'] for i in EV]; ans=[EV[i][it]['answer'] for i in EV]
            ROW[pid][run][kind(k)]=dict(k=k,it=it,grades=gs,mean=sum(SC[g] for g in gs)/4,ok=sum(a==k['answer'] for a in ans),ans=ans,
              defects=collections.Counter(d for i in EV for d in (EV[i][it].get('defects') or [])),reasons=[EV[i][it]['reason'] for i in EV],
              gnotes=[EV[i][it].get('graphNote') or '' for i in EV],same=gs.count('수능 같음'),mid=gs.count('중'),no=gs.count('수능 아님'))
OUT=[]; W=OUT.append
W('# 순서표 ③-1 과학 칸 v6.2 집계 (자동 생성, 측정만)\n')
W('## a. 문항별 회차별 4회 등급·평균 (수능 같음 2, 중 1, 수능 아님 0)\n')
W('| 지문 | 문항 | 회차 | 라벨 | 정답 | 평가자1~4 등급 | 평균 | 같음/중/아님 | 정답 일치 | 평가자 답 | 결함 표시 빈도 |'); W('|---|---|---|---|---|---|---|---|---|---|---|')
for pid,cf in PIDS.items():
    for n in cf['gen']+[cf['gold']]:
        for run in ('r1','r2'):
            r=ROW[pid][run][n]; W(f"| {pid} | {n} | {run} | {r['it']} | {r['k']['answer']} | {' / '.join(r['grades'])} | {r['mean']:.2f} | {r['same']}/{r['mid']}/{r['no']} | {r['ok']}/4 | {' '.join(r['ans'])} | {dict(r['defects']) or '없음'} |")
def cellmean(pid,run,names): return sum(ROW[pid][run][n]['mean'] for n in names)/len(names)
CELLS=[('사례 칸 (solid-catalyst 4문항)','solid-catalyst',PIDS['solid-catalyst']['gen']),('그래프 칸 (auxin-growth 그래프 2문항)','auxin-growth',['그래프 A-V1','그래프 B-V1']),('(참고) 과학 표 (auxin-growth 표 2문항)','auxin-growth',['표 A-V2','표 B-V2'])]
W('\n## b. 칸 값 (WORKING-RULES 4-2, 값만)\n')
W('| 칸 | 회차 | 칸 평균 | 기출 평균 | D = 칸 평균 − 기출 평균 |'); W('|---|---|---|---|---|')
for lab,pid,names in CELLS:
    g=PIDS[pid]['gold']; cm={}; gm={}
    for run in ('r1','r2'):
        cm[run]=cellmean(pid,run,names); gm[run]=ROW[pid][run][g]['mean']; W(f"| {lab} | {run} | {cm[run]:.3f} | {gm[run]:.3f} | {cm[run]-gm[run]:+.3f} |")
    c=(cm['r1']+cm['r2'])/2; gg=(gm['r1']+gm['r2'])/2; W(f"| {lab} | **두 회차 평균** | **{c:.3f}** | **{gg:.3f}** | **{c-gg:+.3f}** |")
W('\n### 생성 문항별 \'수능 아님\' 횟수 (회차별·합), \'수능 같음\' 횟수는 참고')
W('| 지문 | 문항 | 아님 r1 | 아님 r2 | 아님 합 | 같음 r1 | 같음 r2 | 같음 합 |'); W('|---|---|---|---|---|---|---|---|')
for pid,cf in PIDS.items():
    for n in cf['gen']+[cf['gold']]:
        a=ROW[pid]['r1'][n]; b=ROW[pid]['r2'][n]; W(f"| {pid} | {n} | {a['no']} | {b['no']} | {a['no']+b['no']} | {a['same']} | {b['same']} | {a['same']+b['same']} |")
W('\n## c. 사례 칸 A형·B형 따로 (평균)\n')
W('| 형 | 문항 | r1 평균 | r2 평균 | 두 회차 평균 |'); W('|---|---|---|---|---|')
for lab,names in {'A형':['사례 A-V1','사례 A-V2'],'B형':['사례 B-V1','사례 B-V2']}.items():
    a=cellmean('solid-catalyst','r1',names); b=cellmean('solid-catalyst','r2',names); W(f"| {lab} | {', '.join(names)} | {a:.3f} | {b:.3f} | {(a+b)/2:.3f} |")
W('\n## d. 그래프 문항: 그림·읽기 판 탓 (평가자 이유·그래프 평 키워드 표시), 그래프 한 줄 평\n')
KW=r'납작|읽기 어렵|읽기 판|그림|기호|밀집|겹|시점|어색|부정확|표현|선분|꺾|가로축|축|곡선|눈금'
tot=collections.Counter()
for n in ['그래프 A-V1','그래프 B-V1','기출 17번']:
    for run in ('r1','r2'):
        r=ROW['auxin-growth'][run][n]; W(f"### {n} {run} (문항 {r['it']}, 등급 {r['grades']})"); hits=0
        for i in range(4):
            gl=r['gnotes'][i]; flag=bool(re.search(KW,gl)); hits+=flag
            W(f"- e{i+1} [{r['grades'][i]}] 이유: {r['reasons'][i]}"); W(f"  - 그래프 평: {gl or '(없음)'}  [키워드 일치: {'예' if flag else '아니오'}]")
        tot[n]+=hits; W(f"- 키워드 일치 평가자 수(그래프 평 기준): {hits}/4. 최종 분류는 원문을 읽고 보고서에서 한다.")
W(f"\n- 그림·읽기 판 키워드 일치 건수(두 회차 합, 평가자 8명 중): {dict(tot)}")
W('\n### 그래프 한 줄 평 분류 건수 (두 회차 합, 평가자 8명 중; 정규식 세기, 원문은 위)')
W('| 문항 | 그림 기호·축 제목 겹침·밀집(겹|밀집) | 읽기 판 \'x=수치\'가 그림에 없음(x=숫자) | 등급 이유가 그림·읽기 판을 탓함(그림|읽기 판|그래프) |'); W('|---|---|---|---|')
for n in ['그래프 A-V1','그래프 B-V1','기출 17번']:
    ov=xv=rs=0
    for run in ('r1','r2'):
        r=ROW['auxin-growth'][run][n]
        ov+=sum(bool(re.search(r'겹|밀집',g)) for g in r['gnotes']); xv+=sum(bool(re.search(r'x=\d',g)) for g in r['gnotes']); rs+=sum(bool(re.search(r'그림|읽기 판|그래프',t)) for t in r['reasons'])
    W(f'| {n} | {ov}/8 | {xv}/8 | {rs}/8 |')
W('\n## e. 다음 감사 칸 자료 (평가자 이유 속 "정답이 〈보기〉 한 단계 / 지문 한 문장" 지적, 문항별)\n')
KD=r'한 단계|한 열|한 문장|한 칸|한 줄|바로 정해|곧바로|직접 대응|하나의 관찰|하나만|단순|그대로'
for pid,cf in PIDS.items():
    for n in cf['gen']+[cf['gold']]:
        c2=sum(ROW[pid][run][n]['defects'].get('㉲',0) for run in ('r1','r2')); hit={run:[i+1 for i,t in enumerate(ROW[pid][run][n]['reasons']) if re.search(KD,t)] for run in ('r1','r2')}
        W(f"- {pid} {n}: ㉲ 표시 {c2}회(두 회차 합), 키워드 일치 평가자 r1 {hit['r1'] or '없음'} / r2 {hit['r2'] or '없음'} (합 {len(hit['r1'])+len(hit['r2'])}명)")
        for run in ('r1','r2'):
            for i in hit[run]: W(f"  - {run} e{i}: {ROW[pid][run][n]['reasons'][i-1]}")
W('\n### GN1 \'지문만\' 오답 자리 (생성 문항 8개)\n')
def items(pid,m,fname,ver):
    d=f'{V5}out-cell3-v62/{pid}-{m}/'; lf=d+'leakfix/items-leakfix.json'
    return d,[x for x in json.load(open(lf if fname=='final' and __import__('os').path.exists(lf) else d+({'final':'repair/items-final.json','raw':'items.json'}[fname])))['items'] if x['version']==ver][0]
for pid,cf in PIDS.items():
    for n in cf['gen']:
        m,v=cf['raw'][n]; d,it=items(pid,m,'final',v); ev=json.load(open(d+'repair/eval.json'))['before'][v]
        easy=[i+1 for i,x in enumerate(it['roles']) if x=='쉬움']
        W(f"- {pid} {n}: roles(선지1~5) {it['roles']}, 정답 {it['answer']}, 쉬움 자리 {easy}, 검사기 easyChoices {ev.get('easyChoices')}, bogiOnly {ev.get('bogiOnly')}")
W('\n## 문항별 평가자 이유 (한 줄씩)\n')
for pid,cf in PIDS.items():
    for n in cf['gen']+[cf['gold']]:
        for run in ('r1','r2'):
            r=ROW[pid][run][n]; W(f"- {pid} {n} {run} (문항 {r['it']}, 평균 {r['mean']:.2f}, 결함 {dict(r['defects']) or '없음'}):")
            for i,(gr,t) in enumerate(zip(r['grades'],r['reasons']),1): W(f"  - e{i} {gr}: {t}")
W('\n## 2문항 이상에서 반복된 결함 표시 (두 회차 합, 생성 8문항+기출 2문항)\n')
ca=collections.Counter(); cai=collections.defaultdict(set)
for pid,cf in PIDS.items():
    for n in cf['gen']+[cf['gold']]:
        for run in ('r1','r2'):
            for d,c in ROW[pid][run][n]['defects'].items(): ca[d]+=c; cai[d].add(f'{pid}:{n}')
W(f"- { {d:(ca[d],sorted(cai[d])) for d in ca} or '표시 없음'}")
W('\n## f. 생성 문항별 전략·GN1·수리·점검 경고\n')
for pid,cf in PIDS.items():
    for n in cf['gen']:
        m,v=cf['raw'][n]; d,it=items(pid,m,'raw',v)
        ev=json.load(open(d+'repair/eval.json'))['before'][v]; t=open(d+'3-assemble.md',encoding='utf8').read().split('\n')
        kc=json.load(open(d+'kind-check.json')).get(v,[]) if __import__('os').path.exists(d+'kind-check.json') else []
        sc=json.load(open(d+'scene-check.json')).get(v,[]) if __import__('os').path.exists(d+'scene-check.json') else []
        dc=json.load(open(d+'design-check.json')).get(v,[]) if __import__('os').path.exists(d+'design-check.json') else []
        lf=[x for x in json.load(open(d+'leakfix/items-leakfix.json'))['items'] if x['version']==v][0].get('leakfix',{}) if __import__('os').path.exists(d+'leakfix/items-leakfix.json') else {}
        W(f"- {pid} {n}: 정답 {it['answer']}, rival {it.get('rival')}, strategies {it['strategies']}, roles {it['roles']}, 정답 비튼 방식 {it.get('answerTwist')}")
        W(f"  - strategyUse: {json.dumps(it['strategyUse'],ensure_ascii=False)}")
        W(f"  - 3-assemble.md: GN1 언급 {sum('GN1' in l for l in t)}줄")
        for l in t:
            if 'GN1' in l: W(f"    · {l.strip()[:240]}")
        W(f"  - 수리 대상(repair) {ev['repair']}, 결함(defect) {ev['defect']}, 방식 위반 {ev['methodViolations']}, 전략 경고 {ev['strategyWarnings'] or '없음'}")
        W(f"  - 검사기 경고: {ev['warnings'] or '없음'}")
        W(f"  - kind-check: {json.dumps(kc,ensure_ascii=False) if kc else '없음'}")
        W(f"  - scene-check: {json.dumps(sc,ensure_ascii=False) if sc else '없음'}")
        W(f"  - design-check: {json.dumps(dc,ensure_ascii=False) if dc else '없음'}")
        W(f"  - 노출 수리(leakfix): {lf.get('status')}")
W('\n## 형식 실패·정답 불일치\n')
W(f"- 정답 불일치: { {(pid,run,n):(ROW[pid][run][n]['ok'],ROW[pid][run][n]['ans']) for pid,cf in PIDS.items() for run in ('r1','r2') for n in cf['gen']+[cf['gold']] if ROW[pid][run][n]['ok']<4} or '없음'}")
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(OUT)+'\n'); print('\n'.join(OUT))
