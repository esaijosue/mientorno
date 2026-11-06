# MiEntorno

> Plataforma de monitoreo ambiental y evaluación predictiva de riesgos físicos en tiempo real para operaciones industriales, mineras, energéticas y portuarias en el Perú.

[![Licencia](https://img.shields.io/badge/licencia-MIT-blue.svg)](LICENSE)
[![Estándar](https://img.shields.io/badge/normativa-D.S.%20024--2016--EM%20%7C%20Ley%2030102-brightgreen.svg)](#marco-normativo-y-regulatorio)
[![Arquitectura](https://img.shields.io/badge/arquitectura-Vanilla%20ES%20Modules-black.svg)](#arquitectura-tecnologica)

---

## 1. Descripción general

**MiEntorno** es un sistema de soporte a la toma de decisiones preventivas para supervisores de turno, inspectores de seguridad y salud en el trabajo (SST / HSE) e ingenieros residentes. Centraliza en una interfaz cartográfica satelital la telemetría climática y atmosférica en tiempo real para faenas operativas a nivel nacional.

La herramienta calcula de manera continua un **Índice de seguridad en faena (ISF)** en escala porcentual (0 a 100%), proyecta el comportamiento de las condiciones en una curva temporal de 24 horas y emite recomendaciones de control operacional inmediatas en cumplimiento estricto de la legislación laboral y sectorial peruana.

---

## 2. Alcance operacional

La plataforma está diseñada para las siguientes actividades en campo:

- **Operaciones mineras a cielo abierto y superficie:** plataformas de perforación, tajos, botaderos, canteras y plantas concentradoras.
- **Proyectos de energía e infraestructura:** líneas de transmisión de alta tensión, subestaciones eléctricas, parques eólicos y presas hidroeléctricas.
- **Obras civiles y viales:** movimiento de tierras, andamiaje, encofrado y trabajos de pavimentación en altura geográfica.
- **Terminales portuarios y costeros:** patios de maniobra de contenedores, muelles y operación de grúas pórtico.

---

## 3. Marco normativo y regulatorio

Los algoritmos de cálculo, umbrales de alerta y medidas de contingencia implementados en MiEntorno están calibrados conforme a las siguientes normativas:

| Norma / Estándar | Ámbito de aplicación | Factor evaluado en el sistema |
| :--- | :--- | :--- |
| **D.S. 024-2016-EM** (Arts. 136, 137, 271) | Reglamento de Seguridad y Salud Ocupacional en Minería | Límite mandatorio de parada técnica para izajes y grúas móviles por ráfagas de viento ($\ge 32\text{ km/h}$). Protocolo de refugio ante tormentas eléctricas. |
| **Ley 30102** | Prevención contra radiación solar nociva en el Perú | Clasificación estandarizada del índice UV (escala Senamhi / OMS) y obligatoriedad de medidas de fotoprotección, rotación a sombra y sombreros de ala ancha. |
| **Ley 29783** | Ley de Seguridad y Salud en el Trabajo | Principio de prevención y jerarquía de controles de riesgos ambientales en frentes de trabajo. |
| **Norma Técnica G.050** | Seguridad durante la Construcción | Suspensión preventiva de trabajos en andamios y plataformas elevadas ante ráfagas de viento superiores a $50\text{ km/h}$ o precipitaciones continuas. |
| **ASME B30.5 / OSHA 1926.1431** | Estándar internacional de grúas e izaje | Criterios de reducción de capacidad de carga útil por velocidad de viento sostenido. |
| **Organización Meteorológica Mundial (OMM)** | Clasificación de inestabilidad convectiva | Gradiente de energía potencial convectiva disponible (CAPE en $\text{J/kg}$) para la alerta temprana de rayos y descargas atmosféricas. |

---

## 4. Metodología de cálculo: Índice de seguridad en faena (ISF)

El índice general consolida el riesgo ambiental instantáneo en una métrica porcentual entre $0\%$ y $100\%$. Su formulación matemática se basa en la deducción de penalidades ponderadas a partir de una línea base de operación segura ($100\%$):

$$\text{ISF} = 100 - \sum_{i=1}^{n} P_i$$

Donde $P_i$ representa la penalidad específica calculada para cada uno de los cuatro factores críticos:

### Factores y penalidades aplicadas

1. **Radiación solar ultravioleta ($P_{\text{UV}}$):**
   - $UV < 6.0$: $0$ puntos (bajo a moderado).
   - $6.0 \le UV < 8.0$: $-8$ puntos (alto).
   - $8.0 \le UV < 11.0$: $-18$ puntos (muy alto).
   - $UV \ge 11.0$: $-26$ puntos (extremo; rotación forzada y protección total).

2. **Ráfagas de viento y velocidad sostenida ($P_{\text{viento}}$):**
   - Ráfagas $< 25\text{ km/h}$: $0$ puntos (condición regular).
   - $25 \le \text{ráfagas} \le 35\text{ km/h}$: $-12$ puntos (precaución en maniobras de izaje y grúas).
   - $36 \le \text{ráfagas} \le 50\text{ km/h}$: $-22$ puntos (restricción obligatoria de izajes de gran volumen).
   - Ráfagas $> 50\text{ km/h}$: $-35$ puntos (parada técnica mandatoria de izajes y trabajos en andamios).

3. **Precipitación y probabilidad pluvial ($P_{\text{lluvia}}$):**
   - Probabilidad $< 30\%$: $0$ puntos.
   - $30\% \le \text{prob.} \le 60\%$: $-6$ puntos (alerta de terreno húmedo).
   - Probabilidad $> 60\%$ o acumulación $> 2\text{ mm/h}$: $-16$ puntos (restricción en pistas de acarreo y taludes).

4. **Inestabilidad convectiva y tormenta eléctrica ($P_{\text{tormenta}}$):**
   - $\text{CAPE} < 500\text{ J/kg}$: $0$ puntos (atmósfera estable).
   - $500 \le \text{CAPE} < 1500\text{ J/kg}$: $-8$ puntos (inestabilidad moderada).
   - $1500 \le \text{CAPE} < 2500\text{ J/kg}$: $-18$ puntos (alerta de tormenta; verificación de refugios).
   - $\text{CAPE} \ge 2500\text{ J/kg}$ o código WMO activo ($95, 96, 99$): $-35$ puntos (alerta roja; evacuación inmediata a refugio jaula de Faraday).

---

## 5. Arquitectura tecnológica

MiEntorno ha sido concebido bajo un principio de **arquitectura desacoplada, ligera y auditable** sin dependencias complejas de compilación:

- **Frontend:** HTML5 semántico, CSS3 moderno (Custom Properties, Grid, Flexbox, backdrop-filter nativo) y ECMAScript Modules (ESM).
- **Cartografía interactiva:** Leaflet v1.9 con mosaicos satelitales de alta resolución de Esri World Imagery (`ArcGIS REST Services`) y capa de referencia cartográfica híbrida.
- **Telemetría meteorológica:** Integración directa con los modelos numéricos de alta resolución de [Open-Meteo](https://open-meteo.com) (GFS, ECMWF e ICON), consultando variables horarias de radiación solar, viento a 10 metros, ráfagas, probabilidad de lluvia y energía convectiva CAPE.
- **Geocodificación y búsqueda:** OpenStreetMap Nominatim con control estricto de tasa (*rate limit* de 1 segundo) para localización precisa de minas, puertos y distritos en el Perú.
- **Geolocalización:** W3C Geolocation API con soporte de alta precisión (`enableHighAccuracy`) y monitoreo de dispersión satelital (alerta de precisión $> 500\text{ m}$).

---

## 6. Estructura del proyecto

```text
mientorno/
├── .env.example       # Plantilla de variables de configuración
├── .gitignore          # Exclusiones de control de versiones
├── LICENSE             # Licencia de código abierto MIT
├── README.md           # Documentación técnica y memoria del sistema
├── index.html          # Interfaz principal de monitoreo y centro de control
├── acerca.html         # Ficha técnica, memoria metodológica y marco legal
├── style.css           # Sistema de diseño, layout responsive y estilos
├── main.js             # Orquestador del ciclo de vida y eventos de la aplicación
├── ui.js               # Renderizado del DOM, cálculo del índice y visualización
├── mapa.js             # Controlador del mapa satelital Leaflet y marcador GPS
├── reglas.js           # Umbrales normativos, constantes y ponderación de riesgos
├── api.js              # Servicios de consulta a Open-Meteo y Nominatim
└── logo.webp           # Logotipo oficial de la plataforma
```

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

## 8. Opciones de despliegue gratuito en producción

Al ser una aplicación web estática (*Single Page Application* sin backend intermedio), puede alojarse con costo $0 en cualquiera de las siguientes plataformas de borde (*Edge CDN*):

### Opción A: Cloudflare Pages (Recomendada)
- **Ventajas:** Máximo rendimiento con servidores de borde en Lima, Perú; ancho de banda ilimitado gratuito; certificados SSL automáticos; soporte nativo para dominios personalizados (`mientorno.pe` o `mientorno.com`).
- **Pasos:**
  1. Inicie sesión en [dash.cloudflare.com](https://dash.cloudflare.com).
  2. Vaya a **Workers & Pages** $\rightarrow$ **Create Application** $\rightarrow$ **Pages** $\rightarrow$ **Connect to Git**.
  3. Seleccione el repositorio `josuemzx/mientorno`.
  4. En ajustes de build: deje **Build command** en blanco y **Build output directory** en `/`.
  5. Haga clic en **Deploy**. Cada nuevo commit en `main` desplegará automáticamente.

### Opción B: GitHub Pages
- **Ventajas:** Cero configuración adicional, integrado directamente en el repositorio.
- **Pasos:**
  1. En el repositorio de GitHub, vaya a **Settings** $\rightarrow$ **Pages**.
  2. En **Source**, elija `Deploy from a branch`.
  3. Seleccione la rama `main` y la carpeta `/ (root)`.
  4. Guarde. La plataforma estará disponible en `https://josuemzx.github.io/mientorno/`.

---

## 9. Dominio personalizado recomendado

Para otorgar formalidad institucional ante clientes mineros o entidades fiscalizadoras (Sunafil, Osinergmin, OEFA):

1. **Dominio peruano (`.pe` o `.com.pe`):**
   - Adquirible en el Registro Oficial [Punto.pe](https://punto.pe).
   - Sugerencias: `mientorno.pe`, `mientorno.com.pe`, `faena.pe`.
2. **Dominio global (`.com` / `.app` / `.tech`):**
   - Adquirible en Cloudflare Registrar, Namecheap o Porkbun.
   - Sugerencias: `mientorno.com`, `mientornoapp.com`.
3. **Vinculación:**
   - Configure un registro `CNAME` apuntando al dominio de Cloudflare Pages o GitHub Pages y active el proxy DNS con SSL automático.

---

## 10. Autoría técnica

**Esai Josue Huaman Meza**  
- Ingeniero de Seguridad y Salud en el Trabajo (SST / HSE)
- Máster en Informática
- Doble MBA en Ciencia de Datos e Inteligencia Artificial aplicada a la industria

---

## 11. Licencia

Este proyecto está bajo la Licencia MIT. Para mayor información, consulte el archivo [LICENSE](LICENSE).
