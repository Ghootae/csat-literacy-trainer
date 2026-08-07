import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 클라이언트는 서버를 통해서만 채점에 접근한다 (계획서 D4 — 프로세스 경계).
// 개발 중에도 같은 경계를 유지하려고 /api를 프록시한다.
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: {
    host: '127.0.0.1', // 명시 바인딩 — 기본값은 IPv6만 잡을 수 있다
    port: 5173,
    proxy: { '/api': 'http://localhost:5174' },
  },
  build: { outDir: 'dist-client' },
});
