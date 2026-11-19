"use client";

import { animate, AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Car, Clock3, CloudSun, House, Store } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { num } from "@/lib/formato";
import type { Info, Pedido } from "@/lib/tipos";
import { COLOR_CLASE, cx } from "../ui";
import { ICONO_CLIMA, ICONO_VEHICULO } from "./Controles";
import { useAncho } from "./Grafico";

/** Tramos de Delivery_Time con que se construyó la clase (cortes 60, 120, 150 y 180 min). */
const RANGO_CLASE = ["hasta 1 h", "1 a 2 h", "2 a 2,5 h", "2,5 a 3 h", "más de 3 h"];
/** Duración del viaje en pantalla según la clase predicha: más lento = peor. Solo ilustrativa. */
const DURACION_S = [2, 3, 4, 5, 6];
/** Autos de "tráfico" dibujados sobre la ruta. */
const AUTOS: Record<string, number> = { Low: 1, Medium: 3, High: 5, Jam: 8 };

const ICONO = 40; // px de los íconos de tienda y cliente

/**
 * Ruta tienda → cliente. El largo en pantalla sigue a la distancia (1–21 km → 45–100 % del ancho),
 * el vehículo elegido recorre la ruta y al llegar el cliente muestra la clase predicha con su tramo de horas.
 * El viaje se repite solo cuando llega una predicción nueva (viaje cambia).
 */
