import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createLedger } from './test-v5-live-connection.mjs';
test('shared ledger reserves the first concurrent request before admitting the second',async()=>{
  let sends=0,release;const waiting=new Promise(resolve=>{release=resolve;});
  const path=join(mkdtempSync(join(tmpdir(),'v5-shared-ledger-')),'ledger.jsonl');
  const ledger=createLedger(path,{async create(){sends++;await waiting;return {status:'completed',usage:{input_tokens:10,output_tokens:10}};}},{mock:{requests:1,usd:100,input:1,output:1}});
  const request={model:'mock',max_output_tokens:100};
  const first=ledger.send(request,{},'A');
  await assert.rejects(ledger.send(request,{},'B'),/RUN_LIMIT/);
  assert.equal(sends,1);release();await first;
  assert.equal(ledger.rows.filter(r=>r.event==='START').length,1);assert.equal(ledger.rows.filter(r=>r.event==='END').length,1);
});
