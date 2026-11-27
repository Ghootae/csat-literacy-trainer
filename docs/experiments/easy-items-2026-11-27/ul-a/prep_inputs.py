import json,sys,os
HERE=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,HERE)
from common import *
H=HERE+'/inputs/'
for k,sid in (('S','6a213ea086fd308968e101df'),('I','6a213e9386fd308968e100b3')):
    p=passage_db(sid); open(H+f'passage-{k}.txt','w',encoding='utf8').write(p); print(k,'지문 글자 수',len(p),'㉠' in p,'㉡' in p)
K={'SU':('6a213ea086fd308968e101df',15),'IU':('6a213e9386fd308968e100b3',12),'RS':('69bc0d528937cf1455192521',5),'HY':('69bc9e5c76ad66e59a724b37',11),'PJ':('69bbf8c9a029f488d9e5217f',11),'FL':('69bc9f9a76ad66e59a726757',15),'PL':('69bc1c89a029f488d9e54e5b',9),'PZ':('69bc23328937cf1455195b3f',10)}
out={}
for k,(sid,n) in K.items():
    stem,ch,a=question(sid,n); out[k]={'sid':sid,'num':n,'stem':stem,'choices':ch,'answer':a}
    p=passage_db(sid); open(H+f'passage-{k}.txt','w',encoding='utf8').write(p)
    print(k,len(p),stem.replace('\n',' '),'정답',CIRC[a-1], '㉠' in p, '㉡' in p)
json.dump(out,open(H+'ref-questions.json','w'),ensure_ascii=False,indent=1)
