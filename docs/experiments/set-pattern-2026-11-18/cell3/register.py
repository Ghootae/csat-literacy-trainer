# 순서표 ③-1: suneung_db 원본에서 지문 2편 등록(passage.txt·meta.json)과 지도용 지문 JSON 생성. 저장소 루트에서 실행.
import json, hashlib, os
V5='docs/experiments/deep-item-v5-2026-11-18'
SP='docs/experiments/set-pattern-2026-11-18'
ITEMS=[('solid-catalyst','69c0110bfa5063deffe1a632',10,'8~11'),('auxin-growth','6a22950f86fd308968e11320',17,'16~19')]
for pid,sid,num,qr in ITEMS:
    path=f'/Users/mac/Projects/suneung_db/output/passages/{sid}.json'
    raw=open(path,'rb').read(); d=json.loads(raw)
    paras=[p['text'] for s in d['sections'] for p in s['paragraphs']]
    body=[t for t in paras if not t.startswith('* ')]; notes=[t for t in paras if t.startswith('* ')]
    assert '\n'.join(paras)==d['full_text'], pid
    os.makedirs(f'{V5}/passages/{pid}',exist_ok=True)
    txt='\n\n'.join(f'[{i+1}문단] {t}' for i,t in enumerate(body))+('\n\n'+'\n'.join(notes) if notes else '')+'\n'
    open(f'{V5}/passages/{pid}/passage.txt','w').write(txt)
    meta={'title':d['exam']['title'],'exam':d['exam']['label'],'source':{'setId':sid,'number':num},'note':'순서표 ③ 과학 칸 시험용 등록(2026-11-24)'}
    open(f'{V5}/passages/{pid}/meta.json','w').write(json.dumps(meta,ensure_ascii=False,indent=1)+'\n')
    pj={'schemaVersion':'dialogue-passage-v1','passageId':pid,'title':d['exam']['title'],'exam':d['exam']['label'],'questionRange':qr,
        'source':{'status':'suneung-db','sourceId':sid,'sourcePath':path,'sourceFileHash':hashlib.sha256(raw).hexdigest()},
        'notes':notes,'paragraphs':[{'paragraphId':f'{pid}-p{i+1}','position':i+1,'text':t} for i,t in enumerate(body)]}
    open(f'{SP}/cell3/map/passages/{pid}.json','w').write(json.dumps(pj,ensure_ascii=False,indent=2)+'\n')
    print(pid,len(body),'문단',len(notes),'각주')
