"""Mismo flujo del notebook (secciones 4 y 5): partición, variables nuevas y preprocesado.

Copia literal de las celdas 21, 23, 24 y 25 de Proyecto_Final_Grupo_14.ipynb, para que el simulador
use exactamente el mismo pipeline que se evaluó. Si cambia el notebook, hay que cambiar esto también.
"""
import numpy as np
import pandas as pd
from imblearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import FunctionTransformer, OneHotEncoder, OrdinalEncoder

semilla = 2026
cortes = [0, 60, 120, 150, 180, np.inf]
nombres_clases = ["Rápida", "A tiempo", "Retraso leve", "Retraso moderado", "Retraso crítico"]


def crear_variables(X):
    X = X.copy()
    # categorias: quitar espacios y convertir el texto "NaN" en faltante
    for col in ["Weather", "Traffic", "Vehicle", "Area", "Category"]:
        X[col] = X[col].str.strip().replace("NaN", np.nan)
    # calificacion fuera de la escala 1 a 5
    X["Agent_Rating"] = X["Agent_Rating"].clip(upper=5)
    # distancia tienda - cliente en km (haversine); la tienda viene con signo negativo en algunas filas
    lat1 = np.radians(X["Store_Latitude"].abs())
    lon1 = np.radians(X["Store_Longitude"].abs())
    lat2 = np.radians(X["Drop_Latitude"])
    lon2 = np.radians(X["Drop_Longitude"])
    a = np.sin((lat2 - lat1) / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    X["distancia_km"] = 6371 * 2 * np.arcsin(np.sqrt(a))
    # hora del pedido y minutos de espera hasta el retiro
    pedido = pd.to_datetime(X["Order_Time"], format="%H:%M:%S", errors="coerce")
    retiro = pd.to_datetime(X["Pickup_Time"], format="%H:%M:%S", errors="coerce")
    X["hora_pedido"] = pedido.dt.hour
    X["espera_retiro_min"] = ((retiro - pedido).dt.total_seconds() / 60) % 1440
    # dia de la semana (0 = lunes)
    X["dia_semana"] = pd.to_datetime(X["Order_Date"]).dt.dayofweek
    return X.drop(columns=["Store_Latitude", "Store_Longitude", "Drop_Latitude", "Drop_Longitude",
                           "Order_Date", "Order_Time", "Pickup_Time"])


cols_numericas = ["Agent_Age", "Agent_Rating", "distancia_km", "hora_pedido", "espera_retiro_min", "dia_semana"]
cols_ordinal = ["Traffic"]
cols_nominal = ["Weather", "Vehicle", "Area", "Category"]
COLUMNAS = cols_numericas + cols_ordinal + cols_nominal


def crear_preprocesador():
    return ColumnTransformer(transformers=[
        ("numericas", SimpleImputer(strategy="median"), cols_numericas),
        ("ordinal", Pipeline(steps=[("imputar", SimpleImputer(strategy="most_frequent")),
                                    ("codificar", OrdinalEncoder(categories=[["Low", "Medium", "High", "Jam"]]))]), cols_ordinal),
        ("nominal", Pipeline(steps=[("imputar", SimpleImputer(strategy="most_frequent")),
                                    ("codificar", OneHotEncoder(handle_unknown="ignore", sparse_output=False))]), cols_nominal)],
        verbose_feature_names_out=False)


def cargar_particion(ruta_csv):
    """Lee el CSV y repite la partición estratificada 80/20 del notebook."""
    df = pd.read_csv(ruta_csv)
    df["nivel_retraso"] = pd.cut(df["Delivery_Time"], bins=cortes, labels=[0, 1, 2, 3, 4]).astype(int)
    X = df.drop(columns=["Order_ID", "Delivery_Time", "nivel_retraso"])
    y = df["nivel_retraso"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=semilla, stratify=y)
    return df, X_train, X_test, y_train, y_test
