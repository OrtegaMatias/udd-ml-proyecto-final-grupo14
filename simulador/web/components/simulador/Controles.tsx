"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  Clock,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudSun,
  Motorbike,
  Package,
  Route,
  Scooter,
  Star,
  Sun,
  Timer,
  Tornado,
  TrafficCone,
  Truck,
  UserRound,
  Van,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { useId, useState } from "react";
import { num } from "@/lib/formato";
import type { ClaveVariable, Info, Pedido } from "@/lib/tipos";
import { cx, Deslizador, Segmentado } from "../ui";

export const ICONO_VEHICULO: Record<string, LucideIcon> = { motorcycle: Motorbike, scooter: Scooter, van: Van };
export const ICONO_CLIMA: Record<string, LucideIcon> = {
  Sunny: Sun,
  Cloudy: Cloud,
  Fog: CloudFog,
  Windy: Wind,
  Stormy: CloudLightning,
  Sandstorms: Tornado,
};
const NIVEL_TRAFICO: Record<string, number> = { Low: 1, Medium: 2, High: 3, Jam: 4 };

/** Intensidad del tráfico: 4 barritas que se llenan de Bajo a Atasco. */
function Intensidad({ nivel }: { nivel: number }) {
  return (
    <span className="flex h-3.5 shrink-0 items-end gap-[2px]" aria-hidden>
      {[1, 2, 3, 4].map((i) => (
        <i key={i} className={cx("block w-[3px] rounded-[1px] bg-current", i > nivel && "opacity-25")} style={{ height: `${25 + i * 18.75}%` }} />
      ))}
    </span>
  );
}

function Campo({ etiqueta, icono: Icono, acento, children, id }: { etiqueta: string; icono: LucideIcon; acento: boolean; children: React.ReactNode; id?: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center gap-2">
        <Icono className={cx("size-[1.1rem] shrink-0", acento ? "text-acento" : "text-tenue")} strokeWidth={2.4} />
        <label htmlFor={id} className={cx("truncate text-[0.95rem] font-medium", acento ? "text-texto" : "text-atenuado")}>
          {etiqueta}
        </label>
      </div>
      {children}
    </div>
  );
}

