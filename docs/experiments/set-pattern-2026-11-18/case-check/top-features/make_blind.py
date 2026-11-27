# A형 사례 '미끼 가설' 잣대 확인 + decider 빼기 대조 (2026-11-27). make_blind.py(calib-judge)의 passage_db·question·block·HDR·CODEX-PROMPT·run_eval.sh 문안을 복사해 씀.
# 사용(저장소 루트): python3 docs/experiments/set-pattern-2026-11-18/case-check/lure-check/make_blind.py
import json, os, re, random, sys
HERE=os.path.dirname(os.path.abspath(__file__)); SP=os.path.abspath(HERE+'/../..')+'/'
V=os.path.abspath(SP+'../deep-item-v5-2026-11-18')+'/'; DB='/Users/mac/Projects/suneung_db/output/'
CIRC='①②③④⑤'
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
    return '\n\n'.join(out), d['exam']['title'], d
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
    return f"**[문항 1]** {stem}\n\n> 〈보기〉\n>\n{b}\n\n"+'  \n'.join(ch)+'  \n\n---\n'
ITEMS=[]  # (name, group, passage, block, answer, note)
S=[('K06 혈압','69bbf9eea029f488d9e52312',17),('K17 고체 촉매','69c0110bfa5063deffe1a632',10),('K23 소송 비용','69c01daafa5063deffe1b36e',25),('K25 조세','69c01f2c78128b2a9bede9b9',24),('K27 부관','69c0206878128b2a9bedeb39',30),('K28 신뢰보호','69c08c8678128b2a9bededdc',25),('K32 미성년자','69c095ecfa5063deffe1d4cb',24),('K34 과실범','69c099c478128b2a9bee09fa',36),('K35 금리','69c0ad79fa5063deffe1e90b',22),('K38 도파민','69c28579d58cf540a9bc25eb',13),('K43 딱정벌레','6a2294f386fd308968e10e95',19),('K44 무역','6a22950586fd308968e111fa',14)]
for name,sid,num in S:
    stem,bogi,ch,a=question(sid,num); p,t,d=passage_db(sid)
    note=''
    if any(e.get('kind')=='figure' or 'image' in str(e.get('kind')) for e in d['elements']): note='지문 그림 있음'
    ITEMS.append((name,'기출',p,block(stem,bogi,ch),CIRC[a-1],note))
assert len(ITEMS)==12
order=list(range(12)); random.seed(20261130); random.shuffle(order)
HDR='''# 블라인드 풀이지: 〈보기〉 문항 1개 (지문 하나) (2026-11-27)

지문 하나에 〈보기〉 문항이 1개 있습니다. 출처는 가렸습니다. 〈보기〉에 그림은 없고 글만 있습니다.

아래를 적어 주세요. 답과 등급을 모두 정한 뒤에 정답표를 여세요.
- 고른 답
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 3점 〈보기〉 문항으로 그대로 낼 수 있는가)
- 한 줄 이유
- 결함 표시(해당하면): ㉮ 〈보기〉가 지문 예시를 이름만 바꿔 옮김 ㉯ 〈보기〉를 안 봐도 풀리는 선지 2개 이상 ㉰ 〈보기〉에 쓰이지 않는 사실이 있음 ㉱ 〈보기〉가 서로 무관한 사건을 나열함 ㉲ 정답이 지문 한 문장으로 바로 정해짐 ㉳ 정답 시비(이의 제기) 위험 ㉴ 학생이 내려야 할 판정(누가 긍정·부정하는지, 어느 쪽과 같은지)까지 〈보기〉가 말함(비판 전제 제시는 제외)
'''
KEYMD=['# KEY (기출 A형 상위 특성 확인, 2026-11-27)\n','| 폴더 | 키 | 정답 | 구분 | 비고 |','|---|---|---|---|---|']; KEYJ=[]
for pos,idx in enumerate(order,1):
    name,grp,p,b,ans,note=ITEMS[idx]; key=f'S{pos:02d}'
    D=HERE+f'/{key}/'; os.makedirs(D,exist_ok=True)
    open(D+'BLIND.md','w',encoding='utf8').write(HDR+f'\n# 지문\n\n## 지문\n{p}\n\n## 문항\n{b}')
    open(D+'CODEX-PROMPT.md','w',encoding='utf8').write('''작업 폴더의 BLIND.md를 풀고 판정해 줘. 지문이 하나이고 〈보기〉 문항이 1개야. 출처는 가렸어. 〈보기〉에 그림은 없고 글만 있어. 이 폴더의 파일 말고 다른 파일은 열지 마. 인터넷·API도 쓰지 마.

문항(1번)을 직접 풀어서 정해 줘.
- 고른 답(①~⑤)
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 3점 〈보기〉 문항으로 그대로 낼 수 있는가)
- 한 줄 이유(판정을 가른 이유)
- 결함 표시: 풀이지 맨 위 ㉮~㉴ 중 해당하는 것(없으면 빈칸)
- 그래프 한 줄 평(〈보기〉가 그림·그래프·표 이미지를 포함할 때만: 그림·읽기 판이 수능 〈보기〉로 읽히는지, 어색하거나 읽기 어려운 부분. 그림이 없으면 빈칸)

출력: 먼저 마크다운 표(문항|답|판정|이유|결함|그래프 평), 마지막에 같은 내용을 ```json 블록 하나로: [{"item":"1","answer":"⑤","grade":"수능 같음","reason":"...","defects":["㉴"],"graphNote":"..."}]. 파일은 쓰지 말고 답으로만 내 줘.
''')
    open(D+'run_eval.sh','w').write(f'''#!/bin/zsh
# 평가자 4명 × 2회차(r1·r2) 병렬. 회차·평가자마다 새 임시 폴더(BLIND.md만). 판정 모델 codex gpt-6.1-sol.
H=$(cd $(dirname $0) && pwd)
for r in 1 2; do for i in 1 2 3 4; do
  T=$(mktemp -d /tmp/lure{key}r$r$i.XXXX); cp $H/BLIND.md $T/; :
  (cd $T && codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/CODEX-PROMPT.md > $T/log.txt 2>&1; echo "{key} r$r-$i exit=$?"; cp $T/answer.md $H/REPORT-eval-r$r-$i.md) &
done; done
wait
''')
    os.chmod(D+'run_eval.sh',0o755)
    KEYJ.append({'folder':key,'key':name,'answer':ans,'group':grp,'note':note,'chars':len(open(D+'BLIND.md',encoding='utf8').read())})
    KEYMD.append(f"| {key} | {name} | {ans} | {grp} | {note} |")
open(HERE+'/KEY.md','w',encoding='utf8').write('\n'.join(KEYMD)+'\n'); json.dump(KEYJ,open(HERE+'/KEY.json','w'),ensure_ascii=False,indent=1)
print('\n'.join(KEYMD)); print({k['folder']:k['chars'] for k in KEYJ})
