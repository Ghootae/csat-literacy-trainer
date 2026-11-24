# 순서표 ③-c 평가 잣대 점검 (2026-11-24): 기출 10문항을 문항 하나씩 단독 블라인드로 만든다. 생성 문항 없음, 출처·시험 표시 없음.
# 사용(저장소 루트): python3 docs/experiments/set-pattern-2026-11-18/calib-judge/make_blind.py
# 이미 칸 대조로 쓴 5문항은 각 칸 BLIND 파일의 기출 문항 가공을 그대로 가져온다(번호만 1로). 새 5문항은 suneung_db 원문 + 원본 이미지.
import json, os, re, shutil, glob
HERE=os.path.dirname(os.path.abspath(__file__)); SP=os.path.abspath(HERE+'/..')+'/'
V=os.path.abspath(SP+'../deep-item-v5-2026-11-18')+'/'; DB='/Users/mac/Projects/suneung_db/output/'
CIRC='①②③④⑤'
def passage_v5(pid): return open(V+f'passages/{pid}/passage.txt').read().strip(), json.load(open(V+f'passages/{pid}/meta.json'))['title']
def old_block(blind, label):
    t=open(blind,encoding='utf8').read()
    m=re.search(r'\*\*\[문항 '+re.escape(label)+r'\]\*\*(.*?)(?=\n\n\*\*\[문항 |\n\n# 지문|\n---|\Z)',t,re.S); assert m,(blind,label)
    return '**[문항 1]**'+m.group(1).rstrip()+'\n\n---\n'
def passage_db(sid):
    d=json.load(open(DB+f'passages/{sid}.json')); t=d['full_text']
    marks=sorted([(e['start'],e['symbol']) for e in d['elements'] if e['kind']=='phrase' and e.get('symbol')],reverse=True)
    for s,sym in marks: t=t[:s]+sym+t[s:]
    out=[];n=0
    for l in t.split('\n'):
        l=l.strip()
        if not l: continue
        if l.startswith('*'): out.append(l)
        else: n+=1; out.append(f'[{n}문단] {l}')
    return '\n\n'.join(out), d['exam']['title']
def question(sid,num):
    q=json.load(open(SP+f'data/questions/{sid}.json')); it=[x for x in q['questions'] if x['number']==num][0]
    ans=[x for x in json.load(open(SP+f'data/answers/{sid}.json'))['questions'] if x['question_number']==num][0]['correct_choice']
    stem=[b for b in it['prompt_blocks'] if b['type']=='stem'][0]['text'].replace('<보기>','〈보기〉')
    sup=[b for b in it['prompt_blocks'] if b['type']=='supplement'][0]
    bogi=sup['text']
    for e in sorted([e for e in sup['elements'] if e['kind']=='phrase' and e.get('symbol')],key=lambda e:-e['start']): bogi=bogi[:e['start']]+e['symbol']+bogi[e['start']:]
    ch=[f"{c['label']} {c['text'].replace('<보기>','〈보기〉')}" for c in it['choices']]
    return stem,bogi.strip(),ch,ans
def block(stem,bogi,ch,pic=False):
    b='\n'.join('> '+l if l.strip() else '>' for l in bogi.split('\n'))
    return f"**[문항 1]** {stem}\n\n> 〈보기〉\n>\n{'> (그림: pic-1.png)'+chr(10)+'>'+chr(10) if pic else ''}{b}\n\n"+'  \n'.join(ch)+'  \n\n---\n'
