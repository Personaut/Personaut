import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log('[Personaut] Webview script loaded');

const rootElement = document.getElementById('root');
console.log('[Personaut] Root element:', rootElement);

if (rootElement) {
  const root = createRoot(rootElement);
  console.log('[Personaut] React root created, rendering App...');
  root.render(<App />);
} else {
  console.error('[Personaut] ERROR: Root element not found!');
}
