import { createLearningServer } from './index.js';

// Separate listener so problem lab UI work does not invalidate live paragraph/v3 sessions.
const port = Number(process.env['CSAT_PROBLEM_LAB_API_PORT'] ?? process.env['CSAT_PROBLEM_V4_API_PORT'] ?? 5175);
createLearningServer({ port }).listen(port, '127.0.0.1', () => {
  console.log(`개발자 문제 풀이 API http://127.0.0.1:${port}`);
  if ((process.env['CSAT_PROBLEM_LAB_PUBLIC'] ?? process.env['CSAT_PROBLEM_V4_PUBLIC']) === '1') console.log('dialogue.cogaxis.net 개발자 문제 풀이 접근 허용 (인증 없음 · 사용자 승인 테스트용)');
});
