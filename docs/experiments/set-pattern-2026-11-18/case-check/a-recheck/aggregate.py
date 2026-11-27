# 생성 A형 재확인 + 단계 수 집계 ($LC/aggregate.py 기반). 측정값과 미리 정한 판정 문구만.
import json, re, collections, os
C=os.path.dirname(os.path.abspath(__file__))+'/'; LC=C+'../lure-check/'
SC={'수능 같음':2,'중':1,'수능 아님':0}
KEYS=json.load(open(C+'KEY.json')); LK=json.load(open(LC+'KEY.json'))
def blocks(t):
    m=re.findall(r'```json\s*(.*?)```',t,re.S)
    try: return json.loads(m[-1])
    except Exception: return None
mean=lambda xs: sum(xs)/len(xs) if xs else float('nan')
def judge(d):
    rs=[]
    for run in (1,2):
        for i in range(1,5):
            p=d+f'/REPORT-eval-r{run}-{i}.md'
            if os.path.exists(p):
                b=blocks(open(p,encoding='utf8').read())
                if b and len(b)==1: rs.append((run,i,b[0]))
    return rs
def steps(d):
    out=[]
    for s in ('s1','s2'):
        p=d+f'/STEPS-{s}.md'
        if os.path.exists(p):
            b=blocks(open(p,encoding='utf8').read())
            if isinstance(b,dict): out.append((s,b))
    return out
ROWS=[]  # dict per item
for k in KEYS:
    ROWS.append(dict(key=k['key'],folder=k['folder'],group=k['group'],answer=k['answer'],J=judge(C+k['folder']),S=steps(C+k['folder'])))
for k in LK:
    if k['key'].split(' ')[0] in ('N-K16','N-K04','N-K24','P-K01','P-K08','P-K22','P-K42','P-K12'):
        n=k['key'].split(' ')[0]; ROWS.append(dict(key=k['key'],folder=k['folder'],group='기출LC',answer=k['answer'],J=judge(LC+k['folder']),S=steps(C+'steps-LC/'+n),lc=True))
def calc(r):
    rs=[x for _,_,x in r['J']]; g=[x['grade'] for x in rs]
    r['n']=len(rs); r['score']=mean([SC[x] for x in g]); r['cnt']=(g.count('수능 같음'),g.count('중'),g.count('수능 아님'))
    r['ok']=sum(x['answer']==r['answer'] for x in rs); r['def']=collections.Counter(d for x in rs for d in (x.get('defects') or []))
    S=[b for _,b in r['S']]
    r['sc']=mean([b['answerStepCount'] for b in S]) if S else float('nan')
    r['bc']=mean([sum(1 for s in b['answerSteps'] if s.get('basis') in ('보기','결합')) for b in S]) if S else float('nan')
    r['bf']=mean([b.get('bogiFactsUsed',float('nan')) for b in S]) if S else float('nan')
    r['nb']=sum(1 for b in S if b.get('noBogi')); r['sok']=sum(1 for b in S if b.get('answer')==r['answer']); r['ns']=len(S)
