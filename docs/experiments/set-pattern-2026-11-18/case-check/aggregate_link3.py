import json,re,collections,statistics as st
SC={'수능 같음':2,'중':1,'수능 아님':0}
rows=[]
for R in ('r1','r2','r3'):
    key={k['item']:k for k in json.load(open(f'blind-link3/KEY-{R}.json'))}
    for e in range(1,5):
        t=open(f'blind-link3/REPORT-eval-{R}-{e}.md',encoding='utf8').read()
        for x in json.loads(re.findall(r'```json\s*(\[.*?\])\s*```',t,re.S)[-1]):
            k=key[str(x['item'])]; rows.append(dict(R=R,e=e,src=k['source'],key=k['answer'],ans=x['answer'].strip(),grade=x['grade'],score=SC[x['grade']],defects=x.get('defects',[]),reason=x.get('reason','')))
json.dump(rows,open('link3-blind-rows.json','w'),ensure_ascii=False,indent=1)
m=lambda v:f'{st.mean(v):.3f}' if v else '-'
def cls(r):
    if re.search(r'꼼꼼|너무 쉬|단순 대조|사실 확인|읽기만|대조만|쉽게 (판정|풀)|문장 대조|확인만',r): return '〈보기〉 꼼꼼히 읽기만 묻는다·너무 쉬움'
    if re.search(r'지문 한 문장|지문 한 사실|지문 문장|지문만으로|그대로 뒤집|단순 부정|바로 정해|지문의 진술',r): return '정답이 지문 한 문장'
    if re.search(r'지문 원칙|원칙만으로|원리만으로|오답.*(지워|제거|배제)|배제할 수|사례를 읽지|사례 없이',r): return '오답이 지문 원칙만으로 지워짐'
    if re.search(r'시비|이의|모호|해석 여지|복수 정답|둘 이상|애매',r): return '정답 시비'
    return '기타'
import glob
NEW1,NEW2,PR1,PR2,OLD1,OLD2,AAN='새 청약 A-V1(link3a)','새 청약 A-V1(link3b)','지난 청약 A-V1(link1)','지난 청약 A-V1(link2)','옛 청약 A-V1(out-cell5)','옛 청약 A-V1(lever5-old)','A안 청약 A-V1'
S=collections.OrderedDict()
for r in rows: S.setdefault(r['src'],[]).append(r)
POS=re.compile('위치|순서|방향|배치|추적'); SH=re.compile('얕|단순|짧게|대응 확인|확인만'); LIST=re.compile('나열|무관|관계없|관련 없|별개|따로')
def sc(f,R=None): return [x['score'] for x in rows if f(x['src']) and (R is None or x['R']==R)]
def cnt(f,mark,R=None): return sum(1 for x in rows if f(x['src']) and mark in x['defects'] and (R is None or x['R']==R))
out=['# 집계: 결합 선지 탐색 3판(LINK_SEARCH=2) 청약 A형 블라인드 (평가자 4명 × 3회, seed 20261391·92·93)','','점수 수능 같음 2 / 중 1 / 수능 아님 0. 이유 분류는 키워드 규칙이라 거칠다. ㉱ = 〈보기〉가 서로 무관한 사건을 나열함, ㉳ = 정답 시비 위험.','','## 1. 문항별 회차별 등급·평균','','| 문항 | r1 | r2 | r3 | 3회 평균 | 같음/중/아님 | ㉯ | ㉱ | ㉲ | ㉳ | 정답 일치 |','|---|---|---|---|---|---|---|---|---|---|---|']
for s,v in sorted(S.items()):
    c=collections.Counter(x['grade'] for x in v)
    out.append(f"| {s} | "+' | '.join(m(sc(lambda z:z==s,R)) for R in ('r1','r2','r3'))+f" | {m(sc(lambda z:z==s))} | {c['수능 같음']}/{c['중']}/{c['수능 아님']} | "+' | '.join(str(sum(k in x['defects'] for x in v)) for k in ('㉯','㉱','㉲','㉳'))+f" | {sum(x['ans'][:1]==x['key'][:1] for x in v)}/{len(v)} |")
# 4번 점검
chk={}
for n in 'ab':
    for e in (1,2):
        t=open(f'link3-check/out-link3{n}-e{e}.md',encoding='utf-8').read(); chk[(n,e)]=json.loads(re.findall(r'```json\s*([\s\S]*?)```',t)[-1])
V='../../deep-item-v5-2026-11-18/'
st_={}
for n in 'ab':
    lc=json.load(open(V+f'out-case-link3{n}/gen32-T3-2-A/lever-check.json'))['V1']
    t=open(V+f'out-case-link3{n}/gen32-T3-2-A/3-assemble.md',encoding='utf-8').read(); lp=[i for i in json.loads(re.findall(r'```json\s*([\s\S]*?)```',t)[-1])['items'] if i['version']=='V1'][0]['linkPlan']
    st_[n]=lp['status']
