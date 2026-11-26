import json,re,collections,statistics as st
SC={'수능 같음':2,'중':1,'수능 아님':0}
rows=[]
for R in ('r1','r2','r3'):
    key={k['item']:k for k in json.load(open(f'blind-link/KEY-{R}.json'))}
    for e in range(1,5):
        t=open(f'blind-link/REPORT-eval-{R}-{e}.md',encoding='utf8').read()
        for x in json.loads(re.findall(r'```json\s*(\[.*?\])\s*```',t,re.S)[-1]):
            k=key[str(x['item'])]; rows.append(dict(R=R,e=e,src=k['source'],key=k['answer'],ans=x['answer'].strip(),grade=x['grade'],score=SC[x['grade']],defects=x.get('defects',[]),reason=x.get('reason','')))
json.dump(rows,open('link-blind-rows.json','w'),ensure_ascii=False,indent=1)
m=lambda v:f'{st.mean(v):.3f}' if v else '-'
def cls(r):
    if re.search(r'꼼꼼|너무 쉬|단순 대조|사실 확인|읽기만|대조만|쉽게 (판정|풀)|문장 대조|확인만',r): return '〈보기〉 꼼꼼히 읽기만 묻는다·너무 쉬움'
    if re.search(r'지문 한 문장|지문 한 사실|지문 문장|지문만으로|그대로 뒤집|단순 부정|바로 정해|지문의 진술',r): return '정답이 지문 한 문장'
    if re.search(r'지문 원칙|원칙만으로|원리만으로|오답.*(지워|제거|배제)|배제할 수|사례를 읽지|사례 없이',r): return '오답이 지문 원칙만으로 지워짐'
    if re.search(r'시비|이의|모호|해석 여지|복수 정답|둘 이상|애매',r): return '정답 시비'
    return '기타'
import glob
NEW1,NEW2,OLD1,OLD2,AAN,MORAL='새 청약 A-V1(link1)','새 청약 A-V1(link2)','옛 청약 A-V1(out-cell5)','옛 청약 A-V1(lever5-old)','A안 청약 A-V1','기준점 A안 도덕적 운 A-V2'
S=collections.OrderedDict()
for r in rows: S.setdefault(r['src'],[]).append(r)
POS=re.compile('위치|순서|방향|배치|추적'); SH=re.compile('얕|단순|짧게|대응 확인|확인만'); LIST=re.compile('나열|무관|관계없|관련 없|별개|따로')
def sc(f,R=None): return [x['score'] for x in rows if f(x['src']) and (R is None or x['R']==R)]
def cnt(f,mark,R=None): return sum(1 for x in rows if f(x['src']) and mark in x['defects'] and (R is None or x['R']==R))
out=['# 집계: 결합 선지 탐색(LINK_SEARCH=1) 청약 A형 블라인드 (평가자 4명 × 3회, seed 20261371·72·73)','','점수 수능 같음 2 / 중 1 / 수능 아님 0. 이유 분류는 키워드 규칙이라 거칠다. ㉱ = 〈보기〉가 서로 무관한 사건을 나열함, ㉳ = 정답 시비 위험.','','## 1. 문항별 회차별 등급·평균','','| 문항 | r1 | r2 | r3 | 3회 평균 | 같음/중/아님 | ㉯ | ㉱ | ㉲ | ㉳ | 정답 일치 |','|---|---|---|---|---|---|---|---|---|---|---|']
for s,v in sorted(S.items()):
    c=collections.Counter(x['grade'] for x in v)
    out.append(f"| {s} | "+' | '.join(m(sc(lambda z:z==s,R)) for R in ('r1','r2','r3'))+f" | {m(sc(lambda z:z==s))} | {c['수능 같음']}/{c['중']}/{c['수능 아님']} | "+' | '.join(str(sum(k in x['defects'] for x in v)) for k in ('㉯','㉱','㉲','㉳'))+f" | {sum(x['ans'][:1]==x['key'][:1] for x in v)}/{len(v)} |")
out+=['','## 2. 미리 정한 판정 (결과를 보고 바꾸지 않음)','','| 구간 | 기출 공시 | 기출 공손룡 | 블라인드 | 새 평균 | 옛 평균 | A안 | 새−옛 | 새−A안 | 새 ㉱ 합 | 새 ㉳(link1/link2) | 점수 판정 |','|---|---|---|---|---|---|---|---|---|---|---|---|']
isNew=lambda z:z in(NEW1,NEW2); isOld=lambda z:z in(OLD1,OLD2)
verd={}
for R in ('r1','r2','r3',None):
    k=1 if R is None else 3  # 회차별은 4표라 합 기준을 3배 환산
    gi=st.mean(sc(lambda z:z=='자격 기출 공시 12번',R)); gg=st.mean(sc(lambda z:z=='자격 기출 공손룡 12번',R)); valid=round(gi,6)>=1.5 and round(gg,6)>=1.5
    nw=st.mean(sc(isNew,R)); ol=st.mean(sc(isOld,R)); aa=st.mean(sc(lambda z:z==AAN,R))
    n1=cnt(lambda z:z==NEW1,'㉱',R)+cnt(lambda z:z==NEW2,'㉱',R); w1=cnt(lambda z:z==NEW1,'㉳',R)*k; w2=cnt(lambda z:z==NEW2,'㉳',R)*k
    d1=round(nw-ol,6); d2=round(nw-aa,6)
    if not valid: v='판정 안 함'
    elif d2<0.3 or n1*k>=12: v='효과 없음'
    elif d1>=0 and d2>=0.5 and n1*k<8 and w1<4 and w2<4: v='점수 통과'
    else: v='그 밖(보류)'
    verd[R]=v
    out.append(f"| {R or '3회 합(12표)'} | {gi:.3f} | {gg:.3f} | {'유효' if valid else '무효'} | {nw:.3f} | {ol:.3f} | {aa:.3f} | {d1:+.3f} | {d2:+.3f} | {n1} | {w1}/{w2} | {v} |")
