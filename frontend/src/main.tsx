import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { CertificatePage } from './pages/public/CertificatePage';
import { initTelegramApp } from './lib/telegram';
import './styles/index.css';
import { initTheme } from './lib/theme';
import { initPwa } from './lib/pwa';

initTelegramApp();
initTheme();
initPwa();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

// Ochiq sertifikat sahifasi — kirish (login) talab qilinmaydi
const certMatch = window.location.pathname.match(/^\/certificate\/([A-Za-z0-9]{6,16})\/?$/);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {certMatch ? (
      <CertificatePage code={certMatch[1]} />
    ) : (
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    )}
  </StrictMode>,
);
