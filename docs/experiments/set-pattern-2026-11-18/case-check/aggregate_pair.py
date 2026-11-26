import json,re,collections,statistics as st
SC={'수능 같음':2,'중':1,'수능 아님':0}
rows=[]
for R in ('r1','r2','r3'):
    key={k['item']:k for k in json.load(open(f'blind-pair/KEY-{R}.json'))}
    for e in range(1,5):
        t=open(f'blind-pair/REPORT-eval-{R}-{e}.md',encoding='utf8').read()
        for x in json.loads(re.findall(r'```json\s*(\[.*?\])\s*```',t,re.S)[-1]):
            k=key[str(x['item'])]; rows.append(dict(R=R,e=e,src=k['source'],key=k['answer'],ans=x['answer'].strip(),grade=x['grade'],score=SC[x['grade']],defects=x.get('defects',[]),reason=x.get('reason','')))
json.dump(rows,open('pair-blind-rows.json','w'),ensure_ascii=False,indent=1)
m=lambda v:f'{st.mean(v):.3f}' if v else '-'
def cls(r):
    if re.search(r'꼼꼼|너무 쉬|단순 대조|사실 확인|읽기만|대조만|쉽게 (판정|풀)|문장 대조|확인만',r): return '〈보기〉 꼼꼼히 읽기만 묻는다·너무 쉬움'
    if re.search(r'지문 한 문장|지문 한 사실|지문 문장|지문만으로|그대로 뒤집|단순 부정|바로 정해|지문의 진술',r): return '정답이 지문 한 문장'
    if re.search(r'지문 원칙|원칙만으로|원리만으로|오답.*(지워|제거|배제)|배제할 수|사례를 읽지|사례 없이',r): return '오답이 지문 원칙만으로 지워짐'
    if re.search(r'시비|이의|모호|해석 여지|복수 정답|둘 이상|애매',r): return '정답 시비'
    return '기타'
out=['# 집계: 사례 갈림 사실 순서 (pair, 공손룡 짝 카드) 블라인드 (평가자 4명 × 3회, seed 20261341·42·43)','','점수 수능 같음 2 / 중 1 / 수능 아님 0. 이유 분류는 키워드 규칙이라 거칠다.','','## 1. 문항별 회차별 등급·평균','','| 문항 | r1 | r2 | r3 | 3회 평균 | 같음/중/아님 | ㉯ | ㉲ | 정답 일치 |','|---|---|---|---|---|---|---|---|---|']
S=collections.OrderedDict()
for r in rows: S.setdefault(r['src'],[]).append(r)
for s,v in sorted(S.items()):
    c=collections.Counter(x['grade'] for x in v)
    out.append(f"| {s} | "+' | '.join(m([x['score'] for x in v if x['R']==R]) for R in ('r1','r2','r3'))+f" | {m([x['score'] for x in v])} | {c['수능 같음']}/{c['중']}/{c['수능 아님']} | {sum('㉯' in x['defects'] for x in v)} | {sum('㉲' in x['defects'] for x in v)} | {sum(x['ans'].startswith(x['key']) for x in v)}/{len(v)} |")
sel={'짝 카드 A':lambda s:s=='짝 카드 A-V1','전제형 A':lambda s:s=='전제형 A-V1','옛 A':lambda s:s=='옛 A-V1'}
names=list(sel)
import re
POS=re.compile('위치|순서|방향|배치|추적')
def judge(pc,oa,pre,valid,pos):
    if not valid: return '판정 안 함'
    solved='해결' if pos<=3 else '미해결'
    if round(pc-oa,6)>=-0.5 and round(pc,6)>=1.5: sc='통과(청약에서 확인 후 채택 판단)'
    elif round(pc-pre,6)>=0.5: sc='나아짐, 미달'
    else: sc='효과 없음'
    return f'짝 문제 {solved}(위치·순서 추적 {pos}/12) / 점수 {sc}'
