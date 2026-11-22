# 2회차 묶음 만들기(시범 11 = 1회차 packet 재사용, P01만 보충 + 대조 9). 실행: python3 pilot-r2/build_packets.py (저장소 루트에서). API 호출 없음.
import json, os, re, random, glob, collections
R='docs/experiments/'; P1=R+'rule-audit-2026-11-23/pilot-r1/'; P2=R+'rule-audit-2026-11-23/pilot-r2/'
BT=R+'bogi-distractor-tagging-2026-11-22/'; V5=R+'deep-item-v5-2026-11-18/'
def parse_blind(fn,jino,letter):
    t=open(V5+'blind/'+fn).read()
    blocks=re.split(r'^# 지문 ',t,flags=re.M)[1:]
    b=blocks[int(jino)-1]  # 평가 보고서의 '지문 N'은 풀이지 안의 순서(제목 번호와 다를 수 있음)
    pas=b.split('## 지문\n',1)[1].split('\n## 문항',1)[0].strip()
    qs=b.split('## 문항\n',1)[1]
    m=re.search(r'\*\*\[문항 '+letter+r'\]\*\*(.*?)(?=\n\*\*\[문항 |\Z)',qs,re.S); body=m.group(1).strip()
    stem=[];bogi=[];ch=[]
    for ln in body.split('\n'):
        s=ln.rstrip()
        if re.match(r'^[①-⑤] ',s): ch.append(s.strip())
        elif s.startswith('>'): bogi.append(s[1:].strip())
        elif s.strip(): stem.append(s.strip())
    return pas,stem,bogi,ch
def clean_bogi(lines):
    out=[]
    for l in lines:
        if l.startswith('〈보기〉'): continue
        if re.match(r'^\(그림: .*\)$',l): continue
        out.append(l.replace('[그래프 읽기 판]','[그래프 설명(글)]'))
    while out and not out[0]: out.pop(0)
    while out and not out[-1]: out.pop()
    return '\n'.join(out)
def packet_text(pid,p): return f"# {pid}\n\n## 지문\n\n{p['passage']}\n\n## 문항\n\n{p['stem']}\n\n〈보기〉\n\n{p['bogi']}\n\n"+'\n'.join(p['choices'])+'\n'
ITEMS=[]  # (label, role, key, source, kind, answer, reason dict, loader)
def gen(fn,jino,letter): 
    pas,stem,bogi,ch=parse_blind(fn,jino,letter)
    return dict(passage=pas,stem=' '.join(stem),bogi=clean_bogi(bogi),choices=ch)
extra=[
 ('문제','생성-의미 B V2 수리 전(out-view-hs)','생성','관점',4,('BLIND-repair-view.md','2','다'),'repair-view','2','다','수리 방향 집계 2단계 #17 수리 전'),
 ('문제','생성-공시 B V1 수리 전(out-case-hs)','생성','사례',1,('BLIND-repair-case.md','1','사'),'repair-case','1','사','수리 방향 집계 2단계 #2 수리 전'),
 ('문제','생성-mRNA r3 B-V1 최종(out-graph-r3)','생성','자료',3,('BLIND-graph-r3.md','2','가'),'graph-r3','2','가','그래프 칸 r3 블라인드'),
 ('문제','생성-공손룡 B V1 수리 전(out-case-hs)','생성','사례',4,('BLIND-repair-case.md','2','바'),'repair-case','2','바','수리 방향 집계 2단계 #8 수리 전'),
 ('문제','생성-정보 B V1 수리 전(out-view-hs)','생성','관점',2,('BLIND-repair-view.md','1','파'),'repair-view','1','파','수리 방향 집계 2단계 #11 수리 전'),
 ('비교','생성-청약 A-V2 수리 전(out-cell5)','생성','사례',2,('BLIND-cell5.md','2','카'),'cell5','2','카','수리 방향 집계 2단계 C3 수리 전'),
 ('비교','생성-의미 A V2 수리 전(out-view-hs)','생성','관점',1,('BLIND-repair-view.md','2','바'),'repair-view','2','바','수리 방향 집계 2단계 #16 수리 전'),
 ('비교','생성-의미 A V1 수리 전(out-view-hs2)','생성','관점',5,('BLIND-repair-view.md','2','나'),'repair-view','2','나','수리 방향 집계 2단계 #18 수리 전'),
]
packets={}; meta={}
r1=json.load(open(P1+'KEY-pilot-r1.json'))
for pid,k in r1.items():
    txt=open(P1+f'packets/{pid}.md').read()
    if pid=='P01':
        old='㉠ 공통 송신 주파수와 ㉡ A의 수신 주파수는 가로축 60°와 ⓒ 사이에서 만남(접함).'
        assert old in txt
        txt=txt.replace(old,old+'\n곡선 위 표시와 가로축 눈금의 위치: ⓐ는 45° 눈금 위, ⓑ는 60° 눈금 위, ⓓ와 ⓔ는 140° 눈금 위에 있다. ⓒ는 눈금 값이 적히지 않은 위치(ⓑ와 ⓓ 사이)에 있다.')
    packets[f'r1-{pid}']=txt; meta[f'r1-{pid}']=dict(group='시범',r1_packet=pid,**{x:k[x] for x in ('cell','key','source','kind','direction','official_answer')},reason='시범 1회차 문항 그대로'+(' (P01만 〈보기〉 글 설명에 점 위치 보충)' if pid=='P01' else ''))
