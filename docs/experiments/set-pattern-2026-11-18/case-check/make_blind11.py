# 사례 칸 재시험 블라인드 풀이지(2026-11-25, CLI-case-fact-repair.md 4절). o4/make_blind_regen.py와 같은 틀.
# 사용: python3 make_blind.py   → blind-solid/, blind-moral/ (BLIND-r{1,2}.md, KEY-r{1,2}.{md,json}, CODEX-PROMPT-r{1,2}.md, run_eval_r{1,2}.sh)
import json, random, os, re
HERE=os.path.dirname(os.path.abspath(__file__)); SP=os.path.abspath(HERE+'/..')+'/'; V=os.path.abspath(SP+'../deep-item-v5-2026-11-18')+'/'
KEYALL={k['key']:k for k in json.load(open(SP+'calib-judge/KEY.json'))}
def quote(b): return '\n'.join('> '+l if l.strip() else '>' for l in b.split('\n'))
def render(it,bogi=None,choices=None):
    return f"{it['stem']}\n\n> 〈보기〉\n>\n{quote(bogi or it['bogi'])}\n\n"+'  \n'.join(choices or it['choices'])+'  \n'
def load(p): return json.load(open(V+p))['items']
def pick(p,ver): return [x for x in load(p) if x['version']==ver][0]
def gold(key):
    t=open(V+'blind/BLIND-cell5.md',encoding='utf8').read()
    title=re.search(r'# 지문 1: (.*)',t).group(1).strip(); p=re.search(r'# 지문 1:.*?\n\n## 지문\n(.*?)\n\n## 문항',t,re.S).group(1).strip()
    b=re.search(r'\*\*\[문항 가\]\*\*(.*?)\n\*\*\[문항 나\]',t,re.S).group(1).rstrip()
    return title,p,b.lstrip()+'  \n','⑤'
M6='out-case-m6/'; M6B='out-case-m6b/'
def gens(specs):  # v6.5 재시험: 수리된 문항이 없어 수리 전 판은 없다. 항목 = (라벨, 파일, 버전)
    out=[]
    for lab,path,ver in specs:
        f=pick(path,ver); out.append((lab,render(f),'①②③④⑤'[f['answer']-1],path))
    return out
BUNDLES={
 'pair3':dict(specs=[
   ('A안 청약 A-V1','out-case-pair3/gen32-T3-2-A/leakfix/items-leakfix.json','V1','cy'),
   ('옛 청약 A-V1(out-cell5)','out-cell5/gen32-T3-2-A/leakfix/items-leakfix.json','V1','cy'),('옛 청약 A-V1(lever5-old)','out-case-lever5-old/gen32-T3-2-A/leakfix/items-leakfix.json','V1','cy'),
   ('A안 도덕적 운 A-V2','out-case-pair3/gen32-o4-T4-1-A/leakfix/items-leakfix.json','V2','mo'),
   ('옛 도덕적 운 A-V2(out-o4)','out-o4/gen32-o4-T4-1-A/leakfix/items-leakfix.json','V2','mo'),('옛 도덕적 운 A-V2(out-o4-regen)','out-o4-regen/gen32-o4-T4-1-A/leakfix/items-leakfix.json','V2','mo'),
   ('참고 lever2 도덕적 운 A-V2','out-case-lever2/gen32-o4-T4-1-A/leakfix/items-leakfix.json','V2','mo')]),
}
def ptitle(pid): return re.sub(r'\(생성[^)]*\)','',json.load(open(V+f"passages/{pid}/meta.json"))['title']).strip()
def ptext(pid): return open(V+f"passages/{pid}/passage.txt").read().strip()
GT,GP,GB_gongsi,_=gold('x')
PASS={'cy':(ptitle('gen32-T3-2'),ptext('gen32-T3-2')),'mo':(ptitle('gen32-o4-T4-1'),ptext('gen32-o4-T4-1')),'gs':(ptitle('gongsun-long-later-mohists'),ptext('gongsun-long-later-mohists')),'gi':(GT,GP)}
def gold_gongsun():
    t=open(SP+'calib-judge/gongsun-12/BLIND.md',encoding='utf8').read()
    b=re.search(r'\*\*\[문항 1\]\*\*(.*?)\n---',t,re.S).group(1).rstrip()
    return b.lstrip()+'  \n',KEYALL['gongsun-12']['answer']