realized={n: st_[n]=='ok' and any(chk[(n,e)]['a']['rules']>=2 for e in (1,2)) for n in 'ab'}
isNew=lambda z:z in(NEW1,NEW2); isOld=lambda z:z in(OLD1,OLD2); isPr=lambda z:z in(PR1,PR2)
out+=['','## 2. 미리 정한 판정 (결과를 보고 바꾸지 않음)','','| 구간 | 기출 공시 | 기출 공손룡 | 블라인드 | 새 평균 | 옛 평균 | 지난 평균 | 새−옛 | 새−지난 | 새 ㉱ 합 | 새 ㉳(3a/3b) | 효과 있음 |','|---|---|---|---|---|---|---|---|---|---|---|---|']
eff={}
for R in ('r1','r2','r3',None):
    k=1 if R is None else 3
    gi=st.mean(sc(lambda z:z=='자격 기출 공시 12번',R)); gg=st.mean(sc(lambda z:z=='자격 기출 공손룡 12번',R)); valid=round(gi,6)>=1.5 and round(gg,6)>=1.5
    nw=st.mean(sc(isNew,R)); ol=st.mean(sc(isOld,R)); pr=st.mean(sc(isPr,R))
    n1=(cnt(lambda z:z==NEW1,'㉱',R)+cnt(lambda z:z==NEW2,'㉱',R))*k; w1=cnt(lambda z:z==NEW1,'㉳',R)*k; w2=cnt(lambda z:z==NEW2,'㉳',R)*k
    d1=round(nw-ol,6); d2=round(nw-pr,6)
    ok=valid and d1>=0 and d2>=0.4 and w1<4 and w2<4 and n1<8
    eff[R]=('판정 안 함' if not valid else ('효과 있음' if ok else '효과 있음 아님'))
    out.append(f"| {R or '3회 합(12표)'} | {gi:.3f} | {gg:.3f} | {'유효' if valid else '무효'} | {nw:.3f} | {ol:.3f} | {pr:.3f} | {d1:+.3f} | {d2:+.3f} | {n1} | {w1}/{w2} | {eff[R]} |")
out+=['','(회차별은 4표 기준이라 ㉱ 합·㉳를 3배 환산해 기준(8/24, 4/12)과 비교함.)','','## 2b. 이유 묶음 수 (12표 전부)','','| 문항 | 사건 나열 | 얕음·단순 대응 | 정답 시비(분류) | 위치·순서 추적 |','|---|---|---|---|---|']
for s,v in sorted(S.items()):
    out.append(f"| {s} | {sum(1 for x in v if LIST.search(x['reason'] or ''))} | {sum(1 for x in v if SH.search(x['reason'] or ''))} | {sum(1 for x in v if cls(x['reason'] or '')=='정답 시비')} | {sum(1 for x in v if POS.search(x['reason'] or ''))} |")
out+=['','## 3. 〈보기〉 글자 수(공백 제외)','','| 문항 | bogiChars |','|---|---|']
for lab,p in [(NEW1,'out-case-link3a'),(NEW2,'out-case-link3b'),(PR1,'out-case-link1'),(PR2,'out-case-link2'),(OLD1,'out-cell5'),(OLD2,'out-case-lever5-old'),(AAN,'out-case-pair3')]:
    f=[i for i in json.load(open(V+p+'/gen32-T3-2-A/leakfix/items-leakfix.json'))['items'] if i['version']=='V1'][0]; nb=len(re.sub(r'\s','',f['bogi'])); out.append(f"| {lab} | {nb} |")
out+=['','## 4. codex 점검 (새 문항, 평가자 2명)','','| 문항 | linkPlan.status | 규칙 수 e1/e2 | 반박 needsPassage e1/e2 | S3 false 선지 e1/e2 | 결합 실현 |','|---|---|---|---|---|---|']
for n,lab in (('a',NEW1),('b',NEW2)):
    ff=lambda e:','.join(str(c['n']) for c in chk[(n,e)]['c'] if not c['fixed']) or '-'
    out.append(f"| {lab} | {st_[n]} | {chk[(n,1)]['a']['rules']}/{chk[(n,2)]['a']['rules']} | {chk[(n,1)]['b']['needsPassage']}/{chk[(n,2)]['b']['needsPassage']} | {ff(1)} / {ff(2)} | {'실현' if realized[n] else '미실현'} |")
out+=['','가장 짧은 풀이·반박 원문:','']
for n,lab in (('a',NEW1),('b',NEW2)):
    for e in (1,2): out.append(f"- {lab} e{e}: 풀이 \"{chk[(n,e)]['a']['shortest']}\" / 반박 \"{chk[(n,e)]['b']['rebuttal']}\"")
cr=sum(realized.values())
ev=eff[None]
if ev=='효과 있음': tot={2:'두 원리 결합 유효 → 다른 지문 1개로 재현 확인 후보',1:'한 번 구현, 재현 보류',0:'효과 있음이나 결합 실현 0(보류, 사람 검토)'}[cr]
elif ev=='판정 안 함': tot='블라인드 무효'
else: tot='채택 안 함 → A형은 옛 순서로 닫음'
out+=['','## 5. 종합 (3회 합)','',f'- 효과: {ev} / 결합 실현 문항 {cr}/2 → **{tot}**','- 회차별 효과 판정: '+', '.join(f"{R} {eff[R]}" for R in ('r1','r2','r3')),'- 결합 후보 없음(status none): 0회']
open('aggregate-link3.md','w',encoding='utf-8').write('\n'.join(out)+'\n'); print('\n'.join(out))
