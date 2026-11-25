# 순서표 ④ 2단계 블라인드 풀이지·KEY·CODEX-PROMPT·run_eval 생성 (2026-11-25). cell3/exp/make_blind.py와 같은 틀.
# 사용(저장소 루트): python3 docs/experiments/set-pattern-2026-11-18/o4/make_blind.py
# T4 묶음 = T4-1 생성 4문항(A-V1 view, A-V2 case, B-V1 view, B-V2 case) + 자격 기출 공손룡 12번. T5 묶음 = T5-1 생성 4문항(모두 표) + 자격 기출 조세 귀착 12번(그림 pic-1.png).
# 생성 문항 최종본 = leakfix/items-leakfix.json (없으면 repair/items-final.json). 회차별 seed(20261251, 20261252), 출처 표시 없음.
import json, random, os, re, shutil
HERE=os.path.dirname(os.path.abspath(__file__)); SP=os.path.abspath(HERE+'/..')+'/'; V=os.path.abspath(SP+'../deep-item-v5-2026-11-18')+'/'
KEYALL={k['key']:k for k in json.load(open(SP+'calib-judge/KEY.json'))}
def quote(b): return '\n'.join('> '+l if l.strip() else '>' for l in b.split('\n'))
def final(pid,mode,ver,out='out-o4'):
    d=f'{V}{out}/{pid}-{mode}/'
    for rel in ('leakfix/items-leakfix.json','repair/items-final.json','items.json'):
        if os.path.exists(d+rel): return [x for x in json.load(open(d+rel))['items'] if x['version']==ver][0], d+rel
def gen(pid,mode,ver,out='out-o4'):
    it,src=final(pid,mode,ver,out)
    return f"{it['stem']}\n\n> 〈보기〉\n>\n{quote(it['bogi'])}\n\n"+'  \n'.join(it['choices'])+'  \n','①②③④⑤'[it['answer']-1],src
def gold(key):
    t=open(SP+f'calib-judge/{key}/BLIND.md',encoding='utf8').read()
    title=re.search(r'# 지문: (.*)',t).group(1).strip(); p=re.search(r'## 지문\n(.*?)\n\n## 문항',t,re.S).group(1).strip()
    b=re.search(r'\*\*\[문항 1\]\*\*(.*?)\n---',t,re.S).group(1).rstrip()
    return title,p,b.lstrip()+'  \n',KEYALL[key]['answer']
BUNDLES={
 'T4':dict(pid='gen32-o4-T4-1',gold='gongsun-12',goldlabel='자격 기출 공손룡 12번',pic=False,
   gens=[('생성 A-V1 view(새)','A','V1','out-o4-regen'),('생성 A-V2 case(새)','A','V2','out-o4-regen'),('생성 B-V1 view(옛)','B','V1','out-o4'),('생성 B-V2 case(새)','B','V2','out-o4-regen')])}
