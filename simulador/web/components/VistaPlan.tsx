"use client";

import { motion } from "motion/react";
import { BadgeCheck, ChartLine, CircleCheck, ClipboardList, Coins, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { acentuar, clp, clpM, num, normalizar, pct } from "@/lib/formato";
import type { Info, Plan, ResumenPlan } from "@/lib/tipos";
import { ChipClase, COLOR_CLASE, cx, Deslizador, NumeroAnimado, Tarjeta } from "./ui";
import { lineaPath, resorte, TrazoAnimado, useAncho } from "./simulador/Grafico";

type Supuestos = { costoCritico: number; efectividad: number; costoAccion: number };

/** La misma fórmula de calcular_roi() en la parte E del notebook. */
function calcularRoi(r: ResumenPlan, criticosDia: number, conModelo: boolean, capacidadDia: number, s: Supuestos) {
  const beneficio = criticosDia * r.dias_anio * s.efectividad * s.costoCritico;
  const costo = r.costo_coordinador_anual + capacidadDia * r.dias_anio * s.costoAccion + (conModelo ? r.costo_modelo_anual : 0);
  return { beneficio, costo, neto: beneficio - costo, roi: (beneficio - costo) / costo };
}

const fecha = (f: string) => f.split("-").reverse().join("-");

export default function VistaPlan({ info, plan }: { info: Info; plan: Plan }) {
  const r = plan.resumen;
  const orden = plan.orden_criticos;
  const N = orden.length;
  const acumulado = useMemo(() => {
    const a = new Array<number>(N + 1).fill(0);
    for (let i = 0; i < N; i++) a[i + 1] = a[i] + orden[i];
    return a;
  }, [orden, N]);
  const total = acumulado[N];
  const tasaTest = total / N;

  const [capacidad, setCapacidad] = useState(r.capacidad_dia);
  const base: Supuestos = { costoCritico: r.costo_critico, efectividad: r.efectividad, costoAccion: r.costo_accion };
  const [sup, setSup] = useState<Supuestos>(base);
  const enBase = sup.costoCritico === base.costoCritico && sup.efectividad === base.efectividad && sup.costoAccion === base.costoAccion;

  // Curva de ganancia: ranking global (todo el test junto)
  const k = Math.min(N, Math.round((capacidad / r.pedidos_dia) * N));
  // Ranking diario, igual que el notebook: cada fecha revisa round(capacidad_pct × pedidos de ese día)
  const { capModelo, revisados } = useMemo(() => {
    let cap = 0, rev = 0;
    for (const dia of plan.por_dia) {
      const kd = Math.min(dia.length, Math.round((capacidad / r.pedidos_dia) * dia.length));
      rev += kd;
      for (let i = 0; i < kd; i++) cap += dia[i];
    }
    return { capModelo: cap, revisados: rev };
  }, [plan.por_dia, capacidad, r.pedidos_dia]);
  const capAzar = revisados * tasaTest;
  const lift = capAzar > 0 ? capModelo / capAzar : 0;

  // Plan oficial: ranking diario a la capacidad supuesta
  const oficialModelo = calcularRoi(r, r.capturados_modelo / r.dias_test, true, r.capacidad_dia, sup);
  const oficialAzar = calcularRoi(r, r.capturados_azar / r.dias_test, false, r.capacidad_dia, sup);
  const estModelo = calcularRoi(r, capModelo / r.dias_test, true, capacidad, sup);
  const estAzar = calcularRoi(r, capAzar / r.dias_test, false, capacidad, sup);
  const roiNotebook = plan.roi.find((x) => normalizar(x.Estrategia).includes("modelo"))?.ROI;
  const coincide = enBase && roiNotebook !== undefined && Math.abs(roiNotebook - oficialModelo.roi) < 0.006;
  // Punto de equilibrio (como en el notebook): costo de un crítico con el que el ROI del modelo es 0
  const equilibrio = (sup.costoCritico * oficialModelo.costo) / oficialModelo.beneficio;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
        <div className="max-w-[62ch]">
          <h1 className="font-titulo text-[2.5rem] leading-[1.05] font-bold tracking-[-0.02em]">Plan priorizado</h1>
          <p className="mt-2 text-[1.1rem] leading-relaxed text-atenuado">
            Un coordinador de despacho revisa cada día los {num(r.capacidad_dia, 0)} pedidos con mayor probabilidad de {info.clases[info.clase_critica].toLowerCase()} (
            {pct(r.capacidad_pct)} de unos {num(r.pedidos_dia, 0)} diarios). ¿Cuántos críticos más detecta que revisando al azar?
          </p>
        </div>
        {/* Plan oficial (ranking diario) */}
        <div className="ml-auto grid grid-cols-4 overflow-hidden rounded-[16px] border-2 border-acento/60 bg-tarjeta">
          <div className="col-span-4 flex items-center gap-2 border-b border-linea bg-acento/10 px-4 py-1.5 text-[0.92rem] font-semibold text-acento">
            <BadgeCheck className="size-4" strokeWidth={2.6} /> Ranking diario · plan oficial del notebook en los {num(r.dias_test, 1)} días de test
          </div>
          {[
            { v: num(r.capacidad_dia, 0), e: "pedidos revisados al día" },
            { v: num(r.capturados_modelo, 0), e: `críticos detectados con el modelo, de ${num(r.criticos_test, 0)}` },
            { v: num(r.capturados_azar, 1), e: "esperados al azar con la misma capacidad" },
            { v: `${num(r.lift, 2)}×`, e: "lift: veces más que al azar" },
          ].map((x) => (
            <div key={x.e} className="border-r border-linea px-4 py-3 last:border-r-0">
              <p className="font-titulo text-[2rem] leading-none font-bold">{x.v}</p>
              <p className="mt-1 max-w-[17ch] text-[0.88rem] leading-snug text-atenuado">{x.e}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-5">
        <Tarjeta
          titulo="Curva de ganancia"
          icono={ChartLine}
          extra={<span className="rounded-full bg-white/[0.07] px-2.5 py-0.5 text-[0.85rem] font-semibold whitespace-nowrap text-atenuado">Curva y sus %: todo el test junto</span>}
        >
          <CurvaGanancia acumulado={acumulado} total={total} x={k / N} yModelo={acumulado[k] / total} yAzar={k / N} />
          <div className="mt-2 grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-center gap-6">
            <Deslizador
              etiqueta="Capacidad diaria"
              valor={capacidad}
              min={10}
              max={Math.min(400, Math.floor(r.pedidos_dia))}
              paso={5}
              formato={(x) => `${num(x, 0)} pedidos (${pct(x / r.pedidos_dia)})`}
              onChange={setCapacidad}
            />
            <div className="relative grid grid-cols-3 gap-3 rounded-[12px] border border-acento/40 px-2 pt-4 pb-2 text-center">
              <span className="absolute -top-2.5 left-3 rounded-full bg-tarjeta px-2 text-[0.78rem] font-bold text-acento">Ranking diario</span>
              <Kpi valor={<NumeroAnimado valor={capModelo / r.dias_test} formato={(x) => num(x, 1)} />} etiqueta="críticos al día con el modelo" color="#FF8A3D" />
              <Kpi valor={<NumeroAnimado valor={capAzar / r.dias_test} formato={(x) => num(x, 1)} />} etiqueta="al azar" color="#93A7BC" />
              <Kpi valor={<NumeroAnimado valor={lift} formato={(x) => `${num(x, 2)}×`} />} etiqueta="lift" color="#2EC4B6" />
            </div>
          </div>
          <p className="mt-3 text-[0.9rem] leading-snug text-tenue">
            La curva ordena los {num(N, 0)} pedidos de test de una sola vez. Las cifras de abajo ordenan día a día, como trabajaría el coordinador
            (igual que el plan del notebook), y por eso son más conservadoras: {num(r.capturados_modelo, 0)} en vez de {num(r.capturados_global, 0)} con{" "}
            {num(r.capacidad_dia, 0)} al día.
          </p>
        </Tarjeta>

        <Tarjeta
          titulo="Retorno de la inversión anual"
          icono={Coins}
          extra={
            enBase ? (
              coincide && (
                <span className="flex items-center gap-1.5 rounded-full bg-c0/12 px-2.5 py-0.5 text-[0.85rem] font-semibold text-c0">
                  <CircleCheck className="size-4" strokeWidth={2.6} /> Igual al notebook
                </span>
              )
            ) : (
              <button type="button" onClick={() => setSup(base)} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.9rem] font-semibold text-atenuado hover:bg-white/5 hover:text-texto">
                <RotateCcw className="size-4" strokeWidth={2.6} /> Supuestos del notebook
              </button>
            )
          }
        >
          <div className="flex flex-col gap-2.5">
            <Deslizador
              etiqueta="Costo de un retraso crítico"
              valor={sup.costoCritico}
              min={Math.round(base.costoCritico * 0.25 / 250) * 250}
              max={Math.round(base.costoCritico * 2 / 250) * 250}
              paso={250}
              formato={clp}
              onChange={(x) => setSup((s) => ({ ...s, costoCritico: x }))}
            />
            <Deslizador
              etiqueta="Efectividad de la acción"
              valor={sup.efectividad}
              min={0.05}
              max={1}
              paso={0.05}
              formato={(x) => pct(x, 0)}
              onChange={(x) => setSup((s) => ({ ...s, efectividad: Math.round(x * 100) / 100 }))}
            />
            <Deslizador
              etiqueta="Costo de cada acción"
              valor={sup.costoAccion}
              min={0}
              max={Math.max(5000, base.costoAccion * 3)}
              paso={100}
              formato={clp}
              onChange={(x) => setSup((s) => ({ ...s, costoAccion: x }))}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { nombre: "Con el modelo", x: oficialModelo, color: "#FF8A3D" },
              { nombre: "Al azar", x: oficialAzar, color: "#93A7BC" },
            ].map(({ nombre, x, color }) => (
              <div key={nombre} className="rounded-[14px] bg-fondo2/80 px-4 py-3">
                <p className="text-[0.95rem] font-semibold" style={{ color }}>
                  {nombre}
                </p>
                <p className={cx("font-titulo text-[2.4rem] leading-none font-bold", x.roi >= 0 ? "text-texto" : "text-c4")}>
                  ROI {num(x.roi, 2)}
                </p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-[0.92rem]">
                  <dt className="text-atenuado">Beneficio</dt>
                  <dd className="text-right font-semibold">{clpM(x.beneficio)}</dd>
                  <dt className="text-atenuado">Costo</dt>
                  <dd className="text-right font-semibold">{clpM(x.costo)}</dd>
                  <dt className="text-atenuado">Neto</dt>
                  <dd className={cx("text-right font-bold", x.neto >= 0 ? "text-c0" : "text-c4")}>{clpM(x.neto)}</dd>
                </dl>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[0.92rem] leading-snug text-atenuado">
            ROI = (beneficio − costo) / costo. Plan oficial, {num(r.capacidad_dia, 0)} al día (ranking diario). Con el modelo, el ROI es 0 si un crítico cuesta {clp(equilibrio)}.
            {capacidad !== r.capacidad_dia && (
              <>
                {" "}
                Con {num(capacidad, 0)} al día (ranking diario): ROI {num(estModelo.roi, 2)} con el modelo y {num(estAzar.roi, 2)} al azar.
              </>
            )}
          </p>
        </Tarjeta>
      </div>

      <Tarjeta titulo={`Ranking: los primeros ${plan.ranking.length} pedidos a intervenir`} icono={ClipboardList} extra={<span className="text-[0.9rem] text-tenue">Pedidos de test ordenados por probabilidad de retraso crítico</span>} cuerpo="px-2 pb-3">
        <div className="desplazable max-h-[520px] overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-[0.98rem]">
            <thead className="sticky top-0 z-10 bg-tarjeta text-left text-[0.88rem] text-atenuado">
              <tr>
                {["#", "Pedido", "Fecha", "Prob. de crítico", "Clase predicha", "Qué pasó", "Tráfico", "Nota", "Distancia", "Acción asignada"].map((h) => (
                  <th key={h} className="border-b border-linea px-3 py-2 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plan.ranking.map((f) => {
                const ip = info.clases.findIndex((c) => normalizar(c) === normalizar(f.Clase_predicha));
                return (
                  <tr key={f.Order_ID} className="hover:bg-white/[0.03]">
                    <td className="border-b border-linea/50 px-3 py-2 font-titulo font-bold text-acento">{f.Prioridad}</td>
                    <td className="border-b border-linea/50 px-3 py-2 font-mono text-[0.9rem]">{f.Order_ID}</td>
                    <td className="border-b border-linea/50 px-3 py-2 whitespace-nowrap text-atenuado">{fecha(f.Fecha)}</td>
                    <td className="border-b border-linea/50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-white/[0.07]">
                          <div className="h-full rounded-full bg-c4" style={{ width: `${f.Prob_critico * 100}%` }} />
                        </div>
                        <span className="font-semibold whitespace-nowrap">{pct(f.Prob_critico)}</span>
                      </div>
                    </td>
                    <td className="border-b border-linea/50 px-3 py-2">
                      <ChipClase indice={ip} nombre={ip >= 0 ? info.clases[ip] : acentuar(f.Clase_predicha)} />
                    </td>
                    <td className="border-b border-linea/50 px-3 py-2">
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <i className="inline-block size-2.5 rounded-full" style={{ background: COLOR_CLASE[f.Clase_real] }} />
                        <span className={f.Es_critico ? "font-semibold" : "text-atenuado"}>{info.clases[f.Clase_real] ?? f.Clase_real}</span>
                      </span>
                    </td>
                    <td className="border-b border-linea/50 px-3 py-2">{f.Traffic}</td>
                    <td className="border-b border-linea/50 px-3 py-2">{num(f.Agent_Rating, 1)}</td>
                    <td className="border-b border-linea/50 px-3 py-2 whitespace-nowrap">{num(f.distancia_km, 1)} km</td>
                    <td className="border-b border-linea/50 px-3 py-2 text-[0.95rem]">{acentuar(f.Accion)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </div>
  );
}

function Kpi({ valor, etiqueta, color }: { valor: React.ReactNode; etiqueta: string; color: string }) {
  return (
    <div>
      <p className="font-titulo text-[2rem] leading-none font-bold" style={{ color }}>
        {valor}
      </p>
      <p className="mt-1 text-[0.85rem] leading-tight text-atenuado">{etiqueta}</p>
    </div>
  );
}

function CurvaGanancia({ acumulado, total, x, yModelo, yAzar }: { acumulado: number[]; total: number; x: number; yModelo: number; yAzar: number }) {
  const [ref, ancho] = useAncho<HTMLDivElement>(800);
  const N = acumulado.length - 1;
  const H = 330;
  const M = { izq: 58, der: 20, arr: 16, aba: 40 };
  const w = ancho - M.izq - M.der;
  const h = H - M.arr - M.aba;
  const sx = (v: number) => M.izq + v * w;
  const sy = (v: number) => M.arr + (1 - v) * h;
  const puntos = useMemo(() => {
    const ps: { x: number; y: number }[] = [];
    for (let i = 0; i <= 400; i++) {
      const kk = Math.round((i / 400) * N);
      ps.push({ x: kk / N, y: acumulado[kk] / total });
    }
    return ps;
  }, [acumulado, N, total]);
  const escalado = puntos.map((p) => ({ x: sx(p.x), y: sy(p.y) }));
  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1];
  return (
    <div ref={ref}>
      <svg width={ancho} height={H} role="img" aria-label="Curva de ganancia: porcentaje de críticos capturados según el porcentaje de pedidos revisados">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.izq} x2={M.izq + w} y1={sy(t)} y2={sy(t)} stroke="#25415E" strokeOpacity={t === 0 ? 1 : 0.5} />
            <text x={M.izq - 10} y={sy(t) + 5} textAnchor="end" className="fill-tenue text-[13px]">
              {num(t * 100, 0)}%
            </text>
            <text x={sx(t)} y={H - 20} textAnchor="middle" className="fill-tenue text-[13px]">
              {num(t * 100, 0)}%
            </text>
          </g>
        ))}
        <text x={M.izq + w / 2} y={H - 2} textAnchor="middle" className="fill-atenuado text-[13px]">
          Pedidos revisados
        </text>
        <text transform={`translate(14 ${M.arr + h / 2}) rotate(-90)`} textAnchor="middle" className="fill-atenuado text-[13px]">
          Críticos capturados
        </text>

        {/* al azar */}
        <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)} stroke="#93A7BC" strokeWidth={2} strokeDasharray="7 7" />
        <text x={sx(0.62)} y={sy(0.62) + 22} className="fill-atenuado text-[14px] font-medium" transform={`rotate(${(-Math.atan2(h, w) * 180) / Math.PI} ${sx(0.62)} ${sy(0.62) + 22})`}>
          Al azar
        </text>
        {/* modelo */}
        <path d={`${lineaPath(escalado)} L${sx(1)},${sy(0)} L${sx(0)},${sy(0)} Z`} fill="rgba(255,138,61,0.10)" />
        <motion.path d={lineaPath(escalado)} fill="none" stroke="#FF8A3D" strokeWidth={4} strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: "easeOut" }} />
        <text x={sx(0.56)} y={sy(acumulado[Math.round(0.56 * N)] / total) + 26} className="fill-acento text-[15px] font-semibold">
          Con el modelo
        </text>

        {/* capacidad */}
        <motion.g initial={false} animate={{ x: sx(x) }} transition={resorte}>
          <line x1={0} x2={0} y1={M.arr} y2={sy(0)} stroke="#E8EEF4" strokeWidth={1.5} strokeDasharray="3 4" />
          <rect x={6} y={M.arr} width={92} height={24} rx={6} fill="#E8EEF4" />
          <text x={52} y={M.arr + 17} textAnchor="middle" className="fill-[#0B1622] text-[13px] font-bold">
            capacidad
          </text>
        </motion.g>
        <TrazoAnimado d={`M${sx(x)},${sy(yModelo)} L${sx(x)},${sy(yAzar)}`} stroke="#2EC4B6" strokeWidth={5} strokeLinecap="round" />
        <motion.circle initial={false} animate={{ cx: sx(x), cy: sy(yModelo) }} transition={resorte} r={8} fill="#FF8A3D" stroke="#0B1622" strokeWidth={3} />
        <motion.circle initial={false} animate={{ cx: sx(x), cy: sy(yAzar) }} transition={resorte} r={7} fill="#93A7BC" stroke="#0B1622" strokeWidth={3} />
        <motion.text initial={false} animate={{ x: sx(x) + 14, y: sy(yModelo) + 5 }} transition={resorte} className="fill-texto text-[15px] font-bold">
          {pct(yModelo, 0)}
        </motion.text>
        <motion.text initial={false} animate={{ x: sx(x) + 14, y: sy(yAzar) + 5 }} transition={resorte} className="fill-atenuado text-[15px] font-bold">
          {pct(yAzar, 0)}
        </motion.text>
      </svg>
    </div>
  );
}
