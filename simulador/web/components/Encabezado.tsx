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
const REPOSITORIO = "https://github.com/OrtegaMatias/udd-ml-proyecto-final-grupo14";

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
      <a
        href={REPOSITORIO}
        target="_blank"
        rel="noopener noreferrer"
        title="Notebook, presentación y código del proyecto"
        className="flex items-center gap-2 rounded-full border border-linea bg-tarjeta px-3.5 py-1.5 font-titulo text-[0.95rem] font-semibold whitespace-nowrap text-atenuado transition-colors hover:border-acento hover:text-texto"
      >
        <svg viewBox="0 0 16 16" className="size-[18px]" fill="currentColor" aria-hidden>
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        Código en GitHub
      </a>
    </header>
  );
}
