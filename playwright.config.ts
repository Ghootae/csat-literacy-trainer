import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

export default defineConfig({
  testDir: './packages/app/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  outputDir: resolve(tmpdir(), 'csat-literacy-trainer-playwright'),
  use: {
    baseURL: 'http://127.0.0.1:5173',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run app:client -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
