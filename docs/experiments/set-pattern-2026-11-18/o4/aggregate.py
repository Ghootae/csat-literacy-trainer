# 순서표 ④ 2단계 집계. 실행(저장소 루트): python3 docs/experiments/set-pattern-2026-11-18/o4/aggregate.py
# 측정값만 적는다(자격 기출 1.5 미만 회차는 '멈춤' 표시, WORKING-RULES 4-3). 통과/거의/미달 판정·결론은 쓰지 않는다(웹이 한다).
# reason-class.json(평가 이유 분류: 지문 탓/문항 탓/애매)이 있으면 분류 표를 더한다. 키 = "<묶음>|<회차>|<평가자>|<문항번호>" → "지문"|"문항"|"애매"|"해당 없음".
import json, re, collections, os
C='docs/experiments/set-pattern-2026-11-18/o4/'
SC={'수능 같음':2,'중':1,'수능 아님':0}; RUNS=('r1','r2')
BUNDLES={'T4':dict(gold='자격 기출 공손룡 12번',cells={'인문 관점(T4 V1 A·B)':['생성 A-V1 view','생성 B-V1 view'],'인문 사례(T4 V2 A·B)':['생성 A-V2 case','생성 B-V2 case']}),
         'T5':dict(gold='자격 기출 조세 귀착 12번',cells={'사회 표(T5 4문항)':['생성 A-V1 table','생성 A-V2 table','생성 B-V1 table','생성 B-V2 table']})}
L2={'인문 관점(T4 V1 A·B)':1.375,'인문 사례(T4 V2 A·B)':1.31,'사회 표(T5 4문항)':1.56}
def blocks(t): return json.loads(re.findall(r'```json\s*(.*?)```',t,re.S)[-1])
RC=json.load(open(C+'reason-class.json',encoding='utf8')) if os.path.exists(C+'reason-class.json') else {}
OUT=[]; W=OUT.append
W('# 순서표 ④ 2단계 블라인드 집계 (자동 생성, 측정만)\n')
W('등급 점수: 수능 같음 2, 중 1, 수능 아님 0. 평가자 4명 × 회차 2 × 묶음 2.\n')
ROW={}; ALLCELL={}
for T,B in BUNDLES.items():
    D=C+f'blind-{T}/'; ROW[T]={}
    names=[n for c in B['cells'].values() for n in c]+[B['gold']]
    for run in RUNS:
        KEY=json.load(open(D+f'KEY-{run}.json',encoding='utf8'))
        EV={i:{r['item']:r for r in blocks(open(D+f'REPORT-eval-{run}-{i}.md',encoding='utf8').read())} for i in range(1,5)}
        assert all(len(EV[i])==5 for i in EV),(T,run,[len(EV[i]) for i in EV])
        for k in KEY:
            it=k['item']; gs=[EV[i][it]['grade'] for i in EV]; ans=[EV[i][it]['answer'] for i in EV]
            ROW[T].setdefault(k['source'],{})[run]=dict(k=k,it=it,grades=gs,mean=sum(SC[g] for g in gs)/4,ok=sum(a==k['answer'] for a in ans),ans=ans,
              defects=collections.Counter(d for i in EV for d in (EV[i][it].get('defects') or [])),reasons=[EV[i][it]['reason'] for i in EV],
              same=gs.count('수능 같음'),mid=gs.count('중'),no=gs.count('수능 아님'))
