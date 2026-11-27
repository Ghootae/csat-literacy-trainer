# 밑줄 이해 규칙 v2 우리 지문 시험 집계 + 미리 정한 판정 (ul-b/aggregate.py 기반). 실행: python3 <이 파일>
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
W('# 밑줄 이해 규칙 v2 우리 지문 시험 ul-c 집계 (자동 생성)\n')
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
G=mean([sc(x) for x in gen]); Graw=mean([M[x] for x in gen]); Mm=mean([M[x] for x in ref]); GT=mean([sc('T-pos'),sc('T-neg')]); GC=mean([sc('C-pos'),sc('C-neg')])
GTr=mean([M['T-pos'],M['T-neg']]); GCr=mean([M['C-pos'],M['C-neg']])
Mp=mean([M[x] for x in ('SU','IU','RS','HY','PJ','FL')]); Mneg=mean([M[x] for x in ('PL','PZ')]); Gpos=mean([sc('T-pos'),sc('C-pos')]); Gneg=mean([sc('T-neg'),sc('C-neg')])
Gpos_raw=mean([M['T-pos'],M['C-pos']]); Gneg_raw=mean([M['T-neg'],M['C-neg']])
floor_no=[x for x in gen if NO[x]>=4]
if len(fail)>=2: v='미달(바닥 실패 2개 이상)'
elif floor_no: v='미달(바닥: 수능 아님 4/8 이상 문항 있음)'
elif G>=Mm-0.4: v='통과(우리 지문에서도 기출 수준)'
elif G>=Mm-0.8: v='거의'
else: v='미달'
v2="'적절한 것'도 기출 수준" if Gpos>=Mp-0.4 else "'적절한 것'은 아직 낮음"
cnt=lambda ks,d: sum(D[x].get(d,0) for x in ks)
pos=collections.Counter()
for x in gen:
    for c in json.load(open(C+f'gen/{x}/item.json'))['choices']:
        if c['truth']=='틀림':
            m=re.search(r'\((끝 반전|속 바꿔치기|적용·맞대기)\)',c['kind']); pos[m.group(1) if m else '표시없음']+=1
tg=json.load(open(C+'target-count.json'))
W('\n## b. 전체 판정 (미리 정한 기준 기계 적용)\n')
W(f"- **판정: {v}**")
W(f"- G(바닥 실패 0점) = {G:.3f} / M = {Mm:.3f} / G−M = {G-Mm:+.3f}")
W(f"- **참고(기계 판정 밖, 실제 평가자 점수 그대로): 바닥 실패를 0점 처리하지 않은 생성 4개 평균 = {Graw:.3f}, 그 G−M = {Graw-Mm:+.3f}**")
W(f"- 지문별(0점 처리 / 평가자 점수 그대로): G_T(혈액 응고) {GT:.3f} / {GTr:.3f}, G_C(청약 철회) {GC:.3f} / {GCr:.3f}")
W(f"- 발문별 pos(0점 처리 / 그대로) {Gpos:.3f} / {Gpos_raw:.3f} 대 Mp {Mp:.3f}, neg {Gneg:.3f} / {Gneg_raw:.3f} 대 기출 neg 2개 {Mneg:.3f}")
W(f"- ㉳ 표시 수: 생성 {cnt(gen,'㉳')}/32 (기출 {cnt(ref,'㉳')}/64), ㉲ 생성 {cnt(gen,'㉲')}/32 (기출 {cnt(ref,'㉲')}/64)")
W(f"- 바닥 실패 문항과 이유: "+(' / '.join(f'{x}: '+'; '.join(FL[x]['reasons']) for x in fail) or '없음'))
W(f"- 수능 아님 4/8 이상인 생성 문항: {floor_no or '없음'}")
W(f"- 고른 밑줄 구절: T ㉠ '{tg['T'][0]['text']}'(지문 {tg['T'][0]['count']}회) / C ㉠ '{tg['C'][0]['text']}'(지문 {tg['C'][0]['count']}회), ㉡ '{tg['C'][1]['text']}'(지문 {tg['C'][1]['count']}회; 풀이지에는 첫 등장에 표시)")
W(f"- 생성 오답(틀린 선지 {sum(pos.values())}개)의 자리 표시(생성기 자기 표시): {dict(pos)}")
W(f"\n## c. 참고 판정 (\"적절한 것\")\n\n- **{v2}** (pos 2개 평균 {Gpos:.3f}(바닥 실패 0점 처리) / {Gpos_raw:.3f}(그대로) 대 Mp − 0.4 = {Mp-0.4:.3f})")
W('\n## d. 문항별 평가자 이유 (r1-1·r2-1)\n')
for k in sorted(KEYS,key=lambda k:({'생성':0,'기출':1}[k['kind']],k['key'])):
    key=k['key']; W(f"### {k['folder']} {key} ({k['kind']}, 평균 {M[key]:.3f}, 정답 {k['answer']})")
    for run,i,r in R[key]:
        if i==1: W(f"- r{run}-1 [{r['grade']}] 답 {r['answer']} 결함 {r.get('defects') or '없음'}: {r['reason']}")
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(O)+'\n'); print(open(C+'aggregate-out.md',encoding='utf8').read().split('## d.')[0])