export default function Ruta({ info, pedido, clase, viaje }: { info: Info; pedido: Pedido; clase: number; viaje: number }) {
  const [ref, ancho] = useAncho<HTMLDivElement>(780);
  const reducir = useReducedMotion();
  const [llegado, setLlegado] = useState(false);
  const vehiculo = useRef<HTMLDivElement>(null);
  const V = info.variables;
  const dMin = V.distancia_km.min ?? 1;
  const dMax = V.distancia_km.max ?? 21;
  const frac = 0.45 + 0.55 * Math.min(Math.max((pedido.distancia_km - dMin) / (dMax - dMin), 0), 1);
  const largo = Math.max(ancho * frac - ICONO, 60); // px de ruta entre los dos íconos
  const IconoVehiculo = ICONO_VEHICULO[pedido.Vehicle] ?? Car;
  const IconoClima = ICONO_CLIMA[pedido.Weather] ?? CloudSun;
  const autos = AUTOS[pedido.Traffic] ?? 2;
  const trafico = (V.Traffic.opciones?.[pedido.Traffic] ?? pedido.Traffic).toLowerCase();
  const clima = (V.Weather.opciones?.[pedido.Weather] ?? pedido.Weather).toLowerCase();
  const hayClase = clase >= 0 && clase < info.clases.length;
  const color = hayClase ? COLOR_CLASE[clase] : "#93A7BC";
  const duracion = hayClase ? (DURACION_S[clase] ?? 4) : 4;
  // Insignia al lado del cliente si cabe; si no, encima de él
  const alLado = ancho * frac + ICONO + 12 + 300 < ancho; // fin del cliente + margen + ancho de la insignia

  // Nuevo viaje: el vehículo sale de la tienda y "llega" al cumplirse la duración (con un temporizador,
  // no con el fin de la animación, para que la insignia aparezca siempre). Con menos movimiento llega de inmediato.
  // La animación es imperativa (animate) porque la app envuelve las vistas en AnimatePresence initial={false},
  // que anula las animaciones de entrada de los motion.* hijos.
  useEffect(() => {
    const el = vehiculo.current;
    if (!hayClase) {
      if (el) el.style.left = "0%";
      return setLlegado(false);
    }
    if (reducir) {
      if (el) el.style.left = "100%";
      return setLlegado(true);
    }
    setLlegado(false);
    const control = el ? animate(el, { left: ["0%", "100%"] }, { duration: duracion, ease: [0.35, 0, 0.45, 1] }) : null;
    const t = setTimeout(() => setLlegado(true), duracion * 1000);
    return () => {
      control?.stop();
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viaje, reducir]);

  return (
    <div ref={ref} className="relative h-[136px] select-none" role="img" aria-label={`Ruta de ${num(pedido.distancia_km, 1)} km con tráfico ${trafico} y clima ${clima}${hayClase ? `. Llegada esperada: ${info.clases[clase]}, ${RANGO_CLASE[clase]}` : ""}`}>
      {/* clima sobre la ruta */}
      <div className="absolute top-[6px] flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[0.85rem] whitespace-nowrap text-atenuado" style={{ left: ICONO + 10 }}>
        <IconoClima className="size-4 text-texto/85" strokeWidth={2.4} aria-hidden />
        {V.Weather.opciones?.[pedido.Weather] ?? pedido.Weather}
      </div>

      {/* tienda */}
      <div className="absolute top-[40px] left-0 flex w-[40px] flex-col items-center">
        <span className="grid size-10 place-items-center rounded-[10px] bg-kraft2 text-white shadow-[0_3px_0_rgba(0,0,0,0.3)]">
          <Store className="size-5" strokeWidth={2.4} aria-hidden />
        </span>
        <span className="mt-1 text-[0.78rem] font-semibold text-atenuado">Tienda</span>
      </div>

      {/* ruta punteada con el tráfico */}
      <div className="absolute top-[59px]" style={{ left: ICONO, width: largo }}>
        <div className="ruta h-[3px] w-full" />
        {Array.from({ length: autos }, (_, i) => (
          <Car
            key={i}
            className="absolute size-[15px] text-tenue"
            strokeWidth={2.4}
            aria-hidden
            style={{ left: `${((i + 0.6) / (autos + 0.4)) * 100}%`, top: i % 2 ? 6 : -19 }}
          />
        ))}
        {/* vehículo: recorre la ruta y se detiene justo antes del cliente */}
        <div className="absolute inset-y-0 left-0" style={{ width: Math.max(largo - 24, 20) }}>
        <div ref={vehiculo} data-vehiculo="" className="absolute -top-[17px] left-0 z-10 -ml-[18px]">
          <span className="grid size-9 place-items-center rounded-full bg-acento text-[#1A0F05] shadow-[0_0_0_5px_rgba(255,138,61,0.2),0_4px_10px_rgba(0,0,0,0.45)]">
            <IconoVehiculo className="size-5" strokeWidth={2.4} aria-hidden />
          </span>
        </div>
        </div>
      </div>

      {/* cliente */}
      <div className="absolute top-[40px] flex w-[40px] flex-col items-center" style={{ left: ICONO + largo }}>
        <span className="grid size-10 place-items-center rounded-[10px] border-2 bg-tarjeta2 text-texto transition-colors" style={{ borderColor: llegado && hayClase ? color : "#25415E" }}>
          <House className="size-5" strokeWidth={2.4} aria-hidden />
        </span>
        <span className="mt-1 text-[0.78rem] font-semibold text-atenuado">Cliente</span>
      </div>

      {/* llegada esperada */}
      <AnimatePresence>
        {llegado && hayClase && (
          <motion.div
            key={`${viaje}-${clase}`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className={cx("absolute flex items-center gap-2 rounded-[12px] border-2 bg-fondo2 px-3 whitespace-nowrap", alLado ? "top-[36px] py-1.5" : "top-0 -translate-x-full py-0.5")}
            style={{ borderColor: color, left: alLado ? ICONO + largo + ICONO + 12 : ICONO + largo + ICONO - 2 }}
          >
            <Clock3 className="size-5 shrink-0" style={{ color }} strokeWidth={2.6} aria-hidden />
            <span className={cx("leading-tight", !alLado && "flex items-baseline gap-1.5")}>
              <span className={cx("block text-atenuado", alLado ? "text-[0.75rem]" : "text-[0.85rem]")}>Llegada esperada{!alLado && ":"}</span>
              <span className="block text-[0.98rem] font-bold" style={{ color }}>
                {info.clases[clase]} <span className="font-semibold text-texto/90">· {RANGO_CLASE[clase]}</span>
              </span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* resumen bajo la ruta */}
      <p className="absolute bottom-0 left-0 text-[0.95rem] whitespace-nowrap text-atenuado">
        <b className="font-titulo text-[1.05rem] text-texto">{num(pedido.distancia_km, 1)} km</b> · tráfico {trafico} · {clima}
      </p>
    </div>
  );
}
