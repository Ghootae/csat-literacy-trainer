# 4단계 3회차(v6.2) 블라인드 풀이지·KEY·CODEX-PROMPT 생성. v5 4문항은 4단계와 같은 최종본. 순서는 새로 무작위(seed 고정). 4단계와 같은 틀.
import json, random, os
HERE=os.path.dirname(os.path.abspath(__file__)); V=os.path.abspath(HERE+'/../../../deep-item-v5-2026-11-18')+'/'
def load(p): return json.load(open(V+p))['items'][0]
P={'disclosure-insider':{'title':'상장 법인의 공시 의무와 미공개중요정보 이용행위 규제','items':[
   ('기출 12번 (disclosure-12)','calib-gold/disclosure-12.json'),
   ('v5 A-V1 (out-cell4 leakfix)','out-cell4/disclosure-insider-A/leakfix/items-leakfix.json'),
   ('v5 B-V1 (out-cell5 leakfix)','out-cell5/disclosure-insider-B/leakfix/items-leakfix.json'),
   ('v6.2 A-V1 (out-step4-v62 leakfix)','out-step4-v62/disclosure-insider-A/leakfix/items-leakfix.json'),
   ('v6.2 B-V1 (out-step4-v62 leakfix)','out-step4-v62/disclosure-insider-B/leakfix/items-leakfix.json')]},
 'meaning-internalism-externalism':{'title':'의미 내재주의와 의미 외재주의','items':[
   ('기출 23번 (meaning-23)','calib-gold/meaning-23.json'),
   ('v5 A-V1 (out-step4-v5 leakfix)','out-step4-v5/meaning-internalism-externalism-A/leakfix/items-leakfix.json'),
   ('v5 B-V1 (out-step4-v5 leakfix)','out-step4-v5/meaning-internalism-externalism-B/leakfix/items-leakfix.json'),
   ('v6.2 A-V1 (out-step4-v62 leakfix)','out-step4-v62/meaning-internalism-externalism-A/leakfix/items-leakfix.json'),
   ('v6.2 B-V1 (out-step4-v62 leakfix)','out-step4-v62/meaning-internalism-externalism-B/leakfix/items-leakfix.json')]}}
LAB=list('가나다라마바사아자차')
rnd=random.Random(20261126)
hdr='''# 블라인드 풀이지: 〈보기〉 문항 10개 (공시 사례 5, 의미 관점 5) (2026-11-24, 3회차)

지문 두 개에 〈보기〉 문항이 5개씩 있습니다. 서로 비슷한 문항이 있을 수 있지만 문항마다 따로 판정하세요. 출처는 가렸고 순서는 섞었습니다. 기출 문항이 섞여 있을 수 있습니다.

문항마다 아래를 적어 주세요. 답과 등급을 모두 정한 뒤에 정답표를 여세요.
- 고른 답
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 3점 〈보기〉 문항으로 그대로 낼 수 있는가)
- 한 줄 이유
- 결함 표시(해당하면): ㉮ 〈보기〉가 지문 예시를 이름만 바꿔 옮김 ㉯ 〈보기〉를 안 봐도 풀리는 선지 2개 이상 ㉰ 〈보기〉에 쓰이지 않는 사실이 있음 ㉱ 〈보기〉가 서로 무관한 사건을 나열함 ㉲ 정답이 지문 한 문장으로 바로 정해짐 ㉳ 정답 시비(이의 제기) 위험 ㉴ 학생이 내려야 할 판정(누가 긍정·부정하는지, 어느 쪽과 같은지)까지 〈보기〉가 말함(비판 전제 제시는 제외)
'''
out=[hdr]; key=['# KEY (4단계 3회차 v6.2, 2026-11-24)\n','| 문항 | 지문 | 출처 | 정답 |','|---|---|---|---|']; li=0
for n,(pid,info) in enumerate(P.items(),1):
    order=info['items'][:]; rnd.shuffle(order)
    out.append(f"\n# 지문 {n}: {info['title']}\n\n## 지문\n"+open(V+f'passages/{pid}/passage.txt').read().strip()+'\n\n## 문항\n')
    for src,path in order:
        it=load(path); lab=LAB[li]; li+=1
        bogi='\n'.join('> '+l if l.strip() else '>' for l in it['bogi'].split('\n'))
        out.append(f"**[문항 {lab}]** {it['stem']}\n\n> 〈보기〉\n>\n{bogi}\n\n"+'  \n'.join(it['choices'])+'  \n')
        key.append(f"| {lab} | 지문 {n} | {src} | {'①②③④⑤'[it['answer']-1]} |")
open(HERE+'/BLIND-r3.md','w').write('\n'.join(out)); open(HERE+'/KEY-r3.md','w').write('\n'.join(key)+'\n')
open(HERE+'/CODEX-PROMPT-r3.md','w').write('''작업 폴더의 BLIND-r3.md를 풀고 판정해 줘. 지문이 둘이고 〈보기〉 문항이 모두 10개야(지문마다 5개). 출처는 가렸고 기출이 섞여 있을 수 있어. 이 파일 말고 다른 파일은 열지 마. 인터넷·API도 쓰지 마.

1) 문항마다(가~차) 직접 풀어서 정해 줘.
- 고른 답(①~⑤)
- 판정: 수능 같음 / 중 / 수능 아님 (기준: 평가원·수능 3점 〈보기〉 문항으로 그대로 낼 수 있는가)
- 한 줄 이유(판정을 가른 이유)
- 결함 표시: 풀이지 맨 위 ㉮~㉴ 중 해당하는 것(없으면 빈칸)
서로 비슷한 문항이 있어도 문항마다 따로 판정해.

2) 지문마다, 그 지문의 문항 중 가장 수능다운 문항과 가장 못한 문항을 하나씩 고르고, 두 문항의 차이를 학생의 풀이 단계(무엇을 읽고 → 지문의 어느 개념에 대응시키고 → 어떤 판단을 스스로 내려야 하는지)로 3~5줄 설명해 줘.

출력: 먼저 1)의 마크다운 표(지문|문항|답|판정|이유|결함), 그 아래 2)의 지문별 설명, 마지막에 1)과 같은 내용을 ```json 블록 하나로: [{"passage":1,"item":"가","answer":"⑤","grade":"수능 같음","reason":"...","defects":["㉴"]}, ...]. 파일은 쓰지 말고 답으로만 내 줘.
''')
print(open(HERE+'/KEY-r3.md').read())
