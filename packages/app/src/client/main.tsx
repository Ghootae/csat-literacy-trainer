import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.js';
import { DialogueApp } from './DialogueApp.js';
import { ProblemApp } from './ProblemApp.js';
import { ProblemLabApp } from './ProblemLabApp.js';
import { SimpleDialogueApp } from './SimpleDialogueApp.js';
import { StudentFeedbackApp } from './StudentFeedbackApp.js';
import './styles.css';
import './dialogue-workbench.css';

const el = document.getElementById('root');
if (el === null) throw new Error('#root 없음');

// 공개 진입점은 학생용 연결 학습으로 고정한다. 기존 문단 훈련 UI는 회귀 확인을 위해
// `/legacy`에 보존하되, 루트 주소로 들어온 사용자가 구형 화면을 보지 않게 한다.
if (window.location.pathname === '/') {
  window.history.replaceState(null, '', `/dialogue${window.location.search}${window.location.hash}`);
}

// 옛 개발자 문제 풀이 주소(D-0173): 쿼리·해시를 유지한 채 새 주소로 바꾼다.
if (window.location.pathname === '/problem/dev/v4') {
  window.history.replaceState(null, '', `/problem/lab${window.location.search}${window.location.hash}`);
}
// 옛 단순 형식 문단 주소(D-0174)도 같은 방식으로 새 주소로 바꾼다.
if (window.location.pathname === '/dialogue/dev/simple') {
  window.history.replaceState(null, '', `/dialogue/lab${window.location.search}${window.location.hash}`);
}

createRoot(el).render(
  <StrictMode>
    {window.location.pathname.startsWith('/progress')
      ? <StudentFeedbackApp />
      : window.location.pathname === '/problem/lab'
      ? <ProblemLabApp />
      : window.location.pathname.startsWith('/problem')
      ? <ProblemApp />
      : window.location.pathname === '/dialogue/lab'
      ? <SimpleDialogueApp />
      : window.location.pathname.startsWith('/dialogue')
        ? <DialogueApp />
        : window.location.pathname.startsWith('/legacy')
          ? <App />
          : <DialogueApp />}
  </StrictMode>,
);
