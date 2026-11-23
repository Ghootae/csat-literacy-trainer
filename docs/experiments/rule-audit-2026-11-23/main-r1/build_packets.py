# 2단계 본 감사 묶음 만들기. 실행: python3 main-r1/build_packets.py (저장소 루트에서). API 호출 없음.
# 본 감사용 26문항을 DB 원본(지문·〈보기〉·발문·선지)에서 글로 만든다. 그림·표 〈보기〉는 글 옮김으로 바꾼다.
import json, os, re, random, importlib.util, sys
R='docs/experiments/'; M=R+'rule-audit-2026-11-23/main-r1/'; P1=R+'rule-audit-2026-11-23/pilot-r1/'
BT=R+'bogi-distractor-tagging-2026-11-22/'
PASS=os.path.expanduser('~/Projects/suneung_db/output/passages/')
Q=R+'set-pattern-2026-11-18/data/questions/'; A=R+'set-pattern-2026-11-18/data/answers/'
def fix(t): return re.sub(r'<\s*보\s*기\s*>','〈보기〉',t)
# 지문 변환은 1단계(pilot-r1/build_packets.py)와 같은 함수 — 파일 앞부분(함수 정의)만 불러 쓴다
src=open(P1+'build_packets.py').read().split("packets={}")[0]
ns={}; exec(src,ns); passage_from_db=ns['passage_from_db']
inv=json.load(open(R+'rule-audit-2026-11-23/inventory.json'))
def build_item(sid,num,insert=None):
    d=json.load(open(Q+sid+'.json')); q=[x for x in d['questions'] if x['number']==num][0]
    ans={a['question_number']:a['correct_choice'] for a in json.load(open(A+sid+'.json'))['questions']}[num]
    stem=fix(' '.join(b['text'] for b in q['prompt_blocks'] if b['type']=='stem').strip()); parts=[]
    for b in q['prompt_blocks']:
        if b['type']!='supplement': continue
        t=b['text']; ins=[]
        for e in b.get('elements',[]):
            if e['kind']=='phrase' and e.get('symbol'):
                assert t[e['start']:e['end']]==e['text']; ins.append((e['start'],e['symbol']))
        if insert:
            for pos,s in insert: ins.append((pos,s))
        for pos,sym in sorted(ins,key=lambda x:-x[0]): t=t[:pos]+sym+t[pos:]
        parts.append(t.strip())
    return dict(stem=stem,bogi='\n'.join(parts),choices=[f"{c['label']} {c['text']}" for c in q['choices']],answer=ans)
# --- 글 옮김 (그림·표 〈보기〉) ---
TR={}  # 문항 키 → 무엇을 옮겼는지(보고용)
FIG12_BOGI=("\n\n[그림 설명(글)]\n그림은 집게의 모습이다. 위쪽에 가로로 놓인 직육면체 몸체가 있고(그 위에 원기둥 모양 손잡이가 붙어 있다), 몸체 양쪽 끝에서 띠가 하나씩 아래로 늘어져 있다(두 띠는 서로 마주 보는 구조). "
 "양쪽 띠의 아래쪽 끝은 점선으로 여러 겹 그려진 곡선을 따라 서로 안쪽으로 휘어 들어오고, 두 띠 사이 아래쪽 가운데에 작은 직육면체 물체가 놓여 있다. 두 띠 끝에 안쪽(물체 쪽)을 향한 굵은 화살표가 하나씩 있어, 띠가 안으로 휘어 물체를 잡는 모습을 나타낸다. 그림에 수치나 문자는 없다.")
FIG12_PASS=("[<그림> 설명(글)]\n그림은 두 층으로 접합된 띠 하나를 비스듬히 위에서 본 모습이다. 위층에 'P층', 아래층에 'Q층'이라는 표시가 화살표로 붙어 있다. 두 층의 두께는 같고, 띠는 P층 쪽이 안쪽(오목한 쪽), Q층이 바깥쪽이 되도록 원의 호처럼 휘어 있다. 그림에 수치는 없다.")
CMT16=("\n[댓글 그림(글)]\n'A의 해설에 대한 후기'라는 제목 아래 댓글이 세 줄로 이어진다(들여쓰기와 화살표로 앞 댓글에 대한 답글임을 나타낸다).\n"
 "- 첫째 줄(사용자 b): \"A가 박사인지 의심스럽다. A는 #~#.\"\n"
 "  - 둘째 줄(사용자 a, b의 댓글에 대한 답글): \"□□ 전시관에서 물고기를 관리하는 b는 #~#.\"\n"
 "    - 셋째 줄(사용자 c, a의 댓글에 대한 답글): \"게시판 분위기를 흐리는 a는 #~#.\"\n")
