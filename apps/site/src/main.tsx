import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.tsx';
import { ThemeProvider } from './theme/ThemeContext.tsx';
import { PageReveal } from './components/PageReveal.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <PageReveal>
        <App />
      </PageReveal>
    </ThemeProvider>
  </React.StrictMode>,
);

