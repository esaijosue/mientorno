import {
  APP_NAME,
  ACCURACY_WARNING_THRESHOLD_METERS,
  REGLAS_UV,
  UMBRALES_VIENTO,
  UMBRALES_CAPE,
  WEATHER_CODES_TORMENTA,
  UMBRALES_TEMPERATURA,
  UMBRALES_NIEVE,
  UMBRALES_VISIBILIDAD,
  UMBRALES_SUELO
} from './reglas.js';

let elements = {};
let currentForecastHorizon = 0;
let cachedWeatherData = null;

const RELIABILITY_BY_HORIZON = {
  0: { score: '98%', desc: 'Telemetría instantánea y Nowcasting (OMM)', level: 'rel-high' },
  0.5: { score: '95%', desc: 'Alta resolución 15 min (Maniobras críticas)', level: 'rel-high' },
  1: { score: '92%', desc: 'Nowcasting táctico de corto plazo', level: 'rel-high' },
  3: { score: '88%', desc: 'Previsión de frentes dinámicos', level: 'rel-medium' },
  9: { score: '82%', desc: 'Jornada laboral diurna (ECMWF IFS)', level: 'rel-medium' },
  12: { score: '78%', desc: 'Turno de faena 12x12 (Estándar SST)', level: 'rel-standard' },
  24: { score: '72%', desc: 'Ciclo circadiano y relevo diario', level: 'rel-standard' }
};

export function updateReliabilityBanner(horizon = currentForecastHorizon) {
  const rel = RELIABILITY_BY_HORIZON[horizon] || RELIABILITY_BY_HORIZON[0];
  const els = getElements();
  if (els.reliabilityScore) {
    els.reliabilityScore.textContent = rel.score;
  }
  if (els.reliabilityDesc) {
    els.reliabilityDesc.textContent = rel.desc;
  }
  if (els.modelReliabilityBanner) {
    els.modelReliabilityBanner.classList.remove('rel-high', 'rel-medium', 'rel-standard');
    els.modelReliabilityBanner.classList.add(rel.level);
  }
}

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
    modelReliabilityBanner: document.getElementById('model-reliability-banner'),
    reliabilityScore: document.getElementById('reliability-score'),
    reliabilityDesc: document.getElementById('reliability-desc'),
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
    dockBtnGps: document.getElementById('dock-btn-gps')
  };

  updateReliabilityBanner(currentForecastHorizon);

  if (elements.accordionToggleBtn && elements.warningAccordion) {
    elements.accordionToggleBtn.addEventListener('click', () => {
      elements.warningAccordion.classList.toggle('collapsed');
    });
  }

  const horizonButtons = document.querySelectorAll('.horizon-btn');
  horizonButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const h = parseFloat(btn.dataset.horizon);
      if (isNaN(h) || currentForecastHorizon === h) return;
      currentForecastHorizon = h;
      horizonButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if (cachedWeatherData) {
        renderRiskCards(cachedWeatherData, currentForecastHorizon);
      }
    });
  });

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

export function setLocationButtonLoading(isLoading, text = null) {
  const btn = getElements().btnLocation;
  if (!btn) return;
  btn.disabled = isLoading;
  btn.innerHTML = isLoading
    ? `<div class="spinner-dot-ring" aria-hidden="true"></div><span class="btn-gps-text">${text || 'Obteniendo GPS...'}</span>`
    : `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg><span class="btn-gps-text">${text || 'Usar mi GPS'}</span>`;
}

export function setRefreshButtonLoading(isRefreshing) {
  const btn = getElements().btnRefresh;
  if (!btn) return;
  btn.disabled = isRefreshing;
  btn.classList.toggle('spinning', isRefreshing);
}

export function updateLastRefreshTimestamp() {
  const timeEl = getElements().lastUpdated;
  if (!timeEl) return;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  timeEl.textContent = `Actualizado ${timeStr}`;
}