function Selector({
  id,
  valor,
  opciones,
  onChange,
  icono: Icono,
  ordenar,
}: {
  id: string;
  valor: string;
  opciones: Record<string, string>;
  onChange: (v: string) => void;
  icono?: LucideIcon;
  ordenar?: boolean;
}) {
  const lista = Object.entries(opciones);
  if (ordenar) lista.sort((a, b) => a[1].localeCompare(b[1], "es"));
  return (
    <div className="relative">
      {Icono && <Icono className="pointer-events-none absolute top-1/2 left-3 size-[1.15rem] -translate-y-1/2 text-texto/85" strokeWidth={2.3} aria-hidden />}
      <select
        id={id}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className={cx(
          "selector h-10 w-full cursor-pointer truncate rounded-[12px] border border-linea bg-fondo2 pr-9 text-[0.95rem] font-semibold text-texto",
          Icono ? "pl-10" : "pl-3",
        )}
      >
        {lista.map(([v, e]) => (
          <option key={v} value={v}>
            {e}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function Controles({
  info,
  pedido,
  onCambio,
  n,
}: {
  info: Info;
  pedido: Pedido;
  onCambio: <K extends ClaveVariable>(k: K, v: Pedido[K]) => void;
  /** número del paso, dibujado como etiqueta kraft junto al título naranjo */
  n?: number;
}) {
  const V = info.variables;
  const ven = info.ventana;
  const radio = ven.radio_km[pedido.Traffic];
  const [mas, setMas] = useState(false);
  const ids = { clima: useId(), zona: useId(), categoria: useId(), mas: useId() };
  const num1 = (k: ClaveVariable) => ({ min: V[k].min ?? 0, max: V[k].max ?? 1, paso: V[k].paso ?? 1 });
  const sinDatosHora = pedido.hora_pedido >= 1 && pedido.hora_pedido <= 7;
  const opc = (k: ClaveVariable) => V[k].opciones ?? {};
  const IconoClima = ICONO_CLIMA[pedido.Weather] ?? CloudSun;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* Lo que la empresa controla */}
      <section className="relative rounded-[16px] border-2 border-acento/70 bg-tarjeta px-4 pt-3 pb-3.5 shadow-[0_0_0_5px_rgba(255,138,61,0.07)]">
        <span className="cinta absolute -top-[2px] right-5 h-5 w-20 rounded-b-[3px] opacity-90" aria-hidden />
        <h3 className="mb-1 flex items-center gap-3 font-titulo text-[1.12rem] font-bold whitespace-nowrap text-acento">
          {n !== undefined && (
            <span className="grid h-7 min-w-7 place-items-center rounded-[5px] bg-kraft2 px-1.5 text-[1rem] text-white shadow-[0_3px_0_rgba(0,0,0,0.25)]">{n}</span>
          )}
          Lo que la empresa controla
          <span className="flex items-center gap-1.5 font-texto text-[0.82rem] font-medium text-atenuado">
            <i className="inline-block h-3 w-5 rounded-[3px] border-2 border-dashed border-c0/70 bg-c0/15" /> ventana
          </span>
        </h3>
        <div className="flex flex-col gap-1.5">
          <Deslizador
            etiqueta={V.distancia_km.etiqueta}
            icono={Route}
            valor={pedido.distancia_km}
            {...num1("distancia_km")}
            zona={radio !== undefined && radio > 0 ? [V.distancia_km.min ?? 1, radio] : null}
            formato={(x) => `${num(x, 1)} km`}
            ayuda={V.distancia_km.ayuda}
            onChange={(x) => onCambio("distancia_km", x)}
          />
          <Deslizador
            etiqueta="Nota del repartidor"
            icono={Star}
            valor={pedido.Agent_Rating}
            {...num1("Agent_Rating")}
            zona={[ven.rating_min, V.Agent_Rating.max ?? 5]}
            formato={(x) => `${num(x, 1)} ★`}
            ayuda={V.Agent_Rating.ayuda}
            onChange={(x) => onCambio("Agent_Rating", x)}
          />
          <div className="mt-1 grid grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)] gap-3">
            <Campo etiqueta={V.Vehicle.etiqueta} icono={Truck} acento>
              <Segmentado
                etiqueta={V.Vehicle.etiqueta}
                compacto
                opciones={Object.entries(opc("Vehicle")).map(([valor, etiqueta]) => {
                  const I = ICONO_VEHICULO[valor];
                  return { valor, etiqueta, icono: I ? <I className="size-4 shrink-0" strokeWidth={2.4} aria-hidden /> : undefined };
                })}
                valor={pedido.Vehicle}
                onChange={(v) => onCambio("Vehicle", v)}
              />
            </Campo>
            <Campo etiqueta="Espera (min)" icono={Timer} acento>
              <Segmentado
                etiqueta="Espera hasta el retiro, en minutos"
                compacto
                opciones={[5, 10, 15]
                  .filter((m) => m >= (V.espera_retiro_min.min ?? 0) && m <= (V.espera_retiro_min.max ?? 60))
                  .map((m) => ({ valor: String(m), etiqueta: String(m) }))}
                valor={String(pedido.espera_retiro_min)}
                onChange={(v) => onCambio("espera_retiro_min", Number(v))}
              />
            </Campo>
          </div>
        </div>
      </section>

      {/* Condiciones del día */}
      <section className="rounded-[16px] border border-linea bg-tarjeta/55 px-4 pt-2.5 pb-3">
        <h3 className="mb-1.5 font-titulo text-[1.05rem] font-semibold whitespace-nowrap text-atenuado">
          Condiciones del día <span className="font-texto text-[0.85rem] font-normal text-tenue">(no las controlamos)</span>
        </h3>
        <div className="flex flex-col gap-2">
          <Campo etiqueta={V.Traffic.etiqueta} icono={TrafficCone} acento={false}>
            <Segmentado
              etiqueta={V.Traffic.etiqueta}
              acento={false}
              compacto
              opciones={Object.entries(opc("Traffic")).map(([valor, etiqueta]) => ({ valor, etiqueta, icono: <Intensidad nivel={NIVEL_TRAFICO[valor] ?? 1} /> }))}
              valor={pedido.Traffic}
              onChange={(v) => onCambio("Traffic", v)}
            />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta={V.Weather.etiqueta} icono={CloudSun} acento={false} id={ids.clima}>
              <Selector id={ids.clima} valor={pedido.Weather} opciones={opc("Weather")} icono={IconoClima} onChange={(v) => onCambio("Weather", v)} />
            </Campo>
            <Campo etiqueta={V.Area.etiqueta} icono={Building2} acento={false} id={ids.zona}>
              <Selector id={ids.zona} valor={pedido.Area} opciones={opc("Area")} onChange={(v) => onCambio("Area", v)} />
            </Campo>
          </div>

          <button
            type="button"
            aria-expanded={mas}
            aria-controls={ids.mas}
            onClick={() => setMas((m) => !m)}
            className="flex items-center gap-2 self-start rounded-[8px] py-0.5 pr-2 text-[0.92rem] font-semibold whitespace-nowrap text-atenuado hover:text-texto"
          >
            <ChevronDown className={cx("size-4 transition-transform", !mas && "-rotate-90")} strokeWidth={2.6} />
            Más condiciones
            {!mas && (
              <span className="font-normal text-tenue">
                {num(pedido.hora_pedido, 0)}:00 · {num(pedido.Agent_Age, 0)} años · {opc("dia_semana")[String(pedido.dia_semana)]} · {opc("Category")[pedido.Category]}
              </span>
            )}
          </button>
          <AnimatePresence initial={false}>
            {mas && (
              <motion.div
                id={ids.mas}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-2 pt-0.5 pb-1">
                  <div className="grid grid-cols-2 gap-x-5">
                    <div className="relative">
                      <Deslizador
                        etiqueta="Hora"
                        icono={Clock}
                        acento={false}
                        valor={pedido.hora_pedido}
                        {...num1("hora_pedido")}
                        formato={(x) => `${num(x, 0)}:00`}
                        ayuda={V.hora_pedido.ayuda}
                        onChange={(x) => onCambio("hora_pedido", x)}
                      />
                      {sinDatosHora && <p className="absolute -bottom-3 left-0 text-[0.75rem] font-semibold whitespace-nowrap text-c2">Sin pedidos a esta hora en los datos</p>}
                    </div>
                    <Deslizador
                      etiqueta="Edad"
                      icono={UserRound}
                      acento={false}
                      valor={pedido.Agent_Age}
                      {...num1("Agent_Age")}
                      formato={(x) => `${num(x, 0)} años`}
                      ayuda={V.Agent_Age.etiqueta}
                      onChange={(x) => onCambio("Agent_Age", x)}
                    />
                  </div>
                  <Campo etiqueta={V.dia_semana.etiqueta} icono={CalendarDays} acento={false}>
                    <Segmentado
                      etiqueta={V.dia_semana.etiqueta}
                      acento={false}
                      compacto
                      opciones={Object.entries(opc("dia_semana")).map(([valor, etiqueta]) => ({ valor, etiqueta }))}
                      valor={String(pedido.dia_semana)}
                      onChange={(v) => onCambio("dia_semana", Number(v))}
                    />
                  </Campo>
                  <Campo etiqueta={V.Category.etiqueta} icono={Package} acento={false} id={ids.categoria}>
                    <Selector id={ids.categoria} valor={pedido.Category} opciones={opc("Category")} ordenar onChange={(v) => onCambio("Category", v)} />
                  </Campo>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