SEEDS={'r1':20261253,'r2':20261254}
for T,B in BUNDLES.items():
    D=HERE+f'/blind-{T}-regen/'; os.makedirs(D,exist_ok=True)
    T1=re.sub(r'\(생성[^)]*\)','',json.load(open(V+f"passages/{B['pid']}/meta.json"))['title']).strip(); P1=open(V+f"passages/{B['pid']}/passage.txt").read().strip()
    T2,P2,GB,GA=gold(B['gold'])
    if B['pic']: shutil.copy(SP+f"calib-judge/{B['gold']}/pic-1.png",D+'pic-1.png')
    for RUN,seed in SEEDS.items():
        items=[(lab,(lambda m=m,v=v,o=o:gen(B['pid'],m,v,o)),) for lab,m,v,o in B['gens']]
        items=[(lab,fn[0] if False else fn) for lab,(fn,) in [(a,b) for a,b in items]] if False else [(lab,fn) for lab,fn in [(x[0],x[1]) for x in items]]
        items.append((B['goldlabel'],lambda:(GB,GA,'calib-judge')))
        order=items[:]; random.Random(seed).shuffle(order)
        pic='문항 중 하나의 〈보기〉는 그림을 포함합니다. 그 그림은 pic-1.png로 첨부했고, 같은 그림을 글로 옮긴 읽기 판을 문항에 함께 적었습니다. 나머지 문항의 〈보기〉에 그림은 없고 모두 글입니다.' if B['pic'] else '〈보기〉에 그림은 없고 모두 글입니다.'
        hdr=f'''# 블라인드 풀이지: 〈보기〉 문항 5개 (지문 2개) (2026-11-25, 순서표 ④ {T} 재생성 {RUN})

지문이 두 개({T1} 지문, {T2} 지문)이고, 〈보기〉 문항이 5개 있습니다. 문항마다 어느 지문의 문항인지 적었습니다. 서로 비슷한 문항이 있을 수 있지만 문항마다 따로 판정하세요. 출처는 가렸고 순서는 섞었습니다. 기출 문항이 섞여 있을 수 있습니다. {pic}

문항마다 아래를 적어 주세요. 답과 등급을 모두 정한 뒤에 정답표를 여세요.
- 고른 답
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 3점 〈보기〉 문항으로 그대로 낼 수 있는가)
- 한 줄 이유
- 결함 표시(해당하면): ㉮ 〈보기〉가 지문 예시를 이름만 바꿔 옮김 ㉯ 〈보기〉를 안 봐도 풀리는 선지 2개 이상 ㉰ 〈보기〉에 쓰이지 않는 사실이 있음 ㉱ 〈보기〉가 서로 무관한 사건을 나열함 ㉲ 정답이 지문 한 문장으로 바로 정해짐 ㉳ 정답 시비(이의 제기) 위험 ㉴ 학생이 내려야 할 판정(누가 긍정·부정하는지, 어느 쪽과 같은지)까지 〈보기〉가 말함(비판 전제 제시는 제외)
'''
        out=[hdr,f'\n# 지문 1: {T1}\n','## 지문\n'+P1+'\n',f'\n# 지문 2: {T2}\n','## 지문\n'+P2+'\n','\n## 문항\n']
        key=[f'# KEY (순서표 ④ {T} {RUN}, 2026-11-25)\n','| 문항 | 출처 | 정답 | 지문 | 근거 파일 |','|---|---|---|---|---|']; kj=[]
        for i,(lab,fn) in enumerate(order):
            body,a,src=fn(); n=str(i+1); body=re.sub(r'^\s*','',body)
            t=T2 if lab==B['goldlabel'] else T1
            body=re.sub(r'^\*\*\[문항 1\]\*\*\s*','',body)
            out.append(f"**[문항 {n}]** (지문: {t}) {body}\n---\n")
            key.append(f"| {n} | {lab} | {a} | {t} | {src} |"); kj.append({'item':n,'source':lab,'answer':a,'passage':t,'src':src})
        open(D+f'BLIND-{RUN}.md','w',encoding='utf8').write('\n'.join(out)); open(D+f'KEY-{RUN}.md','w',encoding='utf8').write('\n'.join(key)+'\n'); json.dump(kj,open(D+f'KEY-{RUN}.json','w',encoding='utf8'),ensure_ascii=False,indent=1)
        picline='〈보기〉에 그림이 있는 문항이 하나 있어. 그 그림은 첨부한 pic-1.png이고, 문항에는 같은 그림을 글로 옮긴 읽기 판도 적혀 있어. 그림과 읽기 판을 같이 보고 풀어. 나머지 문항은 모두 글이야.' if B['pic'] else '〈보기〉에 그림이 있는 문항은 없고 모두 글이야.'
        gline='그래프 한 줄 평(〈보기〉가 그래프인 문항만. 그렇지 않으면 빈칸)' if B['pic'] else '그래프 한 줄 평(〈보기〉가 그래프인 문항만. 이번에는 그래프 문항이 없으니 모두 빈칸)'
        open(D+f'CODEX-PROMPT-{RUN}.md','w',encoding='utf8').write(f'''작업 폴더의 BLIND-{RUN}.md를 풀고 판정해 줘. 지문이 둘이고 〈보기〉 문항이 모두 5개야. 문항마다 어느 지문의 문항인지 적혀 있어. 출처는 가렸고 기출이 섞여 있을 수 있어. {picline} 이 폴더의 파일 말고 다른 파일은 열지 마. 인터넷·API도 쓰지 마.

1) 문항마다(1~5) 직접 풀어서 정해 줘.
- 고른 답(①~⑤)
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 3점 〈보기〉 문항으로 그대로 낼 수 있는가)
- 한 줄 이유(판정을 가른 이유)
- 결함 표시: 풀이지 맨 위 ㉮~㉴ 중 해당하는 것(없으면 빈칸)
- {gline}
서로 비슷한 문항이 있어도 문항마다 따로 판정해.

2) 가장 수능다운 문항과 가장 못한 문항을 하나씩 고르고, 두 문항의 차이를 학생의 풀이 단계(무엇을 읽고 → 지문의 어느 개념에 대응시키고 → 어떤 판단을 스스로 내려야 하는지)로 3~5줄 설명해 줘.

출력: 먼저 1)의 마크다운 표(문항|답|판정|이유|결함|그래프 평), 그 아래 2)의 설명, 마지막에 1)과 같은 내용을 ```json 블록 하나로: [{{"item":"1","answer":"⑤","grade":"수능 같음","reason":"...","defects":["㉴"],"graphNote":"..."}}, ...]. 파일은 쓰지 말고 답으로만 내 줘.
''')
        cp='; cp $H/pic-1.png $T/' if B['pic'] else ''; im='-i pic-1.png ' if B['pic'] else ''
        open(D+f'run_eval_{RUN}.sh','w').write(f'''#!/bin/zsh
# 평가자 4명 병렬. 평가자마다 새 임시 폴더(BLIND-{RUN}.md{' + pic-1.png' if B['pic'] else ''}만). 판정 모델 codex gpt-6.1-sol. cell3 run_eval_r1.sh와 같은 명령.
H=$(cd $(dirname $0) && pwd)
for i in 1 2 3 4; do
  T=$(mktemp -d /tmp/o4{T}regen{RUN}eval$i.XXXX); cp $H/BLIND-{RUN}.md $T/{cp}
  (cd $T && codex exec {im}-m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/CODEX-PROMPT-{RUN}.md > $T/log.txt 2>&1; echo "{T} {RUN} eval$i exit=$?"; cp $T/answer.md $H/REPORT-eval-{RUN}-$i.md) &
done
wait
''')
        os.chmod(D+f'run_eval_{RUN}.sh',0o755); print(T,RUN); print(open(D+f'KEY-{RUN}.md',encoding='utf8').read())
