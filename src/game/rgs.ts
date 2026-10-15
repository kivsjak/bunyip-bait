/* Stake Engine RGS: справжній, коли в URL є ?sessionID=&rgs_url=, інакше мок з книгами з public/books/ */

export type Mode = "base" | "burley" | "bonus" | "superbonus";
export const MODE_COST: Record<Mode, number> = {base: 1, burley: 1.25, bonus: 100, superbonus: 200};

export type BookEvent = {type: string; [k: string]: any};
export type Book = {payoutMultiplier: number; events: BookEvent[]};

export interface RGS {
  real: boolean;
  authenticate(): Promise<any>;
  play(amount: number, mode: Mode): Promise<any>;
  endRound(): Promise<any>;
}

const params = new URLSearchParams(location.search);

export function makeRGS(): RGS {
  const sessionID = params.get("sessionID"), rgsUrl = params.get("rgs_url");
  if (sessionID && rgsUrl) {
    const base = /^https?:\/\//.test(rgsUrl) ? rgsUrl : "https://" + rgsUrl;
    const post = async (path: string, body: object) => {
      const r = await fetch(base.replace(/\/$/, "") + path, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({sessionID, ...body})});
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw {code: j.code || j.error || "ERR_GEN"};
      return j;
    };
    return {
      real: true,
      authenticate: () => post("/wallet/authenticate", {}),
      play: (amount, mode) => post("/wallet/play", {amount, mode}),
      endRound: () => post("/wallet/end-round", {}),
    };
  }
  // мок: той самий інтерфейс, книги вантажаться з public/books/<mode>.json при першому спіні в цьому режимі
  let balance = 1000_000000, pending = 0;
  const levels = [100000, 200000, 400000, 600000, 800000, 1000000, 2000000, 4000000, 10000000, 20000000, 50000000, 100000000];
  const pools: Partial<Record<Mode, Book[]>> = {};
  const pool = async (mode: Mode) => pools[mode] ??= await fetch(`${import.meta.env.BASE_URL}books/${mode}.json`).then(r => {
    if (!r.ok) throw {code: "ERR_GEN"};
    return r.json();
  });
  return {
    real: false,
    authenticate: async () => ({balance: {amount: balance, currency: params.get("currency") || "USD"},
      config: {minBet: levels[0], maxBet: levels.at(-1), stepBet: 100000, defaultBetLevel: 1000000, betLevels: levels}, round: null}),
    play: async (amount, mode) => {
      const books = await pool(mode);
      const cost = Math.round(amount * MODE_COST[mode]);
      if (cost > balance) throw {code: "ERR_IPB"};
      balance -= cost;
      const book = books[Math.floor(Math.random() * books.length)];
      pending = Math.round(amount * book.payoutMultiplier / 100);
      return {balance: {amount: balance}, round: {state: book, payoutMultiplier: book.payoutMultiplier, active: book.payoutMultiplier > 0}};
    },
    endRound: async () => { balance += pending; pending = 0; return {balance: {amount: balance}}; },
  };
}

// Де лежить книга у відповіді /play: підтримуємо кілька варіантів структури раунду
export const bookOf = (round: any): Book => {
  const s = round && (round.state ?? round.book ?? round);
  return Array.isArray(s) ? {events: s, payoutMultiplier: round.payoutMultiplier} : s;
};
