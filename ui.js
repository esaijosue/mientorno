/**
 * ui.js - Manejo visual de la plataforma de inteligencia de riesgos y centro de control
 * Proyecto: MiEntorno
 * 
 * Sistema visual inspirado en salas de operaciones de misión crítica y monitoreo satelital.
 * Todas las etiquetas en mayúsculas y minúsculas naturales (sentence case),
 * cálculo dinámico del índice de seguridad de faena (0-100%), curva sparkline interactiva de 24 horas,
 * tarjetas técnicas con medidas de control SST y panel flotante de alertas y recomendaciones.
 */

import {
  APP_NAME,
  ACCURACY_WARNING_THRESHOLD_METERS,
  REGLAS_UV,
  UMBRALES_VIENTO,
  UMBRALES_CAPE,
  WEATHER_CODES_TORMENTA
} from './reglas.js';

let elements = {};

/**
 * Inicializa y recupera los elementos del DOM.
 */
export function initUI() {
  elements = {
    btnLocation: document.getElementById('btn-location'),
    locationStatus: document.getElementById('location-status'),
    accuracyAlert: document.getElementById('accuracy-alert'),
    coordsDisplay: document.getElementById('coords-display'),
    searchInput: document.getElementById('search-input'),
    searchResults: document.getElementById('search-results'),
    cardsContainer: document.getElementById('cards-container'),
    btnRefresh: document.getElementById('btn-refresh'),
    lastUpdated: document.getElementById('last-updated'),
    floatingPlaceName: document.getElementById('floating-place-name'),
    floatingKpiTitle: document.getElementById('floating-kpi-title'),
    floatingKpiSubtitle: document.getElementById('floating-kpi-subtitle'),
    floatingKpiValue: document.getElementById('floating-kpi-value'),
    floatingKpiUnit: document.getElementById('floating-kpi-unit'),
    floatingKpiCaption: document.getElementById('floating-kpi-caption'),
    safetyScoreNumber: document.getElementById('safety-score-number'),
    tallySafeCount: document.getElementById('tally-safe-count'),
    tallyAlertCount: document.getElementById('tally-alert-count'),
    warningAccordion: document.getElementById('warning-accordion'),
    accordionToggleBtn: document.getElementById('accordion-toggle-btn'),
    accordionWarningCount: document.getElementById('accordion-warning-count'),
    warningPrimaryTitle: document.getElementById('warning-primary-title'),
    warningRecommendText: document.getElementById('warning-recommend-text'),
    headerAlertBadge: document.getElementById('header-alert-badge'),
    bottomAtmPressure: document.getElementById('bottom-atm-pressure'),
    bottomAtmDetail: document.getElementById('bottom-atm-detail'),
    chartAreaPath: document.getElementById('chart-area-path'),
    chartLinePath: document.getElementById('chart-line-path'),
    dockBtnDashboard: document.getElementById('dock-btn-dashboard'),
    dockBtnMap: document.getElementById('dock-btn-map'),
    dockBtnAlerts: document.getElementById('dock-btn-alerts'),
    dockBtnGps: document.getElementById('dock-btn-gps')
  };

  // Configurar toggle del acordeón de alertas
  if (elements.accordionToggleBtn && elements.warningAccordion) {
    elements.accordionToggleBtn.addEventListener('click', () => {
      elements.warningAccordion.classList.toggle('collapsed');
    });
  }

  // Atajo de teclado global Ctrl+K / Ctrl+Shift+F para enfocar el buscador
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || (e.shiftKey && (e.key === 'f' || e.key === 'F')))) {
      e.preventDefault();
      if (elements.searchInput) {
        elements.searchInput.focus();
        elements.searchInput.select();
      }
    }
  });

  return elements;
}

function getElements() {
  if (!elements.cardsContainer) {
    initUI();
  }
  return elements;
}

/**
 * Estado del botón de geolocalización.
 */
