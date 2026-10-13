import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const root='docs/experiments/axis-candidate-jev-five-passages-2026-10-02';
const jobs=JSON.parse(readFileSync(`${root}/jev-requests.json`,'utf8'));
const ids=[...new Set(jobs.map(j=>j.paragraphId))];let prior=0;
while(true){const complete=ids.filter(id=>jobs.filter(j=>j.paragraphId===id).every(j=>{if(!existsSync(`${root}/${j.id}-jev.json`))return false;const r=JSON.parse(readFileSync(`${root}/${j.id}-jev.json`));return r.status===200&&!r.error;}));if(complete.length>prior){execFileSync(process.execPath,['scripts/finalize-axis-jev-five-passages.mjs','select'],{stdio:'inherit'});execFileSync(process.execPath,['scripts/finalize-axis-jev-five-passages.mjs','level2-merge'],{stdio:'inherit'});prior=complete.length;console.log(JSON.stringify({evaluatedParagraphs:prior,total:ids.length}));}if(complete.length===ids.length)break;await new Promise(resolve=>setTimeout(resolve,25000));}
