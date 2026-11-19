"""API del simulador what-if: TabPFN ajustado (el mejor modelo del notebook) en vivo.

Uso (desde la carpeta del proyecto):
    TABPFN_TOKEN="$(cat ~/.config/tabpfn/token)" .venv/bin/uvicorn simulador.api.main:app --port 8014

Al iniciar repite la partición del notebook, ajusta el pipeline con los mejores hiperparámetros
(n_estimators=4, balance_probabilities=False) y guarda en caché el contexto de TabPFN
(fit_mode="fit_with_cache"): la carga toma ~1,5 min y después cada pedido se predice en ~0,1 s.
El frontend (simulador/web) y el Streamlit mínimo (simulador/app_streamlit.py) consumen estos endpoints.
"""
import json
import os
import threading
import time
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .pipeline_proyecto import (COLUMNAS, cargar_particion, crear_preprocesador, crear_variables,
                                nombres_clases, semilla)

RAIZ = Path(__file__).resolve().parents[2]
RES = RAIZ / "resultados"
CRITICA = 4
SIN_TILDES = ["Rapida", "A tiempo", "Retraso leve", "Retraso moderado", "Retraso critico"]   # nombres del notebook
MEJORES_PARAMETROS = {"n_estimators": 4, "balance_probabilities": False}   # celda 40 del notebook

# ---------------------------------------------------------------------------------------------
# Textos y rangos de cada variable (lo que ve el usuario)
# ---------------------------------------------------------------------------------------------
VARIABLES = {
    "distancia_km": {"etiqueta": "Distancia tienda–cliente", "unidad": "km", "tipo": "numero", "min": 1, "max": 21, "paso": 0.5,
                     "operable": True, "ayuda": "Se controla con el radio de cobertura o despachando desde la tienda más cercana."},
    "Agent_Rating": {"etiqueta": "Calificación del repartidor", "unidad": "★", "tipo": "numero", "min": 2.5, "max": 5, "paso": 0.1,
                     "operable": True, "ayuda": "Se controla al asignar el pedido."},
    "Vehicle": {"etiqueta": "Vehículo", "tipo": "categoria", "operable": True,
                "opciones": {"motorcycle": "Moto", "scooter": "Scooter", "van": "Furgón"},
                "ayuda": "Bicicleta se omite: solo hay 15 pedidos en los datos."},
    "espera_retiro_min": {"etiqueta": "Espera hasta el retiro", "unidad": "min", "tipo": "numero", "min": 5, "max": 15, "paso": 5,
                          "operable": True, "ayuda": "Minutos entre el pedido y el retiro en tienda (los datos solo tienen 5, 10 y 15)."},
    "Traffic": {"etiqueta": "Tráfico", "tipo": "categoria", "operable": False,
                "opciones": {"Low": "Bajo", "Medium": "Medio", "High": "Alto", "Jam": "Atasco"}},
    "Weather": {"etiqueta": "Clima", "tipo": "categoria", "operable": False,
                "opciones": {"Sunny": "Soleado", "Cloudy": "Nublado", "Fog": "Niebla", "Windy": "Ventoso",
                             "Stormy": "Tormenta", "Sandstorms": "Tormenta de arena"}},
    "hora_pedido": {"etiqueta": "Hora del pedido", "unidad": "h", "tipo": "numero", "min": 0, "max": 23, "paso": 1,
                    "operable": False, "ayuda": "No hay pedidos entre la 1 y las 7 h en los datos."},
    "Area": {"etiqueta": "Zona", "tipo": "categoria", "operable": False,
             "opciones": {"Urban": "Urbana", "Metropolitian": "Metropolitana", "Semi-Urban": "Semiurbana", "Other": "Otra"}},
    "Category": {"etiqueta": "Categoría del producto", "tipo": "categoria", "operable": False, "opciones": {}},
    "Agent_Age": {"etiqueta": "Edad del repartidor", "unidad": "años", "tipo": "numero", "min": 15, "max": 50, "paso": 1,
                  "operable": False},
    "dia_semana": {"etiqueta": "Día de la semana", "tipo": "categoria_numero", "operable": False,
                   "opciones": {"0": "Lun", "1": "Mar", "2": "Mié", "3": "Jue", "4": "Vie", "5": "Sáb", "6": "Dom"}},
}
CATEGORIAS_ES = {"Apparel": "Ropa", "Books": "Libros", "Clothing": "Vestuario", "Cosmetics": "Cosméticos",
                 "Electronics": "Electrónica", "Grocery": "Supermercado", "Home": "Hogar", "Jewelry": "Joyería",
                 "Kitchen": "Cocina", "Outdoors": "Aire libre", "Pet Supplies": "Mascotas", "Shoes": "Zapatos",
                 "Skincare": "Cuidado de la piel", "Snacks": "Snacks", "Sports": "Deportes", "Toys": "Juguetes"}
