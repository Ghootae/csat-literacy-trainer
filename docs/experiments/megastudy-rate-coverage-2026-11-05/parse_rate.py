import re
def parse(f):
    t=re.sub(r'<[^>]+>',' ',open(f).read()).replace('&nbsp;',' ')
    toks=t.split(); rows={}
    i=0
    while i<len(toks)-9:
        if toks[i].isdigit() and len(toks[i+1])==1 and toks[i+1] in '12345' and toks[i+4].endswith('%') and all(toks[i+5+k].endswith('%') for k in range(5)):
            n=int(toks[i])
            if n not in rows: rows[n]={'ans':int(toks[i+1]),'pct':[int(toks[i+5+k][:-1]) for k in range(5)]}
            i+=10
        else: i+=1
    return rows
