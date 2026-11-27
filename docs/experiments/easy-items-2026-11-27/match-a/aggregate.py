# 내용 일치 문항 시험 생성 집계 + 미리 정한 판정 (cells-rejudge/aggregate.py 기반). 실행: python3 <이 파일>
import json, re, collections, os
C=os.path.dirname(os.path.abspath(__file__))+'/'
SC={'수능 같음':2,'중':1,'수능 아님':0}
KEYS=json.load(open(C+'KEY.json')); FL=json.load(open(C+'floor/floor-result.json'))
def blocks(t): return json.loads(re.findall(r'```json\s*(.*?)```',t,re.S)[-1])
R={}
for k in KEYS:
    R[k['key']]=[]
    for run in (1,2):
        for i in range(1,5):
            b=blocks(open(C+f"{k['folder']}/REPORT-eval-r{run}-{i}.md",encoding='utf8').read()); assert len(b)==1,(k['key'],run,i)
            R[k['key']].append((run,i,b[0]))
mean=lambda xs: sum(xs)/len(xs)
M={};D={};OK={};NO={};O=[];W=O.append
W('# 내용 일치 문항 시험 생성 match-a 집계 (자동 생성)\n')
W('## a. 문항별 (수능 같음 2 / 중 1 / 수능 아님 0, 평가자 4명 × 2회차 = 8회)\n')
W('| 폴더 | 키 | 구분 | 정답 | 평균 | 같음/중/아님 | 정답 일치 | 결함 표시 | 바닥 |'); W('|---|---|---|---|---|---|---|---|---|')
for k in sorted(KEYS,key=lambda k:(k['kind'],k['key'])):
    key=k['key']; rs=[r for _,_,r in R[key]]; M[key]=mean([SC[r['grade']] for r in rs]); g=[r['grade'] for r in rs]
    OK[key]=sum(r['answer']==k['answer'] for r in rs); NO[key]=g.count('수능 아님'); D[key]=collections.Counter(x for r in rs for x in (r.get('defects') or []))
    fl='-' if k['kind']=='기출' else ('실패' if FL[key]['floor_fail'] else '통과')
    W(f"| {k['folder']} | {key} | {k['kind']} | {k['answer']} | **{M[key]:.3f}** | {g.count('수능 같음')}/{g.count('중')}/{g.count('수능 아님')} | {OK[key]}/8 | {dict(D[key]) or '없음'} | {fl} |")
gen=[k['key'] for k in KEYS if k['kind']=='생성']; ref=[k['key'] for k in KEYS if k['kind']=='기출']
fail=[x for x in gen if FL[x]['floor_fail']]
G=mean([0 if x in fail else M[x] for x in gen]); Mm=mean([M[x] for x in ref])
GD=mean([0 if x in fail else M[x] for x in ('D-neg','D-pos')]); GH=mean([0 if x in fail else M[x] for x in ('H-neg','H-pos')])
floor_no=[x for x in gen if NO[x]>=4]
if len(fail)>=2: v='미달(바닥 실패 2개 이상)'
elif floor_no: v='미달(바닥: 수능 아님 4/8 이상 문항 있음)'
elif G>=Mm-0.4: v='통과(같은 지문·갈래 기출 수준)'
elif G>=Mm-0.8: v='거의'
else: v='미달'
W('\n## b. 전체 판정 (미리 정한 기준 기계 적용)\n')
W(f"- **판정: {v}**")
W(f"- G(생성 4개 평균, 바닥 실패는 0점) = {G:.3f} / M(기출 4개 평균) = {Mm:.3f} / G−M = {G-Mm:+.3f}")
W(f"- 지문별: G_D = {GD:.3f}, KD = {M['KD']:.3f}, G_D−KD = {GD-M['KD']:+.3f} / G_H = {GH:.3f}, KH = {M['KH']:.3f}, G_H−KH = {GH-M['KH']:+.3f}")
W(f"- 바닥 실패 문항: {', '.join(f'{x}: '+'; '.join(FL[x]['reasons']) for x in fail) or '없음'}")
W(f"- 수능 아님 4/8 이상인 생성 문항: {floor_no or '없음'}")
W(f"- (참고, 점수만 적고 G에서 0점 처리 안 한 경우) 생성 4개 단순 평균 = {mean([M[x] for x in gen]):.3f}")
W('\n## c. 문항별 평가자 이유 (r1-1·r2-1)\n')
for k in sorted(KEYS,key=lambda k:(k['kind'],k['key'])):
    key=k['key']; W(f"### {k['folder']} {key} ({k['kind']}, 평균 {M[key]:.3f}, 정답 {k['answer']})")
    for run,i,r in R[key]:
        if i==1: W(f"- r{run}-1 [{r['grade']}] 답 {r['answer']} 결함 {r.get('defects') or '없음'}: {r['reason']}")
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(O)+'\n'); print('\n'.join(O))
