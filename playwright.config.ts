import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const clientPort = Number(process.env['PLAYWRIGHT_CLIENT_PORT'] ?? 5173);

export default defineConfig({
  testDir: './packages/app/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  outputDir: resolve(tmpdir(), 'csat-literacy-trainer-playwright'),
  use: {
    baseURL: `http://127.0.0.1:${clientPort}`,
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run app:client -- --host 127.0.0.1 --port ${clientPort}`,
    url: `http://127.0.0.1:${clientPort}`,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
