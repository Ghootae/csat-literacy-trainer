# 남은 세 칸 새 기준 재판정 집계 (case-check/lure-check/aggregate.py 기반). 실행: python3 <이 파일>
import json, re, collections, os, glob
C=os.path.dirname(os.path.abspath(__file__))+'/'; SP=os.path.abspath(C+'..')+'/'
SC={'수능 같음':2,'중':1,'수능 아님':0}
KEYS=json.load(open(C+'KEY.json')); KEY={k['key']:k for k in KEYS}
def blocks(t): return json.loads(re.findall(r'```json\s*(.*?)```',t,re.S)[-1])
R={}
for k in KEYS:
    R[k['key']]=[]
    for run in (1,2):
        for i in range(1,5):
            b=blocks(open(C+f"{k['folder']}/REPORT-eval-r{run}-{i}.md",encoding='utf8').read()); assert len(b)==1,(k['key'],run,i)
            R[k['key']].append((run,i,b[0]))
mean=lambda xs: sum(xs)/len(xs)
# 기존 기출 점수: calib-judge 폴더(REPORT 8개 평균), top-features/aggregate-out.md 표
def calib(folder):
    xs=[]
    for f in sorted(glob.glob(SP+f'calib-judge/{folder}/REPORT-eval-r*-*.md')): xs.append(SC[blocks(open(f,encoding='utf8').read())[0]['grade']])
    assert len(xs)==8,(folder,len(xs)); return mean(xs)
TF={}
for l in open(SP+'case-check/top-features/aggregate-out.md',encoding='utf8'):
    m=re.match(r'\| (\S+) \| \S+ \| ([\d.]+) \((\d+)\)',l)
    if m: TF[m.group(1)]=(float(m.group(2)),int(m.group(3)))
M={}; O=[]; W=O.append; D={}; OK={}; NO={}
DEF=['㉮','㉯','㉰','㉱','㉲','㉳','㉴']
W('# 남은 세 칸 새 기준 재판정 집계 (자동 생성, 측정만)\n')
W('## a. 문항별 (수능 같음 2 / 중 1 / 수능 아님 0, 평가자 4명 × 2회차 = 8회)\n')
W('| 폴더 | 키 | 칸 | 구분 | 정답 | 평균 | 같음/중/아님 | 정답 일치 | 결함 표시 |'); W('|---|---|---|---|---|---|---|---|---|')
for k in sorted(KEYS,key=lambda k:k['key']):
    key=k['key']; rs=[r for _,_,r in R[key]]; M[key]=mean([SC[r['grade']] for r in rs]); g=[r['grade'] for r in rs]
    OK[key]=sum(r['answer']==k['answer'] for r in rs); NO[key]=g.count('수능 아님'); D[key]=collections.Counter(x for r in rs for x in (r.get('defects') or []))
    W(f"| {k['folder']} | {key} | {k['cell']} | {k['kind']} | {k['answer']} | **{M[key]:.3f}** | {g.count('수능 같음')}/{g.count('중')}/{g.count('수능 아님')} | {OK[key]}/8 | {dict(D[key]) or '없음'} |")
anch={'과학 사례':[('K06_혈압',TF['K06_혈압'][0]),('K38_도파민',TF['K38_도파민'][0]),('P-K12',TF['P-K12'][0]),('K43_딱정벌레',TF['K43_딱정벌레'][0]),('K17_고체_촉매',TF['K17_고체_촉매'][0]),('plastic-10',calib('plastic-10'))],
      '사회 관점':[(k['key'],M[k['key']]) for k in KEYS if k['key'].startswith('KV-')]+[('infoasym-13',calib('infoasym-13'))],
      '사회 그래프':[(k['key'],M[k['key']]) for k in KEYS if k['key'].startswith('KG-')]+[('tax-incidence-12',calib('tax-incidence-12'))]}
OLD={'과학 사례':'미달','사회 관점':'거의 1.31','사회 그래프':'거의 1.44'}
W('\n## b. 칸별 기준 M (같은 갈래 기출을 단독으로 잰 점수)\n')
for c,a in anch.items(): W(f"- {c}: "+', '.join(f'{n} {v:.3f}' for n,v in a)+f" → M = {mean([v for _,v in a]):.3f} ({len(a)}개 평균)")
W('\n## c. 칸별 판정 (미리 정한 기준 기계 적용)\n')
W('| 칸 | G(생성 평균) | M(기출 기준) | G−M | 바닥(수능 아님 4/8↑ 생성 문항 수) | 칸 최고 생성 문항 | 예전 판정 | 판정 |'); W('|---|---|---|---|---|---|---|---|')
V={}
for c in anch:
    gen=[k['key'] for k in KEYS if k['cell']==c and k['kind']=='생성']; G=mean([M[x] for x in gen]); Mm=mean([v for _,v in anch[c]])
    floor=sum(NO[x]>=4 for x in gen); top=max(gen,key=lambda x:M[x])
    v='미달(바닥: 수능 아님 4/8 이상 문항 있음)' if floor>=1 else ('통과(같은 갈래 기출 수준)' if G>=Mm-0.4 else ('거의' if G>=Mm-0.8 else '미달'))
    V[c]=v; extra=f" (참고: 지문 기출 K17 고체 촉매 {TF['K17_고체_촉매'][0]:.3f})" if c=='과학 사례' else ''
    W(f"| {c} | {G:.3f} (생성 {len(gen)}개) | {Mm:.3f}{extra} | {G-Mm:+.3f} | {floor} | {top} {M[top]:.3f} | {OLD[c]} | **{v}** |")
W('\n- 웹의 사전 예측(적어 두기만): 사회 관점 = 통과, 사회 그래프 = 통과, 과학 사례 = 바닥 때문에 미달 유지')
W('\n## 문항별 평가자 이유 (r1-1·r2-1)\n')
for k in sorted(KEYS,key=lambda k:(k['cell'],k['key'])):
    key=k['key']; W(f"### {k['folder']} {key} ({k['cell']} {k['kind']}, 평균 {M[key]:.3f}, 정답 {k['answer']})")
    for run,i,r in R[key]:
        if i==1: W(f"- r{run}-1 [{r['grade']}] 답 {r['answer']} 결함 {r.get('defects') or '없음'}: {r['reason']}")
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(O)+'\n'); print('\n'.join(O))
