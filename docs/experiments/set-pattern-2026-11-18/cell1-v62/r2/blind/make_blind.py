# 순서표 ① 2회차 v6.2 칸 블라인드 풀이지·KEY·CODEX-PROMPT 생성 (2026-11-24). 4단계 3회차 blind-r3/make_blind.py와 같은 틀.
# 지문 2편(정보 비대칭=관점, 공손룡=사례) × 5문항 = v6.2 A-V1, v6.2 B-V1, 앵커 v5(gen62) A-V1, v5(gen62) B-V1, 기출 1. 순서 무작위, 출처 표시 없음.
import json, random, os, sys
HERE=os.path.dirname(os.path.abspath(__file__)); V=os.path.abspath(HERE+'/../../../../deep-item-v5-2026-11-18')+'/'
STEM_U={'A':'윗글을 바탕으로 〈보기〉를 이해한 내용으로 적절하지 않은 것은?','B':'윗글을 바탕으로 〈보기〉를 이해한 내용으로 가장 적절한 것은?'}
def load(p): return json.load(open(V+p))['items'][0]
def final(base, pid, m):
    """leakfix 채택본이 있으면 그것, 없으면 repair/items-final.json (leakfix가 '노출 없음'이면 둘은 같다)"""
    d=f'{base}/{pid}-{m}/'
    lf=V+d+'leakfix/items-leakfix.json'
    if os.path.exists(lf) and load(d+'leakfix/items-leakfix.json').get('leakfix',{}).get('status')=='채택':
        return d+'leakfix/items-leakfix.json'
    if os.path.exists(V+d+'repair/items-final.json'): return d+'repair/items-final.json'
    return d+'items.json'
# v6.2 최종본이 재생성(-regen)이면 BASE62 를 지문·형별로 바꾼다
BASE62={('information-asymmetry-free-marketplace','A'):'out-cell1-v62-r2',('information-asymmetry-free-marketplace','B'):'out-cell1-v62-r2',
        ('gongsun-long-later-mohists','A'):'out-cell1-v62-r2',('gongsun-long-later-mohists','B'):'out-cell1-v62-r2'}
if os.path.exists(HERE+'/regen.json'): BASE62.update({tuple(k.split('|')):v for k,v in json.load(open(HERE+'/regen.json')).items()})
# 기출: 4단계·gen62 블라인드와 같은 처리(발문 통일, 지문 표시 ⓐⓑ를 가리키는 말로 바꿈, 보기 안내문 바꿈). 조사만 바로잡음(조항로→조항으로).
def gold(path, pid):
    it=load(path); st=STEM_U['A']
    ch=it['choices'][:]; bogi=it['bogi']
    if pid=='information-asymmetry-free-marketplace':
        ch=[c.replace('ⓐ로','관련 법률 조항으로').replace('ⓑ','실명확인 사건') for c in ch]
    if pid=='gongsun-long-later-mohists':
        bogi=bogi.replace('(ⓐ~ⓔ는 밑줄 친 부분을 가리키는 표시)','(ⓐ~ⓔ는 해당 말에 붙인 표시)')
    return dict(it, stem=st, choices=ch, bogi=bogi)
def stem_of(it): return it['stem']
P={'information-asymmetry-free-marketplace':{'title':'정보 비대칭과 사상의 자유 시장 이론','items':[
    ('기출 13번 (infoasym-13)', lambda: gold('calib-gold/infoasym-13.json','information-asymmetry-free-marketplace')),
    ('v5 A-V1 (out-gen62)', lambda: load(final('out-gen62','information-asymmetry-free-marketplace','A'))),
    ('v5 B-V1 (out-gen62)', lambda: load(final('out-gen62','information-asymmetry-free-marketplace','B'))),
    ('v6.2 A-V1', lambda: load(final(BASE62[('information-asymmetry-free-marketplace','A')],'information-asymmetry-free-marketplace','A'))),
    ('v6.2 B-V1', lambda: load(final(BASE62[('information-asymmetry-free-marketplace','B')],'information-asymmetry-free-marketplace','B')))]},
 'gongsun-long-later-mohists':{'title':'공손룡과 후기 묵가의 명실론','items':[
    ('기출 12번 (gongsun-12)', lambda: gold('calib-gold/gongsun-12.json','gongsun-long-later-mohists')),
    ('v5 A-V1 (out-gen62)', lambda: load(final('out-gen62','gongsun-long-later-mohists','A'))),
    ('v5 B-V1 (out-gen62)', lambda: load(final('out-gen62','gongsun-long-later-mohists','B'))),
    ('v6.2 A-V1', lambda: load(final(BASE62[('gongsun-long-later-mohists','A')],'gongsun-long-later-mohists','A'))),
    ('v6.2 B-V1', lambda: load(final(BASE62[('gongsun-long-later-mohists','B')],'gongsun-long-later-mohists','B')))]}}
