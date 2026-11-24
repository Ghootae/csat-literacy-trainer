# 순서표 ② 칸 블라인드 풀이지·KEY·CODEX-PROMPT 생성 (2026-11-24). cell1-v62/blind/make_blind.py와 같은 틀.
# 지문 1편(조세 귀착) × 5문항 = 표 A-V1, 그래프 A-V2, 표 B-V1, 그래프 B-V2(이번 최종본) + 기출 12번. 순서 무작위, 출처 표시 없음.
# 그래프 문항은 PNG(img/pic-<문항>.png)와 읽기 판을 함께, 기출은 원본 이미지(img/gold-12.png → pic-<문항>.png 복사) + 같은 방식의 읽기 판(gold-12.spec.json로 render.mjs가 만든 글).
import json, random, os, shutil
HERE=os.path.dirname(os.path.abspath(__file__)); V=os.path.abspath(HERE+'/../../../deep-item-v5-2026-11-18')+'/'
CELL=os.path.abspath(HERE+'/..')+'/'
PID='tax-incidence-excise'
def load(p,ver):
    return [x for x in json.load(open(V+p))['items'] if x['version']==ver][0]
def final(base, m):
    d=f'{base}/{PID}-{m}/'
    lf=V+d+'leakfix/items-leakfix.json'
    if os.path.exists(lf):
        # 노출 수리 채택본이 있으면 그것(상태가 '채택'), 없으면 원본 유지 = repair/items-final.json과 같음
        return d+'leakfix/items-leakfix.json'
    return d+'repair/items-final.json'
# 재생성이 있으면 regen.json 으로 {"A|V2":"out-cell2-v62-regen"} 처럼 바꾼다
BASE={('A','V1'):'out-cell2-v62',('A','V2'):'out-cell2-v62',('B','V1'):'out-cell2-v62',('B','V2'):'out-cell2-v62'}
if os.path.exists(HERE+'/regen.json'): BASE.update({tuple(k.split('|')):v for k,v in json.load(open(HERE+'/regen.json')).items()})
def gen(m,ver):
    it=load(final(BASE[(m,ver)],m),ver); img=None
    if it['kind']=='graph':
        sp=CELL+f'graph-png/{m}-{ver}.png'; img=sp
    return it,img
def goldfn():
    g=load('calib-gold/tax-incidence-12.json','V1')
    intro=g['bogi'].split(' (그래프)')[0]
    stem=intro+'\n\n'+g['stem']
    return dict(g,stem=stem,bogi=open(HERE+'/gold-12.txt').read().strip()), HERE+'/img/gold-12.png'
ITEMS=[('표 A-V1 (out-cell2-v62)',lambda:gen('A','V1')),('그래프 A-V2 (out-cell2-v62)',lambda:gen('A','V2')),
       ('표 B-V1 (out-cell2-v62)',lambda:gen('B','V1')),('그래프 B-V2 (out-cell2-v62)',lambda:gen('B','V2')),
       ('기출 12번 (tax-incidence-12)',goldfn)]