for T,B in BUNDLES.items():
    W(f'## {T} 묶음\n'); W('### a. 문항별 회차별 4회 등급·평균\n')
    W('| 문항 | 회차 | 풀이지 번호 | 정답 | 평가자1~4 등급 | 평균 | 같음/중/아님 | 정답 일치 | 평가자 답 | 결함 표시 빈도 |'); W('|---|---|---|---|---|---|---|---|---|---|')
    names=[n for c in B['cells'].values() for n in c]+[B['gold']]
    for n in names:
        for run in RUNS:
            r=ROW[T][n][run]; W(f"| {n} | {run} | {r['it']} | {r['k']['answer']} | {' / '.join(r['grades'])} | {r['mean']:.2f} | {r['same']}/{r['mid']}/{r['no']} | {r['ok']}/4 | {' '.join(r['ans'])} | {dict(r['defects']) or '없음'} |")
    W('\n### b. 칸 평균(두 회차) · 자격 기출 회차별 평균 · L2 칸 평균과의 차이(참고)\n')
    W('| 칸 | r1 | r2 | 두 회차 평균 | L2 칸 평균 | 칸 평균 − L2 |'); W('|---|---|---|---|---|---|')
    for cn,ns in B['cells'].items():
        m=[sum(ROW[T][n][r]['mean'] for n in ns)/len(ns) for r in RUNS]; avg=sum(m)/2
        W(f"| {cn} | {m[0]:.3f} | {m[1]:.3f} | **{avg:.3f}** | {L2[cn]} | {avg-L2[cn]:+.3f} |"); ALLCELL[cn]=avg
    g=[ROW[T][B['gold']][r]['mean'] for r in RUNS]
    W(f"\n자격 기출({B['gold']}) 회차별 평균: r1 {g[0]:.3f} ({'≥1.5' if g[0]>=1.5 else '1.5 미만 → 이 회차 멈춤'}), r2 {g[1]:.3f} ({'≥1.5' if g[1]>=1.5 else '1.5 미만 → 이 회차 멈춤'}), 두 회차 평균 {sum(g)/2:.3f}\n")
    W('### c. 생성 문항별 \'수능 아님\' 횟수·\'수능 같음\' 횟수·㉲·㉯ 표시 수 (두 회차 합)\n')
    W('| 문항 | 아님 r1 | 아님 r2 | 아님 합 | 같음 합 | ㉲ 표시(정답이 지문 한 문장으로 정해짐) | ㉯ 표시 |'); W('|---|---|---|---|---|---|---|')
    for n in names:
        a=ROW[T][n]['r1']; b=ROW[T][n]['r2']; W(f"| {n} | {a['no']} | {b['no']} | {a['no']+b['no']} | {a['same']+b['same']} | {a['defects'].get('㉲',0)+b['defects'].get('㉲',0)} | {a['defects'].get('㉯',0)+b['defects'].get('㉯',0)} |")
    W('\n### d. 결함 표시(㉮~㉴) 수 (두 회차 합)\n')
    W('| 문항 | ' + ' | '.join('㉮㉯㉰㉱㉲㉳㉴') + ' |'); W('|---|' + '---|'*7)
    for n in names:
        cnt=ROW[T][n]['r1']['defects']+ROW[T][n]['r2']['defects']; W(f"| {n} | " + ' | '.join(str(cnt.get(x,0)) for x in '㉮㉯㉰㉱㉲㉳㉴') + ' |')
    if T=='T4':
        W('\n㉮(〈보기〉가 지문의 운반대 사례를 이름만 바꿔 옮김, K-S4) — 사례 문항(V2)만: '+', '.join(f"{n} {ROW[T][n]['r1']['defects'].get('㉮',0)+ROW[T][n]['r2']['defects'].get('㉮',0)}회" for n in ('생성 A-V2 case','생성 B-V2 case'))+'\n')
    W('')
W('## e. 평가 이유 분류(지문 탓 / 문항 탓 / 애매) — 생성 문항만, 평가 이유 1건 = 1표\n')
if RC:
    W('| 묶음 | 칸·문항 | 지문 탓 | 문항 탓 | 애매 | 해당 없음(등급 높고 지적 없음) |'); W('|---|---|---|---|---|---|')
    for T,B in BUNDLES.items():
        for n in [n for c in B['cells'].values() for n in c]:
            cnt=collections.Counter()
            for run in RUNS:
                r=ROW[T][n][run]
                for i in range(4): cnt[RC.get(f"{T}|{run}|{i+1}|{r['it']}",'미분류')]+=1
            W(f"| {T} | {n} | {cnt['지문']} | {cnt['문항']} | {cnt['애매']} | {cnt['해당 없음']} |")
        tot=collections.Counter(v for k,v in RC.items() if k.startswith(T+'|'))
    tot=collections.Counter(RC.values()); W(f"\n전체: 지문 {tot['지문']}, 문항 {tot['문항']}, 애매 {tot['애매']}, 해당 없음 {tot['해당 없음']}, 미분류 {tot['미분류']}\n")
else: W('(reason-class.json 없음 — 분류 전)\n')
W('## f. 문항별 평가자 이유 (한 줄씩)\n')
for T,B in BUNDLES.items():
    for n in [n for c in B['cells'].values() for n in c]+[B['gold']]:
        for run in RUNS:
            r=ROW[T][n][run]; W(f"- [{T}] {n} {run} (풀이지 문항 {r['it']}, 평균 {r['mean']:.2f}, 결함 {dict(r['defects']) or '없음'}):")
            for i,(gr,t) in enumerate(zip(r['grades'],r['reasons']),1): W(f"  - e{i} {gr}: {t}")
W('\n## 형식 실패·정답 불일치\n')
W(f"- 정답 불일치: { {(T,run,n):(ROW[T][n][run]['ok'],ROW[T][n][run]['ans']) for T in ROW for n in ROW[T] for run in RUNS if ROW[T][n][run]['ok']<4} or '없음'}")
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(OUT)+'\n'); print('\n'.join(OUT[:70]))
