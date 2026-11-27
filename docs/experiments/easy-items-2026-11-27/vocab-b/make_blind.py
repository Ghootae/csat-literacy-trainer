# 어휘 문항 단독 블라인드 풀이지 (2026-11-28, vocab-a). ul-d/make_blind.py 기반. cells-rejudge/make_blind.py 구조(passage_db·question·폴더·KEY·run_eval.sh), lure-check 의 HDR·CODEX-PROMPT 문안을 고쳐 씀.
# 사용(저장소 루트): python3 docs/experiments/easy-items-2026-11-27/ul-a/make_blind.py
import json, os, re, random, sys
HERE=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,HERE)
from common import passage_db, question, CIRC
def block(stem,ch): return f"**[문항 1]** {stem}\n\n"+'  \n'.join(ch)+'  \n\n---\n'
ITEMS=[]  # (name, group, passage, block, answer)
PD={k:open(HERE+f'/inputs/passage-{k}.txt',encoding='utf8').read() for k in ['SV','NV','RV','MV','JV','BV','GV','HV']}
VA=os.path.abspath(HERE+'/../vocab-a'); assert VA.endswith('easy-items-2026-11-27/vocab-a')
MKB=open(HERE+'/inputs/N-A-marked.txt',encoding='utf8').read(); MKA=open(VA+'/inputs/N-A-marked.txt',encoding='utf8').read()
GEN=os.path.abspath(HERE+'/gen/'); assert GEN.endswith('vocab-b/gen')
def gen_choices(it): return [f"{CIRC[c['n']-1]} {c['text']}" for c in it['choices']]
def check_block(name,blk,src_stem,src_choices):
    got=[l.strip() for l in blk.split('\n') if l.strip() and l.strip()[0] in CIRC]
    if got!=[c.strip() for c in src_choices] or src_stem not in blk: print('STOP: 선지 불일치',name); sys.exit(1)
for name,src,mk in [('B-N-A',GEN+'/N-A/item.json',MKB),('A-N-A',VA+'/gen/N-A/item.json',MKA)]:
    it=json.load(open(src)); blk=block(it['stem'],gen_choices(it)); check_block(name,blk,it['stem'],gen_choices(json.load(open(src))))
    ITEMS.append((name,'생성',mk,blk,CIRC[it['answer']-1],src))
R=json.load(open(HERE+'/inputs/ref-questions.json'))
for k,r in R.items():
    blk=block(r['stem'],r['choices']); check_block(k,blk,r['stem'],r['choices'])
    ITEMS.append((k,'기출',PD[k],blk,CIRC[r['answer']-1],HERE+'/inputs/ref-questions.json'))
assert len(ITEMS)==10
order=list(range(10)); random.seed(20261209); random.shuffle(order)
HDR='''# 블라인드 풀이지: 어휘 문항 1개 (지문 하나)

지문 하나에 문항이 1개 있습니다. 출처는 가렸습니다.

아래를 적어 주세요. 답과 등급을 모두 정한 뒤에 정답표를 여세요.
- 고른 답
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 독서 세트의 마지막 문항(어휘, 2점)으로 그대로 낼 수 있는가)
- 한 줄 이유
- 결함 표시(해당하면): ㉮ 정답이 없거나 둘 이상 ㉯ 맞는 선지에 지문에 없는 내용 ㉰ 틀린 선지의 틀린 곳이 애매함(시비 위험) ㉱ 길이·말투 등 겉모양으로 정답이 보임 ㉲ 선지 낱말의 뜻 구별이 사전 뜻과 어긋나거나, 정답이 둘 이상으로 보임 ㉳ 너무 쉬움(낱말 하나 대조로 모든 선지가 풀림)
'''
PROMPT='''작업 폴더의 BLIND.md를 풀고 판정해 줘. 지문이 하나이고 어휘 문항이 1개야. 출처는 가렸어. 이 폴더의 파일 말고 다른 파일은 열지 마. 인터넷·API도 쓰지 마.

문항(1번)을 직접 풀어서 정해 줘.
- 고른 답(①~⑤)
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 독서 세트의 마지막 문항(어휘, 2점)으로 그대로 낼 수 있는가)
- 한 줄 이유(판정을 가른 이유)
- 결함 표시: 풀이지 맨 위 ㉮~㉳ 중 해당하는 것(없으면 빈칸)

출력: 먼저 마크다운 표(문항|답|판정|이유|결함), 마지막에 같은 내용을 ```json 블록 하나로: [{"item":"1","answer":"⑤","grade":"수능 같음","reason":"...","defects":["㉳"]}]. 파일은 쓰지 말고 답으로만 내 줘.
'''
KEYMD=['# KEY (어휘 문항 시험 생성 vocab-b, 2026-11-28)\n','| 폴더 | 키 | 정답 | 구분 |','|---|---|---|---|']; KEYJ=[]
leak=re.compile('학년도|수능|모의|생성|v1|match|gen|기출')
for pos,idx in enumerate(order,1):
    name,grp,p,b,ans,srcpath=ITEMS[idx]; key=f'M{pos:02d}'
    D=HERE+f'/{key}/'; os.makedirs(D,exist_ok=True)
    body=f'\n# 지문\n\n## 지문\n{p}\n\n## 문항\n{b}'
    hits=leak.findall(body)
    if hits: print('출처 낱말 발견',key,name,set(hits))
    open(D+'BLIND.md','w',encoding='utf8').write(HDR+body)
    open(D+'CODEX-PROMPT.md','w',encoding='utf8').write(PROMPT)
    open(D+'run_eval.sh','w').write(f'''#!/bin/zsh
# 평가자 4명 × 2회차(r1·r2) 병렬. 회차·평가자마다 새 임시 폴더(BLIND.md만). 판정 모델 codex gpt-6.1-sol.
H=$(cd $(dirname $0) && pwd)
for r in 1 2; do for i in 1 2 3 4; do
  T=$(mktemp -d /tmp/match{key}r$r$i.XXXX); cp $H/BLIND.md $T/; :
  (cd $T && codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C $T -o $T/answer.md - < $H/CODEX-PROMPT.md > $T/log.txt 2>&1; echo "{key} r$r-$i exit=$?"; cp $T/answer.md $H/REPORT-eval-r$r-$i.md) &
done; done
wait
''')
    os.chmod(D+'run_eval.sh',0o755)
    KEYJ.append({'folder':key,'key':name,'answer':ans,'kind':grp,'source':os.path.relpath(srcpath)})
    KEYMD.append(f"| {key} | {name} | {ans} | {grp} |")
open(HERE+'/KEY.md','w',encoding='utf8').write('\n'.join(KEYMD)+'\n'); json.dump(KEYJ,open(HERE+'/KEY.json','w'),ensure_ascii=False,indent=1)
print('\n'.join(KEYMD))