out+=['','## 2. 미리 정한 판정 (결과를 보고 바꾸지 않음)','','| 구간 | 기출 공손룡 | 블라인드 | 짝 카드 A | 전제형 A | 옛 A | 짝 카드−옛 | 짝 카드−전제형 | 판정 |','|---|---|---|---|---|---|---|---|---|']
for R in ('r1','r2','r3',None):
    sub=[x for x in rows if (R is None or x['R']==R)]
    g=lambda f:st.mean([x['score'] for x in sub if f(x['src'])])
    gg=g(lambda s:s.startswith('자격')); valid=round(gg,6)>=1.5
    pc=g(sel['짝 카드 A']); pre=g(sel['전제형 A']); oa=g(sel['옛 A'])
    pos=sum(1 for x in sub if sel['짝 카드 A'](x['src']) and POS.search(x['reason'] or ''))
    out.append(f"| {R or '3회 합(12표)'} | {gg:.3f} | {'유효' if valid else '무효'} | {pc:.3f} | {pre:.3f} | {oa:.3f} | {pc-oa:+.3f} | {pc-pre:+.3f} | {judge(pc,oa,pre,valid,pos)} |")
out+=['','## 2b. 위치·순서 추적 이유 수 (평가 이유에 위치|순서|방향|배치|추적, 12표 전부 대상. 회차당 4표)','','| 문항 | r1 | r2 | r3 | 합 |','|---|---|---|---|---|']
for n,f in tuple((k,sel[k]) for k in names):
    c=[sum(1 for x in rows if x['R']==R and f(x['src']) and POS.search(x['reason'] or '')) for R in ('r1','r2','r3')]
    out.append(f"| {n} | {c[0]} | {c[1]} | {c[2]} | {sum(c)}/12 |")
out+=['','## 3. 자격 기출 회차별 (1.5 미만이면 그 회차 무효)','','| 회차 | 평균 | 비고 |','|---|---|---|']
for R in ('r1','r2','r3'):
    v=m([x['score'] for x in rows if x['R']==R and x['src'].startswith('자격')]); out.append(f"| {R} | {v} | {'1.5 미만' if float(v)<1.5 else ''} |")
out+=['','## 4. ㉯·㉲·㉳ 문항별 (각 12판정)','','| 문항 | ㉯ | ㉲ | ㉳ |','|---|---|---|---|']
for n,v in sorted(S.items()): out.append(f"| {n} | {sum('㉯' in x['defects'] for x in v)} | {sum('㉲' in x['defects'] for x in v)} | {sum('㉳' in x['defects'] for x in v)} |")
cats=['정답이 지문 한 문장','오답이 지문 원칙만으로 지워짐','〈보기〉 꼼꼼히 읽기만 묻는다·너무 쉬움','정답 시비','기타']
out+=['','## 5. 평가 이유 분류 (수능 같음이 아닌 판정만)','','| 구분 | 판정 수 | '+' | '.join(cats)+' |','|---|---|'+'---|'*len(cats)]
for n,f in tuple((k,sel[k]) for k in names)+(('자격 기출',lambda s:s.startswith('자격')),):
    v=[x for x in rows if f(x['src']) and x['score']<2]; c=collections.Counter(cls(x['reason']) for x in v)
    out.append(f"| {n} | {len(v)} | "+' | '.join(str(c[k]) for k in cats)+' |')
out+=['','## 6. 결정 선지 원문 (새·옛) — 웹 손 분류용, 분류하지 않음','']
V='../../deep-item-v5-2026-11-18/'
for lab,d in (('새','out-case-lever3/solid-catalyst-%s/leakfix/items-leakfix.json'),):
    pass
SRC=[('짝 카드 A','out-case-pair/gongsun-long-later-mohists-A/leakfix/items-leakfix.json','',['V1']),('전제형 A','out-case-premise/gongsun-long-later-mohists-A/leakfix/items-leakfix.json','',['V1']),('옛 A','out-cell1-v62-r2/gongsun-long-later-mohists-A/leakfix/items-leakfix.json','',['V1'])]
for lab,pth,ab,vs in SRC:
    for mm in (ab or ['']):
        for ver in vs:
            it=[x for x in json.load(open(V+(pth%mm if mm else pth)))['items'] if x['version']==ver][0]
            neg='적절하지 않은' in it['stem']; dec=[it['answer']] if neg else [n for n in range(1,6) if n!=it['answer']]
            out.append(f"**{lab}{mm}-{ver}** ({'부정 발문: 정답' if neg else '긍정 발문: 오답 4개'} = 결정 선지, 정답 {it['answer']})")
            out+= [f"- {it['choices'][n-1]}" for n in dec]; out.append('')
open('aggregate-pair.md','w',encoding='utf8').write('\n'.join(out)+'\n'); print('\n'.join(out[:48]))
