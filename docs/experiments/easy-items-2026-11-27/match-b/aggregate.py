# 규칙 v2 다시 시험 집계 + 미리 정한 판정 두 개 (match-a/aggregate.py 기반). 실행: python3 <이 파일>
import json, re, collections, os
C=os.path.dirname(os.path.abspath(__file__))+'/'
SC={'수능 같음':2,'중':1,'수능 아님':0}
KEYS=json.load(open(C+'KEY.json')); FL=json.load(open(C+'floor/floor-result.json'))
def blocks(t): return json.loads(re.findall(r'```json\s*(.*?)```',t,re.S)[-1])
R={};S={}
for k in KEYS:
    R[k['key']]=[]
    for run in (1,2):
        for i in range(1,5):
            b=blocks(open(C+f"{k['folder']}/REPORT-eval-r{run}-{i}.md",encoding='utf8').read()); assert len(b)==1,(k['key'],run,i)
            R[k['key']].append((run,i,b[0]))
    S[k['key']]=[]
    for run in (1,2):
        j=json.loads(re.findall(r'```json\s*(.*?)```',open(C+f"source-guess/{k['folder']}/GUESS-r{run}.md",encoding='utf8').read(),re.S)[-1]); S[k['key']].append(j)
mean=lambda xs: sum(xs)/len(xs)
M={};D={};OK={};NO={};O=[];W=O.append
W('# 내용 일치 규칙 v2 다시 시험 match-b 집계 (자동 생성)\n')
W('## a. 문항별 (수능 같음 2 / 중 1 / 수능 아님 0, 평가자 4명 × 2회차 = 8회)\n')
W('| 폴더 | 키 | 구분 | 정답 | 평균 | 같음/중/아님 | 정답 일치 | 결함 표시 | 바닥 | 출처 추정 실제/만든 것/모르겠음 | 기억함 |'); W('|---|---|---|---|---|---|---|---|---|---|---|')
for k in sorted(KEYS,key=lambda k:({'생성v2':0,'생성v1':1,'기출':2}[k['kind']],k['key'])):
    key=k['key']; rs=[r for _,_,r in R[key]]; M[key]=mean([SC[r['grade']] for r in rs]); g=[r['grade'] for r in rs]
    OK[key]=sum(r['answer']==k['answer'] for r in rs); NO[key]=g.count('수능 아님'); D[key]=collections.Counter(x for r in rs for x in (r.get('defects') or []))
    fl={'생성v2':None}.get(k['kind'],'-'); fl=('실패' if FL[key[2:]]['floor_fail'] else '통과') if k['kind']=='생성v2' else '-'
    sg=[s['guess'] for s in S[key]]; rem=sum(bool(s.get('remembered')) for s in S[key])
    W(f"| {k['folder']} | {key} | {k['kind']} | {k['answer']} | **{M[key]:.3f}** | {g.count('수능 같음')}/{g.count('중')}/{g.count('수능 아님')} | {OK[key]}/8 | {dict(D[key]) or '없음'} | {fl} | {sg.count('실제')}/{sg.count('만든 것')}/{sg.count('모르겠음')} | {rem}/2 |")
