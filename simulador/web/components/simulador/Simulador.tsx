"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ChevronDown, Tag, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, clavePedido, completar, esAborto } from "@/lib/api";
import { num } from "@/lib/formato";
import type { ClaveVariable, Curvas, Info, Pedido, Prediccion } from "@/lib/tipos";
import { ChipClase, cx, Paso } from "../ui";
import { InsigniaVentana, NotaVentana, PanelVentana } from "./Acciones";
import Controles from "./Controles";
import Calculando from "./Calculando";
import CurvaQueSi from "./CurvaQueSi";
import Medidor, { veredicto } from "./Medidor";
import Probabilidades, { ClaseReal } from "./Probabilidades";
import Ruta from "./Ruta";

type Props = { info: Info; pedido: Pedido; ejemplo: string | null; onPedido: (p: Pedido, ejemplo?: string | null) => void };

const ESPERA_PREDECIR = 200;
const ESPERA_CURVAS = 650;

export default function Simulador({ info, pedido, ejemplo, onPedido }: Props) {
  const clave = clavePedido(pedido);
  // n cuenta las respuestas: cada predicción nueva repite el viaje de la ruta
  const [pred, setPred] = useState<{ para: string; datos: Prediccion; n: number } | null>(null);
  const [curvas, setCurvas] = useState<{ para: string; datos: Curvas } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // "Aplicar la ventana": riesgo de antes y el pedido para deshacer
  const [aplicado, setAplicado] = useState<{ antes: number; pedido: Pedido; ejemplo: string | null } | null>(null);
  const [verCurvas, setVerCurvas] = useState(false);
  const primera = useRef(true);

  /*
   * Canal único hacia la API. TabPFN atiende una predicción a la vez (usa la GPU), así que el navegador
   * nunca deja más de una petición en vuelo: si el usuario sigue moviendo un slider, solo se manda el
   * último pedido. Las curvas (≈1 s) solo se piden con el panel abierto y si el pedido no cambió entretanto.
   */
  const canal = useRef({ ocupado: false, pred: null as Pedido | null, curvas: null as Pedido | null, actual: clave, vivo: true });
  canal.current.actual = clave;

  const bombear = useCallback(async () => {
    const c = canal.current;
    if (c.ocupado || !c.vivo) return;
    const tipo = c.pred ? "pred" : c.curvas ? "curvas" : null;
    if (!tipo) return;
    const p = (tipo === "pred" ? c.pred : c.curvas)!;
    if (tipo === "pred") c.pred = null;
    else c.curvas = null;
    const k = clavePedido(p);
    if (tipo === "curvas" && k !== c.actual) return bombear();
    c.ocupado = true;
    try {
      // En un servidor sin GPU un pedido nuevo tarda segundos y las curvas cerca de un minuto, más la fila
      const senal = AbortSignal.timeout(180_000);
      if (tipo === "pred") {
        const d = await api.predecir(p, senal);
        if (c.vivo) setPred((prev) => ({ para: k, datos: d, n: (prev?.n ?? 0) + 1 }));
      } else {
        const d = await api.curvas(p, senal);
        if (c.vivo) setCurvas({ para: k, datos: d });
      }
      if (c.vivo) setError(null);
    } catch (e) {
      if (c.vivo && !esAborto(e)) setError(e instanceof DOMException && e.name === "TimeoutError" ? "la API tardó más de 3 min en responder (¿muchas personas usándola a la vez?)." : (e as Error).message);
    } finally {
      c.ocupado = false;
      bombear();
    }
  }, []);

  useEffect(() => {
    const c = canal.current;
    c.vivo = true;
    return () => {
      c.vivo = false;
    };
  }, []);

  // predict_proba con debounce corto
  useEffect(() => {
    const tp = setTimeout(
      () => {
        canal.current.pred = pedido;
        bombear();
      },
      primera.current ? 0 : ESPERA_PREDECIR,
    );
    primera.current = false;
    return () => clearTimeout(tp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  // curvas: solo con el panel abierto (ahorra GPU)
  useEffect(() => {
    if (!verCurvas || curvas?.para === clave) return;
    const tc = setTimeout(() => {
      canal.current.curvas = pedido;
      bombear();
    }, ESPERA_CURVAS);
    return () => clearTimeout(tc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, verCurvas]);

  const cambiar = useCallback(
    <K extends ClaveVariable>(k: K, v: Pedido[K]) => {
      setAplicado(null);
      onPedido({ ...pedido, [k]: v }, ejemplo);
    },
    [pedido, ejemplo, onPedido],
  );

  const cargarEjemplo = (i: number) => {
    const e = info.ejemplos[i];
    setAplicado(null);
    onPedido(completar(e.pedido, info.tipico), e.id);
    const q = new URLSearchParams(window.location.search);
    q.set("ejemplo", String(i));
    window.history.replaceState(null, "", `?${q.toString()}`);
  };

  const ej = info.ejemplos.find((e) => e.id === ejemplo) ?? null;
  const intacto = useMemo(() => (ej ? clavePedido(completar(ej.pedido, info.tipico)) === clave : false), [ej, info.tipico, clave]);

  const fresca = pred?.para === clave;
  const datos = pred?.datos;
  const prob = datos?.prob_critico ?? 0;
  const v = veredicto(prob, datos?.clase ?? -1, info.clase_critica, info.tasa_base);
  const curvasFrescas = curvas?.para === clave;
  const c = curvas?.datos;
  const V = info.variables;
  const radio = info.ventana.radio_km[pedido.Traffic];

  const aplicarVentana = () => {
    if (!datos?.dentro_ventana.cambia) return;
    setAplicado({ antes: prob, pedido, ejemplo });
    onPedido(datos.dentro_ventana.pedido, ejemplo);
  };
  const deshacer = () => {
    if (!aplicado) return;
    onPedido(aplicado.pedido, aplicado.ejemplo);
    setAplicado(null);
  };

  const titulo = (n: number, texto: string, id: string) => (
    <h2 id={id} className="mb-1.5 flex items-center gap-3 font-titulo text-[1.05rem] font-bold tracking-[0.06em] whitespace-nowrap uppercase">
      <span className="grid h-7 min-w-7 place-items-center rounded-[5px] bg-kraft2 px-1.5 text-[1rem] text-white shadow-[0_3px_0_rgba(0,0,0,0.25)]">{n}</span>
      {texto}
    </h2>
  );

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 rounded-[12px] border border-c4/60 bg-c4/10 px-4 py-2 text-[1rem]">
          <AlertTriangle className="size-5 shrink-0 text-c4" strokeWidth={2.4} />
          La API no pudo predecir este pedido: {error}
        </motion.div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] items-start gap-4">
        {/* Derecha (pasos 3 y 4): resultado y ventana. Va a la derecha para que la lectura siga 1 → 2 → 3 → 4 */}
        <div className="order-2 flex min-w-0 flex-col gap-3">
          <Paso n={3} titulo="Resultado del pedido">
            <div className="relative">
            <Calculando activo={!fresca} texto="Calculando el pedido…" estimado="un pedido nuevo tarda unos 15 s" />
            <Ruta info={info} pedido={pedido} clase={datos?.clase ?? -1} viaje={pred?.n ?? 0} />
            <div className="mt-3 grid grid-cols-2 gap-5 border-t border-linea pt-3">
              <div className="flex min-w-0 flex-col gap-3">
                <Medidor prob={prob} tasa={info.tasa_base} v={v} actualizando={!fresca} />
                <ClaseReal clases={info.clases} claseReal={ej && intacto ? ej.clase_real : null} modificado={!!ej && !intacto && ej.clase_real !== null} />
              </div>
              <Probabilidades
                clases={info.clases}
                probabilidades={datos?.probabilidades ?? info.clases.map(() => 0)}
                clase={datos?.clase ?? -1}
                critica={info.clase_critica}
                actualizando={!fresca}
              />
            </div>
            </div>
          </Paso>

          <Paso
            n={4}
            titulo="Ventana de operación"
            extra={
              <>
                <NotaVentana info={info} />
                <InsigniaVentana reglas={datos?.ventana ?? []} prob={prob} tasa={info.tasa_base} />
              </>
            }
          >
            <PanelVentana
              info={info}
              pedido={pedido}
              reglas={datos?.ventana ?? []}
              dentro={datos?.dentro_ventana ?? null}
              prob={prob}
              tasa={info.tasa_base}
              v={v}
              aplicado={aplicado && fresca ? aplicado.antes : null}
              actualizando={!fresca}
              onAplicar={aplicarVentana}
              onDeshacer={deshacer}
            />
          </Paso>
        </div>

        {/* Izquierda (pasos 1 y 2): elegir pedido y mover variables */}
        <div className="order-1 flex min-w-0 flex-col gap-3">
          <section aria-labelledby="paso-1">
            {titulo(1, "Pedidos de ejemplo", "paso-1")}
            <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="Pedidos de ejemplo">
              {info.ejemplos.map((e, i) => {
                const activo = e.id === ejemplo;
                const modificado = activo && !intacto;
                const ic = e.clase_real ? info.clases.indexOf(e.clase_real) : -1;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => cargarEjemplo(i)}
                    aria-pressed={activo}
                    title={modificado ? "Volver al pedido original" : e.descripcion}
                    className={cx(
                      "group relative flex min-w-0 items-center gap-2.5 rounded-[14px] border-2 bg-tarjeta py-1.5 pr-2.5 pl-3 text-left transition-colors",
                      activo ? "border-acento shadow-[0_0_0_4px_rgba(255,138,61,0.08)]" : "border-linea hover:border-tenue",
                    )}
                  >
                    {/* ojal de la etiqueta colgante */}
                    <span className={cx("size-3.5 shrink-0 rounded-full border-[3px]", activo ? "border-acento bg-acento/30" : "border-tenue bg-fondo")} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 font-titulo text-[1.02rem] leading-tight font-bold">
                        <Tag className={cx("size-4 shrink-0", activo ? "text-acento" : "text-tenue")} strokeWidth={2.6} />
                        <span className="truncate">{e.titulo}</span>
                      </span>
                      <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[0.82rem] whitespace-nowrap text-atenuado">
                        {modificado ? (
                          <span className="flex min-w-0 items-center gap-1 rounded-full bg-acento/15 px-1.5 py-0.5 text-[0.76rem] font-semibold text-acento">
                            <Undo2 className="size-3.5 shrink-0" strokeWidth={2.6} aria-hidden /> <span className="truncate">Modificado · volver al original</span>
                          </span>
                        ) : ic >= 0 ? (
                          <>
                            Real: <ChipClase indice={ic} nombre={e.clase_real!} />
                          </>
                        ) : (
                          "El más habitual"
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-label="Mueve las variables">
            <Controles info={info} pedido={pedido} onCambio={cambiar} n={2} />
          </section>
        </div>
      </div>

      {/* Curvas, plegadas por defecto */}
      <section className="rounded-[18px] border border-linea bg-tarjeta">
        <button
          type="button"
          aria-expanded={verCurvas}
          aria-controls="curvas"
          onClick={() => setVerCurvas((x) => !x)}
          className="flex w-full items-center gap-3 rounded-[18px] px-4 py-2.5 text-left font-titulo text-[1.05rem] font-semibold whitespace-nowrap hover:bg-white/[0.03]"
        >
          <ChevronDown className={cx("size-5 text-acento transition-transform", !verCurvas && "-rotate-90")} strokeWidth={2.6} />
          Ver cómo cambia el riesgo con cada variable
          <span className="truncate font-texto text-[0.9rem] font-normal text-tenue">
            riesgo de retraso crítico de este pedido al mover una sola variable, con todo lo demás fijo
          </span>
        </button>
        <AnimatePresence initial={false}>
          {verCurvas && (
            <motion.div
              id="curvas"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="relative px-4 pb-3">
                {verCurvas && <Calculando activo={!curvasFrescas} texto="Calculando las curvas…" estimado="las curvas predicen unos 60 pedidos y tardan cerca de un minuto" />}
                {c ? (
                  <div className="grid grid-cols-3 gap-6">
                    <CurvaQueSi
                      titulo="Distancia"
                      puntos={c.curvas.distancia_km.map((p) => ({ x: Number(p.valor), y: p.prob_critico }))}
                      dominio={[V.distancia_km.min ?? 1, V.distancia_km.max ?? 21]}
                      ticksX={[1, 5, 9, 13, 17, 21].filter((t) => t >= (V.distancia_km.min ?? 1) && t <= (V.distancia_km.max ?? 21))}
                      formatoX={(x) => `${num(x, 0)} km`}
                      xActual={pedido.distancia_km}
                      yActual={prob}
                      tasa={info.tasa_base}
                      zona={radio ? [V.distancia_km.min ?? 1, radio] : null}
                      actualizando={!curvasFrescas}
                      onElegir={(x) => cambiar("distancia_km", x)}
                    />
                    <CurvaQueSi
                      titulo="Nota del repartidor"
                      puntos={c.curvas.Agent_Rating.map((p) => ({ x: Number(p.valor), y: p.prob_critico }))}
                      dominio={[V.Agent_Rating.min ?? 2.5, V.Agent_Rating.max ?? 5]}
                      ticksX={[2.5, 3, 3.5, 4, 4.5, 5]}
                      formatoX={(x) => num(x, 1)}
                      xActual={pedido.Agent_Rating}
                      yActual={prob}
                      tasa={info.tasa_base}
                      zona={[info.ventana.rating_min, V.Agent_Rating.max ?? 5]}
                      actualizando={!curvasFrescas}
                      onElegir={(x) => cambiar("Agent_Rating", Math.round(x * 10) / 10)}
                    />
                    <CurvaQueSi
                      titulo="Hora del pedido"
                      nota="No lo controla la empresa"
                      puntos={c.curvas.hora_pedido.map((p) => ({ x: Number(p.valor), y: p.prob_critico }))}
                      dominio={[V.hora_pedido.min ?? 0, V.hora_pedido.max ?? 23]}
                      ticksX={[0, 8, 12, 16, 20, 23]}
                      formatoX={(x) => `${num(x, 0)} h`}
                      xActual={pedido.hora_pedido}
                      yActual={prob}
                      tasa={info.tasa_base}
                      saltoMayorA={2}
                      actualizando={!curvasFrescas}
                      onElegir={(x) => cambiar("hora_pedido", x)}
                    />
                  </div>
                ) : (
                  <div className="grid h-[200px] grid-cols-3 gap-6">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="rounded-[12px] bg-white/[0.035]"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
