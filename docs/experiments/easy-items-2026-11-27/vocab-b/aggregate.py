# 어휘 규칙 v2 조선 노비제 꼴 A 다시 시험 집계 + 미리 정한 판정. 실행: python3 <이 파일>
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
W('# 어휘 규칙 v2 조선 노비제 꼴 A 다시 시험 vocab-b 집계 (자동 생성)\n')
W('## a. 문항별 (수능 같음 2 / 중 1 / 수능 아님 0, 평가자 4명 × 2회차 = 8회)\n')
W('| 폴더 | 키 | 구분 | 정답 | 평균 | 같음/중/아님 | 정답 일치 | 결함 표시 | 바닥 |'); W('|---|---|---|---|---|---|---|---|---|')
for k in sorted(KEYS,key=lambda k:({'생성':0,'기출':1}[k['kind']],k['key'])):
    key=k['key']; rs=[r for _,_,r in R[key]]; M[key]=mean([SC[r['grade']] for r in rs]); g=[r['grade'] for r in rs]
    OK[key]=sum(r['answer']==k['answer'] for r in rs); NO[key]=g.count('수능 아님'); D[key]=collections.Counter(x for r in rs for x in (r.get('defects') or []))
    fl=('실패' if FL['N-A']['floor_fail'] else '통과') if key=='B-N-A' else ('(vocab-a 통과)' if key=='A-N-A' else '-')
    W(f"| {k['folder']} | {key} | {k['kind']} | {k['answer']} | **{M[key]:.3f}** | {g.count('수능 같음')}/{g.count('중')}/{g.count('수능 아님')} | {OK[key]}/8 | {dict(D[key]) or '없음'} | {fl} |")
ref=[k['key'] for k in KEYS if k['kind']=='기출']
Bf=FL['N-A']['floor_fail']; B=0 if Bf else M['B-N-A']; A1=M['A-N-A']; Mm=mean([M[x] for x in ref]); NV=M['NV']; MA=mean([M[x] for x in ('NV','RV','MV','JV')])
G=(B+2.000+2.000+1.500)/4
if Bf: v='미달(바닥 실패)'
elif NO['B-N-A']>=4: v='미달(수능 아님 4/8 이상)'
elif G>=Mm-0.4: v='통과(기출 지문에서 기출 수준)'
elif G>=Mm-0.8: v='거의'
else: v='미달'
it=json.load(open(C+'gen/N-A/item.json')); old=json.load(open(C+'../vocab-a/gen/N-A/item.json'))
def pre(i): t=i['targets'][0]['text']; return t[:t.find(i['targets'][0]['word'])].split()[-1]
rep=lambda i: pre(i) in i['choices'][i['answer']-1]['text']
cnt=lambda ks,d: sum(D[x].get(d,0) for x in ks)
W('\n## b. 판정 (미리 정한 기준 기계 적용)\n')
W(f"- **판정: {v}**")
W(f"- B(새 N-A, 바닥 실패 0점) = {B:.3f} / A1(옛 N-A, 이번 블라인드) = {A1:.3f} / NV(같은 지문 기출 꼴 A) = {NV:.3f} / 꼴 A 기출 4개(NV RV MV JV) 평균 = {MA:.3f}")
W(f"- G = (B + vocab-a의 S-A 2.000, S-B 2.000, N-B 1.500)/4 = {G:.3f} / M(이번 기출 8개) = {Mm:.3f} / G−M = {G-Mm:+.3f} (기준 −0.4 → {Mm-0.4:.3f}, 거의 −0.8 → {Mm-0.8:.3f})")
W(f"- 새 N-A: 수능 아님 {NO['B-N-A']}/8, 정답 일치 {OK['B-N-A']}/8, 바닥 {'실패' if Bf else '통과'}")
W(f"- ㉲ 표시: 새 N-A {D['B-N-A'].get('㉲',0)}/8, 옛 N-A {D['A-N-A'].get('㉲',0)}/8, 기출 {cnt(ref,'㉲')}/64 / ㉳ 표시: 새 N-A {D['B-N-A'].get('㉳',0)}/8, 옛 N-A {D['A-N-A'].get('㉳',0)}/8, 기출 {cnt(ref,'㉳')}/64")
W(f"- 말 묶음 반복: 새 N-A 정답 예문에 앞 어절('{pre(it)}') {'있음' if rep(it) else '없음'} / 옛 N-A('{pre(old)}') {'있음' if rep(old) else '없음'}")
W(f"- 고른 낱말: 새 N-A '{it['targets'][0]['word']}'(구절 '{it['targets'][0]['text']}') / 옛 N-A '{old['targets'][0]['word']}'")
W('\n## c. 문항별 평가자 이유 (r1-1·r2-1)\n')
for k in sorted(KEYS,key=lambda k:({'생성':0,'기출':1}[k['kind']],k['key'])):
    key=k['key']; W(f"### {k['folder']} {key} ({k['kind']}, 평균 {M[key]:.3f}, 정답 {k['answer']})")
    for run,i,r in R[key]:
        if i==1: W(f"- r{run}-1 [{r['grade']}] 답 {r['answer']} 결함 {r.get('defects') or '없음'}: {r['reason']}")
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(O)+'\n'); print(open(C+'aggregate-out.md',encoding='utf8').read().split('## c.')[0])
