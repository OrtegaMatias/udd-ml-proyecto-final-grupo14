// Formato chileno: coma decimal, punto de miles, pesos con $.

const cache = new Map<string, Intl.NumberFormat>();
function nf(min: number, max: number) {
  const clave = `${min}-${max}`;
  let f = cache.get(clave);
  if (!f) {
    f = new Intl.NumberFormat("es-CL", { minimumFractionDigits: min, maximumFractionDigits: max, useGrouping: "always" });
    cache.set(clave, f);
  }
  return f;
}

export const MENOS = "−";

export function num(x: number, dec = 0, minDec = dec) {
  if (!Number.isFinite(x)) return "–";
  const f = nf(minDec, dec);
  const s = f.format(Math.abs(x));
  return x < 0 && s !== f.format(0) ? MENOS + s : s;
}

/** 0,1465 → "14,7 %" */
export function pct(x: number, dec = 1) {
  if (!Number.isFinite(x)) return "–";
  if (x > 0 && x * 100 < 10 ** -dec) return `< ${num(10 ** -dec, dec)} %`;
  if (x < 1 && x * 100 > 100 - 10 ** -dec) return `> ${num(100 - 10 ** -dec, dec)} %`;
  return `${num(x * 100, dec)} %`;
}

/** Solo el número de un porcentaje, sin el signo: 0,1465 → "14,7" */
export function pctNum(x: number, dec = 1) {
  return num(x * 100, dec);
}

/** Puntos porcentuales con signo: −12,3 pts */
export function pts(x: number, dec = 1) {
  const v = x * 100;
  const s = num(Math.abs(v), dec);
  if (s === num(0, dec)) return `${s} pts`;
  return `${v < 0 ? MENOS : "+"}${s} pts`;
}

export function clp(x: number) {
  if (!Number.isFinite(x)) return "–";
  const s = "$" + nf(0, 0).format(Math.round(Math.abs(x)));
  return x < 0 && Math.round(Math.abs(x)) > 0 ? MENOS + s : s;
}

/** Millones con una cifra decimal: $149,4 M */
export function clpM(x: number) {
  if (!Number.isFinite(x)) return "–";
  const s = `$${num(Math.abs(x) / 1e6, 1)} M`;
  return x < 0 ? MENOS + s : s;
}

export function segundos(s: number) {
  if (!Number.isFinite(s)) return "–";
  if (s < 1) return `${num(s * 1000, 0)} ms`;
  if (s < 60) return `${num(s, 1)} s`;
  return `${num(s / 60, 1)} min`;
}

/** Algunos textos de resultados/ vienen sin tildes (CSV del notebook). Solo se corrige la ortografía. */
const TILDES: [RegExp, string][] = [
  [/\bcritico\b/g, "crítico"],
  [/\bCritico\b/g, "Crítico"],
  [/\bcongestion\b/g, "congestión"],
  [/\bRapida\b/g, "Rápida"],
  [/\bcalificacion\b/g, "calificación"],
  [/\bvehiculo\b/g, "vehículo"],
  [/>=/g, "≥"],
  [/<=/g, "≤"],
];
export function acentuar(s: string) {
  return TILDES.reduce((t, [re, r]) => t.replace(re, r), s);
}

/** Quita tildes para comparar nombres de clase. */
export function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
