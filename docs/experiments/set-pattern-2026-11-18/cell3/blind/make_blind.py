# 순서표 ③-1 칸 블라인드 풀이지·KEY·CODEX-PROMPT 생성 (2026-11-24). cell2/blind/make_blind.py와 같은 틀. 지문마다 따로.
# 사용(저장소 루트): python3 docs/experiments/set-pattern-2026-11-18/cell3/blind/make_blind.py <solid-catalyst|auxin-growth> <r1|r2>
# 지문마다 5문항 = A-V1, A-V2, B-V1, B-V2(최종본) + 기출 1문항. 순서는 회차별 seed(r1 20261201, r2 20261202)로 무작위, 출처 표시 없음.
# 그래프 문항은 PNG(img/pic-<번호>.png)와 읽기 판을 함께, 기출 그래프는 원본 이미지 + gold spec으로 render.mjs가 만든 같은 방식의 읽기 판.
import json, random, os, shutil, sys, subprocess
HERE=os.path.dirname(os.path.abspath(__file__)); V=os.path.abspath(HERE+'/../../../deep-item-v5-2026-11-18')+'/'; CELL=os.path.abspath(HERE+'/..')+'/'
PID,RUN=sys.argv[1],sys.argv[2]; SEED={'r1':20261201,'r2':20261202}[RUN]
D=HERE+f'/{PID}/'; os.makedirs(D+f'img-{RUN}',exist_ok=True)
GOLD={'solid-catalyst':('calib-gold/solid-catalyst-10.json','기출 10번 (solid-catalyst-10)'),'auxin-growth':('calib-gold/auxin-17.json','기출 17번 (auxin-17)')}[PID]
KINDS={'solid-catalyst':('사례','사례'),'auxin-growth':('그래프','표')}[PID]   # V1, V2 갈래 이름
TITLE=json.load(open(V+f'passages/{PID}/meta.json'))['title']
def load(p,ver): return [x for x in json.load(open(V+p))['items'] if x['version']==ver][0]
def final(base,m):
    d=f'{base}/{PID}-{m}/'; lf=V+d+'leakfix/items-leakfix.json'
    return d+'leakfix/items-leakfix.json' if os.path.exists(lf) else d+'repair/items-final.json'
BASE={(m,v):'out-cell3-v62' for m in 'AB' for v in ('V1','V2')}
if os.path.exists(CELL+'regen.json'): BASE.update({tuple(k.split('|')):v for k,v in json.load(open(CELL+'regen.json')).items() if k.split('|')[0]!=''}) 
def gen(m,ver):
    it=load(final(BASE[(m,ver)],m),ver); img=None
    if it['kind']=='graph': img=CELL+f'graph-png/{m}-{ver}.png'
    return it,img
def goldfn():
    g=load(GOLD[0],'V1')
    if PID=='solid-catalyst': return g,None
    intro=g['bogi'].split(' (그래프)')[0]
    txt=subprocess.run(['node',CELL+'gold_text.mjs',D+'gold-auxin-17.spec.json'],capture_output=True,text=True,check=True).stdout.strip()
    return dict(g,stem=intro+'\n\n'+g['stem'],bogi=txt),CELL+'blind/img/gold-auxin-17.png'
def lab(m,v): return f"{KINDS[0] if v=='V1' else KINDS[1]} {m}-{v} (out-cell3-v62)"
ITEMS=[(lab(m,v),(lambda m=m,v=v:gen(m,v))) for m in 'AB' for v in ('V1','V2')]+[(GOLD[1],goldfn)]
rnd=random.Random(SEED); order=ITEMS[:]; rnd.shuffle(order)
hdr=f'''# 블라인드 풀이지: 〈보기〉 문항 5개 (과학 {PID}) (2026-11-24, 순서표 ③-1 {RUN})

지문 하나에 〈보기〉 문항이 5개 있습니다. 서로 비슷한 문항이 있을 수 있지만 문항마다 따로 판정하세요. 출처는 가렸고 순서는 섞었습니다. 기출 문항이 섞여 있을 수 있습니다. 〈보기〉가 그래프인 문항은 그림을 PNG로 첨부했고(파일 이름 = pic-문항.png, 예: pic-1.png), 같은 그림을 글로 옮긴 "그래프 읽기 판"을 문항에 함께 적었습니다. 그림이 없는 〈보기〉(표 또는 글)는 글만 있습니다.

문항마다 아래를 적어 주세요. 답과 등급을 모두 정한 뒤에 정답표를 여세요.
- 고른 답
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 3점 〈보기〉 문항으로 그대로 낼 수 있는가)
- 한 줄 이유
- 결함 표시(해당하면): ㉮ 〈보기〉가 지문 예시를 이름만 바꿔 옮김 ㉯ 〈보기〉를 안 봐도 풀리는 선지 2개 이상 ㉰ 〈보기〉에 쓰이지 않는 사실이 있음 ㉱ 〈보기〉가 서로 무관한 사건을 나열함 ㉲ 정답이 지문 한 문장으로 바로 정해짐 ㉳ 정답 시비(이의 제기) 위험 ㉴ 학생이 내려야 할 판정(누가 긍정·부정하는지, 어느 쪽과 같은지)까지 〈보기〉가 말함(비판 전제 제시는 제외)
'''
out=[hdr,f'\n# 지문: {TITLE}\n','## 지문\n'+open(V+f'passages/{PID}/passage.txt').read().strip()+'\n\n## 문항\n']
key=[f'# KEY (순서표 ③-1 {PID} {RUN}, 2026-11-24)\n','| 문항 | 출처 | 정답 | 그림 |','|---|---|---|---|']; kj=[]; pics=[]
for i,(src,fn) in enumerate(order):
    it,img=fn(); n=str(i+1)
    bogi='\n'.join('> '+l if l.strip() else '>' for l in it['bogi'].split('\n')); pic=''
    if img: shutil.copy(img,D+f'img-{RUN}/pic-{n}.png'); pics.append(f'pic-{n}.png'); pic=f'> (그림: pic-{n}.png)\n>\n'
    out.append(f"**[문항 {n}]** {it['stem']}\n\n> 〈보기〉\n>\n{pic}{bogi}\n\n"+'  \n'.join(it['choices'])+'  \n\n---\n')
    a='①②③④⑤'[it['answer']-1]; key.append(f"| {n} | {src} | {a} | {'있음' if img else '없음'} |")
    kj.append({'item':n,'pid':PID,'source':src,'answer':a,'stem':it['stem'],'hasImage':bool(img)})