TAB8_BOGI=("[표 설명(글)]\n학습 활동지의 표이다. 맨 위 안내: \"아래를 읽고 맞으면 ○, 틀리면 × 표시를 하시오.\" 표는 '판단할 내용'과 '판단 결과' 두 열로 되어 있고, 각 행의 오른쪽 끝에 번호 ①~⑤가 이어져 있다. 이 문항의 선지 ①~⑤는 표의 행 ①~⑤이다(표에서 ③과 ④ 사이에는 말줄임 표시가 있다). 각 선지는 '판단할 내용'과 학생의 '판단 결과(○ 또는 ×)'로 이루어진다.")
TAB8_CH=['① 판단할 내용: "블록체인 기술의 특성과 한계를 살펴보고 있다." / 판단 결과: ○',
 '② 판단할 내용: "블록체인의 구조를 분석하고, 블록체인 기술의 응용 분야를 소개하고 있다." / 판단 결과: ×',
 '③ 판단할 내용: "블록체인 기술의 장점을 열거하고, 다른 기술과의 경쟁 양상을 설명하고 있다." / 판단 결과: ×',
 '④ 판단할 내용: "합의 알고리즘은 작업증명의 한 예이다." / 판단 결과: ○',
 '⑤ 판단할 내용: "체인 형태로 연결된 블록의 집합을 저장하는 컴퓨터를 노드라고 한다." / 판단 결과: ○']
packets={}
for it in inv['main']:
    k=it['key']; sid=it['set_id']; num=it['number']; pas=passage_from_db(sid); insert=None; trans=''
    if k=='2025-11-수능-12':
        assert pas.count('[3문단]')==1; pas=pas.replace('[3문단]',FIG12_PASS+'\n\n[3문단]'); trans='지문 그림(P층·Q층 띠) + 〈보기〉 그림(집게) 글 설명 새로 작성'
    d=build_item(sid,num)
    if k=='2025-11-수능-12': d['bogi']=d['bogi']+FIG12_BOGI
    elif k=='2025-09-평가원-17':
        tb=open(BT+'bogi-transcribed/bt-69bc9646.md').read().split('\n\n',1)[1].rstrip('\n'); d['bogi']=tb; trans='기존 글 옮김 사용(bogi-transcribed/bt-69bc9646.md의 표)'
    elif k=='2024-11-수능-16':
        d=build_item(sid,num,insert=[(203,CMT16)]); trans='〈보기〉 댓글 그림 글 설명 새로 작성'
    elif k=='2024-11-수능-13':
        pk=json.load(open(P1+'KEY-pilot-r1.json')); pid=[p for p,v in pk.items() if v['key']=='2024-11-수능-13'][0]
        t=open(P1+f'packets/{pid}.md').read(); d['bogi']=t.split('〈보기〉\n\n',1)[1].split('\n\n①',1)[0]; trans='1단계에서 만든 글 옮김 재사용(확산 모델 그림)'
    elif k=='2024-09-평가원-8':
        d['bogi']=TAB8_BOGI; d['choices']=TAB8_CH; trans='〈보기〉 학습 활동지 표 글 설명 + 표 행으로 된 선지 ①~⑤(선지 본문이 그림이었음) 새로 작성'
    packets[k]=dict(it=it,pas=pas,trans=trans,**d)
    assert len(d['choices'])==5 and d['answer']==it['answer'], (k,len(d['choices']),d['answer'],it['answer'])
names=list(packets); random.Random(20261123003).shuffle(names)
os.makedirs(M+'packets',exist_ok=True); keymap={}
for i,nm in enumerate(names,1):
    mid=f'M{i:02d}'; p=packets[nm]
    txt=f"# {mid}\n\n## 지문\n\n{p['pas']}\n\n## 문항\n\n{p['stem']}\n\n〈보기〉\n\n{p['bogi']}\n\n"+'\n'.join(p['choices'])+'\n'
    open(M+f'packets/{mid}.md','w').write(txt)
    it=p['it']; keymap[mid]=dict(key=nm,kind=it['kind'],audit_kind=it['audit_kind'],subkind=it['subkind'],direction=it['direction'],official_answer=it['answer'],history=it['history'],ambiguous=bool(it['ambiguous']),answer_disputed=(nm=='2026-06-평가원-8'),transcribed=p['trans'])
json.dump(keymap,open(M+'KEY-main-r1.json','w'),ensure_ascii=False,indent=1)
for mid,k in keymap.items(): print(mid,k['key'],k['audit_kind'],k['direction'],k['official_answer'],k['transcribed'])
