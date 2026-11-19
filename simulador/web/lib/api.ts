import type { Curvas, DatosModelo, DatosVentana, Info, Pedido, Plan, Prediccion, Salud } from "./tipos";

export class ErrorApi extends Error {
  estado: number;
  constructor(estado: number, mensaje: string) {
    super(mensaje);
    this.estado = estado;
  }
}

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`/api/${ruta}`, { cache: "no-store", ...init });
  if (!r.ok) {
    let detalle = `${r.status} ${r.statusText}`;
    try {
      const j = await r.json();
      if (j?.detail) detalle = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch {
      /* sin cuerpo JSON */
    }
    throw new ErrorApi(r.status, detalle);
  }
  return r.json() as Promise<T>;
}

const post = (pedido: Pedido, signal?: AbortSignal): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(pedido),
  signal,
});

export const api = {
  salud: (signal?: AbortSignal) => pedir<Salud>("salud", { signal }),
  info: () => pedir<Info>("info"),
  predecir: (p: Pedido, signal?: AbortSignal) => pedir<Prediccion>("predecir", post(p, signal)),
  curvas: (p: Pedido, signal?: AbortSignal) => pedir<Curvas>("curvas", post(p, signal)),
  plan: () => pedir<Plan>("plan"),
  ventana: () => pedir<DatosVentana>("ventana"),
  modelo: () => pedir<DatosModelo>("modelo"),
};

export function clavePedido(p: Pedido) {
  return JSON.stringify(p);
}

/** Completa un pedido de ejemplo con el típico si trae vacíos (la API exige todas las variables). */
export function completar(parcial: Partial<Record<keyof Pedido, number | string | null>>, tipico: Pedido): Pedido {
  const p = { ...tipico } as Record<string, number | string>;
  for (const [k, v] of Object.entries(parcial)) if (v !== null && v !== undefined) p[k] = v;
  return p as unknown as Pedido;
}

export const esAborto = (e: unknown) => e instanceof DOMException && e.name === "AbortError";
