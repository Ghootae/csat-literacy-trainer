# 순서표 ③-1: 대조 기출 calib-gold 2개 생성(발문·선지·정답은 suneung_db 원문 그대로). 저장소 루트에서 실행.
import json
V5='docs/experiments/deep-item-v5-2026-11-18'; SP='docs/experiments/set-pattern-2026-11-18'
GRAPH=("(그래프) 가로축 옥신의 농도(M), 눈금 M₁·M₂에 세로 점선. 세로축 생장 반응 정도, 위쪽 +, 가운데 0(가로 점선), 아래쪽 −. "
 "곡선 ⓐ(가장 가늘다)·ⓑ(중간)·ⓒ(가장 굵다)는 모두 종 모양으로 오르다 내려간다. "
 "ⓐ는 가장 왼쪽 0선에서 시작해 낮은 봉우리를 지나 M₁에서 0선과 만나고 그 뒤로 0 아래로 내려간다. "
 "ⓑ는 ⓐ보다 오른쪽 0선에서 시작해 M₁에서 최고점에 이르고, M₂ 부근에서 0선과 만나 그 뒤로 0 아래로 내려간다. "
 "ⓒ는 M₁에서 0선에서 시작해 ⓑ보다 높은 봉우리에 이른다(최고점은 M₂보다 오른쪽). M₂에서는 아직 0 위(생장 촉진)에 있고, M₂보다 훨씬 오른쪽에서 0선과 만나 0 아래로 내려간다. "
 "ⓑ와 ⓒ의 곡선은 M₁과 M₂ 사이에서 교차한다. 세 곡선 모두 맨 오른쪽 끝에서는 0 아래에 있다.")
SPEC=[('solid-catalyst-10','69c0110bfa5063deffe1a632',10,'case',None),('auxin-17','6a22950f86fd308968e11320',17,'graph',GRAPH)]
for name,sid,num,kind,graph in SPEC:
    d=json.load(open(f'{SP}/data/questions/{sid}.json')); q=[x for x in d['questions'] if x['number']==num][0]
    a=json.load(open(f'{SP}/data/answers/{sid}.json')); ans=[x for x in a['questions'] if x['question_number']==num][0]['correct_choice']
    stem=q['prompt_blocks'][0]['text'].replace('<보기>','〈보기〉'); bogi=q['prompt_blocks'][1]['text']
    if graph: bogi=bogi.replace('ⓐ~ 는','ⓐ~ⓒ는')+' '+graph
    item={'version':'V1','kind':kind,'stem':stem,'bogi':bogi,'choices':[f"{c['label']} {c['text']}" for c in q['choices']],'answer':ans,
          'source':{'setId':sid,'number':num,'answerKey':'suneung_db output answers (EBSi 해설)'}}
    json.dump({'items':[item]},open(f'{V5}/calib-gold/{name}.json','w'),ensure_ascii=False,indent=1); open(f'{V5}/calib-gold/{name}.json','a').write('\n')
    print(name,ans,stem)
