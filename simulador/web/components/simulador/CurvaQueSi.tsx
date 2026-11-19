"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { pct } from "@/lib/formato";
import { areaPath, lineaPath, resorte, ticksY, TrazoAnimado, useAncho } from "./Grafico";

type Props = {
  titulo: string;
  puntos: { x: number; y: number }[];
  dominio: [number, number];
  xActual: number;
  yActual: number;
  tasa: number;
  zona?: [number, number] | null;
  formatoX: (x: number) => string;
  ticksX: number[];
  onElegir?: (x: number) => void;
  actualizando?: boolean;
  /** separa la línea donde no hay datos (por ejemplo, entre la 1 y las 7 h) */
  saltoMayorA?: number;
  /** rótulo junto al título, por ejemplo "No lo controla la empresa" */
  nota?: string;
};

const ALTO = 190;
const M = { izq: 52, der: 22, arr: 18, aba: 34 };

export default function CurvaQueSi({ titulo, puntos, dominio, xActual, yActual, tasa, zona, formatoX, ticksX, onElegir, actualizando, saltoMayorA, nota }: Props) {
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, "");

  // Escala fija 0–100 % en las tres curvas, para compararlas sin engañar
  const max = 1;
  const w = ancho - M.izq - M.der;
  const h = ALTO - M.arr - M.aba;
  const sx = (x: number) => M.izq + ((x - dominio[0]) / (dominio[1] - dominio[0])) * w;
  const sy = (y: number) => M.arr + (1 - Math.min(y, max) / max) * h;

  const tramos = useMemo(() => {
    const t: { x: number; y: number }[][] = [[]];
    puntos.forEach((p, i) => {
      if (i && saltoMayorA && p.x - puntos[i - 1].x > saltoMayorA) t.push([]);
      t[t.length - 1].push(p);
    });
    return t;
  }, [puntos, saltoMayorA]);

  const esc = (ps: { x: number; y: number }[]) => ps.map((p) => ({ x: sx(p.x), y: sy(p.y) }));
  const base = M.arr + h;
  const elegido = hover !== null ? puntos[hover] : null;

  const alMover = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = dominio[0] + ((e.clientX - r.left) / r.width) * (dominio[1] - dominio[0]);
    let mejor = 0;
    puntos.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(puntos[mejor].x - x)) mejor = i;
    });
    setHover(mejor);
  };

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-baseline gap-2 px-1">
        <h3 className="truncate font-titulo text-[1.08rem] font-semibold">{titulo}</h3>
        {nota && <span className="shrink-0 rounded-full bg-white/[0.07] px-2 py-px text-[0.75rem] font-semibold whitespace-nowrap text-atenuado">{nota}</span>}
        <span className="ml-auto shrink-0 text-[0.9rem] whitespace-nowrap text-atenuado">
          {elegido ? (
            <>
              {formatoX(elegido.x)}: <b className="text-texto">{pct(elegido.y)}</b>
              {onElegir && ancho >= 400 && <span className="text-tenue"> (clic para fijar)</span>}
            </>
          ) : (
            <>
              {ancho >= 380 && "Ahora: "}
              <b className="text-texto">{pct(yActual)}</b>
            </>
          )}
        </span>
      </div>
      <div ref={ref} className="relative">
        <svg width={ancho} height={ALTO} className={actualizando ? "opacity-60 transition-opacity" : "transition-opacity"} role="img" aria-label={`Probabilidad de retraso crítico según ${titulo}`}>
          <defs>
            <linearGradient id={`g${gid}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#FF8A3D" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#FF8A3D" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* ventana oficial (radio del tráfico actual / nota mínima) */}
          {zona && (
            <>
            <motion.text
              initial={false}
              animate={{ x: (sx(Math.max(zona[0], dominio[0])) + sx(Math.min(zona[1], dominio[1]))) / 2 }}
              transition={resorte}
              y={M.arr + 14}
              textAnchor="middle"
              className="fill-c0 text-[12px] font-semibold"
            >
              ventana
            </motion.text>
            <motion.rect
              initial={false}
              animate={{ x: sx(Math.max(zona[0], dominio[0])), width: Math.max(0, sx(Math.min(zona[1], dominio[1])) - sx(Math.max(zona[0], dominio[0]))) }}
              transition={resorte}
              y={M.arr}
              height={h}
              fill="rgba(61,220,151,0.08)"
              stroke="rgba(61,220,151,0.45)"
              strokeDasharray="5 5"
              rx={6}
            />
            </>
          )}

          {/* eje Y */}
          {ticksY(max).map((t) => (
            <g key={t}>
              <line x1={M.izq} x2={M.izq + w} y1={sy(t)} y2={sy(t)} stroke="#25415E" strokeOpacity={t === 0 ? 1 : 0.55} />
              <text x={M.izq - 8} y={sy(t) + 5} textAnchor="end" className="fill-tenue text-[13px]">
                {pct(t, t * 100 % 1 ? 1 : 0).replace(" %", "%")}
              </text>
            </g>
          ))}
          {/* eje X */}
          {(w < 300 ? ticksX.filter((_, i) => i % 2 === 0 || i === ticksX.length - 1).filter((t, i, a) => i === a.length - 1 || sx(a[a.length - 1]) - sx(t) > 40) : ticksX).map((t) => (
            <text key={t} x={sx(t)} y={ALTO - 10} textAnchor={t >= dominio[1] ? "end" : t <= dominio[0] ? "start" : "middle"} dx={t >= dominio[1] ? 8 : t <= dominio[0] ? -8 : 0} className="fill-tenue text-[13px]">
              {formatoX(t)}
            </text>
          ))}

          {/* curva */}
          {tramos.map((t, i) => (
            <g key={i}>
              <TrazoAnimado d={areaPath(esc(t), base)} fill={`url(#g${gid})`} />
              <TrazoAnimado d={lineaPath(esc(t))} fill="none" stroke="#FF8A3D" strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          ))}
          {tramos.slice(1).map((t, i) => {
            const a = tramos[i][tramos[i].length - 1];
            const b = t[0];
            return a && b ? (
              <motion.line
                key={`s${i}`}
                initial={false}
                animate={{ x1: sx(a.x), y1: sy(a.y), x2: sx(b.x), y2: sy(b.y) }}
                transition={resorte}
                stroke="#FF8A3D"
                strokeOpacity={0.45}
                strokeWidth={2}
                strokeDasharray="3 6"
              />
            ) : null;
          })}

          {/* pedido promedio (tasa base), encima de la curva para que se lea */}
          <motion.g initial={false} animate={{ y: sy(tasa) }} transition={resorte}>
            <line x1={M.izq} x2={M.izq + w} y1={0} y2={0} stroke="#93A7BC" strokeDasharray="6 6" strokeWidth={1.5} />
            <text x={M.izq + w - 4} y={-7} textAnchor="end" className="fill-atenuado text-[13px] font-medium" stroke="#15263A" strokeWidth={5} paintOrder="stroke" strokeLinejoin="round">
              pedido promedio {pct(tasa)}
            </text>
          </motion.g>

          {/* punto actual */}
          <motion.g initial={false} animate={{ x: sx(Math.min(Math.max(xActual, dominio[0]), dominio[1])), y: sy(yActual) }} transition={resorte}>
            <line x1={0} x2={0} y1={0} y2={base - sy(yActual)} stroke="#E8EEF4" strokeOpacity={0.35} strokeDasharray="2 4" />
            <circle r={13} fill="#FF8A3D" fillOpacity={0.2} />
            <circle r={7} fill="#0B1622" stroke="#E8EEF4" strokeWidth={3.5} />
          </motion.g>

          {/* lectura al pasar el mouse */}
          <AnimatePresence>
            {elegido && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                <line x1={sx(elegido.x)} x2={sx(elegido.x)} y1={M.arr} y2={base} stroke="#E8EEF4" strokeOpacity={0.5} />
                <circle cx={sx(elegido.x)} cy={sy(elegido.y)} r={5.5} fill="#FF8A3D" stroke="#0B1622" strokeWidth={2} />
              </motion.g>
            )}
          </AnimatePresence>

          <rect
            x={M.izq}
            y={M.arr}
            width={w}
            height={h}
            fill="transparent"
            style={{ cursor: onElegir ? "pointer" : "crosshair" }}
            onPointerMove={alMover}
            onPointerLeave={() => setHover(null)}
            onClick={() => elegido && onElegir?.(elegido.x)}
          />
        </svg>
      </div>
    </div>
  );
}