READ_AUDIO='''[표 읽기 판]
행: 소리 / 주파수(Hz) / 소리 크기(dB) / 최소가청강도(dB) / 차폐 문턱값(dB)
소리 A: 150 / 30 / 38 / 38
소리 B: 1,000 / 30 / 8 / 20
소리 C: 1,500 / 63 / 12 / 38
소리 D: 2,000 / 55 / 2 / 6'''
READ_DIFF='''[그림 읽기 판]
위쪽: (가) ⇨ [A 단계] ⇨ (나) (왼쪽에서 오른쪽으로 화살표로 이어짐).
아래쪽: 그림 세 개가 나란히 있음. ㉠ 선명한 강아지 사진(원본 이미지), ㉡ 같은 강아지 사진에 노이즈가 섞여 흐릿해진 이미지, ㉢ 강아지가 전혀 보이지 않고 노이즈만 가득한 이미지.'''
ITEMS=[]   # (key, label, passage_text, title, item_block, answer, image_path|None, kind)
OLD=[('gongsun-12','공손룡 12번 (사례)','gongsun-long-later-mohists',SP+'cell1-v62/blind/BLIND-cell1.md','사',None,'④'),
     ('infoasym-13','정보 비대칭 13번 (관점)','information-asymmetry-free-marketplace',SP+'cell1-v62/blind/BLIND-cell1.md','마',None,'⑤'),
     ('tax-incidence-12','조세 귀착 12번 (그래프)','tax-incidence-excise',SP+'cell2/blind/BLIND-cell2.md','나',SP+'cell2/blind/imgs/pic-나.png','④'),
     ('solid-catalyst-10','고체 촉매 10번 (사례)','solid-catalyst',SP+'cell3/blind/solid-catalyst/BLIND-r1.md','4',None,'④'),
     ('auxin-17','옥신 17번 (그래프)','auxin-growth',SP+'cell3/blind/auxin-growth/BLIND-r1.md','4',SP+'cell3/blind/auxin-growth/img-r1/pic-4.png','⑤')]
for key,label,pid,blind,lab,img,ans in OLD:
    p,t=passage_v5(pid); b=old_block(blind,lab)
    if img: b=re.sub(r'\(그림: pic-[^)]*\.png\)','(그림: pic-1.png)',b)
    ITEMS.append((key,label,p,t,b,ans,img,'기존'))
def new(key,label,sid,num,img=None,extra=None,pv5=None):
    stem,bogi,ch,a=question(sid,num)
    if extra: bogi=bogi+'\n'+extra
    p,t=passage_v5(pv5) if pv5 else passage_db(sid)
    ITEMS.append((key,label,p,t,block(stem,bogi,ch,bool(img)),CIRC[a-1],img,'신규'))
