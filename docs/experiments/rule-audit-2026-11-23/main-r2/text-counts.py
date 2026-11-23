# 판정자 없이 글자로 세는 것. 실행: python3 main-r2/text-counts.py (저장소 루트에서) → main-r2/TEXT-counts.csv
# 셈 규칙(보고서에도 적음):
#  - 선지 글: packet의 ①~⑤ 줄에서 번호 기호(①~⑤)와 앞뒤 공백을 뺀 나머지.
#  - 문장 수: '.', '?', '!' 중 양옆이 모두 숫자인 것(소수점)을 뺀 개수. 0이면 1.
#  - 가정 표현 수: (a) 어절(공백 기준, 끝의 문장부호·따옴표 뺌)이 '면'으로 끝나고 길이 2 이상이며 아래 명사 목록이 아닌 것의 수, (b) '경우' 바로 앞 어절이 받침 ㄹ로 끝나는 것('~ㄹ 경우')의 수. 합계를 적는다.
#    '면' 명사 제외 목록: 표면 단면 평면 수면 측면 내면 외면 지면 화면 전면 후면 방면 국면 장면 양면 곡면 반면 겉면 이면 입면 정면 판면 면
#  - 글자 수: 선지 글에서 공백(스페이스·탭·줄바꿈)을 모두 뺀 글자 수. 길이 순위: 한 문항의 다섯 선지 안에서 1=가장 긺, 같으면 같은 순위(공동 순위, 다음 순위는 건너뜀). 정답 길이 순위 = 정답 선지의 순위.
#  - 정답 번호: KEY-main-r2.json의 출제 정답.
#  - 단정어 수: '모든', '반드시', '항상', '오직', '전혀', '결코'가 선지 글에 나오는 횟수의 합(부분 문자열 셈). 조사 '만'은 따로: 어절(끝 문장부호 뺌)이 '만'으로 끝나고, 길이 2 이상, 끝에서 둘째 글자가 숫자가 아니고, '지만'·'하지만'으로 끝나지 않고, '그만'·'가만'·'얼마만'이 아닌 것의 수. 오탐이 많다.
import json, re, csv, collections
M='docs/experiments/rule-audit-2026-11-23/main-r2/'; M1='docs/experiments/rule-audit-2026-11-23/main-r1/'
KEY=json.load(open(M+'KEY-main-r2.json'))
F1={}
for r in csv.DictReader(open(M1+'OPTIONS-majority.csv')): F1[(r['문항'],int(r['선지']))]=r['F1']
NOUN=set('표면 단면 평면 수면 측면 내면 외면 지면 화면 전면 후면 방면 국면 장면 양면 곡면 반면 겉면 이면 입면 정면 판면 면'.split())
STRIP='.,?!;:“”‘’"\'()[]〈〉·…~'
def eojeols(t): return [w.strip(STRIP) for w in t.split()]
def has_jong_l(ch): 
    c=ord(ch)-0xAC00
    return 0<=c<11172 and c%28==8
def sentences(t):
    n=0
    for i,c in enumerate(t):
        if c in '.?!':
            a=t[i-1] if i>0 else ''; b=t[i+1] if i+1<len(t) else ''
            if a.isdigit() and b.isdigit(): continue
            n+=1
    return max(n,1)
def hypo(t):
    w=eojeols(t); n=sum(1 for x in w if len(x)>=2 and x.endswith('면') and x not in NOUN)
    for i,x in enumerate(w):
        if x=='경우' and i>0 and w[i-1] and has_jong_l(w[i-1][-1]): n+=1
    return n
def man(t):
    n=0
    for x in eojeols(t):
        if len(x)>=2 and x.endswith('만') and not x[-2].isdigit() and not x.endswith('지만') and x not in ('그만','가만','얼마만'): n+=1
    return n
ASSERT=['모든','반드시','항상','오직','전혀','결코']
rows=[]
for mid,k in KEY.items():
    ch=[l.strip() for l in open(M+f'packets/{mid}.md').read().split('\n') if re.match(r'^[①-⑤]',l.strip())]
    assert len(ch)==5,(mid,len(ch))
    txt=[c[1:].strip() for c in ch]; ln=[len(re.sub(r'\s','',t)) for t in txt]
    rank=[1+sum(1 for y in ln if y>x) for x in ln]; ans=k['official_answer']
    for n in range(1,6):
        t=txt[n-1]
        rows.append([mid,k['key'],k['audit_kind'],k['direction'],n,ans,'정답' if n==ans else '',F1.get((mid,n),''),sentences(t),hypo(t),ln[n-1],rank[n-1],rank[ans-1],sum(t.count(a) for a in ASSERT),man(t)])
with open(M+'TEXT-counts.csv','w',newline='') as fh:
    w=csv.writer(fh); w.writerow(['문항','문항 키','감사 갈래','발문','선지','정답 번호','정답 여부','F1 다수값(main-r1)','문장 수','가정 표현 수','글자 수(공백 제외)','길이 순위(문항 안, 1=가장 긺)','정답 선지 길이 순위','단정어 수(모든·반드시·항상·오직·전혀·결코)','조사 만 수(오탐 많음)'])
    w.writerows(rows)
print(len(rows),'rows')
