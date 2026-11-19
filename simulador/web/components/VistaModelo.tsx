"use client";

import { motion } from "motion/react";
import { BrainCircuit, Cpu, Grid3x3, Table2 } from "lucide-react";
import { useState } from "react";
import { num, pct, segundos } from "@/lib/formato";
import type { DatosModelo, FilaTiempoDispositivo, Info } from "@/lib/tipos";
import { COLOR_CLASE, cx, Tarjeta } from "./ui";

export default function VistaModelo({ info, datos }: { info: Info; datos: DatosModelo }) {
  const mejor = info.modelo.nombre;
  const maxF1 = Math.max(...datos.comparacion.map((c) => c.F1_test));
  const clases = info.clases;
  const filas = datos.matriz.map((f) => f.reduce((a, b) => a + b, 0));
  const totalTest = filas.reduce((a, b) => a + b, 0);
  const aciertos = datos.matriz.reduce((a, f, i) => a + (f[i] ?? 0), 0);
  const [hover, setHover] = useState<{ i: number; j: number } | null>(null);
  const reporteClases = datos.reporte.slice(0, clases.length);

  return (
    <div className="flex flex-col gap-5">
      <div className="max-w-[70ch]">
        <h1 className="font-titulo text-[2.5rem] leading-[1.05] font-bold tracking-[-0.02em]">El modelo detrás del simulador</h1>
        <p className="mt-2 text-[1.1rem] leading-relaxed text-atenuado">
          Comparamos dos MLP y dos TabPFN con el F1 macro, que pesa igual las {clases.length} clases. El simulador usa {mejor}, el de mejor F1 macro en test.
        </p>
      </div>

      <Tarjeta titulo="Comparación de los cuatro modelos" icono={Table2} cuerpo="px-3 pb-4">
        <table className="w-full border-separate border-spacing-0 text-[1.05rem]">
          <thead className="text-left text-[0.92rem] text-atenuado">
            <tr>
              {["Modelo", "F1 macro CV", "Entrenamiento (muestra 7.000)", "F1 macro test", "Brecha", "Tiempo de ajuste", "Predicción en test"].map((h, i) => (
                <th key={h} className={cx("border-b border-linea px-4 py-2.5 font-semibold whitespace-nowrap", i > 0 && "text-right")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.comparacion.map((c, i) => {
              const es = c.Modelo === mejor;
              return (
                <motion.tr key={c.Modelo} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }} className={es ? "bg-acento/[0.08]" : undefined}>
                  <td className={cx("border-b border-linea/60 px-4 py-3 font-titulo text-[1.15rem] font-semibold", es && "text-acento")}>
                    <span className="flex items-center gap-3 whitespace-nowrap">
                      {c.Modelo}
                      {es && <span className="rounded-[6px] bg-acento px-2 py-0.5 text-[0.78rem] font-bold whitespace-nowrap text-[#1A0F05]">En el simulador</span>}
                    </span>
                  </td>
                  <td className="border-b border-linea/60 px-4 py-3 text-right">{num(c.F1_cv, 3)}</td>
                  <td className="border-b border-linea/60 px-4 py-3 text-right">{num(c.F1_train, 3)}</td>
                  <td className="border-b border-linea/60 px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <div className="h-2.5 w-36 overflow-hidden rounded-full bg-white/[0.06]">
                        <motion.div
                          className={cx("h-full origin-left rounded-full", es ? "bg-acento" : "bg-apoyo/70")}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: c.F1_test / maxF1 }}
                          transition={{ type: "spring", stiffness: 120, damping: 22, delay: 0.1 + 0.05 * i }}
                        />
                      </div>
                      <b className="font-titulo text-[1.2rem]">{num(c.F1_test, 3)}</b>
                    </div>
                  </td>
                  <td className="border-b border-linea/60 px-4 py-3 text-right">{num(c.Brecha, 3)}</td>
                  <td className="border-b border-linea/60 px-4 py-3 text-right">{segundos(c.Tiempo_s)}</td>
                  <td className="border-b border-linea/60 px-4 py-3 text-right">{segundos(c.Prediccion_test_s)}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 px-4 text-[0.9rem] text-tenue">
          F1 de entrenamiento sobre una muestra fija y estratificada de 7.000 filas de train, la misma para los 4 modelos. Brecha: entrenamiento menos test.
        </p>
      </Tarjeta>

      <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-5">
        <Tarjeta
          titulo={`Matriz de confusión de ${mejor} en test`}
          icono={Grid3x3}
          extra={<span className="text-[0.92rem] text-atenuado">Acierto global {pct(aciertos / totalTest)}</span>}
        >
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `150px repeat(${clases.length}, minmax(0, 1fr))` }} onPointerLeave={() => setHover(null)}>
            <div className="flex items-end pb-1 text-[0.82rem] leading-tight text-tenue">Real ↓ Predicha →</div>
            {clases.map((c, j) => (
              <div key={c} className="flex items-end justify-center gap-1.5 pb-1 text-center text-[0.88rem] leading-tight font-semibold text-atenuado">
                <i className="mb-0.5 inline-block size-2.5 shrink-0 rounded-[3px]" style={{ background: COLOR_CLASE[j] }} />
                {c}
              </div>
            ))}
            {datos.matriz.map((fila, i) => [
              <div key={`r${i}`} className="flex items-center justify-end gap-2 pr-2 text-right text-[0.92rem] leading-tight font-semibold text-atenuado">
                {clases[i]}
                <i className="inline-block size-2.5 shrink-0 rounded-[3px]" style={{ background: COLOR_CLASE[i] }} />
              </div>,
              ...fila.map((n, j) => {
                const p = filas[i] ? n / filas[i] : 0;
                const diag = i === j;
                const critica = i === info.clase_critica || j === info.clase_critica;
                return (
                  <motion.div
                    key={`${i}-${j}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.02 * (i * 5 + j) }}
                    onPointerEnter={() => setHover({ i, j })}
                    className={cx(
                      "relative flex h-[74px] flex-col items-center justify-center rounded-[10px]",
                      hover && hover.i === i && hover.j === j && "ring-2 ring-white",
                      diag && i === info.clase_critica && "ring-[3px] ring-acento",
                    )}
                    style={{
                      background: diag ? `rgba(46,196,182,${0.12 + 0.75 * p})` : `rgba(255,77,94,${0.04 + 0.85 * p})`,
                      opacity: critica || diag ? 1 : 0.92,
                    }}
                  >
                    <span className="font-titulo text-[1.3rem] font-bold">{num(n, 0)}</span>
                    <span className="text-[0.8rem] text-texto/80">{pct(p, 0)}</span>
                  </motion.div>
                );
              }),
            ])}
          </div>
          <p className="mt-3 min-h-6 text-[0.95rem] text-atenuado">
            {hover ? (
              <>
                De {num(filas[hover.i], 0)} pedidos que fueron <b className="text-texto">{clases[hover.i].toLowerCase()}</b>, el modelo predijo{" "}
                <b className="text-texto">{clases[hover.j].toLowerCase()}</b> en {num(datos.matriz[hover.i][hover.j], 0)} ({pct(datos.matriz[hover.i][hover.j] / filas[hover.i])}).
              </>
            ) : (
              <>Porcentajes por fila: cuánto de cada clase real termina en cada predicción. La diagonal son los aciertos.</>
            )}
          </p>
        </Tarjeta>

        <div className="flex flex-col gap-5">
          <Tarjeta titulo="Por clase en test" icono={Table2}>
            <div className="grid grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] gap-x-4 gap-y-2 text-[1rem]">
              <span />
              {["Precisión", "Recall", "F1"].map((h) => (
                <span key={h} className="text-right text-[0.88rem] font-semibold text-atenuado">
                  {h}
                </span>
              ))}
              {reporteClases.map((f, i) => [
                <span key={`n${i}`} className={cx("flex items-center gap-2", i === info.clase_critica && "font-bold")}>
                  <i className="inline-block size-3 rounded-[3px]" style={{ background: COLOR_CLASE[i] }} />
                  {clases[i]}
                </span>,
                <span key={`p${i}`} className="text-right">{num(f.precision, 2)}</span>,
                <span key={`r${i}`} className="text-right">{num(f.recall, 2)}</span>,
                <span key={`f${i}`} className="text-right font-semibold">{num(f["f1-score"], 2)}</span>,
              ])}
            </div>
          </Tarjeta>

          <Tarjeta titulo="Cómo predice TabPFN" icono={BrainCircuit} tono="acento">
            <ol className="flex flex-col gap-3 text-[1rem] leading-snug">
              {[
                ["Viene preentrenado", "Es un transformer entrenado con millones de tablas sintéticas. No ajusta pesos con nuestros datos."],
                ["Lee el entrenamiento como contexto", "Al hacer fit recibe los pedidos de entrenamiento con su clase y los guarda en caché (fit_with_cache)."],
                ["Compara el pedido nuevo con ese contexto", "Con atención entre filas y columnas entrega las probabilidades de cada clase en una pasada: predict_proba."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-acento font-titulo text-[1rem] font-bold text-acento">{i + 1}</span>
                  <span>
                    <b className="font-titulo text-[1.08rem]">{t}.</b> <span className="text-atenuado">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 rounded-[10px] bg-fondo2/70 px-3 py-2 text-[0.95rem] text-atenuado">
              Ajuste elegido con GridSearchCV: <b className="text-texto">n_estimators = {info.modelo.n_estimators}</b>,{" "}
              <b className="text-texto">balance_probabilities = {info.modelo.balance_probabilities ? "True" : "False"}</b>. Sin SMOTE ni escalado.
            </p>
          </Tarjeta>

          <Tiempos filas={datos.tiempos_dispositivo ?? null} />
        </div>
      </div>
    </div>
  );
}

/** Tiempos de TabPFN ajustado en la GPU de Apple (MPS) contra CPU (resultados/tiempos_dispositivo.csv). */
function Tiempos({ filas }: { filas: FilaTiempoDispositivo[] | null }) {
  const es = (f: FilaTiempoDispositivo, k: string) => f.Dispositivo.toLowerCase().includes(k);
  const gpu = filas?.find((f) => es(f, "mps") || es(f, "gpu"));
  const cpu = filas?.find((f) => !es(f, "mps") && !es(f, "gpu") && es(f, "cpu"));
  return (
    <Tarjeta titulo="Tiempos y hardware" icono={Cpu}>
      <p className="text-[1rem] leading-snug text-atenuado">
        Tiempos medidos en un Mac con Apple M5 Pro. TabPFN corre en la GPU de Apple (MPS); la MLP (scikit-learn) siempre en CPU.
        {gpu && cpu && (
          <>
            {" "}
            En CPU, TabPFN tarda <b className="text-texto">{num(cpu.Veces_mas_lento_que_MPS, 0)} veces más</b> ({num(cpu.Prediccion_s, 0)} s contra{" "}
            {num(gpu.Prediccion_s, 0)} s al predecir {num(cpu.Filas_prediccion, 0)} pedidos).
          </>
        )}
      </p>
    </Tarjeta>
  );
}
