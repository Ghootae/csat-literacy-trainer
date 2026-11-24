# 순서표 ③-d 블라인드 풀이지·KEY·CODEX-PROMPT 생성 (2026-11-25). cell3/blind/make_blind.py와 같은 틀.
# 사용(저장소 루트): python3 docs/experiments/set-pattern-2026-11-18/cell3/blind-r2/make_blind.py <r1|r2>
# 5문항 = 사례 A-V1·A-V2(out-cell3-v62 최종본, 그대로) + 새 B-V1·B-V2(out-cell3-v62-regen 최종본) + 자격 기출 플라스틱 10번(calib-judge/plastic-10 가공 그대로).
# 지문 둘(고체 촉매, 플라스틱), 문항마다 지문 표시. 순서는 회차별 seed(r1 20261211, r2 20261212)로 무작위, 출처 표시 없음.
import json, random, os, re, sys
HERE=os.path.dirname(os.path.abspath(__file__)); SP=os.path.abspath(HERE+'/../..')+'/'; V=os.path.abspath(SP+'../deep-item-v5-2026-11-18')+'/'
RUN=sys.argv[1]; SEED={'r1':20261211,'r2':20261212}[RUN]; PID='solid-catalyst'
D=HERE+f'/{PID}/'; os.makedirs(D,exist_ok=True)
T1=json.load(open(V+f'passages/{PID}/meta.json'))['title']; P1=open(V+f'passages/{PID}/passage.txt').read().strip()
pb=open(SP+'calib-judge/plastic-10/BLIND.md',encoding='utf8').read()
T2=re.search(r'# 지문: (.*)',pb).group(1).strip(); P2=re.search(r'## 지문\n(.*?)\n\n## 문항',pb,re.S).group(1).strip()
PB=re.search(r'\*\*\[문항 1\]\*\*(.*?)\n---',pb,re.S).group(1).rstrip()
PL_ANS=[k for k in json.load(open(SP+'calib-judge/KEY.json')) if k['key']=='plastic-10'][0]['answer']
def final(base,m):
    d=f'{base}/{PID}-{m}/'; lf=V+d+'leakfix/items-leakfix.json'
    return d+'leakfix/items-leakfix.json' if os.path.exists(lf) else d+'repair/items-final.json'
def gen(m,ver):
    base='out-cell3-v62' if m=='A' else 'out-cell3-v62-regen'
    it=[x for x in json.load(open(V+final(base,m)))['items'] if x['version']==ver][0]
    bogi='\n'.join('> '+l if l.strip() else '>' for l in it['bogi'].split('\n'))
    return f"{it['stem']}\n\n> 〈보기〉\n>\n{bogi}\n\n"+'  \n'.join(it['choices'])+'  \n', '①②③④⑤'[it['answer']-1], T1
ITEMS=[(f"사례 {m}-{v} ({'out-cell3-v62' if m=='A' else 'out-cell3-v62-regen'})",(lambda m=m,v=v:gen(m,v))) for m in 'AB' for v in ('V1','V2')]
ITEMS.append(('기출 플라스틱 10번',lambda:(PB.lstrip()+'  \n',PL_ANS,T2)))
rnd=random.Random(SEED); order=ITEMS[:]; rnd.shuffle(order)
hdr=f'''# 블라인드 풀이지: 〈보기〉 문항 5개 (지문 2개) (2026-11-25, 순서표 ③-d {RUN})

지문이 두 개(고체 촉매 지문, 플라스틱 지문)이고, 〈보기〉 문항이 5개 있습니다. 문항마다 어느 지문의 문항인지 적었습니다. 서로 비슷한 문항이 있을 수 있지만 문항마다 따로 판정하세요. 출처는 가렸고 순서는 섞었습니다. 기출 문항이 섞여 있을 수 있습니다. 〈보기〉에 그림은 없고 모두 글입니다.

문항마다 아래를 적어 주세요. 답과 등급을 모두 정한 뒤에 정답표를 여세요.
- 고른 답
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 3점 〈보기〉 문항으로 그대로 낼 수 있는가)
- 한 줄 이유
- 결함 표시(해당하면): ㉮ 〈보기〉가 지문 예시를 이름만 바꿔 옮김 ㉯ 〈보기〉를 안 봐도 풀리는 선지 2개 이상 ㉰ 〈보기〉에 쓰이지 않는 사실이 있음 ㉱ 〈보기〉가 서로 무관한 사건을 나열함 ㉲ 정답이 지문 한 문장으로 바로 정해짐 ㉳ 정답 시비(이의 제기) 위험 ㉴ 학생이 내려야 할 판정(누가 긍정·부정하는지, 어느 쪽과 같은지)까지 〈보기〉가 말함(비판 전제 제시는 제외)
'''
out=[hdr,f'\n# 지문 1: {T1}\n','## 지문\n'+P1+'\n',f'\n# 지문 2: {T2}\n','## 지문\n'+P2+'\n','\n## 문항\n']
key=[f'# KEY (순서표 ③-d {RUN}, 2026-11-25)\n','| 문항 | 출처 | 정답 | 지문 |','|---|---|---|---|']; kj=[]
for i,(src,fn) in enumerate(order):
    body,a,t=fn(); n=str(i+1)
    body=re.sub(r'^\s*','',body)
    out.append(f"**[문항 {n}]** (지문: {t}) {body}\n---\n")
    key.append(f"| {n} | {src} | {a} | {t} |"); kj.append({'item':n,'pid':PID,'source':src,'answer':a,'passage':t})
open(D+f'BLIND-{RUN}.md','w').write('\n'.join(out)); open(D+f'KEY-{RUN}.md','w').write('\n'.join(key)+'\n'); json.dump(kj,open(D+f'KEY-{RUN}.json','w'),ensure_ascii=False,indent=1)
open(D+f'CODEX-PROMPT-{RUN}.md','w').write(f'''작업 폴더의 BLIND-{RUN}.md를 풀고 판정해 줘. 지문이 둘이고 〈보기〉 문항이 모두 5개야. 문항마다 어느 지문의 문항인지 적혀 있어. 출처는 가렸고 기출이 섞여 있을 수 있어. 〈보기〉에 그림이 있는 문항은 없고 모두 글이야. 이 폴더의 파일 말고 다른 파일은 열지 마. 인터넷·API도 쓰지 마.

1) 문항마다(1~5) 직접 풀어서 정해 줘.
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
# 평가자 4명 병렬. 평가자마다 새 임시 폴더(BLIND-{RUN}.md만). 판정 모델 codex gpt-6.1-sol. cell3 run_eval_r1.sh와 같은 명령.
H=$(cd $(dirname $0) && pwd)
for i in 1 2 3 4; do
  T=$(mktemp -d /tmp/cell3d{RUN}eval$i.XXXX); cp $H/BLIND-{RUN}.md $T/
  (cd $T && codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/CODEX-PROMPT-{RUN}.md > $T/log.txt 2>&1; echo "eval$i exit=$?"; cp $T/answer.md $H/REPORT-eval-{RUN}-$i.md) &
done
wait
''')
os.chmod(D+f'run_eval_{RUN}.sh',0o755)
print(open(D+f'KEY-{RUN}.md').read())
