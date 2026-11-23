# 3단계 확인 재표시(BOGI-SCHEMA-v1) packet 만들기. 실행: python3 docs/experiments/rule-audit-2026-11-23/main-r3/build_packets.py (저장소 루트). API 호출 없음.
# main-r2 packet 26개에 〈보기〉 문장 번호(b1…), cand_bogi(c1…), cand_passage(p1…)를 붙인다. 지문·발문·선지는 그대로.
import re, glob, os, csv
R='docs/experiments/rule-audit-2026-11-23/'
BOGI_MARK=['알아보려','하려고','하려','위하여','위해','려는','때문에','때문이','탓에','그래서','따라서','덕분에']
PASS_MARK=['다만','단,','이때에도','이 경우에도','더라도','라도','경우에는','예외','제외','이상','이하','미만','초과','이내','이전','이후','기간']
def split_sent(t):
    """문장 끝(. ! ? 뒤 공백)에서 나누되 괄호 ( )와 큰따옴표 “ ” 안에서는 나누지 않는다."""
    out=[];cur=[];depth=0;i=0
    while i<len(t):
        ch=t[i]; cur.append(ch)
        if ch in '(“': depth+=1
        elif ch in ')”': depth=max(0,depth-1)
        if ch in '.!?' and depth==0:
            j=i+1
            while j<len(t) and t[j] in '"\'’)]”': cur.append(t[j]); j+=1
            if j>=len(t) or t[j].isspace():
                out.append(''.join(cur).strip()); cur=[]; i=j; continue
            i=j; continue
        i+=1
    if ''.join(cur).strip(): out.append(''.join(cur).strip())
    return out
def units(bogi):
    """〈보기〉를 문장 번호 단위로: 일반 글은 문장, 표는 안내 글 문장 + 표 행 하나, 목록·읽기 판은 줄 하나. 머리줄([...]만 있는 줄)과 표 구분선은 세지 않는다."""
    out=[]
    for ln in bogi.split('\n'):
        s=ln.strip()
        if not s: continue
        if re.match(r'^\|[\s:|-]+\|?$',s): continue            # 표 구분선
        if re.match(r'^\[[^\]]*\]$',s): continue                # 머리줄
        if s.startswith('|') or re.match(r'^(-|\*|•)\s',s) or re.match(r'^[ⓐ-ⓩ㉠-㉯]\s',s): out.append(s); continue
        out.extend(split_sent(s))
    return out
def find_marks(text,marks):
    pat=re.compile('|'.join(re.escape(m) for m in marks))
    return [(m.group(0),m.start()) for m in pat.finditer(text)]
rows=[]
for fn in sorted(glob.glob(R+'step4/marking/packets/S*.md')):
    pid=os.path.basename(fn)[:-3]; t=open(fn).read()
    pas=t.split('## 지문\n',1)[1].split('\n## 문항',1)[0].strip()
    rest=t.split('## 문항\n',1)[1]
    stem,after=rest.strip().split('\n〈보기〉',1)
    mm=re.search(r'\n\s*①',after); bogi=after[:mm.start()].strip(); choices=after[mm.start():].strip()
    us=units(bogi)
    cb=[]
    for i,u in enumerate(us,1):
        for m,pos in find_marks(u,BOGI_MARK): cb.append((i,m,u[max(0,pos-10):pos+len(m)+10]))
    cp=[]
    for para in re.split(r'(?=\[\d+문단\])',pas):
        pm=re.match(r'\[(\d+)문단\]',para)
        if not pm: continue
        body=para[pm.end():].strip()
        for k,s in enumerate(split_sent(body),1):
            ms=find_marks(s,PASS_MARK)
            if ms: cp.append((pm.group(1),k,s,sorted(set(m for m,_ in ms),key=lambda x:[m for m,_ in ms].index(x))))
    L=[f'# {pid}','','## 지문','',pas,'','## 문항','',stem.strip(),'','〈보기〉 (문장 번호 b1, b2, …가 붙어 있다. 표는 안내 글 문장과 표의 행 하나를 한 단위로, 읽기 판은 줄 하나를 한 단위로 센다)','']
    L+= [f'b{i}. {u}' for i,u in enumerate(us,1)]
    L+=['',choices,'','## 스크립트 후보','','### cand_bogi (K1 후보: 〈보기〉에서 찾은 목적·까닭 표지)']
    L+= [f'- c{j}: b{i}, 표지 "{m}", …{ctx}…' for j,(i,m,ctx) in enumerate(cb,1)] or ['- (없음)']
    L+=['','### cand_passage (K4a 후보: 지문에서 찾은 예외·단서·경계 표지)']
    L+= [f'- p{j}: {n}문단 {k}번째 문장, 표지 {", ".join(chr(34)+x+chr(34) for x in ms)}: {s}' for j,(n,k,s,ms) in enumerate(cp,1)] or ['- (없음)']
    open(R+f'step4/marking/packets-v1/{pid}.md','w').write('\n'.join(L)+'\n')
    rows.append((pid,len(us),len(cb),len(cp)))
with open(R+'step4/marking/CANDIDATES.csv','w',newline='') as f:
    w=csv.writer(f); w.writerow(['packet_id','보기_문장수','cand_bogi','cand_passage']); w.writerows(rows)
print(len(rows),'packets'); print('cand_bogi 합',sum(r[2] for r in rows),'cand_passage 합',sum(r[3] for r in rows))
