import { afterEach, expect, it } from 'vitest';
import { once } from 'node:events';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { request, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createLearningServer } from './index.js';

const servers: Server[] = [];
afterEach(async () => {
  delete process.env['CSAT_ANALYSIS_VIEW_PATH'];
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    if (!server.listening) { resolve(); return; }
    server.close(error => error ? reject(error) : resolve()); server.closeAllConnections();
  })));
});

async function start(developerMode: boolean): Promise<number> {
  const server = createLearningServer({ developerMode, warmer: () => Promise.resolve() });
  servers.push(server); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  return (server.address() as AddressInfo).port;
}
// fetch는 Host 헤더를 바꿀 수 없어 http.request로 공개 호스트 요청을 흉내 낸다.
function get(port: number, path: string, host: string, method = 'GET'): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, method, headers: { host } }, res => {
      let body = ''; res.on('data', c => { body += String(c); }); res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', reject); req.end();
  });
}

it('serves the prebuilt analysis view only to loopback developer requests', async () => {
  const file = join(mkdtempSync(join(tmpdir(), 'analysis-view-http-')), 'view-data.json');
  writeFileSync(file, '{"passages":[]}');
  process.env['CSAT_ANALYSIS_VIEW_PATH'] = file;
  const port = await start(true);
  const path = '/api/developer/dialogue-analysis/view';
  expect(await get(port, path, `127.0.0.1:${port}`)).toEqual({ status: 200, body: '{"passages":[]}' });
  expect((await get(port, path, 'example.trycloudflare.com')).status).toBe(404);
  expect((await get(port, path, `127.0.0.1:${port}`, 'POST')).status).toBe(404);
  expect((await get(port, `${path}/x`, `127.0.0.1:${port}`)).status).toBe(404);
});

it('reports a missing view file and respects developer mode', async () => {
  process.env['CSAT_ANALYSIS_VIEW_PATH'] = join(tmpdir(), 'analysis-view-missing', 'none.json');
  const port = await start(true);
  const missing = await get(port, '/api/developer/dialogue-analysis/view', `127.0.0.1:${port}`);
  expect(missing.status).toBe(404);
  expect(missing.body).toContain('scripts/build-analysis-view.mjs');
  const closed = await start(false);
  expect((await get(closed, '/api/developer/dialogue-analysis/view', `127.0.0.1:${closed}`)).status).toBe(403);
});