GB_gs,GA_gs=gold_gongsun()
SEEDS={'r1':20261361,'r2':20261362,'r3':20261363}
for T,B in BUNDLES.items():
    D=HERE+f'/blind-{T}/'; os.makedirs(D,exist_ok=True)
    g=[(lab,render(pick(path,ver)),'①②③④⑤'[pick(path,ver)['answer']-1],path,pk) for lab,path,ver,pk in B['specs']]
    g+=[('자격 기출 공시 12번',GB_gongsi,'⑤','blind/BLIND-cell5.md','gi'),('자격 기출 공손룡 12번',GB_gs,GA_gs,'calib-judge/gongsun-12','gs')]; N=len(g)
    TL=[PASS[k][0] for k in ('cy','mo','gs','gi')]
    for RUN,seed in SEEDS.items():
        items=g
        order=items[:]; random.Random(seed).shuffle(order)
        hdr=f'''# 블라인드 풀이지: 〈보기〉 문항 {N}개 (지문 4개) (2026-11-25, 사례 갈림 사실 순서 보완(pair3) 시험 {T} {RUN})

지문이 네 개({TL[0]} 지문, {TL[1]} 지문, {TL[2]} 지문, {TL[3]} 지문)이고, 〈보기〉 문항이 {N}개 있습니다. 문항마다 어느 지문의 문항인지 적었습니다. 서로 비슷한 문항이 있을 수 있지만 문항마다 따로 판정하세요. 출처는 가렸고 순서는 섞었습니다. 기출 문항이 섞여 있을 수 있습니다. 〈보기〉에 그림은 없고 모두 글입니다.

문항마다 아래를 적어 주세요. 답과 등급을 모두 정한 뒤에 정답표를 여세요.
- 고른 답
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 3점 〈보기〉 문항으로 그대로 낼 수 있는가)
- 한 줄 이유
- 결함 표시(해당하면): ㉮ 〈보기〉가 지문 예시를 이름만 바꿔 옮김 ㉯ 〈보기〉를 안 봐도 풀리는 선지 2개 이상 ㉰ 〈보기〉에 쓰이지 않는 사실이 있음 ㉱ 〈보기〉가 서로 무관한 사건을 나열함 ㉲ 정답이 지문 한 문장으로 바로 정해짐 ㉳ 정답 시비(이의 제기) 위험 ㉴ 학생이 내려야 할 판정(누가 긍정·부정하는지, 어느 쪽과 같은지)까지 〈보기〉가 말함(비판 전제 제시는 제외)
'''
        out=[hdr]+[x for i,k in enumerate(('cy','mo','gs','gi')) for x in (f'\n# 지문 {i+1}: {PASS[k][0]}\n','## 지문\n'+PASS[k][1]+'\n')]+['\n## 문항\n']
        key=[f'# KEY (사례 갈림 사실 순서 보완(pair3) 시험 {T} {RUN}, 2026-11-25)\n','| 문항 | 출처 | 정답 | 지문 | 근거 파일 |','|---|---|---|---|---|']; kj=[]
        for i,(lab,body,a,src,pk) in enumerate(order):
            n=str(i+1); body=re.sub(r'^\s*','',body); t=PASS[pk][0]
            body=re.sub(r'^\*\*\[문항 1\]\*\*\s*','',body)
            out.append(f"**[문항 {n}]** (지문: {t}) {body}\n---\n")
            key.append(f"| {n} | {lab} | {a} | {t} | {src} |"); kj.append({'item':n,'source':lab,'answer':a,'passage':t,'src':src})
        open(D+f'BLIND-{RUN}.md','w',encoding='utf8').write('\n'.join(out)); open(D+f'KEY-{RUN}.md','w',encoding='utf8').write('\n'.join(key)+'\n'); json.dump(kj,open(D+f'KEY-{RUN}.json','w',encoding='utf8'),ensure_ascii=False,indent=1)
        open(D+f'CODEX-PROMPT-{RUN}.md','w',encoding='utf8').write(f'''작업 폴더의 BLIND-{RUN}.md를 풀고 판정해 줘. 지문이 넷이고 〈보기〉 문항이 모두 {N}개야. 문항마다 어느 지문의 문항인지 적혀 있어. 출처는 가렸고 기출이 섞여 있을 수 있어. 〈보기〉에 그림이 있는 문항은 없고 모두 글이야. 이 폴더의 파일 말고 다른 파일은 열지 마. 인터넷·API도 쓰지 마.

1) 문항마다(1~{N}) 직접 풀어서 정해 줘.
- 고른 답(①~⑤)
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 3점 〈보기〉 문항으로 그대로 낼 수 있는가)
- 한 줄 이유(판정을 가른 이유)
- 결함 표시: 풀이지 맨 위 ㉮~㉴ 중 해당하는 것(없으면 빈칸)
- 그래프 한 줄 평(〈보기〉가 그래프인 문항만. 이번에는 그래프 문항이 없으니 모두 빈칸)
서로 비슷한 문항이 있어도 문항마다 따로 판정해.

2) 가장 수능다운 문항과 가장 못한 문항을 하나씩 고르고, 두 문항의 차이를 학생의 풀이 단계(무엇을 읽고 → 지문의 어느 개념에 대응시키고 → 어떤 판단을 스스로 내려야 하는지)로 3~5줄 설명해 줘.

출력: 먼저 1)의 마크다운 표(문항|답|판정|이유|결함|그래프 평), 그 아래 2)의 설명, 마지막에 1)과 같은 내용을 ```json 블록 하나로: [{{"item":"1","answer":"⑤","grade":"수능 같음","reason":"...","defects":["㉴"],"graphNote":"..."}}, ...]. 파일은 쓰지 말고 답으로만 내 줘.
''')
        open(D+f'run_eval_{RUN}.sh','w').write(f'''#!/bin/zsh
# 평가자 4명 병렬. 평가자마다 새 임시 폴더(BLIND-{RUN}.md만). 판정 모델 codex gpt-6.1-sol.
H=$(cd $(dirname $0) && pwd)
for i in ${{=IDX:-1 2 3 4}}; do
  T=$(mktemp -d /tmp/case{T}{RUN}eval$i.XXXX); cp $H/BLIND-{RUN}.md $T/
  (cd $T && codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/CODEX-PROMPT-{RUN}.md > $T/log.txt 2>&1; echo "{T} {RUN} eval$i exit=$?"; cp $T/answer.md $H/REPORT-eval-{RUN}-$i.md) &
done
wait
''')
        os.chmod(D+f'run_eval_{RUN}.sh',0o755); print(T,RUN); print(open(D+f'KEY-{RUN}.md',encoding='utf8').read())