g2=[k['key'] for k in KEYS if k['kind']=='생성v2']; g1=[k['key'] for k in KEYS if k['kind']=='생성v1']; ref=[k['key'] for k in KEYS if k['kind']=='기출']
fail=[x for x in g2 if FL[x[2:]]['floor_fail']]
G2=mean([0 if x in fail else M[x] for x in g2]); G1=mean([M[x] for x in g1]); Mm=mean([M[x] for x in ref])
Mneg=mean([M[x] for x in ('KD','KH','KS','KC')]); Mpos=mean([M[x] for x in ('PA','PB','PC','PD')])
floor_no=[x for x in g2 if NO[x]>=4]
if len(fail)>=2: v='미달(바닥 실패 2개 이상)'
elif floor_no: v='미달(바닥: 수능 아님 4/8 이상 문항 있음)'
elif G2>=Mm-0.4: v='통과(기출 수준)'
elif G2>=Mm-0.8: v='거의'
else: v='미달'
nk=lambda ks: sum(D[x].get('㉳',0) for x in ks)
rem_items=[x for x in ref if any(s.get('remembered') for s in S[x])]
rr=lambda ks,t: mean([sum(s['guess']==t for s in S[x])/2 for x in ks])
real_ref=rr(ref,'실제'); real_gen=rr(g2+g1,'실제')
if len(rem_items)>=4: v2='평가자가 기출을 알아봄'
elif real_ref-real_gen>=0.5: v2='알아보지는 않지만 출처를 가려냄'
else: v2='출처를 못 가려냄'
W('\n## b. 전체 판정 (미리 정한 기준 기계 적용)\n')
W(f"- **판정: {v}**")
W(f"- G2(v2 생성 4개 평균, 바닥 실패 0점) = {G2:.3f} / G1(v1 생성 4개) = {G1:.3f} / G2−G1 = {G2-G1:+.3f}")
W(f"- M(기출 8개) = {Mm:.3f} / G2−M = {G2-Mm:+.3f} / M_neg(KD KH KS KC) = {Mneg:.3f} / M_pos(PA PB PC PD) = {Mpos:.3f}")
gm=lambda ks,suf: mean([M[x] for x in ks if x.endswith(suf)])
W(f"- 발문별 생성 평균: v2 neg {gm(g2,'neg'):.3f} / v2 pos {gm(g2,'pos'):.3f} / v1 neg {gm(g1,'neg'):.3f} / v1 pos {gm(g1,'pos'):.3f}")
W(f"- ㉳ 표시 수(32회 중): v2 {nk(g2)} 대 v1 {nk(g1)} (기출 8개 {nk(ref)}/64)")
W(f"- 바닥 실패 문항: {', '.join(f'{x}: '+'; '.join(FL[x[2:]]['reasons']) for x in fail) or '없음'}")
W(f"- 수능 아님 4/8 이상인 v2 문항: {floor_no or '없음'}")
W('\n## c. 출처 추정 참고 판정 (위 판정과 별개)\n')
W(f"- **판정: {v2}**")
W(f"- 기출 8개 중 remembered=true 가 한 번이라도 나온 문항: {len(rem_items)}개 {rem_items or ''}")
W(f"- '실제'로 답한 비율: 기출 {real_ref:.3f}, 생성(v2+v1) {real_gen:.3f}, 차 {real_ref-real_gen:+.3f} (v2만 {rr(g2,'실제'):.3f}, v1만 {rr(g1,'실제'):.3f})")
W(f"- remembered=true 총 횟수: 기출 {sum(bool(s.get('remembered')) for x in ref for s in S[x])}/16, v2 {sum(bool(s.get('remembered')) for x in g2 for s in S[x])}/8, v1 {sum(bool(s.get('remembered')) for x in g1 for s in S[x])}/8")
W('\n## d. 문항별 평가자 이유 (r1-1·r2-1)와 출처 추정 이유\n')
for k in sorted(KEYS,key=lambda k:({'생성v2':0,'생성v1':1,'기출':2}[k['kind']],k['key'])):
    key=k['key']; W(f"### {k['folder']} {key} ({k['kind']}, 평균 {M[key]:.3f}, 정답 {k['answer']})")
    for run,i,r in R[key]:
        if i==1: W(f"- r{run}-1 [{r['grade']}] 답 {r['answer']} 결함 {r.get('defects') or '없음'}: {r['reason']}")
    for n,s in enumerate(S[key],1): W(f"- 출처추정 {n}: {s['guess']} (기억 {s.get('remembered')}) {s['reason']}")
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(O)+'\n'); print(open(C+'aggregate-out.md',encoding='utf8').read().split('## d.')[0])
