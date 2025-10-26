
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/tailwind.css';
import { waitAuthReady } from './lib/waitAuthReady';

if ('serviceWorker' in navigator) {
  const registerServiceWorker = () => {
    const swPath = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker
      .register(swPath, { scope: import.meta.env.BASE_URL, updateViaCache: 'none' })
      .then((registration) => {
        let refreshing = false;

        const reloadOnce = () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        };

        const forceActivation = () => {
          registration.waiting?.postMessage('SKIP_WAITING');
        };

        navigator.serviceWorker.addEventListener('controllerchange', reloadOnce);

        if (registration.waiting) {
          forceActivation();
          return;
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              forceActivation();
            }
          });
        });
      })
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });
  };

  window.addEventListener('load', registerServiceWorker);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const renderFallback = () => {
  root.render(
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <p>Загрузка...</p>
    </div>
  );
};

const bootstrap = async () => {
  renderFallback();
  try {
    await waitAuthReady();
  } catch (error) {
    console.error('Не удалось восстановить сессию:', error);
  }
  root.render(<App />);
};

void bootstrap();
