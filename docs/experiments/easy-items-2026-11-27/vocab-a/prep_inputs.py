import json,sys,os
HERE=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,HERE)
from common import *
H=HERE+'/inputs/'
for k,sid in (('S','6a213ea086fd308968e101df'),('N','6a213e8b86fd308968e0fef6')):
    p=passage_db(sid); q=p
    for c in 'ⓐⓑⓒⓓⓔ': q=q.replace(c,'')
    open(H+f'{k}-plain.txt','w',encoding='utf8').write(q); print(k,'지문 글자 수',len(p),'지운 개수',len(p)-len(q),{c:p.count(c) for c in 'ⓐⓑⓒⓓⓔ'})
K={'SV':('6a213ea086fd308968e101df',17),'NV':('6a213e8b86fd308968e0fef6',9),'RV':('69bc0d528937cf1455192521',7),'MV':('69bca7828095df3b8c5354a6',9),'JV':('69c007c078128b2a9bedd3c7',17),'BV':('69bbef9a8937cf145518cb13',9),'GV':('69bbf8c9a029f488d9e5217f',13),'HV':('69bc9e5c76ad66e59a724b37',13)}
out={}
for k,(sid,n) in K.items():
    stem,ch,a=question(sid,n); out[k]={'sid':sid,'num':n,'stem':stem,'choices':ch,'answer':a}
    p=passage_db(sid); open(H+f'passage-{k}.txt','w',encoding='utf8').write(p)
    print(k,len(p),stem.replace('\n',' '),'정답',CIRC[a-1])
json.dump(out,open(H+'ref-questions.json','w'),ensure_ascii=False,indent=1)
