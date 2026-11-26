import json,re,collections,statistics as st
SC={'수능 같음':2,'중':1,'수능 아님':0}
rows=[]
for R in ('r1','r2','r3'):
    key={k['item']:k for k in json.load(open(f'blind-pair3/KEY-{R}.json'))}
    for e in range(1,5):
        t=open(f'blind-pair3/REPORT-eval-{R}-{e}.md',encoding='utf8').read()
        for x in json.loads(re.findall(r'```json\s*(\[.*?\])\s*```',t,re.S)[-1]):
            k=key[str(x['item'])]; rows.append(dict(R=R,e=e,src=k['source'],key=k['answer'],ans=x['answer'].strip(),grade=x['grade'],score=SC[x['grade']],defects=x.get('defects',[]),reason=x.get('reason','')))
json.dump(rows,open('pair3-blind-rows.json','w'),ensure_ascii=False,indent=1)
m=lambda v:f'{st.mean(v):.3f}' if v else '-'
def cls(r):
    if re.search(r'꼼꼼|너무 쉬|단순 대조|사실 확인|읽기만|대조만|쉽게 (판정|풀)|문장 대조|확인만',r): return '〈보기〉 꼼꼼히 읽기만 묻는다·너무 쉬움'
    if re.search(r'지문 한 문장|지문 한 사실|지문 문장|지문만으로|그대로 뒤집|단순 부정|바로 정해|지문의 진술',r): return '정답이 지문 한 문장'
    if re.search(r'지문 원칙|원칙만으로|원리만으로|오답.*(지워|제거|배제)|배제할 수|사례를 읽지|사례 없이',r): return '오답이 지문 원칙만으로 지워짐'
    if re.search(r'시비|이의|모호|해석 여지|복수 정답|둘 이상|애매',r): return '정답 시비'
    return '기타'
out=['# 집계: 사례 갈림 사실 순서 (pair3, A안 decider) 블라인드 (평가자 4명 × 3회, seed 20261361·62·63)','','점수 수능 같음 2 / 중 1 / 수능 아님 0. 이유 분류는 키워드 규칙이라 거칠다.','','## 1. 문항별 회차별 등급·평균','','| 문항 | r1 | r2 | r3 | 3회 평균 | 같음/중/아님 | ㉯ | ㉲ | 정답 일치 |','|---|---|---|---|---|---|---|---|---|']
S=collections.OrderedDict()
for r in rows: S.setdefault(r['src'],[]).append(r)
for s,v in sorted(S.items()):
    c=collections.Counter(x['grade'] for x in v)
    out.append(f"| {s} | "+' | '.join(m([x['score'] for x in v if x['R']==R]) for R in ('r1','r2','r3'))+f" | {m([x['score'] for x in v])} | {c['수능 같음']}/{c['중']}/{c['수능 아님']} | {sum('㉯' in x['defects'] for x in v)} | {sum('㉲' in x['defects'] for x in v)} | {sum(x['ans'].startswith(x['key']) for x in v)}/{len(v)} |")
sel={'A안 청약':lambda s:s=='A안 청약 A-V1','옛 청약 ①(out-cell5)':lambda s:s=='옛 청약 A-V1(out-cell5)','옛 청약 ②(lever5-old)':lambda s:s=='옛 청약 A-V1(lever5-old)','A안 도덕적 운':lambda s:s=='A안 도덕적 운 A-V2','옛 도덕 ①(out-o4)':lambda s:s=='옛 도덕적 운 A-V2(out-o4)','옛 도덕 ②(out-o4-regen)':lambda s:s=='옛 도덕적 운 A-V2(out-o4-regen)','참고 lever2 도덕':lambda s:s=='참고 lever2 도덕적 운 A-V2'}
names=list(sel)
import re
POS=re.compile('위치|순서|방향|배치|추적'); SH=re.compile('얕|단순|짧게|대응 확인|확인만')
def jd(d,disp):
    d=round(d,6); j='A안 나음' if d>=0.5 else ('옛 나음' if d<=-0.5 else '차이 없음')
    return j+(' · 정답 시비 남음' if disp>=4 else '')
