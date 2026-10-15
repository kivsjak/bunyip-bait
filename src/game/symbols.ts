import pays from "./pays.json";

export const REELS = 6, ROWS = 5;

// name — для таблиці виплат; color/shape — лише для запасного малюнка, коли нема PNG у assets/symbols/
export const SYM: Record<string, {name: string; color: number; shape: string}> = {
  H1: {name: "Barra",  color: 0xe9c46a, shape: "fish"},
  H2: {name: "Cod",    color: 0x7fb069, shape: "fish"},
  H3: {name: "Yabby",  color: 0xe76f51, shape: "claw"},
  H4: {name: "Eel",    color: 0x9b77b0, shape: "eel"},
  L1: {name: "Tinny",  color: 0x9ad1d4, shape: "can"},
  L2: {name: "Pie",    color: 0xc98f55, shape: "blob"},
  L3: {name: "Thong",  color: 0xf28fad, shape: "blob"},
  L4: {name: "Boot",   color: 0x8c7b6b, shape: "blob"},
  S:  {name: "Cooler", color: 0x3a86d1, shape: "esky"},
};
export const SYMBOLS = Object.keys(SYM);
export const PAYING = ["H1", "H2", "H3", "H4", "L1", "L2", "L3", "L4"];

// виплата в ставках за кластер розміром PAY_HEADS[i]
export const PAYS: Record<string, string[]> = pays;
export const PAY_HEADS = ["5", "6", "7", "8", "9–10", "11–12", "13–14", "15+"];
