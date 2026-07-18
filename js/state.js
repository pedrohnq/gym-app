// Estado único: seleção de treino + progresso POR treino no dia + records.
// O usuário escolhe qual treino fazer; cada treino guarda seu próprio progresso.
// Ver docs/02-technical-spec.md §6-§7 e docs/04-ux-spec.md.

import { STORAGE_KEYS } from './config.js';
import {
  dateKey,
  resolveWorkout,
  listWorkouts as scheduleList,
  weekOverview as scheduleWeek,
} from './schedule.js';
import { readJSON, writeJSON, remove, storageAvailable } from './storage.js';

const listeners = new Set();

/** @type {any} */
const state = {
  data: null,     // treino carregado (imutável)
  records: {},    // { [exerciseId]: { weight, note } }
  session: null,  // { dateKey, workouts: { [key]: {startedAt, finishedAt, progress} } }
  ui: { view: 'loading', selectedKey: null, focusIndex: 0 },
  error: null,
};

// ---- assinatura / notificação ----------------------------------------------

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) fn(state);
}

export function getState() {
  return state;
}

export function isPersistent() {
  return storageAvailable();
}

// ---- persistência -----------------------------------------------------------

function persistRecords() {
  writeJSON(STORAGE_KEYS.records, state.records);
}

function persistSession() {
  if (state.session) writeJSON(STORAGE_KEYS.session, state.session);
}

// ---- helpers de treino ------------------------------------------------------

function resolveByKey(key) {
  return key == null ? null : resolveWorkout(state.data, Number(key));
}

export function currentWorkout() {
  return resolveByKey(state.ui.selectedKey);
}

/** Sessão do treino selecionado (startedAt/finishedAt/progress). */
export function currentWorkoutSession() {
  const key = state.ui.selectedKey;
  return key == null ? null : state.session?.workouts?.[key] || null;
}

export function listWorkouts() {
  return state.data ? scheduleList(state.data) : [];
}

export function weekOverview() {
  return state.data ? scheduleWeek(state.data) : [];
}

function buildProgress(workout) {
  const progress = {};
  for (const item of workout.items) {
    progress[item.exerciseId] = { setsDone: 0, completed: false };
  }
  return progress;
}

/** Cria (ou reconcilia com o JSON atual) a sessão de um treino. */
function ensureWorkout(key) {
  const workout = resolveByKey(key);
  if (!workout) return;
  const existing = state.session.workouts[key];
  if (!existing) {
    state.session.workouts[key] = {
      startedAt: Date.now(),
      finishedAt: null,
      progress: buildProgress(workout),
    };
  } else {
    const progress = {};
    for (const item of workout.items) {
      const prev = existing.progress?.[item.exerciseId];
      progress[item.exerciseId] = {
        setsDone: prev && Number.isFinite(prev.setsDone) ? prev.setsDone : 0,
        completed: !!(prev && prev.completed),
      };
    }
    existing.progress = progress;
  }
  persistSession();
}

// ---- inicialização ----------------------------------------------------------

/** Hidrata a partir dos dados e do LocalStorage. Sempre abre no índice (lista). */
export function init(data) {
  state.data = data;
  state.records = readJSON(STORAGE_KEYS.records, {}) || {};

  const todayKey = dateKey();
  const saved = readJSON(STORAGE_KEYS.session, null);

  if (saved && saved.dateKey === todayKey && saved.workouts && typeof saved.workouts === 'object') {
    // Mesmo dia: mantém o progresso por treino já registrado.
    state.session = saved;
  } else {
    // Novo dia (ou sem sessão): começa limpo. Records permanecem.
    state.session = { dateKey: todayKey, workouts: {} };
    persistSession();
  }

  state.ui.selectedKey = null;
  state.ui.view = 'index';
  notify();
}

export function setError(message) {
  state.error = message;
  state.ui.view = 'error';
  notify();
}

// ---- navegação --------------------------------------------------------------

export function setView(view) {
  state.ui.view = view;
  notify();
}

export function goToIndex() {
  state.ui.selectedKey = null;
  state.ui.view = 'index';
  notify();
}

export function selectWorkout(key) {
  if (!resolveByKey(key)) return;
  // Não inicia o treino aqui: abre em modo preview (sem cronômetro).
  state.ui.selectedKey = key;
  state.ui.focusIndex = 0;
  state.ui.view = 'home';
  notify();
}

/** Inicia efetivamente o treino selecionado (cria a sessão e dispara o cronômetro). */
export function startWorkout() {
  const key = state.ui.selectedKey;
  if (!key) return;
  if (!state.session.workouts[key]) ensureWorkout(key); // startedAt = agora
  state.ui.view = 'home';
  notify();
}

/** true se o treino selecionado já foi iniciado hoje. */
export function isStarted() {
  const key = state.ui.selectedKey;
  return !!(key && state.session.workouts[key]);
}

