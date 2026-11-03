import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { ToastProvider } from './context/ToastContext';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <PreferencesProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </PreferencesProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
