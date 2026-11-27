# 밑줄 규칙 v3 청약 철회 다시 시험 집계 + 미리 정한 판정 (ul-c/aggregate.py 기반). 실행: python3 <이 파일>
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
W('# 밑줄 규칙 v3 청약 철회 다시 시험 ul-d 집계 (자동 생성)\n')
W('## a. 문항별 (수능 같음 2 / 중 1 / 수능 아님 0, 평가자 4명 × 2회차 = 8회)\n')
W('| 폴더 | 키 | 구분 | 정답 | 평균 | 같음/중/아님 | 정답 일치 | 결함 표시 | 바닥 |'); W('|---|---|---|---|---|---|---|---|---|')
for k in sorted(KEYS,key=lambda k:({'생성':0,'기출':1}[k['kind']],k['key'])):
    key=k['key']; rs=[r for _,_,r in R[key]]; M[key]=mean([SC[r['grade']] for r in rs]); g=[r['grade'] for r in rs]
    OK[key]=sum(r['answer']==k['answer'] for r in rs); NO[key]=g.count('수능 아님'); D[key]=collections.Counter(x for r in rs for x in (r.get('defects') or []))
    fl=('실패' if FL[key]['floor_fail'] else '통과') if k['kind']=='생성' else '-'
    W(f"| {k['folder']} | {key} | {k['kind']} | {k['answer']} | **{M[key]:.3f}** | {g.count('수능 같음')}/{g.count('중')}/{g.count('수능 아님')} | {OK[key]}/8 | {dict(D[key]) or '없음'} | {fl} |")
gen=[k['key'] for k in KEYS if k['kind']=='생성']; ref=[k['key'] for k in KEYS if k['kind']=='기출']
fail=[x for x in gen if FL[x]['floor_fail']]; sc=lambda x: 0 if x in fail else M[x]
GC=mean([sc(x) for x in gen]); G=(sum(sc(x) for x in gen)+2.000+2.000)/4; Mm=mean([M[x] for x in ref])
Mp=mean([M[x] for x in ('SU','IU','RS','HY','PJ','FL')]); Ppos=mean([sc('C-pos'),2.000])
floor_no=[x for x in gen if NO[x]>=4]
if fail: v='미달(바닥 실패)'
elif floor_no: v='미달(바닥: 수능 아님 4/8 이상)'
elif G>=Mm-0.4 and GC>=Mm-0.4: v='통과(우리 지문에서도 기출 수준)'
elif G>=Mm-0.8: v='거의'
else: v='미달'
cnt=lambda ks,d: sum(D[x].get(d,0) for x in ks)
pos=collections.Counter()
for x in gen:
    for c in json.load(open(C+f'gen/{x}/item.json'))['choices']:
        if c['truth']=='틀림':
            m=re.search(r'\((끝 반전|속 바꿔치기|적용·맞대기)\)',c['kind']); pos[m.group(1) if m else '표시없음']+=1
tg=json.load(open(C+'target-count.json'))['C']
W('\n## b. 판정 (미리 정한 기준 기계 적용)\n')
W(f"- **판정: {v}**")
W(f"- G_C(새 C 2개 평균, 바닥 실패 0점) = {GC:.3f} / G = (G_C 두 점수 + ul-c 혈액 응고 2.000·2.000)/4 = {G:.3f} / M(이번 블라인드 기출 8개) = {Mm:.3f}")
W(f"- G−M = {G-Mm:+.3f} (기준 −0.4 → {Mm-0.4:.3f}), G_C−M = {GC-Mm:+.3f}, 거의 기준 M−0.8 = {Mm-0.8:.3f}")
W(f"- ul-c 의 C 문항 점수(바닥 실패, 밑줄 '통신판매'·'방문판매'): C-pos 1.875, C-neg 1.750 (평균 1.812) → 이번 새 C: C-pos {M['C-pos']:.3f}, C-neg {M['C-neg']:.3f}")
W(f"- 참고: pos(새 C-pos + ul-c T-pos 2.000) 평균 {Ppos:.3f} 대 Mp {Mp:.3f} − 0.4 = {Mp-0.4:.3f} → " + ("기준 이상" if Ppos>=Mp-0.4 else "기준 미만"))
W(f"- ㉳ 표시 수: 생성 {cnt(gen,'㉳')}/16 (기출 {cnt(ref,'㉳')}/64), ㉲ 생성 {cnt(gen,'㉲')}/16 (기출 {cnt(ref,'㉲')}/64)")
W(f"- 바닥 실패 문항: {', '.join(fail) or '없음'} / 수능 아님 4/8 이상: {floor_no or '없음'}")
W("- 고른 밑줄 구절: " + ' / '.join(f"{t['mark']} '{t['text']}' (지문 {t['count']}회)" for t in tg))
W(f"- 오답 자리 표시(틀린 선지 {sum(pos.values())}개, 생성기 자기 표시): {dict(pos)}")
W('\n## c. 문항별 평가자 이유 (r1-1·r2-1)\n')
for k in sorted(KEYS,key=lambda k:({'생성':0,'기출':1}[k['kind']],k['key'])):
    key=k['key']; W(f"### {k['folder']} {key} ({k['kind']}, 평균 {M[key]:.3f}, 정답 {k['answer']})")
    for run,i,r in R[key]:
        if i==1: W(f"- r{run}-1 [{r['grade']}] 답 {r['answer']} 결함 {r.get('defects') or '없음'}: {r['reason']}")
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(O)+'\n'); print(open(C+'aggregate-out.md',encoding='utf8').read().split('## c.')[0])
