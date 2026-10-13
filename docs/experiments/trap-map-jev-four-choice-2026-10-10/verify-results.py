"""Independent audit; run from repository root after report generation."""
import json, math, hashlib
from pathlib import Path
from statistics import mean
ROOT=Path('docs/experiments/trap-map-jev-four-choice-2026-10-10')
def read(p): return json.loads(Path(p).read_text())
def close(a,b):
    if a is None or b is None: assert a is b,(a,b)
    else: assert math.isclose(a,b,abs_tol=1e-9,rel_tol=1e-9),(a,b)
def ranks(xs): return [1+sum(y<x for y in xs)+(sum(y==x for y in xs)-1)/2 for x in xs]
def corr(xs,ys):
    mx,my=mean(xs),mean(ys)
    dx,dy=[x-mx for x in xs],[y-my for y in ys]
    denominator=math.sqrt(sum(x*x for x in dx)*sum(y*y for y in dy))
    return sum(x*y for x,y in zip(dx,dy))/denominator if denominator else None
def rho(xs,ys):return corr(ranks(xs),ranks(ys))
def top(xs,ids):return [id for id,x in zip(ids,xs) if x==max(xs)]
def metrics(p,a,ids):
    P,A=top(p,ids),top(a,ids)
    return dict(P=P,A=A,topWrongHit=len(set(P)&set(A))/len(P),chance=len(A)/4,
        withinQuestionSpearman=rho(p,a),withinQuestionPearson=corr(p,a),
        distributionMAE=mean(abs(x-y) for x,y in zip(p,a)),predicted=p,actual=a)
def compare(m,target):
    for k,v in m.items():
        if isinstance(v,list):
            if v and isinstance(v[0],str):assert v==target[k]
            else:
                for a,b in zip(v,target[k]):close(a,b)
        else:close(v,target[k])
def aggregate(rows):
    p=[x for r in rows for x in r['predicted']];a=[x for r in rows for x in r['actual']]
    rs=[r['withinQuestionSpearman'] for r in rows if r['withinQuestionSpearman'] is not None]
    return dict(questions=len(rows),wrongChoices=4*len(rows),
        topWrongHit=mean(r['topWrongHit'] for r in rows),chance=mean(r['chance'] for r in rows),
        withinQuestionSpearman=mean(rs) if rs else None,definedWithinQuestionCorrelations=len(rs),
        pooledSpearman=rho(p,a),pooledPearson=corr(p,a),distributionMAE=mean(r['distributionMAE'] for r in rows))
frozen=read(ROOT/'FROZEN.json');sources=read(ROOT/'sources.json');jobs=read(ROOT/'requests.json')
rates={r['questionId']:r for r in read(frozen['externalRatesPath'])['items']};results=read(ROOT/'RESULTS.json')
assert len(jobs)==60
for j in jobs:
    s=sources[j['questionId']];p=j['payload'];ids=list(p['questions']['Q1']['criteria'])
    assert len(ids)==4 and s['answerChoiceId'] not in ids
    assert p['questions']['Q1']['instructions']==frozen['instructions']
    assert '[정답 번호]' not in p['state'] and '[공식 해설]' not in p['state']
    answer=next(c['text'] for c in s['choices'] if c['choiceId']==s['answerChoiceId'])
    assert answer not in p['state'] and s['officialExplanation'] not in p['state']
    assert s['answerChoiceId']+': {' not in p['state']
    for key in ['predictedSelectionPercent','choicePercents','correctRate','bySelSubCd']:assert key not in json.dumps(p)
    c=read(ROOT/'cells'/f"{j['label']}.json")
    assert c['status']=='VALID'
    assert set(c['probabilities'])==set(ids)
    assert 0.98<=sum(c['probabilities'].values())<=1.02
    assert c['probabilities']==c['attempts'][-1]['body']['result']['answers']['Q1']['probabilities']