LAB=list('가나다라마')
rnd=random.Random(20261128)
order=ITEMS[:]; rnd.shuffle(order)
os.makedirs(HERE+'/imgs',exist_ok=True)
hdr='''# 블라인드 풀이지: 〈보기〉 문항 5개 (사회 경제 표·그래프) (2026-11-24, 순서표 ②)

지문 하나에 〈보기〉 문항이 5개 있습니다. 서로 비슷한 문항이 있을 수 있지만 문항마다 따로 판정하세요. 출처는 가렸고 순서는 섞었습니다. 기출 문항이 섞여 있을 수 있습니다. 〈보기〉가 그래프인 문항은 그림을 PNG로 첨부했고(파일 이름 = pic-문항.png, 예: pic-가.png), 같은 그림을 글로 옮긴 "그래프 읽기 판"을 문항에 함께 적었습니다. 그림이 없는 〈보기〉(표)는 글만 있습니다.

문항마다 아래를 적어 주세요. 답과 등급을 모두 정한 뒤에 정답표를 여세요.
- 고른 답
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 3점 〈보기〉 문항으로 그대로 낼 수 있는가)
- 한 줄 이유
- 결함 표시(해당하면): ㉮ 〈보기〉가 지문 예시를 이름만 바꿔 옮김 ㉯ 〈보기〉를 안 봐도 풀리는 선지 2개 이상 ㉰ 〈보기〉에 쓰이지 않는 사실이 있음 ㉱ 〈보기〉가 서로 무관한 사건을 나열함 ㉲ 정답이 지문 한 문장으로 바로 정해짐 ㉳ 정답 시비(이의 제기) 위험 ㉴ 학생이 내려야 할 판정(누가 긍정·부정하는지, 어느 쪽과 같은지)까지 〈보기〉가 말함(비판 전제 제시는 제외)
'''
out=[hdr,'\n# 지문: 조세 귀着의 경제적 효과\n'.replace('귀着','귀착'),'## 지문\n'+open(V+f'passages/{PID}/passage.txt').read().strip()+'\n\n## 문항\n']
key=['# KEY (순서표 ② 경제 표·그래프 v6.2, 2026-11-24)\n','| 문항 | 출처 | 정답 | 그림 |','|---|---|---|---|']; keyjson=[]; imgs=[]
for li,(src,fn) in enumerate(order):
    it,img=fn(); lab=LAB[li]
    bogi='\n'.join('> '+l if l.strip() else '>' for l in it['bogi'].split('\n'))
    pic=''
    if img:
        dst=HERE+f'/imgs/pic-{lab}.png'; shutil.copy(img,dst); imgs.append(dst); pic=f'> (그림: pic-{lab}.png)\n>\n'
    out.append(f"**[문항 {lab}]** {it['stem']}\n\n> 〈보기〉\n>\n{pic}{bogi}\n\n"+'  \n'.join(it['choices'])+'  \n\n---\n')
    key.append(f"| {lab} | {src} | {'①②③④⑤'[it['answer']-1]} | {'있음' if img else '없음'} |")
    keyjson.append({'item':lab,'pid':PID,'source':src,'answer':'①②③④⑤'[it['answer']-1],'stem':it['stem'],'hasImage':bool(img)})
open(HERE+'/BLIND-cell2.md','w').write('\n'.join(out)); open(HERE+'/KEY-cell2.md','w').write('\n'.join(key)+'\n')
json.dump(keyjson,open(HERE+'/KEY-cell2.json','w'),ensure_ascii=False,indent=1)
n=len(order); pics=[f"pic-{LAB[i]}.png" for i,(s,f) in enumerate(order) if '그래프' in s or '기출' in s]
open(HERE+'/CODEX-PROMPT-cell2.md','w').write(f'''작업 폴더의 BLIND-cell2.md를 풀고 판정해 줘. 지문이 하나이고 〈보기〉 문항이 모두 {n}개야. 출처는 가렸고 기출이 섞여 있을 수 있어. 〈보기〉가 그래프인 문항의 그림은 첨부한 PNG들이고({', '.join(sorted(pics))}), 문항에는 같은 그림을 글로 옮긴 그래프 읽기 판도 적혀 있어. 그림과 읽기 판을 같이 보고 풀어. 표 〈보기〉 문항은 그림 없이 글(표)만 있어. 이 폴더의 파일 말고 다른 파일은 열지 마. 인터넷·API도 쓰지 마.

1) 문항마다(가~마) 직접 풀어서 정해 줘.
- 고른 답(①~⑤)
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 3점 〈보기〉 문항으로 그대로 낼 수 있는가)
- 한 줄 이유(판정을 가른 이유)
- 결함 표시: 풀이지 맨 위 ㉮~㉴ 중 해당하는 것(없으면 빈칸)
- 그래프 한 줄 평(〈보기〉가 그래프인 문항만: 그림·읽기 판이 수능 〈보기〉 그래프로 읽히는지, 어색하거나 읽기 어려운 부분. 표 문항은 빈칸)
서로 비슷한 문항이 있어도 문항마다 따로 판정해.

2) 가장 수능다운 문항과 가장 못한 문항을 하나씩 고르고, 두 문항의 차이를 학생의 풀이 단계(무엇을 읽고 → 지문의 어느 개념에 대응시키고 → 어떤 판단을 스스로 내려야 하는지)로 3~5줄 설명해 줘.

출력: 먼저 1)의 마크다운 표(문항|답|판정|이유|결함|그래프 평), 그 아래 2)의 설명, 마지막에 1)과 같은 내용을 ```json 블록 하나로: [{{"item":"가","answer":"⑤","grade":"수능 같음","reason":"...","defects":["㉴"],"graphNote":"..."}}, ...]. 파일은 쓰지 말고 답으로만 내 줘.
''')
print(open(HERE+'/KEY-cell2.md').read())
