import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const root = process.cwd();
const dir = path.join(root, 'docs/experiments/jev-v4-natural-agreement-v1-2026-09-29');
const requests = fs.readFileSync(path.join(dir, 'requests.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
const resultPath = path.join(dir, 'raw-results.jsonl');
const existing = fs.existsSync(resultPath)
  ? fs.readFileSync(resultPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
  : [];
const completed = new Set(existing.filter((row) => row.httpStatus === 200 && row.response?.ok).map((row) => row.requestId));
const endpoint = 'https://jevplayground.com/api/evaluate';
const paceMs = Number(process.env.JEV_PACE_MS ?? 7000);
const maxRateRetries = Number(process.env.JEV_RATE_RETRIES ?? 8);

function append(row) {
  fs.appendFileSync(resultPath, `${JSON.stringify(row)}\n`);
}

for (const [index, request] of requests.entries()) {
  if (completed.has(request.requestId)) continue;
  let retry = 0;
  while (true) {
    const started = Date.now();
    let response;
    let body;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.payload),
        signal: AbortSignal.timeout(45_000),
      });
      const text = await response.text();
      try { body = JSON.parse(text); } catch { body = { rawText: text }; }
    } catch (error) {
      append({
        requestId: request.requestId,
        caseId: request.caseId,
        payloadHash: request.payloadHash,
        attemptedAt: new Date().toISOString(),
        wallTimeMs: Date.now() - started,
        httpStatus: null,
        response: null,
        error: String(error),
        retry,
      });
      console.error(`${request.requestId}: network error ${String(error)}`);
      process.exitCode = 1;
      break;
    }

    const record = {
      requestId: request.requestId,
      caseId: request.caseId,
      paragraphId: request.paragraphId,
      responseStage: request.responseStage,
      payloadHash: request.payloadHash,
      attemptedAt: new Date().toISOString(),
      wallTimeMs: Date.now() - started,
      httpStatus: response.status,
      response: body,
      retry,
    };
    append(record);

    if (response.ok && body?.ok) {
      console.log(`[${index + 1}/${requests.length}] ${request.requestId}: 200 (${record.wallTimeMs} ms)`);
      break;
    }

    const code = body?.error?.code;
    const rateLimited = response.status === 429 || code === 'RATE_LIMIT' || code === 'LOCAL_RATE_LIMIT';
    if (!rateLimited || retry >= maxRateRetries) {
      console.error(`[${index + 1}/${requests.length}] ${request.requestId}: ${response.status} ${code ?? ''}`);
      if (response.status === 402 || code === 'USAGE_LIMIT') {
        console.error('Playground usage limit reached. Re-run this script later to resume.');
      }
      process.exitCode = 1;
      process.exit();
    }

    retry += 1;
    const retryAfterSeconds = Number(response.headers.get('retry-after'));
    const backoffMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? retryAfterSeconds * 1000
      : Math.min(60_000, 8_000 * (2 ** (retry - 1)));
    console.log(`${request.requestId}: rate limited; retry ${retry}/${maxRateRetries} after ${backoffMs} ms`);
    await delay(backoffMs);
  }
  await delay(paceMs);
}