LAB=list('가나다라마바사아자차')
rnd=random.Random(20261128)
hdr='''# 블라인드 풀이지: 〈보기〉 문항 10개 (사회 관점 5, 인문 사례 5) (2026-11-24, 순서표 ① 2회차)

지문 두 개에 〈보기〉 문항이 5개씩 있습니다. 서로 비슷한 문항이 있을 수 있지만 문항마다 따로 판정하세요. 출처는 가렸고 순서는 섞었습니다. 기출 문항이 섞여 있을 수 있습니다.

문항마다 아래를 적어 주세요. 답과 등급을 모두 정한 뒤에 정답표를 여세요.
- 고른 답
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 3점 〈보기〉 문항으로 그대로 낼 수 있는가)
- 한 줄 이유
- 결함 표시(해당하면): ㉮ 〈보기〉가 지문 예시를 이름만 바꿔 옮김 ㉯ 〈보기〉를 안 봐도 풀리는 선지 2개 이상 ㉰ 〈보기〉에 쓰이지 않는 사실이 있음 ㉱ 〈보기〉가 서로 무관한 사건을 나열함 ㉲ 정답이 지문 한 문장으로 바로 정해짐 ㉳ 정답 시비(이의 제기) 위험 ㉴ 학생이 내려야 할 판정(누가 긍정·부정하는지, 어느 쪽과 같은지)까지 〈보기〉가 말함(비판 전제 제시는 제외)
'''
out=[hdr]; key=['# KEY (순서표 ① 2회차 v6.2, 2026-11-24)\n','| 문항 | 지문 | 출처 | 정답 |','|---|---|---|---|']; li=0; keyjson=[]
for n,(pid,info) in enumerate(P.items(),1):
    order=info['items'][:]; rnd.shuffle(order)
    out.append(f"\n# 지문 {n}: {info['title']}\n\n## 지문\n"+open(V+f'passages/{pid}/passage.txt').read().strip()+'\n\n## 문항\n')
    for src,fn in order:
        it=fn(); lab=LAB[li]; li+=1
        bogi='\n'.join('> '+l if l.strip() else '>' for l in it['bogi'].split('\n'))
        out.append(f"**[문항 {lab}]** {it['stem']}\n\n> 〈보기〉\n>\n{bogi}\n\n"+'  \n'.join(it['choices'])+'  \n')
        key.append(f"| {lab} | 지문 {n} | {src} | {'①②③④⑤'[it['answer']-1]} |")
        keyjson.append({'item':lab,'passage':n,'pid':pid,'source':src,'answer':'①②③④⑤'[it['answer']-1],'stem':it['stem']})
open(HERE+'/BLIND-cell1r2.md','w').write('\n'.join(out)); open(HERE+'/KEY-cell1r2.md','w').write('\n'.join(key)+'\n')
json.dump(keyjson,open(HERE+'/KEY-cell1r2.json','w'),ensure_ascii=False,indent=1)
open(HERE+'/CODEX-PROMPT-cell1r2.md','w').write('''작업 폴더의 BLIND-cell1r2.md를 풀고 판정해 줘. 지문이 둘이고 〈보기〉 문항이 모두 10개야(지문마다 5개). 출처는 가렸고 기출이 섞여 있을 수 있어. 이 파일 말고 다른 파일은 열지 마. 인터넷·API도 쓰지 마.

1) 문항마다(가~차) 직접 풀어서 정해 줘.
- 고른 답(①~⑤)
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 3점 〈보기〉 문항으로 그대로 낼 수 있는가)
- 한 줄 이유(판정을 가른 이유)
- 결함 표시: 풀이지 맨 위 ㉮~㉴ 중 해당하는 것(없으면 빈칸)
서로 비슷한 문항이 있어도 문항마다 따로 판정해.

2) 지문마다, 그 지문의 문항 중 가장 수능다운 문항과 가장 못한 문항을 하나씩 고르고, 두 문항의 차이를 학생의 풀이 단계(무엇을 읽고 → 지문의 어느 개념에 대응시키고 → 어떤 판단을 스스로 내려야 하는지)로 3~5줄 설명해 줘.

출력: 먼저 1)의 마크다운 표(지문|문항|답|판정|이유|결함), 그 아래 2)의 지문별 설명, 마지막에 1)과 같은 내용을 ```json 블록 하나로: [{"passage":1,"item":"가","answer":"⑤","grade":"수능 같음","reason":"...","defects":["㉴"]}, ...]. 파일은 쓰지 말고 답으로만 내 줘.
''')
print(open(HERE+'/KEY-cell1r2.md').read())
