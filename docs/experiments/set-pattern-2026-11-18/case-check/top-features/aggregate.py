# 기출 A형 상위 특성 확인 집계. 측정값과 미리 정한 판정 문구만.
import json, re, os, glob, collections
C=os.path.dirname(os.path.abspath(__file__))+'/'; LC=C+'../lure-check/'; AR=C+'../a-recheck/'
SC={'수능 같음':2,'중':1,'수능 아님':0}
def blocks(t):
    m=re.findall(r'```json\s*(.*?)```',t,re.S)
    try: return json.loads(m[-1])
    except Exception: return None
def reports(d):
    out=[]
    for p in sorted(glob.glob(d+'/REPORT-eval-r*-*.md')):
        b=blocks(open(p,encoding='utf8').read())
        if b and len(b)==1: out.append(b[0])
    return out
LK={k['key'].split(' ')[0]:k for k in json.load(open(LC+'KEY.json'))}; LKF={k['key']:k['folder'] for k in json.load(open(LC+'KEY.json'))}
AK={k['key']:k for k in json.load(open(AR+'KEY.json'))}; SK={k['key'].replace(' ','_'):k for k in json.load(open(C+'KEY.json'))}
SRC={}  # key -> list of report dirs
for k in SK: SRC[k]=[C+SK[k]['folder']]
for n in ('N-K16','N-K04','N-K24','N-K37','N-K21','N-K41','P-K01','P-K07','P-K08','P-K22','P-K42','P-K12','B-3a-orig','B-3b-orig'): SRC[n]=[LC+LK[n]['folder']]
SRC['N-K37'].append(AR+AK['K-top-K37 건축']['folder']); SRC['N-K21'].append(AR+AK['K-mid-K21 과징금']['folder']); SRC['P-K07'].append(AR+AK['K-mid-K07 상계']['folder']); SRC['N-K41'].append(AR+AK['K-mid-K41 집합건물']['folder'])
for k in AK:
    if k.startswith('G-') or k in ('K-top-gongsun12','K-top-gongsi12'): SRC[k]=[AR+AK[k]['folder']]
L=json.load(open(C+'FEAT-LIST.json')); mean=lambda x: sum(x)/len(x) if x else float('nan')
ROWS=[]
for it in L:
    k=it['key']; rs=[r for d in SRC[k] for r in reports(d)]; F=[]
    for s in ('f1','f2'):
        p=C+f'features/{k}/FEAT-{s}.md'
        b=blocks(open(p,encoding='utf8').read()) if os.path.exists(p) else None
        F.append(b if isinstance(b,dict) else None)
    row=dict(key=k,group=it['group'],n=len(rs),score=mean([SC[r['grade']] for r in rs]),reason=(reports(SRC[k][0])[0]['reason'] if rs else ''),F=F)
    for f in ('F1','F2','F3','F4'):
        v=[bool(x[f]) for x in F if x and f in x]
        row[f]=None if not v else (1.0 if all(v) else (0.0 if not any(v) else 0.5)); row[f+'_agree']=(len(v)==2 and v[0]==v[1]) if v else None
    row['nf']=sum(row[f] for f in ('F1','F2','F3','F4') if row[f] is not None)
    ROWS.append(row)
def rank(x):
    s=sorted(range(len(x)),key=lambda i:x[i]); r=[0]*len(x); i=0
    while i<len(s):
        j=i
        while j+1<len(s) and x[s[j+1]]==x[s[i]]: j+=1
        for t in range(i,j+1): r[s[t]]=(i+j)/2+1
        i=j+1
    return r
def spear(a,b):
    ra,rb=rank(a),rank(b); ma,mb=mean(ra),mean(rb)
    num=sum((x-ma)*(y-mb) for x,y in zip(ra,rb)); den=(sum((x-ma)**2 for x in ra)*sum((y-mb)**2 for y in rb))**.5
    return num/den if den else float('nan')
