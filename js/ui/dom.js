// Helpers de DOM. A camada de view não conhece dados de treino.

/**
 * Cria um elemento.
 * @param {string} tag
 * @param {object} [props]  className, text, html, attrs{}, dataset{}, on{}, ...
 * @param {(Node|string|null)[]} [children]
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  const { className, text, html, attrs, dataset, on, ...rest } = props;

  if (className) node.className = className;
  if (text != null) node.textContent = text;
  if (html != null) node.innerHTML = html;

  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    node.setAttribute(k, v === true ? '' : String(v));
  }
  if (dataset) for (const [k, v] of Object.entries(dataset)) node.dataset[k] = v;
  if (on) for (const [evt, fn] of Object.entries(on)) node.addEventListener(evt, fn);

  for (const [k, v] of Object.entries(rest)) {
    if (v != null) node[k] = v;
  }

  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function mount(container, ...nodes) {
  clear(container);
  for (const n of nodes) if (n) container.appendChild(n);
}

/** Ícone SVG inline por nome (herda currentColor). */
export function icon(name) {
  const paths = {
    back: '<path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    check: '<path d="M4 12l5 5L20 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    pause: '<path d="M8 5v14M16 5v14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    play: '<path d="M7 5l12 7-12 7z" fill="currentColor"/>',
    skip: '<path d="M6 5l9 7-9 7zM18 5v14" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>',
    plus: '<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    rest: '<path d="M4 18h16M7 18V9a5 5 0 0110 0v9M9 6l6-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    dumbbell: '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    trash: '<path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13M10 11v6M14 11v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    chevron: '<path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  };
  const svg = `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">${paths[name] || ''}</svg>`;
  return el('span', { className: 'icon', html: svg });
}

// Notificação transitória (toast). Independente do fluxo de render.
let toastTimer = null;
export function toast(message) {
  let host = document.getElementById('toast');
  if (!host) {
    host = el('div', { attrs: { id: 'toast', role: 'status', 'aria-live': 'polite' } });
    document.body.appendChild(host);
  }
  host.textContent = message;
  // reinicia a animação de entrada
  host.classList.remove('toast--show');
  void host.offsetWidth;
  host.classList.add('toast--show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => host.classList.remove('toast--show'), 2600);
}
