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
if (process.env.CSAT_DEVELOPER_MODE === '1') {
  children.push(spawn(process.execPath, ['packages/app/dist/server/problem-feedback-v4-entry.js'], { stdio: 'inherit', env: process.env }));
}

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
if (process.env.CSAT_DEVELOPER_MODE === '1') {
  console.log('개인 개발자 UI: http://127.0.0.1:5173/dialogue/dev (인증 없음 · 골드 노출 · 개인 테스트 전용)');
}
if (process.env.CSAT_STUDENT_FEEDBACK_ENABLED === '1') {
  console.log('학생 피드백: http://127.0.0.1:5173/progress (기본 로컬 전용)');
  if (process.env.CSAT_STUDENT_FEEDBACK_PUBLIC === '1') {
    console.warn('경고: 학생 피드백이 공개 Host에도 노출됩니다. 인증 없는 환경에서는 사용하지 마세요.');
  }
}
