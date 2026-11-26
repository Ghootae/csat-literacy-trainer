import json,re,collections,statistics as st
SC={'수능 같음':2,'중':1,'수능 아님':0}
rows=[]
for R in ('r1','r2','r3'):
    key={k['item']:k for k in json.load(open(f'blind-lever2/KEY-{R}.json'))}
    for e in range(1,5):
        t=open(f'blind-lever2/REPORT-eval-{R}-{e}.md',encoding='utf8').read()
        for x in json.loads(re.findall(r'```json\s*(\[.*?\])\s*```',t,re.S)[-1]):
            k=key[str(x['item'])]; rows.append(dict(R=R,e=e,src=k['source'],key=k['answer'],ans=x['answer'].strip(),grade=x['grade'],score=SC[x['grade']],defects=x.get('defects',[]),reason=x.get('reason','')))
json.dump(rows,open('lever2-blind-rows.json','w'),ensure_ascii=False,indent=1)
m=lambda v:f'{st.mean(v):.3f}' if v else '-'
def cls(r):
    if re.search(r'꼼꼼|너무 쉬|단순 대조|사실 확인|읽기만|대조만|쉽게 (판정|풀)|문장 대조|확인만',r): return '〈보기〉 꼼꼼히 읽기만 묻는다·너무 쉬움'
    if re.search(r'지문 한 문장|지문 한 사실|지문 문장|지문만으로|그대로 뒤집|단순 부정|바로 정해|지문의 진술',r): return '정답이 지문 한 문장'
    if re.search(r'지문 원칙|원칙만으로|원리만으로|오답.*(지워|제거|배제)|배제할 수|사례를 읽지|사례 없이',r): return '오답이 지문 원칙만으로 지워짐'
    if re.search(r'시비|이의|모호|해석 여지|복수 정답|둘 이상|애매',r): return '정답 시비'
    return '기타'
out=['# 집계: 사례 갈림 사실 순서 보완(lever2) 블라인드 (평가자 4명 × 3회, seed 20261291·92·93)','','점수 수능 같음 2 / 중 1 / 수능 아님 0. 이유 분류는 키워드 규칙이라 거칠다.','','## 1. 문항별 회차별 등급·평균','','| 문항 | r1 | r2 | r3 | 3회 평균 | 같음/중/아님 | ㉯ | ㉲ | 정답 일치 |','|---|---|---|---|---|---|---|---|---|']
S=collections.OrderedDict()
for r in rows: S.setdefault(r['src'],[]).append(r)
for s,v in sorted(S.items()):
    c=collections.Counter(x['grade'] for x in v)
    out.append(f"| {s} | "+' | '.join(m([x['score'] for x in v if x['R']==R]) for R in ('r1','r2','r3'))+f" | {m([x['score'] for x in v])} | {c['수능 같음']}/{c['중']}/{c['수능 아님']} | {sum('㉯' in x['defects'] for x in v)} | {sum('㉲' in x['defects'] for x in v)} | {sum(x['ans'].startswith(x['key']) for x in v)}/{len(v)} |")
sel={'새 칸(새 A-V2 + lever1 B-V2)':lambda s:s in('새 A-V2(lever2)','lever1 B-V2'),'lever1 칸(lever1 A-V2 + lever1 B-V2)':lambda s:s in('lever1 A-V2','lever1 B-V2'),'옛 칸(옛 A-V2 + 옛 B-V2)':lambda s:s.startswith('옛')}
names=list(sel)
out+=['','## 2. 칸 평균 (회차별 + 3회 합)','','| 회차 | '+' | '.join(names)+' | 새 − 옛 | lever1 − 옛 |','|---|---|---|---|---|---|']
for R in ('r1','r2','r3',None):
    v=[[x['score'] for x in rows if (R is None or x['R']==R) and sel[n](x['src'])] for n in names]
    out.append(f"| {R or '3회 합'} | "+' | '.join(m(a) for a in v)+f" | {st.mean(v[0])-st.mean(v[2]):+.3f} | {st.mean(v[1])-st.mean(v[2]):+.3f} |")
out+=['','판정 기준(웹): 새 칸 평균 1.5 이상 + 옛 칸보다 0.5 이상. 이 표는 측정만 적는다.','','## 3. 자격 기출 회차별 (1.5 미만이면 멈춤 회차)','','| 회차 | 평균 | 비고 |','|---|---|---|']
for R in ('r1','r2','r3'):
    v=m([x['score'] for x in rows if x['R']==R and x['src'].startswith('자격')]); out.append(f"| {R} | {v} | {'멈춤 회차' if float(v)<1.5 else ''} |")
out+=['','## 4. ㉯·㉲·㉳ 문항별 (각 12판정)','','| 문항 | ㉯ | ㉲ | ㉳ |','|---|---|---|---|']
for n,v in sorted(S.items()): out.append(f"| {n} | {sum('㉯' in x['defects'] for x in v)} | {sum('㉲' in x['defects'] for x in v)} | {sum('㉳' in x['defects'] for x in v)} |")
cats=['정답이 지문 한 문장','오답이 지문 원칙만으로 지워짐','〈보기〉 꼼꼼히 읽기만 묻는다·너무 쉬움','정답 시비','기타']
out+=['','## 5. 평가 이유 분류 (수능 같음이 아닌 판정만)','','| 구분 | 판정 수 | '+' | '.join(cats)+' |','|---|---|'+'---|'*len(cats)]
for n,f in tuple((k,sel[k]) for k in names)+(('자격 기출',lambda s:s.startswith('자격')),):
    v=[x for x in rows if f(x['src']) and x['score']<2]; c=collections.Counter(cls(x['reason']) for x in v)
    out.append(f"| {n} | {len(v)} | "+' | '.join(str(c[k]) for k in cats)+' |')
out+=['','## 6. 결정 선지 원문 (새·옛) — 웹 손 분류용, 분류하지 않음','']
V='../../deep-item-v5-2026-11-18/'
for mm,lab,d in (('A','새(lever2)','out-case-lever2'),('A','lever1','out-case-lever'),('B','lever1','out-case-lever'),('A','옛','out-o4-regen'),('B','옛','out-o4-regen')):
    if True:
        it=[x for x in json.load(open(f'{V}{d}/gen32-o4-T4-1-{mm}/leakfix/items-leakfix.json'))['items'] if x['version']=='V2'][0]
        neg='적절하지 않은' in it['stem']; dec=[it['answer']] if neg else [n for n in range(1,6) if n!=it['answer']]
        out.append(f"**{lab} {mm}-V2** ({'부정 발문: 정답' if neg else '긍정 발문: 오답 4개'} = 결정 선지, 정답 {it['answer']})")
        out+= [f"- {it['choices'][n-1]}" for n in dec]; out.append('')
open('aggregate-lever2.md','w',encoding='utf8').write('\n'.join(out)+'\n'); print('\n'.join(out[:48]))
