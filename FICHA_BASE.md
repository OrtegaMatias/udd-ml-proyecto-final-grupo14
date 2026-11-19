# Ficha de la base

**Grupo 14 · Joaquín Rivas · Matías Ortega**

Cada cifra sale del notebook ejecutado (`Proyecto_Final_Grupo_14.ipynb`, secciones 2 y 3).

- **Nombre:** Amazon Delivery Dataset.
- **Industria o negocio:** comercio electrónico, logística de última milla.
- **Empresa o proceso del que vienen los datos:** entregas de un marketplace tipo Amazon en ciudades de la India, del 11 de febrero al 6 de abril de 2022. La página no indica la fuente original: no se presentan como cifras oficiales de Amazon.
- **Archivo usado:** `datos/amazon_delivery.csv` (sin modificar; SHA-256 `b922dfbd…6a4ed`).
- **Fuente:** Sujal Suthar, Kaggle, actualizado el 2 de julio de 2024, licencia MIT. https://www.kaggle.com/datasets/sujalsuthar/amazon-delivery-dataset. Descargado el 11 de noviembre de 2026.
- **Registros usados:** 43.739 (todos).
- **Qué representa cada fila:** un pedido entregado.
- **Variable objetivo:** `nivel_retraso`, construida con cortes de negocio sobre `Delivery_Time` (minutos desde el pedido hasta la entrega). Supuesto: la promesa de servicio es de 2 horas.
- **Clases:** 5.
- **Predictoras:** 12 columnas crudas (sin `Order_ID` ni `Delivery_Time`), que el pipeline convierte en 37 variables.
- **Nulos:** `Agent_Rating` 54, `Weather` 91. Además, 91 filas traen el texto `"NaN"` en `Traffic` y `Order_Time` (las mismas filas en que falta `Weather`). Se imputan dentro del pipeline.
- **Filas duplicadas:** 0, ni siquiera sin contar `Order_ID`. Cada `Order_ID` es único.
- **Errores corregidos en el pipeline:** `Agent_Rating` igual a 6 en 53 filas (se recorta a 5); coordenadas de la tienda negativas (188 filas) o en 0 (3.505 filas): la distancia se calcula con el valor absoluto. Hay 38 repartidores de 15 años, que se dejan como vienen.
- **Para qué le sirve la predicción a la empresa:** avisar antes al cliente, reasignar repartidores o vehículos, priorizar los pedidos con riesgo de retraso crítico y planificar la dotación por zona y horario.
- **Clase crítica (Hito 2):** 4, retraso crítico (más de 3 horas). Es la que genera reclamos, reembolsos y pérdida de clientes.

## Distribución de las clases

| Clase | Significado | Tiempo de entrega | Casos | % |
|---|---|---|---:|---:|
| 0 | Rápida | hasta 60 min | 4.725 | 10,8 |
| 1 | A tiempo | 61 a 120 min | 16.622 | 38,0 |
| 2 | Retraso leve | 121 a 150 min | 10.197 | 23,3 |
| 3 | Retraso moderado | 151 a 180 min | 5.786 | 13,2 |
| 4 | Retraso crítico | más de 180 min | 6.409 | 14,7 |

## Variables principales

| Variable | Tipo | Significado | Unidad | ¿Se puede operar? (simulador) |
|---|---|---|---|---|
| `distancia_km` | Numérica (calculada) | Distancia tienda-cliente (haversine) | km | Sí: radio de cobertura o asignación de la tienda |
| `espera_retiro_min` | Numérica (calculada) | Minutos entre el pedido y el retiro | min | Sí: tiempo de preparación en tienda |
| `hora_pedido` | Numérica (calculada) | Hora del pedido | hora | Parcial: promesas distintas por franja horaria |
| `dia_semana` | Numérica (calculada) | Día de la semana (0 = lunes) | — | No |
| `Agent_Age` | Numérica | Edad del repartidor | años | Parcial: asignación del repartidor |
| `Agent_Rating` | Numérica | Calificación del repartidor | 1 a 5 | Sí: asignar repartidores mejor evaluados |
| `Traffic` | Ordinal | Low < Medium < High < Jam | — | No, pero se puede evitar la franja |
| `Weather` | Nominal | Clima | — | No |
| `Vehicle` | Nominal | motorcycle, scooter, van, bicycle | — | Sí: tipo de vehículo asignado |
| `Area` | Nominal | Metropolitian, Urban, Semi-Urban, Other | — | No |
| `Category` | Nominal | Categoría del producto (16) | — | No |
