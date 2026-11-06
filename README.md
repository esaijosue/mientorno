# MiEntorno

> Plataforma de monitoreo ambiental y evaluación predictiva de riesgos físicos en tiempo real para operaciones industriales, mineras, energéticas y de infraestructura a nivel global.

[![Licencia](https://img.shields.io/badge/licencia-MIT-blue.svg)](LICENSE)
[![Estándar](https://img.shields.io/badge/normativa-D.S.%20024--2016--EM%20%7C%20ISO%207243%20%7C%20WMO-brightgreen.svg)](#marco-normativo-y-regulatorio)
[![Arquitectura](https://img.shields.io/badge/arquitectura-Vanilla%20ES%20Modules-black.svg)](#arquitectura-tecnologica)

---

## 1. Descripción general

**MiEntorno** es un sistema de soporte a la toma de decisiones preventivas para supervisores de turno, inspectores de seguridad y salud en el trabajo (SST / HSE) e ingenieros residentes. Centraliza en una interfaz cartográfica satelital la telemetría climática y atmosférica en tiempo real para faenas operativas en cualquier coordenada geográfica del mundo (WGS84).

La herramienta calcula de manera continua un **Índice de seguridad en faena (ISF)** en escala porcentual ($0\%$ a $100\%$), proyecta el comportamiento de las condiciones en horizontes operativos de 30 minutos a 24 horas y emite recomendaciones de control operacional inmediatas fundamentadas en normas internacionales (ISO 7243, OMS, OMM / WMO, OSHA) y sectoriales (D.S. 024-2016-EM, R.M. 375-2008-TR).

---

## 2. Alcance operacional

La plataforma está diseñada para las siguientes actividades en campo:

- **Operaciones mineras a cielo abierto y superficie:** plataformas de perforación, tajos, botaderos, canteras y plantas concentradoras.
- **Proyectos de energía e infraestructura:** líneas de transmisión de alta tensión, subestaciones eléctricas, parques eólicos y presas hidroeléctricas.
- **Obras civiles y viales:** movimiento de tierras, andamiaje, encofrado y trabajos de pavimentación en altura geográfica.
- **Terminales portuarios y costeros:** patios de maniobra de contenedores, muelles y operación de grúas pórtico.
- **Operaciones en alta montaña y frentes fríos:** control de escarcha, isoterma 0°C y estabilidad de accesos.

---

## 3. Marco normativo y regulatorio

Los algoritmos de cálculo, umbrales de alerta y medidas de contingencia implementados en MiEntorno están calibrados conforme a los siguientes estándares:

| Norma / Estándar | Ámbito de aplicación | Factor evaluado en el sistema |
| :--- | :--- | :--- |
| **D.S. 024-2016-EM** (Arts. 136, 137, 271, 385) | Seguridad y Salud Ocupacional en Minería | Límite mandatorio de parada técnica para izajes y grúas móviles por ráfagas de viento ($\ge 32\text{ km/h}$). Protocolo de refugio ante tormentas eléctricas. |
| **Ley 30102 / OMS (WHO)** | Prevención contra radiación solar ultravioleta | Clasificación estandarizada del índice UV (escala global OMS de 0 a 16+) y obligatoriedad de fotoprotección, rotación a sombra y cubrenucas. |
| **ISO 7243 / R.M. 375-2008-TR** | Ergonomía y estrés térmico en el trabajo | Criterios de confort térmico, regímenes de hidratación (500 ml/h) y pausas obligatorias por calor severo o temperaturas bajo cero. |
| **Organización Meteorológica Mundial (OMM / WMO)** | Clasificación de inestabilidad convectiva | Gradiente de energía potencial convectiva disponible (CAPE en $\text{J/kg}$) y protocolo 30/30 para evacuación inmediata a refugios jaula de Faraday. |
| **ASME B30.5 / OSHA 1926.1431** | Estándar internacional de grúas e izaje | Criterios de reducción y parada de maniobras de carga por viento en pluma ($80\text{ m}$). |

---

## 4. Metodología de cálculo: Índice de seguridad en faena (ISF)

El índice general consolida el riesgo ambiental instantáneo en una métrica porcentual entre $0\%$ y $100\%$. Su formulación matemática se basa en la deducción de penalidades ponderadas a partir de una línea base de operación segura ($100\%$):

$$\text{ISF} = 100 - \sum_{i=1}^{8} P_i$$

Donde $P_i$ representa la penalidad específica calculada para cada uno de los **ocho factores operativos**:

### Factores evaluados y penalidades

1. **Radiación solar ultravioleta ($P_{\text{UV}}$):**
   - $UV < 6.0$ o noche: $0$ puntos (bajo a confortable).
   - $6.0 \le UV < 8.0$: $-10$ puntos (alto; fotoprotector cada 2 h).
   - $8.0 \le UV < 11.0$: $-18$ puntos (muy alto; rotación a la sombra).
   - $UV \ge 11.0$: $-25$ puntos (extremo; minimización de labores a cielo abierto).

2. **Precipitación pluvial y acumulación ($P_{\text{lluvia}}$):**
   - Seco ($< 0.1\text{ mm/h}$ y prob. $< 20\%$): $0$ puntos.
   - Llovizna o ligera ($20\% \le \text{prob.} < 40\%$ o $\ge 0.1\text{ mm/h}$): $-5$ puntos.
   - Lluvia moderada ($40\% \le \text{prob.} < 70\%$ o $\ge 1\text{ mm/h}$): $-12$ puntos.
   - Lluvia intensa / crítica ($\ge 70\%$ o $\ge 5\text{ mm/h}$): $-20$ puntos (alerta de acarreo y taludes).

3. **Velocidad del viento y ráfagas ($P_{\text{viento}}$):**
   - Ráfagas $\le 20\text{ km/h}$: $0$ puntos (operación regular).
   - $21 \le \text{ráfagas} \le 31\text{ km/h}$: $-12$ puntos (precaución; vientos guía en izajes).
   - Ráfagas $\ge 32\text{ km/h}$: $-28$ puntos (límite legal de izaje; parada técnica de grúas).
   - Ráfagas $> 50\text{ km/h}$: $-35$ puntos (suspensión total de trabajos en altura y andamios).

4. **Inestabilidad convectiva y tormenta eléctrica ($P_{\text{tormenta}}$):**
   - $\text{CAPE} < 500\text{ J/kg}$: $0$ puntos (atmósfera estable).
   - $500 \le \text{CAPE} < 1500\text{ J/kg}$: $-6$ a $-10$ puntos (inestabilidad moderada).
   - $1500 \le \text{CAPE} < 2500\text{ J/kg}$: $-14$ a $-22$ puntos (alerta preventiva de tormenta).
   - Descargas activas o código WMO activo ($95, 96, 99$): $-35$ puntos (evacuación inmediata a refugios Faraday).

5. **Temperatura y sensación térmica ($P_{\text{térmico}}$):**
   - Confort térmico ($8.1^\circ\text{C}$ a $28.0^\circ\text{C}$): $0$ puntos.
   - Frío moderado ($0.1^\circ\text{C}$ a $8.0^\circ\text{C}$) o Calor moderado ($28.1^\circ\text{C}$ a $31.9^\circ\text{C}$): $-6$ puntos.
   - Bajo cero ($-4.9^\circ\text{C}$ a $0.0^\circ\text{C}$) o Calor severo ($32.0^\circ\text{C}$ a $37.9^\circ\text{C}$): $-15$ puntos.
   - Helada extrema ($\le -5.0^\circ\text{C}$) o Golpe de calor ($\ge 38.0^\circ\text{C}$): $-25$ puntos.

6. **Nieve y congelamiento ($P_{\text{nieve}}$):**
   - Sin nieve ($0\text{ cm}$): $0$ puntos.
   - Nevada ligera ($0.1$ a $0.9\text{ cm}$): $-8$ puntos (tránsito 4x4 obligatorio).
   - Nieve moderada ($1.0$ a $4.9\text{ cm}$): $-18$ puntos (cadenas en neumáticos).
   - Nevada intensa ($\ge 5.0\text{ cm}$): $-30$ puntos (despeje de accesos y restricción vial).

7. **Visibilidad en ruta y acarreo ($P_{\text{visibilidad}}$):**
   - Óptima ($\ge 2000\text{ m}$): $0$ puntos (luces bajas permanentes).
   - Ligera ($500$ a $1999\text{ m}$): $-5$ puntos (faros neblineros).
   - Reducida ($100$ a $499\text{ m}$): $-12$ puntos (velocidad máxima $30\text{ km/h}$).
   - Crítica / niebla densa ($< 100\text{ m}$): $-25$ puntos (parada preventiva de flota pesada).

8. **Humedad de suelo y estabilidad geotécnica ($P_{\text{suelo}}$):**
   - Estable ($< 0.28\text{ m}^3/\text{m}^3$, $< 28\%$ saturación): $0$ puntos.
   - Húmedo ($0.28$ a $0.39\text{ m}^3/\text{m}^3$): $-10$ puntos (inspección de grietas en crestas).
   - Saturado ($\ge 0.40\text{ m}^3/\text{m}^3$): $-20$ puntos (evacuación de pie de talud y botaderos).

---

## 5. Horizontes operativos y fiabilidad estadística del modelo

La plataforma cuenta con un selector de horizontes temporales que permite planificar el trabajo según la naturaleza de la maniobra, mostrando un indicador dinámico de fiabilidad en la cabecera:

| Horizonte | Fiabilidad | Técnica meteorológica | Aplicación táctica SST |
| :--- | :---: | :--- | :--- |
| **En vivo (0h)** | **98%** | Telemetría instantánea y Nowcasting OMM | Monitoreo en tiempo real de frentes activos en faena. |
| **30 minutos (30m)** | **95%** | Alta resolución cada 15 min (`minutely_15`) | Maniobras críticas de izaje y traslados de carga sobredimensionada. |
| **1 hora (1h)** | **92%** | Nowcasting táctico de corto plazo | Trabajos temporales en altura (andamios) y frentes expuestos. |
| **3 horas (3h)** | **88%** | Previsión de frentes dinámicos (HRRR / ICON) | Tareas programadas: vaciados de concreto, tendido y barrenación. |
| **9 horas (9h)** | **82%** | Jornada laboral diurna (ECMWF IFS) | Planificación de frentes de superficie en obras civiles. |
| **12 horas (12h)** | **78%** | Turno estándar de guardia (régimen 12x12) | Análisis Seguro de Trabajo (AST). Frentes de viento y ciclo térmico. |
| **24 horas (24h)** | **72%** | Ciclo circadiano y relevo diario | Planificación logística, relevo de guardias y previsión del día siguiente. |

---

## 6. Arquitectura tecnológica

MiEntorno ha sido concebido bajo un principio de **arquitectura desacoplada, ligera y auditable** sin dependencias complejas de compilación:

- **Frontend:** HTML5 semántico, CSS3 moderno (Custom Properties, Grid, Flexbox, backdrop-filter nativo) y ECMAScript Modules (ESM).
- **Cartografía interactiva:** Leaflet v1.9 con mosaicos satelitales de alta resolución de Esri World Imagery (`ArcGIS REST Services`) y capa de referencia cartográfica híbrida.
- **Telemetría meteorológica:** Integración directa con los modelos numéricos de alta resolución de [Open-Meteo](https://open-meteo.com) (GFS, ECMWF e ICON), consultando variables horarias de radiación solar, viento a 10 metros, ráfagas, probabilidad de lluvia y energía convectiva CAPE.
- **Geocodificación y búsqueda:** OpenStreetMap Nominatim con control estricto de tasa (*rate limit* de 1 segundo) para localización precisa de minas, puertos y ciudades en el mundo.
- **Geolocalización:** W3C Geolocation API con soporte de alta precisión (`enableHighAccuracy`) y monitoreo de dispersión satelital (alerta de precisión $> 500\text{ m}$).

---

## 7. Ejecución en entorno local

Al no requerir ningún paso de compilación o empaquetado (*zero build step*), el proyecto puede ejecutarse con cualquier servidor HTTP local:

### Con Python (3.x):
```bash
python3 -m http.server 8000
```
Luego abrir `http://localhost:8000` en su navegador web.

### Con Node.js (npx):
```bash
npx serve .
```

### Con PHP:
```bash
php -S localhost:8000
```

---

## 8. Autoría técnica

**Esai Josue Huaman Meza**  
- Ingeniero HSE

---
