# 그래프 D 집계 (측정만). 실행(저장소 루트): python3 docs/experiments/set-pattern-2026-11-18/graphD/aggregate.py
# 판정 이름(통과/거의/미달)은 쓰지 않는다. 자격 기출 두 문항 중 하나라도 1.5 미만이면 그 회차 '멈춤'(4-3).
import json,re,collections
C='docs/experiments/set-pattern-2026-11-18/graphD/'; D=C+'blind/'
SC={'수능 같음':2,'중':1,'수능 아님':0}; RUNS=('r1','r2')
A='생성 A-V2 graph'; OLD='옛 B-V2 graph(읽기 판 수리)'; NEW='새 B-V2 graph'; GEN=[A,OLD,NEW]
QUAL=['자격 기출 플라스틱 10번','자격 기출 오디오 17번']; REF='참고 기출 조세 귀착 12번'
GC=dict(cell=1.312,B=0.875,A=1.750,sameB_reason='그림·읽기 판 탓 8/8')  # graphC 결과(graphC/aggregate-out.md)
RC=json.load(open(C+'reason-class.json',encoding='utf8'))
def blocks(t): return json.loads(re.findall(r'```json\s*(.*?)```',t,re.S)[-1])
R={}
for run in RUNS:
    KEY=json.load(open(D+f'KEY-{run}.json',encoding='utf8'))
    EV={i:{r['item']:r for r in blocks(open(D+f'REPORT-eval-{run}-{i}.md',encoding='utf8').read())} for i in range(1,5)}
    assert all(len(EV[i])==6 for i in EV)
    for k in KEY:
        it=k['item']; gs=[EV[i][it]['grade'] for i in EV]; ans=[EV[i][it]['answer'] for i in EV]
        R.setdefault(k['source'],{})[run]=dict(k=k,grades=gs,mean=sum(SC[g] for g in gs)/4,ok=sum(a==k['answer'] for a in ans),ans=ans,
           defects=collections.Counter(d for i in EV for d in (EV[i][it].get('defects') or [])),no=gs.count('수능 아님'),same=gs.count('수능 같음'),mid=gs.count('중'))
O=[];W=O.append
W('# 그래프 D 블라인드 집계 (자동 생성, 측정만)\n'); W('등급 점수: 수능 같음 2, 중 1, 수능 아님 0. 평가자 4명 × 회차 2. 문항 6개(생성 3, 자격 기출 2, 참고 기출 1).\n')
names=GEN+QUAL+[REF]
W('## a. 문항별 회차별 등급·평균\n'); W('| 문항 | 회차 | 풀이지 번호 | 정답 | 평가자1~4 등급 | 평균 | 같음/중/아님 | 정답 일치 | 평가자 답 | 결함 표시 |'); W('|---|---|---|---|---|---|---|---|---|---|')
for n in names:
    for run in RUNS:
        r=R[n][run]; W(f"| {n} | {run} | {r['k']['item']} | {r['k']['answer']} | {' / '.join(r['grades'])} | {r['mean']:.2f} | {r['same']}/{r['mid']}/{r['no']} | {r['ok']}/4 | {' '.join(r['ans'])} | {dict(r['defects']) or '없음'} |")
def cell(ns):
    m=[sum(R[n][r]['mean'] for n in ns)/len(ns) for r in RUNS]; return m,sum(m)/2
W('\n## b. 칸 평균 (graphC와 나란히)\n'); W('| 칸 | r1 | r2 | 두 회차 평균 | graphC 칸 평균 1.312과의 차이 | 사회 그래프 L2 칸 평균 1.44와의 차이 |'); W('|---|---|---|---|---|---|')
for lab,ns in (('칸 평균 = A-V2 + 새 B-V2',[A,NEW]),('참고 칸 평균 = A-V2 + 옛 B(읽기 판 수리)',[A,OLD])):
    m,a=cell(ns); W(f"| {lab} | {m[0]:.3f} | {m[1]:.3f} | **{a:.3f}** | {a-GC['cell']:+.3f} | {a-1.44:+.3f} |")
W(f"\ngraphC(수리 전): 칸 평균 {GC['cell']} (A {GC['A']}, 옛 B 수리 전 {GC['B']}). 옛 B 수리 전 → 수리 뒤 두 회차 평균: {GC['B']} → {sum(R[OLD][r]['mean'] for r in RUNS)/2:.3f}.\n")
for n in GEN: W(f"- {n} 두 회차 평균 {sum(R[n][r]['mean'] for r in RUNS)/2:.3f}")
W('\n## c. 자격 기출 회차별 평균(멈춤 점검)\n'); W('| 회차 | 플라스틱 10 | 오디오 17 | 둘 다 1.5 이상? | 조세 12(참고) |'); W('|---|---|---|---|---|')
for run in RUNS:
    a,b=[R[n][run]['mean'] for n in QUAL]; W(f"| {run} | {a:.2f} | {b:.2f} | {'예' if min(a,b)>=1.5 else '아니오 → 이 회차 멈춤'} | {R[REF][run]['mean']:.2f} |")
W('\n## d. 생성 문항별 \'수능 아님\'·\'수능 같음\' 횟수 (두 회차 합) · 정답 일치\n'); W('| 문항 | 아님 합 | 같음 합 | 정답 일치(8명 중) | ㉲ | ㉳ |'); W('|---|---|---|---|---|---|')
for n in names:
    a=R[n]['r1'];b=R[n]['r2']; W(f"| {n} | {a['no']+b['no']} | {a['same']+b['same']} | {a['ok']+b['ok']}/8 | {a['defects'].get('㉲',0)+b['defects'].get('㉲',0)} | {a['defects'].get('㉳',0)+b['defects'].get('㉳',0)} |")
W('\n## e. 평가 이유 분류 — 생성 문항, 평가 이유 1건 = 1표 (분류는 사람이 이유·그래프 평 원문을 읽고 정함: reason-class.json)\n')
W('분류 기준: 그림·읽기 판 탓 = 그림·읽기 판의 불일치·납작함·읽기 어려움·모양이 지문과 안 맞음. 문항 탓 = 정답이 〈보기〉 한 단계로 정해지거나 문항 구성(조건 누락 등)을 든 것. 긍정 = 긍정 이유만.\n')
W('| 문항 | 그림·읽기 판 탓 | 문항 탓 | 긍정만 | graphC 때(같은 문항) |'); W('|---|---|---|---|---|')
prev={A:'그림 0 / 문항 2 / 긍정 6',OLD:'그림 8 / 문항 0 / 긍정 0 (읽기 판 "병 ⓔ→ⓑ")',NEW:'(graphC에 없음)'}
for n in GEN:
    c=collections.Counter(RC[f'{n}|{run}|{i}'] for run in RUNS for i in range(1,5)); W(f"| {n} | 0 | {c['문항']} | {c['해당 없음']} | {prev[n]} |")
W('\n그림·읽기 판 탓 분류가 0인 이유: 이번 평가에서 읽기 판과 그림의 불일치를 짚은 이유는 없었다(옛 B 8건 모두 불일치 언급 없음).\n')
open(C+'aggregate-out.md','w',encoding='utf8').write('\n'.join(O)+'\n'); print('\n'.join(O))
