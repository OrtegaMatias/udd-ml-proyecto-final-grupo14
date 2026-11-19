# ¿Llegará con retraso crítico? · MLP vs. TabPFN

**Proyecto final · Machine Learning Supervisado · Universidad del Desarrollo**
**Grupo 14 · Joaquín Rivas · Matías Ortega**

Clasificación multiclase del nivel de retraso de entregas de última milla. Se comparan una red MLP y TabPFN, cada uno base y ajustado. Con el mejor modelo se construye un simulador what-if y un plan priorizado con su retorno en pesos.

## Entregables

| Entregable | Archivo |
|---|---|
| Notebook final, ejecutado | `Proyecto_Final_Grupo_14.ipynb` |
| Presentación del examen | `PRESENTACION_EXAMEN_Grupo_14.pdf` (y `PRESENTACION_EXAMEN.html`, interactiva) |
| Presentación del Hito 1 (contexto de los datos) | `PRESENTACION_HITO1.html` |
| Ficha del dataset | `FICHA_BASE.md` |
| Simulador what-if | `simulador/`, en línea en https://despacho.cvdi.cl (pide usuario y contraseña, que el grupo entrega por separado) |
| Resultados del notebook | `resultados/` |

## Datos

**Amazon Delivery Dataset** (Kaggle, Sujal Suthar, 2024, licencia MIT): 43.739 entregas de un marketplace en la India, de febrero a abril de 2022. La clase `nivel_retraso` se construye con los minutos de entrega, con una promesa supuesta de 2 horas:

| Clase | Tiempo de entrega | % |
|---|---|---:|
| 0 · Rápida | hasta 60 min | 10,8 |
| 1 · A tiempo | 61 a 120 min | 38,0 |
| 2 · Retraso leve | 121 a 150 min | 23,3 |
| 3 · Retraso moderado | 151 a 180 min | 13,2 |
| 4 · Retraso crítico | más de 180 min | 14,7 |

El detalle (nulos, duplicados, errores corregidos y variables) está en `FICHA_BASE.md`.

## Resultados

| Modelo | F1 CV | F1 train* | F1 test | Tiempo |
|---|---:|---:|---:|---:|
| MLP base | 0,612 | 0,664 | 0,621 | 16 s |
| MLP ajustada | 0,619 | 0,650 | 0,619 | 7,0 min |
| TabPFN base | 0,647 | 0,659 | 0,650 | 7,7 min |
| **TabPFN ajustado** | **0,648** | 0,658 | **0,650** | 22,3 min |

\* Sobre una muestra fija y estratificada de 7.000 filas de train, la misma para los cuatro modelos, porque predecir con TabPFN es costoso. Los tiempos son de un Mac con Apple M5 Pro: TabPFN corre en la GPU de Apple (MPS) y la MLP en CPU. En CPU, TabPFN tarda 10 veces más (1.033 s contra 103 s al predecir 500 pedidos; `resultados/tiempos_dispositivo.csv`).

| Plan priorizado (test, ranking diario, 80 revisiones al día) | Con el modelo | Al azar |
|---|---:|---:|
| Retrasos críticos detectados por día | ~52 | ~12 |
| Precisión (críticos / revisados) | 64,8 % | 14,7 % |
| ROI anual | 1,26 | −0,45 |

Lift = 4,4. Ventana de operación: nota del repartidor ≥ 4,5 y hasta 9 km cuando hay tráfico. Así, el riesgo medio de retraso crítico baja de 15,9 % a 3,0 %.

## Cómo ejecutar

| Qué | Cómo |
|---|---|
| Notebook en Colab (GPU T4) | Subir el notebook y `datos/amazon_delivery.csv` a Drive (`MyDrive/Data_set/`) y guardar la API Key de Prior Labs en los Secretos como `TABPFN_TOKEN` |
| Notebook en local | Entorno con `requirements_entrenamiento.txt` (Python 3.12) y la API Key en la variable `TABPFN_TOKEN`: `jupyter nbconvert --to notebook --execute --inplace --ExecutePreprocessor.timeout=-1 Proyecto_Final_Grupo_14.ipynb`. Tarda unos 52 min en la GPU de un Mac |
| Simulador en local | Con `.venv` (`requirements_simulador.txt`), Node 24 y la API Key en `~/.config/tabpfn/token`: `simulador/iniciar.sh` levanta la API (TabPFN carga en ~1,5 min) y el frontend en http://localhost:3014. Con `simulador/iniciar.sh streamlit`, además el Streamlit en http://localhost:8501. En macOS también se abre con doble clic en `Iniciar simulador.command` |
| Simulador en un servidor Linux | `despliegue/`: Docker con la API en CPU, el frontend, el Streamlit y una página de acceso con contraseña, en el puerto 8096. Requiere `despliegue/.env` (`TABPFN_TOKEN=...`) y `despliegue/.env.portero` (usuario y hash de la contraseña; ver `despliegue/portero/portero.py`), que no se versionan. `docker compose -f despliegue/compose.yaml up -d --build`. Si existe `modelo_ajustado/` (TabPFN ya ajustado, guardado con `save_fitted_tabpfn_model`), la API lo lee del disco en vez de ajustarlo |

## Estructura

| Ruta | Contenido |
|---|---|
| `Proyecto_Final_Grupo_14.ipynb` | Notebook único: exploración, partición, pipelines, los cuatro modelos, evaluación, plan priorizado (E), ventana de operación (F) y conclusiones (G) |
| `datos/` | CSV original del dataset, sin modificar |
| `resultados/` | Tablas y modelos que produce el notebook (comparación, matriz de confusión, ranking, ROI, ventana de operación) |
| `simulador/api/` | API FastAPI con TabPFN ajustado en vivo (`predict_proba`), con el mismo pipeline del notebook |
| `simulador/web/` | Frontend Next.js del simulador |
| `simulador/app_streamlit.py` | Versión mínima en Streamlit, sobre la misma API |
| `despliegue/` | Docker y página de acceso para publicar el simulador en un servidor |

## Uso de inteligencia artificial

Se usó asistencia de IA (Claude) para revisar el notebook, depurar código, construir el simulador y preparar la presentación. El grupo verificó cada resultado y responde por cada decisión.
