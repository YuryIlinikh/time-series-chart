import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Demo } from './demo/Demo';
import './demo/demo.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
