"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/** Mide el ancho real del contenedor para dibujar el SVG a escala 1:1 (texto nítido, sin deformar). */
export function useAncho<T extends HTMLElement>(inicial = 600) {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(inicial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.max(200, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho] as const;
}

/** Techo "bonito" para el eje Y de una probabilidad. */
export function techo(x: number) {
  const pasos = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8, 1];
  return pasos.find((p) => p >= x) ?? 1;
}

export function ticksY(max: number) {
  const paso = max <= 0.1 ? 0.025 : max <= 0.2 ? 0.05 : max <= 0.5 ? 0.1 : 0.25;
  const t: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += paso) t.push(Math.round(v * 1000) / 1000);
  return t;
}

export type Punto = { x: number; y: number };

export function lineaPath(puntos: Punto[]) {
  return puntos.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

export function areaPath(puntos: Punto[], base: number) {
  if (!puntos.length) return "";
  return `${lineaPath(puntos)} L${puntos[puntos.length - 1].x.toFixed(2)},${base} L${puntos[0].x.toFixed(2)},${base} Z`;
}

export const resorte = { type: "spring" as const, stiffness: 170, damping: 26 };

export function TrazoAnimado(props: React.ComponentProps<typeof motion.path> & { d: string }) {
  const { d, ...resto } = props;
  return <motion.path initial={false} animate={{ d }} transition={resorte} {...resto} />;
}
