"""Mide cuánto cambia el tiempo de TabPFN según el dispositivo: GPU de Apple (MPS) contra CPU.

Responde al feedback del Hito 1: "corrieron en GPU Apple (MPS): aclaren el impacto en los tiempos".
Usa el mismo modelo que ganó en el notebook (TabPFN ajustado: n_estimators=4, balance_probabilities=False),
la misma partición (semilla 2026) y el mismo preprocesado. Ajusta con las 34.991 filas de entrenamiento y
predice una muestra fija y estratificada de 500 pedidos de test en cada dispositivo.
La MLP no se mide: scikit-learn corre siempre en CPU, así que la GPU no cambia su tiempo.
Por defecto TabPFN se niega a correr en CPU con más de 5.000 filas de entrenamiento ("slow performance");
aquí se habilita con TABPFN_ALLOW_CPU_LARGE_DATASET=1 solo para medir.

Uso, desde la carpeta del proyecto (con la GPU sin otros procesos pesados):
    TABPFN_TOKEN="$(cat ~/.config/tabpfn/token)" .venv/bin/python scripts/medir_tiempos_dispositivo.py
Guarda resultados/tiempos_dispositivo.csv.
"""
import os
import platform
import subprocess
import sys
import time
from pathlib import Path

import pandas as pd
import torch
from sklearn.model_selection import train_test_split

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))
from simulador.api.pipeline_proyecto import (COLUMNAS, cargar_particion, crear_preprocesador,  # noqa: E402
                                             crear_variables, semilla)
from tabpfn import TabPFNClassifier  # noqa: E402

N_PRED = 500
os.environ["TABPFN_ALLOW_CPU_LARGE_DATASET"] = "1"   # solo para poder medir la CPU

df, X_train, X_test, y_train, y_test = cargar_particion(RAIZ / "datos/amazon_delivery.csv")
X_muestra, _, y_muestra, _ = train_test_split(X_test, y_test, train_size=N_PRED, random_state=semilla, stratify=y_test)

pre = crear_preprocesador()
Z_train = pre.fit_transform(crear_variables(X_train)[COLUMNAS])
Z_muestra = pre.transform(crear_variables(X_muestra)[COLUMNAS])

chip = subprocess.run(["sysctl", "-n", "machdep.cpu.brand_string"], capture_output=True, text=True).stdout.strip()
print(f"Equipo: {chip} · {platform.platform()} · torch {torch.__version__}")

filas = []
probas = {}
for dispositivo in ["mps", "cpu"]:
    modelo = TabPFNClassifier(random_state=semilla, device=dispositivo, n_estimators=4, balance_probabilities=False)
    inicio = time.time()
    modelo.fit(Z_train, y_train)
    t_fit = time.time() - inicio
    inicio = time.time()
    probas[dispositivo] = modelo.predict_proba(Z_muestra)
    t_pred = time.time() - inicio
    filas.append({"Dispositivo": "GPU Apple (MPS)" if dispositivo == "mps" else "CPU",
                  "Equipo": chip, "Filas_entrenamiento": len(Z_train), "Filas_prediccion": N_PRED,
                  "Fit_s": round(t_fit, 2), "Prediccion_s": round(t_pred, 1)})
    print(filas[-1], flush=True)

tabla = pd.DataFrame(filas)
tabla["Veces_mas_lento_que_MPS"] = (tabla["Prediccion_s"] / tabla.loc[0, "Prediccion_s"]).round(1)
diferencia = float(abs(probas["mps"] - probas["cpu"]).max())
tabla["Diferencia_max_probabilidad_vs_MPS"] = [0.0, round(diferencia, 6)]
tabla.to_csv(RAIZ / "resultados/tiempos_dispositivo.csv", index=False)
print(tabla.to_string(index=False))
