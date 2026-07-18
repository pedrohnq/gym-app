// Modo foco: um exercício por vez (tela de trabalho). Ver docs/03 §6 e docs/04 fluxos 3-8.

import { el, icon } from './dom.js';
import { IMAGE_PLACEHOLDER } from '../config.js';
import { formatClock } from '../timer.js';

function heroImage(item) {
  const img = el('img', {
    className: 'focus__img',
    attrs: { src: item.image || IMAGE_PLACEHOLDER, alt: item.name, decoding: 'async' },
  });
  img.addEventListener('error', () => {
    if (img.src.endsWith(IMAGE_PLACEHOLDER)) return;
    img.src = IMAGE_PLACEHOLDER;
  }, { once: true });
  return el('div', { className: 'focus__hero' }, [img]);
}

function setPills(item, setsDone) {
  const pills = [];
  for (let i = 0; i < item.sets; i++) {
    pills.push(el('span', {
      className: `pill${i < setsDone ? ' pill--done' : ''}`,
      attrs: { 'aria-hidden': 'true' },
    }));
  }
  return el('div', {
    className: 'set-pills',
    attrs: { 'aria-label': `${setsDone} de ${item.sets} séries concluídas` },
  }, pills);
}

// Painel de descanso: esqueleto com ids fixos; o RestTimer atualiza por id.
function restPanel(ctx, item) {
  const active = ctx.rest.isActive();
  return el('section', {
    className: `rest${active ? ' rest--active' : ''}`,
    attrs: { id: 'rest-panel', 'aria-live': 'polite', hidden: !active },
  }, [
    el('div', { className: 'rest__head' }, [
      icon('rest'),
      el('span', { text: 'Descanso' }),
    ]),
    el('div', { className: 'rest__time', attrs: { id: 'rest-time' }, text: formatClock(ctx.rest.remaining()) }),
    el('div', { className: 'rest__bar' }, [
      el('div', { className: 'rest__bar-fill', attrs: { id: 'rest-bar' } }),
    ]),
    el('div', { className: 'rest__controls' }, [
      el('button', {
        className: 'btn btn--ghost', attrs: { id: 'rest-toggle', type: 'button' },
        text: ctx.rest.isRunning() ? 'Pausar' : 'Retomar',
        on: { click: () => ctx.rest.toggle() },
      }),
      el('button', {
        className: 'btn btn--ghost', attrs: { type: 'button' },
        text: '+15s', on: { click: () => ctx.rest.add(15) },
      }),
      el('button', {
        className: 'btn btn--ghost', attrs: { type: 'button' },
        text: 'Pular', on: { click: () => ctx.rest.skip() },
      }),
    ]),
  ]);
}

function fields(ctx, item) {
  const rec = ctx.actions.getRecord(item.exerciseId);

  const weight = el('input', {
    className: 'field__input',
    attrs: {
      id: 'field-weight', type: 'text', inputmode: 'decimal',
      placeholder: 'ex.: 40 kg', value: rec.weight || '',
      'aria-label': 'Carga utilizada', autocomplete: 'off',
    },
    on: { input: (e) => ctx.actions.setWeight(item.exerciseId, e.target.value) },
  });

  const note = el('textarea', {
    className: 'field__input field__textarea',
    attrs: {
      id: 'field-note', rows: '2', placeholder: 'Observações (ex.: subir 2,5 kg)',
      'aria-label': 'Observações',
    },
    on: { input: (e) => ctx.actions.setNote(item.exerciseId, e.target.value) },
  });
  note.value = rec.note || '';

  return el('div', { className: 'fields' }, [
    el('label', { className: 'field' }, [
      el('span', { className: 'field__label', text: 'Carga' }),
      weight,
    ]),
    el('label', { className: 'field' }, [
      el('span', { className: 'field__label', text: 'Observações' }),
      note,
    ]),
  ]);
}

/**
 * @param {object} ctx  { state, actions, rest }
 */
