"use client";

import { motion } from "motion/react";
import { PlugZap, Power, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { num } from "@/lib/formato";
import { EtiquetaEnvio } from "./ui";

export type EstadoConexion =
  | { tipo: "conectando" }
  | { tipo: "cargando"; desde: number }
  | { tipo: "sin-api" }
  | { tipo: "error-modelo"; detalle: string }
  | { tipo: "listo"; segundosCarga: number | null };

function Caja({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <polygon points="100,22 178,58 100,94 22,58" fill="#D9A971" />
      <polygon points="22,58 100,94 100,182 22,146" fill="#B98652" />
      <polygon points="178,58 100,94 100,182 178,146" fill="#A8743F" />
      <polygon points="61,40 139,76 139,92 61,56" fill="#E9CFA6" opacity=".9" />
      <g transform="skewY(-24.8) translate(0,58)">
        <rect x="112" y="118" width="52" height="30" rx="3" fill="#F4EBDD" />
        <g fill="#1D232B">
          <rect x="117" y="124" width="2" height="16" />
          <rect x="121" y="124" width="1" height="16" />
          <rect x="124" y="124" width="3" height="16" />
          <rect x="129" y="124" width="1" height="16" />
          <rect x="132" y="124" width="2" height="16" />
          <rect x="136" y="124" width="3" height="16" />
          <rect x="141" y="124" width="1" height="16" />
          <rect x="144" y="124" width="2" height="16" />
          <rect x="148" y="124" width="1" height="16" />
          <rect x="151" y="124" width="3" height="16" />
          <rect x="156" y="124" width="2" height="16" />
        </g>
      </g>
    </svg>
  );
}

/** Pide al servidor de Next.js (en este mismo Mac) que levante la API de TabPFN. */
function BotonIniciarApi() {
  const [estado, setEstado] = useState<"listo" | "enviando" | "iniciando" | "error">("listo");
  const [detalle, setDetalle] = useState("");

  async function iniciar() {
    setEstado("enviando");
    try {
      const r = await fetch("/control/iniciar-api", { method: "POST", headers: { "x-simulador": "iniciar-api" } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.detalle ?? `${r.status} ${r.statusText}`);
      setEstado("iniciando");
    } catch (e) {
      setDetalle(e instanceof Error ? e.message : String(e));
      setEstado("error");
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-4">
      <button
        type="button"
        onClick={iniciar}
        disabled={estado === "enviando" || estado === "iniciando"}
        className="inline-flex items-center gap-2 rounded-[12px] bg-acento px-5 py-2.5 font-titulo text-[1.1rem] font-bold text-[#0B1622] shadow-[0_4px_0_#B85A1F] transition-transform hover:-translate-y-px disabled:cursor-wait disabled:opacity-70"
      >
        <Power className="size-5" strokeWidth={2.6} />
        {estado === "enviando" ? "Iniciando…" : estado === "iniciando" ? "API iniciada, cargando TabPFN…" : "Iniciar la API"}
      </button>
      {estado === "iniciando" && <span className="text-[1rem] text-atenuado">Tarda cerca de un minuto y medio; esta página avanza sola.</span>}
      {estado === "error" && <span className="text-[1rem] text-c4">No se pudo iniciar: {detalle}</span>}
    </div>
  );
}

export default function Espera({ estado }: { estado: EstadoConexion }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const problema = estado.tipo === "sin-api" || estado.tipo === "error-modelo";
  const etapas = ["Conectar con la API", "Ajustar TabPFN con el entrenamiento", "Listo para simular"];
  const actual = estado.tipo === "conectando" || estado.tipo === "sin-api" ? 0 : estado.tipo === "cargando" ? 1 : 2;

  return (
    <div className="grid min-h-dvh place-items-center px-8">
      <div className="w-full max-w-[1100px]">
        <EtiquetaEnvio numero="G14" texto="Centro de despacho" />
        <h1 className="mt-6 font-titulo text-[3.4rem] leading-[1.05] font-bold tracking-[-0.02em]">
          {problema ? "El simulador no puede partir" : "Preparando el simulador"}
        </h1>

        {estado.tipo === "sin-api" && (
          <div className="mt-6 flex max-w-[60ch] gap-4 rounded-[18px] border border-c4/60 bg-c4/10 p-6">
            <PlugZap className="mt-1 size-8 shrink-0 text-c4" strokeWidth={2.4} />
            <div className="text-[1.2rem] leading-relaxed">
              <p className="font-semibold">La API del modelo no responde en el puerto 8014.</p>
              <p className="mt-2 text-atenuado">
                Puedes iniciarla con este botón, o iniciar todo desde la carpeta del proyecto con{" "}
                <code className="rounded bg-white/10 px-2 py-0.5 text-[#FFD2B3]">simulador/iniciar.sh</code>. Esta página vuelve a intentar cada 2 segundos.
              </p>
              <BotonIniciarApi />
            </div>
          </div>
        )}

        {estado.tipo === "error-modelo" && (
          <div className="mt-6 flex max-w-[70ch] gap-4 rounded-[18px] border border-c4/60 bg-c4/10 p-6">
            <TriangleAlert className="mt-1 size-8 shrink-0 text-c4" strokeWidth={2.4} />
            <div className="text-[1.2rem] leading-relaxed">
              <p className="font-semibold">La API se inició, pero el modelo no se pudo cargar.</p>
              <p className="mt-2 font-mono text-[1rem] break-words text-atenuado">{estado.detalle}</p>
              <p className="mt-2 text-atenuado">Revisa la terminal de la API y vuelve a iniciarla.</p>
            </div>
          </div>
        )}

        {!problema && (
          <p className="mt-4 max-w-[60ch] text-[1.35rem] leading-relaxed text-atenuado">
            TabPFN recibe los pedidos de entrenamiento como contexto y los deja en caché. Toma cerca de un minuto y medio; después, cada pedido se predice en menos de un
            segundo.
          </p>
        )}

        {/* Ruta de despacho con la caja avanzando */}
        <div className="relative mt-14 h-28">
          <div className="ruta absolute inset-x-0 top-[78px] h-[3px]" />
          <motion.div
            className="absolute top-0 w-24"
            animate={problema ? { left: "0%" } : { left: ["0%", "88%"] }}
            transition={problema ? { duration: 0.3 } : { duration: 6, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" }}
          >
            <motion.div animate={problema ? {} : { y: [0, -5, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>
              <Caja className="w-24" />
            </motion.div>
          </motion.div>
        </div>

        <ol className="mt-6 grid grid-cols-3 gap-6">
          {etapas.map((e, i) => (
            <li key={e} className="flex items-center gap-3 font-titulo text-[1.15rem] font-semibold">
              <span
                className={
                  i < actual
                    ? "size-4 rounded-full border-2 border-apoyo bg-apoyo"
                    : i === actual
                      ? problema
                        ? "size-4 rounded-full border-2 border-c4 bg-c4"
                        : "size-4 rounded-full border-2 border-acento bg-acento shadow-[0_0_0_6px_rgba(255,138,61,0.18)]"
                      : "size-4 rounded-full border-2 border-tenue"
                }
              />
              <span className={i === actual ? (problema ? "text-c4" : "text-acento") : i < actual ? "text-atenuado" : "text-tenue"}>{e}</span>
            </li>
          ))}
        </ol>
        {estado.tipo === "cargando" && (
          <p className="mt-6 text-[1.05rem] text-tenue">Llevamos {num(Math.max(0, (ahora - estado.desde) / 1000), 0)} s cargando.</p>
        )}
      </div>
    </div>
  );
}