# 기출 bt-6a213e8b
it=json.load(open(BT+'items/bt-6a213e8b.json'))['items'][0]
pas=open(V5+'passages/bt-6a213e8b/passage.txt').read().strip()
packets['x-6a213e8b']=packet_text('Q',dict(passage=pas,stem=it['stem'],bogi=it['bogi'],choices=it['choices']))
meta['x-6a213e8b']=dict(group='기출 대조',cell='관점',key='2026-06-평가원-8',source='기출',kind='관점',direction='A' if '적절하지 않은' in it['stem'] else 'B',official_answer=it['answer'],reason='정답 유일성 시비 1건(검사 모델 답이 출제 정답과 다름). 출처 rule-strategy-2026-11-22/NOTE-web-findings-2026-11-22.md')
# 평가 원문에서 등급·지적 모으기
def evalrows(prefix):
    res=[]
    for fn in sorted(glob.glob(V5+f'blind/REPORT-{prefix}-eval*.md')):
        d={}
        for l in open(fn):
            m=re.match(r'\|\s*(\d)\s*\|\s*(\S+)\s*\|\s*(\S+)\s*\|\s*(수능 같음|중|수능 아님)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|',l)
            if m: d[(m.group(1),m.group(2))]=(m.group(4),m.group(5),m.group(6).strip())
        res.append((os.path.basename(fn),d))
    return res
for i,(role,label,src,kind,ans,(fn,jino,letter),rep,rj,rl,origin) in enumerate(extra):
    d=gen(fn,jino,letter); name=f'x-{i}'
    packets[name]=packet_text('Q',d)
    grades=[];reasons=[]
    for efn,dd in evalrows(rep):
        if (rj,rl) in dd: g,why,flaw=dd[(rj,rl)]; grades.append(g); reasons.append((efn,g,why,flaw))
    score={'수능 같음':2,'중':1,'수능 아님':0}
    avg=sum(score[g] for g in grades)/len(grades) if grades else None
    # 고른 이유 한 줄: 문제 = 수능 아님 또는 결함 표시가 있는 평가의 원문 첫 건, 비교 = 넷 다 수능 같음
    pick=next((r for r in reasons if r[1]=='수능 아님'),None) or next((r for r in reasons if r[3]),None) or (reasons[0] if reasons else None)
    stemtxt=d['stem']
    meta[name]=dict(group=role,cell=kind,key=label,source=src,kind=kind,direction='A' if '적절하지 않은' in stemtxt else 'B',official_answer=ans,
        grades=grades,avg_grade=avg,origin=origin,
        reason=f"{origin}. 코덱스 평가 4회 등급 {'·'.join(grades)}(평균 {avg}). 원문: 「{pick[2]}」(결함 {pick[3] or '없음'}) — blind/{pick[0]}" if pick else origin)
# 섞기
names=list(packets); random.Random(20261123002).shuffle(names)
os.makedirs(P2+'packets',exist_ok=True); key={}
for i,nm in enumerate(names,1):
    q=f'Q{i:02d}'; open(P2+f'packets/{q}.md','w').write(packets[nm].replace('# Q\n',f'# {q}\n',1).replace(re.match(r'# (P\d\d)',packets[nm]).group(0),f'# {q}',1) if packets[nm].startswith('# P') else packets[nm].replace('# Q\n',f'# {q}\n',1))
    key[q]=meta[nm]
json.dump(key,open(P2+'KEY-r2.json','w'),ensure_ascii=False,indent=1)
for q,k in key.items(): print(q,k['group'],k['key'],k['direction'],k['official_answer'],k.get('avg_grade'))
