import json,glob,re,os,collections,sys
sys.path.insert(0,'/mnt/project-files/experiments/set-pattern-2026-11-18')
B='/mnt/user-data/uploads/csat-literacy-problem-solving-mvp/docs/experiments/'
exec(open('/mnt/project-files/experiments/set-pattern-2026-11-18/analyze.py').read().split("sub={};typ={}")[0])
bk_src=open('/mnt/project-files/experiments/set-pattern-2026-11-18/analyze.py').read()
exec(bk_src[bk_src.find('def bogi_kind'):])
ids=[os.path.basename(f)[:-5] for f in glob.glob(B+'set-pattern-2026-11-18/data/questions/*.json')]
SCI={4,5,7,8,15,17,18,19,26,29,31,34,38,41,43,45,46,50,51,52,58,71,72,75,78,79,85,89,91,93,96,97,102,105,106,108,110,114,116,119,122,123,130,132,135,136,137,145,151,153,154}
SOC={1,3,9,12,13,14,21,23,25,28,32,33,35,36,37,39,42,47,49,53,55,56,57,59,61,63,65,70,74,81,82,83,84,86,90,92,99,101,103,107,109,113,117,118,121,127,129,131,134,142,143,149,150,152}
dom={}
for i,s in enumerate(ids): dom[s]='과학·기술' if i in SCI else '사회' if i in SOC else '인문'
print(collections.Counter(dom.values()))
def cat(q,c,s):
    if c.startswith('A'): return '고난도 적용'
    if c.startswith('E1') or c=='R 추론': return '일치·세부'
    if c in ('E2 밑줄 대상 이해','R 이유 추론','R 빈칸·구절'): return '밑줄·이유'
    return '기타'
def subE1(s,c):
    if re.search(r'답할 수 있는|질문',s): return '질문-답 확인'
    if re.search(r'일치',s): return '내용 일치'
    if re.search(r'알 수 있는|확인할 수 있는|언급|다룬 내용',s): return '알 수 있는 내용'
    if re.search(r'추론|추측|예측',s): return '추론한 내용'
    return '이해한 내용(세부 이해)'
def subE2(s,c):
    if c=='R 빈칸·구절': return '빈칸·구절([A] 등)'
    if re.search(r'이유|까닭|근거',s): return '밑줄 이유 추론'
    if re.search(r'[㉠-㉴ⓐ-ⓩ][^?]*[와과][^?]*[㉠-㉴ⓐ-ⓩ]|비교',s): return '밑줄 둘 비교'
    if re.search(r'사례|예로|해당',s): return '밑줄 사례 판별'
    return '밑줄 대상 이해'
def subOther(c): return c
rows=[]
for f in glob.glob(B+'set-pattern-2026-11-18/data/questions/*.json'):
    d=json.load(open(f)); sid=d['set_id']
    for q in d['questions']:
        s=stem_of(q); c=classify(q); k=cat(q,c,s)
        b,img=bogi_of(q)
        if k=='고난도 적용':
            if not ('보기' in s or b or img): sub='사례 판별(〈보기〉 없음)'
            else: sub=bogi_kind(dict(bogi=b,img=img))
            pol='부정' if re.search(r'않은|않는|아닌|없는',s) else '긍정'
        elif k=='일치·세부': sub=subE1(s,c); pol=''
        elif k=='밑줄·이유': sub=subE2(s,c); pol=''
        else: sub=c; pol=''
        rows.append(dict(d=dom[sid],k=k,sub=sub,pts=q.get('points'),pol=pol))
json.dump(rows,open('rows.json','w'),ensure_ascii=False)
print(len(rows))
