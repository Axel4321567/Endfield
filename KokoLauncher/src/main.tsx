import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Configuración de desarrollo
if (import.meta.env.DEV) {
  console.log('🚀 Koko Launcher iniciado en modo desarrollo');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);