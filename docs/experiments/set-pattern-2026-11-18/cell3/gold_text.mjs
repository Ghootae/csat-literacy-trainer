// gold spec -> 읽기 판 글만 출력. 사용: node gold_text.mjs <spec.json>
import fs from 'node:fs';
import { renderBoth } from '/Users/mac/Projects/csat-literacy-problem-solving-mvp/docs/experiments/deep-item-v5-2026-11-18/graph/render.mjs';
console.log(renderBoth(JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))).text);
