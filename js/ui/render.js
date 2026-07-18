// Renderização das telas a partir do estado. Fluxo unidirecional.
// Ver docs/04-ux-spec.md.

import { el, mount, icon, toast } from './dom.js';
import { exerciseCard } from './exercise-card.js';
import { renderFocus } from './focus-mode.js';
import { formatClock } from '../timer.js';

const screen = document.getElementById('screen');
const header = document.getElementById('app-header');
const titleEl = document.getElementById('workout-title');
const clockEl = document.getElementById('workout-clock');
const progressFill = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');
const progressBar = header.querySelector('.progress');

function updateHeader(ctx) {
  const { actions, state } = ctx;
  const workout = actions.currentWorkout();
  const showHeader = ['home', 'focus'].includes(state.ui.view) && workout;
  header.hidden = !showHeader;
  if (!showHeader) return;

  titleEl.textContent = workout.label;
  // Cronômetro só aparece depois de iniciar o treino.
  clockEl.hidden = !actions.isStarted();
  const { done, total } = actions.progressCounts();
  const pct = total ? Math.round((done / total) * 100) : 0;
  progressFill.style.width = `${pct}%`;
  progressLabel.textContent = `${done}/${total} exercícios`;
  progressBar.setAttribute('aria-valuenow', String(pct));
}

/** Atualiza só o relógio (chamado a cada segundo pelo WorkoutClock). */
export function updateClock(seconds) {
  if (clockEl) clockEl.textContent = formatClock(seconds);
}

function screenLoading() {
  return el('div', { className: 'state' }, [
    el('div', { className: 'spinner', attrs: { 'aria-label': 'Carregando' } }),
  ]);
}

function screenError(ctx) {
  return el('div', { className: 'state state--error' }, [
    el('h2', { text: 'Não foi possível carregar o treino' }),
    el('p', { className: 'muted', text: ctx.state.error || 'Verifique data/workouts.json.' }),
    el('button', {
      className: 'btn btn--primary', attrs: { type: 'button' },
      text: 'Tentar novamente', on: { click: () => ctx.onRetry?.() },
    }),
  ]);
}

// Linha de um dia de treino (clicável) na visão da semana.
function workoutRow(ctx, d) {
  const { actions } = ctx;
  const st = actions.workoutStatus(d.key);

  let statusText = `${d.count} exercícios`;
  let statusClass = '';
  if (st.finished) { statusText = 'Concluído'; statusClass = ' wcard--done'; }
  else if (st.started) { statusText = `Em andamento · ${st.done}/${st.total}`; statusClass = ' wcard--active'; }

  const open = el('button', {
    className: 'wcard__open', attrs: { type: 'button', 'aria-label': `Abrir ${d.weekday}: ${d.label}` },
    on: { click: () => actions.selectWorkout(d.key) },
  }, [
    el('div', { className: 'wcard__main' }, [
      el('div', { className: 'wcard__head' }, [
        el('span', { className: 'wcard__day', text: d.weekday }),
        d.isToday ? el('span', { className: 'badge', text: 'Hoje' }) : null,
      ]),
      el('h3', { className: 'wcard__title', text: d.label }),
      el('span', { className: 'wcard__status', text: statusText }),
    ]),
    el('span', { className: 'wcard__chevron' }, [icon('chevron')]),
  ]);

  return el('div', {
    className: `wcard${statusClass}${d.isToday ? ' wcard--today' : ''}`,
  }, [open]);
}

// Linha de dia de descanso (não clicável).
function restRow(d) {
  return el('div', { className: `wcard wcard--rest${d.isToday ? ' wcard--today' : ''}` }, [
    el('div', { className: 'wcard__main' }, [
      el('div', { className: 'wcard__head' }, [
        el('span', { className: 'wcard__day', text: d.weekday }),
        d.isToday ? el('span', { className: 'badge badge--muted', text: 'Hoje' }) : null,
      ]),
      el('span', { className: 'wcard__title wcard__title--muted', text: 'Descanso' }),
    ]),
  ]);
}

// Índice: visão da semana (Seg→Dom), incluindo descansos.
function screenIndex(ctx) {
  const week = ctx.actions.weekOverview();

  const rows = week.map((d) => (d.isRest ? restRow(d) : workoutRow(ctx, d)));

  return el('div', { className: 'index' }, [
    el('div', { className: 'index__header' }, [
      el('h1', { className: 'index__title', text: 'Semana' }),
      el('p', { className: 'muted', text: 'Escolha um treino para começar.' }),
    ]),
    el('div', { className: 'index__list' }, rows),
  ]);
}

function screenHome(ctx) {
  const { actions } = ctx;
  const workout = actions.currentWorkout();
  const started = actions.isStarted();
  const finished = actions.isFinished();

  const back = el('button', {
    className: 'btn btn--ghost home__back', attrs: { type: 'button' },
    on: { click: () => actions.goToIndex() },
  }, [icon('back'), el('span', { text: 'Semana' })]);

  const cards = workout.items.map((item) =>
    exerciseCard(item, actions.getProgress(item.exerciseId), (i) => actions.openFocus(i))
  );

  const key = ctx.state.ui.selectedKey;
  const discardBtn = el('button', {
    className: 'btn btn--danger btn--block', attrs: { type: 'button' },
    text: finished ? 'Remover treino' : 'Abandonar treino',
    on: {
      click: () => {
        const msg = finished
          ? 'Remover este treino concluído?'
          : 'Abandonar o treino? O progresso do dia será perdido.';
        if (confirm(msg)) {
          actions.discardWorkout(key);
          toast(finished ? 'Treino removido' : 'Treino abandonado');
        }
      },
    },
  });

  let footer;
  if (finished) {
    footer = [
      el('div', { className: 'home__concluded' }, [icon('check'), el('span', { text: 'Treino concluído' })]),
      el('button', {
        className: 'btn btn--ghost btn--block', attrs: { type: 'button' },
        text: 'Refazer treino', on: { click: () => actions.resetSession() },
      }),
      discardBtn,
    ];
  } else if (!started) {
    footer = [
      el('button', {
        className: 'btn btn--primary btn--block', attrs: { type: 'button' },
        text: 'Iniciar treino', on: { click: () => actions.startWorkout() },
      }),
    ];
  } else {
    footer = [
      el('button', {
        className: `btn btn--block ${actions.allCompleted() ? 'btn--primary' : 'btn--secondary'}`,
        attrs: { type: 'button' },
        text: 'Finalizar treino',
        on: {
          click: () => {
            if (confirm('Finalizar o treino agora?')) {
              actions.finishWorkout();
              toast('Treino concluído ✓');
            }
          },
        },
      }),
      discardBtn,
    ];
  }

  const hint = !started && !finished
    ? el('p', { className: 'muted home__hint', text: 'Confira os exercícios e toque em Iniciar treino para começar.' })
    : null;

  return el('div', { className: 'home' }, [
    back,
    hint,
    el('div', { className: 'list' }, cards),
    el('div', { className: 'home__footer' }, footer),
  ]);
}

/** Render principal: escolhe a tela conforme o estado. */
export function render(ctx) {
  updateHeader(ctx);

  switch (ctx.state.ui.view) {
    case 'loading': return mount(screen, screenLoading());
    case 'error':   return mount(screen, screenError(ctx));
    case 'index':   return mount(screen, screenIndex(ctx));
    case 'focus':   return mount(screen, renderFocus(ctx));
    case 'home':
    default:        return mount(screen, screenHome(ctx));
  }
}
