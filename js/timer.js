// Cronômetro do treino + timer de descanso. Desacoplados da view.
// Ambos são resilientes a segundo plano: recomputam pelo relógio real.
// Ver docs/02-technical-spec.md §10 e docs/04-ux-spec.md fluxos 5 e 10.

export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(h > 0 ? m : m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Cronômetro do treino. Elapsed derivado de startedAt/finishedAt (relógio real),
 * então sobreviver a background/reabertura é automático.
 */
export class WorkoutClock {
  constructor(onTick) {
    this.onTick = onTick;
    this._id = null;
    this._getSession = null;
  }

  bind(getSession) {
    this._getSession = getSession;
    return this;
  }

  elapsedSeconds() {
    const s = this._getSession?.();
    if (!s || !s.startedAt) return 0;
    const end = s.finishedAt || Date.now();
    return Math.max(0, Math.floor((end - s.startedAt) / 1000));
  }

  start() {
    this.stop();
    this.onTick?.(this.elapsedSeconds());
    this._id = window.setInterval(() => {
      this.onTick?.(this.elapsedSeconds());
    }, 1000);
  }

  stop() {
    if (this._id != null) {
      window.clearInterval(this._id);
      this._id = null;
    }
  }
}

/**
 * Timer de descanso (contagem regressiva). Baseado em endsAt (timestamp),
 * portanto imune a throttling de background.
 */
export class RestTimer {
  constructor({ onTick, onDone } = {}) {
    this.onTick = onTick;
    this.onDone = onDone;
    this._id = null;
    this._endsAt = 0;
    this._remainingWhenPaused = 0;
    this._paused = false;
    this.total = 0;
  }

  get running() {
    return this._id != null && !this._paused;
  }

  get active() {
    return this._id != null || this._paused;
  }

  remaining() {
    if (this._paused) return this._remainingWhenPaused;
    return Math.max(0, Math.ceil((this._endsAt - Date.now()) / 1000));
  }

  start(seconds) {
    this.total = seconds;
    this._paused = false;
    this._endsAt = Date.now() + seconds * 1000;
    this._loop();
  }

  add(seconds) {
    if (!this.active) return;
    if (this._paused) {
      this._remainingWhenPaused += seconds;
    } else {
      this._endsAt += seconds * 1000;
    }
    this.total += seconds;
    this.onTick?.(this.remaining(), this.total);
  }

  pause() {
    if (!this.running) return;
    this._remainingWhenPaused = this.remaining();
    this._paused = true;
    this._clear();
    this.onTick?.(this.remaining(), this.total);
  }

  resume() {
    if (!this._paused) return;
    this._paused = false;
    this._endsAt = Date.now() + this._remainingWhenPaused * 1000;
    this._loop();
  }

  skip() {
    this._finish(false);
  }

  cancel() {
    this._clear();
    this._paused = false;
    this._endsAt = 0;
    this._remainingWhenPaused = 0;
  }

  _loop() {
    this._clear();
    this.onTick?.(this.remaining(), this.total);
    this._id = window.setInterval(() => {
      const r = this.remaining();
      this.onTick?.(r, this.total);
      if (r <= 0) this._finish(true);
    }, 250);
  }

  _finish(natural) {
    this._clear();
    this._paused = false;
    if (natural && 'vibrate' in navigator) {
      try { navigator.vibrate([120, 60, 120]); } catch { /* noop */ }
    }
    this.onDone?.(natural);
  }

  _clear() {
    if (this._id != null) {
      window.clearInterval(this._id);
      this._id = null;
    }
  }
}
