# 순서표 ③-c 평가 잣대 점검 집계. 실행(저장소 루트): python3 docs/experiments/set-pattern-2026-11-18/calib-judge/aggregate.py
# 측정값만 적는다. 판정·결론·규칙 후보는 쓰지 않는다(웹이 한다).
import json, re, collections, os
SP='docs/experiments/set-pattern-2026-11-18/'; C=SP+'calib-judge/'
SC={'수능 같음':2,'중':1,'수능 아님':0}
KEYS=json.load(open(C+'KEY.json')); KEY={k['key']:k for k in KEYS}
def blocks(t): return json.loads(re.findall(r'```json\s*(.*?)```',t,re.S)[-1])
R={}   # R[key][run] = list of 4 dicts
for k in KEYS:
    R[k['key']]={}
    for run in (1,2):
        R[k['key']][run]=[]
        for i in range(1,5):
            b=blocks(open(C+f"{k['key']}/REPORT-eval-r{run}-{i}.md",encoding='utf8').read()); assert len(b)==1,(k['key'],run,i,len(b))
            R[k['key']][run].append(b[0])
def mean(xs): return sum(xs)/len(xs)
def sc(rs): return [SC[r['grade']] for r in rs]
OUT=[]; W=OUT.append
W('# 순서표 ③-c 평가 잣대 점검 집계 (자동 생성, 측정만)\n')
W('## a. 문항별 (수능 같음 2, 중 1, 수능 아님 0; 평가자 4명 × 2회차 = 8회)\n')
W('| 문항 | 구분 | 정답 | r1 등급(4) | r2 등급(4) | r1 평균 | r2 평균 | 두 회차 평균 | 같음/중/아님(8) | 정답 일치 | 결함 표시 빈도(8) |'); W('|---|---|---|---|---|---|---|---|---|---|---|')
M={}
for k in KEYS:
    key=k['key']; a=R[key][1]; b=R[key][2]; allr=a+b; m1=mean(sc(a)); m2=mean(sc(b)); M[key]=mean(sc(allr))
    g=[r['grade'] for r in allr]; ok=sum(r['answer']==k['answer'] for r in allr)
    d=collections.Counter(x for r in allr for x in (r.get('defects') or []))
    W(f"| {k['label']} | {k['kind']} | {k['answer']} | {' / '.join(r['grade'] for r in a)} | {' / '.join(r['grade'] for r in b)} | {m1:.2f} | {m2:.2f} | **{M[key]:.3f}** | {g.count('수능 같음')}/{g.count('중')}/{g.count('수능 아님')} | {ok}/8 | {dict(d) or '없음'} |")
W('\n## b. 이미 칸 대조로 쓴 5문항: 이번(혼자 평가) vs 칸 블라인드(생성 문항과 섞어 평가)\n')
# 칸 블라인드 보고: (key, 이름, KEY json, 보고서 접두, 회차 이름)
def cellrounds(key):
    out=[]
    srcs={'gongsun-12':[('cell1 r1',SP+'cell1-v62/blind/KEY-cell1.json',SP+'cell1-v62/blind/REPORT-cell1-eval%d.md','gongsun-12'),('cell1 r2',SP+'cell1-v62/r2/blind/KEY-cell1r2.json',SP+'cell1-v62/r2/blind/REPORT-cell1r2-eval%d.md','gongsun-12')],
          'infoasym-13':[('cell1 r1',SP+'cell1-v62/blind/KEY-cell1.json',SP+'cell1-v62/blind/REPORT-cell1-eval%d.md','infoasym-13'),('cell1 r2',SP+'cell1-v62/r2/blind/KEY-cell1r2.json',SP+'cell1-v62/r2/blind/REPORT-cell1r2-eval%d.md','infoasym-13'),('cell2 r2',SP+'cell2/blind-r2/KEY-cell2-r2.json',SP+'cell2/blind-r2/REPORT-cell2-r2-eval%d.md','infoasym-13')],
          'tax-incidence-12':[('cell2 r1',SP+'cell2/blind/KEY-cell2.json',SP+'cell2/blind/REPORT-cell2-eval%d.md','tax-incidence-12'),('cell2 r2',SP+'cell2/blind-r2/KEY-cell2-r2.json',SP+'cell2/blind-r2/REPORT-cell2-r2-eval%d.md','tax-incidence-12')],
          'solid-catalyst-10':[(f'cell3 r{r}',SP+f'cell3/blind/solid-catalyst/KEY-r{r}.json',SP+f'cell3/blind/solid-catalyst/REPORT-eval-r{r}-%d.md','solid-catalyst-10') for r in (1,2)],
          'auxin-17':[(f'cell3 r{r}',SP+f'cell3/blind/auxin-growth/KEY-r{r}.json',SP+f'cell3/blind/auxin-growth/REPORT-eval-r{r}-%d.md','auxin-17') for r in (1,2)]}[key]
    for name,kj,rp,tag in srcs:
        kk=[x for x in json.load(open(kj)) if tag in x['source']][0]; gs=[]
        for i in range(1,5):
            for r in blocks(open(rp%i,encoding='utf8').read()):
                if str(r['item'])==str(kk['item']) and (('passage' not in r) or ('passage' not in kk) or str(r['passage'])==str(kk['passage'])): gs.append(r['grade'])
        assert len(gs)==4,(key,name,gs); out.append((name,gs))
    return out
