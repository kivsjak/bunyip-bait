import { app } from "./scene";

export const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let speed = reduceMotion ? 3 : 1;
export const getSpeed = () => speed;
export const setTurbo = (on: boolean) => { speed = (on ? 2.6 : 1) * (reduceMotion ? 3 : 1); };

export const ease = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t;

export function tween(o: any, to: Record<string, number>, ms: number, e = ease) {
  ms = ms / speed;
  return new Promise<void>(res => {
    const from: Record<string, number> = {};
    for (const k in to) from[k] = k === "scale" ? o.scale.x : o[k];
    let t = 0;
    const f = () => {
      if (o.destroyed) { app.ticker.remove(f); return res(); }
      t += app.ticker.deltaMS; const p = Math.min(1, t / ms), v = e(p);
      for (const k in to) { const val = from[k] + (to[k] - from[k]) * v; if (k === "scale") o.scale.set(val); else o[k] = val; }
      if (p >= 1) { app.ticker.remove(f); res(); }
    };
    app.ticker.add(f);
  });
}
export const wait = (ms: number) => new Promise(r => setTimeout(r, ms / speed));

// Паузи (мс, діляться на швидкість турбо): правимо тут, якщо темп не подобається
export const PAUSE = {afterReveal: 150, afterCascade: 140, afterSpin: 350, betweenFS: 300, beforeSpin: 120, afterWin: 400};
