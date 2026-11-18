import json,sys,random
import os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from students import S,ANS,QID,GOOD,WEAK
OUT=sys.argv[1]
F='packages/pipeline/fixtures/experiments/sns-diagnostic'
SET=json.load(open(F+'/diagnostic-set-e.json'))
CL={p['passageId']:json.load(open(p['choiceLinkPath'])) for p in SET['passages']}
def q(k):
  qid=f"{QID[k[0]]}-q{k[1:]}"; return qid,json.load(open(f'{F}/public/{qid}.json'))
def twists(pid,num,pos):
  for qq in CL[pid]['questions']:
    if qq['number']==num:
      for c in qq['choices']:
        if c.get('number',c.get('position'))==pos:
          return qq['stemPolarity'],[{'twistDetail':p['twistDetail'],'choiceQuote':p['choiceQuote'],'evidenceQuote':p['evidenceQuote'] or None} for p in c.get('parts',[]) if p.get('twisted')]
      return qq['stemPolarity'],[]
order=list(ANS)
os.makedirs(OUT+'/inputs',exist_ok=True)
PUB={json.load(open(f))['title']:json.load(open(f))['passage'] for f in __import__('glob').glob(F+'/public/*.json')}
random.seed(20261118); codes=random.sample(['S-07','S-12','S-23','S-31','S-44','S-58'],6); codes.insert(4,'S-66')
key={}
for (name,st),code in zip(S.items(),codes):
  key[code]=name
  entries=[];omitted=[];supported=[]
  for i,k in enumerate(order):
    qid,Q=q(k); pid=Q['passageId']; ans=ANS[k]
    if k in st['resp']: ch,rat,jud=st['resp'][k]
    else:
      ch=ans
      if i%3==2: rat,jud=None,None
      else: rat,jud=GOOD[k],'SUPPORTED'
    text=lambda pos: next(c['text'] for c in Q['choices'] if c['position']==pos)
    ref=f"{Q['title']} {Q['questionNumber']}번"
    if rat is None:
      if ch!=ans: omitted.append(ref)
      continue
    if ch==ans and jud=='SUPPORTED':
      supported.append({'item':ref,'studentRationale':rat}); continue
    pol,tw=twists(pid,Q['questionNumber'],ch)
    e={'item':ref,'stem':Q['stem'],'stemPolarity':pol,'chosen':{'position':ch,'text':text(ch)},'correct':ch==ans,
       'studentRationale':rat}
    if ch==ans: e['rationaleJudgment']=jud
    else:
      e['answer']={'position':ans,'text':text(ans)}
      if pol=='SELECT_INCORRECT':
        e['chosenIsTrueStatement']=True
        e['answerTwists']=twists(pid,Q['questionNumber'],ans)[1]
      else: e['chosenTwists']=tw
    entries.append(e)
  inp={'student':code,'evidenceEntries':entries,'supportedCorrectRationales':supported,'wrongWithoutRationale':omitted,'passages':{x:PUB[x] for x in sorted({e['item'].rsplit(' ',1)[0] for e in entries})}}
  json.dump(inp,open(f'{OUT}/inputs/{code}.json','w'),ensure_ascii=False,indent=1)
  print(code,name,len(entries),len(supported),len(omitted))
json.dump(key,open(os.path.join(OUT,'codes.json'),'w'))
