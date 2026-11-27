# 표시판 지문: plain 지문의 targets[].text 안 word 앞에 mark 를 붙임(기출처럼 "ⓐ구성하는"). 한 번만 나오는 구절·word 가 구절 안에 있음을 확인.
import json,os
H=os.path.dirname(os.path.abspath(__file__))
for n in ['T-B','T-A','C-A','C-B']:
    it=json.load(open(H+f'/gen/{n}/item.json')); p=open(H+f"/inputs/{it['request']['passage']}-plain.txt",encoding='utf8').read()
    pos=[]
    for t in it['targets']:
        assert p.count(t['text'])==1 and t['word'] in t['text'],(n,t)
        pos.append((p.find(t['text'])+t['text'].find(t['word']),t['mark']))
    for i,m in sorted(pos,reverse=True): p=p[:i]+m+p[i:]
    open(H+f'/inputs/{n}-marked.txt','w',encoding='utf8').write(p); print(n,'표시',len(pos),'개')
