// Componente: card de exercício (lista/home). Ver docs/03-design-spec.md §5.2.

import { el, icon } from './dom.js';
import { IMAGE_PLACEHOLDER } from '../config.js';

function thumb(item) {
  const img = el('img', {
    className: 'card__img',
    attrs: {
      src: item.image || IMAGE_PLACEHOLDER,
      alt: '',
      loading: 'lazy',
      decoding: 'async',
    },
  });
  // Fallback se a imagem falhar (URL externa/arquivo ausente).
  img.addEventListener('error', () => {
    if (img.src.endsWith(IMAGE_PLACEHOLDER)) return;
    img.src = IMAGE_PLACEHOLDER;
  }, { once: true });
  return el('div', { className: 'card__thumb' }, [img]);
}

/**
 * @param {object} item      item resolvido do treino
 * @param {object} progress  { setsDone, completed }
 * @param {(index:number)=>void} onOpen
 */
export function exerciseCard(item, progress, onOpen) {
  const completed = !!progress?.completed;
  const setsDone = progress?.setsDone ?? 0;

  const card = el('button', {
    className: `card${completed ? ' card--done' : ''}`,
    attrs: { type: 'button', 'aria-label': `Abrir ${item.name}` },
    on: { click: () => onOpen(item.index) },
  }, [
    thumb(item),
    el('div', { className: 'card__body' }, [
      el('div', { className: 'card__head' }, [
        el('h3', { className: 'card__title', text: item.name }),
        completed ? el('span', { className: 'card__check', title: 'Concluído' }, [icon('check')]) : null,
      ]),
      el('div', { className: 'card__meta' }, [
        item.muscleGroup ? el('span', { className: 'chip', text: item.muscleGroup }) : null,
        el('span', { className: 'card__sets', text: `${item.sets}×${item.reps || '—'}` }),
      ]),
      el('div', { className: 'card__progress' }, [
        el('span', {
          className: 'card__progress-label',
          text: `${setsDone}/${item.sets} séries`,
        }),
      ]),
    ]),
  ]);

  return card;
}