out+=['','(회차별은 4표 기준이라 ㉱ 합·㉳를 3배 환산해 기준(8/24, 12/24, 4/12)과 비교함.)','','## 2b. 이유 묶음 수 (12표 전부)','','| 문항 | 사건 나열 | 얕음·단순 대응 | 정답 시비(분류) | 위치·순서 추적 |','|---|---|---|---|---|']
for s,v in sorted(S.items()):
    out.append(f"| {s} | {sum(1 for x in v if LIST.search(x['reason'] or ''))} | {sum(1 for x in v if SH.search(x['reason'] or ''))} | {sum(1 for x in v if cls(x['reason'] or '')=='정답 시비')} | {sum(1 for x in v if POS.search(x['reason'] or ''))} |")
# bogiChars
out+=['','## 3. 〈보기〉 글자 수(공백 제외)','','| 문항 | bogiChars |','|---|---|']
V='../../deep-item-v5-2026-11-18/'
for lab,p,ver in [(NEW1,'out-case-link1/gen32-T3-2-A','V1'),(NEW2,'out-case-link2/gen32-T3-2-A','V1'),(OLD1,'out-cell5/gen32-T3-2-A','V1'),(OLD2,'out-case-lever5-old/gen32-T3-2-A','V1'),(AAN,'out-case-pair3/gen32-T3-2-A','V1'),(MORAL,'out-case-pair3/gen32-o4-T4-1-A','V2')]:
    f=[i for i in json.load(open(V+p+'/leakfix/items-leakfix.json'))['items'] if i['version']==ver][0]; nb=len(re.sub(r'\s','',f['bogi'])); out.append(f"| {lab} | {nb} |")
# 4번 점검
def first(p):
    try: return open(p,encoding='utf-8').read().strip().split('\n')[0].strip()
    except Exception: return '(없음)'
out+=['','## 4. 결합·전제 점검 (codex 평가자 2명)','','### 4a. 결합 살아 있음 — coreChoice 정오를 정할 수 있는가(첫 줄)','','지문 포함판이 의미 있는 판이다(처음 요청문은 지문을 주지 않아 "아니요"가 자명했음 — v1-no-passage/에 보존). 대조 = 〈보기〉 전체를 준 판(통제).','','| 문항 | A삭제 e1/e2 | B삭제 e1/e2 | 대조 e1/e2 | 지문 없는 첫판 A삭제/B삭제 | 결합 살아 있음(지문 포함판) |','|---|---|---|---|---|---|']
alive={}
for n in (1,2):
    g=lambda k,e:first(f'link-check/out-in-link{n}-{k}-e{e}.md')
    o=lambda k,e:first(f'link-check/v1-no-passage/out-in-link{n}-{k}-e{e}.md')
    a_=[g('A삭제',1),g('A삭제',2)]; b_=[g('B삭제',1),g('B삭제',2)]
    al=all(x=='아니요' for x in a_+b_); alive[n]=al
    out.append(f"| link{n} | {'/'.join(a_)} | {'/'.join(b_)} | {g('대조',1)[:2]}/{g('대조',2)[:2]} | {o('A삭제',1)}·{o('A삭제',2)} / {o('B삭제',1)}·{o('B삭제',2)} | {'살아 있음' if al else '아님'} |")
out+=['','### 4b. 가장 짧은 풀이(평가자 2명)','']
for n in (1,2):
    for e in (1,2): out+= [f'- link{n} e{e}: '+open(f'link-check/out-in-link{n}-전체-e{e}.md',encoding='utf-8').read().strip().replace('\n',' ')[:420]]
out+=['','### 4c. 정답 전제 상태 (명시/암시/소실)','']
for n in (1,2):
    for e in (1,2): out+= [f'- link{n} e{e}: '+open(f'link-check/out-in-link{n}-전제-e{e}.md',encoding='utf-8').read().strip().replace('\n',' ')[:700]]
cnt_alive=sum(alive.values())
if verd[None]=='점수 통과': tot={2:'재현됨 → 원인 쪼개기(한 사건 지시만 넣은 조건)와 다른 지문 확인 후보',1:'한 번 구현, 재현 보류',0:'점수는 올랐으나 결합 미확인(보류)'}[cnt_alive]
elif verd[None]=='효과 없음': tot='채택 안 함'
elif verd[None]=='판정 안 함': tot='블라인드 무효'
else: tot='보류(사람 검토)'
out+=['','## 5. 종합 (3회 합)','',f'- 점수 판정: {verd[None]} / 결합 살아 있음 문항 수(지문 포함판): {cnt_alive}/2 → **{tot}**','- 회차별 점수 판정: '+', '.join(f"{R} {verd[R]}" for R in ('r1','r2','r3'))]
open('aggregate-link.md','w',encoding='utf-8').write('\n'.join(out)+'\n'); print('\n'.join(out))
