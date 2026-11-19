# 기출 세트 틀 분석 (2026-11-18). 경로는 웹 스레드 컨테이너 기준(/mnt/user-data/uploads/...). Mac에서 돌리려면 Q, SC, DB, TM 경로를 저장소 상대 경로로 바꿀 것.
import json,glob,re,collections,os
Q='/mnt/user-data/uploads/csat-literacy-problem-solving-mvp/docs/experiments/set-pattern-2026-11-18/data/questions/'
SC='/mnt/user-data/uploads/csat-literacy-problem-solving-mvp/docs/experiments/structure-catalog/substructures/'
DB='/mnt/user-data/uploads/csat-literacy-problem-solving-mvp/docs/experiments/megastudy-rate-coverage-2026-11-05/db-sets.json'
def stem_of(q):
    return ' '.join(b.get('text','') for b in q['prompt_blocks'] if b['type']=='stem').strip()
def bogi_of(q):
    t=[];img=False
    for b in q['prompt_blocks']:
        if b['type']=='supplement':
            if b.get('text','').strip(): t.append(b['text'].strip())
            if b.get('images'): img=True
    return ' '.join(t),img
def classify(q):
    s=stem_of(q); b,img=bogi_of(q)
    hasb=('보기' in s) or bool(b) or img
    both=bool(re.search(r'\(가\)',s) and re.search(r'\(나\)',s))
    if re.search(r'문맥(상|적)|사전적|바꿔 쓰|바꾸어 쓰|의미가 가장 가까운|어휘',s): return 'F 어휘'
    if re.search(r'서술 방식|전개 방식|설명 방식|서술상|글의 구성|논지 전개|표제',s): return 'D 전개'
    if both and not hasb: return 'C (가)(나) 비교'
    if hasb:
        if re.search(r'입장|관점|비판|평가|반박|견해',s): return 'A〈보기〉관점'
        return 'A〈보기〉적용'
    if re.search(r'학생|반응|읽은 방법|활동',s): return 'G 학생 활동'
    if re.search(r'견해|주장|동의|반박|관점에서|입장',s): return 'C 관점 이해'
    if re.search(r'이유|까닭|근거',s): return 'R 이유 추론'
    if re.search(r'빈칸|\[A\]|\[B\]',s): return 'R 빈칸·구절'
    if re.search(r'사례로|해당하는|경우에 해당|방법으로',s): return 'A 사례 판별(보기 없음)'
    if re.search(r'[㉠-㉴ⓐ-ⓩⒶ-Ⓩ]',s): return 'E2 밑줄 대상 이해'
    if re.search(r'일치|알 수 있는|확인할 수 있는|언급|답할 수 있는|질문|다룬 내용',s): return 'E1 일치·확인'
    if re.search(r'추론|추측|예측',s): return 'R 추론'
    return 'E1 세부 이해'
sub={};typ={}
for f in glob.glob(SC+'*.json'):
    if os.path.basename(f).startswith('_'): continue
    d=json.load(open(f))
    for s in d['substructures']:
        for m in s.get('members',[]): sub[m]=s['code']; typ[m]=d['type']
db={x['set_id']:x for x in json.load(open(DB))}
sets=[]
for f in sorted(glob.glob(Q+'*.json')):
    d=json.load(open(f)); sid=d['set_id']
    items=[]
    for q in sorted(d['questions'],key=lambda q:q['order']):
        b,img=bogi_of(q)
        items.append(dict(n=q['number'],pts=q.get('points'),cls=classify(q),stem=stem_of(q),bogi=b,img=img,tags=q.get('source_tags'),choices=[c['text'] for c in q['choices']]))
    comp=any(len(p.get('sections',[]))>1 for p in [])
    sets.append(dict(sid=sid,info=db.get(sid,{}),sub=sub.get(sid),typ=typ.get(sid),items=items))
TM='/mnt/user-data/uploads/csat-literacy-problem-solving-mvp/docs/experiments/structure-catalog/TYPES-MEMBERS.md'
cur=None;T={};TN={}
for line in open(TM):
    m=re.match(r'\*\*([SP]\d) (.+)\*\*',line)
    if m: cur=m.group(1); TN[cur]=m.group(2); continue
    m=re.match(r'- ([0-9a-f]{24})',line)
    if m and cur: T[m.group(1)]=cur
for s in sets:
    s['typ']=T.get(s['sid']); s['prov']=s['info'].get('provider') or '?'
    s['grade']=s['info'].get('grade')
def bogi_kind(i):
    t=i['bogi']
    if i['img'] and len(t)<60: return '그림·그래프·표'
    if i['img']: return '그림+설명'
    if re.search(r'학습 활동|학생|선생님|수업|활동지|탐구',t): return '학습 활동'
    if re.search(r'실험|측정|관측|시료|수조|검사 결과|조사 결과|관찰',t): return '실험·관찰'
    if re.search(r'(^|\s)ㄱ\.|주장|견해|비판|보았다|말했다|말하면서|에 따르면|제\d+조|사상가|학자|의 입장',t): return '외부 글·관점'
    if re.search(r'갑|을은|병|[A-Z]사|[A-Z] 지역|기업|사례|○○|△△|□□|씨는|회사|국가|어떤|한 ',t): return '사례·상황'
    return '외부 글·관점'
