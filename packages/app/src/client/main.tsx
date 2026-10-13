import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.js';
import { DialogueApp } from './DialogueApp.js';
import { ProblemApp } from './ProblemApp.js';
import { ProblemFeedbackV4App } from './ProblemFeedbackV4App.js';
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

createRoot(el).render(
  <StrictMode>
    {window.location.pathname.startsWith('/progress')
      ? <StudentFeedbackApp />
      : window.location.pathname === '/problem/dev/v4'
      ? <ProblemFeedbackV4App />
      : window.location.pathname.startsWith('/problem')
      ? <ProblemApp />
      : window.location.pathname.startsWith('/dialogue')
        ? <DialogueApp />
        : window.location.pathname.startsWith('/legacy')
          ? <App />
          : <DialogueApp />}
  </StrictMode>,
);
