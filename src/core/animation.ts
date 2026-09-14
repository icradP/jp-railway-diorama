/**
 * AnimationManager — central clock for all diorama systems.
 * Modules register Animations; they receive a shared time & delta.
 * Systems stay decoupled: lights don't know about gates, etc.
 */
export interface Animation {
  name: string;
  /** @param t absolute seconds since start, @param dt frame delta */
  update(t: number, dt: number): void;
  /** Optional priority (higher runs later — for post dependencies). */
  priority?: number;
}

export class AnimationManager {
  private anims: Animation[] = [];
  private clockTime = 0;
  private running = true;
  private sorted = false;

  add(anim: Animation): void {
    this.anims.push(anim);
    this.sorted = false;
  }

  remove(name: string): void {
    this.anims = this.anims.filter((a) => a.name !== name);
  }

  has(name: string): boolean {
    return this.anims.some((a) => a.name === name);
  }

  get(name: string): Animation | undefined {
    return this.anims.find((a) => a.name === name);
  }

  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  update(dt: number): void {
    if (!this.running) return;
    this.clockTime += dt;
    if (!this.sorted) {
      this.anims.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
      this.sorted = true;
    }
    for (const a of this.anims) a.update(this.clockTime, dt);
  }

  get time(): number {
    return this.clockTime;
  }

  clear(): void {
    this.anims = [];
  }
}

export const animationManager = new AnimationManager();

/** Shared crossing state machine — gates, lights, signals read this. */
export type CrossingPhase = 'idle' | 'alarm' | 'closing' | 'closed' | 'opening';

export interface CrossingState {
  phase: CrossingPhase;
  /** 0 = open (raised), 1 = fully closed (horizontal) */
  gateProgress: number;
  /** Blink phase for warning lamps (0 or 1). */
  blinkA: boolean;
  blinkB: boolean;
  /** Signal color 0=green, 1=yellow, 2=red */
  signalLevel: 0 | 1 | 2;
}

export const crossingState: CrossingState = {
  phase: 'idle',
  gateProgress: 0,
  blinkA: false,
  blinkB: false,
  signalLevel: 0,
};

/**
 * Crossing cycle controller.
 * idle → alarm (1.2s) → closing (2.2s) → closed (3.5s) → opening (2.4s) → idle (2.5s)
 * then restarts. Gate progress eased for mechanical inertia.
 */
export function createCrossingCycle(): Animation {
  const ALARM = 1.2;
  const CLOSING = 2.2;
  const CLOSED = 3.5;
  const OPENING = 2.4;
  const REST = 2.8;
  const CYCLE = ALARM + CLOSING + CLOSED + OPENING + REST;
  const BLINK_HALF = 0.5;

  return {
    name: 'crossing-cycle',
    update(t) {
      const c = t % CYCLE;
      let phase: CrossingPhase;
      let gateProgress = 0;

      if (c < ALARM) {
        phase = 'alarm';
        gateProgress = 0;
      } else if (c < ALARM + CLOSING) {
        phase = 'closing';
        const u = (c - ALARM) / CLOSING;
        // Ease-in-out with slow start (mechanical inertia)
        gateProgress = easeMechanical(u);
      } else if (c < ALARM + CLOSING + CLOSED) {
        phase = 'closed';
        gateProgress = 1;
      } else if (c < ALARM + CLOSING + CLOSED + OPENING) {
        phase = 'opening';
        const u = (c - ALARM - CLOSING - CLOSED) / OPENING;
        gateProgress = 1 - easeMechanical(u);
      } else {
        phase = 'idle';
        gateProgress = 0;
      }

      crossingState.phase = phase;
      crossingState.gateProgress = gateProgress;

      // Blink only during alarm/closing/closed
      const active = phase !== 'idle' && phase !== 'opening' ? true : phase === 'opening';
      // Keep blinking through opening until almost open
      const blinkOn = phase !== 'idle';
      if (blinkOn) {
        const bt = t % (BLINK_HALF * 2);
        crossingState.blinkA = bt < BLINK_HALF;
        crossingState.blinkB = bt >= BLINK_HALF;
      } else {
        crossingState.blinkA = false;
        crossingState.blinkB = false;
      }

      // Signal: idle green, alarm yellow-ish, during closing+ red
      if (phase === 'idle') crossingState.signalLevel = 0;
      else if (phase === 'alarm') crossingState.signalLevel = 1;
      else crossingState.signalLevel = 2;

      void active;
    },
  };
}

function easeMechanical(u: number): number {
  // Slow start, steady middle, soft stop — like a real boom gate motor
  const s = u * u * (3 - 2 * u);
  // Extra damping at ends
  return s * s * (3 - 2 * s);
}
