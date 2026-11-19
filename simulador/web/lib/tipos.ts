// Contratos de la API (simulador/api/main.py). Ninguna cifra vive en el frontend: todo llega por aquí.

export type Pedido = {
  distancia_km: number;
  Agent_Rating: number;
  Vehicle: string;
  espera_retiro_min: number;
  Traffic: string;
  Weather: string;
  hora_pedido: number;
  Area: string;
  Category: string;
  Agent_Age: number;
  dia_semana: number;
};

export type ClaveVariable = keyof Pedido;

export type Variable = {
  etiqueta: string;
  unidad?: string;
  tipo: "numero" | "categoria" | "categoria_numero";
  min?: number;
  max?: number;
  paso?: number;
  operable: boolean;
  ayuda?: string;
  opciones?: Record<string, string>;
};

export type Ejemplo = {
  id: string;
  titulo: string;
  descripcion: string;
  clase_real: string | null;
  pedido: Partial<Record<ClaveVariable, number | string | null>>;
};

export type FilaComparacion = {
  Modelo: string;
  F1_cv: number;
  F1_train: number;
  F1_test: number;
  Tiempo_s: number;
  Prediccion_test_s: number;
  Brecha: number;
};

export type FilaVentana = {
  Variable: string;
  "Valores con riesgo bajo la tasa base": string;
  "Prob. minima": number;
  "Prob. maxima": number;
  "Rango de efecto": number;
};

export type Ventana = {
  meta: number;
  radio_km: Record<string, number>;
  rating_min: number;
  vehiculos: string[];
  resumen: {
    meta: number;
    radio_km: Record<string, number>;
    p_antes: number;
    p_despues: number;
    altos_antes: number;
    altos_despues: number;
    n_muestra: number;
  };
  tabla: FilaVentana[];
};

export type Info = {
  clases: string[];
  clase_critica: number;
  tasa_base: number;
  variables: Record<ClaveVariable, Variable>;
  orden: ClaveVariable[];
  tipico: Pedido;
  ejemplos: Ejemplo[];
  modelo: { nombre: string; n_estimators: number; balance_probabilities: boolean; diferencia_notebook: number };
  comparacion: FilaComparacion[];
  ventana: Ventana;
};

/** Una de las 2 reglas de la ventana oficial (radio según tráfico y nota mínima). */
export type ReglaVentana = { variable: "distancia_km" | "Agent_Rating"; ok: boolean; objetivo: number; regla: string };

/** El mismo pedido llevado a la ventana (nota = max(nota, 4,5); distancia = min(distancia, radio)), ya predicho. */
export type DentroVentana = {
  pedido: Pedido;
  cambia: boolean;
  probabilidades: number[];
  clase: number;
  prob_critico: number;
};

export type Prediccion = {
  probabilidades: number[];
  clase: number;
  prob_critico: number;
  ms: number;
  ventana: ReglaVentana[];
  dentro_ventana: DentroVentana;
};

export type PuntoCurva = { valor: number | string; prob_critico: number };
export type Palanca = { variable: ClaveVariable; valor: number | string; prob_critico: number; baja: number };
export type ClaveCurva = "distancia_km" | "Agent_Rating" | "hora_pedido" | "Vehicle" | "espera_retiro_min";

export type Curvas = {
  curvas: Record<ClaveCurva, PuntoCurva[]>;
  actual: number;
  palancas: Palanca[];
  combinada: { pedido: Pedido; prob_critico: number };
  ms: number;
};

export type ResumenPlan = {
  mejor_modelo: string;
  pedidos_dia: number;
  capacidad_dia: number;
  capacidad_pct: number;
  k: number;
  dias_test: number;
  revisados_dia_test: number;
  capturados_modelo: number;
  capturados_global: number;
  capturados_azar: number;
  lift: number;
  criticos_test: number;
  costo_critico: number;
  costo_modelo_anual: number;
  costo_coordinador_anual: number;
  costo_accion: number;
  efectividad: number;
  dias_anio: number;
};

export type FilaRanking = {
  Prioridad: number;
  Order_ID: string;
  Fecha: string;
  Prob_critico: number;
  Clase_predicha: string;
  Clase_real: number;
  Es_critico: number;
  Agent_Rating: number;
  Traffic: string;
  distancia_km: number;
  Accion: string;
};

export type FilaRoi = {
  Estrategia: string;
  "Criticos capturados al anio": number;
  Beneficio: number;
  Costo: number;
  "Beneficio neto": number;
  ROI: number;
};

export type Plan = {
  resumen: ResumenPlan;
  orden_criticos: number[];
  por_dia: number[][];
  ranking: FilaRanking[];
  roi: FilaRoi[];
  sensibilidad: Record<string, string | number>[];
};

export type DatosVentana = Ventana & {
  dependencia: Record<string, { valor: string; Prob_critico: number }[]>;
  distancia_trafico: { trafico: string[]; distancias: number[]; prob: number[][] };
};

/** Benchmark de TabPFN ajustado en GPU de Apple (MPS) contra CPU (resultados/tiempos_dispositivo.csv). */
export type FilaTiempoDispositivo = {
  Dispositivo: string;
  Equipo: string;
  Filas_entrenamiento: number;
  Filas_prediccion: number;
  Fit_s: number;
  Prediccion_s: number;
  Veces_mas_lento_que_MPS: number;
  Diferencia_max_probabilidad_vs_MPS: number;
};

export type DatosModelo = {
  comparacion: FilaComparacion[];
  matriz: number[][];
  clases: string[];
  reporte: { clase: string; precision: number; recall: number; "f1-score": number; support: number }[];
  /** null si el benchmark no se ha ejecutado */
  tiempos_dispositivo?: FilaTiempoDispositivo[] | null;
};

export type Salud = { listo: boolean; error: string | null; segundos_carga: number | null; diferencia_notebook: number | null };
