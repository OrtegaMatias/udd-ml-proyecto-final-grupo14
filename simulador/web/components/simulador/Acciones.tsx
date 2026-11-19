"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CircleCheck, CircleX, Undo2, Wand2 } from "lucide-react";
import { num, pct } from "@/lib/formato";
import type { DentroVentana, Info, Pedido, ReglaVentana } from "@/lib/tipos";
import { ChipClase, cx } from "../ui";
import type { Veredicto } from "./Medidor";

/** Cuántas reglas cumple el pedido. Ámbar (no rojo) si el riesgo ya está bajo el pedido promedio, para no contradecir el veredicto. */
export function InsigniaVentana({ reglas, prob, tasa }: { reglas: ReglaVentana[]; prob: number; tasa: number }) {
  const ok = reglas.filter((r) => r.ok).length;
  const todas = reglas.length > 0 && ok === reglas.length;
  const tono = todas ? "bg-c0/15 text-c0" : prob <= tasa ? "bg-c2/15 text-c2" : "bg-c4/15 text-c4";
  return <span className={cx("rounded-full px-2.5 py-0.5 text-[0.9rem] font-bold whitespace-nowrap", tono)}>{reglas.length ? `${ok} de ${reglas.length}` : "–"}</span>;
}

const cambio = (antes: number, ahora: number) => {
  const d = (ahora - antes) * 100;
  return `${d <= 0 ? "▼" : "▲"} ${num(Math.abs(d), 1)} pts`;
};

export function PanelVentana({
  info,
  pedido,
  reglas,
  dentro,
  prob,
  tasa,
  v,
  aplicado,
  actualizando,
  onAplicar,
  onDeshacer,
}: {
  info: Info;
  pedido: Pedido;
  reglas: ReglaVentana[];
  dentro: DentroVentana | null;
  prob: number;
  tasa: number;
  v: Veredicto;
  /** riesgo antes de aplicar la ventana; null si no se ha aplicado */
  aplicado: number | null;
  actualizando: boolean;
  onAplicar: () => void;
  onDeshacer: () => void;
}) {
  const hoy = (r: ReglaVentana) => (r.variable === "distancia_km" ? `${num(pedido.distancia_km, 1)} km` : num(pedido.Agent_Rating, 1));
  const riesgoDelDia = v.clave === "intervenir" || v.clave === "vigilar";

  const sobrePromedio = !!dentro?.cambia && dentro.prob_critico > tasa;
  const mensaje = sobrePromedio
    ? "Aun dentro de la ventana queda sobre el pedido promedio: el riesgo viene de las condiciones del día (tráfico, clima, zona)."
    : dentro && !dentro.cambia && riesgoDelDia
      ? "El riesgo viene de las condiciones del día (tráfico, clima, zona): avisar al cliente."
      : null;

  return (
    <div className={cx("transition-opacity duration-300", actualizando && "opacity-60 delay-300")}>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
        {/* las 2 reglas */}
        <ul className="flex flex-col gap-1.5">
          {reglas.map((regla) => (
            <li key={regla.variable} className="flex items-center gap-2.5 rounded-[10px] bg-fondo2/70 px-3 py-2">
              {regla.ok ? (
                <CircleCheck className="size-[1.3rem] shrink-0 text-c0" strokeWidth={2.6} aria-label="cumple" />
              ) : (
                <CircleX className="size-[1.3rem] shrink-0 text-c4" strokeWidth={2.6} aria-label="no cumple" />
              )}
              <span className="truncate text-[0.98rem] leading-snug font-semibold">{regla.regla}</span>
              <span className={cx("ml-auto shrink-0 text-[0.9rem] whitespace-nowrap", regla.ok ? "text-atenuado" : "font-semibold text-c4")}>hoy {hoy(regla)}</span>
            </li>
          ))}
        </ul>

        {/* el mismo pedido dentro de la ventana */}
        <div className="min-w-0">
          {dentro?.cambia ? (
            <>
              <p className="flex items-baseline gap-2 whitespace-nowrap">
                <span className="text-[0.92rem] text-atenuado">Dentro de la ventana:</span>
                <span className="font-titulo text-[1.3rem] font-bold">
                  {pct(prob)} <ArrowRight className="inline size-[1.1rem] text-tenue" strokeWidth={2.6} aria-label="pasa a" />{" "}
                  <span className={dentro.prob_critico > prob ? "text-c4" : dentro.prob_critico > tasa ? "text-c2" : "text-c0"}>{pct(dentro.prob_critico)}</span>
                </span>
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="flex items-center gap-2 text-[0.92rem] whitespace-nowrap text-atenuado">
                  el modelo predice <ChipClase indice={dentro.clase} nombre={info.clases[dentro.clase]} />
                </span>
                <button
                  type="button"
                  disabled={actualizando}
                  onClick={onAplicar}
                  className="ml-auto flex items-center gap-2 rounded-[10px] bg-acento px-4 py-1.5 font-titulo text-[1.02rem] font-bold whitespace-nowrap text-[#1A0F05] shadow-[0_3px_0_#B4581D] transition active:translate-y-[2px] active:shadow-[0_1px_0_#B4581D] disabled:opacity-50"
                >
                  <Wand2 className="size-[1.1rem]" strokeWidth={2.6} /> Aplicar la ventana
                </button>
              </div>
            </>
          ) : dentro ? (
            <p className="flex items-center gap-2 py-1 text-[1rem] font-semibold">
              <CircleCheck className="size-5 shrink-0 text-c0" strokeWidth={2.6} /> Este pedido ya está dentro de la ventana.
            </p>
          ) : null}

          {aplicado !== null && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-1.5 flex flex-wrap items-center gap-2">
              <p className={cx("rounded-[10px] px-3 py-1.5 text-[0.95rem] font-semibold whitespace-nowrap", prob <= aplicado ? "bg-c0/12 text-c0" : "bg-c4/12 text-c4")}>
                Antes {pct(aplicado)} → ahora {pct(prob)} ({cambio(aplicado, prob)})
              </p>
              <button
                type="button"
                onClick={onDeshacer}
                className="flex items-center gap-1.5 rounded-[10px] border border-linea px-3 py-1.5 text-[0.95rem] font-semibold whitespace-nowrap text-atenuado hover:bg-white/5 hover:text-texto"
              >
                <Undo2 className="size-4" strokeWidth={2.6} /> Deshacer
              </button>
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {mensaje && (
          <motion.p
            key={mensaje}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-2 rounded-[10px] bg-c2/10 px-3 py-1.5 text-[0.92rem] leading-snug text-texto/90"
          >
            {mensaje}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Nota al pie del bloque: efecto medido de las 2 reglas. */
export function NotaVentana({ info }: { info: Info }) {
  const r = info.ventana.resumen;
  return (
    <span className="text-[0.82rem] whitespace-nowrap text-tenue">
      En {num(r.n_muestra, 0)} pedidos de test bajan el riesgo medio de {pct(r.p_antes)} a {pct(r.p_despues)}
    </span>
  );
}
