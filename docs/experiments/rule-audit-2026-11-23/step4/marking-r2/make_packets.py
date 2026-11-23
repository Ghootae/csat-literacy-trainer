# 4단계 2회차 표시 판정 packet(API 없음). v6.1 4문항, 이름 S01~S04 무작위(seed 고정). 대응표 KEY-r2-marking.json은 판정자에게 주지 않는다.
import json, random, os
HERE=os.path.dirname(os.path.abspath(__file__)); EXP=os.path.abspath(HERE+'/../../..')+'/'; V=EXP+'deep-item-v5-2026-11-18/'; C=EXP+'rule-audit-2026-11-23/step4/confirm/'
src=[('gen','v6.1','공시 A-V1','disclosure-insider',V+'out-step4-v61/disclosure-insider-A/leakfix/items-leakfix.json'),
 ('gen','v6.1','공시 B-V1','disclosure-insider',V+'out-step4-v61/disclosure-insider-B/leakfix/items-leakfix.json'),
 ('gen','v6.1','의미 A-V1','meaning-internalism-externalism',V+'out-step4-v61/meaning-internalism-externalism-A/leakfix/items-leakfix.json'),
 ('gen','v6.1','의미 B-V1','meaning-internalism-externalism',V+'out-step4-v61/meaning-internalism-externalism-B/leakfix/items-leakfix.json')]
rnd=random.Random(20261125); order=list(range(len(src))); rnd.shuffle(order); key={}
for n,i in enumerate(order,1):
    grp,ver,name,pid,path=src[i]; it=json.load(open(path))['items'][0]; pk=f'S{n:02d}'
    pas=open(V+f'passages/{pid}/passage.txt').read().strip()
    open(HERE+f'/packets/{pk}.md','w').write(f"# {pk}\n\n## 지문\n\n{pas}\n\n## 문항\n\n{it['stem']}\n\n〈보기〉\n\n{it['bogi']}\n\n"+'\n'.join(it['choices'])+'\n')
    key[pk]={'group':grp,'version':ver,'name':name,'passage':pid,'official_answer':it['answer'],'kind':it.get('kind'),'path':path.replace(EXP,'')}
json.dump(key,open(HERE+'/KEY-r2-marking.json','w'),ensure_ascii=False,indent=1)
print(len(key),'packets')