checked_means=0;checked_replicates=0
for condition,d in results['conditions'].items():
    by_tab={tab:[] for tab in ['1004','1005']};repeat_rows={tab:[[] for _ in range(5)] for tab in by_tab}
    stable_count=0;stability_values=[]
    for q in d['questions']:
        source=sources[q['questionId']];ids=[c['choiceId'] for c in source['choices'] if c['choiceId']!=source['answerChoiceId']]
        assert ids==q['optionIds']
        predictions=[]
        for replicate in range(1,6):
            cell=read(ROOT/'cells'/f"{q['questionId']}-{condition}-r{replicate}.json")
            p=[100*cell['probabilities'][id] for id in ids];predictions.append(p)
            for x,y in zip(p,q['repeats'][replicate-1]['predictions']):close(x,y)
        avg=[mean(p[i] for p in predictions) for i in range(4)]
        for x,y in zip(avg,q['meanPredictions']):close(x,y)
        top_sets=[top(p,ids) for p in predictions];assert top_sets==q['stability']['topSets']
        sd=[math.sqrt(mean((p[i]-avg[i])**2 for p in predictions)) for i in range(4)]
        for x,y in zip(sd,q['stability']['predictionPopulationSD']):close(x,y)
        close(mean(sd),q['stability']['meanPredictionPopulationSD'])
        is_stable=all(s==top_sets[0] for s in top_sets);assert is_stable==q['stability']['topWrongAllFiveEqual']
        if q['status']=='USED':stable_count+=is_stable;stability_values.append(mean(sd))
        item=rates[q['questionId']]
        for tab in by_tab:
            row=item['bySelSubCd'].get(tab,item['bySelSubCd'].get('NO_TAB'))
            raw=[row['choicePercents'][c['position']-1] for c in source['choices'] if c['choiceId']!=source['answerChoiceId']]
            actual=[x*100/sum(raw) for x in raw]
            close(sum(actual),100);close(sum(raw),q['byTab'][tab]['denominator'])
            m=metrics(avg,actual,ids);compare(m,q['byTab'][tab]['meanPredictionMetrics']);checked_means+=1
            if q['status']=='USED':by_tab[tab].append(m)
            for i,p in enumerate(predictions):
                m=metrics(p,actual,ids);compare(m,q['byTab'][tab]['replicates'][i]['metrics']);checked_replicates+=1
                if q['status']=='USED':repeat_rows[tab][i].append(m)
    assert stable_count==d['stability']['topWrongAllFiveEqualQuestions'];close(mean(stability_values),d['stability']['meanPredictionPopulationSD'])
    for tab,rows in by_tab.items():
        assert len(rows)==5;compare(aggregate(rows),d['byTab'][tab]['meanPrediction'])
        for i,rs in enumerate(repeat_rows[tab]):compare(aggregate(rs),d['byTab'][tab]['replicates'][i])
ledger=[json.loads(l) for l in (ROOT/'requests.jsonl').read_text().splitlines()];pending=set();starts=[]
for r in ledger:
    if r['event']=='START':assert r['requestId'] not in pending;pending.add(r['requestId']);starts.append(r)
    else:assert r['requestId'] in pending;pending.remove(r['requestId'])
assert not pending
spacings=[b['atMs']-a['atMs'] for a,b in zip(starts,starts[1:])];assert min(spacings)>=7000
assert len(starts)==results['summary']['requests']<=75
changed=[]
for p,h in frozen['fileHashes'].items():
    if hashlib.sha256(Path(p).read_bytes()).hexdigest()!=h:changed.append(p)
assert not changed
assert hashlib.sha256(Path('scripts/test-trap-map-jev-four-choice.mjs').read_bytes()).hexdigest()==frozen['runnerHash']
audit=dict(numericalVerificationPassed=True,requestInputExclusionPassed=True,validCells=60,
    checkedMeanPredictionItemTabConditionRows=checked_means,checkedReplicateRows=checked_replicates,
    externalAttemptRecords=len(starts),requestsWithHTTPResponse=sum(r.get('httpStatus') is not None for r in ledger if r['event']!='START'),
    preflightExcludedFromCells=True,closedLedger=True,minimumRequestStartSpacingMs=min(spacings),
    requestSpacingRequirementMet=True,protectedInputsChanged=changed)
(ROOT/'VERIFICATION.json').write_text(json.dumps(audit,indent=2)+'\n');print(json.dumps(audit))