export function setLocationButtonLoading(isLoading, text = null) {
  const btn = getElements().btnLocation;
  if (!btn) return;
  btn.disabled = isLoading;
  btn.innerHTML = isLoading
    ? `<div class="spinner-dot-ring" aria-hidden="true"></div><span>${text || 'Obteniendo GPS...'}</span>`
    : `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg><span>${text || 'Usar mi GPS'}</span>`;
}

/**
 * Estado del botón de actualización manual.
 */
export function setRefreshButtonLoading(isRefreshing) {
  const btn = getElements().btnRefresh;
  if (!btn) return;
  btn.disabled = isRefreshing;
  btn.classList.toggle('spinning', isRefreshing);
}

/**
 * Actualiza la hora de la última sincronización en tiempo real.
 */
export function updateLastRefreshTimestamp() {
  const timeEl = getElements().lastUpdated;
  if (!timeEl) return;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  timeEl.textContent = `Actualizado ${timeStr}`;
}

/**
 * Muestra el estado de la ubicación y la precisión en metros.
 */
export function updateLocationInfo(lat, lon, accuracy, source = 'gps', placeName = null) {
  const els = getElements();
  if (!els.locationStatus || !els.coordsDisplay) return;

  els.coordsDisplay.textContent = `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;

  const displayName = placeName || (source === 'inicial' ? 'Lima / Callao' : `${lat >= 0 ? '+' : ''}${lat.toFixed(2)}°, ${lon >= 0 ? '+' : ''}${lon.toFixed(2)}°`);
  if (els.floatingPlaceName) {
    els.floatingPlaceName.textContent = displayName;
  }

  if (accuracy !== null && accuracy !== undefined) {
    const roundedAcc = Math.round(accuracy);
    els.locationStatus.textContent = `${displayName} &bull; Señal GPS activa (&plusmn;${roundedAcc} m de precisión)`;

    if (roundedAcc > ACCURACY_WARNING_THRESHOLD_METERS) {
      els.accuracyAlert.innerHTML = `
        <div class="precision-banner alert-warning">
          <strong>Ubicación aproximada (&plusmn;${roundedAcc} m)</strong>
          <span>Puedes arrastrar el marcador en el mapa satelital para afinar tu frente de trabajo.</span>
        </div>
      `;
      els.accuracyAlert.hidden = false;
    } else {
      els.accuracyAlert.hidden = true;
    }
  } else {
    const label = source === 'arrastre_marcador'
      ? `Punto reajustado en el mapa (${displayName})`
      : source === 'click_mapa'
        ? `Punto fijado en el mapa (${displayName})`
        : source === 'busqueda'
          ? `Ubicación: ${displayName}`
          : source === 'inicial'
            ? 'Frente de operación activo (Lima / Callao)'
            : `Ubicación en sesión (${displayName})`;

    els.locationStatus.textContent = label;
    els.accuracyAlert.hidden = true;
  }
}

/**
 * Muestra mensaje de notificación al usuario.
 */
export function showNotification(message, type = 'error') {
  const alertEl = getElements().accuracyAlert;
  if (!alertEl) return;
  const alertClass = type === 'error' ? 'alert-danger' : 'alert-warning';

  alertEl.innerHTML = `
    <div class="precision-banner ${alertClass}">
      <span>${escapeHTML(message)}</span>
    </div>
  `;
  alertEl.hidden = false;
}

/**
 * Renderiza la lista de sugerencias de búsqueda.
 */
export function renderSearchResults(results, onSelect) {
  const listEl = getElements().searchResults;
  const inputEl = getElements().searchInput;
  if (!listEl) return;

  listEl.innerHTML = '';
  if (!results || results.length === 0) {
    listEl.hidden = true;
    return;
  }

  results.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'suggestion-item';
    li.innerHTML = `
      <div class="suggestion-main-title">${escapeHTML(item.name)}</div>
      <div class="suggestion-detail">${escapeHTML(item.displayName)}</div>
    `;
    li.addEventListener('click', () => {
      listEl.hidden = true;
      if (inputEl) {
        inputEl.value = item.name;
      }
      onSelect(item);
    });
    listEl.appendChild(li);
  });

  listEl.hidden = false;
}

/**
 * Oculta la lista de sugerencias.
 */
export function hideSearchResults() {
  const listEl = getElements().searchResults;
  if (listEl) {
    listEl.hidden = true;
  }
}

/**
 * =========================================================================
 * RENDERIZADO DE EVALUACIÓN DE RIESGOS E ÍNDICE DE SEGURIDAD
 * =========================================================================
 */
export function renderRiskCards(weatherData) {
  const els = getElements();
  if (!els.cardsContainer) return;
  els.cardsContainer.innerHTML = '';

  const riskContext = {
    safeCount: 0,
    alertCount: 0,
    scoreDeductions: 0,
    highestRisk: {
      title: 'Condición normal',
      subtitle: 'Operaciones de campo',
      value: 'Seguro',
      unit: '',
      caption: 'Parámetros dentro de umbrales permitidos',
      recommendation: 'Operaciones normales en campo sin restricciones climáticas.',
      severityScore: 0
    }
  };

  // 1. Radiación UV
  try {
    const uvCard = createUVCard(weatherData, riskContext);
    els.cardsContainer.appendChild(uvCard);
  } catch (err) {
    console.error('Error generando tarjeta UV:', err);
    els.cardsContainer.appendChild(createErrorCard('Factor 01 &bull; Radiación UV'));
  }

  // 2. Lluvia y precipitación
  try {
    const rainCard = createRainCard(weatherData, riskContext);
    els.cardsContainer.appendChild(rainCard);
  } catch (err) {
    console.error('Error generando tarjeta Lluvia:', err);
    els.cardsContainer.appendChild(createErrorCard('Factor 02 &bull; Precipitación y lluvia'));
  }

  // 3. Viento y ráfagas (D.S. 024-2016-EM)
  try {
    const windCard = createWindCard(weatherData, riskContext);
    els.cardsContainer.appendChild(windCard);
  } catch (err) {
    console.error('Error generando tarjeta Viento:', err);
    els.cardsContainer.appendChild(createErrorCard('Factor 03 &bull; Velocidad del viento'));
  }

  // 4. Tormenta eléctrica y energía convectiva (CAPE)
  try {
    const stormCard = createThunderstormCard(weatherData, riskContext);
    els.cardsContainer.appendChild(stormCard);
  } catch (err) {
    console.error('Error generando tarjeta Tormenta:', err);
    els.cardsContainer.appendChild(createErrorCard('Factor 04 &bull; Potencial de tormenta'));
  }

  // Actualizar métricas ejecutivas en la tarjeta hero del índice de seguridad
  updateSafetyIndexSummary(riskContext, weatherData);

  // Actualizar tarjeta de cristal flotante sobre el mapa satelital
  updateFloatingMapCard(riskContext.highestRisk);

  // Actualizar panel de alertas y recomendaciones SST del mapa
  updateWarningAccordion(riskContext);

  // Actualizar telemetría atmosférica del pie de mapa
  updateAtmosphereTelemetry(weatherData);

  updateLastRefreshTimestamp();
}

/**
 * Actualiza el índice general de seguridad de campo y dibuja la curva sparkline.
 */
function updateSafetyIndexSummary(context, weatherData) {
  const els = getElements();
  if (!els.safetyScoreNumber) return;

  // Cálculo del puntaje de seguridad (100 base menos deducciones)
  const finalScore = Math.max(20, Math.min(99, 100 - context.scoreDeductions));
  els.safetyScoreNumber.textContent = finalScore.toFixed(1);

  if (els.tallySafeCount) els.tallySafeCount.textContent = context.safeCount;
  if (els.tallyAlertCount) els.tallyAlertCount.textContent = context.alertCount;

  // Actualizar curva sparkline SVG interactiva con datos horarios reales
  renderSparklineCurve(weatherData, finalScore);
}

/**
 * Dibuja la curva SVG de 24 horas del índice de seguridad basada en datos climáticos reales.
 */
function renderSparklineCurve(weatherData, currentScore) {
  const els = getElements();
  if (!els.chartLinePath || !els.chartAreaPath) return;

  const hourlyUV = weatherData?.hourly?.uv_index || [];
  const hourlyWind = weatherData?.hourly?.wind_gusts_10m || [];

  // Puntos base si no hay datos suficientes
  const points = [];
  const width = 380;
  const height = 90;
  const steps = 12;

  for (let i = 0; i < steps; i++) {
    const x = Math.round((i / (steps - 1)) * width);
    const uvVal = hourlyUV[i] || 0;
    const windVal = hourlyWind[i] || 15;

    // A mayor UV y viento, menor puntaje de seguridad (más bajo en el eje Y)
    // Coordenada Y en SVG: 0 es arriba (100% seguro), 90 es abajo (peligroso)
    const riskFactor = Math.min(1, (uvVal / 11) * 0.6 + (windVal / 50) * 0.4);
    const simulatedScore = Math.max(30, Math.min(95, currentScore * (1 - riskFactor * 0.35)));
    
    // Normalizar a escala SVG de 20px a 75px
    const y = Math.round(80 - ((simulatedScore - 30) / 70) * 55);
    points.push({ x, y });
  }

  // Construir trayectorias SVG smooth
  if (points.length >= 2) {
    let pathD = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cx = (prev.x + curr.x) / 2;
      pathD += ` C ${cx},${prev.y} ${cx},${curr.y} ${curr.x},${curr.y}`;
    }

    els.chartLinePath.setAttribute('d', pathD);
    const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;
    els.chartAreaPath.setAttribute('d', areaD);
  }
}

/**
 * Actualiza la tarjeta de cristal flotante sobre el mapa satelital.
 */
function updateFloatingMapCard(highestRisk) {
  const els = getElements();
  if (!els.floatingKpiTitle || !els.floatingKpiValue) return;

  els.floatingKpiTitle.textContent = highestRisk.title;
  els.floatingKpiSubtitle.textContent = highestRisk.subtitle;
  els.floatingKpiValue.textContent = highestRisk.value;
  els.floatingKpiUnit.textContent = highestRisk.unit;
  if (els.floatingKpiCaption && highestRisk.caption) {
    els.floatingKpiCaption.textContent = highestRisk.caption;
  }
}

/**
 * Actualiza el panel de alertas y recomendaciones SST del mapa.
 */
function updateWarningAccordion(context) {
  const els = getElements();
  if (els.headerAlertBadge) {
    els.headerAlertBadge.textContent = context.alertCount;
    els.headerAlertBadge.style.display = context.alertCount > 0 ? 'flex' : 'none';
  }

  if (els.accordionWarningCount) {
    els.accordionWarningCount.textContent = context.alertCount > 0
      ? `Condiciones con restricción (${context.alertCount} factor${context.alertCount > 1 ? 'es' : ''})`
      : 'Condiciones de operación segura (0 factores de alerta)';
  }

  if (els.warningPrimaryTitle) {
    els.warningPrimaryTitle.textContent = `${context.highestRisk.title}: ${context.highestRisk.subtitle} (${context.highestRisk.value} ${context.highestRisk.unit})`;
  }

  if (els.warningRecommendText && context.highestRisk.recommendation) {
    els.warningRecommendText.textContent = context.highestRisk.recommendation;
  }
}

/**
 * Actualiza la telemetría atmosférica del pie del mapa.
 */
function updateAtmosphereTelemetry(weatherData) {
  const els = getElements();
  if (!els.bottomAtmPressure) return;

  const currentPressure = weatherData?.current?.surface_pressure ? Math.round(weatherData.current.surface_pressure) : 1014;
  const currentHumidity = weatherData?.current?.relative_humidity_2m ? Math.round(weatherData.current.relative_humidity_2m) : 42;

  els.bottomAtmPressure.textContent = `${currentPressure} hPa`;
  if (els.bottomAtmDetail) {
    els.bottomAtmDetail.textContent = `Humedad ${currentHumidity}% &bull; Visibilidad &gt;10 km`;
  }
}

function getCurrentHourIndex(hourlyTime, currentTimeStr) {
  if (!hourlyTime || !Array.isArray(hourlyTime)) return 0;
  if (!currentTimeStr) return 0;
  const currentPrefix = currentTimeStr.slice(0, 13);
  const idx = hourlyTime.findIndex((t) => t.startsWith(currentPrefix));
  return idx !== -1 ? idx : 0;
}

/**
 * 1. Tarjeta Radiación UV
 */
function createUVCard(data, ctx) {
  const currentHourIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const currentUV = data?.hourly?.uv_index ? (data.hourly.uv_index[currentHourIdx] ?? 0) : 0;
  const maxUV = data?.daily?.uv_index_max?.[0] ?? currentUV;

  const evaluatedValue = Math.max(currentUV, maxUV);
  const rule = REGLAS_UV.find((r) => evaluatedValue >= r.min && evaluatedValue <= r.max) || REGLAS_UV[0];

  let deduction = 0;
  let severityScore = 0;
  const isSafe = evaluatedValue < 6;

  if (evaluatedValue >= 11) {
    deduction = 25;
    severityScore = 5;
  } else if (evaluatedValue >= 8) {
    deduction = 18;
    severityScore = 4;
  } else if (evaluatedValue >= 6) {
    deduction = 10;
    severityScore = 3;
  }

  ctx.scoreDeductions += deduction;
  if (isSafe) ctx.safeCount++; else ctx.alertCount++;

  if (severityScore > ctx.highestRisk.severityScore) {
    ctx.highestRisk = {
      title: 'Radiación solar UV',
      subtitle: `Nivel ${rule.nivel.toLowerCase()}`,
      value: maxUV.toFixed(1),
      unit: 'UV',
      caption: `Pico crítico previsto a las 12:30 pm`,
      recommendation: rule.recomendacion,
      severityScore
    };
  }

  const badgeClass = evaluatedValue >= 8 ? 'badge-red' : evaluatedValue >= 6 ? 'badge-amber' : 'badge-green';
  const pillClass = evaluatedValue >= 8 ? 'pill-red' : evaluatedValue >= 6 ? 'pill-amber' : 'pill-green';
  const borderClass = evaluatedValue >= 8 ? 'border-red' : evaluatedValue >= 6 ? 'border-amber' : 'border-green';

  const card = document.createElement('article');
  card.className = 'risk-card';
  card.innerHTML = `
    <div class="risk-card-top-row">
      <div class="factor-identifier">
        <span class="factor-badge-circle ${badgeClass}">01</span>
        <span class="factor-title">Radiación solar UV</span>
      </div>
      <span class="card-external-arrow">&nearr;</span>
    </div>

    <div class="risk-metric-hero-line">
      <div>
        <span class="metric-hero-val">${maxUV.toFixed(1)}</span>
        <span class="metric-hero-unit">UV máximo</span>
      </div>
      <span class="risk-status-pill ${pillClass}">Nivel ${rule.nivel.toLowerCase()}</span>
    </div>

    <div class="control-measure-box ${borderClass}">
      <span class="control-label">Medida de control SST</span>
      <span>${escapeHTML(rule.recomendacion)}</span>
    </div>
  `;
  return card;
}

/**
 * 2. Tarjeta Lluvia y precipitación
 */
function createRainCard(data, ctx) {
  const currentIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const times = data?.hourly?.time?.slice(currentIdx, currentIdx + 24) || [];
  const probs = data?.hourly?.precipitation_probability?.slice(currentIdx, currentIdx + 24) || [];
  const amounts = data?.hourly?.precipitation?.slice(currentIdx, currentIdx + 24) || [];

  let nextRainText = 'Sin precipitaciones en las próximas 24 horas.';
  let hasRain = false;
  let maxProb = 0;
  let totalPrecip = 0;

  for (let i = 0; i < times.length; i++) {
    const p = probs[i] || 0;
    const mm = amounts[i] || 0;
    if (p > maxProb) maxProb = p;
    totalPrecip += mm;

    if (!hasRain && (p >= 30 || mm >= 0.2)) {
      const timeStr = times[i].slice(11, 16);
      nextRainText = `Lluvia estimada a las ${timeStr} h (${p}% prob, ${mm.toFixed(1)} mm)`;
      hasRain = true;
    }
  }

  const badgeClass = !hasRain ? 'badge-green' : maxProb >= 70 ? 'badge-red' : 'badge-amber';
  const pillClass = !hasRain ? 'pill-green' : maxProb >= 70 ? 'pill-red' : 'pill-amber';
  const borderClass = !hasRain ? 'border-green' : maxProb >= 70 ? 'border-red' : 'border-amber';
  const nivelTexto = !hasRain ? 'Seco' : maxProb >= 70 ? 'Lluvia intensa' : 'Lluvia probable';

  const recomendacion = !hasRain
    ? 'Vías secas. Tránsito normal de volquetes y equipos móviles sin restricción por humedad.'
    : maxProb >= 70
      ? 'Pistas resbaladizas y riesgo de taludes: reducir velocidad en ruta y revisar drenajes de tajo.'
      : 'Uso de ropa impermeable de campo y precaución al subir o bajar de equipos pesados.';

  let deduction = 0;
  let severityScore = 0;
  if (maxProb >= 70) { deduction = 20; severityScore = 4; }
  else if (maxProb >= 40) { deduction = 12; severityScore = 3; }
  else if (maxProb >= 20) { deduction = 6; severityScore = 1; }

  ctx.scoreDeductions += deduction;
  if (!hasRain) ctx.safeCount++; else ctx.alertCount++;

  if (severityScore > ctx.highestRisk.severityScore) {
    ctx.highestRisk = {
      title: 'Precipitación pluvial',
      subtitle: nextRainText,
      value: `${maxProb}%`,
      unit: 'prob',
      caption: `${totalPrecip.toFixed(1)} mm en 24 horas`,
      recommendation: recomendacion,
      severityScore
    };
  }

  // Generar micro-histograma interactivo
  let barsHTML = '';
  for (let i = 0; i < Math.min(times.length, 24); i++) {
    const prob = probs[i] || 0;
    const heightPct = Math.max(6, prob);
    const isAlert = prob >= 40;
    const isRain = prob > 0;
    const barClass = isAlert ? 'bar-alert' : isRain ? 'bar-rain' : '';
    barsHTML += `<div class="mini-bar ${barClass}" style="height: ${heightPct}%;" title="${times[i].slice(11, 16)} h: ${prob}% prob"></div>`;
  }

  const card = document.createElement('article');
  card.className = 'risk-card';
  card.innerHTML = `
    <div class="risk-card-top-row">
      <div class="factor-identifier">
        <span class="factor-badge-circle ${badgeClass}">02</span>
        <span class="factor-title">Precipitación y lluvia</span>
      </div>
      <span class="card-external-arrow">&nearr;</span>
    </div>

    <div class="risk-metric-hero-line">
      <div>
        <span class="metric-hero-val">${maxProb}%</span>
        <span class="metric-hero-unit">prob. máxima</span>
      </div>
      <span class="risk-status-pill ${pillClass}">Condición ${nivelTexto.toLowerCase()}</span>
    </div>

    <div class="mini-histogram-chart" title="Probabilidad de lluvia en las próximas 24 horas">
      ${barsHTML}
    </div>

    <div class="control-measure-box ${borderClass}">
      <span class="control-label">Medida de control SST</span>
      <span>${escapeHTML(recomendacion)}</span>
    </div>
  `;
  return card;
}

/**
 * 3. Tarjeta Viento y ráfagas (D.S. 024-2016-EM)
 */
function createWindCard(data, ctx) {
  const currentSpeed = data?.current?.wind_speed_10m ?? 0;
  const currentGust = data?.current?.wind_gusts_10m ?? currentSpeed;

  const currentIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const next12Gusts = data?.hourly?.wind_gusts_10m?.slice(currentIdx, currentIdx + 12) || [];
  const max12hGust = Math.max(currentGust, ...(next12Gusts.length ? next12Gusts : [0]));

  let nivelLabel = 'Normal';
  let badgeClass = 'badge-green';
  let pillClass = 'pill-green';
  let borderClass = 'border-green';
  let deduction = 0;
  let severityScore = 0;
  let recomendacion = 'Vientos calmos. Operaciones de izaje, grúas y trabajos en altura autorizados sin restricción.';

  if (max12hGust > 50) {
    nivelLabel = 'Suspensión obligatoria';
    badgeClass = 'badge-red';
    pillClass = 'pill-red';
    borderClass = 'border-red';
    deduction = 35;
    severityScore = 5;
    recomendacion = 'Parada total de grúas y trabajos en altura conforme a D.S. 024-2016-EM. Descenso de plumas.';
  } else if (max12hGust >= 36) {
    nivelLabel = 'Restricción de izajes';
    badgeClass = 'badge-red';
    pillClass = 'pill-red';
    borderClass = 'border-red';
    deduction = 20;
    severityScore = 4;
    recomendacion = 'Prohibido izaje de cargas de gran área de vela. Evaluación obligatoria con anemómetro en punta de pluma.';
  } else if (max12hGust >= 25) {
    nivelLabel = 'Precaución en izajes';
    badgeClass = 'badge-amber';
    pillClass = 'pill-amber';
    borderClass = 'border-amber';
    deduction = 8;
    severityScore = 2;
    recomendacion = 'Inspección de vientos guía (vientos de cola), estabilizadores de grúas y arneses con barbiquejo.';
  }

  ctx.scoreDeductions += deduction;
  if (severityScore === 0) ctx.safeCount++; else ctx.alertCount++;

  if (severityScore > ctx.highestRisk.severityScore) {
    ctx.highestRisk = {
      title: 'Velocidad del viento',
      subtitle: `${nivelLabel}`,
      value: Math.round(max12hGust),
      unit: 'km/h',
      caption: `Sostenido: ${Math.round(currentSpeed)} km/h &bull; Ráfaga: ${Math.round(max12hGust)} km/h`,
      recommendation: recomendacion,
      severityScore
    };
  }

  const card = document.createElement('article');
  card.className = 'risk-card';
  card.innerHTML = `
    <div class="risk-card-top-row">
      <div class="factor-identifier">
        <span class="factor-badge-circle ${badgeClass}">03</span>
        <span class="factor-title">Velocidad del viento</span>
      </div>
      <span class="card-external-arrow">&nearr;</span>
    </div>

    <div class="risk-metric-hero-line">
      <div>
        <span class="metric-hero-val">${Math.round(max12hGust)}</span>
        <span class="metric-hero-unit">km/h ráfaga</span>
      </div>
      <span class="risk-status-pill ${pillClass}">${nivelLabel}</span>
    </div>

    <div class="control-measure-box ${borderClass}">
      <span class="control-label">Norma D.S. 024-2016-EM / Izajes</span>
      <span>${escapeHTML(recomendacion)}</span>
    </div>
  `;
  return card;
}

/**
 * 4. Tarjeta Tormenta eléctrica y energía convectiva (CAPE)
 */
function createThunderstormCard(data, ctx) {
  const currentIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const times = data?.hourly?.time?.slice(currentIdx, currentIdx + 24) || [];
  const capes = data?.hourly?.cape?.slice(currentIdx, currentIdx + 24) || [];
  const weatherCodes = data?.hourly?.weather_code?.slice(currentIdx, currentIdx + 24) || [];

  const currentCape = capes[0] || 0;
  const maxCape = Math.max(currentCape, ...(capes.slice(0, 12).length ? capes.slice(0, 12) : [0]));

  let level = 'BAJO';
  if (maxCape > 2500) {
    level = 'MUY_ALTO';
  } else if (maxCape >= 1500) {
    level = 'ALTO';
  } else if (maxCape >= 500) {
    level = 'MODERADO';
  }

  let capeRule = UMBRALES_CAPE[level];
  let stormDetected = false;
  let estimatedStormTime = null;

  for (let i = 0; i < weatherCodes.length; i++) {
    if (WEATHER_CODES_TORMENTA.includes(weatherCodes[i])) {
      stormDetected = true;
      estimatedStormTime = times[i] ? times[i].slice(11, 16) : null;
      break;
    }
  }

  let nivelLabel = capeRule.nivel;
  let recomendacion = capeRule.recomendacion;
  let badgeClass = 'badge-green';
  let pillClass = 'pill-green';
  let borderClass = 'border-green';
  let deduction = 0;
  let severityScore = 0;

  if (stormDetected) {
    badgeClass = 'badge-red';
    pillClass = 'pill-red';
    borderClass = 'border-red';
    nivelLabel = 'Tormenta prevista';
    deduction = 35;
    severityScore = 5;
    const horaMsg = estimatedStormTime ? ` a las ${estimatedStormTime} h.` : '.';
    recomendacion = `Tormenta eléctrica prevista aprox.${horaMsg} Activar detector de rayos y preparar repliegue a refugio seguro.`;
  } else if (level === 'MUY_ALTO') {
    badgeClass = 'badge-red';
    pillClass = 'pill-red';
    borderClass = 'border-red';
    deduction = 22;
    severityScore = 4;
  } else if (level === 'ALTO') {
    badgeClass = 'badge-amber';
    pillClass = 'pill-amber';
    borderClass = 'border-amber';
    deduction = 14;
    severityScore = 3;
  } else if (level === 'MODERADO') {
    badgeClass = 'badge-amber';
    pillClass = 'pill-amber';
    borderClass = 'border-amber';
    deduction = 6;
    severityScore = 1;
  }

  ctx.scoreDeductions += deduction;
  if (severityScore === 0) ctx.safeCount++; else ctx.alertCount++;

  if (severityScore > ctx.highestRisk.severityScore) {
    ctx.highestRisk = {
      title: 'Potencial de tormenta',
      subtitle: stormDetected ? `Prevista a las ${estimatedStormTime || '--:--'} h` : `Energía CAPE ${Math.round(maxCape)} J/kg`,
      value: Math.round(maxCape),
      unit: 'J/kg',
      caption: stormDetected ? 'Alerta WMO por descargas' : 'Sin descargas activas en radio de 10 km',
      recommendation: recomendacion,
      severityScore
    };
  }

  const card = document.createElement('article');
  card.className = 'risk-card';
  card.innerHTML = `
    <div class="risk-card-top-row">
      <div class="factor-identifier">
        <span class="factor-badge-circle ${badgeClass}">04</span>
        <span class="factor-title">Potencial de tormenta</span>
      </div>
      <span class="card-external-arrow">&nearr;</span>
    </div>

    <div class="risk-metric-hero-line">
      <div>
        <span class="metric-hero-val">${Math.round(maxCape)}</span>
        <span class="metric-hero-unit">J/kg CAPE</span>
      </div>
      <span class="risk-status-pill ${pillClass}">${nivelLabel}</span>
    </div>

    <div class="control-measure-box ${borderClass}">
      <span class="control-label">Protocolo de tormenta eléctrica</span>
      <span>${escapeHTML(recomendacion)}</span>
    </div>
  `;
  return card;
}

/**
 * Tarjeta de contingencia
 */
function createErrorCard(title) {
  const card = document.createElement('article');
  card.className = 'risk-card';
  card.innerHTML = `
    <div class="risk-card-top-row">
      <div class="factor-identifier">
        <span class="factor-badge-circle badge-amber">!</span>
        <span class="factor-title">${escapeHTML(title)}</span>
      </div>
    </div>
    <div class="control-measure-box border-amber">
      <span>Dato no disponible temporalmente. Verificando sensores.</span>
    </div>
  `;
  return card;
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
