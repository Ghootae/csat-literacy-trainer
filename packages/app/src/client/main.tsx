import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.js';
import { DialogueApp } from './DialogueApp.js';
import { ProblemApp } from './ProblemApp.js';
import './styles.css';

const el = document.getElementById('root');
if (el === null) throw new Error('#root 없음');
createRoot(el).render(
  <StrictMode>
    {window.location.pathname.startsWith('/problem')
      ? <ProblemApp />
      : window.location.pathname.startsWith('/dialogue')
        ? <DialogueApp />
        : <App />}
  </StrictMode>,
);
