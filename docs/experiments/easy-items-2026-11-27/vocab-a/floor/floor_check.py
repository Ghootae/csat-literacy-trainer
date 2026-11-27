# 3단계 바닥 검사 (미리 정한 기준 기계 적용, 고치지 않음)
import json,re,os
HERE=os.path.dirname(os.path.abspath(__file__)); G=HERE+'/../gen/'; I=HERE+'/../inputs/'
CIRC='①②③④⑤'; RES={}; O=[]; W=O.append
for n in ['S-B','S-A','N-A','N-B']:
    it=json.load(open(G+f'{n}/item.json')); rq=it['request']; form=rq['form']; pk=rq['passage']
    plain=open(I+f'{pk}-plain.txt',encoding='utf8').read(); marked=open(I+f'{n}-marked.txt',encoding='utf8').read()
    want=rq['answerIntended']; ans_n=it['answer']; fails=[]; info={}
    # 표시 자리
    badt=[f"{t['mark']}({t['text']!r} {plain.count(t['text'])}회)" for t in it['targets'] if plain.count(t['text'])!=1 or t['word'] not in t['text']]
    if badt: fails.append('표시 자리: 구절이 plain 지문에 한 번이 아니거나 word 가 구절 안에 없음 '+', '.join(badt))
    nm=sum(marked.count(c) for c in 'ⓐⓑⓒⓓⓔ'); need=1 if form=='A' else 5
    if nm!=need: fails.append(f'표시 자리: mark 수 {nm} (필요 {need})')
    # 정답 하나(풀이 2회)
    sol=[]
    for r in (1,2):
        t=open(HERE+f'/{n}/SOLVE-r{r}.md',encoding='utf8').read()
        try: sol.append(json.loads(re.findall(r'```json\s*(.*?)```',t,re.S)[-1]))
        except Exception: sol.append(None)
    ans=[CIRC.index(j['answer'][0])+1 if j else None for j in sol]; info['solved']=ans
    if not all(a==want for a in ans): fails.append(f'정답: 의도 {want}, 풀이 {ans}')
    # 꼴별 형식
    if form=='A':
        w=it['targets'][0]['word']; first=w[0]; miss=[c['n'] for c in it['choices'] if first not in c['text']]
        info['A_first_syllable_missing']=miss
        if miss: fails.append(f"꼴 A: 예문에 어간 첫 음절 '{first}' 없음 선지 {miss}")
    else:
        order=[bool(re.match(rf'^{CIRC[i] if False else ""}ⓐⓑⓒⓓⓔ'[0:0]+'ⓐⓑⓒⓓⓔ'[i]+r':\s*\S',c['text'])) for i,c in enumerate(it['choices'])]
        info['B_order_ok']=all(order)
        if not all(order): fails.append(f'꼴 B: 선지가 ⓐ:~ⓔ: 순서가 아님 {order}')
        if '고유어 → 한자어' in open(G+f'{n}/user-message.txt',encoding='utf8').read():
            hj=[bool(re.search(r'\([一-鿿]+\)',c['text'])) for c in it['choices']]; info['B_hanja']=hj
            if not all(hj): fails.append(f'꼴 B(고유어→한자어): 괄호 한자 없는 선지 {hj}')
        paras=[i for i,pp in enumerate(re.split(r'\n\s*\n',plain)) if any(t['text'] in pp for t in it['targets'])]; info['B_paragraphs']=len(paras)
    # 겉모양
    L={c['n']:len(c['text']) for c in it['choices']}
    if all(L[ans_n]>=L[k]+10 for k in L if k!=ans_n): fails.append(f'겉모양: 정답 선지가 다른 넷보다 모두 10자 이상 길다 {L}')
    info['len']=L
    RES[n]={'floor_fail':bool(fails),'reasons':fails,**info}
    W(f"### {n} (정답 {CIRC[ans_n-1]}, 꼴 {form}) — {'**바닥 실패**' if fails else '바닥 통과'}")
    for f in fails: W(f'- {f}')
    W(f"- 풀이 답 {ans} / 선지 길이 {L}" + (f" / 꼴 B 다섯 낱말이 걸친 문단 수 {info['B_paragraphs']}" if form=='B' else ''))
    for t in it['targets']: W(f"- 고른 낱말 {t['mark']} '{t['word']}' (구절 '{t['text']}'): {t['sense']}")
    for c in it['choices']: W(f"  - {CIRC[c['n']-1]} [{c['truth']}] {c['text']} — sense: {c['sense']} / why: {c['why']}")
    W('')
json.dump(RES,open(HERE+'/floor-result.json','w'),ensure_ascii=False,indent=1)
open(HERE+'/floor-out.md','w',encoding='utf8').write('# 바닥 검사 결과 (자동 생성)\n\n'+'\n'.join(O)); print('\n'.join(O))
