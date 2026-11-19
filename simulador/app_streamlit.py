"""Simulador what-if mínimo en Streamlit (formato literal del enunciado).

Usa la misma API que el frontend principal (simulador/web), así que muestra exactamente el mismo modelo:
TabPFN ajustado con predict_proba.

Uso (desde la carpeta del proyecto, con la API ya iniciada):
    .venv/bin/streamlit run simulador/app_streamlit.py
"""
import os

import altair as alt
import pandas as pd
import requests
import streamlit as st

API = os.environ.get("API_SIMULADOR", "http://127.0.0.1:8014")
COLORES = ["#3DDC97", "#2EC4B6", "#F6C445", "#FF8A3D", "#FF4D5E"]
CATEGORICAS = ["Vehicle", "Traffic", "Weather", "Area", "Category", "dia_semana"]
ENTEROS = ["hora_pedido", "Agent_Age", "espera_retiro_min"]

st.set_page_config(page_title="Simulador de retraso · Grupo 14", page_icon="📦", layout="wide")


def pct(x, d=1):
    return f"{x * 100:.{d}f} %".replace(".", ",")


@st.cache_data(ttl=600)
def cargar_info():
    r = requests.get(f"{API}/api/info", timeout=15)
    r.raise_for_status()
    return r.json()


def llamar(ruta, pedido, espera):
    try:
        r = requests.post(f"{API}/api/{ruta}", json=pedido, timeout=espera)
        r.raise_for_status()
        return r.json()
    except requests.RequestException as e:
        st.error(f"La API no respondió a tiempo ({type(e).__name__}). Si la GPU está ocupada, espera unos segundos y mueve un control.")
        st.stop()


try:
    info = cargar_info()
except requests.RequestException:
    st.error("La API no responde o todavía está cargando TabPFN (~1,5 min). Inicia `simulador/iniciar.sh` y recarga la página.")
    st.stop()

variables, orden = info["variables"], info["orden"]


def valor_widget(col, valor):
    """Convierte un valor del pedido al formato del control de Streamlit."""
    if col == "dia_semana":
        return str(int(valor))
    if col in ENTEROS:
        return int(round(valor))
    if col in ("distancia_km", "Agent_Rating"):
        v = variables[col]
        paso = v["paso"]
        return float(min(max(round(valor / paso) * paso, v["min"]), v["max"]))
    return valor


def cargar_pedido(pedido):
    for col in orden:
        if pedido.get(col) is not None:
            st.session_state[col] = valor_widget(col, pedido[col])


def aplicar(cambios):
    for col, valor in cambios.items():
        st.session_state[col] = valor_widget(col, valor)


if "iniciado" not in st.session_state:
    cargar_pedido(info["tipico"])
    st.session_state["iniciado"] = True

# ------------------------------------------------------------------ controles
st.sidebar.header("Ejemplos")
for e in info["ejemplos"]:
    real = f" · real: {e['clase_real']}" if e["clase_real"] else ""
    st.sidebar.button(f"{e['titulo']}{real}", key=f"ej_{e['id']}", on_click=cargar_pedido, args=(e["pedido"],),
                      width="stretch")

pedido = {}
for titulo, operable in [("Lo que la empresa controla", True), ("Contexto del pedido", False)]:
    st.sidebar.header(titulo)
    for col in orden:
        v = variables[col]
        if v["operable"] != operable:
            continue
        etiqueta = v["etiqueta"] + (f" ({v['unidad']})" if v.get("unidad") else "")
        if col == "espera_retiro_min":
            pedido[col] = float(st.sidebar.select_slider(etiqueta, options=[5, 10, 15], key=col))
        elif col in ENTEROS:
            pedido[col] = float(st.sidebar.slider(etiqueta, int(v["min"]), int(v["max"]), step=1, key=col))
        elif v["tipo"] == "numero":
            pedido[col] = st.sidebar.slider(etiqueta, float(v["min"]), float(v["max"]), step=float(v["paso"]), key=col,
                                            format="%.1f")
        else:
            opciones = list(v["opciones"])
            if col == "Category":
                elegido = st.sidebar.selectbox(etiqueta, opciones, key=col, format_func=lambda x, v=v: v["opciones"][x])
            else:
                elegido = st.sidebar.radio(etiqueta, opciones, key=col, horizontal=True,
                                           format_func=lambda x, v=v: v["opciones"][x])
            pedido[col] = float(elegido) if col == "dia_semana" else elegido
        if v.get("ayuda"):
            st.sidebar.caption(v["ayuda"])

# ------------------------------------------------------------------ prediccion
r = llamar("predecir", pedido, 60)
prob = r["probabilidades"]
tasa = info["tasa_base"]

