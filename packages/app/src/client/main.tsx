import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.js';
import './styles.css';

const el = document.getElementById('root');
if (el === null) throw new Error('#root 없음');
createRoot(el).render(
  <StrictMode>
    <App paragraphId="nietzsche-p1" />
  </StrictMode>,
);
