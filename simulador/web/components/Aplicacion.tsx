"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, completar } from "@/lib/api";
import type { DatosModelo, DatosVentana, Info, Pedido, Plan } from "@/lib/tipos";
import { num } from "@/lib/formato";
import Encabezado, { type Vista, VISTAS_URL } from "./Encabezado";
import Espera, { type EstadoConexion } from "./Espera";
import Simulador from "./simulador/Simulador";
import VistaVentana from "./VistaVentana";
import VistaPlan from "./VistaPlan";
import VistaModelo from "./VistaModelo";
import { WifiOff } from "lucide-react";

type Cache = { plan?: Plan; ventana?: DatosVentana; modelo?: DatosModelo };

function leerUrl() {
  if (typeof window === "undefined") return { vista: "simulador" as Vista, ejemplo: 1 };
  const q = new URLSearchParams(window.location.search);
  const v = q.get("vista") as Vista | null;
  const e = q.get("ejemplo");
  // Sin ?ejemplo= se abre el ejemplo 1 (Pedido rescatable), el de la demo.
  return { vista: v && VISTAS_URL.includes(v) ? v : "simulador", ejemplo: e !== null && /^\d+$/.test(e) ? Number(e) : 1 };
}

export default function Aplicacion() {
  const [estado, setEstado] = useState<EstadoConexion>({ tipo: "conectando" });
  const [info, setInfo] = useState<Info | null>(null);
  const [vista, setVista] = useState<Vista>("simulador");
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [ejemplo, setEjemplo] = useState<string | null>(null);
  const [cache, setCache] = useState<Cache>({});
  const [errorVista, setErrorVista] = useState<string | null>(null);
  const [caida, setCaida] = useState(false);
  const inicioEspera = useRef<number | null>(null);

  // 1. Esperar a que la API tenga el modelo cargado
  useEffect(() => {
    let vivo = true;
    let t: ReturnType<typeof setTimeout>;
    const revisar = async () => {
      try {
        const s = await api.salud();
        if (!vivo) return;
        if (s.error) return setEstado({ tipo: "error-modelo", detalle: s.error });
        if (s.listo) {
          const i = await api.info();
          if (!vivo) return;
          const { vista: v, ejemplo: e } = leerUrl();
          setInfo(i);
          setVista(v);
          const ej = i.ejemplos[e] ?? i.ejemplos[0];
          setPedido(completar(ej?.pedido ?? i.tipico, i.tipico));
          setEjemplo(ej?.id ?? null);
          setEstado({ tipo: "listo", segundosCarga: s.segundos_carga });
          return;
        }
        inicioEspera.current ??= Date.now();
        setEstado({ tipo: "cargando", desde: inicioEspera.current });
      } catch {
        if (!vivo) return;
        setEstado({ tipo: "sin-api" });
      }
      t = setTimeout(revisar, 2000);
    };
    revisar();
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, []);

  // 2. Ya cargado: vigilar que la API siga viva durante la demo
  useEffect(() => {
    if (estado.tipo !== "listo") return;
    const t = setInterval(async () => {
      try {
        const s = await api.salud();
        setCaida(!s.listo);
      } catch {
        setCaida(true);
      }
    }, 10000);
    return () => clearInterval(t);
  }, [estado.tipo]);

  // 3. Datos de las otras pantallas: se piden una vez, al entrar
  useEffect(() => {
    if (estado.tipo !== "listo" || vista === "simulador") return;
    if (cache[vista]) return;
    let vivo = true;
    setErrorVista(null);
    const peticion = vista === "plan" ? api.plan() : vista === "ventana" ? api.ventana() : api.modelo();
    peticion
      .then((d) => vivo && setCache((c) => ({ ...c, [vista]: d })))
      .catch((e: Error) => vivo && setErrorVista(e.message));
    return () => {
      vivo = false;
    };
  }, [vista, estado.tipo, cache]);

  const cambiarVista = useCallback((v: Vista) => {
    setVista(v);
    const q = new URLSearchParams(window.location.search);
    if (v === "simulador") q.delete("vista");
    else q.set("vista", v);
    const s = q.toString();
    window.history.replaceState(null, "", s ? `?${s}` : window.location.pathname);
    window.scrollTo({ top: 0 });
  }, []);

  if (estado.tipo !== "listo" || !info || !pedido) return <Espera estado={estado} />;

  return (
    <div className="mx-auto flex min-h-dvh max-w-[2200px] flex-col">
      <Encabezado vista={vista} onVista={cambiarVista} modelo={info.modelo.nombre} />
      <AnimatePresence>
        {caida && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mx-7 overflow-hidden"
          >
            <div className="mb-3 flex items-center gap-3 rounded-[12px] border border-c4/60 bg-c4/10 px-4 py-2.5 text-[1rem]">
              <WifiOff className="size-5 text-c4" strokeWidth={2.4} />
              Se perdió la conexión con la API del modelo (puerto 8014). Revisa la terminal de <code className="font-semibold">simulador/iniciar.sh</code>.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <main className="flex-1 px-7 pb-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={vista}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {vista === "simulador" && (
              <Simulador
                info={info}
                pedido={pedido}
                ejemplo={ejemplo}
                onPedido={(p, ej = null) => {
                  setPedido(p);
                  setEjemplo(ej);
                }}
              />
            )}
            {vista !== "simulador" && !cache[vista] && <CargandoVista error={errorVista} />}
            {vista === "ventana" && cache.ventana && <VistaVentana info={info} datos={cache.ventana} />}
            {vista === "plan" && cache.plan && <VistaPlan info={info} plan={cache.plan} />}
            {vista === "modelo" && cache.modelo && <VistaModelo info={info} datos={cache.modelo} />}
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="flex items-center justify-between gap-x-6 truncate px-7 pt-0.5 pb-2 text-[0.8rem] whitespace-nowrap text-tenue">
        <span>El modelo muestra asociaciones, no causas.</span>
        <span className="truncate">
          Grupo 14 · Joaquín Rivas y Matías Ortega · Machine Learning Supervisado, UDD · probabilidades iguales al notebook (dif. máx.{" "}
          {num(info.modelo.diferencia_notebook, 5)})
        </span>
      </footer>
    </div>
  );
}

function CargandoVista({ error }: { error: string | null }) {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      {error ? (
        <div className="max-w-xl">
          <p className="font-titulo text-[1.5rem] font-semibold text-c4">No se pudieron leer los resultados</p>
          <p className="mt-2 text-[1.05rem] text-atenuado">{error}</p>
        </div>
      ) : (
        <p className="text-[1.1rem] text-atenuado">Leyendo resultados del notebook…</p>
      )}
    </div>
  );
}
