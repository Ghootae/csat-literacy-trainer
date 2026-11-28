# o5 남은 칸 우리 지문 시험 집계 (cells-rejudge/aggregate.py 기반, 측정만). 실행: python3 <이 파일>
import json, re, collections, os, glob
C=os.path.dirname(os.path.abspath(__file__))+'/'; SP=os.path.abspath(C+'..')+'/'
SC={'수능 같음':2,'중':1,'수능 아님':0}
KEYS=json.load(open(C+'KEY.json')); KEY={k['key']:k for k in KEYS}
def blocks(t): return json.loads(re.findall(r'```json\s*(.*?)```',t,re.S)[-1])
R={}; MISS=[]
for k in KEYS:
    R[k['key']]=[]
    for run in (1,2):
        for i in range(1,5):
            p=C+f"{k['folder']}/REPORT-eval-r{run}-{i}.md"
            try:
                b=blocks(open(p,encoding='utf8').read()); assert len(b)==1; R[k['key']].append((run,i,b[0]))
            except Exception as e: MISS.append((k['key'],run,i))
mean=lambda xs: sum(xs)/len(xs)
def calib(folder):
    xs=[SC[blocks(open(f,encoding='utf8').read())[0]['grade']] for f in sorted(glob.glob(SP+f'calib-judge/{folder}/REPORT-eval-r*-*.md'))]
    assert len(xs)==8,(folder,len(xs)); return mean(xs)
M={}; O=[]; W=O.append; D={}; OK={}; NO={}
W('# o5 남은 칸 우리 지문 시험 집계 (자동 생성, 측정만)\n')
W(f'평가 회차 수: 정상 {sum(len(v) for v in R.values())}/{8*len(KEYS)}, 빈 회차 {MISS or "없음"}\n')
W('## a. 문항별 (수능 같음 2 / 중 1 / 수능 아님 0, 평가자 4명 × 2회차 = 8회)\n')
W('| 폴더 | 키 | 칸 | 구분 | 정답 | 평균 | 같음/중/아님 | 정답 일치 | 결함 표시 |'); W('|---|---|---|---|---|---|---|---|---|')
for k in sorted(KEYS,key=lambda k:(k['cell'],k['kind'],k['key'])):
    key=k['key']; rs=[r for _,_,r in R[key]]; M[key]=mean([SC[r['grade']] for r in rs]); g=[r['grade'] for r in rs]
    OK[key]=sum(r['answer']==k['answer'] for r in rs); NO[key]=g.count('수능 아님'); D[key]=collections.Counter(x for r in rs for x in (r.get('defects') or []))
    W(f"| {k['folder']} | {key} | {k['cell']} | {k['kind']} | {k['answer']} | **{M[key]:.3f}** | {g.count('수능 같음')}/{g.count('중')}/{g.count('수능 아님')} | {OK[key]}/{len(rs)} | {dict(D[key]) or '없음'} |")
fam=lambda p:[(k['key'],M[k['key']]) for k in KEYS if k['key'].startswith(p)]
anch={'과학 그래프':fam('KG-')+[('옥신17',calib('auxin-17')),('확산모델13',calib('diffusion-13'))],
      '과학 표':fam('KT-')+[('오디오17',calib('audio-17'))],
      '과학 실험':fam('KX-')+[('압전11',calib('piezo-11'))],
      '과학 사례':[('cells-rejudge 기준(6개 평균)',1.438)],
      '사회 관점':[('cells-rejudge 기준(5개 평균)',1.000)]}
