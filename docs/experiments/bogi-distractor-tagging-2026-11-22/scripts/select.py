# 기출 오답 태깅 단계 A1: 후보 추출 + 고정 씨앗 섞기 (PLAN 1.3). API·코덱스 호출 없음.
# 실행: python3 scripts/select.py  (이 폴더에서)
import json, glob, os, re, random, collections
EXP = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
Q = f'{EXP}/set-pattern-2026-11-18/data/questions/'
A = f'{EXP}/set-pattern-2026-11-18/data/answers/'
DB = f'{EXP}/megastudy-rate-coverage-2026-11-05/db-sets.json'
GOLD = f'{EXP}/deep-item-v5-2026-11-18/calib-gold/'
PASS = os.path.expanduser('~/Projects/suneung_db/output/passages/')
OUT = os.path.join(os.path.dirname(__file__), '..', 'candidates.json')
SEED = 20261122
SCI_TECH = {'science_technology'}   # exam.category 값 중 과학·기술
# 분야 보정(웹 검토 2026-11-22): exam.category가 비어 있는 세트 중 지문 내용으로 과학·기술로 정한 세트(근거는 SELECTION.md '분야 보정')
FIELD_FIX = {
    '69c379281d65ab18e18f9c65': 'science_technology',  # 마찰 전기 나노 발전기(TENG)
    '69c379ca2b1d79e62e2e2a6e': 'science_technology',  # 골격근의 구조와 수축 원리
    '69fd388386fd308968e0b9f4': 'science_technology',  # 볼록 렌즈와 비점 수차
    '6a22950f86fd308968e11320': 'science_technology',  # 옥신의 기능과 식물 생장 조절
}
EXISTING = ['disclosure-12', 'gongsun-12', 'infoasym-13', 'meaning-23']

def stem_of(q):
    return ' '.join(b.get('text', '') for b in q['prompt_blocks'] if b['type'] == 'stem').strip()
def bogi_of(q):   # analyze.py 그대로
    t = []; img = False
    for b in q['prompt_blocks']:
        if b['type'] == 'supplement':
            if b.get('text', '').strip(): t.append(b['text'].strip())
            if b.get('images'): img = True
    return ' '.join(t), img
def bogi_kind(t, img):  # analyze.py 그대로
    if img and len(t) < 60: return '그림·그래프·표'
    if img: return '그림+설명'
    if re.search(r'학습 활동|학생|선생님|수업|활동지|탐구', t): return '학습 활동'
    if re.search(r'실험|측정|관측|시료|수조|검사 결과|조사 결과|관찰', t): return '실험·관찰'
    if re.search(r'(^|\s)ㄱ\.|주장|견해|비판|보았다|말했다|말하면서|에 따르면|제\d+조|사상가|학자|의 입장', t): return '외부 글·관점'
    if re.search(r'갑|을은|병|[A-Z]사|[A-Z] 지역|기업|사례|○○|△△|□□|씨는|회사|국가|어떤|한 ', t): return '사례·상황'
    return '외부 글·관점'

db = {x['set_id']: x for x in json.load(open(DB))}
existing_sets = {json.load(open(f'{GOLD}{k}.json'))['items'][0]['source']['setId'] for k in EXISTING}
cats = {}
for f in glob.glob(PASS + '*.json'):
    cats[os.path.basename(f)[:-5]] = json.load(open(f))['exam']['category']
cats.update(FIELD_FIX)
print('exam.category 값 목록(FIELD_FIX 반영):', dict(collections.Counter(cats.values())))
print('과학·기술로 쓰는 값:', SCI_TECH)

def layer(info):
    p, g = info.get('provider'), info.get('grade')
    if p in ('수능', '평가원 모의평가'): return 1
    if p == '교육청 모의평가' and g == 3: return 2
    if p == '교육청 모의평가' and g == 2: return 3
    return 4
LAYER_NAME = {1: '평가원·수능', 2: '교육청 고3', 3: '교육청 고2', 4: '그 밖'}

cand = {'case': {1:[],2:[],3:[],4:[]}, 'view': {1:[],2:[],3:[],4:[]}, 'table': {1:[],2:[],3:[],4:[]}}
none_cat_img = 0
for f in sorted(glob.glob(Q + '*.json')):
    d = json.load(open(f)); sid = d['set_id']
    if sid in existing_sets: continue
    af = A + sid + '.json'
    if not os.path.exists(af): continue
    ans = {a['question_number']: a['correct_choice'] for a in json.load(open(af))['questions']}
    info = db.get(sid, {})
    for q in d['questions']:
        if q.get('points') != 3 or q['number'] not in ans: continue
        t, img = bogi_of(q)
        if not t and not img: continue
        rec = dict(set_id=sid, number=q['number'], label=info.get('label'), provider=info.get('provider'),
                   grade=info.get('grade'), layer=layer(info), field=cats.get(sid), answer=ans[q['number']],
                   stem=stem_of(q), rule_class=bogi_kind(t, img), has_image=img)
        k = rec['rule_class']
        if not img and k == '사례·상황': cand['case'][rec['layer']].append(rec)
        elif not img and k in ('외부 글·관점', '학습 활동'): cand['view'][rec['layer']].append(rec)
        if img:
            if cats.get(sid) in SCI_TECH: cand['table'][rec['layer']].append(rec)
            elif cats.get(sid) is None: none_cat_img += 1
print('이미지 〈보기〉 중 exam.category=None이라 table 후보에서 빠진 문항 수:', none_cat_img)

rng = random.Random(SEED)
out = {'seed': SEED, 'sci_tech_values': sorted(SCI_TECH), 'existing_sets': sorted(existing_sets), 'kinds': {}}
for kind in ('case', 'view', 'table'):
    order = []
    for L in (1, 2, 3, 4):
        lst = sorted(cand[kind][L], key=lambda r: (r['set_id'], r['number']))
        rng.shuffle(lst)
        order += lst
    for i, r in enumerate(order, 1): r['rank'] = i
    out['kinds'][kind] = order
    print(kind, '후보', len(order), {LAYER_NAME[L]: len(cand[kind][L]) for L in (1,2,3,4)})
json.dump(out, open(OUT, 'w'), ensure_ascii=False, indent=1)
