const I18N: Record<string, Record<string, string>> = {
  ru: {balance:"Баланс",win:"Выигрыш",bet:"Ставка",spin:"Спин",burley:"Прикормка",turbo:"Турбо",buyBonus:"Купить бонус",
      buySuper:"Супербонус",rules:"Правила",rulesTitle:"Как играть",close:"Закрыть",modesTitle:"Режимы",mode:"Режим",price:"Цена",
      buttonsTitle:"Кнопки",freeSpins:"Фриспины",freeSpin:"Фриспин {a} из {b}",bigWin:"Крупный выигрыш",maxWin:"Максимальный выигрыш",
      confirmBuy:"Купить за {p}?",insufficient:"Недостаточно средств для этой ставки",sessionErr:"Сессия истекла — перезапустите игру",
      genericErr:"Ошибка сервера ({c}). Попробуйте ещё раз",limitErr:"Достигнут лимит ставок",cooler:"кулер",paytableTitle:"Таблица выплат",r7:"Выплаты — в ставках за кластер из указанного числа символов.",moreSpins:"+{n} спинов"},
  en: {buyBonus:"Buy bonus",buySuper:"Super bonus",freeSpins:"Free spins",freeSpin:"Free spin {a} of {b}",bigWin:"Big win",maxWin:"Max win",confirmBuy:"Buy for {p}?",
      insufficient:"Not enough balance for this bet",sessionErr:"Session expired — reload the game",genericErr:"Server error ({c}). Try again",
      limitErr:"Betting limit reached",cooler:"Cooler",moreSpins:"+{n} spins"},
};

export const LANG = (new URLSearchParams(location.search).get("lang") || "en").slice(0, 2);

export const tr = (k: string, v: Record<string, string | number> = {}) =>
  (I18N[LANG]?.[k] || I18N.en[k] || k).replace(/\{(\w+)\}/g, (_, x) => String(v[x]));

export function applyI18n() {
  const dict = I18N[LANG];
  if (dict) document.querySelectorAll<HTMLElement>("[data-i18n]").forEach(el => { const t = dict[el.dataset.i18n!]; if (t) el.textContent = t; });
  document.documentElement.lang = LANG;
}

/* ---------------- гроші (одиниці RGS: 1e6 = 1.00) ---------------- */
let currency = "USD";
export const setCurrency = (c: string) => { currency = c; };
export function money(units: number) {
  const v = units / 1e6;
  try { return new Intl.NumberFormat(LANG, {style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2}).format(v); }
  catch { return v.toFixed(2) + " " + currency; }
}
