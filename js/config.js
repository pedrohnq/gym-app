// Constantes técnicas. Sem dados de treino aqui (ver docs/02-technical-spec.md).

export const DATA_URL = './data/workouts.json';

// Prefixo versionado das chaves de LocalStorage.
const NS = 'gymapp:v1';
export const STORAGE_KEYS = {
  records: `${NS}:records`,   // cargas + observações por exerciseId (permanente)
  session: `${NS}:session`,   // sessão em andamento (retomar)
};

// Fallback quando meta.restDefaultSeconds não é informado no JSON.
export const REST_FALLBACK_SECONDS = 90;

// Placeholder exibido quando a imagem do exercício falha/está ausente.
export const IMAGE_PLACEHOLDER = './assets/exercises/_placeholder.svg';
