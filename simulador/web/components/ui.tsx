"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

/** Colores de clase, de Rápida a Retraso crítico (tokens de diseño, no datos). */
export const COLOR_CLASE = ["#3DDC97", "#2EC4B6", "#F6C445", "#FF8A3D", "#FF4D5E"];

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Tarjeta({
  titulo,
  icono: Icono,
  extra,
  children,
  className,
  cuerpo,
  tono = "normal",
}: {
  titulo?: React.ReactNode;
  icono?: LucideIcon;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  cuerpo?: string;
  tono?: "normal" | "acento" | "tenue";
}) {
  return (
    <section
      className={cx(
        "relative flex min-w-0 flex-col rounded-[18px] border bg-tarjeta",
        tono === "acento" ? "border-acento/60 shadow-[0_0_0_5px_rgba(255,138,61,0.07)]" : "border-linea",
        tono === "tenue" && "bg-tarjeta/60",
        className,
      )}
    >
      {titulo && (
        <header className="flex items-center gap-3 px-5 pt-4 pb-2">
          {Icono && <Icono className={cx("size-6 shrink-0", tono === "tenue" ? "text-atenuado" : "text-acento")} strokeWidth={2.4} />}
          <h2 className="font-titulo text-[1.2rem] leading-tight font-semibold">{titulo}</h2>
          {extra && <div className="ml-auto flex items-center gap-2">{extra}</div>}
        </header>
      )}
      <div className={cx("min-h-0 flex-1", cuerpo ?? "px-5 pb-5")}>{children}</div>
    </section>
  );
}

/** Número que se desliza hacia su nuevo valor en vez de saltar. */
export function NumeroAnimado({ valor, formato, duracion = 0.55 }: { valor: number; formato: (x: number) => string; duracion?: number }) {
  const [mostrado, setMostrado] = useState(valor);
  const previo = useRef(valor);
  const reducir = useReducedMotion();
  useEffect(() => {
    if (reducir) {
      setMostrado(valor);
      previo.current = valor;
      return;
    }
    const c = animate(previo.current, valor, {
      duration: duracion,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => {
        previo.current = v;
        setMostrado(v);
      },
    });
    return () => c.stop();
  }, [valor, duracion, reducir]);
  return <>{formato(mostrado)}</>;
}

export function ChipClase({ indice, nombre, grande }: { indice: number; nombre: string; grande?: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full bg-white/[0.06] font-semibold whitespace-nowrap",
        grande ? "px-3 py-1 text-[1rem]" : "px-2.5 py-0.5 text-[0.9rem]",
      )}
    >
      <i className="inline-block size-3 rounded-[3px]" style={{ background: COLOR_CLASE[indice] ?? "#93A7BC" }} />
      {nombre}
    </span>
  );
}

type Opcion = { valor: string; etiqueta: string; icono?: React.ReactNode };

