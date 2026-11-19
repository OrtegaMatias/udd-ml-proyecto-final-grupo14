"use client";

import { motion } from "motion/react";
import { Fragment } from "react";
import { cx, EtiquetaEnvio } from "./ui";

export type Vista = "simulador" | "ventana" | "plan" | "modelo";
/** Pestañas del menú. "modelo" no aparece, pero sigue abriendo con ?vista=modelo. */
export const VISTAS: { id: Vista; nombre: string }[] = [
  { id: "simulador", nombre: "Simulador" },
  { id: "ventana", nombre: "Ventana de operación" },
  { id: "plan", nombre: "Plan priorizado" },
];
export const VISTAS_URL: Vista[] = ["simulador", "ventana", "plan", "modelo"];

/** La navegación es la barra de seguimiento del envío, como en la presentación. */
export default function Encabezado({ vista, onVista, modelo }: { vista: Vista; onVista: (v: Vista) => void; modelo: string }) {
  return (
    <header className="flex flex-wrap items-center gap-x-8 gap-y-3 px-7 pt-3.5 pb-2.5">
      <div className="flex items-center gap-4">
        <EtiquetaEnvio numero="G14" texto="Centro de despacho" />
        <div className="leading-tight">
          <p className="font-titulo text-[1.15rem] font-semibold">Simulador what-if de retrasos</p>
          <p className="text-[0.9rem] text-atenuado">
            {modelo}, en vivo
          </p>
        </div>
      </div>
      <nav aria-label="Pantallas" className="ml-auto flex min-w-[520px] flex-1 items-center justify-end">
        {VISTAS.map((v, i) => {
          const activa = v.id === vista;
          return (
            <Fragment key={v.id}>
              {i > 0 && <span className="ruta mx-3 h-[2px] max-w-36 min-w-6 flex-1" aria-hidden />}
              <button
                type="button"
                onClick={() => onVista(v.id)}
                aria-current={activa ? "page" : undefined}
                className={cx(
                  "group relative flex items-center gap-2.5 rounded-full px-3 py-2 font-titulo text-[1.05rem] font-semibold whitespace-nowrap transition-colors",
                  activa ? "text-acento" : "text-atenuado hover:text-texto",
                )}
              >
                <span className="relative grid size-4 place-items-center">
                  <span className={cx("absolute inset-0 rounded-full border-2", activa ? "border-acento" : "border-tenue group-hover:border-atenuado")} />
                  {activa && (
                    <motion.span
                      layoutId="punto-activo"
                      className="absolute inset-0 rounded-full bg-acento shadow-[0_0_0_6px_rgba(255,138,61,0.18)]"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                </span>
                {v.nombre}
              </button>
            </Fragment>
          );
        })}
      </nav>
    </header>
  );
}
