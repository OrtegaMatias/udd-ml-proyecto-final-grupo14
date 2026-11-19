"use client";

import { motion } from "motion/react";
import { ArrowRight, Grid3x3, Route, Star, ChartSpline } from "lucide-react";
import { useState } from "react";
import { num, pct } from "@/lib/formato";
import type { ClaveVariable, DatosVentana, Info } from "@/lib/tipos";
import { cx, Tarjeta } from "./ui";
import { lineaPath, techo, useAncho } from "./simulador/Grafico";

function mezclar(a: string, b: string, t: number) {
  const h = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const [x, y] = [h(a), h(b)];
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * Math.min(Math.max(t, 0), 1)));
  return `rgb(${c.join(",")})`;
}

/** Bajo el pedido promedio (tasa base): verde. Sobre él: de amarillo a rojo. */
export function colorRiesgo(p: number, meta: number, max: number) {
  if (p < meta) return mezclar("#1F4A44", "#3DDC97", 0.35 + 0.65 * ((meta - p) / meta));
  const t = (p - meta) / Math.max(max - meta, 1e-6);
  return t < 0.5 ? mezclar("#F6C445", "#FF8A3D", t * 2) : mezclar("#FF8A3D", "#FF4D5E", (t - 0.5) * 2);
}

function traducirRango(info: Info, variable: string, texto: string) {
  const v = info.variables[variable as ClaveVariable];
  if (!texto || texto === "ninguno") return "ningún valor";
  if (texto.includes(" a ")) {
    const [a, b] = texto.split(" a ").map(Number);
    return `${num(a, 1).replace(/,0$/, "")} a ${num(b, 1).replace(/,0$/, "")}${v?.unidad ? ` ${v.unidad}` : ""}`;
  }
  return texto
    .split(",")
    .map((s) => v?.opciones?.[s.trim()] ?? s.trim())
    .join(", ");
}

function etiquetaValor(info: Info, variable: string, valor: string) {
  const v = info.variables[variable as ClaveVariable];
  return v?.opciones?.[valor] ?? valor;
}