O=[]; W=O.append
W('# 기출 A형 상위 특성 확인 집계 (자동 생성)\n'); W('## a. 문항별\n'); W('| 키 | 구분 | 점수(회수) | F1 | F2 | F3 | F4 | 특성 수 |'); W('|---|---|---|---|---|---|---|---|')
for r in ROWS: W(f"| {r['key']} | {r['group']} | {r['score']:.3f} ({r['n']}) | {r['F1']} | {r['F2']} | {r['F3']} | {r['F4']} | {r['nf']} |")
GI=[r for r in ROWS if r['group'].startswith('기출')]; GG=[r for r in ROWS if r['group']=='생성']
def analyze(rows,title,verdict):
    W(f'\n## {title} ({len(rows)}문항)\n')
    hi=[r for r in rows if r['nf']>=3]; lo=[r for r in rows if r['nf']<=1]
    W(f"- 특성 수 ≥3: {len(hi)}문항 평균 {mean([r['score'] for r in hi]):.3f}; ≤1: {len(lo)}문항 평균 {mean([r['score'] for r in lo]):.3f}")
    d=None; used='≥3 − ≤1'
    if len(hi)>=4 and len(lo)>=4: d=mean([r['score'] for r in hi])-mean([r['score'] for r in lo])
    else:
        s=sorted(rows,key=lambda r:r['nf']); h=len(s)//2; d=mean([r['score'] for r in s[-h:]])-mean([r['score'] for r in s[:h]]); used='상위 절반 − 하위 절반(한 묶음이 4문항 미만이라 대체)'
    W(f'- 차이({used}) = {d:+.3f}')
    W('\n| 특성 | 1인 문항(수) 평균 | 0인 문항(수) 평균 | 1−0 | 0.5(갈림) 문항 수 | 두 평가자 일치율 |'); W('|---|---|---|---|---|---|')
    diffs={}
    for f in ('F1','F2','F3','F4'):
        one=[r['score'] for r in rows if r[f]==1.0]; zero=[r['score'] for r in rows if r[f]==0.0]; ag=[r[f+'_agree'] for r in rows if r[f+'_agree'] is not None]
        diffs[f]=(mean(one)-mean(zero) if one and zero else float('nan'),mean([1.0 if a else 0.0 for a in ag]))
        W(f"| {f} | {mean(one):.3f} ({len(one)}) | {mean(zero):.3f} ({len(zero)}) | {diffs[f][0]:+.3f} | {sum(r[f]==0.5 for r in rows)} | {diffs[f][1]*100:.0f}% |")
    rho=spear([r['nf'] for r in rows],[r['score'] for r in rows]); W(f'\n- Spearman ρ(특성 수, 점수) = {rho:+.3f}')
    return d,diffs,rho
d,diffs,rho=analyze(GI,'b. 기출 26',True)
dg,dgs,rhog=analyze(GG,'c. 생성 8 (참고)',False)
W('\n## d. 6단계 판정 (미리 정한 기준 기계 적용)\n')
v='특성이 상위를 가름' if d>=0.5 else ('약하게 가름' if d>=0.2 else '특성이 상위를 못 가름')
W(f'- [가(특성이 상위를 가르나)] 차이 {d:+.3f} → **{v}**')
for f in ('F1','F2','F3','F4'):
    dd,ag=diffs[f]; j='쓸 만함' if dd>=0.4 else '약함'; W(f"- [나(특성별)] {f}: 1−0 = {dd:+.3f} → **{j}**"+(' **표시 불안정**' if ag<0.7 else '')+f' (일치율 {ag*100:.0f}%)')
W(f'- [다(생성 문항 참고)] 생성 8 ρ(특성 수, 점수) = {rhog:+.3f} (판정 없음)')
W('- 웹의 사전 예측(적어 두기만): 가 = "특성이 상위를 가름" 또는 "약하게 가름". F1·F3이 가장 쓸 만하고, F4는 표시가 불안정할 것.')
W('\n## e. 문항별 특성 근거(f1)·점수 이유(r1-1)\n')
for r in ROWS:
    f1=r['F'][0]; W(f"### {r['key']} (점수 {r['score']:.3f}, 특성 수 {r['nf']})")
    if f1: W(f"- f1: F1={f1.get('F1')} F2={f1.get('F2')} F3={f1.get('F3')} F4={f1.get('F4')} | "+' / '.join(f"{k}: {v}" for k,v in (f1.get('why') or {}).items()))
    W(f"- 점수 이유(r1-1): {r['reason']}")
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(O)+'\n'); print('\n'.join(O[:75]))