VARIABLES["Category"]["opciones"] = CATEGORIAS_ES

# Grillas para las curvas "¿qué pasa si muevo esta variable?" de un pedido
GRILLAS = {
    "distancia_km": [float(d) for d in range(1, 22)],
    "Agent_Rating": [round(2.5 + 0.1 * i, 1) for i in range(26)],
    "hora_pedido": [0.0] + [float(h) for h in range(8, 24)],
    "Vehicle": ["motorcycle", "scooter", "van"],
    "espera_retiro_min": [5.0, 10.0, 15.0],
}

# ---------------------------------------------------------------------------------------------
# Estado: modelo y resultados del notebook
# ---------------------------------------------------------------------------------------------
ESTADO = {"listo": False, "error": None, "segundos_carga": None}
BLOQUEO = threading.Lock()   # TabPFN usa la GPU: una predicción a la vez
MODELO = {}


def construir_modelo():
    """Pipeline del mejor modelo del notebook: preprocesado + TabPFN ajustado (sin entrenar todavía)."""
    from imblearn.pipeline import Pipeline
    from tabpfn import TabPFNClassifier
    return Pipeline(steps=[
        ("preprocesado", crear_preprocesador()),
        ("modelo", TabPFNClassifier(random_state=semilla, device="auto", fit_mode="fit_with_cache", **MEJORES_PARAMETROS)),
    ])


def _leer_json(nombre):
    return json.loads((RES / nombre).read_text(encoding="utf-8"))


def _cargar():
    try:
        from tabpfn import TabPFNClassifier
        from imblearn.pipeline import Pipeline

        inicio = time.time()
        df, X_train, X_test, y_train, y_test = cargar_particion(RAIZ / "datos/amazon_delivery.csv")
        variables = crear_variables(X_train)
        guardado = Path(os.environ.get("MODELO_AJUSTADO", RAIZ / "modelo_ajustado"))
        if (guardado / "tabpfn.tabpfn_fit").exists():
            # Modelo ya ajustado en otro equipo (guardado con save_fitted_tabpfn_model): se lee del disco
            # y se salta el ajuste, que en un servidor sin GPU toma mucho tiempo
            import joblib
            from tabpfn.model_loading import load_fitted_tabpfn_model
            preprocesado = Pipeline(steps=[
                ("preprocesado", joblib.load(guardado / "preprocesado.joblib")),
                ("modelo", load_fitted_tabpfn_model(guardado / "tabpfn.tabpfn_fit", device="auto")),
            ])
            ESTADO["origen"] = "guardado"
        else:
            preprocesado = construir_modelo()
            preprocesado.fit(variables, y_train)
            ESTADO["origen"] = "ajustado al iniciar"

        # Pedido típico: mediana de las numéricas y moda de las categóricas (en train)
        tipico = {}
        for col in COLUMNAS:
            serie = variables[col].dropna()
            tipico[col] = float(serie.median()) if col not in ("Traffic", "Weather", "Vehicle", "Area", "Category") else serie.mode()[0]
        tipico["hora_pedido"] = float(round(tipico["hora_pedido"]))

        # Pedidos reales de test para los ejemplos, con su clase real
        test_vars = crear_variables(X_test)
        ranking = pd.read_csv(RES / "plan_ranking_test.csv")
        id_a_indice = pd.Series(X_test.index, index=df.loc[X_test.index, "Order_ID"].values)

        def ejemplo(order_id, titulo, descripcion):
            fila = test_vars.loc[id_a_indice[order_id]]
            return {"id": order_id, "titulo": titulo, "descripcion": descripcion,
                    "clase_real": nombres_clases[int(y_test.loc[id_a_indice[order_id]])],
                    "pedido": {c: (None if pd.isna(fila[c]) else (fila[c] if isinstance(fila[c], str) else float(fila[c])))
                               for c in COLUMNAS}}

        alto = ranking[(ranking["Es_critico"] == 1)].iloc[0]["Order_ID"]
        # Pedido de la demo: real de test que terminó en retraso crítico, con riesgo ~62 % y fuera de las 2 reglas
        # (nota 4,2; 10,9 km con tráfico medio). Llevado a la ventana, el modelo lo deja "A tiempo".
        # Se eligió entre los críticos de test con riesgo de 50 % a 80 % donde la ventana lo deja en A tiempo.
        medio = "saaf660323436"
        bajo = ranking[(ranking["Clase_real"] == 0)].iloc[-1]["Order_ID"]
        # Orden fijo (el frontend los identifica por posición): 0 común, 1 rescatable (abre por defecto), 2 sin salvación, 3 rápida
        ejemplos = [
            {"id": "tipico", "titulo": "Pedido común",
             "descripcion": "Mediana y moda de entrenamiento: el pedido más habitual.",
             "clase_real": None, "pedido": tipico},
            ejemplo(medio, "Pedido rescatable",
                    "Terminó en retraso crítico; dentro de la ventana el modelo lo deja a tiempo."),
            ejemplo(alto, "Pedido sin salvación",
                    "El de mayor riesgo en test: lo controlable no lo salva."),
            ejemplo(bajo, "Entrega rápida", "El de menor riesgo de retraso crítico en test."),
        ]

        # Comprobación: las probabilidades del simulador coinciden con las del notebook
        muestra = ranking.head(40)
        idx = id_a_indice[muestra["Order_ID"]].values
        p_api = preprocesado.predict_proba(test_vars.loc[idx, COLUMNAS])[:, CRITICA]
        diferencia = float(np.abs(p_api - muestra["Prob_critico"].values).max())

        MODELO.update(modelo=preprocesado, tipico=tipico, ejemplos=ejemplos, diferencia_notebook=diferencia,
                      tasa_base=float((y_train == CRITICA).mean()))
        ESTADO.update(listo=True, segundos_carga=round(time.time() - inicio, 1))
        threading.Thread(target=_precalentar, daemon=True).start()
    except Exception as e:   # se informa en /api/salud
        ESTADO.update(error=f"{type(e).__name__}: {e}")
        raise


