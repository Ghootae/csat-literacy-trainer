# 그래프 첫 실전 집계 (측정만). 실행(저장소 루트): python3 docs/experiments/set-pattern-2026-11-18/graphC/aggregate.py
# 판정(통과/거의/미달) 이름은 쓰지 않는다. 자격 기출 두 문항 중 하나라도 1.5 미만인 회차는 '멈춤' 표시(4-3).
import json,re,collections
C='docs/experiments/set-pattern-2026-11-18/graphC/'; D=C+'blind/'
SC={'수능 같음':2,'중':1,'수능 아님':0}; RUNS=('r1','r2')
GEN=['생성 A-V2 graph','생성 B-V2 graph']; QUAL=['자격 기출 플라스틱 10번','자격 기출 오디오 17번']; REF='참고 기출 조세 귀착 12번'
L2_SOC_GRAPH=1.44
RC=json.load(open(C+'reason-class.json',encoding='utf8'))  # "<문항>|<회차>|<평가자>" -> 그림|문항|해당 없음
def blocks(t): return json.loads(re.findall(r'```json\s*(.*?)```',t,re.S)[-1])
R={}
for run in RUNS:
    KEY=json.load(open(D+f'KEY-{run}.json',encoding='utf8'))
    EV={i:{r['item']:r for r in blocks(open(D+f'REPORT-eval-{run}-{i}.md',encoding='utf8').read())} for i in range(1,5)}
    assert all(len(EV[i])==5 for i in EV)
    for k in KEY:
        it=k['item']; gs=[EV[i][it]['grade'] for i in EV]; ans=[EV[i][it]['answer'] for i in EV]
        R.setdefault(k['source'],{})[run]=dict(k=k,grades=gs,mean=sum(SC[g] for g in gs)/4,ok=sum(a==k['answer'] for a in ans),ans=ans,
           defects=collections.Counter(d for i in EV for d in (EV[i][it].get('defects') or [])),no=gs.count('수능 아님'),same=gs.count('수능 같음'),mid=gs.count('중'))
O=[];W=O.append
W('# 그래프 첫 실전 블라인드 집계 (자동 생성, 측정만)\n'); W('등급 점수: 수능 같음 2, 중 1, 수능 아님 0. 평가자 4명 × 회차 2. 문항 5개(생성 2, 자격 기출 2, 참고 기출 1).\n')
names=GEN+QUAL+[REF]
W('## a. 문항별 회차별 등급·평균\n'); W('| 문항 | 회차 | 풀이지 번호 | 정답 | 평가자1~4 등급 | 평균 | 같음/중/아님 | 정답 일치 | 평가자 답 | 결함 표시 |'); W('|---|---|---|---|---|---|---|---|---|---|')
for n in names:
    for run in RUNS:
        r=R[n][run]; W(f"| {n} | {run} | {r['k']['item']} | {r['k']['answer']} | {' / '.join(r['grades'])} | {r['mean']:.2f} | {r['same']}/{r['mid']}/{r['no']} | {r['ok']}/4 | {' '.join(r['ans'])} | {dict(r['defects']) or '없음'} |")
W('\n## b. 칸 평균(A-V2·B-V2, 두 회차)\n'); W('| 칸 | r1 | r2 | 두 회차 평균 | 사회 그래프 L2 칸 평균(조세 귀착, 기출 지문) | 차이 |'); W('|---|---|---|---|---|---|')
m=[sum(R[n][r]['mean'] for n in GEN)/2 for r in RUNS]; avg=sum(m)/2
W(f"| 가격 상한제 V2 graph A·B | {m[0]:.3f} | {m[1]:.3f} | **{avg:.3f}** | {L2_SOC_GRAPH} | {avg-L2_SOC_GRAPH:+.3f} |")
W('\n문항별 두 회차 평균: '+', '.join(f"{n} {sum(R[n][r]['mean'] for r in RUNS)/2:.3f}" for n in GEN)+'\n')
W('## c. 자격 기출 회차별 평균(멈춤 점검)\n'); W('| 회차 | 플라스틱 10 | 오디오 17 | 둘 다 1.5 이상? | 조세 12(참고, 멈춤에 안 씀) |'); W('|---|---|---|---|---|')
for run in RUNS:
    a,b=[R[n][run]['mean'] for n in QUAL]; W(f"| {run} | {a:.2f} | {b:.2f} | {'예' if min(a,b)>=1.5 else '아니오 → 이 회차 멈춤'} | {R[REF][run]['mean']:.2f} |")
W('\n## d. 생성 문항별 \'수능 아님\'·\'수능 같음\' 횟수 (두 회차 합)\n'); W('| 문항 | 아님 r1 | 아님 r2 | 아님 합 | 같음 합 | ㉲(정답이 지문 한 문장으로 정해짐) 표시 | ㉳ 표시 |'); W('|---|---|---|---|---|---|---|')
for n in names:
    a=R[n]['r1'];b=R[n]['r2']; W(f"| {n} | {a['no']} | {b['no']} | {a['no']+b['no']} | {a['same']+b['same']} | {a['defects'].get('㉲',0)+b['defects'].get('㉲',0)} | {a['defects'].get('㉳',0)+b['defects'].get('㉳',0)} |")
W('\n## e. 평가 이유 분류 — 생성 문항, 평가 이유 1건 = 1표 (분류는 사람이 이유·그래프 평 원문을 읽고 정함: reason-class.json)\n')
W('분류 기준: 그림 탓 = 이유·그래프 평이 그림·읽기 판의 불일치·납작함·읽기 어려움·모양이 지문과 안 맞음을 든 것. 문항 탓 = 정답이 〈보기〉 한 단계로 정해지는 등 문항 구성을 든 것. 해당 없음 = 긍정 이유만.\n')
W('| 문항 | 그림·읽기 판 탓 | 문항 탓 | 해당 없음(긍정만) |'); W('|---|---|---|---|')
for n in GEN:
    c=collections.Counter(RC[f'{n}|{run}|{i}'] for run in RUNS for i in range(1,5)); W(f"| {n} | {c['그림']} | {c['문항']} | {c['해당 없음']} |")
W('\n## f. 정답이 〈보기〉 한 단계·지문 한 문장으로 정해짐\n')
for n in GEN:
    t=sum(R[n][r]['defects'].get('㉲',0) for r in RUNS); W(f"- {n}: ㉲ 표시 {t}회. 이유 말에서 같은 취지(부족량 40·70 단순 비교만으로 정답이 드러남)를 든 평가자: "+str(sum(1 for r in RUNS for i in range(1,5) if RC[f'{n}|{r}|{i}']=='문항'))+'명(8명 중)')
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(O)+'\n'); print('\n'.join(O))
