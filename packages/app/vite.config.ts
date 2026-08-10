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
    // 터널(localhost.run 등)은 임의의 Host 헤더로 들어온다. 막으면 502가 난다.
    allowedHosts: true,
    // 대상도 127.0.0.1로 못박는다. `localhost`로 두면 Node 24의 Happy Eyeballs가
    // 이중 스택(tcp46) 리스너를 상대로 멈춰서 /api 요청이 응답 없이 매달린다.
    proxy: { '/api': 'http://127.0.0.1:5174' },
  },
  build: { outDir: 'dist-client' },
});
