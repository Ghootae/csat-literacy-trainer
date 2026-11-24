# 순서표 ③-2 집계. 실행(저장소 루트): python3 docs/experiments/set-pattern-2026-11-18/cell3/exp/aggregate.py
# 측정값만 적는다(자격 기출 1.5 미만 회차는 '멈춤' 표시, WORKING-RULES 4-3). 통과/거의/미달 판정·결론은 쓰지 않는다(웹이 한다).
import json, re, collections, os
C='docs/experiments/set-pattern-2026-11-18/cell3/exp/'; V5='docs/experiments/deep-item-v5-2026-11-18/'; D=C+'blind/'
SC={'수능 같음':2,'중':1,'수능 아님':0}
GEN=['실험 B-V1','실험 B-V2']; REF='기출 표면 장력 16번(참고)'; GOLD='기출 플라스틱 10번'; RUNS=('r1','r2'); ALL=GEN+[REF,GOLD]
def blocks(t): return json.loads(re.findall(r'```json\s*(.*?)```',t,re.S)[-1])
def kind(k): return k['source']
ROW={}
for run in RUNS:
    KEY=json.load(open(D+f'KEY-{run}.json'))
    EV={i:{r['item']:r for r in blocks(open(D+f'REPORT-eval-{run}-{i}.md',encoding='utf8').read())} for i in range(1,5)}
    assert all(len(EV[i])==4 for i in EV),(run,[len(EV[i]) for i in EV])
    ROW[run]={}
    for k in KEY:
        it=k['item']; gs=[EV[i][it]['grade'] for i in EV]; ans=[EV[i][it]['answer'] for i in EV]
        ROW[run][kind(k)]=dict(k=k,it=it,grades=gs,mean=sum(SC[g] for g in gs)/4,ok=sum(a==k['answer'] for a in ans),ans=ans,
          defects=collections.Counter(d for i in EV for d in (EV[i][it].get('defects') or [])),reasons=[EV[i][it]['reason'] for i in EV],
          same=gs.count('수능 같음'),mid=gs.count('중'),no=gs.count('수능 아님'))
OUT=[]; W=OUT.append
W('# 순서표 ③-2 실험 칸(표면 장력 B형) 블라인드 집계 (자동 생성, 측정만)\n')
W('## a. 문항별 회차별 4회 등급·평균 (수능 같음 2, 중 1, 수능 아님 0)\n')
W('| 문항 | 회차 | 라벨 | 정답 | 평가자1~4 등급 | 평균 | 같음/중/아님 | 정답 일치 | 평가자 답 | 결함 표시 빈도 |'); W('|---|---|---|---|---|---|---|---|---|---|')
for n in ALL:
    for run in RUNS:
        r=ROW[run][n]; W(f"| {n} | {run} | {r['it']} | {r['k']['answer']} | {' / '.join(r['grades'])} | {r['mean']:.2f} | {r['same']}/{r['mid']}/{r['no']} | {r['ok']}/4 | {' '.join(r['ans'])} | {dict(r['defects']) or '없음'} |")
def cm(run,names): return sum(ROW[run][n]['mean'] for n in names)/len(names)
W('\n## b. 실험 칸 평균 (생성 2문항: B-V1, B-V2)\n')
W('| 회차 | 실험 칸 평균 | 자격 기출(플라스틱 10번) 평균 | 자격 기출 ≥1.5? | 기출 표면 장력 16번(참고) 평균 |'); W('|---|---|---|---|---|')
for run in RUNS:
    g=ROW[run][GOLD]['mean']; W(f"| {run} | {cm(run,GEN):.3f} | {g:.3f} | {'예' if g>=1.5 else '아니오 → 이 회차 멈춤'} | {ROW[run][REF]['mean']:.3f} |")
