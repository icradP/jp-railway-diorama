/** Deterministic seeded RNG for repeatable diorama scatter. */
export class Rng {
  private s: number;

  constructor(seed = 42) {
    this.s = seed >>> 0;
  }

  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }

  int(a: number, b: number): number {
    return Math.floor(this.range(a, b + 1));
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }

  bool(p = 0.5): boolean {
    return this.next() < p;
  }
}

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Gentle sine wobble with independent phase — used for plant wind. */
export function windOffset(time: number, phase: number, freq = 1, amp = 1): number {
  return Math.sin(time * freq + phase) * amp * 0.6 + Math.sin(time * freq * 1.7 + phase * 2.3) * amp * 0.4;
}
