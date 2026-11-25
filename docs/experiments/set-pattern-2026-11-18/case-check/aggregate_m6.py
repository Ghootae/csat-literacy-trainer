import json,re,os,statistics as st,collections
H=os.path.dirname(os.path.abspath(__file__)); SC={'수능 같음':2,'중':1,'수능 아님':0}
def blk(t):
    ms=re.findall(r'```json\s*(\[.*?\])\s*```',t,re.S); return json.loads(ms[-1])
def cls(r):
    r=r or ''
    if re.search(r'지문 한 문장|지문 한 사실|지문 문장|지문만으로|지문 대조|지문 확인|그대로 뒤집|단순 부정|대입|바로 정해|추론이 짧|지문의 진술',r): return '정답이 지문 한 문장'
    if re.search(r'지문 원칙|원칙만으로|원리만으로|오답.*(지워|제거|배제)|배제할 수|반대로|쉽게 (제외|지워)|바로 (제외|지워)',r): return '오답이 지문 원칙만으로 지워짐'
    if re.search(r'어색|장황|덧붙|덧댄|인위|부자연|꾸밈|조건이 많|길',r): return '〈보기〉 수리 흔적(어색·장황)'
    if re.search(r'시비|이의|모호|해석 여지|복수 정답|둘 이상|정답이 .*(애매|불명)',r): return '정답 시비'
    return '기타'
rows=[]; 
for T in ('solid','moral'):
    for R in ('r1','r2'):
        key={k['item']:k for k in json.load(open(f'{H}/blind-{T}/KEY-{R}.json'))}
        for e in range(1,5):
            for x in blk(open(f'{H}/blind-{T}/REPORT-eval-{R}-{e}.md',encoding='utf8').read()):
                k=key[str(x['item'])]; ans=x['answer'].strip()
                rows.append(dict(T=T,R=R,e=e,src=k['source'],key=k['answer'],ans=ans,grade=x['grade'],score=SC.get(x['grade']),defects=x.get('defects',[]),reason=x.get('reason',''),correct=ans.startswith(k['answer'])))
bad=[r for r in rows if r['score'] is None]; assert not bad,bad[:2]
json.dump(rows,open(f'{H}/m6-blind-rows.json','w'),ensure_ascii=False,indent=1)
mean=lambda v:f'{st.mean(v):.3f}' if v else '-'
out=['# 집계: 사례 칸 재시험 블라인드 (M6)','', '등급 점수: 수능 같음 2 / 중 1 / 수능 아님 0. 평가자 4명 × 2회 = 문항당 8개 판정. 결함·이유 분류는 평가 이유 문장의 키워드 규칙(aggregate_m6.py)으로 묶은 것이라 거칠다.','']
srcs=collections.OrderedDict()
for r in rows: srcs.setdefault((r['T'],r['src']),[]).append(r)
out+=['## 1. 문항별 등급·평균','','| 묶음 | 문항 | r1 평균 | r2 평균 | 전체 평균 | 등급 분포(같음/중/아님) | 정답 일치 | ㉯ | ㉲ |','|---|---|---|---|---|---|---|---|---|']
for (T,s),v in sorted(srcs.items()):
    g=lambda R:mean([x['score'] for x in v if x['R']==R]); c=collections.Counter(x['grade'] for x in v)
    out.append(f"| {T} | {s} | {g('r1')} | {g('r2')} | {mean([x['score'] for x in v])} | {c['수능 같음']}/{c['중']}/{c['수능 아님']} | {sum(x['correct'] for x in v)}/{len(v)} | {sum('㉯' in x['defects'] for x in v)} | {sum('㉲' in x['defects'] for x in v)} |")
def cell(T,pred):
    return [x for x in rows if x['T']==T and pred(x['src'])]
out+=['','## 2. 칸 평균 (두 회차)','','| 칸 | 수리 후판(최종) | 같은 블라인드 수리 전판 | 이전 값 |','|---|---|---|---|']
def finalv(s): return s.startswith('고체') and ('수리 후' in s or '원본' in s)
def beforev(s): return s.startswith('고체') and ('수리 전' in s or '원본' in s)
# 수리 전판 칸: 수리 안 된 A-V2 포함(원본이 곧 전)
out.append(f"| 고체 촉매 사례(4문항) | {mean([x['score'] for x in cell('solid',finalv)])} | {mean([x['score'] for x in cell('solid',beforev)])} | 1.094 |")
mo=[x['score'] for x in cell('moral',lambda s:s.startswith('도덕'))]
out.append(f"| 도덕적 운 사례(2문항, 수리 없음 = 원본) | {mean(mo)} | (수리 전판 없음, 동일) | 0.688 |")
out+=['','회차별: '+', '.join(f"{T} {R} 최종판 {mean([x['score'] for x in rows if x['T']==T and x['R']==R and (finalv(x['src']) if T=='solid' else x['src'].startswith('도덕'))])}" for T in ('solid','moral') for R in ('r1','r2'))]
out+=['','## 3. 자격 기출 회차별 평균 (1.5 미만이면 멈춤 회차)','','| 묶음 | 회차 | 기출 평균 | 비고 |','|---|---|---|---|']
for T in ('solid','moral'):
    for R in ('r1','r2'):
        m=st.mean([x['score'] for x in rows if x['T']==T and x['R']==R and x['src'].startswith('자격')])
        out.append(f"| {T} | {R} | {m:.3f} | {'멈춤 회차' if m<1.5 else ''} |")
out+=['','## 4. 결함 표시 ㉯·㉲ 수 (수리 전·후)','','| 구분 | 판정 수 | ㉯ | ㉲ | ㉳ |','|---|---|---|---|---|']
def dc(pred,T):
    v=cell(T,pred); return len(v),sum('㉯' in x['defects'] for x in v),sum('㉲' in x['defects'] for x in v),sum('㉳' in x['defects'] for x in v)
for name,T,p in (('고체 수리 후판','solid',finalv),('고체 수리 전판','solid',beforev),('도덕 (수리 없음)','moral',lambda s:s.startswith('도덕')),('자격 기출','solid',lambda s:s.startswith('자격')),('자격 기출(도덕 묶음)','moral',lambda s:s.startswith('자격'))):
    out.append(f'| {name} | '+' | '.join(map(str,dc(p,T)))+' |')
out+=['','## 5. 평가 이유 분류 (수능 같음이 아닌 판정만, 키워드 규칙)','','| 구분 | 판정 수 | 정답이 지문 한 문장 | 오답이 지문 원칙만으로 지워짐 | 〈보기〉 수리 흔적 | 정답 시비 | 기타 |','|---|---|---|---|---|---|---|']
for name,T,p in (('고체 수리 후판','solid',finalv),('고체 수리 전판','solid',beforev),('도덕','moral',lambda s:s.startswith('도덕')),('자격 기출','solid',lambda s:s.startswith('자격')),('자격 기출(도덕 묶음)','moral',lambda s:s.startswith('자격'))):
    v=[x for x in cell(T,p) if x['score']<2]; c=collections.Counter(cls(x['reason']) for x in v)
    out.append(f"| {name} | {len(v)} | "+' | '.join(str(c[k]) for k in ('정답이 지문 한 문장','오답이 지문 원칙만으로 지워짐','〈보기〉 수리 흔적(어색·장황)','정답 시비','기타'))+' |')
out+=['','## 6. 수리 전·후 나란히 (고친 선지·〈보기〉 문장)','']
open(f'{H}/aggregate-m6.md','w',encoding='utf8').write('\n'.join(out)+'\n'+open('/tmp/sec6.md').read()); print('\n'.join(out))