c=sum(cm(r,GEN) for r in RUNS)/2; g=sum(ROW[r][GOLD]['mean'] for r in RUNS)/2; rf=sum(ROW[r][REF]['mean'] for r in RUNS)/2
W(f"| **두 회차 평균** | **{c:.3f}** | **{g:.3f}** | | **{rf:.3f}** |")
W('\n## c. 문항별 \'수능 아님\' 횟수 (회차별·합), \'수능 같음\' 횟수는 참고, ㉲·㉯ 표시 수(두 회차 합)\n')
W('| 문항 | 아님 r1 | 아님 r2 | 아님 합 | 같음 r1 | 같음 r2 | 같음 합 | ㉲ 표시 | ㉯ 표시 |'); W('|---|---|---|---|---|---|---|---|---|')
for n in ALL:
    a=ROW['r1'][n]; b=ROW['r2'][n]; W(f"| {n} | {a['no']} | {b['no']} | {a['no']+b['no']} | {a['same']} | {b['same']} | {a['same']+b['same']} | {a['defects'].get('㉲',0)+b['defects'].get('㉲',0)} | {a['defects'].get('㉯',0)+b['defects'].get('㉯',0)} |")
W('\n## d. 결함 표시(㉮~㉴) 수 (두 회차 합)\n')
W('| 문항 | ' + ' | '.join('㉮㉯㉰㉱㉲㉳㉴') + ' |'); W('|---|' + '---|'*7)
for n in ALL:
    cnt=ROW['r1'][n]['defects']+ROW['r2'][n]['defects']; W(f"| {n} | " + ' | '.join(str(cnt.get(x,0)) for x in '㉮㉯㉰㉱㉲㉳㉴') + ' |')
W('\n## e. 생성 두 문항의 strategies·검사기 경고·수리 여부\n')
d=V5+'out-cell3e/surface-tension-B/'; ev=json.load(open(d+'repair/eval.json'))['before']; chk=json.load(open(d+'checks.json'))
for v in ('V1','V2'):
    it=[x for x in json.load(open(d+'items.json'))['items'] if x['version']==v][0]; e=ev[v]
    lfp=d+'leakfix/items-leakfix.json'; lf=[x for x in json.load(open(lfp))['items'] if x['version']==v][0].get('leakfix',{}) if os.path.exists(lfp) else {}
    W(f"- 실험 B-{v}: 정답 {it['answer']}, rival {it.get('rival')}, strategies {it['strategies']}, roles {it['roles']}, 정답 비튼 방식 {it.get('answerTwist')}")
    W(f"  - strategyUse: {json.dumps(it['strategyUse'],ensure_ascii=False)}")
    W(f"  - 형식 점검(checks.json): {chk.get(v) or '없음(통과)'}")
    W(f"  - 수리 대상(repair) {e['repair']}, 결함(defect) {e['defect']}, 방식 위반 {e['methodViolations'] or '없음'}, 전략 경고 {e['strategyWarnings'] or '없음'}, easyChoices {e.get('easyChoices')}, bogiOnly {e.get('bogiOnly')}")
    W(f"  - 검사기 경고: {e['warnings'] or '없음'}")
    W(f"  - 노출 수리(leakfix): {lf.get('status')}")
W('\n## 문항별 평가자 이유 (한 줄씩)\n')
for n in ALL:
    for run in RUNS:
        r=ROW[run][n]; W(f"- {n} {run} (문항 {r['it']}, 평균 {r['mean']:.2f}, 결함 {dict(r['defects']) or '없음'}):")
        for i,(gr,t) in enumerate(zip(r['grades'],r['reasons']),1): W(f"  - e{i} {gr}: {t}")
W('\n## 형식 실패·정답 불일치\n')
W(f"- 정답 불일치: { {(run,n):(ROW[run][n]['ok'],ROW[run][n]['ans']) for run in RUNS for n in ALL if ROW[run][n]['ok']<4} or '없음'}")
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(OUT)+'\n'); print('\n'.join(OUT[:40]))
