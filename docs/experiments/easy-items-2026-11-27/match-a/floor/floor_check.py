# 3단계 바닥 검사 ①~④ (미리 정한 기준 기계 적용, 고치지 않음)
import json,re,os,sys
HERE=os.path.dirname(os.path.abspath(__file__)); G=HERE+'/../gen/'; I=HERE+'/../inputs/'
CIRC='①②③④⑤'
def norm(s): s=re.sub(r'[‘’“”\'"‘’“”]','',s); s=re.sub(r'[ㆍ·․‧]','',s); return re.sub(r'\s+','',s)
RES={}; O=[]; W=O.append
for n in ['D-neg','D-pos','H-neg','H-pos']:
    it=json.load(open(G+f'{n}/item.json')); p=norm(open(I+f"passage-{it['request']['passage']}.txt",encoding='utf8').read())
    # 지문 속 ⓐ ㉠ 같은 기호도 지우고 비교(기호만 허용 정규화)
    p2=re.sub(r'[ⓐ-ⓩ㉠-㉿]','',p)
    want=it['request']['answerIntended']; fails=[]; info={}
    # ① 정답 하나
    sol=[]
    for r in (1,2):
        t=open(HERE+f'/{n}/SOLVE-r{r}.md',encoding='utf8').read()
        try: j=json.loads(re.findall(r'```json\s*(.*?)```',t,re.S)[-1])
        except Exception as e: j=None
        sol.append(j)
    ans=[CIRC.index(j['answer'][0])+1 if j else None for j in sol]
    c1=all(a==want for a in ans); info['solved']=ans
    if not c1: fails.append(f'① 정답: 의도 {want}, 풀이 {ans}')
    # ② 근거 문장 실재
    bad=[c['n'] for c in it['choices'] if norm(c['evidence']) not in p and re.sub(r'[ⓐ-ⓩ㉠-㉿]','',norm(c['evidence'])) not in p2]
    if bad: fails.append(f'② 근거 문장이 지문에 그대로 없음: 선지 {bad}')
    info['evidence_missing']=bad
    # ③ 맞는 선지 확인
    tr=[c['n'] for c in it['choices'] if c['truth']=='맞음'] if it['request']['stem'].startswith('윗글의 내용과 일치하지 않는 것은') else [c['n'] for c in it['choices'] if c['truth']=='맞음']
    seen=[]; both=[]
    for c in it['choices']:
        if c['truth']!='맞음': continue
        v=[ {x['n']:x['truth'] for x in j['choices']}.get(c['n']) if j else None for j in sol]
        if '틀림' in v: seen.append((c['n'],v))
        if v.count('틀림')==2: both.append(c['n'])
    info['true_seen_as_false']=seen
    if both: fails.append(f'③ 맞는 선지를 두 회 모두 틀림으로 봄: {both}')
    # ④ 겉모양
    L={c['n']:len(c['text']) for c in it['choices']}; ans_n=it['answer']
    longer=all(L[ans_n]>=L[k]+8 for k in L if k!=ans_n)
    if longer: fails.append(f'④ 정답 선지가 다른 선지보다 모두 8자 이상 길다: {L}')
    kw=re.compile('모두|반드시|오직|어떠한 경우에도|전혀')
    kws={c['n']:bool(kw.search(c['text'])) for c in it['choices']}
    if kws[ans_n] and not any(v for k,v in kws.items() if k!=ans_n): fails.append(f'④ 극단어가 정답에만 있음')
    info['len']=L; info['kw']=[k for k,v in kws.items() if v]
    info['method']={c['n']:c['method'] for c in it['choices']}
    info['twist']={c['n']:c['twist'] for c in it['choices'] if c['twist']}
    RES[n]={'floor_fail':bool(fails),'reasons':fails,**info}
    W(f"### {n} (정답 {CIRC[ans_n-1]}) — {'**바닥 실패**' if fails else '바닥 통과'}")
    for f in fails: W(f'- {f}')
    W(f"- ① 풀이 답 {ans} / ② 근거 누락 {bad or '없음'} / ③ 맞는 선지를 한 번이라도 '틀림'으로 본 경우 {seen or '없음'}")
    W(f"- 선지 길이 {L}, 극단어 있는 선지 {info['kw'] or '없음'}")
    W(f"- 방식: {info['method']}")
    for k,v in info['twist'].items(): W(f"  - ({CIRC[k-1]}) twist: {v}")
    W('')
json.dump(RES,open(HERE+'/floor-result.json','w'),ensure_ascii=False,indent=1)
open(HERE+'/floor-out.md','w',encoding='utf8').write('# 바닥 검사 결과 (자동 생성)\n\n'+'\n'.join(O)); print('\n'.join(O))
