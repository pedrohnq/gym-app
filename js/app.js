// Ponto de entrada: bootstrap e orquestração. Ver docs/02-technical-spec.md §3.

import { registerServiceWorker } from './pwa.js';
import { loadWorkouts } from './data.js';
import { WorkoutClock, RestTimer, formatClock } from './timer.js';
import { render, updateClock } from './ui/render.js';
import * as store from './state.js';

// --- Cronômetro do treino (do treino selecionado) ----------------------------
const clock = new WorkoutClock((s) => updateClock(s)).bind(() => store.currentWorkoutSession());

// --- Timer de descanso + controlador (atualiza o painel por id) --------------
function restEls() {
  return {
    panel: document.getElementById('rest-panel'),
    time: document.getElementById('rest-time'),
    bar: document.getElementById('rest-bar'),
    toggle: document.getElementById('rest-toggle'),
  };
}

const restTimer = new RestTimer({
  onTick: (remaining, total) => {
    const { time, bar, toggle } = restEls();
    const ending = remaining <= 10;
    if (time) {
      time.textContent = formatClock(remaining);
      time.classList.toggle('is-ending', ending);
    }
    if (bar) {
      bar.style.width = `${total ? Math.max(0, (remaining / total) * 100) : 0}%`;
      bar.classList.toggle('is-ending', ending);
    }
    if (toggle) toggle.textContent = restTimer.running ? 'Pausar' : 'Retomar';
  },
  onDone: () => showRestPanel(false),
});

function showRestPanel(visible) {
  const { panel } = restEls();
  if (panel) panel.hidden = !visible;
}

const rest = {
  start(seconds) { restTimer.start(seconds); showRestPanel(true); },
  toggle() { restTimer.running ? restTimer.pause() : restTimer.resume(); },
  add(seconds) { restTimer.add(seconds); },
  skip() { restTimer.skip(); showRestPanel(false); },
  cancel() { restTimer.cancel(); showRestPanel(false); },
  isActive() { return restTimer.active; },
  isRunning() { return restTimer.running; },
  remaining() { return restTimer.remaining(); },
};

// --- Ações expostas à view ---------------------------------------------------
const actions = {
  // seleção / navegação
  listWorkouts: store.listWorkouts,
  weekOverview: store.weekOverview,
  workoutStatus: store.workoutStatus,
  selectWorkout: store.selectWorkout,
  startWorkout: store.startWorkout,
  isStarted: store.isStarted,
  isFinished: store.isFinished,
  discardWorkout: store.discardWorkout,
  goToIndex: store.goToIndex,
  currentWorkout: store.currentWorkout,
  currentWorkoutSession: store.currentWorkoutSession,
  openFocus: store.openFocus,
  setView: store.setView,
  focusNext: store.focusNext,
  focusPrev: store.focusPrev,
  // progresso / derivados
  progressCounts: store.progressCounts,
  allCompleted: store.allCompleted,
  getProgress: store.getProgress,
  // registros
  getRecord: store.getRecord,
  setWeight: store.setWeight,
  setNote: store.setNote,
  // séries / conclusão
  markSetDone: store.markSetDone,
  undoSet: store.undoSet,
  completeExercise: store.completeExercise,
  uncompleteExercise: store.uncompleteExercise,
  finishWorkout: store.finishWorkout,
  resetSession: store.resetSession,
};

// ctx.state é sempre o estado atual (getter).
const ctx = {
  actions,
  rest,
  onRetry: boot,
  get state() { return store.getState(); },
};

// --- Bootstrap ---------------------------------------------------------------
store.subscribe(() => render(ctx));

async function boot() {
  store.setView('loading');
  try {
    const data = await loadWorkouts();
    store.init(data);
    clock.start();
  } catch (err) {
    store.setError(err?.message || 'Erro ao carregar o treino.');
  }
}

registerServiceWorker();
render(ctx);
boot();
