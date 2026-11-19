"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Aviso de espera sobre un panel mientras TabPFN calcula. Aparece solo si la respuesta demora
 * (en el Mac con GPU tarda ~0,1 s y no se ve); en un servidor sin GPU un pedido nuevo tarda segundos.
 */
export default function Calculando({ activo, texto, estimado }: { activo: boolean; texto: string; estimado: string }) {
  const [desde, setDesde] = useState<number | null>(null);
  const [ahora, setAhora] = useState(0);

  useEffect(() => {
    if (!activo) {
      setDesde(null);
      return;
    }
    const inicio = Date.now();
    setDesde(inicio);
    setAhora(inicio);
    const t = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(t);
  }, [activo]);

  const segundos = desde ? (ahora - desde) / 1000 : 0;
  const visible = activo && segundos >= 0.6;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-20 grid place-items-center rounded-[14px] bg-fondo/70 backdrop-blur-[3px]"
          role="status"
          aria-live="polite"
        >
          <div className="flex w-[min(92%,420px)] flex-col items-center gap-3 rounded-[16px] border border-linea bg-tarjeta2/95 px-6 py-5 text-center shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
            {/* Caja que avanza por la ruta punteada */}
            <div className="relative h-12 w-full">
              <div className="absolute inset-x-2 top-[38px] border-t-[3px] border-dashed border-linea" />
              <span className="absolute top-[33px] left-1 size-3 rounded-full bg-acento" />
              <span className="absolute top-[31px] right-1 size-4 rounded-full bg-apoyo shadow-[0_0_0_5px_rgba(46,196,182,0.18)]" />
              <motion.div
                className="absolute top-0"
                animate={{ left: ["4%", "78%"] }}
                transition={{ duration: 2.4, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
              >
                <motion.svg viewBox="0 0 200 200" className="size-10" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.45, repeat: Infinity }} aria-hidden>
                  <polygon points="100,22 178,58 100,94 22,58" fill="#D9A971" />
                  <polygon points="22,58 100,94 100,182 22,146" fill="#B98652" />
                  <polygon points="178,58 100,94 100,182 178,146" fill="#A8743F" />
                  <polygon points="61,40 139,76 139,92 61,56" fill="#E9CFA6" opacity=".9" />
                </motion.svg>
              </motion.div>
            </div>
            <p className="font-titulo text-[1.2rem] font-bold">
              {texto}
              <span className="ml-2 font-mono text-[1rem] font-semibold text-acento tabular-nums">{Math.floor(segundos)} s</span>
            </p>
            <p className="text-[0.95rem] leading-snug text-atenuado">
              {segundos < 4
                ? "TabPFN compara este pedido con los 34.991 de entrenamiento."
                : `El servidor no tiene GPU: ${estimado}. Si otras personas están usando el simulador, los pedidos se atienden por orden.`}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