app = FastAPI(title="Simulador de retraso de entregas · Grupo 14")


@app.on_event("startup")
def iniciar():
    threading.Thread(target=_cargar, daemon=True).start()


def _modelo():
    if not ESTADO["listo"]:
        raise HTTPException(503, detail=ESTADO["error"] or "El modelo se está cargando (~1,5 min).")
    return MODELO["modelo"]


CACHE = {}   # probabilidades por pedido ya calculado: en un servidor sin GPU cada llamada a TabPFN cuesta segundos


def _predecir(filas):
    claves = [tuple(f[c] for c in COLUMNAS) for f in filas]
    with BLOQUEO:
        faltan = [i for i, k in enumerate(claves) if k not in CACHE]
        if faltan:
            prob = _modelo().predict_proba(pd.DataFrame([filas[i] for i in faltan])[COLUMNAS])
            if len(CACHE) > 50_000:
                CACHE.clear()
            for i, pr in zip(faltan, prob):
                CACHE[claves[i]] = pr
    return np.array([CACHE[k] for k in claves])


def _precalentar():
    """Deja en caché los pedidos de ejemplo (predicción y curvas), para que la demo responda al instante."""
    try:
        for e in MODELO["ejemplos"]:
            pedido = Pedido(**{**MODELO["tipico"], **{k: v for k, v in e["pedido"].items() if v is not None}})
            predecir(pedido)
            curvas(pedido)
        ESTADO["precalentado"] = True
    except Exception as e:   # la caché es opcional: si falla, la API sigue funcionando
        ESTADO["precalentado"] = f"{type(e).__name__}: {e}"


# ---------------------------------------------------------------------------------------------
# Ventana de operación (sale de la parte F del notebook)
# ---------------------------------------------------------------------------------------------
def _ventana():
    resumen = _leer_json("ventana_resumen.json")
    tabla = pd.read_csv(RES / "ventana_operacion.csv")
    reglas = {r["Variable"]: r["Valores con riesgo bajo la tasa base"] for _, r in tabla.iterrows()}
    rating_min = float(reglas["Agent_Rating"].split(" a ")[0]) if reglas.get("Agent_Rating", "ninguno") != "ninguno" else 5.0
    vehiculos = [v.strip() for v in reglas.get("Vehicle", "").split(",") if v.strip() and v.strip() != "ninguno"]
    return {"meta": resumen["meta"], "radio_km": resumen["radio_km"], "rating_min": rating_min,
            "vehiculos": vehiculos, "resumen": resumen, "tabla": tabla.to_dict(orient="records")}