/** Botones segmentados: el elegido va relleno (naranjo si es controlable). Siempre ícono + texto, nunca solo ícono. */
export function Segmentado({
  opciones,
  valor,
  onChange,
  columnas,
  acento = true,
  etiqueta,
  compacto,
}: {
  opciones: Opcion[];
  valor: string;
  onChange: (v: string) => void;
  columnas?: number;
  acento?: boolean;
  etiqueta: string;
  compacto?: boolean;
}) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const indice = opciones.findIndex((o) => o.valor === valor);
  const mover = (d: number) => {
    const n = (Math.max(indice, 0) + d + opciones.length) % opciones.length;
    onChange(opciones[n].valor);
    refs.current[n]?.focus();
  };
  return (
    <div
      role="group"
      aria-label={etiqueta}
      className="grid gap-1 rounded-[12px] border border-linea bg-fondo2 p-1"
      style={{ gridTemplateColumns: `repeat(${columnas ?? opciones.length}, minmax(0, 1fr))` }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") (e.preventDefault(), mover(1));
        if (e.key === "ArrowLeft") (e.preventDefault(), mover(-1));
      }}
    >
      {opciones.map((o, i) => {
        const activo = o.valor === valor;
        return (
          <button
            key={o.valor}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            aria-pressed={activo}
            onClick={() => onChange(o.valor)}
            className={cx(
              "relative flex min-w-0 items-center justify-center rounded-[9px] px-1.5 font-semibold whitespace-nowrap transition-colors",
              compacto ? "min-h-9 py-1" : "min-h-10 py-1.5",
              acento ? "text-[0.98rem]" : "text-[0.9rem]",
              activo ? (acento ? "text-[#1A0F05]" : "text-texto") : "text-atenuado hover:text-texto",
            )}
          >
            {activo && (
              <motion.span
                layoutId={`seg-${id}`}
                className={cx("absolute inset-0 rounded-[9px]", acento ? "bg-acento" : "bg-tarjeta2 ring-1 ring-tenue")}
                transition={{ type: "spring", stiffness: 520, damping: 38 }}
              />
            )}
            <span className="relative flex min-w-0 items-center gap-1.5">
              {o.icono}
              <span className="truncate">{o.etiqueta}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Slider con pista propia: muestra el tramo recomendado (ventana de operación) y el valor actual. */
export function Deslizador({
  etiqueta,
  valor,
  min,
  max,
  paso,
  onChange,
  formato,
  zona,
  acento = true,
  ayuda,
  icono: Icono,
}: {
  etiqueta: string;
  valor: number;
  min: number;
  max: number;
  paso: number;
  onChange: (v: number) => void;
  formato: (v: number) => string;
  zona?: [number, number] | null;
  acento?: boolean;
  ayuda?: string;
  icono?: LucideIcon;
}) {
  const id = useId();
  const p = (x: number) => ((Math.min(Math.max(x, min), max) - min) / (max - min)) * 100;
  const color = acento ? "var(--color-acento)" : "var(--color-atenuado)";
  return (
    <div className="min-w-0">
      <div className="mb-0.5 flex items-baseline gap-2">
        {Icono && <Icono className={cx("size-[1.15rem] shrink-0 self-center", acento ? "text-acento" : "text-tenue")} strokeWidth={2.4} />}
        <label htmlFor={id} className={cx("truncate text-[0.98rem] font-medium", acento ? "text-texto" : "text-atenuado")} title={ayuda}>
          {etiqueta}
        </label>
        <output htmlFor={id} className={cx("ml-auto font-titulo font-bold whitespace-nowrap", acento ? "text-[1.35rem] text-texto" : "text-[1.12rem] text-texto/90")}>
          {formato(valor)}
        </output>
      </div>
      <div className="relative h-[34px]">
        <div className="pointer-events-none absolute inset-x-[13px] top-1/2 h-[8px] -translate-y-1/2 rounded-full bg-linea/80">
          {zona && (
            <motion.div
              className="absolute -inset-y-[5px] rounded-[6px] border-2 border-dashed border-c0/70 bg-c0/15"
              initial={false}
              animate={{ left: `${p(zona[0])}%`, width: `${Math.max(p(zona[1]) - p(zona[0]), 0)}%` }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            />
          )}
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: color, opacity: acento ? 1 : 0.55 }}
            initial={false}
            animate={{ width: `${p(valor)}%` }}
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
          />
        </div>
        <input
          id={id}
          type="range"
          className="deslizador"
          style={{ ["--pulgar" as string]: color }}
          min={min}
          max={max}
          step={paso}
          value={valor}
          aria-valuetext={formato(valor)}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

/** Etiqueta de envío (marca del grupo). */
export function EtiquetaEnvio({ numero, texto }: { numero: string; texto: string }) {
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-[6px] bg-papel text-tinta shadow-[0_4px_0_rgba(0,0,0,0.25)]">
      <span className="flex items-center bg-kraft2 px-3 font-titulo text-[1rem] font-bold text-white">{numero}</span>
      <span className="flex items-center px-3 py-1.5 font-titulo text-[1rem] leading-tight font-bold">{texto}</span>
      <span className="barras my-2 mr-3 w-16 text-tinta" aria-hidden />
    </div>
  );
}

export function Cargando({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1", className)} aria-label="Actualizando">
      {[0, 1, 2].map((i) => (
        <motion.i
          key={i}
          className="block size-1.5 rounded-full bg-current"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

/** Bloque numerado del simulador: número en etiqueta kraft (como la G14) y título. */
export function Paso({
  n,
  titulo,
  extra,
  children,
  className,
  cuerpo,
}: {
  n: number;
  titulo: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  cuerpo?: string;
}) {
  return (
    <section className={cx("relative flex min-w-0 flex-col rounded-[18px] border border-linea bg-tarjeta", className)}>
      <header className="flex items-center gap-3 px-4 pt-3 pb-2">
        <span className="grid h-7 min-w-7 shrink-0 place-items-center rounded-[5px] bg-kraft2 px-1.5 font-titulo text-[1rem] font-bold text-white shadow-[0_3px_0_rgba(0,0,0,0.25)]">
          {n}
        </span>
        <h2 className="font-titulo text-[1.12rem] leading-tight font-bold tracking-[0.06em] whitespace-nowrap uppercase">{titulo}</h2>
        {extra && <div className="ml-auto flex items-center gap-2">{extra}</div>}
      </header>
      <div className={cx("min-h-0 flex-1", cuerpo ?? "px-4 pb-4")}>{children}</div>
    </section>
  );
}
