# 3단계: C 지문 targets 앞에 ㉠·㉡. 구절이 한 번씩만 나오므로 위치가 하나로 정해진다. T-marked.txt 는 ul-c 것을 그대로 쓴다.
import json,os
H=os.path.dirname(os.path.abspath(__file__))
p=open(H+'/inputs/passage-C.txt',encoding='utf8').read(); tg=json.load(open(H+'/gen/C-pos/item.json'))['targets']
assert all(p.count(t['text'])==1 for t in tg)
for i,m in sorted([(p.find(t['text']),t['mark']) for t in tg],reverse=True): p=p[:i]+m+p[i:]
open(H+'/inputs/C-marked.txt','w',encoding='utf8').write(p); print('C-marked 저장')
json.dump({'C':[{'mark':t['mark'],'text':t['text'],'count':open(H+'/inputs/passage-C.txt',encoding='utf8').read().count(t['text'])} for t in tg]},open(H+'/target-count.json','w'),ensure_ascii=False,indent=1)
