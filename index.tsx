
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/tailwind.css';
import { waitAuthReady } from './lib/waitAuthReady';

if ('serviceWorker' in navigator) {
  const registerServiceWorker = () => {
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state !== 'installed' || !navigator.serviceWorker.controller) return;
            const acceptUpdate = window.confirm('Вышло обновление. Обновить сейчас?');
            if (!acceptUpdate) return;
            registration.waiting?.postMessage('SKIP_WAITING');
            const onControllerChange = () => {
              navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
              window.location.reload();
            };
            navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
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
