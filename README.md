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

### Factores evaluados, deducciones y medidas operacionales

1. **Radiación solar ultravioleta ($P_{\text{UV}}$):**
   - Noche ($UV < 0.2$) o Bajo/Moderado ($0.2 \le UV < 6.0$): $0$ puntos (lentes con filtro UV400 y bloqueador solar FPS 50+).
   - Alto ($6.0 \le UV < 8.0$): $-10$ puntos (casco con cortaviento tipo legionario con cubrenuca UPF 50+, visera de ala ancha e hidratación programada de 250 ml cada 45 min).
   - Muy alto ($8.0 \le UV < 11.0$): $-18$ puntos (mallas raschel o toldos en frentes de trabajo, rotación obligatoria a la sombra cada 20–30 min e hidratación continua).
   - Extremo ($UV \ge 11.0$): $-25$ puntos (suspensión de trabajos físicos pesados a cielo abierto entre 11:00 y 15:00 h, conforme a la Ley N° 30102, con suministro de sales de rehidratación oral / electrolitos).

2. **Precipitación pluvial y acumulación ($P_{\text{lluvia}}$):**
   - Seco ($0.0\text{ mm/h}$ y prob. $< 20\%$): $0$ puntos (tránsito regular en haul roads y riego controlado antipolvo).
   - Llovizna ($0.1$ a $0.9\text{ mm/h}$ o prob. $20\%$ a $39\%$): $-6$ puntos (alerta por *efecto jaboncillo* por lodo superficial; reducción preventiva de velocidad en 15 km/h en curvas y rampas; ropa impermeable de faena).
   - Lluvia moderada ($1.0$ a $4.9\text{ mm/h}$ o prob. $40\%$ a $69\%$): $-12$ puntos (velocidad máxima reducida a 30 km/h en acarreo; distancia entre volquetes duplicada a mín. 50 m; activación de bombas de achique y vigilancia de cunetas).
   - Lluvia intensa ($\ge 5.0\text{ mm/h}$ o prob. $\ge 70\%$): $-20$ puntos (restricción en rampas $> 10\%$; suspensión preventiva de acarreo si se compromete la adherencia; evacuación de personal en fondo de tajo y pie de talud).

3. **Velocidad del viento y ráfagas ($P_{\text{viento}}$):**
   - Normal ($< 25.0\text{ km/h}$): $0$ puntos (maniobras de grúas, izajes y trabajos en altura autorizados sin restricción).
   - Precaución ($25.0$ a $31.9\text{ km/h}$): $-8$ puntos (uso obligatorio de mínimo dos vientos guía / *taglines* en izajes, barbiquejo de 3 puntos en cascos, amarre de herramientas de mano y prohibición de izar cargas de gran superficie tipo vela).
   - Restricción izajes ($32.0$ a $49.9\text{ km/h}$): $-20$ puntos (**Límite mandatorio de parada técnica de grúas e izajes conforme a D.S. 024-2016-EM Art. 385 y ASME B30.5**: descenso y bloqueo de plumas, suspensión de canastillas manlift y montaje estructural).
   - Suspensión total ($\ge 50.0\text{ km/h}$): $-35$ puntos (**Parada mandatoria de trabajos en altura según Norma G.050**: evacuación inmediata de andamios y plataformas, repliegue total de plumas y aseguramiento de paneles sueltos).

4. **Inestabilidad convectiva y tormenta eléctrica ($P_{\text{tormenta}}$):**
   - CAPE Bajo / Estable ($< 500\text{ J/kg}$): $0$ puntos (atmósfera estable; monitoreo rutinario del sistema de detección).
   - CAPE Moderado ($500$ a $1499\text{ J/kg}$): $-6$ puntos (verificación preventiva de detectores portátiles y estado de refugios en frentes remotos).
   - CAPE Alto ($1500$ a $2499\text{ J/kg}$): $-14$ puntos (alerta pre-tormenta; prohibido iniciar voladuras, carguío de explosivos, labores en cumbres o tendido de cables a cielo abierto; identificar rutas de evacuación rápida hacia refugios Faraday).
   - CAPE Muy Alto ($\ge 2500\text{ J/kg}$): $-22$ puntos (potencial convectivo severo; preparación de evacuación y repliegue preventivo).
   - Tormenta activa o código WMO $95, 96, 99$: $-35$ puntos (**Evacuación inmediata conforme a regla 30/30 OMM/WMO y D.S. 024-2016-EM**: paralización total a cielo abierto; prohibido guarecerse bajo árboles o estructuras metálicas aisladas; evacuación obligatoria a camionetas o camiones con cabina metálica cerrada o refugios Faraday certificados con puesta a tierra; retorno seguro tras 30 min sin descargas en un radio de 16 km).

