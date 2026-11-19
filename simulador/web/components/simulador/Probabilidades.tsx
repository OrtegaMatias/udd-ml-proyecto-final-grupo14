"use client";

import { motion } from "motion/react";
import { pct } from "@/lib/formato";
import { ChipClase, COLOR_CLASE, cx } from "../ui";

/** Las 5 barras por clase. Cifras al instante (sin conteo animado). */
export default function Probabilidades({
  clases,
  probabilidades,
  clase,
  critica,
  actualizando,
}: {
  actualizando?: boolean;
  clases: string[];
  probabilidades: number[];
  clase: number;
  critica: number;
}) {
  return (
    <div>
      <ul className={cx("flex flex-col gap-0.5 transition-opacity duration-300", actualizando && "opacity-60 delay-300")} aria-label="Probabilidad por clase">
        {clases.map((nombre, i) => {
          const p = probabilidades[i] ?? 0;
          const predicha = i === clase;
          return (
            <li
              key={nombre}
              className={cx("relative rounded-[10px] px-2.5 py-1", predicha ? "bg-tarjeta2 ring-2" : "ring-1 ring-transparent")}
              style={predicha ? { ["--tw-ring-color" as string]: COLOR_CLASE[i] } : undefined}
            >
              <div className="flex items-center gap-2">
                <i className="inline-block size-3 shrink-0 rounded-[3px]" style={{ background: COLOR_CLASE[i] }} />
                <span className={cx("text-[0.98rem] whitespace-nowrap", i === critica ? "font-bold" : "font-medium", predicha ? "text-texto" : "text-texto/85")}>{nombre}</span>
                {predicha && (
                  <span className="shrink-0 rounded-full px-2 py-px text-[0.74rem] font-bold text-[#0B1622]" style={{ background: COLOR_CLASE[i] }}>
                    predicha
                  </span>
                )}
                <span className="ml-auto font-titulo text-[1.05rem] font-bold whitespace-nowrap">{pct(p)}</span>
              </div>
              <div className="mt-1 h-[8px] overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full origin-left rounded-full"
                  style={{ background: COLOR_CLASE[i] }}
                  initial={false}
                  animate={{ scaleX: Math.max(p, 0.004) }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** "Cómo terminó en realidad": solo para un pedido de ejemplo sin modificar. */
export function ClaseReal({ clases, claseReal, modificado }: { clases: string[]; claseReal: string | null; modificado: boolean }) {
  const indiceReal = claseReal ? clases.indexOf(claseReal) : -1;
  return (
    <div className="flex min-h-8 items-center gap-2 text-[0.95rem] whitespace-nowrap text-atenuado">
      {indiceReal >= 0 ? (
        <>
          Cómo terminó en realidad: <ChipClase indice={indiceReal} nombre={claseReal!} />
        </>
      ) : (
        <>{modificado ? "Pedido modificado: ya no es el pedido real." : "Pedido simulado: no tiene un resultado real."}</>
      )}
    </div>
  );
}
