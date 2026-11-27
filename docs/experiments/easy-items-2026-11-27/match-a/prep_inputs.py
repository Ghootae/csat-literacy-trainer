import json,sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from common import *
H=os.path.dirname(os.path.abspath(__file__))+'/inputs/'
for k,sid in (('D','69c00a6778128b2a9bedd500'),('H','69bc9e5c76ad66e59a724b37')):
    p=passage_db(sid); open(H+f'passage-{k}.txt','w',encoding='utf8').write(p); print(k,'지문 글자 수',len(p))
K={'KD':('69c00a6778128b2a9bedd500',4),'KH':('69bc9e5c76ad66e59a724b37',10),'KS':('69bc0d528937cf1455192521',4),'KC':('69c0110bfa5063deffe1a632',8)}
out={}
for k,(sid,n) in K.items():
    stem,ch,a=question(sid,n); out[k]={'sid':sid,'num':n,'stem':stem,'choices':ch,'answer':a}
    print(k,stem,'정답',CIRC[a-1])
json.dump(out,open(H+'ref-questions.json','w'),ensure_ascii=False,indent=1)
