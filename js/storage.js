// Wrapper de LocalStorage com degradação graciosa (modo privado/cota).
// Ver docs/02-technical-spec.md §6.

let available = null; // lazy: true/false após primeiro teste

function isAvailable() {
  if (available !== null) return available;
  try {
    const k = '__gymapp_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    available = true;
  } catch {
    available = false;
  }
  return available;
}

export function storageAvailable() {
  return isAvailable();
}

export function readJSON(key, fallback = null) {
  if (!isAvailable()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    // Dado corrompido: ignora com segurança.
    return fallback;
  }
}

export function writeJSON(key, value) {
  if (!isAvailable()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key) {
  if (!isAvailable()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}
