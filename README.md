# MiEntorno

Plataforma de monitoreo y evaluación predictiva de riesgos físicos ambientales orientada a operaciones de minería, energía, construcción e infraestructura.

Permite consultar cualquier coordenada geográfica del mundo (WGS84), integrando modelos numéricos meteorológicos con criterios técnicos de seguridad y salud en el trabajo para respaldar la toma de decisiones preventivas en campo: maniobras de izaje con grúas, trabajos en altura, excavaciones, vaciados de concreto y tránsito en calzadas.

---

## Características principales

- **Cartografía satelital interactiva:** Visualización en alta resolución con Esri World Imagery y Leaflet, con búsqueda por topónimo o coordenadas GPS en tiempo real.
- **Monitoreo de 8 factores ambientales:** Radiación solar UV, lluvia, viento y ráfagas, tormentas eléctricas (CAPE), estrés térmico, nieve, visibilidad y saturación de suelo.
- **Índice de Seguridad Operacional (ISO):** Métrica porcentual (0% a 100%) que consolida el nivel de riesgo en faena mediante un modelo de dos niveles con techos por severidad máxima.
- **Cinta horaria predictiva (24 horas):** Proyección continua hora por hora (+1 h a +24 h) para planificar ventanas de trabajo seguras antes de movilizar cuadrillas.
- **Detalle de controles operacionales:** Ficha desplegable por factor con lectura técnica, nivel de riesgo, equipos de protección requeridos y medidas normativas de control.
- **Sin dependencias de compilación:** Desarrollado íntegramente en Vanilla JavaScript con ES Modules, ejecutable directamente en cualquier navegador o servidor estático.

---

## Factores evaluados y marco normativo

Los umbrales de alerta y medidas de control operacional se alinean con estándares técnicos y normativos vigentes:

| Factor | Variable analizada | Norma / Estándar técnico | Criterio operativo clave |
| :--- | :--- | :--- | :--- |
| **Viento y ráfagas** | Velocidad sostenida y ráfagas a 10 m (km/h) | **D.S. 024-2016-EM (Art. 385)** / ASME B30.5 | Parada obligatoria de izajes con grúas ante vientos $\ge 32\text{ km/h}$. |
| **Tormenta eléctrica** | Código de tiempo y energía convectiva CAPE (J/kg) | **OMM / NFPA 780** | Protocolo 30/30: evacuación preventiva a refugios tipo jaula de Faraday si CAPE $\ge 1500\text{ J/kg}$ o descargas activas. |
| **Estrés térmico** | Temperatura de bulbo seco y sensación térmica (°C) | **ISO 7243 / R.M. 375-2008-TR** | Monitoreo de regímenes de hidratación (500 ml/h) y pausas de descanso ante calor ($\ge 32^\circ\text{C}$) o frío extremo ($\le 0^\circ\text{C}$). |
| **Radiación UV** | Índice Ultravioleta máximo (escala 0 a 16+) | **Ley N° 30102 / OMS** | Uso obligatorio de fotoprotector SPF 50+, cubrenucas y lentes con filtro UV al 100%. |
| **Precipitación** | Milímetros acumulados (mm/h) y probabilidad (%) | **Norma Técnica G.050 / D.S. 024** | Suspensión de trabajos en zanjas abiertas y reducción de velocidad de tránsito en haul roads. |
| **Nieve y escarcha** | Caída acumulada de nieve (cm/h) | **D.S. 024-2016-EM** | Control de tracción con cadenas, verificación de mecanismos hidráulicos y despeje de accesos. |
| **Humedad de suelo** | Fracción volumétrica de agua en capa superficial (0 a 7 cm) | **Mecánica de suelos / Geotecnia SST** | Inspección de estabilidad en coronación de taludes y verificación de capacidad portante para zapatas de grúa. |
| **Visibilidad** | Alcance visual horizontal (metros) | **Reglamento Nacional de Tránsito** | Uso obligatorio de faros neblineros, pértigas con banderín y distanciamiento preventivo vehicular. |

---

## Metodología del Índice de Seguridad Operacional (ISO)

El índice consolida las condiciones ambientales en una escala de 0.0% a 100.0%. Su cálculo opera en dos etapas:

### 1. Ponderación multicriterio base
Cada factor tiene asignado un peso según su potencial de severidad inmediata:

$$\text{Puntaje ponderado} = \sum_{i=1}^{8} W_i \times A_i$$

