# 규칙 v3 우리 지문 시험 집계 + 미리 정한 판정 (match-b/aggregate.py 기반, 출처 추정 없음). 실행: python3 <이 파일>
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
W('# 내용 일치 규칙 v3 우리 지문 시험 match-c 집계 (자동 생성)\n')
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
G=mean([sc(x) for x in gen]); Mm=mean([M[x] for x in ref]); GT=mean([sc('T-neg'),sc('T-pos')]); GC=mean([sc('C-neg'),sc('C-pos')])
Mneg=mean([M[x] for x in ('KD','KH','KS','KC')]); Mpos=mean([M[x] for x in ('PA','PB','PC','PD')])
Gneg=mean([sc('T-neg'),sc('C-neg')]); Gpos=mean([sc('T-pos'),sc('C-pos')])
floor_no=[x for x in gen if NO[x]>=4]
if len(fail)>=2: v='미달(바닥 실패 2개 이상)'
elif floor_no: v='미달(바닥: 수능 아님 4/8 이상 문항 있음)'
elif G>=Mm-0.4: v='통과(우리 지문에서도 기출 수준)'
elif G>=Mm-0.8: v='거의'
else: v='미달'
v2="'적절한 것'도 기출 수준" if Gpos>=Mpos-0.4 else "'적절한 것'은 아직 낮음"
nk=lambda ks: sum(D[x].get('㉳',0) for x in ks)
cats=collections.Counter()
for x in ('T-pos','C-pos'):
    it=json.load(open(C+f'gen/{x}/item.json'))
    for c in it['choices']:
        if c['truth']=='틀림':
            m=re.search(r'\(([가나다])\)',c['method']); cats[m.group(1) if m else '표시없음']+=1
W('\n## b. 전체 판정 (미리 정한 기준 기계 적용)\n')
W(f"- **판정: {v}**")
W(f"- G = {G:.3f} / M = {Mm:.3f} / G−M = {G-Mm:+.3f} / 2차 생성 G2 = 1.594 와의 차 {G-1.594:+.3f}")
W(f"- 지문별: G_T(혈액 응고) = {GT:.3f}, G_C(청약 철회) = {GC:.3f}")
W(f"- 발문별: 생성 neg {Gneg:.3f} 대 M_neg {Mneg:.3f} / 생성 pos {Gpos:.3f} 대 M_pos {Mpos:.3f}")
W(f"- ㉳ 표시 수: 생성 {nk(gen)}/32 (기출 {nk(ref)}/64)")
W(f"- 바닥 실패 문항: {', '.join(f'{x}: '+'; '.join(FL[x]['reasons']) for x in fail) or '없음'}")
W(f"- 수능 아님 4/8 이상인 생성 문항: {floor_no or '없음'}")
W(f"- -pos 두 문항 오답(틀린 선지 8개)의 갈래 개수: 가 {cats.get('가',0)} / 나 {cats.get('나',0)} / 다 {cats.get('다',0)} / 표시 없음 {cats.get('표시없음',0)}")
W(f"\n## c. 참고 판정 ('적절한 것' 보강)\n\n- **{v2}** (-pos 2문항 평균 {Gpos:.3f} 대 M_pos − 0.4 = {Mpos-0.4:.3f}; 2차 -pos 평균 1.19, M_pos 1.625)")
W('\n## d. 문항별 평가자 이유 (r1-1·r2-1)\n')
for k in sorted(KEYS,key=lambda k:({'생성':0,'기출':1}[k['kind']],k['key'])):
    key=k['key']; W(f"### {k['folder']} {key} ({k['kind']}, 평균 {M[key]:.3f}, 정답 {k['answer']})")
    for run,i,r in R[key]:
        if i==1: W(f"- r{run}-1 [{r['grade']}] 답 {r['answer']} 결함 {r.get('defects') or '없음'}: {r['reason']}")
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(O)+'\n'); print(open(C+'aggregate-out.md',encoding='utf8').read().split('## d.')[0])
