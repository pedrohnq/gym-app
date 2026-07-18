// Carregamento e validação do workouts.json. Somente leitura.
// Ver docs/02-technical-spec.md §4 e §5.

import { DATA_URL, REST_FALLBACK_SECONDS } from './config.js';

export class DataError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DataError';
  }
}

/**
 * Carrega o treino externo. Lança DataError em caso de falha/estrutura inválida.
 * @returns {Promise<object>} objeto de treino validado (imutável).
 */
export async function loadWorkouts() {
  let raw;
  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new DataError(`HTTP ${res.status} ao carregar o treino.`);
    raw = await res.json();
  } catch (err) {
    if (err instanceof DataError) throw err;
    throw new DataError('Não foi possível carregar ou interpretar data/workouts.json.');
  }
  return Object.freeze(validate(raw));
}

function validate(data) {
  if (!data || typeof data !== 'object') {
    throw new DataError('Formato inválido: raiz não é um objeto.');
  }
  const meta = data.meta && typeof data.meta === 'object' ? data.meta : {};
  const exercises = data.exercises;
  const week = data.week;

  if (!exercises || typeof exercises !== 'object') {
    throw new DataError('Formato inválido: "exercises" ausente ou inválido.');
  }
  if (!week || typeof week !== 'object') {
    throw new DataError('Formato inválido: "week" ausente ou inválido.');
  }

  const restDefault = Number.isFinite(meta.restDefaultSeconds)
    ? meta.restDefaultSeconds
    : REST_FALLBACK_SECONDS;

  // Valida referências e campos mínimos por dia/item.
  for (const [dayKey, day] of Object.entries(week)) {
    if (!day || !Array.isArray(day.items)) {
      throw new DataError(`Dia "${dayKey}" inválido: "items" deve ser uma lista.`);
    }
    for (const item of day.items) {
      if (!item || !item.exerciseId) {
        throw new DataError(`Dia "${dayKey}" tem item sem "exerciseId".`);
      }
      if (!exercises[item.exerciseId]) {
        throw new DataError(
          `Exercício "${item.exerciseId}" (dia "${dayKey}") não existe no catálogo "exercises".`
        );
      }
    }
  }

  return {
    meta: { title: 'Treino', version: 1, ...meta, restDefaultSeconds: restDefault },
    exercises,
    week,
  };
}
