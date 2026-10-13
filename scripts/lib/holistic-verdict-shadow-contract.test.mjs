import test from 'node:test';
import assert from 'node:assert/strict';
import {validateShadow,validateAttribution,shouldAttribute,effectiveShadow,summarizeV4,reviewFlag} from './holistic-verdict-shadow-contract.mjs';
const dialogue=[{role:'student',text:'물이 나뉘어 실이 된다.'},{role:'tutor_question',text:'명은 실을 만드는가?'},{role:'student',text:'명은 이름이다.'}];
const good=()=>({overall:'unresolved',understoodRelations:['학생이 표현한 관계'],brokenRelation:{description:'문제가 있는 관계',studentQuote:'물이 나뉘어 실이 된다.',kind:'incorrect'},
  unconfirmed:['확인되지 않은 의미'],questionWorthy:true,question:'관계를 설명해 줄 수 있나요?',confidence:'medium'});
const resolved=()=>({...good(),overall:'resolved',brokenRelation:null,questionWorthy:false,question:null});
const axes=[{id:'AX1',description:'관계1'},{id:'AX2',description:'관계2'}];

test('valid resolved/unresolved; unresolved need not ask; missing/inter-axis-relation may lack quotation',()=>{
  assert.deepEqual(validateShadow(resolved(),dialogue),[]);assert.deepEqual(validateShadow(good(),dialogue),[]);
  for(const kind of ['missing','inter-axis-relation']) {
    const raw={...good(),questionWorthy:false,question:null,brokenRelation:{...good().brokenRelation,kind,studentQuote:null}};
    assert.deepEqual(validateShadow(raw,dialogue),[]);
  }
});
test('quote permits only whitespace normalization within a single student utterance',()=>{
  const raw=good();raw.brokenRelation.studentQuote='물이\n  나뉘어 실이 된다.';assert.deepEqual(validateShadow(raw,dialogue),[]);
  for(const quote of ['명은 실을 만드는가?','실이 된다. 명은 이름이다.','물이 나누어 실이 된다.',' ','없는 인용']) {
    raw.brokenRelation.studentQuote=quote;assert.ok(validateShadow(raw,dialogue).length,quote);
  }
});
test('resolved invariants reject broken relation, question and questionWorthy independently',()=>{
  for(const patch of [{brokenRelation:good().brokenRelation},{questionWorthy:true},{question:'묻는다'}])assert.ok(validateShadow({...resolved(),...patch},dialogue).length);
});
test('unresolved must identify broken relation, and incorrect must quote student',()=>{
  assert.ok(validateShadow({...good(),brokenRelation:null},dialogue).length);
  const raw=good();raw.brokenRelation.studentQuote=null;assert.ok(validateShadow(raw,dialogue).some(e=>e.includes('incorrect')));
});
test('questionWorthy controls question nullability and nonempty text',()=>{
  for(const patch of [{question:null},{question:''},{question:'  '},{questionWorthy:false}])assert.ok(validateShadow({...good(),...patch},dialogue).length);
});
test('strict schema catches missing, extra, wrong types, invalid enums and attribution on shadow',()=>{
  for(const change of [r=>{delete r.confidence;},r=>{r.overall='PASS';},r=>{r.confidence='sure';},r=>{r.unconfirmed=null;},r=>{r.questionWorthy='true';},
    r=>{r.axisAttribution=['AX1'];},r=>{r.brokenRelation.kind='other';},r=>{r.brokenRelation.extra=true;}]) {
    const raw=good();change(raw);assert.ok(validateShadow(raw,dialogue).length);
  }
});
test('attribution validates every ID, nested arrays, length and strict schema',()=>{
  const raw={axisAttribution:['AX1','AX2'],unconfirmedAttribution:[[]],reason:'귀속 이유'};
  assert.deepEqual(validateAttribution(raw,axes,['미확인']),[]);
  for(const patch of [{axisAttribution:['AX9']},{unconfirmedAttribution:[['AX9']]},{unconfirmedAttribution:[]},{unconfirmedAttribution:[['AX1'],[]]},
    {unconfirmedAttribution:['AX1']},{reason:null},{extra:true}])assert.ok(validateAttribution({...raw,...patch},axes,['미확인']).length);
  assert.deepEqual(validateAttribution({...raw,axisAttribution:[],unconfirmedAttribution:[]},axes,[]),[]);
});
test('attribution only follows a contract-valid unresolved shadow',()=>{
  assert.equal(shouldAttribute(good(),[]),true);assert.equal(shouldAttribute(resolved(),[]),false);
  assert.equal(shouldAttribute(good(),['quote mismatch']),false);assert.equal(shouldAttribute(null,['parse error']),false);
});
test('V4 paragraph summary preserves UNCLEAR_OK and excludes contract failures',()=>{
  assert.equal(summarizeV4([{status:'PASS'},{status:'UNCLEAR_OK'}]),'resolved');
  for(const status of ['ERROR','UNCLEAR_SERIOUS'])assert.equal(summarizeV4([{status:'PASS'},{status}]),'unresolved');
  for(const axes of [null,[],[{status:'OTHER'}]])assert.equal(summarizeV4(axes),'contract-failed');
  assert.equal(summarizeV4([{status:'PASS'}],'contract error'),'contract-failed');
});
test('retraction changes only valid unquoted unresolved shadow against resolved V4',()=>{
  const raw=good();raw.brokenRelation={...raw.brokenRelation,kind:'missing',studentQuote:null};
  assert.deepEqual(effectiveShadow(raw,[],'resolved'),{rawOverall:'unresolved',effectiveOverall:'resolved',retracted:true});
  assert.equal(effectiveShadow(raw,[],'unresolved').effectiveOverall,'unresolved');
  assert.equal(effectiveShadow(good(),[],'resolved').effectiveOverall,'unresolved');
  assert.equal(effectiveShadow(raw,['failure'],'resolved').effectiveOverall,'contract-failed');
});
test('reviewFlag requires an ERROR axis with an exact student error citation and resolved shadow',()=>{
  const v4={axes:[{axisId:'AX1',status:'ERROR'}],errorClaims:[{axisId:'AX1',evidence:dialogue[0].text}]};
  assert.equal(reviewFlag(v4,resolved(),[],dialogue),true);
  assert.equal(reviewFlag(v4,good(),[],dialogue),false);assert.equal(reviewFlag(v4,resolved(),['failure'],dialogue),false);
  for(const errorClaims of [[],[{axisId:'AX2',evidence:dialogue[0].text}],[{axisId:'AX1',evidence:dialogue[1].text}]])assert.equal(reviewFlag({...v4,errorClaims},resolved(),[],dialogue),false);
});