/** true se o treino selecionado já foi finalizado hoje. */
export function isFinished() {
  return !!currentWorkoutSession()?.finishedAt;
}

/** Remove o progresso salvo de um treino (abandona em andamento ou limpa concluído). */
export function discardWorkout(key) {
  if (state.session?.workouts?.[key]) {
    delete state.session.workouts[key];
    persistSession();
    if (state.ui.selectedKey === key) {
      state.ui.selectedKey = null;
      state.ui.view = 'index';
    }
    notify();
  }
}

export function openFocus(index) {
  state.ui.focusIndex = clampIndex(index);
  state.ui.view = 'focus';
  notify();
}

export function focusNext() {
  const total = currentWorkout()?.items.length ?? 0;
  const next = state.ui.focusIndex + 1;
  if (next < total) {
    state.ui.focusIndex = next;
  } else {
    state.ui.view = 'home';
  }
  notify();
}

export function focusPrev() {
  state.ui.focusIndex = clampIndex(state.ui.focusIndex - 1);
  notify();
}

function clampIndex(i) {
  const max = (currentWorkout()?.items.length ?? 1) - 1;
  return Math.max(0, Math.min(max, i));
}

// ---- progresso (do treino selecionado) --------------------------------------

function progressMap() {
  return currentWorkoutSession()?.progress || null;
}

function itemFor(exerciseId) {
  return currentWorkout()?.items.find((it) => it.exerciseId === exerciseId);
}

export function getProgress(exerciseId) {
  return progressMap()?.[exerciseId] || { setsDone: 0, completed: false };
}

export function markSetDone(exerciseId) {
  const p = progressMap()?.[exerciseId];
  const item = itemFor(exerciseId);
  if (!p || !item) return;
  if (p.setsDone < item.sets) {
    p.setsDone += 1;
    persistSession();
    notify();
  }
}

export function undoSet(exerciseId) {
  const p = progressMap()?.[exerciseId];
  if (!p) return;
  if (p.setsDone > 0) {
    p.setsDone -= 1;
    if (p.completed) p.completed = false;
    persistSession();
    notify();
  }
}

export function completeExercise(exerciseId) {
  const p = progressMap()?.[exerciseId];
  if (!p) return;
  p.completed = true;
  persistSession();
  notify();
}

export function uncompleteExercise(exerciseId) {
  const p = progressMap()?.[exerciseId];
  if (!p) return;
  p.completed = false;
  persistSession();
  notify();
}

// ---- registros (cargas / observações) — permanentes -------------------------

export function setWeight(exerciseId, weight) {
  const rec = state.records[exerciseId] || {};
  rec.weight = weight;
  state.records[exerciseId] = rec;
  persistRecords();
}

export function setNote(exerciseId, note) {
  const rec = state.records[exerciseId] || {};
  rec.note = note;
  state.records[exerciseId] = rec;
  persistRecords();
}

export function getRecord(exerciseId) {
  return state.records[exerciseId] || { weight: '', note: '' };
}

// ---- sessão do treino selecionado -------------------------------------------

export function finishWorkout() {
  const wo = currentWorkoutSession();
  if (!wo) return;
  wo.finishedAt = Date.now();
  persistSession();
  // Volta para a lista da semana (a notificação é disparada pela view).
  state.ui.selectedKey = null;
  state.ui.view = 'index';
  notify();
}

/** Reinicia SOMENTE o treino selecionado (não afeta outros nem os records). */
export function resetSession() {
  const key = state.ui.selectedKey;
  const workout = resolveByKey(key);
  if (!workout) return;
  state.session.workouts[key] = {
    startedAt: Date.now(),
    finishedAt: null,
    progress: buildProgress(workout),
  };
  persistSession();
  state.ui.focusIndex = 0;
  state.ui.view = 'home';
  notify();
}

// ---- derivados --------------------------------------------------------------

export function progressCounts() {
  const w = currentWorkout();
  if (!w) return { done: 0, total: 0 };
  const map = progressMap();
  let done = 0;
  if (map) for (const item of w.items) if (map[item.exerciseId]?.completed) done += 1;
  return { done, total: w.items.length };
}

export function allCompleted() {
  const { done, total } = progressCounts();
  return total > 0 && done === total;
}

/** Status de um treino para a lista (índice): progresso e se finalizado. */
export function workoutStatus(key) {
  const w = resolveByKey(key);
  if (!w) return { done: 0, total: 0, started: false, finished: false };
  const wo = state.session?.workouts?.[key];
  const total = w.items.length;
  if (!wo) return { done: 0, total, started: false, finished: false };
  let done = 0;
  for (const item of w.items) if (wo.progress[item.exerciseId]?.completed) done += 1;
  return { done, total, started: true, finished: !!wo.finishedAt };
}

/** Reset total (apaga a sessão do dia). Mantido para casos de dado corrompido. */
export function clearSession() {
  remove(STORAGE_KEYS.session);
  state.session = { dateKey: dateKey(), workouts: {} };
  persistSession();
}
