# 어휘 규칙 v3 우리 지문 바꿔 쓰기 다시 시험 집계 + 미리 정한 판정. 실행: python3 <이 파일>
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
W('# 어휘 규칙 v3 우리 지문 바꿔 쓰기 다시 시험 vocab-d 집계 (자동 생성)\n')
W('## a. 문항별 (수능 같음 2 / 중 1 / 수능 아님 0, 평가자 4명 × 2회차 = 8회)\n')
W('| 폴더 | 키 | 구분 | 정답 | 평균 | 같음/중/아님 | 정답 일치 | 결함 표시 | 바닥 |'); W('|---|---|---|---|---|---|---|---|---|')
for k in sorted(KEYS,key=lambda k:({'생성':0,'기출':1}[k['kind']],k['key'])):
    key=k['key']; rs=[r for _,_,r in R[key]]; M[key]=mean([SC[r['grade']] for r in rs]); g=[r['grade'] for r in rs]
    OK[key]=sum(r['answer']==k['answer'] for r in rs); NO[key]=g.count('수능 아님'); D[key]=collections.Counter(x for r in rs for x in (r.get('defects') or []))
    fl=('-' if k['kind']=='기출' else (('실패' if FL[key[2:]]['floor_fail'] else '통과') if key.startswith('D-') else '(vocab-c 통과)'))
    W(f"| {k['folder']} | {key} | {k['kind']} | {k['answer']} | **{M[key]:.3f}** | {g.count('수능 같음')}/{g.count('중')}/{g.count('수능 아님')} | {OK[key]}/8 | {dict(D[key]) or '없음'} | {fl} |")
ref=[k['key'] for k in KEYS if k['kind']=='기출']; newk=['D-T-B','D-C-B']; oldk=['C-T-B','C-C-B']
fail=[x for x in newk if FL[x[2:]]['floor_fail']]; sc=lambda x: 0 if x in fail else M[x]
B3=mean([sc(x) for x in newk]); B2=mean([M[x] for x in oldk]); MB=mean([M[x] for x in ('SV','BV','GV','HV')]); Mm=mean([M[x] for x in ref])
G=(sc('D-T-B')+sc('D-C-B')+1.875+2.000)/4
if fail: v='미달(바닥 실패)'
elif B3>=MB-0.4 and G>=Mm-0.4: v='통과(바꿔 쓰기도 기출 수준)'
elif B3>B2 and G>=Mm-0.4: v='나아졌으나 바꿔 쓰기는 아직 낮음'
else: v='미달(규칙 효과 없음)'
cnt=lambda ks,d: sum(D[x].get(d,0) for x in ks)
W('\n## b. 판정 (미리 정한 기준 기계 적용)\n')
W(f"- **판정: {v}**")
W(f"- B3(새 바꿔 쓰기 2개, 바닥 실패 0점) = {B3:.3f} / B2(옛 바꿔 쓰기 2개, 이번 블라인드) = {B2:.3f} / MB(기출 바꿔 쓰기 4개 SV BV GV HV) = {MB:.3f} (기준 MB−0.4 = {MB-0.4:.3f}) / M(기출 8개) = {Mm:.3f}")
W(f"- G = (새 T-B {sc('D-T-B'):.3f}, 새 C-B {sc('D-C-B'):.3f}, vocab-c T-A 1.875, C-A 2.000)/4 = {G:.3f} (기준 M−0.4 = {Mm-0.4:.3f}), G−M = {G-Mm:+.3f}")
W(f"- 새 문제별: D-T-B {M['D-T-B']:.3f} (수능 아님 {NO['D-T-B']}/8), D-C-B {M['D-C-B']:.3f} (수능 아님 {NO['D-C-B']}/8) / 옛 문제별: C-T-B {M['C-T-B']:.3f}, C-C-B {M['C-C-B']:.3f}  (vocab-c 때: T-B 1.250, C-B 0.750)")
W(f"- ㉲ 표시: 새 {cnt(newk,'㉲')}/16, 옛 {cnt(oldk,'㉲')}/16, 기출 {cnt(ref,'㉲')}/64 / ㉳ 표시: 새 {cnt(newk,'㉳')}/16, 옛 {cnt(oldk,'㉳')}/16, 기출 {cnt(ref,'㉳')}/64")
W(f"- other_sentence '아니오' 수: "+', '.join(f"{n} {len(FL[n]['other_no'])}개" for n in ('T-B','C-B'))+" (확인한 문장 "+str(sum(len(FL[n]['other_rows']) for n in ('T-B','C-B')))+"개)")
W(f"- 바닥 실패: {fail or '없음'}")
tg=[]
for x in ('T-B','C-B'):
    it=json.load(open(C+f'gen/{x}/item.json')); tg.append(f"새 {x}: "+', '.join(f"{t['mark']}'{t['word']}'→선지 {c['text'].split(': ')[1]}" for t,c in zip(it['targets'],it['choices'])))
W('- 고른 낱말: '+' / '.join(tg))
W('\n## c. 문항별 평가자 이유 (r1-1·r2-1)\n')
for k in sorted(KEYS,key=lambda k:({'생성':0,'기출':1}[k['kind']],k['key'])):
    key=k['key']; W(f"### {k['folder']} {key} ({k['kind']}, 평균 {M[key]:.3f}, 정답 {k['answer']})")
    for run,i,r in R[key]:
        if i==1: W(f"- r{run}-1 [{r['grade']}] 답 {r['answer']} 결함 {r.get('defects') or '없음'}: {r['reason']}")
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(O)+'\n'); print(open(C+'aggregate-out.md',encoding='utf8').read().split('## c.')[0])
