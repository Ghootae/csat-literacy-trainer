import re,os,json
HERE=os.path.dirname(os.path.abspath(__file__)); V5=HERE+'/../../deep-item-v5-2026-11-18/passages/'
for k,d in (('T','gen31-T1-1'),('C','gen32-T3-2')):
    t=open(V5+d+'/passage.txt',encoding='utf8').read()
    ps=[re.sub(r'^\[\d+문단\]\s*','',p.strip()) for p in t.split('\n') if p.strip()]
    out='\n\n'.join(ps); open(HERE+f'/inputs/passage-{k}.txt','w',encoding='utf8').write(out)
    print(k,d,'글자 수',len(out),'문단 수',len(ps))
R=json.load(open(HERE+'/inputs/ref-questions.json'))
for k,r in R.items(): print(k,r['stem'].replace('\n',' '),'정답',r['answer'])
