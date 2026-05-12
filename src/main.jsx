import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CosmeticsProvider } from './context/CosmeticsContext.jsx';
import { mtgTheme } from './theme/mtgTheme.js';
import './styles/global.css';

console.info('Router mounted.');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={mtgTheme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <CosmeticsProvider>
            <App />
          </CosmeticsProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