open(D+f'BLIND-{RUN}.md','w').write('\n'.join(out)); open(D+f'KEY-{RUN}.md','w').write('\n'.join(key)+'\n'); json.dump(kj,open(D+f'KEY-{RUN}.json','w'),ensure_ascii=False,indent=1)
picn=(f"〈보기〉가 그래프인 문항의 그림은 첨부한 PNG들이고({', '.join(sorted(pics))}), 문항에는 같은 그림을 글로 옮긴 그래프 읽기 판도 적혀 있어. 그림과 읽기 판을 같이 보고 풀어. 표·글 〈보기〉 문항은 그림 없이 글만 있어. " if pics else '〈보기〉에 그림이 있는 문항은 없고 모두 글이야. ')
open(D+f'CODEX-PROMPT-{RUN}.md','w').write(f'''작업 폴더의 BLIND-{RUN}.md를 풀고 판정해 줘. 지문이 하나이고 〈보기〉 문항이 모두 5개야. 출처는 가렸고 기출이 섞여 있을 수 있어. {picn}이 폴더의 파일 말고 다른 파일은 열지 마. 인터넷·API도 쓰지 마.

1) 문항마다(1~5) 직접 풀어서 정해 줘.
- 고른 답(①~⑤)
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 3점 〈보기〉 문항으로 그대로 낼 수 있는가)
- 한 줄 이유(판정을 가른 이유)
- 결함 표시: 풀이지 맨 위 ㉮~㉴ 중 해당하는 것(없으면 빈칸)
- 그래프 한 줄 평(〈보기〉가 그래프인 문항만: 그림·읽기 판이 수능 〈보기〉 그래프로 읽히는지, 어색하거나 읽기 어려운 부분. 그래프가 아닌 문항은 빈칸)
서로 비슷한 문항이 있어도 문항마다 따로 판정해.

2) 가장 수능다운 문항과 가장 못한 문항을 하나씩 고르고, 두 문항의 차이를 학생의 풀이 단계(무엇을 읽고 → 지문의 어느 개념에 대응시키고 → 어떤 판단을 스스로 내려야 하는지)로 3~5줄 설명해 줘.

출력: 먼저 1)의 마크다운 표(문항|답|판정|이유|결함|그래프 평), 그 아래 2)의 설명, 마지막에 1)과 같은 내용을 ```json 블록 하나로: [{{"item":"1","answer":"⑤","grade":"수능 같음","reason":"...","defects":["㉴"],"graphNote":"..."}}, ...]. 파일은 쓰지 말고 답으로만 내 줘.
''')
open(D+f'run_eval_{RUN}.sh','w').write(f'''#!/bin/zsh
# 평가자 4명 병렬. 평가자마다 새 임시 폴더(BLIND-{RUN}.md + pic-*.png만). 판정 모델 codex gpt-6.1-sol. cell2 run_eval.sh와 같은 명령.
H=$(cd $(dirname $0) && pwd)
for i in 1 2 3 4; do
  T=$(mktemp -d /tmp/cell3{PID[:4]}{RUN}eval$i.XXXX); cp $H/BLIND-{RUN}.md $T/; {'cp $H/img-'+RUN+'/pic-*.png $T/' if pics else ':'}
  (cd $T && codex exec {'-i pic-*.png ' if pics else ''}-m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/CODEX-PROMPT-{RUN}.md > $T/log.txt 2>&1; echo "eval$i exit=$?"; cp $T/answer.md $H/REPORT-eval-{RUN}-$i.md) &
done
wait
''')
os.chmod(D+f'run_eval_{RUN}.sh',0o755)
print(open(D+f'KEY-{RUN}.md').read())
