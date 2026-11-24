# 순서표 ③-2: 대조 기출 calib-gold 생성(발문·〈보기〉·선지·정답은 suneung_db 원문 그대로). 저장소 루트에서 실행.
import json
V5='docs/experiments/deep-item-v5-2026-11-18'; SP='docs/experiments/set-pattern-2026-11-18'
name,sid,num,kind='surface-tension-16','6a213ea086fd308968e101df',16,'experiment'
d=json.load(open(f'{SP}/data/questions/{sid}.json')); q=[x for x in d['questions'] if int(x['number'])==num][0]
a=json.load(open(f'{SP}/data/answers/{sid}.json')); ans=[x for x in a['questions'] if int(x['question_number'])==num][0]['correct_choice']
stem=q['prompt_blocks'][0]['text'].replace('<보기>','〈보기〉'); bogi=q['prompt_blocks'][1]['text']
item={'version':'V1','kind':kind,'stem':stem,'bogi':bogi,'choices':[f"{c['label']} {c['text']}" for c in q['choices']],'answer':ans,
      'source':{'setId':sid,'number':num,'answerKey':'suneung_db output answers (EBSi 해설)'}}
json.dump({'items':[item]},open(f'{V5}/calib-gold/{name}.json','w'),ensure_ascii=False,indent=1); open(f'{V5}/calib-gold/{name}.json','a').write('\n')
print(name,ans,stem)
