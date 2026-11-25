# 그래프 첫 실전 블라인드 풀이지·KEY·CODEX-PROMPT·run_eval 생성 (2026-11-25). o4/make_blind.py와 같은 틀.
# 사용(저장소 루트): python3 docs/experiments/set-pattern-2026-11-18/graphC/make_blind.py
# 문항 5 = 생성 A-V2(graph), B-V2(graph) + 자격 기출 플라스틱 10, 오디오 17 + 참고 기출 조세 귀착 12. 지문 4개. 그림 4장(pic-1~4).
import json, random, os, re, shutil
HERE=os.path.dirname(os.path.abspath(__file__)); SP=os.path.abspath(HERE+'/..')+'/'; V=os.path.abspath(SP+'../deep-item-v5-2026-11-18')+'/'
KEYALL={k['key']:k for k in json.load(open(SP+'calib-judge/KEY.json'))}
D=HERE+'/blind/'; os.makedirs(D,exist_ok=True)
def quote(b): return '\n'.join('> '+l if l.strip() else '>' for l in b.split('\n'))
PIC={}  # label -> pic filename
def addpic(label,src):
    n=f'pic-{len(PIC)+1}.png'; shutil.copy(src,D+n); PIC[label]=n; return n
def final(mode):
    d=f'{V}out-graphC/gen32-o4-T5-1-{mode}/'
    for rel in ('leakfix/items-leakfix.json','repair/items-final.json','items.json'):
        if os.path.exists(d+rel): return [x for x in json.load(open(d+rel))['items'] if x['version']=='V2'][0], d+rel
def gen(label,mode):
    it,src=final(mode); pic=addpic(label,SP+f'graphC/png/{mode}-V2.png')
    bogi=it['bogi']; i=bogi.find('[그래프 읽기 판]')
    pre,panel=(bogi[:i].rstrip(),bogi[i:]) if i>=0 else ('',bogi)
    inner=(pre+'\n' if pre else '')+f'(그림: {pic})\n\n'+panel
    return f"{it['stem']}\n\n> 〈보기〉\n>\n{quote(inner)}\n\n"+'  \n'.join(it['choices'])+'  \n','①②③④⑤'[it['answer']-1],src
def gold(key,label):
    t=open(SP+f'calib-judge/{key}/BLIND.md',encoding='utf8').read()
    title=re.search(r'# 지문: (.*)',t).group(1).strip(); p=re.search(r'## 지문\n(.*?)\n\n## 문항',t,re.S).group(1).strip()
    b=re.search(r'\*\*\[문항 1\]\*\*(.*?)\n---',t,re.S).group(1).rstrip()
    if os.path.exists(SP+f'calib-judge/{key}/pic-1.png'):
        n=addpic(label,SP+f'calib-judge/{key}/pic-1.png'); b=b.replace('(그림: pic-1.png)',f'(그림: {n})')
    return title,p,b.lstrip()+'  \n',KEYALL[key]['answer']