W('| 문항 | 혼자 평가 평균(8회) | 칸 블라인드 회차별(평가자 4명 등급 평균) | 칸 블라인드 전체 평균 | 차이(혼자 − 칸) |'); W('|---|---|---|---|---|')
CM={}
for key in ['gongsun-12','infoasym-13','tax-incidence-12','solid-catalyst-10','auxin-17']:
    cr=cellrounds(key); allg=[g for n,gs in cr for g in gs]; CM[key]=mean([SC[g] for g in allg])
    W(f"| {KEY[key]['label']} | {M[key]:.3f} | {'; '.join(f'{n} {mean([SC[g] for g in gs]):.2f}' for n,gs in cr)} | {CM[key]:.3f} ({len(allg)}회) | {M[key]-CM[key]:+.3f} |")
W(f"\n- 5문항 평균: 혼자 평가 {mean([M[k] for k in CM]):.3f}, 칸 블라인드 {mean(list(CM.values())):.3f}")
W('\n## c. 평가원·수능만 (공손룡·조세·옥신 제외 7문항)\n')
PUB=['infoasym-13','solid-catalyst-10','plastic-10','laozi-16','audio-17','piezo-11','diffusion-13']
allr=[r for k in PUB for run in (1,2) for r in R[k][run]]; g=[r['grade'] for r in allr]
W(f"- 문항 평균들의 평균: **{mean([M[k] for k in PUB]):.3f}** (문항별: "+', '.join(f"{KEY[k]['label'].split(' (')[0]} {M[k]:.3f}" for k in PUB)+')')
W(f"- 평가 {len(g)}회 분포: 수능 같음 {g.count('수능 같음')} / 중 {g.count('중')} / 수능 아님 {g.count('수능 아님')}  (회당 평균 {mean([SC[x] for x in g]):.3f})")
W(f"- 문항 평균 1.0 이하: {sum(M[k]<=1.0 for k in PUB)}문항 ({', '.join(KEY[k]['label'].split(' (')[0] for k in PUB if M[k]<=1.0) or '없음'}); 1.5 이상: {sum(M[k]>=1.5 for k in PUB)}문항 ({', '.join(KEY[k]['label'].split(' (')[0] for k in PUB if M[k]>=1.5) or '없음'})")
W(f"- (참고) 10문항 전체 평균 {mean(list(M.values())):.3f}; 기출 10문항 중 1.0 이하 {sum(v<=1.0 for v in M.values())}문항")
W('\n## d. 등급이 \'중\'·\'수능 아님\'인 평가의 이유에서 반복되는 말 (80회 중 해당 평가, 정규식 세기)\n')
low=[(k,run,i,r) for k in M for run in (1,2) for i,r in enumerate(R[k][run],1) if r['grade']!='수능 같음']
W(f"- 대상 평가 수: {len(low)}회 (중 {sum(r['grade']=='중' for *_,r in low)}, 수능 아님 {sum(r['grade']=='수능 아님' for *_,r in low)})")
PAT={'㉲ 정답이 지문 한 문장으로 정해짐(결함 표시 ㉲)':None,'㉯ 〈보기〉 없이 풀림(결함 표시 ㉯)':None,
 '이유에 "한 문장|한 단계|한 줄|바로 정해|곧바로|직접 대응|그대로" (정답이 쉽게 정해짐)':r'한 문장|한 단계|한 줄|바로 정해|곧바로|직접 대응|그대로',
 '이유에 "〈보기〉 없이|보기를 안|보기 없이|보기 없어도|보기에 의존|보기와 무관" (㉯류)':r'〈보기〉\s*없이|보기\s*없이|보기를 안|보기 없어도|보기에\s*의존|보기와 무관|보기 없이도',
 '이유에 "지문 예시|이름만|옮김|재진술|반복" (㉮류)':r'지문 예시|이름만|옮김|재진술|반복',
 '이유에 "단순|쉬움|쉽게|변별|난도|낮" (쉬움·낮은 변별)':r'단순|쉬움|쉽게|변별|난도|낮은',
 '이유에 "이의|시비|논란|모호|애매" (정답 시비)':r'이의|시비|논란|모호|애매',
 '이유에 "기출|평가원|실제 수능|수능 기출" (출처 짐작)':r'기출|평가원|실제 수능',
 '이유에 "그래프|그림|읽기 판|표" (그림·표 탓)':r'그래프|그림|읽기 판'}
W('| 표현 | 해당 평가 수 | 해당 문항(문항: 횟수) |'); W('|---|---|---|')
for name,pat in PAT.items():
    if name.startswith('㉲'): hit=[x for x in low if '㉲' in (x[3].get('defects') or [])]
    elif name.startswith('㉯'): hit=[x for x in low if '㉯' in (x[3].get('defects') or [])]
    else: hit=[x for x in low if re.search(pat,x[3]['reason'])]
    c=collections.Counter(KEY[x[0]]['label'].split(' (')[0] for x in hit); W(f"| {name} | {len(hit)} | {dict(c) or '-'} |")
dc=collections.Counter(d for *_,r in low for d in (r.get('defects') or [])); W(f"\n- '중'·'수능 아님' 평가의 결함 표시 빈도 전체: {dict(dc) or '없음'}")
W('\n## 문항별 평가자 이유 (한 줄씩, 등급이 같음이 아닌 것만 아님/중 표시)\n')
for k in KEYS:
    key=k['key']; W(f"### {k['label']} (두 회차 평균 {M[key]:.3f}, 정답 {k['answer']})")
    for run in (1,2):
        for i,r in enumerate(R[key][run],1): W(f"- r{run}-{i} [{r['grade']}] 답 {r['answer']} 결함 {r.get('defects') or '없음'}: {r['reason']}")
W('\n## 정답 불일치·형식 실패\n')
bad={(k,run,i):r['answer'] for k in M for run in (1,2) for i,r in enumerate(R[k][run],1) if r['answer']!=KEY[k]['answer']}
W(f"- 정답 불일치: {bad or '없음'}")
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(OUT)+'\n'); print('\n'.join(OUT[:60]))