export function updateLocationInfo(lat, lon, accuracy, source = 'gps', placeName = null) {
  const els = getElements();
  if (!els.locationStatus) return;

  if (els.coordsDisplay) {
    els.coordsDisplay.textContent = `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;
  }

  const coordStr = `${lat >= 0 ? '+' : ''}${lat.toFixed(2)}°, ${lon >= 0 ? '+' : ''}${lon.toFixed(2)}°`;
  const displayName = placeName || coordStr;

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
          : `Frente operativo (${displayName})`;

    els.locationStatus.textContent = label;
    els.accuracyAlert.hidden = true;
  }
}

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

export function hideSearchResults() {
  const listEl = getElements().searchResults;
  if (listEl) {
    listEl.hidden = true;
  }
}

export function renderRiskCards(weatherData, horizon = currentForecastHorizon) {
  if (weatherData) {
    cachedWeatherData = weatherData;
  }
  const data = weatherData || cachedWeatherData;

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

  try {
    els.cardsContainer.appendChild(createUVCard(data, riskContext, horizon));
  } catch (err) {
    console.error('Error generando tarjeta UV:', err);
    els.cardsContainer.appendChild(createErrorCard('Radiación solar UV'));
  }

  try {
    els.cardsContainer.appendChild(createRainCard(data, riskContext, horizon));
  } catch (err) {
    console.error('Error generando tarjeta Lluvia:', err);
    els.cardsContainer.appendChild(createErrorCard('Precipitación pluvial'));
  }

  try {
    els.cardsContainer.appendChild(createWindCard(data, riskContext, horizon));
  } catch (err) {
    console.error('Error generando tarjeta Viento:', err);
    els.cardsContainer.appendChild(createErrorCard('Velocidad del viento'));
  }

  try {
    els.cardsContainer.appendChild(createThunderstormCard(data, riskContext, horizon));
  } catch (err) {
    console.error('Error generando tarjeta Tormenta:', err);
    els.cardsContainer.appendChild(createErrorCard('Tormenta eléctrica'));
  }

  try {
    els.cardsContainer.appendChild(createTemperatureCard(data, riskContext, horizon));
  } catch (err) {
    console.error('Error generando tarjeta Temperatura:', err);
    els.cardsContainer.appendChild(createErrorCard('Estrés térmico'));
  }

  try {
    els.cardsContainer.appendChild(createSnowCard(data, riskContext, horizon));
  } catch (err) {
    console.error('Error generando tarjeta Nieve:', err);
    els.cardsContainer.appendChild(createErrorCard('Nieve y congelamiento'));
  }

  try {
    els.cardsContainer.appendChild(createVisibilityCard(data, riskContext, horizon));
  } catch (err) {
    console.error('Error generando tarjeta Visibilidad:', err);
    els.cardsContainer.appendChild(createErrorCard('Visibilidad en ruta'));
  }

  try {
    els.cardsContainer.appendChild(createSoilCard(data, riskContext, horizon));
  } catch (err) {
    console.error('Error generando tarjeta Suelo:', err);
    els.cardsContainer.appendChild(createErrorCard('Humedad de suelo'));
  }

  const finalScore = updateSafetyIndexSummary(riskContext, data);
  updateFloatingMapCard(riskContext, finalScore);
  updateWarningAccordion(riskContext);
  updateReliabilityBanner(horizon);
  updateLastRefreshTimestamp();
}

function updateSafetyIndexSummary(context, weatherData) {
  const els = getElements();
  if (!els.safetyScoreNumber) return 100;

  const finalScore = Math.max(20, Math.min(99, 100 - context.scoreDeductions));
  els.safetyScoreNumber.textContent = finalScore.toFixed(1);

  if (els.tallySafeCount) els.tallySafeCount.textContent = context.safeCount;
  if (els.tallyAlertCount) els.tallyAlertCount.textContent = context.alertCount;

  renderSparklineCurve(weatherData, finalScore);
  return finalScore;
}

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

    const middayArc = Math.sin((i / (steps - 1)) * Math.PI);
    const dip = middayArc * (uvVal > 7 ? 20 : 10);
    const windWobble = Math.sin(i * 1.5) * (windVal > 25 ? 5 : 2);

    const baseScore = currentScore || 78.3;
    const projectedScore = Math.max(38, Math.min(94, baseScore - dip + windWobble + (i > 11 ? 10 : 0)));

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

  if (els.dashboardAlertBanner) {
    if (context.alertCount > 0 && context.highestRisk.severityScore > 0) {
      els.dashboardAlertBanner.hidden = false;
      els.dashboardAlertBanner.style.display = 'flex';
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
      els.dashboardAlertBanner.style.display = 'none';
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

export function formatHorizonBadge(h) {
  if (h === 0) return 'Ahora';
  if (h === 0.5) return '30m';
  return `${h}h`;
}

function getSeriesForHorizon(data, key, horizonHours) {
  const currentTimeStr = data?.current?.time;

  if (horizonHours === 0) {
    let currentVal = data?.current?.[key];
    if (currentVal === undefined) {
      const curIdx = getCurrentHourIndex(data?.hourly?.time, currentTimeStr);
      currentVal = data?.hourly?.[key]?.[curIdx];
    }
    return {
      times: [currentTimeStr || ''],
      values: currentVal !== undefined ? [currentVal] : []
    };
  }

  if (horizonHours <= 1 && data?.minutely_15?.[key] && Array.isArray(data?.minutely_15?.time)) {
    const times = data.minutely_15.time;
    const values = data.minutely_15[key];
    const prefix = currentTimeStr ? currentTimeStr.slice(0, 16) : '';
    let startIdx = times.findIndex((t) => t >= prefix);
    if (startIdx === -1) startIdx = 0;

    const count = Math.max(1, Math.round(horizonHours * 4));
    return {
      times: times.slice(startIdx, startIdx + count),
      values: values.slice(startIdx, startIdx + count)
    };
  }

  const times = data?.hourly?.time || [];
  const values = data?.hourly?.[key] || [];
  const currentPrefix = currentTimeStr ? currentTimeStr.slice(0, 13) : '';
  let startIdx = times.findIndex((t) => t.startsWith(currentPrefix));
  if (startIdx === -1) startIdx = 0;

  const count = Math.max(1, Math.round(horizonHours));
  return {
    times: times.slice(startIdx, startIdx + count),
    values: values.slice(startIdx, startIdx + count)
  };
}

function createUVCard(data, ctx, horizon = 0) {
  const isRealTime = (horizon === 0);
  const currentHourIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const currentUV = data?.hourly?.uv_index ? (data.hourly.uv_index[currentHourIdx] ?? 0) : 0;
  const dailyMaxUV = data?.daily?.uv_index_max?.[0] ?? currentUV;
  const badgeText = formatHorizonBadge(horizon);
  const horizonTitle = horizon === 0.5 ? '30 minutos' : `${horizon} horas`;

  const uvSeries = getSeriesForHorizon(data, 'uv_index', horizon);
  const horizonUV = uvSeries.values;
  const times = uvSeries.times;

  let peakUV = currentUV;
  let peakTimeStr = null;
  for (let i = 0; i < horizonUV.length; i++) {
    const val = horizonUV[i] || 0;
    if (val > peakUV) {
      peakUV = val;
      if (times[i]) peakTimeStr = times[i].slice(11, 16);
    }
  }

  // En tiempo real evalúa el momento presente; en proyección evalúa el pico máximo de esa ventana horaria
  const evalUV = isRealTime ? currentUV : peakUV;
  const isNight = isRealTime ? (currentUV < 0.2) : (peakUV < 0.2);

  let deduction = 0;
  let severityScore = 0;
  let rule;

  if (isNight) {
    rule = {
      nivel: 'Noche',
      badge: 'Noche',
      recomendacion: isRealTime
        ? 'Sin radiación solar UV durante el turno nocturno. No se requiere fotoprotector en horas de oscuridad.'
        : 'Ventana de proyección durante horario nocturno. Sin radiación solar ultravioleta.'
    };
  } else {
    rule = REGLAS_UV.find((r) => evalUV >= r.min && evalUV <= r.max) || REGLAS_UV[0];
    if (evalUV >= 11) { deduction = 25; severityScore = 5; }
    else if (evalUV >= 8) { deduction = 18; severityScore = 4; }
    else if (evalUV >= 6) { deduction = 10; severityScore = 3; }
  }

  ctx.scoreDeductions += deduction;
  if (severityScore === 0) ctx.safeCount++; else ctx.alertCount++;

  const pillClass = isNight ? 'pill-green' : evalUV >= 8 ? 'pill-red' : evalUV >= 6 ? 'pill-amber' : 'pill-green';
  const displayVal = isNight ? '0.0' : evalUV.toFixed(1);
  const statusLabel = isNight ? 'Noche' : rule.nivel;

  if (!isNight && severityScore > ctx.highestRisk.severityScore) {
    ctx.highestRisk = {
      title: 'Radiación solar UV',
      subtitle: `Nivel ${rule.nivel.toLowerCase()}`,
      value: evalUV.toFixed(1),
      unit: 'UVI',
      caption: isRealTime ? `Pico del día: ${dailyMaxUV.toFixed(1)} UVI` : `Pico previsto: ${peakUV.toFixed(1)} UVI`,
      recommendation: rule.recomendacion,
      severityScore
    };
  }

  const hasAlert = !isNight && severityScore > 0;
  const cardClass = hasAlert ? (severityScore >= 4 ? 'risk-card card-alert' : 'risk-card card-warning') : 'risk-card';

  const controlBoxHTML = `
    <div class="control-measure-box">
      <span class="control-box-label">Control SST (Protección solar / OMS):</span>
      <p class="control-box-text">${escapeHTML(rule.recomendacion)}</p>
    </div>
  `;

  const secondaryText = isNight
    ? (isRealTime ? 'Turno nocturno &bull; Sin exposición solar actínica' : `Ventana nocturna &bull; 0.0 UVI (${badgeText})`)
    : (isRealTime
        ? `Sensor en faena &bull; Exposición solar directa`
        : `Pico solar a las ${peakTimeStr || '12:00'} h &bull; Turno proyectado ${badgeText}`);

  const badgeHTML = isRealTime
    ? `<div class="metric-projection-badge" title="Pico máximo diurno previsto hoy"><span class="projection-label">Máx hoy:</span><span class="projection-val">${dailyMaxUV.toFixed(1)} UVI</span></div>`
    : `<div class="metric-projection-badge" title="Pico máximo en ${horizonTitle}"><span class="projection-label">Pico ${badgeText}:</span><span class="projection-val">${peakUV.toFixed(1)} UVI</span></div>`;

  const card = document.createElement('article');
  card.className = cardClass;
  card.innerHTML = `
    <div class="risk-card-top-row">
      <div class="factor-identifier">
        <span class="factor-badge-circle">01</span>
        <span class="factor-title">Radiación solar UV</span>
      </div>
      <span class="risk-status-pill ${pillClass}">${statusLabel}</span>
    </div>

    <div class="risk-metric-hero-line">
      <div class="metric-main-group">
        <span class="metric-hero-val">${displayVal}</span>
        <span class="metric-hero-unit">${isRealTime ? 'UVI' : 'UVI máx'}</span>
      </div>
      ${badgeHTML}
    </div>

    <div class="metric-secondary-telemetry">
      <span>${secondaryText}</span>
    </div>

    ${controlBoxHTML}
  `;
  return card;
}

function createRainCard(data, ctx, horizon = 0) {
  const isRealTime = (horizon === 0);
  const currentPrecip = data?.current?.precipitation ?? 0;
  const currentHourIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const currentProb = data?.hourly?.precipitation_probability?.[currentHourIdx] ?? 0;
  const badgeText = formatHorizonBadge(horizon);
  const horizonTitle = horizon === 0.5 ? '30 minutos' : `${horizon} horas`;

  let nivelTexto = 'Seco';
  let pillClass = 'pill-green';
  let deduction = 0;
  let severityScore = 0;
  let recomendacion = 'Vías secas. Tránsito normal de volquetes y equipos móviles sin restricción por humedad.';
  let secondaryHTML = '';
  let badgeHTML = '';
  let heroVal = '0.0';
  let heroUnit = 'mm/h';
  let barsHTML = '';

  if (isRealTime) {
    heroVal = currentPrecip.toFixed(1);
    heroUnit = 'mm/h actual';
    badgeHTML = `<div class="metric-projection-badge" title="Probabilidad de lluvia actual"><span class="projection-label">Probabilidad:</span><span class="projection-val">${currentProb}%</span></div>`;
    secondaryHTML = `<span>${currentPrecip > 0 ? 'Precipitación activa sobre faena' : 'Calzada seca &bull; Sin lluvia actual'}</span>`;

    if (currentPrecip >= 5) {
      nivelTexto = 'Lluvia intensa';
      pillClass = 'pill-red';
      deduction = 20;
      severityScore = 4;
      recomendacion = 'Pistas resbaladizas y riesgo de taludes: reducir velocidad en ruta y revisar drenajes de tajo.';
    } else if (currentPrecip >= 1) {
      nivelTexto = 'Lluvia moderada';
      pillClass = 'pill-amber';
      deduction = 10;
      severityScore = 2;
      recomendacion = 'Uso de ropa impermeable de campo y precaución al subir o bajar de equipos pesados.';
    } else if (currentPrecip > 0) {
      nivelTexto = 'Llovizna';
      pillClass = 'pill-amber';
      deduction = 5;
      severityScore = 1;
      recomendacion = 'Supervisar adherencia de neumáticos en haul roads y accesos.';
    }
  } else {
    const probSeries = getSeriesForHorizon(data, 'precipitation_probability', horizon);
    const amountSeries = getSeriesForHorizon(data, 'precipitation', horizon);
    const times = probSeries.times;
    const probs = probSeries.values;
    const amounts = amountSeries.values;

    let nextRainText = `Sin precipitaciones en las próximas ${horizonTitle}.`;
    let hasRain = false;
    let maxProb = 0;
    let totalPrecip = 0;

    for (let i = 0; i < times.length; i++) {
      const p = probs[i] || 0;
      const mm = amounts[i] || 0;
      if (p > maxProb) maxProb = p;
      totalPrecip += mm;

      if (!hasRain && (p >= 30 || mm >= 0.2)) {
        const timeStr = times[i] ? times[i].slice(11, 16) : '';
        nextRainText = `Lluvia estimada a las ${timeStr} h (${p}%, ${mm.toFixed(1)} mm)`;
        hasRain = true;
      }
    }

    heroVal = `${maxProb}%`;
    heroUnit = 'prob. máx';
    badgeHTML = `<div class="metric-projection-badge" title="Acumulado estimado en ${horizonTitle}"><span class="projection-label">${badgeText}:</span><span class="projection-val">${totalPrecip.toFixed(1)} mm</span></div>`;
    secondaryHTML = `<span>Actual: ${currentPrecip.toFixed(1)} mm/h</span><span class="telemetry-sep">&bull;</span><span>${hasRain ? nextRainText : 'Sin lluvia prevista'}</span>`;

    pillClass = (!hasRain && currentPrecip === 0) ? 'pill-green' : (maxProb >= 70 || totalPrecip >= 5) ? 'pill-red' : 'pill-amber';
    nivelTexto = (!hasRain && currentPrecip === 0) ? 'Seco' : maxProb >= 70 ? 'Lluvia intensa' : 'Lluvia probable';

    recomendacion = (!hasRain && currentPrecip === 0)
      ? 'Vías secas. Tránsito normal de volquetes y equipos móviles sin restricción por humedad.'
      : maxProb >= 70
        ? 'Pistas resbaladizas y riesgo de taludes: reducir velocidad en ruta y revisar drenajes de tajo.'
        : 'Uso de ropa impermeable de campo y precaución al subir o bajar de equipos pesados.';

    if (maxProb >= 70 || totalPrecip >= 5) { deduction = 20; severityScore = 4; }
    else if (maxProb >= 40 || totalPrecip >= 2) { deduction = 12; severityScore = 3; }
    else if (maxProb >= 20 || totalPrecip > 0) { deduction = 6; severityScore = 1; }

    for (let i = 0; i < times.length; i++) {
      const prob = probs[i] || 0;
      const heightPct = Math.max(8, prob);
      const isAlert = prob >= 40;
      const isRain = prob > 0;
      const barClass = isAlert ? 'bar-alert' : isRain ? 'bar-rain' : '';
      barsHTML += `<div class="mini-bar ${barClass}" style="height: ${heightPct}%;" title="${times[i] ? times[i].slice(11, 16) : ''} h: ${prob}% prob"></div>`;
    }
    barsHTML = `<div class="mini-histogram-chart" title="Probabilidad horaria de precipitación (${badgeText})">${barsHTML}</div>`;
  }

  ctx.scoreDeductions += deduction;
  if (severityScore === 0) ctx.safeCount++; else ctx.alertCount++;

  if (severityScore > ctx.highestRisk.severityScore) {
    ctx.highestRisk = {
      title: 'Precipitación pluvial',
      subtitle: isRealTime ? `Tasa actual: ${currentPrecip.toFixed(1)} mm/h` : `${heroVal} prob`,
      value: heroVal,
      unit: heroUnit,
      caption: isRealTime ? 'Lectura en tiempo real' : `Acumulado ${badgeText}`,
      recommendation: recomendacion,
      severityScore
    };
  }

  const hasAlert = severityScore > 0;
  const cardClass = hasAlert ? (severityScore >= 4 ? 'risk-card card-alert' : 'risk-card card-warning') : 'risk-card';

  const controlBoxHTML = `
    <div class="control-measure-box">
      <span class="control-box-label">Control SST (Haul roads / Vías):</span>
      <p class="control-box-text">${escapeHTML(recomendacion)}</p>
    </div>
  `;

  const card = document.createElement('article');
  card.className = cardClass;
  card.innerHTML = `
    <div class="risk-card-top-row">
      <div class="factor-identifier">
        <span class="factor-badge-circle">02</span>
        <span class="factor-title">Precipitación pluvial</span>
      </div>
      <span class="risk-status-pill ${pillClass}">${nivelTexto}</span>
    </div>

    <div class="risk-metric-hero-line">
      <div class="metric-main-group">
        <span class="metric-hero-val">${heroVal}</span>
        <span class="metric-hero-unit">${heroUnit}</span>
      </div>
      ${badgeHTML}
    </div>

    <div class="metric-secondary-telemetry">
      ${secondaryHTML}
    </div>

    ${barsHTML}
    ${controlBoxHTML}
  `;
  return card;
}

function createWindCard(data, ctx, horizon = 0) {
  const isRealTime = (horizon === 0);
  const currentSpeed = data?.current?.wind_speed_10m ?? 0;
  const currentGust = data?.current?.wind_gusts_10m ?? currentSpeed;
  const badgeText = formatHorizonBadge(horizon);
  const horizonTitle = horizon === 0.5 ? '30 minutos' : `${horizon} horas`;

  const gustSeries = getSeriesForHorizon(data, 'wind_gusts_10m', horizon);
  const boomSeries = getSeriesForHorizon(data, 'wind_speed_80m', horizon);

  const nextGusts = gustSeries.values;
  const next80mSpeed = boomSeries.values;

  const targetGust = isRealTime ? currentGust : Math.max(currentGust, ...(nextGusts.length ? nextGusts : [0]));
  const targetBoom = isRealTime ? currentSpeed : Math.max(currentSpeed, ...(next80mSpeed.length ? next80mSpeed : [0]));

  let nivelLabel = 'Normal';
  let pillClass = 'pill-green';
  let deduction = 0;
  let severityScore = 0;
  let recomendacion = 'Vientos seguros. Operaciones de izaje, grúas y trabajos en altura autorizados sin restricción.';

  if (targetGust > 50 || targetBoom > 50) {
    nivelLabel = 'Suspensión';
    pillClass = 'pill-red';
    deduction = 35;
    severityScore = 5;
    recomendacion = 'Parada mandatoria de grúas e izajes conforme a estándares de seguridad (> 50 km/h). Descenso de plumas.';
  } else if (targetGust >= 32 || targetBoom >= 32) {
    nivelLabel = 'Restricción izaje';
    pillClass = 'pill-red';
    deduction = 20;
    severityScore = 4;
    recomendacion = 'Límite legal de izaje alcanzado (≥ 32 km/h D.S. 024-2016-EM). Prohibido izaje de cargas críticas.';
  } else if (targetGust >= 25 || targetBoom >= 25) {
    nivelLabel = 'Precaución';
    pillClass = 'pill-amber';
    deduction = 8;
    severityScore = 2;
    recomendacion = 'Inspección de estabilizadores de grúas, vientos guía y uso permanente de barbiquejo.';
  }

  ctx.scoreDeductions += deduction;
  if (severityScore === 0) ctx.safeCount++; else ctx.alertCount++;

  if (severityScore > ctx.highestRisk.severityScore) {
    ctx.highestRisk = {
      title: 'Velocidad del viento',
      subtitle: `${nivelLabel}`,
      value: Math.round(targetGust),
      unit: 'km/h',
      caption: isRealTime ? `Ráfaga actual: ${Math.round(currentGust)} km/h` : `Ráfaga máx ${badgeText}: ${Math.round(targetGust)} km/h`,
      recommendation: recomendacion,
      severityScore
    };
  }

  const hasAlert = severityScore > 0;
  const cardClass = hasAlert ? (severityScore >= 4 ? 'risk-card card-alert' : 'risk-card card-warning') : 'risk-card';

  const controlBoxHTML = `
    <div class="control-measure-box">
      <span class="control-box-label">Control SST (Izajes y grúas / ISO):</span>
      <p class="control-box-text">${escapeHTML(recomendacion)}</p>
    </div>
  `;

  const badgeHTML = isRealTime
    ? `<div class="metric-projection-badge" title="Ráfaga instantánea"><span class="projection-label">Ráfaga:</span><span class="projection-val">${Math.round(currentGust)} km/h</span></div>`
    : `<div class="metric-projection-badge" title="Ráfaga máxima estimada en ${horizonTitle}"><span class="projection-label">Ráfaga ${badgeText}:</span><span class="projection-val">${Math.round(targetGust)} km/h</span></div>`;

  const secondaryText = isRealTime
    ? `<span>Pluma 80m: ${Math.round(targetBoom)} km/h</span><span class="telemetry-sep">&bull;</span><span>Anemómetro en mástil 10m</span>`
    : `<span>Ráfaga actual: ${Math.round(currentGust)} km/h</span><span class="telemetry-sep">&bull;</span><span>Pluma 80m: ${Math.round(targetBoom)} km/h</span>`;

  const card = document.createElement('article');
  card.className = cardClass;
  card.innerHTML = `
    <div class="risk-card-top-row">
      <div class="factor-identifier">
        <span class="factor-badge-circle">03</span>
        <span class="factor-title">Viento y ráfagas</span>
      </div>
      <span class="risk-status-pill ${pillClass}">${nivelLabel}</span>
    </div>

    <div class="risk-metric-hero-line">
      <div class="metric-main-group">
        <span class="metric-hero-val">${Math.round(currentSpeed)}</span>
        <span class="metric-hero-unit">km/h</span>
      </div>
      ${badgeHTML}
    </div>

    <div class="metric-secondary-telemetry">
      ${secondaryText}
    </div>

    ${controlBoxHTML}
  `;
  return card;
}

function createThunderstormCard(data, ctx, horizon = 0) {
  const isRealTime = (horizon === 0);
  const badgeText = formatHorizonBadge(horizon);
  const horizonTitle = horizon === 0.5 ? '30 minutos' : `${horizon} horas`;

  const capeSeries = getSeriesForHorizon(data, 'cape', horizon);
  const codeSeries = getSeriesForHorizon(data, 'weather_code', horizon);

  const times = capeSeries.times;
  const capes = capeSeries.values;
  const weatherCodes = codeSeries.values;

  const currentHourIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const currentCape = data?.hourly?.cape ? (data.hourly.cape[currentHourIdx] ?? 0) : 0;
  const targetCape = isRealTime ? currentCape : Math.max(currentCape, ...(capes.length ? capes : [0]));

  let level = 'BAJO';
  if (targetCape > 2500) level = 'MUY_ALTO';
  else if (targetCape >= 1500) level = 'ALTO';
  else if (targetCape >= 500) level = 'MODERADO';

  let capeRule = UMBRALES_CAPE[level];
  let stormDetected = false;
  let estimatedStormTime = null;

  if (isRealTime) {
    const currentCode = data?.current?.weather_code ?? (weatherCodes[0] ?? 0);
    stormDetected = WEATHER_CODES_TORMENTA.includes(currentCode);
  } else {
    for (let i = 0; i < weatherCodes.length; i++) {
      if (WEATHER_CODES_TORMENTA.includes(weatherCodes[i])) {
        stormDetected = true;
        estimatedStormTime = times[i] ? times[i].slice(11, 16) : null;
        break;
      }
    }
  }

  let nivelLabel = capeRule.nivel;
  let recomendacion = capeRule.recomendacion;
  let pillClass = 'pill-green';
  let deduction = 0;
  let severityScore = 0;

  if (stormDetected) {
    pillClass = 'pill-red';
    nivelLabel = isRealTime ? 'Tormenta activa' : 'Tormenta prevista';
    deduction = 35;
    severityScore = 5;
    const horaMsg = isRealTime ? ' en faena.' : (estimatedStormTime ? ` aprox. a las ${estimatedStormTime} h.` : '.');
    recomendacion = `Tormenta eléctrica${horaMsg} Activar detector de rayos y evacuar a refugios Faraday (regla 30/30 WMO).`;
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
      subtitle: stormDetected ? (isRealTime ? 'Tormenta activa en faena' : `Prevista a las ${estimatedStormTime || '--:--'} h`) : `Energía CAPE ${Math.round(targetCape)} J/kg`,
      value: Math.round(targetCape),
      unit: 'J/kg',
      caption: isRealTime ? 'Detector de rayos en tiempo real' : 'Alerta de convección atmosférica',
      recommendation: recomendacion,
      severityScore
    };
  }

  const hasAlert = severityScore > 0 || stormDetected;
  const cardClass = hasAlert ? (severityScore >= 4 ? 'risk-card card-alert' : 'risk-card card-warning') : 'risk-card';

  const controlBoxHTML = `
    <div class="control-measure-box">
      <span class="control-box-label">Control SST (Refugios Faraday / WMO):</span>
      <p class="control-box-text">${escapeHTML(recomendacion)}</p>
    </div>
  `;

  const stormBadgeVal = stormDetected ? 'Activas' : currentCape < 300 ? 'Estable' : currentCape < 1000 ? 'Moderada' : 'Severa';
  const badgeHTML = isRealTime
    ? `<div class="metric-projection-badge" title="Inestabilidad convectiva instantánea"><span class="projection-label">${stormDetected ? 'Descargas:' : 'Inestabilidad:'}</span><span class="projection-val"${stormDetected ? ' style="color:#ef4444;"' : ''}>${stormBadgeVal}</span></div>`
    : `<div class="metric-projection-badge" title="Energía convectiva máxima en ${horizonTitle}"><span class="projection-label">Pico ${badgeText}:</span><span class="projection-val">${Math.round(targetCape)} J/kg</span></div>`;

  const secondaryText = stormDetected
    ? (isRealTime ? 'Descargas activas en faena &bull; Regla 30/30' : `Descargas previstas a las ${estimatedStormTime || '--:--'} h &bull; Regla 30/30`)
    : 'Atmósfera monitoreada &bull; Sin riesgo de descargas';

  const card = document.createElement('article');
  card.className = cardClass;
  card.innerHTML = `
    <div class="risk-card-top-row">
      <div class="factor-identifier">
        <span class="factor-badge-circle">04</span>
        <span class="factor-title">Tormenta eléctrica</span>
      </div>
      <span class="risk-status-pill ${pillClass}">${nivelLabel}</span>
    </div>

    <div class="risk-metric-hero-line">
      <div class="metric-main-group">
        <span class="metric-hero-val">${Math.round(currentCape)}</span>
        <span class="metric-hero-unit">J/kg</span>
      </div>
      ${badgeHTML}
    </div>

    <div class="metric-secondary-telemetry">
      <span>${secondaryText}</span>
    </div>

    ${controlBoxHTML}
  `;
  return card;
}

function createTemperatureCard(data, ctx, horizon = 0) {
  const isRealTime = (horizon === 0);
  const currentTemp = data?.current?.temperature_2m ?? 18;
  const currentApparent = data?.current?.apparent_temperature ?? currentTemp;
  const dailyMin = data?.daily?.temperature_2m_min?.[0] ?? currentTemp;
  const dailyMax = data?.daily?.temperature_2m_max?.[0] ?? currentTemp;
  const badgeText = formatHorizonBadge(horizon);
  const horizonTitle = horizon === 0.5 ? '30 minutos' : `${horizon} horas`;

  const tempSeries = getSeriesForHorizon(data, 'temperature_2m', horizon);
  const temps = tempSeries.values.length ? tempSeries.values : [currentTemp];

  const minTemp = isRealTime ? currentTemp : Math.min(...temps);
  const maxTemp = isRealTime ? currentTemp : Math.max(...temps);

  let rule = UMBRALES_TEMPERATURA.CONFORT;
  let pillClass = 'pill-green';
  let deduction = 0;
  let severityScore = 0;

  if (currentTemp <= -5 || minTemp <= -5) {
    rule = UMBRALES_TEMPERATURA.FRIO_EXTREMO;
    pillClass = 'pill-red';
    deduction = 25;
    severityScore = 5;
  } else if (currentTemp <= 0 || minTemp <= 0) {
    rule = UMBRALES_TEMPERATURA.FRIO_SEVERO;
    pillClass = 'pill-orange';
    deduction = 15;
    severityScore = 4;
  } else if (currentTemp >= 38 || maxTemp >= 38) {
    rule = UMBRALES_TEMPERATURA.GOLPE_CALOR;
    pillClass = 'pill-red';
    deduction = 25;
    severityScore = 5;
  } else if (currentTemp >= 32 || maxTemp >= 32) {
    rule = UMBRALES_TEMPERATURA.CALOR_SEVERO;
    pillClass = 'pill-amber';
    deduction = 15;
    severityScore = 3;
  } else if (currentTemp <= 8 || minTemp <= 8) {
    rule = UMBRALES_TEMPERATURA.FRIO_MODERADO;
    pillClass = 'pill-amber';
    deduction = 6;
    severityScore = 1;
  } else if (currentTemp >= 28 || maxTemp >= 28) {
    rule = UMBRALES_TEMPERATURA.CALOR_MODERADO;
    pillClass = 'pill-amber';
    deduction = 6;
    severityScore = 1;
  }

  ctx.scoreDeductions += deduction;
  if (severityScore === 0) ctx.safeCount++; else ctx.alertCount++;

  if (severityScore > ctx.highestRisk.severityScore) {
    ctx.highestRisk = {
      title: 'Temperatura y estrés térmico',
      subtitle: `${rule.nivel} (${currentTemp.toFixed(1)}°C)`,
      value: `${currentTemp.toFixed(1)}`,
      unit: '°C',
      caption: isRealTime ? `Sensación: ${currentApparent.toFixed(1)}°C` : `Rango en ${horizonTitle}: ${minTemp.toFixed(1)}°C a ${maxTemp.toFixed(1)}°C`,
      recommendation: rule.recomendacion,
      severityScore
    };
  }

  const hasAlert = severityScore > 0;
  const cardClass = hasAlert ? (severityScore >= 4 ? 'risk-card card-alert' : 'risk-card card-warning') : 'risk-card';

  const controlBoxHTML = `
    <div class="control-measure-box">
      <span class="control-box-label">Control SST (Estrés térmico / ISO 7243):</span>
      <p class="control-box-text">${escapeHTML(rule.recomendacion)}</p>
    </div>
  `;

  const badgeHTML = isRealTime
    ? `<div class="metric-projection-badge" title="Sensación térmica calculada"><span class="projection-label">Sensación:</span><span class="projection-val">${currentApparent.toFixed(1)}°C</span></div>`
    : `<div class="metric-projection-badge" title="Rango previsto en ${horizonTitle}"><span class="projection-label">${badgeText}:</span><span class="projection-val">${minTemp.toFixed(0)}° a ${maxTemp.toFixed(0)}°C</span></div>`;

  const secondaryText = isRealTime
    ? `<span>Rango del día: ${dailyMin.toFixed(0)}° a ${dailyMax.toFixed(0)}°C</span><span class="telemetry-sep">&bull;</span><span>${rule.badge === 'Normal' ? 'Rango confortable' : rule.nivel}</span>`
    : `<span>Sensación: ${currentApparent.toFixed(1)}°C</span><span class="telemetry-sep">&bull;</span><span>Mín: ${minTemp.toFixed(1)}°C / Máx: ${maxTemp.toFixed(1)}°C</span>`;

  const card = document.createElement('article');
  card.className = cardClass;
  card.innerHTML = `
    <div class="risk-card-top-row">
      <div class="factor-identifier">
        <span class="factor-badge-circle">05</span>
        <span class="factor-title">Temperatura y sensación térmica</span>
      </div>
      <span class="risk-status-pill ${pillClass}">${rule.badge}</span>
    </div>

    <div class="risk-metric-hero-line">
      <div class="metric-main-group">
        <span class="metric-hero-val">${currentTemp.toFixed(1)}</span>
        <span class="metric-hero-unit">°C</span>
      </div>
      ${badgeHTML}
    </div>

    <div class="metric-secondary-telemetry">
      ${secondaryText}
    </div>

    ${controlBoxHTML}
  `;
  return card;
}

function createSnowCard(data, ctx, horizon = 0) {
  const isRealTime = (horizon === 0);
  const badgeText = formatHorizonBadge(horizon);
  const horizonTitle = horizon === 0.5 ? '30 minutos' : `${horizon} horas`;

  const currentIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const snowSeries = getSeriesForHorizon(data, 'snowfall', horizon);
  const snowfallList = snowSeries.values;

  const count = Math.max(1, Math.round(horizon));
  const snowDepthList = isRealTime
    ? [(data?.hourly?.snow_depth?.[currentIdx] ?? 0)]
    : (data?.hourly?.snow_depth?.slice(currentIdx, currentIdx + count) || []);
  const freezingLevelList = data?.hourly?.freezing_level_height?.slice(currentIdx, currentIdx + (isRealTime ? 1 : count)) || [];

  const currentSnow = data?.current?.snowfall ?? (snowfallList[0] || 0);
  const totalSnowAccum = isRealTime ? currentSnow : snowfallList.reduce((acc, v) => acc + (v || 0), 0);
  const maxDepthCm = Math.round(Math.max(0, ...snowDepthList) * 100);
  const freezingLevel = Math.round(freezingLevelList[0] || 4500);

  let rule = UMBRALES_NIEVE.SIN_NIEVE;
  let pillClass = 'pill-green';
  let deduction = 0;
  let severityScore = 0;

  if (totalSnowAccum >= 5 || maxDepthCm >= 5) {
    rule = UMBRALES_NIEVE.INTENSA;
    pillClass = 'pill-red';
    deduction = 30;
    severityScore = 5;
  } else if (totalSnowAccum >= 1 || maxDepthCm >= 1) {
    rule = UMBRALES_NIEVE.MODERADA;
    pillClass = 'pill-amber';
    deduction = 18;
    severityScore = 3;
  } else if (totalSnowAccum > 0 || currentSnow > 0) {
    rule = UMBRALES_NIEVE.LIGERA;
    pillClass = 'pill-amber';
    deduction = 8;
    severityScore = 1;
  }

  ctx.scoreDeductions += deduction;
  if (severityScore === 0) ctx.safeCount++; else ctx.alertCount++;

  if (severityScore > ctx.highestRisk.severityScore) {
    ctx.highestRisk = {
      title: 'Nieve y congelamiento',
      subtitle: `${rule.nivel} (${totalSnowAccum.toFixed(1)} cm)`,
      value: `${totalSnowAccum.toFixed(1)}`,
      unit: 'cm',
      caption: isRealTime ? `Isoterma 0°C a ${freezingLevel} msnm` : `Isoterma 0°C a ${freezingLevel} msnm`,
      recommendation: rule.recomendacion,
      severityScore
    };
  }

  const hasAlert = severityScore > 0;
  const cardClass = hasAlert ? (severityScore >= 4 ? 'risk-card card-alert' : 'risk-card card-warning') : 'risk-card';

  const controlBoxHTML = `
    <div class="control-measure-box">
      <span class="control-box-label">Control SST (Alta montaña y frentes fríos):</span>
      <p class="control-box-text">${escapeHTML(rule.recomendacion)}</p>
    </div>
  `;

  const badgeHTML = isRealTime
    ? `<div class="metric-projection-badge" title="Isoterma de cero grados"><span class="projection-label">Isoterma 0°:</span><span class="projection-val">${freezingLevel} m</span></div>`
    : `<div class="metric-projection-badge" title="Nieve estimada en ${horizonTitle}"><span class="projection-label">${badgeText}:</span><span class="projection-val">${totalSnowAccum.toFixed(1)} cm</span></div>`;

  const secondaryText = isRealTime
    ? `<span>Espesor actual: ${maxDepthCm} cm</span><span class="telemetry-sep">&bull;</span><span>${currentSnow > 0 ? 'Nevada activa en cota alta' : 'Vías libres de nieve y hielo'}</span>`
    : `<span>Espesor: ${maxDepthCm} cm</span><span class="telemetry-sep">&bull;</span><span>Isoterma 0°: ${freezingLevel} m</span>`;

  const card = document.createElement('article');
  card.className = cardClass;
  card.innerHTML = `
    <div class="risk-card-top-row">
      <div class="factor-identifier">
        <span class="factor-badge-circle">06</span>
        <span class="factor-title">Nieve y congelamiento</span>
      </div>
      <span class="risk-status-pill ${pillClass}">${rule.badge}</span>
    </div>

    <div class="risk-metric-hero-line">
      <div class="metric-main-group">
        <span class="metric-hero-val">${currentSnow.toFixed(1)}</span>
        <span class="metric-hero-unit">cm actual</span>
      </div>
      ${badgeHTML}
    </div>

    <div class="metric-secondary-telemetry">
      ${secondaryText}
    </div>

    ${controlBoxHTML}
  `;
  return card;
}

function createVisibilityCard(data, ctx, horizon = 0) {
  const isRealTime = (horizon === 0);
  const badgeText = formatHorizonBadge(horizon);
  const horizonTitle = horizon === 0.5 ? '30 minutos' : `${horizon} horas`;

  const visSeries = getSeriesForHorizon(data, 'visibility', horizon);
  const visList = visSeries.values.length ? visSeries.values : [10000];

  const currentHourIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const currentVis = data?.current?.visibility ?? (data?.hourly?.visibility?.[currentHourIdx] ?? (visList[0] ?? 10000));
  const currentHumidity = data?.current?.relative_humidity_2m ?? (data?.hourly?.relative_humidity_2m?.[currentHourIdx] ?? 60);
  const minVis = isRealTime ? currentVis : Math.min(...visList);

  let rule = UMBRALES_VISIBILIDAD.OPTIMA;
  let pillClass = 'pill-green';
  let deduction = 0;
  let severityScore = 0;

  if (currentVis < 100 || minVis < 100) {
    rule = UMBRALES_VISIBILIDAD.CRITICA;
    pillClass = 'pill-red';
    deduction = 25;
    severityScore = 5;
  } else if (currentVis < 500 || minVis < 500) {
    rule = UMBRALES_VISIBILIDAD.REDUCIDA;
    pillClass = 'pill-amber';
    deduction = 12;
    severityScore = 3;
  } else if (currentVis < 2000 || minVis < 2000) {
    rule = UMBRALES_VISIBILIDAD.LIGERA;
    pillClass = 'pill-amber';
    deduction = 5;
    severityScore = 1;
  }

  ctx.scoreDeductions += deduction;
  if (severityScore === 0) ctx.safeCount++; else ctx.alertCount++;

  const visKm = (currentVis / 1000).toFixed(1);
  const minVisKm = (minVis / 1000).toFixed(1);

  if (severityScore > ctx.highestRisk.severityScore) {
    ctx.highestRisk = {
      title: 'Visibilidad en ruta',
      subtitle: `${rule.nivel} (${currentVis < 1000 ? currentVis + ' m' : visKm + ' km'})`,
      value: currentVis < 1000 ? `${currentVis}` : `${visKm}`,
      unit: currentVis < 1000 ? 'm' : 'km',
      caption: isRealTime ? 'Lectura en tiempo real' : `Mínima en ${horizonTitle}: ${minVis < 1000 ? minVis + ' m' : minVisKm + ' km'}`,
      recommendation: rule.recomendacion,
      severityScore
    };
  }

  const hasAlert = severityScore > 0;
  const cardClass = hasAlert ? (severityScore >= 4 ? 'risk-card card-alert' : 'risk-card card-warning') : 'risk-card';

  const controlBoxHTML = `
    <div class="control-measure-box">
      <span class="control-box-label">Control SST (Acarreo y flota pesada):</span>
      <p class="control-box-text">${escapeHTML(rule.recomendacion)}</p>
    </div>
  `;

  const badgeHTML = isRealTime
    ? `<div class="metric-projection-badge" title="Humedad relativa en faena"><span class="projection-label">Humedad:</span><span class="projection-val">${currentHumidity}%</span></div>`
    : `<div class="metric-projection-badge" title="Visibilidad mínima prevista en ${horizonTitle}"><span class="projection-label">Mín ${badgeText}:</span><span class="projection-val">${minVis < 1000 ? minVis + ' m' : minVisKm + ' km'}</span></div>`;

  const secondaryText = isRealTime
    ? `<span>Tránsito de volquetes</span><span class="telemetry-sep">&bull;</span><span>${currentVis < 1000 ? 'Niebla en haul roads' : 'Ruta despejada y transitable'}</span>`
    : `<span>Tránsito de volquetes</span><span class="telemetry-sep">&bull;</span><span>${minVis < 1000 ? 'Riesgo de niebla' : 'Ruta despejada'}</span>`;

  const card = document.createElement('article');
  card.className = cardClass;
  card.innerHTML = `
    <div class="risk-card-top-row">
      <div class="factor-identifier">
        <span class="factor-badge-circle">07</span>
        <span class="factor-title">Visibilidad en ruta</span>
      </div>
      <span class="risk-status-pill ${pillClass}">${rule.badge}</span>
    </div>

    <div class="risk-metric-hero-line">
      <div class="metric-main-group">
        <span class="metric-hero-val">${currentVis < 1000 ? currentVis : visKm}</span>
        <span class="metric-hero-unit">${currentVis < 1000 ? 'm' : 'km'}</span>
      </div>
      ${badgeHTML}
    </div>

    <div class="metric-secondary-telemetry">
      ${secondaryText}
    </div>

    ${controlBoxHTML}
  `;
  return card;
}

function createSoilCard(data, ctx, horizon = 0) {
  const isRealTime = (horizon === 0);
  const badgeText = formatHorizonBadge(horizon);
  const horizonTitle = horizon === 0.5 ? '30 minutos' : `${horizon} horas`;

  const currentIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const count = Math.max(1, Math.round(horizon));
  const moistureList = isRealTime
    ? [(data?.hourly?.soil_moisture_0_to_7cm?.[currentIdx] ?? 0.15)]
    : (data?.hourly?.soil_moisture_0_to_7cm?.slice(currentIdx, currentIdx + count) || [0.15]);

  const currentMoisture = data?.hourly?.soil_moisture_0_to_7cm?.[currentIdx] ?? (moistureList[0] ?? 0.15);
  const maxMoisture = isRealTime ? currentMoisture : Math.max(...moistureList);

  let rule = UMBRALES_SUELO.ESTABLE;
  let pillClass = 'pill-green';
  let deduction = 0;
  let severityScore = 0;

  if (currentMoisture >= 0.40 || maxMoisture >= 0.40) {
    rule = UMBRALES_SUELO.SATURADO;
    pillClass = 'pill-red';
    deduction = 20;
    severityScore = 4;
  } else if (currentMoisture >= 0.28 || maxMoisture >= 0.28) {
    rule = UMBRALES_SUELO.HUMEDO;
    pillClass = 'pill-amber';
    deduction = 10;
    severityScore = 2;
  }

  ctx.scoreDeductions += deduction;
  if (severityScore === 0) ctx.safeCount++; else ctx.alertCount++;

  const moisturePct = Math.round(currentMoisture * 100);
  const maxPct = Math.round(maxMoisture * 100);

  if (severityScore > ctx.highestRisk.severityScore) {
    ctx.highestRisk = {
      title: 'Humedad de suelo',
      subtitle: `${rule.nivel} (${moisturePct}%)`,
      value: `${moisturePct}`,
      unit: '%',
      caption: isRealTime ? 'Lectura en tiempo real' : `Saturación máx en ${horizonTitle}: ${maxPct}%`,
      recommendation: rule.recomendacion,
      severityScore
    };
  }

  const hasSoilAlert = severityScore > 0;
  const soilCardClass = hasSoilAlert ? (severityScore >= 4 ? 'risk-card card-alert' : 'risk-card card-warning') : 'risk-card';

  const soilControlBoxHTML = `
    <div class="control-measure-box">
      <span class="control-box-label">Control SST (Geotecnia y taludes):</span>
      <p class="control-box-text">${escapeHTML(rule.recomendacion)}</p>
    </div>
  `;

  const badgeHTML = isRealTime
    ? `<div class="metric-projection-badge" title="Contenido volumétrico de agua"><span class="projection-label">Volumen:</span><span class="projection-val">${currentMoisture.toFixed(3)} m³/m³</span></div>`
    : `<div class="metric-projection-badge" title="Saturación hídrica máxima en ${horizonTitle}"><span class="projection-label">Máx ${badgeText}:</span><span class="projection-val">${maxPct}%</span></div>`;

  const card = document.createElement('article');
  card.className = soilCardClass;
  card.innerHTML = `
    <div class="risk-card-top-row">
      <div class="factor-identifier">
        <span class="factor-badge-circle">08</span>
        <span class="factor-title">Humedad de suelo</span>
      </div>
      <span class="risk-status-pill ${pillClass}">${rule.badge}</span>
    </div>

    <div class="risk-metric-hero-line">
      <div class="metric-main-group">
        <span class="metric-hero-val">${moisturePct}</span>
        <span class="metric-hero-unit">% saturación</span>
      </div>
      ${badgeHTML}
    </div>

    <div class="metric-secondary-telemetry">
      <span>Capa 0-7 cm: ${currentMoisture.toFixed(3)} m³/m³</span>
      <span class="telemetry-sep">&bull;</span>
      <span>Taludes y botaderos</span>
    </div>

    ${soilControlBoxHTML}
  `;
  return card;
}

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