for r in ROWS: calc(r)
O=[]; W=O.append
W('# 생성 A형 재확인 + 단계 수 집계 (자동 생성)\n')
W('## a. 문항별\n'); W('| 폴더 | 키 | 구분 | 정답 | 점수 | 같음/중/아님 | 정답 일치 | 결함 | 단계 수(answerStepCount) | 보기+결합 단계 | bogiFactsUsed | noBogi | 단계 측정 정답 일치 |'); W('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
for r in ROWS:
    W(f"| {r['folder']}{'(LC)' if r.get('lc') else ''} | {r['key']} | {r['group']} | {r['answer']} | **{r['score']:.3f}** ({r['n']}회) | {r['cnt'][0]}/{r['cnt'][1]}/{r['cnt'][2]} | {r['ok']}/{r['n']} | {dict(r['def']) or '없음'} | {r['sc']:.2f} | {r['bc']:.2f} | {r['bf']:.2f} | {r['nb']}/{r['ns']} | {r['sok']}/{r['ns']} |")
R=[r for r in ROWS if not r.get('lc')]; by=lambda g:[r for r in R if r['group']==g]
G=mean([r['score'] for r in by('생성A')]); T=mean([r['score'] for r in by('기출상위')]); M=mean([r['score'] for r in by('기출보통')]); K6=mean([r['score'] for r in R if r['group'].startswith('기출')])
sc={r['key']:r['score'] for r in R}
best={'청약':max(sc['G-cy-cell5'],sc['G-cy-lever5']),'도덕':max(sc['G-mo-pair3'],sc['G-mo-o4'],sc['G-mo-o4regen']),'공손룡':sc['G-gs-old']}
Gb=mean(list(best.values()))
W('\n## b. 묶음 평균\n'); W('| 묶음 | 평균 |'); W('|---|---|')
for n,v in (('생성 A 6',G),('기출 상위 3',T),('기출 보통 3',M),('기출 6 전체',K6),('지문별 생성 최고점 3개 평균',Gb)): W(f'| {n} | {v:.3f} |')
W('\n지문별 생성 최고점: '+', '.join(f'{k} {v:.3f}' for k,v in best.items()))
old={'K-top-gongsun12':2.0,'K-top-gongsi12':2.0,'K-top-K37 건축':2.0,'K-mid-K21 과징금':1.0,'K-mid-K07 상계':1.0,'K-mid-K41 집합건물':1.0}
W('\n## c. 기출 흔들림 (이번 vs 예전)\n'); W('| 기출 | 예전 | 이번 | 차이 | 0.5 초과 |'); W('|---|---|---|---|---|')
big=0
for k,o in old.items():
    d=sc[k]-o; big+=abs(d)>0.5; W(f'| {k} | {o:.2f} | {sc[k]:.3f} | {d:+.3f} | {"예" if abs(d)>0.5 else "아니오"} |')
def rank(x):
    s=sorted(range(len(x)),key=lambda i:x[i]); r=[0]*len(x); i=0
    while i<len(s):
        j=i
        while j+1<len(s) and x[s[j+1]]==x[s[i]]: j+=1
        for t in range(i,j+1): r[s[t]]=(i+j)/2+1
        i=j+1
    return r
def spear(a,b):
    ra,rb=rank(a),rank(b); ma,mb=mean(ra),mean(rb)
    num=sum((x-ma)*(y-mb) for x,y in zip(ra,rb)); den=(sum((x-ma)**2 for x in ra)*sum((y-mb)**2 for y in rb))**.5
    return num/den if den else float('nan')
ok=[r for r in ROWS if r['ns']>0 and r['n']>0]
def rho(rows,f): return spear([r[f] for r in rows],[r['score'] for r in rows])
rows14=[r for r in ok if r['group'].startswith('기출')]
rhos={('20','sc'):rho(ok,'sc'),('20','bc'):rho(ok,'bc'),('14','sc'):rho(rows14,'sc'),('14','bc'):rho(rows14,'bc')}
W(f'\n## d. 단계 수 상관 (Spearman ρ, 점수 있는 문항 {len(ok)}개 / 기출 {len(rows14)}개)\n'); W('| 대상 | ρ(answerStepCount, 점수) | ρ(보기+결합 단계 수, 점수) |'); W('|---|---|---|')
W(f"| 전체 {len(ok)} | {rhos[('20','sc')]:+.3f} | {rhos[('20','bc')]:+.3f} |"); W(f"| 기출 {len(rows14)} | {rhos[('14','sc')]:+.3f} | {rhos[('14','bc')]:+.3f} |")
W('\n## e. 6단계 판정 (미리 정한 기준 기계 적용)\n')
def pos(g,T,M):
    return '생성 A형이 상위 기출 수준' if g>=T-0.4 else ('생성 A형이 보통 기출 수준 (A형 칸 통과로 볼 수 있음)' if g>=M-0.4 else '생성 A형이 보통 기출에도 못 미침')
if big>=2: W(f'**잣대 흔들림 — 판정 보류** (기출 6개 중 0.5 초과 차이 {big}개)\n')
W(f'- [가(생성 A형 위치)] G={G:.3f}, M={M:.3f}, T={T:.3f} → **{pos(G,T,M)}**'); W(f'- [가, 지문별 생성 최고점 3개 평균 {Gb:.3f}] → **{pos(Gb,T,M)}**')
def nm(r): return '단계 수가 점수를 설명함' if r>=0.5 else ('약한 관계' if r>=0.2 else '단계 수로 설명 안 됨')
W(f"- [나(단계 수)] 전체 ρ(answerStepCount, 점수)={rhos[('20','sc')]:+.3f} → **{nm(rhos[('20','sc')])}**"); W(f"- [나, 보기+결합 단계 수] 전체 ρ={rhos[('20','bc')]:+.3f} → **{nm(rhos[('20','bc')])}**")
W(f"- (참고, 기출 14개만) ρ(answerStepCount)={rhos[('14','sc')]:+.3f}, ρ(보기+결합)={rhos[('14','bc')]:+.3f}")
W('- 웹의 사전 예측(적어 두기만): 가 = "보통 기출 수준", 나 = "약한 관계 이상", 보기+결합 단계 수 쪽 ρ가 더 높을 것.')
W('\n## f. 문항별 평가자 이유 (r1-1·r2-1)\n')
for r in ROWS:
    W(f"### {r['folder']} {r['key']} (점수 {r['score']:.3f}, 정답 {r['answer']})")
    for run,i,x in r['J']:
        if i==1: W(f"- r{run}-1 [{x['grade']}] 답 {x['answer']} 결함 {x.get('defects') or '없음'}: {x['reason']}")
W('\n## g. 문항별 정답 선지 단계 (s1)\n')
for r in ROWS:
    s1=[b for s,b in r['S'] if s=='s1']
    W(f"### {r['folder']} {r['key']} (단계 {s1[0]['answerStepCount'] if s1 else '-'})")
    if s1:
        for j,s in enumerate(s1[0]['answerSteps'],1): W(f"{j}. [{s.get('basis')}] {s.get('step')}")
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(O)+'\n'); print('\n'.join(O[:70]))
