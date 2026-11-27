# 어휘 문항 규칙 v2 우리 지문 시험 집계 + 미리 정한 판정 (ul-d/aggregate.py 기반). 실행: python3 <이 파일>
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
W('# 어휘 문항 규칙 v2 우리 지문 시험 vocab-c 집계 (자동 생성)\n')
W('## a. 문항별 (수능 같음 2 / 중 1 / 수능 아님 0, 평가자 4명 × 2회차 = 8회)\n')
W('| 폴더 | 키 | 구분 | 정답 | 평균 | 같음/중/아님 | 정답 일치 | 결함 표시 | 바닥 |'); W('|---|---|---|---|---|---|---|---|---|')
for k in sorted(KEYS,key=lambda k:({'생성':0,'기출':1}[k['kind']],k['key'])):
    key=k['key']; rs=[r for _,_,r in R[key]]; M[key]=mean([SC[r['grade']] for r in rs]); g=[r['grade'] for r in rs]
    OK[key]=sum(r['answer']==k['answer'] for r in rs); NO[key]=g.count('수능 아님'); D[key]=collections.Counter(x for r in rs for x in (r.get('defects') or []))
    fl=('실패' if FL[key]['floor_fail'] else '통과') if k['kind']=='생성' else '-'
    W(f"| {k['folder']} | {key} | {k['kind']} | {k['answer']} | **{M[key]:.3f}** | {g.count('수능 같음')}/{g.count('중')}/{g.count('수능 아님')} | {OK[key]}/8 | {dict(D[key]) or '없음'} | {fl} |")
gen=[k['key'] for k in KEYS if k['kind']=='생성']; ref=[k['key'] for k in KEYS if k['kind']=='기출']
fail=[x for x in gen if FL[x]['floor_fail']]; sc=lambda x: 0 if x in fail else M[x]
G=mean([sc(x) for x in gen]); Mm=mean([M[x] for x in ref])
GA=mean([sc('T-A'),sc('C-A')]); MA=mean([M[x] for x in ('NV','RV','MV','JV')]); GB=mean([sc('T-B'),sc('C-B')]); MB=mean([M[x] for x in ('SV','BV','GV','HV')])
GS=mean([sc('T-A'),sc('T-B')]); GN=mean([sc('C-A'),sc('C-B')])
floor_no=[x for x in gen if NO[x]>=4]
if len(fail)>=2: v='미달(바닥 실패 2개 이상)'
elif floor_no: v='미달(바닥: 수능 아님 4/8 이상 문항 있음)'
elif G>=Mm-0.4: v='통과(우리 지문에서도 기출 수준)'
elif G>=Mm-0.8: v='거의'
else: v='미달'
cnt=lambda ks,d: sum(D[x].get(d,0) for x in ks)
okg=sum(OK[x] for x in gen); okr=sum(OK[x] for x in ref)
W('\n## b. 판정 (미리 정한 기준 기계 적용)\n')
W(f"- **판정: {v}**")
W(f"- G(생성 4개, 바닥 실패 0점) = {G:.3f} / M(기출 8개) = {Mm:.3f} / G−M = {G-Mm:+.3f} (기준 −0.4 → {Mm-0.4:.3f}, 거의 기준 −0.8 → {Mm-0.8:.3f})")
W(f"- 꼴별: 생성 A 2개 {GA:.3f} 대 기출 A 4개(NV RV MV JV) {MA:.3f} / 생성 B 2개 {GB:.3f} 대 기출 B 4개(SV BV GV HV) {MB:.3f}")
W(f"- 지문별: T 혈액 응고(T-A·T-B) {GS:.3f}, C 청약 철회(C-A·C-B) {GN:.3f}")
W(f"- ㉲ 표시 수: 생성 {cnt(gen,'㉲')}/32 (기출 {cnt(ref,'㉲')}/64), ㉳ 생성 {cnt(gen,'㉳')}/32 (기출 {cnt(ref,'㉳')}/64), ㉮ 생성 {cnt(gen,'㉮')}/32 (기출 {cnt(ref,'㉮')}/64)")
W(f"- 바닥 실패 문항과 이유: "+(' / '.join(f'{x}: '+'; '.join(FL[x]['reasons']) for x in fail) or '없음'))
W(f"- 수능 아님 4/8 이상인 생성 문항: {floor_no or '없음'}")
W(f"- 정답 일치: 생성 {okg}/32, 기출 {okr}/64")
tg=[]
for x in ['T-B','T-A','C-A','C-B']:
    it=json.load(open(C+f'gen/{x}/item.json')); tg.append(f"{x}: "+', '.join(f"{t['mark']}'{t['word']}'" for t in it['targets']))
W("- 고른 낱말: "+' / '.join(tg))
def pre(i): t=i['targets'][0]; return t['text'][:t['text'].find(t['word'])].split()[-1]
ov=[]; rp=[]
for a,b in (('T-B','T-A'),('C-A','C-B')):
    ia=json.load(open(C+f'gen/{a}/item.json')); ib=json.load(open(C+f'gen/{b}/item.json')); ov.append(f"{a}·{b} 겹침 {set(t['word'] for t in ia['targets'])&set(t['word'] for t in ib['targets']) or '없음'}")
for x in ('T-A','C-A'):
    i=json.load(open(C+f'gen/{x}/item.json')); rp.append(f"{x}('{pre(i)}') "+('있음' if pre(i) in i['choices'][i['answer']-1]['text'] else '없음'))
W("- 낱말 겹침: "+' / '.join(ov)+" / 말 묶음 반복(앞 어절이 정답 예문에): "+' / '.join(rp))
W('\n## c. 문항별 평가자 이유 (r1-1·r2-1)\n')
for k in sorted(KEYS,key=lambda k:({'생성':0,'기출':1}[k['kind']],k['key'])):
    key=k['key']; W(f"### {k['folder']} {key} ({k['kind']}, 평균 {M[key]:.3f}, 정답 {k['answer']})")
    for run,i,r in R[key]:
        if i==1: W(f"- r{run}-1 [{r['grade']}] 답 {r['answer']} 결함 {r.get('defects') or '없음'}: {r['reason']}")
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(O)+'\n'); print(open(C+'aggregate-out.md',encoding='utf8').read().split('## c.')[0])
