# 밑줄 이해 규칙 v2 다시 시험 집계 + 미리 정한 판정 (ul-a/aggregate.py 기반). 실행: python3 <이 파일>
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
W('# 밑줄 이해 규칙 v2 다시 시험 ul-b 집계 (자동 생성)\n')
W('## a. 문항별 (수능 같음 2 / 중 1 / 수능 아님 0, 평가자 4명 × 2회차 = 8회)\n')
W('| 폴더 | 키 | 구분 | 정답 | 평균 | 같음/중/아님 | 정답 일치 | 결함 표시 | 바닥 |'); W('|---|---|---|---|---|---|---|---|---|')
for k in sorted(KEYS,key=lambda k:({'생성v2':0,'생성v1':1,'기출':2}[k['kind']],k['key'])):
    key=k['key']; rs=[r for _,_,r in R[key]]; M[key]=mean([SC[r['grade']] for r in rs]); g=[r['grade'] for r in rs]
    OK[key]=sum(r['answer']==k['answer'] for r in rs); NO[key]=g.count('수능 아님'); D[key]=collections.Counter(x for r in rs for x in (r.get('defects') or []))
    fl=('실패' if FL[key[2:]]['floor_fail'] else '통과') if k['kind']=='생성v2' else '-'
    W(f"| {k['folder']} | {key} | {k['kind']} | {k['answer']} | **{M[key]:.3f}** | {g.count('수능 같음')}/{g.count('중')}/{g.count('수능 아님')} | {OK[key]}/8 | {dict(D[key]) or '없음'} | {fl} |")
g2=[k['key'] for k in KEYS if k['kind']=='생성v2']; g1=[k['key'] for k in KEYS if k['kind']=='생성v1']; ref=[k['key'] for k in KEYS if k['kind']=='기출']
fail=[x for x in g2 if FL[x[2:]]['floor_fail']]
P2=mean([0 if x in fail else M[x] for x in g2]); P1=mean([M[x] for x in g1]); Mm=mean([M[x] for x in ref]); Mp=mean([M[x] for x in ('SU','IU','RS','HY','PJ','FL')])
if fail: v='미달(바닥 실패)'
elif P2>=Mp-0.4: v="통과('적절한 것'도 기출 수준)"
elif P2>=Mp-0.8 and P2>P1: v='나아졌으나 거의'
else: v='미달(규칙 효과 없음)'
Gall=(sum(0 if x in fail else M[x] for x in g2)+1.875+2.000)/4
cnt=lambda ks,d: sum(D[x].get(d,0) for x in ks)
pos=collections.Counter()
for x in g2:
    for c in json.load(open(C+f'gen/{x[2:]}/item.json'))['choices']:
        if c['truth']=='틀림':
            m=re.search(r'\((끝 반전|속 바꿔치기|적용·맞대기)\)',c['kind']); pos[m.group(1) if m else '표시없음']+=1
W('\n## b. 판정 ("적절한 것" 발문, 미리 정한 기준 기계 적용)\n')
W(f"- **판정: {v}**")
W(f"- P2(v2 2개 평균, 바닥 실패 0점) = {P2:.3f} / P1(1차 2개, 이번 블라인드) = {P1:.3f} / P2−P1 = {P2-P1:+.3f}")
W(f"- Mp(기출 \"적절한 것\" 6개: SU IU RS HY PJ FL) = {Mp:.3f} / M(기출 8개) = {Mm:.3f} / P2−Mp = {P2-Mp:+.3f}  (통과 기준 Mp−0.4 = {Mp-0.4:.3f}, 거의 기준 Mp−0.8 = {Mp-0.8:.3f})")
W(f"- 참고(밑줄 전체): G_all = (P2 두 점수 + 1차 neg 1.875·2.000)/4 = {Gall:.3f}, 1차 M 1.938 과의 차 {Gall-1.938:+.3f}")
W(f"- ㉳ 표시 수: v2 {cnt(g2,'㉳')}/16 대 v1 {cnt(g1,'㉳')}/16 (기출 {cnt(ref,'㉳')}/64)")
W(f"- v2 생성 오답(8개)의 자리 표시(생성기 자기 표시): {dict(pos)}")
W(f"- 바닥 실패 문항: {', '.join(fail) or '없음'}")
W('\n## c. 문항별 평가자 이유 (r1-1·r2-1)\n')
for k in sorted(KEYS,key=lambda k:({'생성v2':0,'생성v1':1,'기출':2}[k['kind']],k['key'])):
    key=k['key']; W(f"### {k['folder']} {key} ({k['kind']}, 평균 {M[key]:.3f}, 정답 {k['answer']})")
    for run,i,r in R[key]:
        if i==1: W(f"- r{run}-1 [{r['grade']}] 답 {r['answer']} 결함 {r.get('defects') or '없음'}: {r['reason']}")
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(O)+'\n'); print(open(C+'aggregate-out.md',encoding='utf8').read().split('## c.')[0])
