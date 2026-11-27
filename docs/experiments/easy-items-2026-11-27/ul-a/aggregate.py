# 밑줄 대상 이해 문항 시험 생성 집계 + 미리 정한 판정 (match-c/aggregate.py 기반). 실행: python3 <이 파일>
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
W('# 밑줄 대상 이해 문항 시험 생성 ul-a 집계 (자동 생성)\n')
W('## a. 문항별 (수능 같음 2 / 중 1 / 수능 아님 0, 평가자 4명 × 2회차 = 8회)\n')
W('| 폴더 | 키 | 구분 | 정답 | 평균 | 같음/중/아님 | 정답 일치 | 결함 표시 | 바닥 |'); W('|---|---|---|---|---|---|---|---|---|')
for k in sorted(KEYS,key=lambda k:({'생성':0,'기출':1}[k['kind']],k['key'])):
    key=k['key']; rs=[r for _,_,r in R[key]]; M[key]=mean([SC[r['grade']] for r in rs]); g=[r['grade'] for r in rs]
    OK[key]=sum(r['answer']==k['answer'] for r in rs); NO[key]=g.count('수능 아님'); D[key]=collections.Counter(x for r in rs for x in (r.get('defects') or []))
    fl=('실패' if FL[key]['floor_fail'] else '통과') if k['kind']=='생성' else '-'
    W(f"| {k['folder']} | {key} | {k['kind']} | {k['answer']} | **{M[key]:.3f}** | {g.count('수능 같음')}/{g.count('중')}/{g.count('수능 아님')} | {OK[key]}/8 | {dict(D[key]) or '없음'} | {fl} |")
gen=[k['key'] for k in KEYS if k['kind']=='생성']; ref=[k['key'] for k in KEYS if k['kind']=='기출']
fail=[x for x in gen if FL[x]['floor_fail']]
sc=lambda x: 0 if x in fail else M[x]
G=mean([sc(x) for x in gen]); Mm=mean([M[x] for x in ref]); GS=mean([sc('S-pos'),sc('S-neg')]); GI=mean([sc('I-pos'),sc('I-neg')])
Gpos=mean([sc('S-pos'),sc('I-pos')]); Gneg=mean([sc('S-neg'),sc('I-neg')])
Mpos=mean([M[x] for x in ('SU','IU','RS','HY','PJ','FL')]); Mneg=mean([M[x] for x in ('PL','PZ')])
floor_no=[x for x in gen if NO[x]>=4]
if len(fail)>=2: v='미달(바닥 실패 2개 이상)'
elif floor_no: v='미달(바닥: 수능 아님 4/8 이상 문항 있음)'
elif G>=Mm-0.4: v='통과(같은 지문·갈래 기출 수준)'
elif G>=Mm-0.8: v='거의'
else: v='미달'
cnt=lambda ks,d: sum(D[x].get(d,0) for x in ks)
cats=collections.Counter(c['kind'] for x in gen for c in json.load(open(C+f'gen/{x}/item.json'))['choices'] if c['truth']=='틀림')
ok_cats=collections.Counter(c['kind'] for x in gen for c in json.load(open(C+f'gen/{x}/item.json'))['choices'] if c['truth']=='맞음')
W('\n## b. 전체 판정 (미리 정한 기준 기계 적용)\n')
W(f"- **판정: {v}**")
W(f"- G = {G:.3f} / M = {Mm:.3f} / G−M = {G-Mm:+.3f}")
W(f"- 지문별: G_S(표면 장력) = {GS:.3f} 대 SU {M['SU']:.3f} (차 {GS-M['SU']:+.3f}) / G_I(정보 비대칭) = {GI:.3f} 대 IU {M['IU']:.3f} (차 {GI-M['IU']:+.3f})")
W(f"- 발문별: 생성 pos(적절한 것) {Gpos:.3f} 대 기출 pos 6개(SU IU RS HY PJ FL) {Mpos:.3f} / 생성 neg(적절하지 않은 것) {Gneg:.3f} 대 기출 neg 2개(PL PZ) {Mneg:.3f}")
W(f"- 결함 표시 수: ㉳ 생성 {cnt(gen,'㉳')}/32 (기출 {cnt(ref,'㉳')}/64), ㉲ 생성 {cnt(gen,'㉲')}/32 (기출 {cnt(ref,'㉲')}/64)")
W(f"- 바닥 실패 문항: {', '.join(f'{x}: '+'; '.join(FL[x]['reasons']) for x in fail) or '없음'}")
W(f"- 수능 아님 4/8 이상인 생성 문항: {floor_no or '없음'}")
W(f"- 생성 틀린 선지 갈래 분포(틀린 선지 10개): {dict(sorted(cats.items()))} / 맞는 선지 kind: {dict(ok_cats)}")
W('\n## c. 문항별 평가자 이유 (r1-1·r2-1)\n')
for k in sorted(KEYS,key=lambda k:({'생성':0,'기출':1}[k['kind']],k['key'])):
    key=k['key']; W(f"### {k['folder']} {key} ({k['kind']}, 평균 {M[key]:.3f}, 정답 {k['answer']})")
    for run,i,r in R[key]:
        if i==1: W(f"- r{run}-1 [{r['grade']}] 답 {r['answer']} 결함 {r.get('defects') or '없음'}: {r['reason']}")
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(O)+'\n'); print(open(C+'aggregate-out.md',encoding='utf8').read().split('## c.')[0])