out+=['','## 2. 미리 정한 판정 (결과를 보고 바꾸지 않음)','','| 구간 | 기출 공시 | 기출 공손룡 | 블라인드 | 청약 A안 | 청약 옛 평균 | 차이 | 청약 판정 | 도덕 A안 | 도덕 옛 평균 | 차이 | 도덕 판정 | 종합 |','|---|---|---|---|---|---|---|---|---|---|---|---|---|']
for R in ('r1','r2','r3',None):
    sub=[x for x in rows if (R is None or x['R']==R)]
    g=lambda f:st.mean([x['score'] for x in sub if f(x['src'])])
    gi=g(lambda s:s=='자격 기출 공시 12번'); gg=g(lambda s:s=='자격 기출 공손룡 12번'); valid=round(gi,6)>=1.5 and round(gg,6)>=1.5
    ca=g(sel['A안 청약']); co=g(lambda s:sel['옛 청약 ①(out-cell5)'](s) or sel['옛 청약 ②(lever5-old)'](s))
    ma=g(sel['A안 도덕적 운']); mo=g(lambda s:sel['옛 도덕 ①(out-o4)'](s) or sel['옛 도덕 ②(out-o4-regen)'](s))
    dc=sum(1 for x in sub if sel['A안 청약'](x['src']) and '㉳' in x['defects']); dm=sum(1 for x in sub if sel['A안 도덕적 운'](x['src']) and '㉳' in x['defects'])
    jc=jd(ca-co,dc*(12//max(1,len(sub)//9*4) if False else 1) if R is None else dc*3); jm=jd(ma-mo,dm if R is None else dm*3)
    if not valid: tot='판정 안 함'
    elif '옛 나음' in jc or '옛 나음' in jm: tot='채택 안 함(A형은 옛 순서로 닫음)'
    elif jc.startswith('A안 나음') and jm.startswith('A안 나음') and '정답 시비' not in jc+jm: tot='A형 보완 경로 채택 후보'
    else: tot='보류'
    out.append(f"| {R or '3회 합(12표)'} | {gi:.3f} | {gg:.3f} | {'유효' if valid else '무효'} | {ca:.3f} | {co:.3f} | {ca-co:+.3f} | {jc if valid else '-'} | {ma:.3f} | {mo:.3f} | {ma-mo:+.3f} | {jm if valid else '-'} | {tot} |")
out+=['','(㉳ 4/12 이상 기준: 회차별은 4표라 3배 환산해 비교함. 3회 합은 12표 그대로.)','','## 2b. 이유 묶음 수 (12표 전부)','','| 문항 | 위치·순서 추적 | 얕음·단순 대응 | 정답 시비(분류) | ㉳ |','|---|---|---|---|---|']
for n in names:
    f=sel[n]; v=[x for x in rows if f(x['src'])]
    out.append(f"| {n} | {sum(1 for x in v if POS.search(x['reason'] or ''))} | {sum(1 for x in v if SH.search(x['reason'] or ''))} | {sum(1 for x in v if cls(x['reason'])=='정답 시비')} | {sum(1 for x in v if '㉳' in x['defects'])} |")
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
SRC=[('A안 청약','out-case-pair3/gen32-T3-2-A/leakfix/items-leakfix.json','',['V1']),('옛 청약 ①','out-cell5/gen32-T3-2-A/leakfix/items-leakfix.json','',['V1']),('옛 청약 ②','out-case-lever5-old/gen32-T3-2-A/leakfix/items-leakfix.json','',['V1']),('A안 도덕','out-case-pair3/gen32-o4-T4-1-A/leakfix/items-leakfix.json','',['V2']),('옛 도덕 ①','out-o4/gen32-o4-T4-1-A/leakfix/items-leakfix.json','',['V2']),('옛 도덕 ②','out-o4-regen/gen32-o4-T4-1-A/leakfix/items-leakfix.json','',['V2']),('참고 lever2 도덕','out-case-lever2/gen32-o4-T4-1-A/leakfix/items-leakfix.json','',['V2'])]
for lab,pth,ab,vs in SRC:
    for mm in (ab or ['']):
        for ver in vs:
            it=[x for x in json.load(open(V+(pth%mm if mm else pth)))['items'] if x['version']==ver][0]
            neg='적절하지 않은' in it['stem']; dec=[it['answer']] if neg else [n for n in range(1,6) if n!=it['answer']]
            out.append(f"**{lab}{mm}-{ver}** ({'부정 발문: 정답' if neg else '긍정 발문: 오답 4개'} = 결정 선지, 정답 {it['answer']})")
            out+= [f"- {it['choices'][n-1]}" for n in dec]; out.append('')
open('aggregate-pair3.md','w',encoding='utf8').write('\n'.join(out)+'\n'); print('\n'.join(out[:48]))
