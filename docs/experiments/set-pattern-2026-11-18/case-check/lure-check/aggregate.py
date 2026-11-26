# A형 미끼 가설 잣대 확인 집계 (calib-judge/aggregate.py 기반). 실행: python3 <이 파일> (경로는 이 파일 기준)
import json, re, collections, os
C=os.path.dirname(os.path.abspath(__file__))+'/'
SC={'수능 같음':2,'중':1,'수능 아님':0}
KEYS=json.load(open(C+'KEY.json')); KEY={k['key']:k for k in KEYS}
def blocks(t): return json.loads(re.findall(r'```json\s*(.*?)```',t,re.S)[-1])
R={}
for k in KEYS:
    R[k['key']]=[]
    for run in (1,2):
        for i in range(1,5):
            b=blocks(open(C+f"{k['folder']}/REPORT-eval-r{run}-{i}.md",encoding='utf8').read()); assert len(b)==1,(k['key'],run,i)
            R[k['key']].append((run,i,b[0]))
mean=lambda xs: sum(xs)/len(xs)
M={}; O=[]; W=O.append
DEF=['㉮','㉯','㉰','㉱','㉲','㉳','㉴']
W('# A형 미끼 가설 잣대 확인 집계 (자동 생성, 측정만)\n')
W('## a. 문항별 (수능 같음 2 / 중 1 / 수능 아님 0, 평가자 4명 × 2회차 = 8회)\n')
W('| 폴더 | 키 | 구분 | 정답 | 평균 | 같음/중/아님 | 정답 일치 | 결함 표시 개수 |'); W('|---|---|---|---|---|---|---|---|')
D={}; OK={}
for k in KEYS:
    key=k['key']; rs=[r for _,_,r in R[key]]; M[key]=mean([SC[r['grade']] for r in rs]); g=[r['grade'] for r in rs]
    OK[key]=sum(r['answer']==k['answer'] for r in rs); D[key]=collections.Counter(x for r in rs for x in (r.get('defects') or []))
    W(f"| {k['folder']} | {key} | {k['group']} | {k['answer']} | **{M[key]:.3f}** | {g.count('수능 같음')}/{g.count('중')}/{g.count('수능 아님')} | {OK[key]}/8 | {dict(D[key]) or '없음'} |")
grp=lambda g:[k['key'] for k in KEYS if k['group']==g]
Nk,Pk=grp('A-N'),grp('A-P'); Pl=[k for k in Pk if 'K12' not in k]
Nm=mean([M[k] for k in Nk]); Pm=mean([M[k] for k in Pk]); Plm=mean([M[k] for k in Pl])
W('\n## b. 갈래별\n'); W('| 갈래 | 문항 수 | 평균 | '+' | '.join(f'결함 {d} 합' for d in '㉯㉱㉲㉳')+' |'); W('|---|---|---|---|---|---|---|')
for nm,ks,m in (('N형',Nk,Nm),('P형',Pk,Pm),('P형 법 5(전지 뺌)',Pl,Plm)):
    W(f"| {nm} | {len(ks)} | {m:.3f} | "+' | '.join(str(sum(D[k][d] for k in ks)) for d in '㉯㉱㉲㉳')+' |')
W(f"\n- N−P = {Nm-Pm:+.3f}\n- 법·사회 N 6 vs 법 P 5(K12 전지 뺀 것): {Nm:.3f} vs {Plm:.3f}, 차이 {Nm-Plm:+.3f}")
W('\n## c. decider 빼기 대조\n'); W('| 짝 | 원본 평균 | 빼기판 평균 | 차이(빼기−원본) | ㉳ 원본→빼기 | ㉲ 원본→빼기 | 정답 일치 원본→빼기 |'); W('|---|---|---|---|---|---|---|')
CT={}
for x in ('3a','3b'):
    o,d=f'B-{x}-orig',f'B-{x}-del'; CT[x]=M[d]-M[o]
    W(f"| {x} | {M[o]:.3f} | {M[d]:.3f} | {CT[x]:+.3f} | {D[o]['㉳']}→{D[d]['㉳']} ({D[d]['㉳']-D[o]['㉳']:+d}) | {D[o]['㉲']}→{D[d]['㉲']} ({D[d]['㉲']-D[o]['㉲']:+d}) | {OK[o]}/8→{OK[d]}/8 ({OK[d]-OK[o]:+d}) |")
W('\n## d. 5단계 판정 (미리 정한 기준 기계 적용)\n')
if Nm-Pm>=0.4 and Nm>=1.5: v='평가자가 미끼형을 높게 봄 (가설 잣대 통과)'
elif Nm-Pm>=0.4: v='방향은 맞으나 미끼형도 낮음'
elif Pm-Nm>=0.4: v='가설 기각 (규칙 뒤집기형을 더 높게 봄)'
else: v='잣대가 두 갈래를 가르지 않음'
W(f"- [가. 잣대 확인] N평균 {Nm:.3f}, P평균 {Pm:.3f}, N−P {Nm-Pm:+.3f} → **{v}**")
vd={}
for x in ('3a','3b'):
    c=CT[x]; vd[x]='decider가 깊이를 깎음' if c>=0.4 else ('decider 필요' if c<=-0.4 else 'decider 영향 없음')
    W(f"- [나. decider 빼기 대조 {x}] 차이 {c:+.3f} → **{vd[x]}**")
W('- 웹의 사전 예측(적어 두기만): "이 지문은 포장/물품 구분 기준을 지문이 정하지 않으므로, decider를 빼면 깊어지기보다 ㉳가 늘고 정답 일치가 떨어질 것"')
W('\n## 문항별 평가자 이유 (r1-1·r2-1)\n')
for k in KEYS:
    key=k['key']; W(f"### {k['folder']} {key} ({k['group']}, 평균 {M[key]:.3f}, 정답 {k['answer']})")
    for run,i,r in R[key]:
        if i==1: W(f"- r{run}-1 [{r['grade']}] 답 {r['answer']} 결함 {r.get('defects') or '없음'}: {r['reason']}")
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(O)+'\n'); print('\n'.join(O))