def _revisar_ventana(pedido, v):
    """Las 2 reglas de la ventana oficial (parte F del notebook): nota mínima y radio según el tráfico.
    Son las mismas que bajan el riesgo medio de 15,9 % a 3,0 % en los 200 pedidos de test."""
    radio = v["radio_km"].get(pedido["Traffic"], 0)
    trafico = VARIABLES["Traffic"]["opciones"][pedido["Traffic"]].lower()
    return [
        {"variable": "distancia_km", "ok": pedido["distancia_km"] <= radio, "objetivo": radio,
         "regla": f"Con tráfico {trafico}, hasta {radio} km"},
        {"variable": "Agent_Rating", "ok": pedido["Agent_Rating"] >= v["rating_min"], "objetivo": v["rating_min"],
         "regla": f"Repartidor con nota ≥ {str(v['rating_min']).replace('.', ',')}"},
    ]


def _dentro_ventana(pedido, v):
    """El mismo pedido llevado a la ventana: nota al menos la mínima y distancia hasta el radio del tráfico."""
    dentro = dict(pedido)
    dentro["Agent_Rating"] = max(pedido["Agent_Rating"], v["rating_min"])
    dentro["distancia_km"] = min(pedido["distancia_km"], v["radio_km"].get(pedido["Traffic"], pedido["distancia_km"]))
    return dentro


# ---------------------------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------------------------
class Pedido(BaseModel):
    distancia_km: float = Field(ge=0, le=40)
    Agent_Rating: float = Field(ge=1, le=5)
    Vehicle: str
    espera_retiro_min: float = Field(ge=0, le=60)
    Traffic: str
    Weather: str
    hora_pedido: float = Field(ge=0, le=23)
    Area: str
    Category: str
    Agent_Age: float = Field(ge=15, le=60)
    dia_semana: float = Field(ge=0, le=6)


@app.get("/api/salud")
def salud():
    return {**ESTADO, "diferencia_notebook": MODELO.get("diferencia_notebook")}


@app.get("/api/info")
def info():
    _modelo()
    comparacion = pd.read_csv(RES / "comparacion_modelos.csv")
    return {
        "clases": nombres_clases, "clase_critica": CRITICA, "tasa_base": MODELO["tasa_base"],
        "variables": VARIABLES, "orden": list(VARIABLES), "tipico": MODELO["tipico"], "ejemplos": MODELO["ejemplos"],
        "modelo": {"nombre": "TabPFN ajustado", **MEJORES_PARAMETROS, "diferencia_notebook": MODELO["diferencia_notebook"]},
        "comparacion": comparacion.to_dict(orient="records"),
        "ventana": _ventana(),
    }


@app.post("/api/predecir")
def predecir(pedido: Pedido):
    p = pedido.model_dump()
    inicio = time.time()
    v = _ventana()
    dentro = _dentro_ventana(p, v)
    prob, prob_dentro = _predecir([p, dentro])   # una sola llamada: el pedido y el mismo pedido dentro de la ventana
    return {"probabilidades": [round(float(x), 4) for x in prob], "clase": int(prob.argmax()),
            "prob_critico": float(prob[CRITICA]), "ms": round((time.time() - inicio) * 1000),
            "ventana": _revisar_ventana(p, v),
            "dentro_ventana": {"pedido": dentro, "cambia": dentro != p,
                               "probabilidades": [round(float(x), 4) for x in prob_dentro],
                               "clase": int(prob_dentro.argmax()), "prob_critico": float(prob_dentro[CRITICA])}}