pid='gen32-o4-T5-1'
T1=re.sub(r'\(생성[^)]*\)','',json.load(open(V+f'passages/{pid}/meta.json'))['title']).strip(); P1=open(V+f'passages/{pid}/passage.txt').read().strip()
GOLD={'plastic-10':'자격 기출 플라스틱 10번','audio-17':'자격 기출 오디오 17번','tax-incidence-12':'참고 기출 조세 귀착 12번'}
# 그림 번호가 회차와 무관하게 고정되도록 먼저 모두 만든다
G={}
for lab,m in (('생성 A-V2 graph','A'),('생성 B-V2 graph','B')): G[lab]=(lambda lab=lab,m=m:gen(lab,m))
GE={k:gold(k,v) for k,v in GOLD.items()}
SEEDS={'r1':20261261,'r2':20261262}
PICLINE='〈보기〉에 그림이 있는 문항이 여럿 있습니다(문항에 그림 파일 이름을 적었습니다). 그림은 PNG로 첨부했고, 같은 그림을 글로 옮긴 읽기 판을 문항에 함께 적었습니다. 그림이 없는 문항은 글만 있습니다.'
GL='그래프 한 줄 평(〈보기〉가 그래프인 문항만. 그렇지 않으면 빈칸)'
bodies={}
for lab,fn in G.items(): bodies[lab]=(lambda f=fn: f())
for RUN,seed in SEEDS.items():
    PIC.clear()
    # 그림 번호 고정: 생성 A, B, 오디오, 조세 순
    items=[]
    for lab in G: items.append((lab,G[lab]()))
    gens={lab:v for lab,v in items}
    PIC2=dict(PIC)
    # 기출은 gold()가 이미 pic을 만들었으나 PIC.clear()로 초기화됨 → 다시 만든다
    GE2={}
    for k,v in GOLD.items(): GE2[v]=gold(k,v)
    order=[(lab,('gen',v)) for lab,v in gens.items()]+[(v,('gold',GE2[v])) for v in GOLD.values()]
    random.Random(seed).shuffle(order)
    ps=[(T1,P1)]; 
    for lab,kind in order:
        if kind[0]=='gold': ps.append((kind[1][0],kind[1][1]))
    hdr=f'''# 블라인드 풀이지: 〈보기〉 문항 5개 (지문 4개) (2026-11-25, 그래프 첫 실전 {RUN})

지문이 네 개({', '.join(t for t,_ in ps)} 지문)이고, 〈보기〉 문항이 5개 있습니다. 문항마다 어느 지문의 문항인지 적었습니다. 서로 비슷한 문항이 있을 수 있지만 문항마다 따로 판정하세요. 출처는 가렸고 순서는 섞었습니다. 기출 문항이 섞여 있을 수 있습니다. {PICLINE}

문항마다 아래를 적어 주세요. 답과 등급을 모두 정한 뒤에 정답표를 여세요.
- 고른 답
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 3점 〈보기〉 문항으로 그대로 낼 수 있는가)
- 한 줄 이유
- 결함 표시(해당하면): ㉮ 〈보기〉가 지문 예시를 이름만 바꿔 옮김 ㉯ 〈보기〉를 안 봐도 풀리는 선지 2개 이상 ㉰ 〈보기〉에 쓰이지 않는 사실이 있음 ㉱ 〈보기〉가 서로 무관한 사건을 나열함 ㉲ 정답이 지문 한 문장으로 바로 정해짐 ㉳ 정답 시비(이의 제기) 위험 ㉴ 학생이 내려야 할 판정(누가 긍정·부정하는지, 어느 쪽과 같은지)까지 〈보기〉가 말함(비판 전제 제시는 제외)
'''
    out=[hdr]
    for i,(t,p) in enumerate(ps): out+= [f'\n# 지문 {i+1}: {t}\n','## 지문\n'+p+'\n']
    out.append('\n## 문항\n')
    key=[f'# KEY (그래프 첫 실전 {RUN}, 2026-11-25)\n','| 문항 | 출처 | 정답 | 지문 | 근거 파일 |','|---|---|---|---|---|']; kj=[]
    for i,(lab,kind) in enumerate(order):
        n=str(i+1)
        if kind[0]=='gen': body,a,src=kind[1]; t=T1
        else: body,a,src=kind[1][2],kind[1][3],'calib-judge'; t=kind[1][0]
        body=re.sub(r'^\*\*\[문항 1\]\*\*\s*','',re.sub(r'^\s*','',body))
        out.append(f'**[문항 {n}]** (지문: {t}) {body}\n---\n')
        key.append(f'| {n} | {lab} | {a} | {t} | {src} |'); kj.append({'item':n,'source':lab,'answer':a,'passage':t,'src':src})
    open(D+f'BLIND-{RUN}.md','w',encoding='utf8').write('\n'.join(out)); open(D+f'KEY-{RUN}.md','w',encoding='utf8').write('\n'.join(key)+'\n'); json.dump(kj,open(D+f'KEY-{RUN}.json','w',encoding='utf8'),ensure_ascii=False,indent=1)
    open(D+f'CODEX-PROMPT-{RUN}.md','w',encoding='utf8').write(f'''작업 폴더의 BLIND-{RUN}.md를 풀고 판정해 줘. 지문이 넷이고 〈보기〉 문항이 모두 5개야. 문항마다 어느 지문의 문항인지 적혀 있어. 출처는 가렸고 기출이 섞여 있을 수 있어. 〈보기〉에 그림이 있는 문항이 여럿 있어. 그림은 첨부한 PNG이고(문항에 파일 이름이 적혀 있어), 문항에는 같은 그림을 글로 옮긴 읽기 판도 적혀 있어. 그림과 읽기 판을 같이 보고 풀어. 이 폴더의 파일 말고 다른 파일은 열지 마. 인터넷·API도 쓰지 마.

1) 문항마다(1~5) 직접 풀어서 정해 줘.
- 고른 답(①~⑤)
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 3점 〈보기〉 문항으로 그대로 낼 수 있는가)
- 한 줄 이유(판정을 가른 이유)
- 결함 표시: 풀이지 맨 위 ㉮~㉴ 중 해당하는 것(없으면 빈칸)
- {GL}
서로 비슷한 문항이 있어도 문항마다 따로 판정해.

2) 가장 수능다운 문항과 가장 못한 문항을 하나씩 고르고, 두 문항의 차이를 학생의 풀이 단계(무엇을 읽고 → 지문의 어느 개념에 대응시키고 → 어떤 판단을 스스로 내려야 하는지)로 3~5줄 설명해 줘.

출력: 먼저 1)의 마크다운 표(문항|답|판정|이유|결함|그래프 평), 그 아래 2)의 설명, 마지막에 1)과 같은 내용을 ```json 블록 하나로: [{{"item":"1","answer":"⑤","grade":"수능 같음","reason":"...","defects":["㉴"],"graphNote":"..."}}, ...]. 파일은 쓰지 말고 답으로만 내 줘.
''')
    pics=sorted(set(PIC.values())); im=' '.join(f'-i {p}' for p in pics)
    open(D+f'run_eval_{RUN}.sh','w').write(f'''#!/bin/zsh
# 평가자 4명 병렬. 평가자마다 새 임시 폴더(BLIND-{RUN}.md + pic 파일만). 판정 모델 codex gpt-6.1-sol.
H=$(cd $(dirname $0) && pwd)
for i in 1 2 3 4; do
  T=$(mktemp -d /tmp/gcC{RUN}eval$i.XXXX); cp $H/BLIND-{RUN}.md $H/pic-*.png $T/
  (cd $T && codex exec {im} -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/CODEX-PROMPT-{RUN}.md > $T/log.txt 2>&1; echo "{RUN} eval$i exit=$?"; cp $T/answer.md $H/REPORT-eval-{RUN}-$i.md) &
done
wait
''')
    os.chmod(D+f'run_eval_{RUN}.sh',0o755); print(RUN, PIC); print(open(D+f'KEY-{RUN}.md',encoding='utf8').read())
