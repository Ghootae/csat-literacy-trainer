import json, math, hashlib
from pathlib import Path
root = Path("docs/experiments/trap-map-jev-choice-2026-10-10")
read = lambda p: json.loads(Path(p).read_text())
result = read(root / "RESULTS.json")
frozen = read(root / "FROZEN.json")
sources = read(root / "sources.json")
rates = read(frozen["externalRatesPath"])
jobs = read(root / "requests.json")
cells = [read(root / "cells" / (j["label"] + ".json")) for j in jobs]
ledger = [json.loads(s) for s in (root / "requests.jsonl").read_text().splitlines()]
assert len(cells) == 60 and all(c["status"] == "VALID" for c in cells)
opened = set()
for r in ledger:
    if r["event"] == "START":
        assert r["requestId"] not in opened
        opened.add(r["requestId"])
    else:
        assert r["requestId"] in opened
        opened.remove(r["requestId"])
assert not opened
starts = [r for r in ledger if r["event"] == "START"]
spacing = [b["atMs"] - a["atMs"] for a,b in zip(starts,starts[1:])]
assert len(starts) <= 75
changed = [p for p,h in frozen["fileHashes"].items() if hashlib.sha256(Path(p).read_bytes()).hexdigest() != h]
assert not changed
mean = lambda xs: sum(xs)/len(xs) if xs else None
def ranks(xs):
    return [1+sum(y<x for y in xs)+(sum(y==x for y in xs)-1)/2 for x in xs]
def corr(xs,ys):
    if not xs: return None
    mx,my=mean(xs),mean(ys)
    dx,dy=[x-mx for x in xs],[y-my for y in ys]
    vx,vy=sum(x*x for x in dx),sum(y*y for y in dy)
    return None if vx==0 or vy==0 else sum(x*y for x,y in zip(dx,dy))/math.sqrt(vx*vy)
def spearman(xs,ys): return corr(ranks(xs),ranks(ys))
def eq(a,b):
    if a is None or b is None: assert a is b,(a,b)
    else: assert math.isclose(a,b,rel_tol=1e-9,abs_tol=1e-9),(a,b)
checked=0
for condition in ["BARE","TRAP"]:
    for tab in ["1004","1005"]:
        pp,aa,within,hits,chances,errors=[],[],[],[],[],[]
        for item in rates["items"]:
            s=sources[item["questionId"]]
            repeated=[c for c in cells if c["questionId"]==item["questionId"] and c["condition"]==condition]
            assert len(repeated)==5
            ids=[c["choiceId"] for c in s["choices"]]
            pred=[mean([c["probabilities"][id]*100 for c in repeated]) for id in ids]
            q=next(q for q in result["conditions"][condition]["questions"] if q["questionId"]==item["questionId"])
            for x,y in zip(pred,q["meanPredictions"]): eq(x,y)
            actual=item["bySelSubCd"].get(tab,item["bySelSubCd"].get("NO_TAB"))
            wrong=[i for i,id in enumerate(ids) if id!=s["answerChoiceId"]]
            p=[pred[i] for i in wrong]
            a=[actual["choicePercents"][s["choices"][i]["position"]-1] for i in wrong]
            P={ids[i] for i in wrong if pred[i]==max(p)}
            A={ids[i] for i in wrong if actual["choicePercents"][s["choices"][i]["position"]-1]==max(a)}
            m=q["byTab"][tab]["meanPredictionMetrics"]
            assert set(m["P"])==P and set(m["A"])==A
            hit=len(P&A)/len(P)
            eq(m["topWrongHit"],hit)
            rho=spearman(p,a)
            eq(m["withinQuestionSpearman"],rho)
            error=abs(pred[ids.index(s["answerChoiceId"])]-actual["correctRate"])
            eq(m["answerRateAbsoluteError"],error)
            if item["status"]=="USED":
                pp.extend(p);aa.extend(a);within.append(rho);hits.append(hit);chances.append(len(A)/4);errors.append(error)
            checked+=1
        expected={"topWrongHit":mean(hits),"chance":mean(chances),"withinQuestionSpearman":mean([v for v in within if v is not None]),"pooledSpearman":spearman(pp,aa),"pooledPearson":corr(pp,aa),"answerRateMAE":mean(errors)}
        aggregate=result["conditions"][condition]["byTab"][tab]["meanPrediction"]
        assert aggregate["questions"]==5 and aggregate["wrongChoices"]==20
        for key,v in expected.items():eq(v,aggregate[key])
        assert aggregate["definedWithinQuestionCorrelations"]==sum(v is not None for v in within)
for c in cells:
    p=c["attempts"][-1]["body"]["result"]["answers"]["Q1"]["probabilities"]
    assert p==c["probabilities"] and .98<=sum(p.values())<=1.02
assert result["summary"]["requests"]==len(starts)
assert len(result["summary"]["usage"])==len(starts)
audit={"numericalVerificationPassed":True,"requestSpacingRequirementMet":min(spacing)>=7000,"shortIntervals":[{"previous":a["label"],"next":b["label"],"milliseconds":b["atMs"]-a["atMs"]} for a,b in zip(starts,starts[1:]) if b["atMs"]-a["atMs"]<7000],"method":"Independent Python mean, average ranks and Pearson calculations; source rates read separately","validCells":len(cells),"externalRequests":len(starts),"checkedMeanPredictionItemTabConditionRows":checked,"protectedInputsChanged":changed,"minimumRequestStartSpacingMs":min(spacing),"closedLedger":True,"preflightExcludedFromCells":True}
(root/"VERIFICATION.json").write_text(json.dumps(audit,ensure_ascii=False,indent=2)+"\n")
print(json.dumps(audit,ensure_ascii=False))