@app.post("/api/curvas")
def curvas(pedido: Pedido):
    """Probabilidad de retraso crítico de ESTE pedido al mover cada variable controlable (lo demás fijo)."""
    p = pedido.model_dump()
    filas, marcas = [], []
    for col, valores in GRILLAS.items():
        for valor in valores:
            filas.append({**p, col: valor})
            marcas.append((col, valor))
    filas.append(p)
    inicio = time.time()
    prob = _predecir(filas)[:, CRITICA]
    actual = float(prob[-1])

    salida = {col: [] for col in GRILLAS}
    for (col, valor), pr in zip(marcas, prob[:-1]):
        salida[col].append({"valor": valor, "prob_critico": round(float(pr), 4)})

    palancas = []
    for col in ["Agent_Rating", "distancia_km", "Vehicle", "espera_retiro_min"]:
        puntos = salida[col]
        if col == "Agent_Rating":   # solo subir la nota (asignar a alguien mejor evaluado)
            puntos = [x for x in puntos if x["valor"] >= p[col]]
        if col == "distancia_km":   # solo acercar
            puntos = [x for x in puntos if x["valor"] <= p[col]]
        if not puntos:
            continue
        mejor = min(puntos, key=lambda x: x["prob_critico"])
        if mejor["valor"] != p[col] and actual - mejor["prob_critico"] > 0.01:
            palancas.append({"variable": col, "valor": mejor["valor"], "prob_critico": mejor["prob_critico"],
                             "baja": round(actual - mejor["prob_critico"], 4)})
    palancas.sort(key=lambda x: -x["baja"])
    # Todas las palancas juntas (una predicción más)
    combinada = {**p, **{x["variable"]: x["valor"] for x in palancas}}
    prob_combinada = float(_predecir([combinada])[0, CRITICA]) if palancas else actual
    return {"curvas": salida, "actual": actual, "palancas": palancas,
            "combinada": {"pedido": combinada, "prob_critico": prob_combinada},
            "ms": round((time.time() - inicio) * 1000)}


@app.get("/api/plan")
def plan():
    resumen = _leer_json("plan_resumen.json")
    ranking = pd.read_csv(RES / "plan_ranking_test.csv")
    # Orden del modelo: 1 si el pedido fue crítico. Con esto el frontend recalcula la captura con cualquier capacidad.
    orden = ranking.sort_values("Prioridad")["Es_critico"].astype(int).tolist()
    # Lo mismo, separado por día: con esto el frontend repite el ranking diario del notebook con cualquier capacidad
    por_dia = [g.sort_values("Prioridad")["Es_critico"].astype(int).tolist() for _, g in ranking.groupby("Fecha")]
    top = ranking.head(25).copy()
    top["Traffic"] = top["Traffic"].map(VARIABLES["Traffic"]["opciones"])
    top["Clase_predicha"] = top["Clase_predicha"].map(dict(zip(SIN_TILDES, nombres_clases)))
    top["Accion"] = top["Accion"].str.replace("congestion", "congestión").str.replace(">=", "≥")
    return {"resumen": resumen, "orden_criticos": orden, "por_dia": por_dia,
            "ranking": top.round(4).to_dict(orient="records"),
            "roi": pd.read_csv(RES / "plan_roi.csv").to_dict(orient="records"),
            "sensibilidad": pd.read_csv(RES / "plan_sensibilidad.csv").to_dict(orient="records")}


@app.get("/api/ventana")
def ventana():
    dep = pd.read_csv(RES / "ventana_dependencia.csv")
    doble = pd.read_csv(RES / "ventana_distancia_trafico.csv", index_col=0)
    return {**_ventana(),
            "dependencia": {col: g[["valor", "Prob_critico"]].to_dict(orient="records")
                            for col, g in dep[dep["variable"] != "distancia_x_trafico"].groupby("variable", sort=False)},
            "distancia_trafico": {"trafico": doble.index.tolist(), "distancias": [int(c) for c in doble.columns],
                                  "prob": doble.values.round(4).tolist()}}


@app.get("/api/modelo")
def modelo():
    matriz = pd.read_csv(RES / "matriz_confusion_mejor.csv", index_col=0)
    reporte = pd.read_csv(RES / "reporte_mejor.csv", index_col=0)
    reporte.index = [dict(zip(SIN_TILDES, nombres_clases)).get(i, i) for i in reporte.index]
    # Benchmark GPU (MPS) vs CPU de TabPFN ajustado, si el notebook ya lo generó
    ruta_tiempos = RES / "tiempos_dispositivo.csv"
    tiempos = pd.read_csv(ruta_tiempos).to_dict(orient="records") if ruta_tiempos.exists() else None
    return {"comparacion": pd.read_csv(RES / "comparacion_modelos.csv").to_dict(orient="records"),
            "matriz": matriz.values.tolist(), "clases": nombres_clases,
            "reporte": reporte.reset_index().rename(columns={"index": "clase"}).to_dict(orient="records"),
            "tiempos_dispositivo": tiempos}
