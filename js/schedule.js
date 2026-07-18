// Resolução do treino do dia. Ver docs/02-technical-spec.md §5.
// A chave de week é o índice do dia (Date.getDay(): 0=domingo ... 6=sábado).

/**
 * Resolve o treino de um dia, mesclando cada item com o catálogo de exercícios.
 * @param {object} data   Objeto retornado por loadWorkouts().
 * @param {number} dayIndex  0..6 (padrão: hoje).
 * @returns {null | {dayIndex, label, items}}  null = dia de descanso.
 */
export function resolveWorkout(data, dayIndex = new Date().getDay()) {
  const day = data.week[String(dayIndex)];
  if (!day || !Array.isArray(day.items) || day.items.length === 0) {
    return null; // descanso
  }

  const restDefault = data.meta.restDefaultSeconds;

  const items = day.items.map((item, index) => {
    const ex = data.exercises[item.exerciseId];
    return {
      index,
      exerciseId: item.exerciseId,
      name: ex.name || item.exerciseId,
      muscleGroup: ex.muscleGroup || '',
      image: ex.image || '',
      execution: Array.isArray(ex.execution) ? ex.execution : [],
      sets: Number.isFinite(item.sets) ? item.sets : 1,
      reps: item.reps != null ? String(item.reps) : '',
      // Cadeia de fallback: item > exercício (catálogo) > meta.restDefaultSeconds.
      restSeconds: Number.isFinite(item.restSeconds) ? item.restSeconds
        : Number.isFinite(ex.restSeconds) ? ex.restSeconds
        : restDefault,
    };
  });

  return {
    dayIndex,
    label: day.label || 'Treino do dia',
    items,
  };
}

/**
 * Lista todos os treinos disponíveis (dias de week com itens), para o seletor.
 * Ordena começando na segunda-feira; marca o treino de hoje.
 * @returns {{key:string, dayIndex:number, label:string, count:number, isToday:boolean}[]}
 */
export function listWorkouts(data, todayIndex = new Date().getDay()) {
  const order = (i) => (i + 6) % 7; // segunda=0 ... domingo=6
  return Object.keys(data.week)
    .map((key) => {
      const w = resolveWorkout(data, Number(key));
      if (!w) return null;
      return {
        key,
        dayIndex: Number(key),
        label: w.label,
        count: w.items.length,
        isToday: Number(key) === todayIndex,
      };
    })
    .filter(Boolean)
    .sort((a, b) => order(a.dayIndex) - order(b.dayIndex));
}

const WEEKDAYS = [
  'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
  'quinta-feira', 'sexta-feira', 'sábado',
];

const WEEKDAYS_SHORT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function weekdayName(dayIndex = new Date().getDay()) {
  return WEEKDAYS[dayIndex] ?? '';
}

/**
 * Visão da semana inteira (Seg→Dom), incluindo dias sem treino (descanso).
 * @returns {{dayIndex:number, weekday:string, key:string, label:string|null,
 *            count:number, isToday:boolean, isRest:boolean}[]}
 */
export function weekOverview(data, todayIndex = new Date().getDay()) {
  const order = [1, 2, 3, 4, 5, 6, 0]; // segunda ... domingo
  return order.map((di) => {
    const w = resolveWorkout(data, di);
    return {
      dayIndex: di,
      weekday: WEEKDAYS_SHORT[di],
      key: String(di),
      label: w ? w.label : null,
      count: w ? w.items.length : 0,
      isToday: di === todayIndex,
      isRest: !w,
    };
  });
}

/** Chave de data local (YYYY-MM-DD) para isolar a sessão ao dia. */
export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
