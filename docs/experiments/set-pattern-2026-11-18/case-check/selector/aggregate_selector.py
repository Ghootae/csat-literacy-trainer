import json,re,statistics as st
KEY=json.load(open('KEY-map.json'))
rows=json.load(open('../link-blind-rows.json'))
def blind(src): v=[r['score'] for r in rows if r['src']==src]; return st.mean(v)
OUT={}
for e in (1,2):
    t=open(f'raw-e{e}.md',encoding='utf-8').read(); d=json.loads(re.findall(r'```json\s*([\s\S]*?)```',t)[-1]); json.dump(d,open(f'out-e{e}.json','w'),ensure_ascii=False,indent=1); OUT[e]={str(x['item']):x for x in d}
CI='①②③④⑤'
def anum(a): a=str(a).strip(); return CI.index(a[0])+1 if a and a[0] in CI else int(re.findall(r'\d',a)[0])
def score(x,keyans):
    s2={'강':2,'약':1,'없음':0}[x['S2']['strength']]; s4=1 if x['S4']['needsPassage'] else 0; s3=sum(1 for y in x['S3'] if not y['fixed']); pen=-1 if anum(x['answer'])!=anum(keyans) else 0
    return s2+s4-s3+pen,s2,s4,s3,pen
out=['# 집계: 선별기 무료 검증 (S2 헷갈림·S3 참 선지 근거·S4 지름길), 평가자 2명 × 8문항','','선별 점수 = S2(강2/약1/없음0) + S4(needsPassage true 1) − S3(fixed=false 선지 수), 정답이 KEY와 다르면 −1. 블라인드 = blind-link 3회 12표 평균(aggregate-link.md).','','| 문항 | 블라인드 | 선별 평균 | e1(점수 S2/S4/S3false/정답일치) | e2 | S3 false 선지 e1/e2 | S2 e1/e2 | S4 needsPassage e1/e2 |','|---|---|---|---|---|---|---|---|']
res={}
for p,k in sorted(KEY.items(),key=lambda z:int(z[0])):
    sc={};cell=[]
    for e in (1,2):
        x=OUT[e][p]; s,s2,s4,s3,pen=score(x,k['answer']); sc[e]=s; cell.append(f"{s} ({x['S2']['strength']}/{'T' if x['S4']['needsPassage'] else 'F'}/{s3}/{'일치' if pen==0 else anum(x['answer'])})")
    fl=[ ','.join(str(y['n']) for y in OUT[e][p]['S3'] if not y['fixed']) or '-' for e in (1,2)]
    res[k['source']]=dict(p=p,b=blind(k['source']),s=(sc[1]+sc[2])/2,sc=sc)
    out.append(f"| {k['source']} (문항 {p}) | {res[k['source']]['b']:.3f} | {res[k['source']]['s']:.2f} | {cell[0]} | {cell[1]} | {fl[0]} / {fl[1]} | {OUT[1][p]['S2']['strength']}/{OUT[2][p]['S2']['strength']} | {OUT[1][p]['S4']['needsPassage']}/{OUT[2][p]['S4']['needsPassage']} |")
hi=[s for s,v in res.items() if round(v['b'],6)>=1.5]; lo=[s for s,v in res.items() if round(v['b'],6)<1.0]
hi=[s for s in hi if s in ('자격 기출 공시 12번','자격 기출 공손룡 12번','옛 청약 A-V1(out-cell5)','기준점 A안 도덕적 운 A-V2')]
sep=min(res[s]['s'] for s in hi)>max(res[s]['s'] for s in lo)
# 결함 맞힘
p1=[p for p,k in KEY.items() if k['source']=='새 청약 A-V1(link1)'][0]; p2=[p for p,k in KEY.items() if k['source']=='새 청약 A-V1(link2)'][0]
l1=all(any(y['n']==1 and not y['fixed'] for y in OUT[e][p1]['S3']) for e in (1,2))
l2=all(OUT[e][p2]['S2']['strength'] in('약','없음') or not OUT[e][p2]['S4']['needsPassage'] for e in (1,2))
hit=l1 and l2
tot='선별기 후보(후보 여러 개 만들고 고르기 시험 가치 있음)' if sep and hit else ('부분(사람 검토)' if sep or hit else '선별기로 쓰기 어려움')
def rank(v): 
    o=sorted(range(len(v)),key=lambda i:v[i]); r=[0]*len(v); i=0
    while i<len(o):
        j=i
        while j+1<len(o) and v[o[j+1]]==v[o[i]]: j+=1
        for k in range(i,j+1): r[o[k]]=(i+j)/2+1
        i=j+1
    return r