st.title("📦 Simulador what-if: ¿llegará con retraso crítico?")
st.caption(f"Modelo: {info['modelo']['nombre']} (n_estimators={info['modelo']['n_estimators']}), en vivo con predict_proba. "
           "Mueve las variables de la izquierda y mira cómo cambian las probabilidades de las 5 clases.")

k1, k2, k3 = st.columns(3)
k1.metric("Probabilidad de retraso crítico", pct(r["prob_critico"]),
          delta=f"{(r['prob_critico'] - tasa) * 100:+.1f} pts vs tasa base {pct(tasa)}".replace(".", ","),
          delta_color="inverse")
k2.metric("Clase más probable", info["clases"][r["clase"]])
cumple = sum(x["ok"] for x in r["ventana"])
k3.metric("Ventana de operación", f"{cumple} de {len(r['ventana'])} reglas")

izq, der = st.columns([3, 2])
with izq:
    st.subheader("Probabilidad de cada clase")
    tabla = pd.DataFrame({"Clase": info["clases"], "Probabilidad": prob, "Texto": [pct(p) for p in prob]})
    base = alt.Chart(tabla).encode(
        y=alt.Y("Clase:N", sort=info["clases"], title=None),
        x=alt.X("Probabilidad:Q", scale=alt.Scale(domain=[0, 1]), axis=alt.Axis(format="%"), title=None))
    barras = base.mark_bar(cornerRadiusEnd=4).encode(
        color=alt.Color("Clase:N", scale=alt.Scale(domain=info["clases"], range=COLORES), legend=None))
    texto = base.mark_text(align="left", dx=6, color="#E8EEF4").encode(text="Texto:N")
    st.altair_chart(barras + texto, width="stretch")
with der:
    st.subheader("Ventana de operación")
    for regla in r["ventana"]:
        st.write(("✅ " if regla["ok"] else "⚠️ ") + regla["regla"])

# ------------------------------------------------------------------ ventana aplicada y curvas
d = r["dentro_ventana"]
if d["cambia"]:
    cambios = {col: d["pedido"][col] for col in ("Agent_Rating", "distancia_km") if d["pedido"][col] != pedido[col]}
    a, b = st.columns([4, 1])
    a.info(f"**Dentro de la ventana** (nota ≥ 4,5 y distancia según el tráfico), el riesgo de retraso crítico baja de "
           f"{pct(r['prob_critico'])} a **{pct(d['prob_critico'])}** y lo más probable pasa a ser "
           f"**{info['clases'][d['clase']]}**.")
    b.button("Aplicar la ventana", type="primary", on_click=aplicar, args=(cambios,), width="stretch")
elif r["prob_critico"] > tasa:
    st.info("Este pedido ya está dentro de la ventana: el riesgo viene de las condiciones del día (tráfico, clima, zona). "
            "Acción: avisar al cliente.")
c = llamar("curvas", pedido, 90)


def curva(col, titulo, color):
    d = pd.DataFrame(c["curvas"][col])
    d["valor"] = d["valor"].astype(float)
    x = alt.X("valor:Q", title=titulo, scale=alt.Scale(zero=False))
    y = alt.Y("prob_critico:Q", title="Prob. retraso crítico", axis=alt.Axis(format="%"), scale=alt.Scale(domain=[0, 1]))
    linea = alt.Chart(d).mark_line(color=color, strokeWidth=3, point=True).encode(x=x, y=y)
    ref = alt.Chart(pd.DataFrame({"y": [tasa]})).mark_rule(color="#93A7BC", strokeDash=[5, 5]).encode(y="y:Q")
    actual = alt.Chart(pd.DataFrame({"valor": [pedido[col]], "prob_critico": [c["actual"]]})).mark_point(
        color="#E8EEF4", size=140, filled=True).encode(x="valor:Q", y="prob_critico:Q")
    return (linea + ref + actual).properties(height=260)   # sin .interactive(): el scroll no hace zoom


st.subheader("¿Qué pasa si muevo una variable? (este pedido, lo demás fijo)")
st.caption("Punto blanco: el pedido actual. Línea punteada: tasa base de retraso crítico.")
g1, g2, g3 = st.columns(3)
g1.altair_chart(curva("distancia_km", "Distancia (km)", "#FF8A3D"), width="stretch")
g2.altair_chart(curva("Agent_Rating", "Calificación del repartidor", "#2EC4B6"), width="stretch")
g3.altair_chart(curva("hora_pedido", "Hora del pedido", "#F6C445"), width="stretch")

st.caption("El modelo muestra asociaciones, no causas: la ventana recomendada se debe validar con una prueba piloto. "
           "El frontend principal está en http://localhost:3014.")
