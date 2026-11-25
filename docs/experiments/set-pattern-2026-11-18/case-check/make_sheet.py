import re, random, json, os, sys
SP = os.path.abspath('..')
MAP = [("K1","calib-judge/gongsun-12/BLIND.md","1"),("K2","calib-judge/solid-catalyst-10/BLIND.md","1"),("K3","calib-judge/plastic-10/BLIND.md","1"),("K4","calib-judge/infoasym-13/BLIND.md","1"),("K5","calib-judge/laozi-16/BLIND.md","1"),("K6","calib-judge/audio-17/BLIND.md","1")]
def add(prefix, start, f, labels, nums=None):
    nums = nums or [start+i for i in range(len(labels))]
    for n,l in zip(nums,labels): MAP.append((f"G{n}", f, l))
add("G",1,"cell1-v62/blind/BLIND-cell1.md",["바","아","가","나"],[1,2,5,6])
add("G",3,"cell1-v62/r2/blind/BLIND-cell1r2.md",["바","자","나","마"],[3,4,7,8])
add("G",9,"cell3/blind/solid-catalyst/BLIND-r1.md",["3","5","2","1"])
add("G",13,"cell3/blind-r2/solid-catalyst/BLIND-r1.md",["1","5"])
add("G",15,"o4/blind-T4/BLIND-r1.md",["1","3","2","4"])
add("G",19,"o4/blind-T4-regen/BLIND-r1.md",["3","5","2"])
add("G",22,"o4/blind-T5/BLIND-r1.md",["1","2","3","4"])

def parse(path):
    t = open(os.path.join(SP,path),encoding='utf-8').read().split('\n')
    # passages: "# 지문..." heading followed by "## 지문" body until next "## 문항" or "# 지문" or "**[문항"
    passages=[]; items=[]; cur=None; mode=None; curp=None
    buf=[]
    def flush():
        nonlocal buf,mode
        txt='\n'.join(buf).strip()
        if mode=='p' and curp is not None: passages.append((curp,txt))
        elif mode=='i': items.append((cur,curpass,txt))
        buf=[]
    curpass=None
    for ln in t:
        if re.match(r'^# 지문',ln):
            flush(); mode='p'; curp=ln[2:].strip(); curpass=curp; continue
        if re.match(r'^## 지문',ln): continue
        if re.match(r'^## 문항',ln): flush(); mode=None; continue
        m=re.match(r'^\*\*\[문항 ([^\]]+)\]\*\*(.*)',ln)
        if m:
            flush(); mode='i'; cur=m.group(1); buf=[ln]; continue
        if ln.strip()=='---' and mode=='i': flush(); mode=None; continue
        if mode in('p','i'): buf.append(ln)
    flush()
    return passages, items
def build():
    keys=[m[0] for m in MAP]
    rnd=random.Random(20261125); order=keys[:]; rnd.shuffle(order)
    sheets={}
    for key,f,label in MAP:
        ps,its=parse(f)
        hit=[x for x in its if x[0]==label]
        assert len(hit)==1,(key,f,label,[x[0] for x in its])
        lab,pname,txt=hit[0]
        m=re.search(r'\(지문: ([^)]+)\)',txt[:80])
        if len(ps)==1: ptxt=ps[0][1]; pn=ps[0][0]
        elif m:  # v2: 문항에 (지문: …) 표시가 있으면 그것을 우선(v1은 마지막 지문을 붙이는 오류가 있었음: G15~G25)
            c=[p for p in ps if m.group(1) in p[0]]; assert len(c)==1,(key,m.group(1)); ptxt=c[0][1]; pn=c[0][0]
        elif pname: ptxt=[p for p in ps if p[0]==pname][0][1]; pn=pname
        else: raise AssertionError((key,'no passage'))
        txt=re.sub(r'^\*\*\[문항 [^\]]+\]\*\*\s*(\(지문: [^)]+\))?\s*','',txt)
        sheets[key]=f"{pn}\n\n## 지문\n{ptxt}\n\n## 문항\n{txt}\n"
    return order,sheets
if __name__=='__main__':
    order,sheets=build()
    OUTD=os.environ.get('SHEETS','sheets'); os.makedirs(OUTD,exist_ok=True)
    for k,s in sheets.items(): open(f'{OUTD}/{k}.md','w',encoding='utf-8').write(s)
    json.dump(order,open('order.json','w'))
    print(order); 
    for k,s in sheets.items(): print(k,len(s),s.count('①'),s.count('⑤'))