export default function VistaVentana({ info, datos }: { info: Info; datos: DatosVentana }) {
  const meta = datos.meta;
  const r = datos.resumen;
  const T = info.variables.Traffic.opciones ?? {};
  const maxRadio = info.variables.distancia_km.max ?? Math.max(...Object.values(datos.radio_km));

  // Agrupa los niveles de tráfico con el mismo radio para la lectura de negocio
  const grupos = new Map<number, string[]>();
  datos.distancia_trafico.trafico.forEach((t) => {
    const k = datos.radio_km[t] ?? 0;
    grupos.set(k, [...(grupos.get(k) ?? []), (T[t] ?? t).toLowerCase()]);
  });
  const lista = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} o ${xs[xs.length - 1]}` : xs[0]);
  const reglaRadio = [...grupos.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([k, ts]) => `con tráfico ${lista(ts)}: ${k > 0 ? `hasta ${num(k, 0)} km` : "ninguna distancia"}`)
    .join("; ");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-1">
        <h1 className="font-titulo text-[2.3rem] leading-[1.05] font-bold tracking-[-0.02em]">Ventana de operación: 2 reglas</h1>
        <p className="max-w-[115ch] text-[1.02rem] leading-snug text-atenuado">
          Rangos en que el riesgo medio de retraso crítico queda bajo el pedido promedio ({pct(meta)}). Salen de la dependencia parcial: a {num(r.n_muestra, 0)} pedidos de
          test les cambiamos una variable a la vez y promediamos la probabilidad del modelo.
        </p>
      </div>

      {/* Respuesta directa: las 2 reglas y su efecto */}
      <section className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)_minmax(0,1.3fr)] overflow-hidden rounded-[18px] border-2 border-acento/60 bg-tarjeta shadow-[0_0_0_5px_rgba(255,138,61,0.07)]">
        <div className="flex gap-3 border-r border-linea px-5 py-4">
          <span className="grid h-7 min-w-7 shrink-0 place-items-center rounded-[5px] bg-kraft2 font-titulo font-bold text-white">1</span>
          <div>
            <p className="flex items-center gap-2 text-[0.9rem] font-semibold text-acento">
              <Star className="size-4" strokeWidth={2.6} /> Asignación
            </p>
            <p className="mt-1 font-titulo text-[1.35rem] leading-tight font-bold">Repartidor con nota ≥ {num(datos.rating_min, 1)}</p>
          </div>
        </div>
        <div className="flex gap-3 border-r border-linea px-5 py-4">
          <span className="grid h-7 min-w-7 shrink-0 place-items-center rounded-[5px] bg-kraft2 font-titulo font-bold text-white">2</span>
          <div>
            <p className="flex items-center gap-2 text-[0.9rem] font-semibold text-acento">
              <Route className="size-4" strokeWidth={2.6} /> Radio de cobertura
            </p>
            <p className="mt-1 font-titulo text-[1.35rem] leading-tight font-bold first-letter:uppercase">{reglaRadio}</p>
          </div>
        </div>
        <div className="bg-fondo2/50 px-5 py-4">
          <p className="text-[0.9rem] font-semibold text-atenuado">Si se opera dentro de las 2 reglas ({num(r.n_muestra, 0)} pedidos de test)</p>
          <p className="mt-1 flex items-center gap-2 font-titulo text-[1.9rem] leading-none font-bold whitespace-nowrap">
            <span className="text-c3">{pct(r.p_antes)}</span>
            <ArrowRight className="size-6 text-tenue" strokeWidth={2.6} />
            <span className="text-c0">{pct(r.p_despues)}</span>
            <span className="font-texto text-[0.95rem] font-normal text-atenuado">riesgo medio</span>
          </p>
          <p className="mt-2 text-[1rem] whitespace-nowrap">
            Pedidos sobre 50 % de riesgo: <b>{num(r.altos_antes, 0)}</b> → <b className="text-c0">{num(r.altos_despues, 0)}</b>
          </p>
        </div>
      </section>

      <MapaCalor datos={datos} info={info} />

      <Tarjeta
        titulo="Dependencia parcial por variable"
        icono={ChartSpline}
        extra={<span className="text-[0.9rem] whitespace-nowrap text-tenue">Ordenadas por cuánto cambian el riesgo · cada gráfico tiene su escala · línea punteada: pedido promedio</span>}
      >
        <div className="grid grid-cols-3 gap-x-8 gap-y-5">
          {datos.tabla.map((f) =>
            datos.dependencia[f.Variable] ? (
              <MiniGrafico
                key={f.Variable}
                info={info}
                variable={f.Variable}
                puntos={datos.dependencia[f.Variable]}
                meta={meta}
                rango={traducirRango(info, f.Variable, f["Valores con riesgo bajo la tasa base"])}
                efecto={f["Rango de efecto"]}
                maxY={techo(Math.max(meta, ...datos.dependencia[f.Variable].map((p) => p.Prob_critico)) * 1.12)}
              />
            ) : null,
          )}
        </div>
      </Tarjeta>
    </div>
  );
}

function MapaCalor({ datos, info }: { datos: DatosVentana; info: Info }) {
  const { trafico, distancias, prob } = datos.distancia_trafico;
  const max = Math.max(...prob.flat());
  const T = info.variables.Traffic.opciones ?? {};
  const [hover, setHover] = useState<{ t: number; d: number } | null>(null);
  return (
    <Tarjeta
      titulo="Riesgo según distancia y tráfico"
      icono={Grid3x3}
      extra={
        <span className="text-[0.95rem] text-atenuado">
          {hover ? (
            <>
              Tráfico {(T[trafico[hover.t]] ?? trafico[hover.t]).toLowerCase()}, {distancias[hover.d]} km: <b className="text-texto">{pct(prob[hover.t][hover.d])}</b>
            </>
          ) : (
            <>Borde blanco: radio de cobertura de cada tráfico</>
          )}
        </span>
      }
    >
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `92px repeat(${distancias.length}, minmax(0, 1fr))` }} onPointerLeave={() => setHover(null)}>
        {trafico.map((t, i) => {
          const radio = datos.radio_km[t] ?? 0;
          return [
            <div key={`l${t}`} className="flex items-center pr-2 text-[1rem] font-medium text-atenuado">
              {T[t] ?? t}
            </div>,
            ...distancias.map((d, j) => {
              const p = prob[i][j];
              const claro = p >= datos.meta;
              const borde = d === radio;
              return (
                <motion.div
                  key={`${t}${d}`}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.008 * j + 0.04 * i, duration: 0.25 }}
                  onPointerEnter={() => setHover({ t: i, d: j })}
                  className={cx("relative grid h-[44px] place-items-center rounded-[6px] font-titulo text-[0.92rem] font-semibold", borde && "ring-[3px] ring-white")}
                  style={{ background: colorRiesgo(p, datos.meta, max), color: claro ? "#1A0F05" : "#0B1622" }}
                >
                  {num(p * 100, 0)}
                </motion.div>
              );
            }),
          ];
        })}
        <div />
        {distancias.map((d) => (
          <div key={d} className="pt-1 text-center text-[0.85rem] text-tenue">
            {d}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[0.9rem] text-tenue">
        <span>Probabilidad media de retraso crítico, en %</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <i className="inline-block size-3 rounded-[3px] bg-c0" /> bajo el pedido promedio
          </span>
          <span className="flex items-center gap-1.5">
            <i className="inline-block size-3 rounded-[3px] bg-c2" /> sobre el pedido promedio
          </span>
          <span className="flex items-center gap-1.5">
            <i className="inline-block size-3 rounded-[3px] bg-c4" /> máximo
          </span>
          <span>Distancia (km)</span>
        </span>
      </div>
    </Tarjeta>
  );
}

function MiniGrafico({
  info,
  variable,
  puntos,
  meta,
  rango,
  efecto,
  maxY,
}: {
  info: Info;
  variable: string;
  puntos: { valor: string; Prob_critico: number }[];
  meta: number;
  rango: string;
  efecto: number;
  maxY: number;
}) {
  const [ref, ancho] = useAncho<HTMLDivElement>(300);
  const v = info.variables[variable as ClaveVariable];
  const categorica = v?.tipo !== "numero";
  const H = 140;
  const M = { izq: 6, der: 6, arr: 18, aba: 24 };
  const w = ancho - M.izq - M.der;
  const h = H - M.arr - M.aba;
  const sy = (y: number) => M.arr + (1 - Math.min(y, maxY) / maxY) * h;
  const xs = puntos.map((p) => Number(p.valor));
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const sx = (x: number) => M.izq + ((x - x0) / Math.max(x1 - x0, 1e-6)) * w;

  return (
    <div className="min-w-0">
      <div className="flex items-baseline gap-2">
        <h3 className="truncate font-titulo text-[1.02rem] font-semibold">{v?.etiqueta ?? variable}</h3>
        {variable === "Vehicle" ? (
          <span className="shrink-0 rounded-full bg-white/[0.07] px-2 py-px text-[0.75rem] font-bold whitespace-nowrap text-atenuado">no es parte de la ventana</span>
        ) : (
          v?.operable && <span className="shrink-0 rounded-full bg-acento/15 px-2 py-px text-[0.75rem] font-bold text-acento">controlable</span>
        )}
      </div>
      <div ref={ref}>
        <svg width={ancho} height={H} role="img" aria-label={`Dependencia parcial de ${v?.etiqueta ?? variable}`}>
          <line x1={M.izq} x2={M.izq + w} y1={sy(0)} y2={sy(0)} stroke="#25415E" />
          <line x1={M.izq} x2={M.izq + w} y1={sy(maxY)} y2={sy(maxY)} stroke="#25415E" strokeOpacity={0.5} />
          <text x={M.izq + w} y={sy(maxY) - 5} textAnchor="end" className="fill-tenue text-[12px]">
            {pct(maxY, 0)}
          </text>
          <line x1={M.izq} x2={M.izq + w} y1={sy(meta)} y2={sy(meta)} stroke="#93A7BC" strokeDasharray="5 5" strokeWidth={1.3} />
          {categorica ? (
            puntos.map((p, i) => {
              const bw = w / puntos.length;
              const x = M.izq + i * bw + bw * 0.14;
              return (
                <g key={p.valor}>
                  <motion.rect
                    x={x}
                    width={bw * 0.72}
                    rx={4}
                    initial={{ y: sy(0), height: 0 }}
                    animate={{ y: sy(p.Prob_critico), height: sy(0) - sy(p.Prob_critico) }}
                    transition={{ type: "spring", stiffness: 140, damping: 20, delay: i * 0.04 }}
                    fill={p.Prob_critico < meta ? "#3DDC97" : "#FF8A3D"}
                  />
                  <text x={x + bw * 0.36} y={H - 7} textAnchor="middle" className="fill-atenuado text-[12px]">
                    {etiquetaValor(info, variable, p.valor).replace("Tormenta de arena", "T. arena")}
                  </text>
                </g>
              );
            })
          ) : (
            <>
              <motion.path
                d={lineaPath(puntos.map((p) => ({ x: sx(Number(p.valor)), y: sy(p.Prob_critico) })))}
                fill="none"
                stroke="#FF8A3D"
                strokeWidth={3}
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
              {puntos.map((p) => (
                <circle key={p.valor} cx={sx(Number(p.valor))} cy={sy(p.Prob_critico)} r={3.6} fill={p.Prob_critico < meta ? "#3DDC97" : "#FF8A3D"} stroke="#15263A" strokeWidth={1.5} />
              ))}
              {[x0, x1].map((x) => (
                <text key={x} x={sx(x)} y={H - 7} textAnchor={x === x0 ? "start" : "end"} className="fill-atenuado text-[12px]">
                  {num(x, 1).replace(/,0$/, "")} {v?.unidad ?? ""}
                </text>
              ))}
            </>
          )}
        </svg>
      </div>
      <div className="flex items-baseline gap-3 text-[0.9rem] text-atenuado">
        <p>
          Bajo el pedido promedio: <span className="font-semibold text-texto">{rango}</span>
        </p>
        <span className="ml-auto shrink-0 text-tenue">efecto {num(efecto * 100, 1)} pts</span>
      </div>
    </div>
  );
}