5. **Temperatura y estrés térmico ($P_{\text{térmico}}$):**
   - Confort térmico ($8.1^\circ\text{C}$ a $28.0^\circ\text{C}$): $0$ puntos (condiciones óptimas; hidratación regular estándar de 2 L/día).
   - Frío moderado ($0.1^\circ\text{C}$ a $8.0^\circ\text{C}$): $-6$ puntos (casacas térmicas de faena, chalecos cortaviento y calistenia muscular previa para evitar lesiones osteomusculares).
   - Calor moderado ($28.1^\circ\text{C}$ a $32.0^\circ\text{C}$): $-6$ puntos (hidratación preventiva cada 45 min; ventilación forzada o aire acondicionado en cabinas de maquinaria).
   - Bajo cero / Escarcha ($-4.9^\circ\text{C}$ a $0.0^\circ\text{C}$): $-18$ puntos (EPP térmico de 3 capas, guantes térmicos antideslizantes, rotación periódica a caseta térmica e inspección de *hielo negro* en gratings y pasarelas).
   - Estrés térmico por calor ($32.1^\circ\text{C}$ a $38.0^\circ\text{C}$): $-18$ puntos (régimen de trabajo-descanso 45 min labor / 15 min descanso bajo sombra fresca según ISO 7243 y R.M. 375-2008-TR; hidratación obligatoria de 1 L/hora con aporte de electrolitos; monitoreo activo de fatiga o calambres térmicos).
   - Helada extrema ($\le -5.0^\circ\text{C}$): $-25$ puntos (régimen 30 min trabajo / 30 min en caseta calefaccionada, ropa térmica multicapa con pasamontañas ignífugo y bebidas calientes azucaradas).
   - Golpe de calor crítico ($> 38.0^\circ\text{C}$): $-25$ puntos (**Alerta roja por riesgo vital**: suspensión obligatoria de faenas físicas pesadas a la intemperie; pausas de 30 min cada 30 min trabajados o parada técnica hasta descenso térmico; tópicos y camilla con compresas frías en alerta).

6. **Nieve y congelamiento ($P_{\text{nieve}}$):**
   - Seco ($0.0\text{ cm}$): $0$ puntos (vías y accesos despejados sin restricción invernal).
   - Escarcha ligera ($0.1$ a $0.9\text{ cm}$): $-8$ puntos (alerta por *hielo negro (black ice)* en calzadas y gratings metálicos de escaleras; esparcir sal o arena en accesos peatonales; técnica estricta de 3 puntos de apoyo en equipos pesados; activar desempañadores de cabina).
   - Nieve moderada ($1.0$ a $4.9\text{ cm}$): $-18$ puntos (tracción 4x4 y cadenas para nieve obligatorias en neumáticos de vehículos livianos y pesados; velocidad máxima 20 km/h; despeje continuo de haul roads con motoniveladoras; suspensión de trabajos en techos y andamios a la intemperie).
   - Nevada severa ($\ge 5.0\text{ cm}$): $-30$ puntos (**Paralización de acarreo y emergencia invernal**: parada preventiva de volquetes y camiones de extracción; cierre de frentes de tajo no prioritarios; tránsito restringido exclusivamente a motoniveladoras y barredoras viales; personal a resguardo en campamentos o refugios calefaccionados).

7. **Visibilidad en ruta y acarreo ($P_{\text{visibilidad}}$):**
   - Óptima ($\ge 2000\text{ m}$): $0$ puntos (tránsito regular de flota pesada y liviana a velocidades autorizadas con luces bajas encendidas permanentemente).
   - Neblina ligera ($501$ a $2000\text{ m}$): $-5$ puntos (conducción a la defensiva; encendido de luces neblineras y pértiga con luz estroboscópica; velocidad máx. 40 km/h en haul roads; chalecos reflectivos clase 3 para personal de a pie).
   - Niebla moderada ($101$ a $500\text{ m}$): $-12$ puntos (velocidad máx. 20–25 km/h; distancia mínima de seguimiento de 60 metros entre volquetes; prohibición absoluta de adelantar; comunicación radial obligatoria en curvas y cruces de tajo).
   - Niebla densa crítica ($\le 100\text{ m}$): $-25$ puntos (**Parada mandatoria de acarreo y transporte pesado según D.S. 024-2016-EM**: detención ordenada de volquetes en bermas o bahías de parqueo seguro; encender luces de emergencia e intermitentes; prohibido descender de cabinas en ruta).

8. **Humedad de suelo y estabilidad geotécnica ($P_{\text{suelo}}$):**
   - Terreno estable ($< 0.28\text{ m}^3/\text{m}^3$, $< 28\%$ saturación): $0$ puntos (soporte geotécnico óptimo; excavaciones, acarreo y posicionamiento de grúas autorizados sin restricción).
   - Suelo húmedo ($0.28$ a $0.399\text{ m}^3/\text{m}^3$, $28\%$ a $39.9\%$ saturación): $-10$ puntos (pérdida de capacidad portante del terreno: inspección visual diaria de fisuras o grietas de tracción en crestas de talud; uso mandatorio de almohadillas / *mats* de distribución de carga de doble área bajo zapatas de grúas; prohibido estacionar a menos de 3 metros del borde de zanjas o taludes).
   - Saturación crítica ($\ge 0.40\text{ m}^3/\text{m}^3$, $\ge 40\%$ saturación): $-20$ puntos (**Alerta geotécnica por deslizamiento**: evacuación preventiva de cuadrillas al pie de taludes inestables y botaderos; prohibición de izajes o tránsito de maquinaria pesada sobre terreno natural no consolidado; monitoreo continuo con prismas y piezómetros; verificación de bermas de seguridad de 3/4 de llanta en vías de acarreo).

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
