import { afterEach, expect, it } from 'vitest';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createLearningServer } from './index.js';

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    if (!server.listening) { resolve(); return; }
    server.close(error => error ? reject(error) : resolve()); server.closeAllConnections();
  })));
});
it('protects inspection with server developer mode, without changing the public view', async () => {
  for (const developerMode of [false, true]) {
    const server = createLearningServer({ developerMode, warmer: () => Promise.resolve() });
    servers.push(server); server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const root = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const started = await fetch(`${root}/api/problem/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ questionId: 'mrna-vaccine-lipid-nanoparticle-q19' }) });
    const view = await started.json() as { sessionId: string };
    expect(view).not.toHaveProperty('evaluations');
    const response = await fetch(`${root}/api/developer/problem-inspect?sessionId=${view.sessionId}`);
    expect(response.status).toBe(developerMode ? 200 : 403);
    if (developerMode) expect(await response.json()).toMatchObject({ session: view, evaluations: [] });
  }
});