names=list(res); b=rank([res[n]['b'] for n in names]); s=rank([res[n]['s'] for n in names]); mb=st.mean(b); ms=st.mean(s)
rho=sum((x-mb)*(y-ms) for x,y in zip(b,s))/ (sum((x-mb)**2 for x in b)**.5*sum((y-ms)**2 for y in s)**.5)
agree=lambda f,n:sum(1 for p in KEY if f(OUT[1][p])==f(OUT[2][p]))/len(KEY)
a2=agree(lambda x:x['S2']['strength'],0); a4=agree(lambda x:x['S4']['needsPassage'],0)
a3=sum(1 for p in KEY for n in range(4) if OUT[1][p]['S3'][n]['fixed']==OUT[2][p]['S3'][n]['fixed'])/(8*4)
a3b=sum(1 for p in KEY if sorted(y['n'] for y in OUT[1][p]['S3'] if not y['fixed'])==sorted(y['n'] for y in OUT[2][p]['S3'] if not y['fixed']))/8
ans=sum(1 for p in KEY for e in (1,2) if anum(OUT[e][p]['answer'])==anum(KEY[p]['answer']))
S_=lambda n:res[n]['s']
out+=['','## 미리 정한 판정','',f"- 가름: 블라인드 ≥1.5 넷({', '.join(f'{s} {S_(s):.2f}' for s in hi)})의 최저 {min(res[s]['s'] for s in hi):.2f} vs 블라인드 <1.0 둘({', '.join(f'{s} {S_(s):.2f}' for s in lo)})의 최고 {max(res[s]['s'] for s in lo):.2f} → **{'성립' if sep else '불성립'}**",f"- 결함 맞힘: link1 ①이 두 평가자 모두 fixed=false → {l1}; link2가 두 평가자 모두 S2 약/없음 또는 S4 needsPassage=false → {l2} → **{'성립' if hit else '불성립'}**",f"- 종합: **{tot}**",'','## 참고(판정 아님)','',f"- Spearman(선별 점수 vs 블라인드, 8문항): {rho:.3f}",f"- 정답 일치: {ans}/16",f"- 평가자 간 일치율: S2 {a2:.2f}, S4 {a4:.2f}, S3(선지 단위) {a3:.2f}, S3(문항 단위 false 집합 일치) {a3b:.2f}",'','## link1 ①·link2 평가자 원문','']
for e in (1,2):
    x=[y for y in OUT[e][p1]['S3'] if y['n']==1][0]; out.append(f"- link1 ① e{e}: fixed={x['fixed']} alt={x['alt']}")
for e in (1,2):
    x=OUT[e][p2]; out.append(f"- link2 e{e}: S2 {x['S2']['strength']} lure=\"{x['S2']['lure']}\" fix=\"{x['S2']['fix']}\" / S4 needsPassage={x['S4']['needsPassage']} rebuttal=\"{x['S4']['rebuttal']}\" rule={x['S4']['rule']}")
out+=['','## 문항별 S3 fixed=false 상세','']
for p,k in sorted(KEY.items(),key=lambda z:int(z[0])):
    for e in (1,2):
        for y in OUT[e][p]['S3']:
            if not y['fixed']: out.append(f"- {k['source']} e{e} 선지 {y['n']}: {y['alt']}")
open('aggregate-selector.md','w',encoding='utf-8').write('\n'.join(out)+'\n'); print('\n'.join(out))
