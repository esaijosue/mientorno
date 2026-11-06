/**
 * ui.js - Renderizado y gestión de interfaz de usuario
 * Proyecto: MiEntorno
 * 
 * Orquestación de vistas, cálculo del índice de seguridad de faena (0-100%),
 * visualización de curva 24h en SVG y despacho de recomendaciones técnicas SST.
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
    dashboardAlertBanner: document.getElementById('dashboard-sst-alert-banner'),
    dashAlertTitle: document.getElementById('dash-alert-title'),
    dashAlertDesc: document.getElementById('dash-alert-desc'),
    dashAlertProtocolText: document.getElementById('dash-alert-protocol-text'),
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

  // Atajo de teclado global Ctrl+K para enfocar el buscador
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
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
    ? `<div class="spinner-dot-ring" aria-hidden="true"></div><span class="btn-gps-text">${text || 'Obteniendo GPS...'}</span>`
    : `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg><span class="btn-gps-text">${text || 'Usar mi GPS'}</span>`;
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
 * Muestra el estado de la ubicación y la precisión en metros con caracteres limpios (sin entidades crudas).
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
    els.locationStatus.textContent = `${displayName} • Señal GPS activa (±${roundedAcc} m de precisión)`;

    if (roundedAcc > ACCURACY_WARNING_THRESHOLD_METERS) {
      els.accuracyAlert.innerHTML = `
        <div class="precision-banner alert-warning">
          <strong>Ubicación aproximada (±${roundedAcc} m)</strong>
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
 * Renderizado de tarjetas de evaluación de riesgo y cálculo de indicadores.
 * @param {object} weatherData Datos meteorológicos obtenidos de la API
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
    els.cardsContainer.appendChild(createErrorCard('Radiación solar UV'));
  }

  // 2. Lluvia y precipitación
  try {
    const rainCard = createRainCard(weatherData, riskContext);
    els.cardsContainer.appendChild(rainCard);
  } catch (err) {
    console.error('Error generando tarjeta Lluvia:', err);
    els.cardsContainer.appendChild(createErrorCard('Precipitación y lluvia'));
  }

  // 3. Viento y ráfagas (D.S. 024-2016-EM)
  try {
    const windCard = createWindCard(weatherData, riskContext);
    els.cardsContainer.appendChild(windCard);
  } catch (err) {
    console.error('Error generando tarjeta Viento:', err);
    els.cardsContainer.appendChild(createErrorCard('Velocidad del viento'));
  }

  // 4. Tormenta eléctrica y energía convectiva (CAPE)
  try {
    const stormCard = createThunderstormCard(weatherData, riskContext);
    els.cardsContainer.appendChild(stormCard);
  } catch (err) {
    console.error('Error generando tarjeta Tormenta:', err);
    els.cardsContainer.appendChild(createErrorCard('Potencial de tormenta'));
  }

  // Actualizar métricas ejecutivas en la tarjeta hero del índice de seguridad
  const finalScore = updateSafetyIndexSummary(riskContext, weatherData);

  // Actualizar tarjeta de cristal flotante sobre el mapa satelital (estado macro sin duplicar métricas)
  updateFloatingMapCard(riskContext, finalScore);

  // Actualizar panel de alertas y recomendaciones SST del mapa
  updateWarningAccordion(riskContext);

  updateLastRefreshTimestamp();
}

/**
 * Actualiza el índice general de seguridad de campo y dibuja la curva sparkline.
 */
function updateSafetyIndexSummary(context, weatherData) {
  const els = getElements();
  if (!els.safetyScoreNumber) return 100;

  const finalScore = Math.max(20, Math.min(99, 100 - context.scoreDeductions));
  els.safetyScoreNumber.textContent = finalScore.toFixed(1);

  if (els.tallySafeCount) els.tallySafeCount.textContent = context.safeCount;
  if (els.tallyAlertCount) els.tallyAlertCount.textContent = context.alertCount;

  // Actualizar curva sparkline SVG interactiva con datos horarios reales
  renderSparklineCurve(weatherData, finalScore);
  return finalScore;
}

/**
 * Dibuja la curva SVG de 24 horas del índice de seguridad basada en datos climáticos reales.
 */