export function renderFocus(ctx) {
  const { state, actions } = ctx;
  const workout = actions.currentWorkout();
  const started = actions.isStarted();
  const idx = state.ui.focusIndex;
  const item = workout.items[idx];
  const p = actions.getProgress(item.exerciseId);
  const setsDone = p?.setsDone ?? 0;
  const completed = !!p?.completed;
  const total = workout.items.length;
  const allSetsDone = setsDone >= item.sets;

  const onSetDone = () => {
    if (setsDone >= item.sets) return;
    actions.markSetDone(item.exerciseId);   // re-renderiza o foco
    ctx.rest.start(item.restSeconds);        // inicia descanso no painel recém-montado
  };

  const onComplete = () => {
    if (setsDone === 0 && !confirm('Concluir exercício sem nenhuma série marcada?')) return;
    ctx.rest.cancel();
    actions.completeExercise(item.exerciseId);
    actions.focusNext();
  };

  const topbar = el('div', { className: 'focus__topbar' }, [
    el('button', {
      className: 'btn btn--icon', attrs: { type: 'button', 'aria-label': 'Voltar à lista' },
      on: { click: () => actions.setView('home') },
    }, [icon('back')]),
    el('span', { className: 'focus__counter', text: `${idx + 1} / ${total}` }),
  ]);

  const header = el('div', { className: 'focus__header' }, [
    item.muscleGroup ? el('span', { className: 'chip', text: item.muscleGroup }) : null,
    el('h2', { className: 'focus__title', text: item.name }),
    el('div', { className: 'focus__stats' }, [
      el('span', { text: `${item.sets} séries` }),
      el('span', { className: 'dot' }),
      el('span', { text: `${item.reps || '—'} reps` }),
      el('span', { className: 'dot' }),
      el('span', { text: `descanso ${item.restSeconds}s` }),
    ]),
  ]);

  const execution = item.execution.length
    ? el('ol', { className: 'exec' }, item.execution.map((step) => el('li', { text: step })))
    : el('p', { className: 'exec exec--empty', text: 'Sem instruções cadastradas.' });

  const setsRow = el('div', { className: 'sets-row' }, [
    setPills(item, setsDone),
    started && setsDone > 0
      ? el('button', {
          className: 'link', attrs: { type: 'button' },
          text: 'Desfazer', on: { click: () => actions.undoSet(item.exerciseId) },
        })
      : null,
  ]);

  let primary;
  if (!started) {
    primary = el('button', {
      className: 'btn btn--primary btn--block', attrs: { type: 'button' },
      text: 'Iniciar treino', on: { click: () => actions.startWorkout() },
    });
  } else if (completed) {
    primary = el('div', { className: 'focus__done-badge' }, [icon('check'), el('span', { text: 'Exercício concluído' })]);
  } else {
    primary = el('button', {
      className: 'btn btn--primary btn--block',
      attrs: { type: 'button', disabled: allSetsDone },
      text: allSetsDone ? 'Todas as séries concluídas' : `Concluir série (${setsDone + 1}/${item.sets})`,
      on: { click: onSetDone },
    });
  }

  const completeBtn = !started ? null : el('button', {
    className: `btn ${allSetsDone && !completed ? 'btn--accent-soft' : 'btn--secondary'} btn--block`,
    attrs: { type: 'button' },
    text: completed ? 'Reabrir exercício' : 'Concluir exercício',
    on: {
      click: () => {
        if (completed) { actions.uncompleteExercise(item.exerciseId); return; }
        onComplete();
      },
    },
  });

  const nav = el('div', { className: 'focus__nav' }, [
    el('button', {
      className: 'btn btn--ghost', attrs: { type: 'button', disabled: idx === 0 },
      text: 'Anterior', on: { click: () => actions.focusPrev() },
    }),
    el('button', {
      className: 'btn btn--ghost', attrs: { type: 'button' },
      text: idx + 1 < total ? 'Próximo' : 'Ver lista',
      on: { click: () => actions.focusNext() },
    }),
  ]);

  return el('div', { className: 'focus' }, [
    topbar,
    heroImage(item),
    header,
    restPanel(ctx, item),
    el('div', { className: 'focus__actions' }, [primary, setsRow]),
    fields(ctx, item),
    el('details', { className: 'exec-wrap', attrs: { open: true } }, [
      el('summary', { text: 'Como executar' }),
      execution,
    ]),
    completeBtn,
    nav,
  ]);
}
