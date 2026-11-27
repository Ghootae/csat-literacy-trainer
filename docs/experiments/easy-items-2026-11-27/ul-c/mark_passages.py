# 3단계: targets[].text 앞에 ㉠(㉡)을 붙인 지문판. 구절이 여러 번 나오면 첫 번째 등장에 붙인다(지시문에 위치 규정 없음, 가정으로 기록).
import json,os
H=os.path.dirname(os.path.abspath(__file__))
out={}
for k,pos in (('T','T-pos'),('C','C-pos')):
    p=open(H+f'/inputs/passage-{k}.txt',encoding='utf8').read(); tg=json.load(open(H+f'/gen/{pos}/item.json'))['targets']
    info=[]
    for t in tg:
        n=p.count(t['text']); info.append({'mark':t['mark'],'text':t['text'],'count':n})
    # 뒤에서부터 삽입하되 첫 등장 위치 기준
    pos_list=sorted([(p.find(t['text']),t['mark']) for t in tg],reverse=True)
    q=p
    for i,m in pos_list: q=q[:i]+m+q[i:]
    open(H+f'/inputs/{k}-marked.txt','w',encoding='utf8').write(q); out[k]=info; print(k,info)
json.dump(out,open(H+'/target-count.json','w'),ensure_ascii=False,indent=1)
