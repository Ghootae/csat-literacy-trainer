# 4단계 표시 판정 packet 만들기(API 없음). 생성 8 + 확인용 7 = 15문항, 이름 S01~S15 무작위(seed 고정). 대응표 KEY-step4-marking.json은 판정자에게 주지 않는다.
import json, random, os
HERE=os.path.dirname(os.path.abspath(__file__)); EXP=os.path.abspath(HERE+'/../../..')+'/'; V=EXP+'deep-item-v5-2026-11-18/'; C=EXP+'rule-audit-2026-11-23/step4/confirm/'
src=[('gen','v5','공시 A-V1','disclosure-insider',V+'out-cell4/disclosure-insider-A/leakfix/items-leakfix.json'),
 ('gen','v5','공시 B-V1','disclosure-insider',V+'out-cell5/disclosure-insider-B/leakfix/items-leakfix.json'),
 ('gen','v5','의미 A-V1','meaning-internalism-externalism',V+'out-step4-v5/meaning-internalism-externalism-A/leakfix/items-leakfix.json'),
 ('gen','v5','의미 B-V1','meaning-internalism-externalism',V+'out-step4-v5/meaning-internalism-externalism-B/leakfix/items-leakfix.json'),
 ('gen','v6','공시 A-V1','disclosure-insider',V+'out-step4-v6/disclosure-insider-A/leakfix/items-leakfix.json'),
 ('gen','v6','공시 B-V1','disclosure-insider',V+'out-step4-v6/disclosure-insider-B/leakfix/items-leakfix.json'),
 ('gen','v6','의미 A-V1','meaning-internalism-externalism',V+'out-step4-v6/meaning-internalism-externalism-A/leakfix/items-leakfix.json'),
 ('gen','v6','의미 B-V1','meaning-internalism-externalism',V+'out-step4-v6/meaning-internalism-externalism-B/leakfix/items-leakfix.json')]
for m in json.load(open(C+'items/_manifest.json')): src.append(('confirm','기출',m['id'],m['passage'],C+f"items/{m['id']}.json"))
rnd=random.Random(20261124); order=list(range(len(src))); rnd.shuffle(order); key={}
for n,i in enumerate(order,1):
    grp,ver,name,pid,path=src[i]; it=json.load(open(path))['items'][0]; pk=f'S{n:02d}'
    pas=open(V+f'passages/{pid}/passage.txt').read().strip()
    open(HERE+f'/packets/{pk}.md','w').write(f"# {pk}\n\n## 지문\n\n{pas}\n\n## 문항\n\n{it['stem']}\n\n〈보기〉\n\n{it['bogi']}\n\n"+'\n'.join(it['choices'])+'\n')
    key[pk]={'group':grp,'version':ver,'name':name,'passage':pid,'official_answer':it['answer'],'kind':it.get('kind'),'path':path.replace(EXP,'')}
json.dump(key,open(HERE+'/KEY-step4-marking.json','w'),ensure_ascii=False,indent=1)
print(len(key),'packets')
