// Registro do service worker. Tolerante a ambientes sem suporte (ex.: file://).
// Caminho relativo para funcionar em subpath do GitHub Pages.

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // SW não funciona em file://; só registra sob http(s).
  if (!location.protocol.startsWith('http')) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Falha ao registrar o service worker:', err);
    });
  });
}
