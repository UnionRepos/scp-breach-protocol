(() => {
  const installButton = document.getElementById('installBtn');
  let deferredPrompt = null;
  const showInstall = () => { if (installButton) installButton.hidden = false; };

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    showInstall();
  });
  installButton?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installButton.hidden = true;
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (installButton) installButton.hidden = true;
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js', {scope: './'});
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              document.dispatchEvent(new CustomEvent('pwa-update-ready'));
            }
          });
        });
      } catch (error) {
        console.warn('PWA offline support unavailable', error);
      }
    });
  }
})();
