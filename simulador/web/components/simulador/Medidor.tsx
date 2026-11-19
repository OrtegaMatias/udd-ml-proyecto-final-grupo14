"use client";

import { AnimatePresence, motion } from "motion/react";
import { pct, pctNum } from "@/lib/formato";
import { Cargando } from "../ui";

export type Veredicto = { clave: "intervenir" | "vigilar" | "avisar" | "ok"; sello: string; color: string; texto: string };

/**
 * Única lógica del veredicto en toda la app (misma tabla de acciones de la presentación).
 * 1) Predice Retraso crítico → Intervenir. 2) P(crítico) sobre el pedido promedio → Vigilar.
 * 3) Predice retraso moderado o leve → Avisar. 4) Si no → Sin acción.
 */
export function veredicto(prob: number, clase: number, critica: number, tasa: number): Veredicto {
  if (clase === critica) return { clave: "intervenir", sello: "Intervenir", color: "#FF4D5E", texto: "El coordinador revisa el pedido antes del retiro" };
  if (prob > tasa) return { clave: "vigilar", sello: "Vigilar", color: "#F6C445", texto: "Riesgo sobre el pedido promedio: revisar si queda cupo" };
  if (clase === critica - 1 || clase === critica - 2)
    return { clave: "avisar", sello: "Avisar", color: "#FF8A3D", texto: "Avisar al cliente la nueva hora estimada" };
  return { clave: "ok", sello: "Sin acción", color: "#3DDC97", texto: "Despachar normal" };
}

const cifra = (x: number) => (x >= 0.9995 ? ">99,9" : x < 0.0005 ? "<0,1" : pctNum(x));

/** Riesgo de retraso crítico: número grande (sin animación de conteo), sello de acción y barra 0–100 % con el pedido promedio. */
export default function Medidor({ prob, tasa, v, actualizando }: { prob: number; tasa: number; v: Veredicto; actualizando: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-4">
        <p className="font-titulo text-[3.1rem] leading-none font-bold tracking-[-0.03em] whitespace-nowrap" aria-live="polite">
          {cifra(prob)}
          <span className="ml-1 text-[1.5rem] text-atenuado">%</span>
        </p>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={v.clave}
            initial={{ scale: 1.4, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: -4 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            className="ml-auto shrink-0 rounded-[8px] border-[3px] px-3 py-0.5 font-titulo text-[1.35rem] font-bold tracking-[0.04em] whitespace-nowrap uppercase"
            style={{ color: v.color, borderColor: v.color, boxShadow: `inset 0 0 0 2px ${v.color}33` }}
          >
            {v.sello}
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="mt-1 flex items-center gap-2 text-[0.98rem] text-atenuado">
        riesgo de retraso crítico
        {actualizando && <Cargando className="text-acento" />}
      </p>

      {/* barra 0–100 % con la marca del pedido promedio */}
      <div className="relative mt-2.5 mb-6">
        <div className="h-[14px] overflow-hidden rounded-full bg-linea/80">
          <motion.div
            className="h-full origin-left rounded-full"
            initial={false}
            animate={{ scaleX: Math.max(prob, 0.004), backgroundColor: v.color }}
            transition={{ duration: 0.2 }}
          />
        </div>
        <div className="absolute -top-1 h-[22px] w-[3px] -translate-x-1/2 rounded-full bg-texto" style={{ left: `${tasa * 100}%` }} aria-hidden />
        <span className="absolute top-[20px] -translate-x-[14px] text-[0.8rem] whitespace-nowrap text-atenuado" style={{ left: `${tasa * 100}%` }}>
          ▲ pedido promedio {pct(tasa)}
        </span>
        <span className="absolute top-[20px] right-0 text-[0.8rem] text-tenue">100 %</span>
      </div>

      <p className="flex items-center gap-2 rounded-[10px] px-3 py-1.5 text-[1rem] leading-snug font-semibold" style={{ background: `${v.color}1A`, color: v.color }}>
        <span className="text-texto">{v.texto}.</span>
      </p>
    </div>
  );
}