FIX={'과학 사례':1.438,'사회 관점':1.000}
OLD={'과학 그래프':'통과','과학 표':'v5 기준 확정','과학 실험':'통과','과학 사례':'거의','사회 관점':'통과'}
CELLGEN={'과학 그래프':['TW-A-graph','TW-B-graph'],'과학 표':['TW-A-table','BL-A-table','BL-B-table'],'과학 실험':['TW-B-exp','BL-B-exp'],'과학 사례':['BL-A-case'],'사회 관점':['CW-A-view','CW-B-view'],'사회 사례':['CW-A-case','CW-B-case']}
W('\n## b. 칸별 기준 M (같은 갈래 기출을 단독으로 잰 점수)\n')
MM={}
for c,a in anch.items():
    MM[c]=FIX.get(c, mean([v for _,v in a])); W(f"- {c}: "+', '.join(f'{n} {v:.3f}' for n,v in a)+f" → M = {MM[c]:.3f}")
W('- 사회 사례: 이미 확정된 칸이라 M을 적지 않음(참고 칸)')
W('\n## c. 칸별 판정 (미리 정한 기준 기계 적용)\n')
W('| 칸 | G(생성 평균) | M(기출 기준) | G−M | 바닥(수능 아님 4/8↑ 생성 문항 수) | 칸 최고 생성 문항 | 예전 판정 | 판정 |'); W('|---|---|---|---|---|---|---|---|')
for c,gen in CELLGEN.items():
    G=mean([M[x] for x in gen]); floor=sum(NO[x]>=4 for x in gen); top=max(gen,key=lambda x:M[x])
    if c=='사회 사례':
        W(f"| {c}(참고) | {G:.3f} (생성 {len(gen)}개) | - | - | {floor} | {top} {M[top]:.3f} | 확정 칸 | 판정 없음(참고) |"); continue
    Mm=MM[c]
    v='미달(바닥: 수능 아님 4/8 이상 문항 있음)' if floor>=1 else ('통과(같은 갈래 기출 수준)' if G>=Mm-0.4 else ('거의' if G>=Mm-0.8 else '미달'))
    extra=''
    if c=='과학 사례': extra=f" (참고: 고체 촉매 6개 SC 평균 1.021와 합친 7개 평균 {(1.021*6+M['BL-A-case'])/7:.3f})"
    W(f"| {c} | {G:.3f} (생성 {len(gen)}개) | {Mm:.3f} | {G-Mm:+.3f} | {floor} | {top} {M[top]:.3f} | {OLD[c]} | **{v}**{extra} |")
W('\n## d. 세트 재료 표 (생성 12문항 중 1.5 이상)\n')
SRC={'gen31-T2-1':'수돗물 소독','gen31-T1-1':'혈액 응고','gen32-T3-2':'청약 철회'}
W('| 지문 | 키 | 칸 | 평균 | 같음/중/아님 |'); W('|---|---|---|---|---|')
PS={'TW':'수돗물 소독','BL':'혈액 응고','CW':'청약 철회'}
for k in sorted([k for k in KEYS if k['kind']=='생성' and M[k['key']]>=1.5],key=lambda k:(k['key'][:2],-M[k['key']])):
    g=[r['grade'] for _,_,r in R[k['key']]]; W(f"| {PS[k['key'][:2]]} | {k['key']} | {k['cell']} | {M[k['key']]:.3f} | {g.count('수능 같음')}/{g.count('중')}/{g.count('수능 아님')} |")
if not any(k['kind']=='생성' and M[k['key']]>=1.5 for k in KEYS): W('| (없음) | | | | |')
W('\n## 문항별 평가자 이유 (r1-1·r2-1)\n')
for k in sorted(KEYS,key=lambda k:(k['cell'],k['kind'],k['key'])):
    key=k['key']; W(f"### {k['folder']} {key} ({k['cell']} {k['kind']}, 평균 {M[key]:.3f}, 정답 {k['answer']})")
    for run,i,r in R[key]:
        if i==1: W(f"- r{run}-1 [{r['grade']}] 답 {r['answer']} 결함 {r.get('defects') or '없음'}: {r['reason']}"+(f" / 그래프 평: {r['graphNote']}" if r.get('graphNote') else ''))
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(O)+'\n'); print('\n'.join(O[:70]))