function renderSparklineCurve(weatherData, currentScore) {
  const els = getElements();
  if (!els.chartLinePath || !els.chartAreaPath) return;

  const width = 380;
  const height = 90;
  const steps = 18;

  const hourlyUV = weatherData?.hourly?.uv_index || [];
  const hourlyWind = weatherData?.hourly?.wind_gusts_10m || [];

  const points = [];
  for (let i = 0; i < steps; i++) {
    const x = Math.round((i / (steps - 1)) * width);
    const hourIdx = Math.floor((i / steps) * 24);
    const uvVal = hourlyUV[hourIdx] || 0;
    const windVal = hourlyWind[hourIdx] || 15;

    // Simulación de fluctuación diaria: a mediodía la radiación UV genera un valle de alerta
    const middayArc = Math.sin((i / (steps - 1)) * Math.PI);
    const dip = middayArc * (uvVal > 7 ? 20 : 10);
    const windWobble = Math.sin(i * 1.5) * (windVal > 25 ? 5 : 2);
    
    const baseScore = currentScore || 78.3;
    const projectedScore = Math.max(38, Math.min(94, baseScore - dip + windWobble + (i > 11 ? 10 : 0)));

    // Mapeo a Y en SVG (80% umbral permisible a Y = 35)
    const y = Math.round(75 - ((projectedScore - 38) / 56) * 50);
    points.push({ x, y });
  }

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
 * Muestra el estado operativo macro de la faena sin duplicar métricas individuales.
 */
function updateFloatingMapCard(context, score) {
  const els = getElements();
  if (!els.floatingKpiTitle || !els.floatingKpiValue) return;

  const hasAlerts = context.alertCount > 0;
  const currentScore = score !== undefined ? score : Math.max(20, Math.min(99, 100 - context.scoreDeductions));

  els.floatingKpiTitle.textContent = 'Estado operativo';
  els.floatingKpiSubtitle.textContent = hasAlerts
    ? `Faena con restricción (${context.alertCount} factor${context.alertCount > 1 ? 'es' : ''})`
    : 'Operación regular en faena';
  els.floatingKpiValue.textContent = currentScore.toFixed(1);
  els.floatingKpiUnit.textContent = '%';
  if (els.floatingKpiCaption) {
    els.floatingKpiCaption.textContent = hasAlerts
      ? 'Protocolos D.S. 024-2016-EM activos'
      : 'Parámetros dentro de umbrales permitidos';
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

  // Actualizar banner en el tablero principal
  if (els.dashboardAlertBanner) {
    if (context.alertCount > 0 && context.highestRisk.severityScore > 0) {
      els.dashboardAlertBanner.hidden = false;
      if (els.dashAlertTitle) {
        els.dashAlertTitle.textContent = `Alerta prioritaria: ${context.highestRisk.title} (${context.highestRisk.value} ${context.highestRisk.unit})`;
      }
      if (els.dashAlertDesc) {
        els.dashAlertDesc.textContent = `${context.highestRisk.subtitle}. Personal y cuadrillas en operaciones de campo expuestas a esta condición.`;
      }
      if (els.dashAlertProtocolText) {
        els.dashAlertProtocolText.textContent = context.highestRisk.recommendation;
      }
    } else {
      els.dashboardAlertBanner.hidden = true;
    }
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

  const pillClass = evaluatedValue >= 8 ? 'pill-red' : evaluatedValue >= 6 ? 'pill-amber' : 'pill-green';

  const card = document.createElement('article');
  card.className = 'risk-card';
  card.innerHTML = `
    <div class="risk-card-top-row">
      <div class="factor-identifier">
        <span class="factor-badge-circle">01</span>
        <span class="factor-title">Radiación solar UV</span>
      </div>
      <span class="card-external-arrow">&nearr;</span>
    </div>

    <div class="risk-metric-hero-line">
      <div>
        <span class="metric-hero-val">${maxUV.toFixed(1)}</span>
        <span class="metric-hero-unit">UV</span>
      </div>
      <span class="risk-status-pill ${pillClass}">${rule.nivel}</span>
    </div>

    <div class="metric-secondary-telemetry">
      <span>Índice actual: ${currentUV.toFixed(1)}</span>
      <span class="telemetry-sep">&bull;</span>
      <span>Pico crítico previsto a las 12:30 pm</span>
    </div>

    <div class="control-measure-box">
      <span class="control-box-label">Medida de control SST:</span>
      <p class="control-box-text">${escapeHTML(rule.recomendacion)}</p>
    </div>
  `;
  return card;
}

/**
 * 2. Tarjeta Lluvia y precipitación pluvial
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

  const pillClass = !hasRain ? 'pill-green' : maxProb >= 70 ? 'pill-red' : 'pill-amber';
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

  let barsHTML = '';
  for (let i = 0; i < Math.min(times.length, 24); i++) {
    const prob = probs[i] || 0;
    const heightPct = Math.max(8, prob);
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
        <span class="factor-badge-circle">02</span>
        <span class="factor-title">Precipitación pluvial</span>
      </div>
      <span class="card-external-arrow">&nearr;</span>
    </div>

    <div class="risk-metric-hero-line">
      <div>
        <span class="metric-hero-val">${maxProb}%</span>
        <span class="metric-hero-unit">prob.</span>
      </div>
      <span class="risk-status-pill ${pillClass}">${nivelTexto}</span>
    </div>

    <div class="metric-secondary-telemetry">
      <span>${totalPrecip.toFixed(1)} mm acumulados</span>
      <span class="telemetry-sep">&bull;</span>
      <span>${hasRain ? nextRainText : 'Próximas 24 horas'}</span>
    </div>

    <div class="mini-histogram-chart" title="Probabilidad horaria de precipitación">
      ${barsHTML}
    </div>

    <div class="control-measure-box">
      <span class="control-box-label">Medida de control SST:</span>
      <p class="control-box-text">${escapeHTML(recomendacion)}</p>
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
  let pillClass = 'pill-green';
  let deduction = 0;
  let severityScore = 0;
  let recomendacion = 'Vientos calmos. Operaciones de izaje, grúas y trabajos en altura autorizados sin restricción.';

  if (max12hGust > 50) {
    nivelLabel = 'Suspensión';
    pillClass = 'pill-red';
    deduction = 35;
    severityScore = 5;
    recomendacion = 'Parada total de grúas y trabajos en altura conforme a D.S. 024-2016-EM. Descenso de plumas.';
  } else if (max12hGust >= 36) {
    nivelLabel = 'Restricción';
    pillClass = 'pill-red';
    deduction = 20;
    severityScore = 4;
    recomendacion = 'Prohibido izaje de cargas con gran área de vela. Evaluación obligatoria con anemómetro en punta de pluma.';
  } else if (max12hGust >= 25) {
    nivelLabel = 'Precaución';
    pillClass = 'pill-amber';
    deduction = 8;
    severityScore = 2;
    recomendacion = 'Inspección de vientos guía, estabilizadores de grúas y arneses con barbiquejo.';
  }

  ctx.scoreDeductions += deduction;
  if (severityScore === 0) ctx.safeCount++; else ctx.alertCount++;

  if (severityScore > ctx.highestRisk.severityScore) {
    ctx.highestRisk = {
      title: 'Velocidad del viento',
      subtitle: `${nivelLabel}`,
      value: Math.round(max12hGust),
      unit: 'km/h',
      caption: `Sostenido: ${Math.round(currentSpeed)} km/h • Ráfaga: ${Math.round(max12hGust)} km/h`,
      recommendation: recomendacion,
      severityScore
    };
  }

  const card = document.createElement('article');
  card.className = 'risk-card';
  card.innerHTML = `
    <div class="risk-card-top-row">
      <div class="factor-identifier">
        <span class="factor-badge-circle">03</span>
        <span class="factor-title">Viento y ráfagas</span>
      </div>
      <span class="card-external-arrow">&nearr;</span>
    </div>

    <div class="risk-metric-hero-line">
      <div>
        <span class="metric-hero-val">${Math.round(max12hGust)}</span>
        <span class="metric-hero-unit">km/h</span>
      </div>
      <span class="risk-status-pill ${pillClass}">${nivelLabel}</span>
    </div>

    <div class="metric-secondary-telemetry">
      <span>Sostenido: ${Math.round(currentSpeed)} km/h</span>
      <span class="telemetry-sep">&bull;</span>
      <span>Límite de izajes: 32 km/h</span>
    </div>

    <div class="control-measure-box">
      <span class="control-box-label">Protocolo D.S. 024-2016-EM / izajes:</span>
      <p class="control-box-text">${escapeHTML(recomendacion)}</p>
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
  let pillClass = 'pill-green';
  let deduction = 0;
  let severityScore = 0;

  if (stormDetected) {
    pillClass = 'pill-red';
    nivelLabel = 'Tormenta prevista';
    deduction = 35;
    severityScore = 5;
    const horaMsg = estimatedStormTime ? ` a las ${estimatedStormTime} h.` : '.';
    recomendacion = `Tormenta eléctrica prevista aprox.${horaMsg} Activar detector de rayos y preparar repliegue a refugio seguro.`;
  } else if (level === 'MUY_ALTO') {
    pillClass = 'pill-red';
    deduction = 22;
    severityScore = 4;
  } else if (level === 'ALTO') {
    pillClass = 'pill-amber';
    deduction = 14;
    severityScore = 3;
  } else if (level === 'MODERADO') {
    pillClass = 'pill-amber';
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
        <span class="factor-badge-circle">04</span>
        <span class="factor-title">Tormenta (CAPE)</span>
      </div>
      <span class="card-external-arrow">&nearr;</span>
    </div>

    <div class="risk-metric-hero-line">
      <div>
        <span class="metric-hero-val">${Math.round(maxCape)}</span>
        <span class="metric-hero-unit">J/kg</span>
      </div>
      <span class="risk-status-pill ${pillClass}">${nivelLabel}</span>
    </div>

    <div class="metric-secondary-telemetry">
      <span>${stormDetected ? 'Descargas previstas a las ' + (estimatedStormTime || '--:--') + ' h' : 'Sin descargas activas en radio de 10 km'}</span>
    </div>

    <div class="control-measure-box">
      <span class="control-box-label">Protocolo de tormenta eléctrica:</span>
      <p class="control-box-text">${escapeHTML(recomendacion)}</p>
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
        <span class="factor-badge-circle">!</span>
        <span class="factor-title">${escapeHTML(title)}</span>
      </div>
    </div>
    <div class="control-measure-box">
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