new('plastic-10','플라스틱 10번 (사례)','69bc1c89a029f488d9e54e5b',10,pv5='bt-69bc1c89')
new('laozi-16','노자 16번 (관점)','69c007c078128b2a9bedd3c7',16,pv5='bt-69c007c0')
new('audio-17','오디오 17번 (표)','69bc96468095df3b8c51460e',17,img=DB+'assets/69bc96468095df3b8c51460e/img_001.png',extra=READ_AUDIO,pv5='bt-69bc9646')
new('piezo-11','압전 11번 (실험)','69bc23328937cf1455195b3f',11)
new('diffusion-13','확산 모델 13번 (도식)','69bc036a8937cf145519091f',13,img=DB+'assets/69bc036a8937cf145519091f/img_001.png',extra=READ_DIFF)
HDR='''# 블라인드 풀이지: 〈보기〉 문항 1개 (과학·인문·사회 지문 하나) (2026-11-24, 순서표 ③-c)

지문 하나에 〈보기〉 문항이 1개 있습니다. 출처는 가렸습니다. {PIC}

아래를 적어 주세요. 답과 등급을 모두 정한 뒤에 정답표를 여세요.
- 고른 답
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 3점 〈보기〉 문항으로 그대로 낼 수 있는가)
- 한 줄 이유
- 결함 표시(해당하면): ㉮ 〈보기〉가 지문 예시를 이름만 바꿔 옮김 ㉯ 〈보기〉를 안 봐도 풀리는 선지 2개 이상 ㉰ 〈보기〉에 쓰이지 않는 사실이 있음 ㉱ 〈보기〉가 서로 무관한 사건을 나열함 ㉲ 정답이 지문 한 문장으로 바로 정해짐 ㉳ 정답 시비(이의 제기) 위험 ㉴ 학생이 내려야 할 판정(누가 긍정·부정하는지, 어느 쪽과 같은지)까지 〈보기〉가 말함(비판 전제 제시는 제외)
'''
KEYMD=['# KEY (순서표 ③-c 평가 잣대 점검, 2026-11-24)\n','| 문항키 | 이름 | 정답 | 그림 | 구분 |','|---|---|---|---|---|']; KEYJ=[]
for key,label,p,t,b,ans,img,kind in ITEMS:
    D=HERE+f'/{key}/'; os.makedirs(D,exist_ok=True)
    pic='〈보기〉가 그림을 포함하면 그림을 PNG(pic-1.png)로 첨부했고, 같은 그림을 글로 옮긴 읽기 판을 문항에 함께 적었습니다.' if img else '〈보기〉에 그림은 없고 글만 있습니다.'
    open(D+'BLIND.md','w',encoding='utf8').write(HDR.format(PIC=pic)+f'\n# 지문: {t}\n\n## 지문\n{p}\n\n## 문항\n{b}')
    if img: shutil.copy(img,D+'pic-1.png')
    picn=('〈보기〉의 그림은 첨부한 pic-1.png이고, 문항에는 같은 그림을 글로 옮긴 읽기 판도 적혀 있어. 그림과 읽기 판을 같이 보고 풀어. ' if img else '〈보기〉에 그림은 없고 글만 있어. ')
    open(D+'CODEX-PROMPT.md','w',encoding='utf8').write(f'''작업 폴더의 BLIND.md를 풀고 판정해 줘. 지문이 하나이고 〈보기〉 문항이 1개야. 출처는 가렸어. {picn}이 폴더의 파일 말고 다른 파일은 열지 마. 인터넷·API도 쓰지 마.

문항(1번)을 직접 풀어서 정해 줘.
- 고른 답(①~⑤)
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 3점 〈보기〉 문항으로 그대로 낼 수 있는가)
- 한 줄 이유(판정을 가른 이유)
- 결함 표시: 풀이지 맨 위 ㉮~㉴ 중 해당하는 것(없으면 빈칸)
- 그래프 한 줄 평(〈보기〉가 그림·그래프·표 이미지를 포함할 때만: 그림·읽기 판이 수능 〈보기〉로 읽히는지, 어색하거나 읽기 어려운 부분. 그림이 없으면 빈칸)

출력: 먼저 마크다운 표(문항|답|판정|이유|결함|그래프 평), 마지막에 같은 내용을 ```json 블록 하나로: [{{"item":"1","answer":"⑤","grade":"수능 같음","reason":"...","defects":["㉴"],"graphNote":"..."}}]. 파일은 쓰지 말고 답으로만 내 줘.
''')
    KEYJ.append({'key':key,'label':label,'answer':ans,'hasImage':bool(img),'kind':kind}); KEYMD.append(f"| {key} | {label} | {ans} | {'있음' if img else '없음'} | {kind} |")
    open(D+'run_eval.sh','w').write(f'''#!/bin/zsh
# 평가자 4명 × 2회차(r1·r2) 병렬. 회차·평가자마다 새 임시 폴더(BLIND.md{' + pic-1.png' if img else ''}만). 판정 모델 codex gpt-6.1-sol. cell3 run_eval_r1.sh와 같은 명령.
H=$(cd $(dirname $0) && pwd)
for r in 1 2; do for i in 1 2 3 4; do
  T=$(mktemp -d /tmp/calib{key.replace('-','')}r$r$i.XXXX); cp $H/BLIND.md $T/; {'cp $H/pic-1.png $T/' if img else ':'}
  (cd $T && codex exec {'-i pic-1.png ' if img else ''}-m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/CODEX-PROMPT.md > $T/log.txt 2>&1; echo "{key} r$r-$i exit=$?"; cp $T/answer.md $H/REPORT-eval-r$r-$i.md) &
done; done
wait
''')
    os.chmod(D+'run_eval.sh',0o755)
open(HERE+'/KEY.md','w',encoding='utf8').write('\n'.join(KEYMD)+'\n'); json.dump(KEYJ,open(HERE+'/KEY.json','w'),ensure_ascii=False,indent=1)
print('\n'.join(KEYMD))
