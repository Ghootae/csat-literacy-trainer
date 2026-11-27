# 3단계 바닥 검사 ①~④ (미리 정한 기준 기계 적용, 고치지 않음)
import json,re,os,sys,collections
HERE=os.path.dirname(os.path.abspath(__file__)); G=HERE+'/../gen/'; I=HERE+'/../inputs/'
CIRC='①②③④⑤'
def norm(s): s=re.sub(r'[‘’“”\'"‘’“”]','',s); s=re.sub(r'[ㆍ·․‧]','',s); return re.sub(r'\s+','',s)
RES={}; O=[]; W=O.append
for n in ['S-pos','I-pos']:
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
    def piece_ok(e): return norm(e) in p or re.sub(r'[ⓐ-ⓩ㉠-㉿]','',norm(e)) in p2
    bad=[c['n'] for c in it['choices'] if not all(piece_ok(x) for x in c['evidence'].split(' / ') if x.strip())]
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
    longer=all(L[ans_n]>=L[k]+10 for k in L if k!=ans_n)
    if longer: fails.append(f'④ 정답 선지가 다른 선지보다 모두 10자 이상 길다: {L}')
    kw=re.compile('모두|반드시|오직|어떠한 경우에도|전혀')
    kws={c['n']:bool(kw.search(c['text'])) for c in it['choices']}
    if kws[ans_n] and not any(v for k,v in kws.items() if k!=ans_n): fails.append(f'④ 극단어가 정답에만 있음')
    info['len']=L; info['kw']=[k for k,v in kws.items() if v]
    info['method']={c['n']:c['kind'] for c in it['choices']}
    info['almost_same']=[c['n'] for c in it['choices'] if c['truth']=='맞음' and c['kind']=='한 단계 적용']
    ev=lambda it:{c['n']:set(x.strip() for x in c['evidence'].split(' / ') if x.strip()) for c in it['choices']}
    if n.endswith('-neg'):
        negit=json.load(open(G+n.replace('-neg','-pos')+'/item.json')); ne=set().union(*ev(negit).values())
        info['overlap_with_neg']=[k for k,v in ev(it).items() if v&ne]
    else: info['overlap_with_neg']=None
    info['twist']={c['n']:c['twist'] for c in it['choices'] if c['twist']}
    RES[n]={'floor_fail':bool(fails),'reasons':fails,**info}
    W(f"### {n} (정답 {CIRC[ans_n-1]}) — {'**바닥 실패**' if fails else '바닥 통과'}")
    for f in fails: W(f'- {f}')
    W(f"- ① 풀이 답 {ans} / ② 근거 누락 {bad or '없음'} / ③ 맞는 선지를 한 번이라도 '틀림'으로 본 경우 {seen or '없음'}")
    tw=collections.Counter(re.search(r'\((끝 반전|속 바꿔치기|적용·맞대기)\)',c['kind']).group(1) if re.search(r'\((끝 반전|속 바꿔치기|적용·맞대기)\)',c['kind']) else '표시없음' for c in it['choices'] if c['truth']=='틀림')
    info['wrong_pos']=dict(tw)
    W(f"- 오답 자리 표시(생성기 자기 표시): 끝 반전 {tw.get('끝 반전',0)} / 속 바꿔치기 {tw.get('속 바꿔치기',0)} / 적용·맞대기 {tw.get('적용·맞대기',0)} / 표시없음 {tw.get('표시없음',0)}" + (' — **규칙 어김(끝 반전 2개 이상)**' if tw.get('끝 반전',0)>=2 else ''))
    W(f"- 선지 길이 {L}, 극단어 있는 선지 {info['kw'] or '없음'}")
    W(f"- kind(맞는 선지: 다시 말하기·한 단계 적용 / 틀린 선지: 갈래 가~바): {info['method']}")
    W(f"- 맞는 선지 중 '한 단계 적용' 개수: {len(info['almost_same'])}" + (f" / 같은 지문 -pos 문항과 같은 evidence 문장을 쓰는 선지: {info['overlap_with_neg']}" if info['overlap_with_neg'] is not None else ''))
    for k,v in info['twist'].items(): W(f"  - ({CIRC[k-1]}) twist: {v}")
    W('')
json.dump(RES,open(HERE+'/floor-result.json','w'),ensure_ascii=False,indent=1)
open(HERE+'/floor-out.md','w',encoding='utf8').write('# 바닥 검사 결과 (자동 생성)\n\n'+'\n'.join(O)); print('\n'.join(O))
