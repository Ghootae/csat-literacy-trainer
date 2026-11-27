# floor_check.py 실행 뒤 실행: other_sentence '아니오' 수 집계, 2개 이상이면 바닥 실패로 바꿈
import json,re,glob,os
HERE=os.path.dirname(os.path.abspath(__file__)); RES=json.load(open(HERE+'/floor-result.json')); add=[]
for n in ['T-B','C-B']:
    it=json.load(open(HERE+f'/../gen/{n}/item.json')); no=[]; rows=[]
    for c in it['choices']:
        f=HERE+f"/other/{n}-{c['n']}/ANSWER.md"
        if not os.path.exists(f): continue
        t=open(f,encoding='utf8').read(); m=re.findall(r'"answer"\s*:\s*"(예|아니오)"',t); a=m[-1] if m else '?'
        rows.append((c['n'],c['other_sentence'],a)); 
        if a!='예': no.append(c['n'])
    RES[n]['other_rows']=rows; RES[n]['other_no']=no
    if len(no)>=2: RES[n]['floor_fail']=True; RES[n]['reasons'].append(f"other_sentence '아니오' {len(no)}개: {no}")
    add.append(f"### {n} other_sentence 확인 (codex 1회씩): '아니오' {len(no)}개 {no or ''}")
    for r in rows: add.append(f"- 선지 {r[0]}: {r[1]} → {r[2]}")
    add.append(f"- 최종 바닥: {'**실패**' if RES[n]['floor_fail'] else '통과'}\n")
json.dump(RES,open(HERE+'/floor-result.json','w'),ensure_ascii=False,indent=1)
open(HERE+'/floor-out.md','a',encoding='utf8').write('\n## other_sentence 확인\n\n'+'\n'.join(add)); print('\n'.join(add))
