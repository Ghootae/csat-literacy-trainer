import { spawn } from 'node:child_process';

const children = [
  spawn(process.execPath, ['packages/app/dist/server/index.js'], {
    stdio: 'inherit',
    env: process.env,
  }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--config', 'packages/app/vite.config.ts'], {
    stdio: 'inherit',
    env: process.env,
  }),
];

let closing = false;
function close(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (!closing && code !== 0) {
      console.error(`로컬 UI 프로세스 종료: ${signal ?? code}`);
      close(code ?? 1);
    }
  });
}

process.on('SIGINT', () => close());
process.on('SIGTERM', () => close());

console.log('자유 응답 UI: http://127.0.0.1:5173/dialogue');
