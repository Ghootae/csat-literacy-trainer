import json,sys,os
HERE=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,HERE)
from common import *
H=HERE+'/inputs/'
R=json.load(open(HERE+'/../match-a/inputs/ref-questions.json'))
P={'PA':('69bc036a8937cf145519091f',11),'PB':('69bc23328937cf1455195b3f',8),'PC':('69bcae308095df3b8c53d9a2',9),'PD':('69bff91378128b2a9bedcdc8',14)}
for k,(sid,n) in P.items():
    stem,ch,a=question(sid,n); p=passage_db(sid)
    R[k]={'sid':sid,'num':n,'stem':stem,'choices':ch,'answer':a}; open(H+f'passage-{k}.txt','w',encoding='utf8').write(p)
    print(k,'지문 글자 수',len(p))
json.dump(R,open(H+'ref-questions.json','w'),ensure_ascii=False,indent=1)
for k,r in R.items(): print(k,r['stem'].replace('\n',' '),'정답',CIRC[r['answer']-1])
for n in ['D-neg','D-pos','H-neg','H-pos']:
    it=json.load(open(HERE+f'/../match-a/gen/{n}/item.json')); print('A-'+n,it['stem'],'정답',CIRC[it['answer']-1])