Donde:
- $W_i$ es el peso del factor: Tormenta (25%), Viento (20%), Temperatura (15%), Lluvia (10%), Nieve (10%), Suelo (10%), Visibilidad (5%) y Radiación UV (5%).
- $A_i$ es la aptitud del subfactor según su nivel de severidad (0: 100%, 1: 85%, 2: 65%, 3: 40%, 4: 15%, 5: 0%).

### 2. Techo de seguridad por severidad máxima
Para evitar que condiciones favorables en variables secundarias enmascaren un peligro crítico inminente (por ejemplo, una tormenta eléctrica activa en un día de temperatura templada), el factor más desfavorable impone un límite superior al índice general:

$$\text{ISO} = \min(\text{Puntaje ponderado}, \; \text{Techo}_{\text{severidad\_máxima}})$$

- **Severidad 5 (Crítico):** Techo máximo de 25% (Alerta Roja: Parada técnica obligatoria).
- **Severidad 4 (Muy alto):** Techo máximo de 50% (Alerta Naranja: Operación restringida).
- **Severidad 3 (Moderado):** Techo máximo de 75% (Alerta Amarilla: Precaución táctica).

### Escala de acción en faena

| Rango ISO | Estado | Criterio de acción en faena |
| :---: | :--- | :--- |
| **$\ge 80.0\%$** | **Condición normal (Verde)** | Labores regulares sin restricciones ambientales adicionales. |
| **$60.0\%$ a $79.9\%$** | **Atención requerida (Amarilla)** | Operación con controles preventivos: vientos guía en izajes, hidratación programada y protección solar. |
| **$40.0\%$ a $59.9\%$** | **Operación restringida (Naranja)** | Restricción en frentes expuestos: suspensión de izajes si el viento supera los 32 km/h y control en rampas resbaladizas. |
| **$< 40.0\%$** | **Alerta crítica / Parada (Roja)** | Parada técnica obligatoria inmediata y repliegue a refugios certificados ante tormentas o vientos severos. |

---

## Criterio de uso: Plataforma web vs. Instrumental in situ

La gestión preventiva en campo opera en dos niveles complementarios:

1. **Nivel predictivo (Plataforma MiEntorno):** Se utiliza al inicio de turno durante la charla de seguridad, elaboración del IPERC continuo y AST. Permite identificar con anticipación las ventanas horarias más seguras del día y preparar los controles logísticos (EPP específico, luminarias, equipos de bombeo).
2. **Nivel de control físico in situ (Instrumentos calibrados):** Durante la ejecución de la maniobra a pie de obra, rigen las mediciones directas tomadas por el instrumental de campo (anemómetro en punta de pluma de grúa, monitor de estrés térmico WBGT, radiómetro UV y detector local de tormentas). Si el anemómetro en pluma registra $\ge 32\text{ km/h}$, la maniobra se suspende de inmediato, independientemente de la lectura del modelo sinóptico regional.

---

## Arquitectura y tecnologías

- **Frontend:** HTML5, CSS3 moderno (Custom Properties, Flexbox, Grid, backdrop-filter) y JavaScript Vanilla (ES Modules).
- **Librería cartográfica:** [Leaflet](https://leafletjs.com/) v1.9 con capas satelitales de Esri World Imagery (ArcGIS REST Services) y etiquetas de referencia cartográfica.
- **Modelos meteorológicos:** Integración con la API de [Open-Meteo](https://open-meteo.com/), consumiendo variables horarias asimiladas de centros meteorológicos globales (ECMWF IFS, NOAA GFS, DWD ICON).
- **Geocodificación:** OpenStreetMap Nominatim con control de peticiones (*rate limit* de 1 segundo).
- **Despliegue:** Compatible con cualquier hosting estático o Cloudflare Workers.

---

## Ejecución local

El proyecto no requiere Node.js, compilación ni empaquetado. Para probarlo localmente:

### Con Python (3.x):
```bash
python3 -m http.server 8000
```
Abrir en el navegador: `http://localhost:8000`

### Con npx / Node.js:
```bash
npx serve .
```

---

## Licencia

Distribuido bajo licencia MIT. Consulte el archivo [LICENSE](LICENSE) para más detalles.

---

## Autor

**Esai Josue Huaman Meza**  
Ingeniero de Higiene y Seguridad Industrial | MSc. Ciencias de la Computación  
GitHub: [@josuemzx](https://github.com/josuemzx)
