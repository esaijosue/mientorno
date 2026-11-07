import {
  APP_NAME,
  ACCURACY_WARNING_THRESHOLD_METERS,
  REGLAS_UV,
  UMBRALES_LLUVIA,
  UMBRALES_VIENTO,
  UMBRALES_CAPE,
  REGLA_TORMENTA_ACTIVA,
  WEATHER_CODES_TORMENTA,
  UMBRALES_TEMPERATURA,
  UMBRALES_NIEVE,
  UMBRALES_VISIBILIDAD,
  UMBRALES_SUELO,
  calcularIndiceSeguridad,
  evaluateHourlySlot
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

export function updateLastRefreshTimestamp(horizon = currentForecastHorizon, targetTimeStr = '') {
  const timeEl = getElements().lastUpdated;
  if (!timeEl) return;
  if (horizon > 0 && targetTimeStr) {
    const badgeText = formatHorizonBadge(horizon);
    timeEl.textContent = `Proyección +${badgeText} (${targetTimeStr} h)`;
  } else {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    timeEl.textContent = `Actualizado ${timeStr}`;
  }
}

export function updateLocationInfo(lat, lon, accuracy, source = 'gps', placeName = null) {
  const els = getElements();
  if (!els.locationStatus) return;

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

  setTimeout(() => {
    if (alertEl && alertEl.innerHTML.includes(escapeHTML(message))) {
      alertEl.hidden = true;
    }
  }, 6000);
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

  const fc = getForecastContext(data, horizon);

  const riskContext = {
    safeCount: 0,
    alertCount: 0,
    factors: {},
    scoreDeductions: 0,
    highestRisk: {
      title: 'Condición normal',
      subtitle: fc.isRealTime ? 'Operaciones de campo' : `Proyección a las ${fc.targetTimeStr} h`,
      value: 'Seguro',
      unit: '',
      caption: 'Parámetros dentro de umbrales permitidos',
      recommendation: 'Operaciones normales en campo sin restricciones climáticas.',
      severityScore: 0
    }
  };

  try {
    els.cardsContainer.appendChild(createUVCard(data, riskContext, fc));
  } catch (err) {
    console.error('Error generando tarjeta UV:', err);
    els.cardsContainer.appendChild(createErrorCard('Radiación solar UV'));
  }

  try {
    els.cardsContainer.appendChild(createRainCard(data, riskContext, fc));
  } catch (err) {
    console.error('Error generando tarjeta Lluvia:', err);
    els.cardsContainer.appendChild(createErrorCard('Precipitación pluvial'));
  }

  try {
    els.cardsContainer.appendChild(createWindCard(data, riskContext, fc));
  } catch (err) {
    console.error('Error generando tarjeta Viento:', err);
    els.cardsContainer.appendChild(createErrorCard('Velocidad del viento'));
  }

  try {
    els.cardsContainer.appendChild(createThunderstormCard(data, riskContext, fc));
  } catch (err) {
    console.error('Error generando tarjeta Tormenta:', err);
    els.cardsContainer.appendChild(createErrorCard('Tormenta eléctrica'));
  }

  try {
    els.cardsContainer.appendChild(createTemperatureCard(data, riskContext, fc));
  } catch (err) {
    console.error('Error generando tarjeta Temperatura:', err);
    els.cardsContainer.appendChild(createErrorCard('Estrés térmico'));
  }

  try {
    els.cardsContainer.appendChild(createSnowCard(data, riskContext, fc));
  } catch (err) {
    console.error('Error generando tarjeta Nieve:', err);
    els.cardsContainer.appendChild(createErrorCard('Nieve y congelamiento'));
  }

  try {
    els.cardsContainer.appendChild(createVisibilityCard(data, riskContext, fc));
  } catch (err) {
    console.error('Error generando tarjeta Visibilidad:', err);
    els.cardsContainer.appendChild(createErrorCard('Visibilidad en ruta'));
  }

  try {
    els.cardsContainer.appendChild(createSoilCard(data, riskContext, fc));
  } catch (err) {
    console.error('Error generando tarjeta Suelo:', err);
    els.cardsContainer.appendChild(createErrorCard('Humedad de suelo'));
  }

  const finalScore = updateSafetyIndexSummary(riskContext, data);
  updateFloatingMapCard(riskContext, finalScore, horizon, fc.targetTimeStr);
  updateWarningAccordion(riskContext);
  updateReliabilityBanner(horizon);
  updateLastRefreshTimestamp(horizon, fc.targetTimeStr);
}

function updateSafetyIndexSummary(context, weatherData) {
  const els = getElements();
  if (!els.safetyScoreNumber) return 100;

  const safetyResult = calcularIndiceSeguridad(context.factors || {});
  const finalScore = safetyResult.finalScore;
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
  const height = 75;
  const steps = 24;

  const hourly = weatherData?.hourly;
  const currentHourIdx = getCurrentHourIndex(hourly?.time, weatherData?.current?.time);
  const dayStartIdx = Math.max(0, currentHourIdx - (currentHourIdx % 24));
  const points = [];

  for (let i = 0; i < steps; i++) {
    const slotIdx = dayStartIdx + i;
    const x = Math.round((i / (steps - 1)) * width);
    let hourScore = currentScore || 100;

    if (hourly && hourly.temperature_2m && hourly.temperature_2m.length > slotIdx) {
      const evaluation = evaluateHourlySlot(hourly, slotIdx);
      hourScore = evaluation.finalScore;
    }

    // Mapeo proporcional 0%..100% en coordenadas SVG (viewBox height 75)
    // 100% -> y = 12 (cima de la curva)
    // 0%   -> y = 68 (base de la curva)
    const y = Math.round(68 - (hourScore / 100) * 56);
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

function updateFloatingMapCard(context, score, horizon = currentForecastHorizon, targetTimeStr = '') {
  const els = getElements();
  if (!els.floatingKpiTitle || !els.floatingKpiValue) return;

  const hasAlerts = context.alertCount > 0;
  const currentScore = score !== undefined ? score : calcularIndiceSeguridad(context.factors || {}).finalScore;
  const isRealTime = (horizon === 0);
  const badgeText = formatHorizonBadge(horizon);

  els.floatingKpiTitle.textContent = isRealTime ? 'Estado operativo' : `Estado previsto (${targetTimeStr || ('+' + badgeText)} h)`;
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

function getForecastContext(data, horizon = 0) {
  const isRealTime = (horizon === 0);
  const currentTimeStr = data?.current?.time || '';
  const hourlyTimes = data?.hourly?.time || [];
  const currentHourIdx = getCurrentHourIndex(hourlyTimes, currentTimeStr);
  const badgeText = formatHorizonBadge(horizon);
  const horizonTitle = horizon === 0.5 ? '30 minutos' : `${horizon} horas`;

  if (isRealTime) {
    const timeDisplay = currentTimeStr ? currentTimeStr.slice(11, 16) : '';
    return {
      isRealTime: true,
      badgeText: 'Ahora',
      horizonTitle: 'tiempo real',
      targetTimeStr: timeDisplay,
      targetHourIdx: currentHourIdx,
      getValue: (key, fallback = 0) => {
        if (data?.current?.[key] !== undefined && data.current[key] !== null) {
          return data.current[key];
        }
        return data?.hourly?.[key]?.[currentHourIdx] ?? fallback;
      },
      getWindowValues: (key, fallback = 0) => {
        const val = data?.current?.[key] ?? data?.hourly?.[key]?.[currentHourIdx] ?? fallback;
        return [val];
      }
    };
  }

  // Horizon > 0 (30m, 1h, 3h, 9h, 12h, 24h)
  let targetTimeStr = '';
  let targetHourIdx = currentHourIdx;
  let useMinutely = false;
  let minutelyTargetIdx = -1;
  let minutelyStartIdx = -1;

  if (horizon <= 0.5 && data?.minutely_15?.time && Array.isArray(data.minutely_15.time)) {
    const mTimes = data.minutely_15.time;
    const prefix = currentTimeStr ? currentTimeStr.slice(0, 16) : '';
    let startIdx = mTimes.findIndex((t) => t >= prefix);
    if (startIdx === -1) startIdx = 0;
    const steps = 2; // 30 min = 2 x 15 min
    const targetIdx = Math.min(mTimes.length - 1, startIdx + steps);
    if (mTimes[targetIdx]) {
      useMinutely = true;
      minutelyStartIdx = startIdx;
      minutelyTargetIdx = targetIdx;
      targetTimeStr = mTimes[targetIdx].slice(11, 16);
      targetHourIdx = Math.min(hourlyTimes.length - 1, currentHourIdx + 1);
    }
  }

  if (!useMinutely) {
    const offsetHours = Math.max(1, Math.round(horizon));
    targetHourIdx = Math.min(hourlyTimes.length - 1, currentHourIdx + offsetHours);
    const rawTime = hourlyTimes[targetHourIdx] || '';
    targetTimeStr = rawTime ? rawTime.slice(11, 16) : '';
  }

  return {
    isRealTime: false,
    badgeText,
    horizonTitle,
    targetTimeStr,
    targetHourIdx,
    getValue: (key, fallback = 0) => {
      if (useMinutely && data?.minutely_15?.[key]?.[minutelyTargetIdx] !== undefined) {
        return data.minutely_15[key][minutelyTargetIdx];
      }
      return data?.hourly?.[key]?.[targetHourIdx] ?? fallback;
    },
    getWindowValues: (key, fallback = 0) => {
      if (useMinutely && data?.minutely_15?.[key]) {
        const slice = data.minutely_15[key].slice(minutelyStartIdx, minutelyTargetIdx + 1);
        if (slice && slice.length > 0) return slice;
      }
      const arr = data?.hourly?.[key];
      if (Array.isArray(arr) && arr.length > 0) {
        const slice = arr.slice(currentHourIdx, targetHourIdx + 1);
        if (slice && slice.length > 0) return slice;
      }
      return [fallback];
    }
  };
}

function createUVCard(data, ctx, fc) {
  const currentHourIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const currentUV = data?.hourly?.uv_index ? (data.hourly.uv_index[currentHourIdx] ?? 0) : 0;
  const dailyMaxUV = data?.daily?.uv_index_max?.[0] ?? currentUV;

  const targetUV = fc.isRealTime ? currentUV : fc.getValue('uv_index', 0);
  const isNight = targetUV < 0.2;

  let deduction = 0;
  let severityScore = 0;
  let rule;

  if (isNight) {
    rule = {
      nivel: 'Noche',
      badge: 'Noche',
      recomendacion: fc.isRealTime
        ? 'Sin radiación solar UV durante el turno nocturno. No se requiere bloqueador solar en horas de oscuridad.'
        : `Horario nocturno previsto a las ${fc.targetTimeStr} h (+${fc.badgeText}). Sin radiación solar ultravioleta.`
    };
  } else {
    rule = REGLAS_UV.find((r) => targetUV >= r.min && targetUV <= r.max) || REGLAS_UV[0];
    if (targetUV >= 11) { deduction = 25; severityScore = 5; }
    else if (targetUV >= 8) { deduction = 18; severityScore = 4; }
    else if (targetUV >= 6) { deduction = 10; severityScore = 3; }
  }

  ctx.factors.uv = { severity: isNight ? 0 : severityScore, value: targetUV };
  ctx.scoreDeductions += deduction;
  if (severityScore === 0) ctx.safeCount++; else ctx.alertCount++;

  const pillClass = isNight ? 'pill-green' : targetUV >= 8 ? 'pill-red' : targetUV >= 6 ? 'pill-amber' : 'pill-green';
  const displayVal = isNight ? '0.0' : targetUV.toFixed(1);
  const statusLabel = isNight ? 'Noche' : rule.nivel;

  if (!isNight && severityScore > ctx.highestRisk.severityScore) {
    ctx.highestRisk = {
      title: 'Radiación solar UV',
      subtitle: `Nivel ${rule.nivel.toLowerCase()}`,
      value: targetUV.toFixed(1),
      unit: 'UVI',
      caption: fc.isRealTime ? `Pico del día: ${dailyMaxUV.toFixed(1)} UVI` : `A las ${fc.targetTimeStr} h: ${targetUV.toFixed(1)} UVI`,
      recommendation: rule.recomendacion,
      severityScore
    };
  }

  const hasAlert = !isNight && severityScore > 0;
  const cardClass = hasAlert ? (severityScore >= 4 ? 'risk-card card-alert' : 'risk-card card-warning') : 'risk-card';

  const controlBoxHTML = `
    <div class="control-measure-box">
      <span class="control-box-label">Controles:</span>
      <p class="control-box-text">${escapeHTML(rule.recomendacion)}</p>
    </div>
  `;

  const secondaryText = isNight
    ? (fc.isRealTime ? 'Turno nocturno &bull; Sin exposición solar actínica' : `Ventana nocturna a las ${fc.targetTimeStr} h &bull; 0.0 UVI`)
    : (fc.isRealTime
      ? 'Sensor en faena &bull; Exposición solar directa'
      : `Previsto a las ${fc.targetTimeStr} h &bull; Radiación ${rule.nivel.toLowerCase()}`);

  const badgeHTML = fc.isRealTime
    ? `<div class="metric-projection-badge" title="Pico máximo diurno previsto hoy"><span class="projection-label">Máx hoy:</span><span class="projection-val">${dailyMaxUV.toFixed(1)} UVI</span></div>`
    : `<div class="metric-projection-badge" title="Pico diurno hoy"><span class="projection-label">Máx hoy:</span><span class="projection-val">${dailyMaxUV.toFixed(1)} UVI</span></div>`;

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
        <span class="metric-hero-unit">UVI</span>
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

function createRainCard(data, ctx, fc) {
  const currentPrecip = data?.current?.precipitation ?? 0;
  const currentHourIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const currentProb = data?.hourly?.precipitation_probability?.[currentHourIdx] ?? 0;

  let rule = UMBRALES_LLUVIA.SECO;
  let secondaryHTML = '';
  let badgeHTML = '';
  let heroVal = '0.0';
  let heroUnit = 'mm/h';
  let barsHTML = '';

  if (fc.isRealTime) {
    heroVal = currentPrecip.toFixed(1);
    heroUnit = 'mm/h actual';
    badgeHTML = `<div class="metric-projection-badge" title="Probabilidad de lluvia actual"><span class="projection-label">Probabilidad:</span><span class="projection-val">${currentProb}%</span></div>`;
    secondaryHTML = `<span>${currentPrecip > 0 ? 'Precipitación activa sobre faena' : 'Calzada seca &bull; Sin lluvia actual'}</span>`;

    if (currentPrecip >= 5) {
      rule = UMBRALES_LLUVIA.INTENSA;
    } else if (currentPrecip >= 1) {
      rule = UMBRALES_LLUVIA.MODERADA;
    } else if (currentPrecip > 0) {
      rule = UMBRALES_LLUVIA.LLOVIZNA;
    }
  } else {
    const targetPrecip = fc.getValue('precipitation', 0);
    const targetProb = fc.getValue('precipitation_probability', 0);
    const windowAmounts = fc.getWindowValues('precipitation', targetPrecip);
    const windowProbs = fc.getWindowValues('precipitation_probability', targetProb);
    const totalPrecip = windowAmounts.reduce((a, b) => a + (b || 0), 0);
    const maxProb = Math.max(...windowProbs, targetProb);

    const hasRain = (targetPrecip > 0 || totalPrecip >= 0.2 || maxProb >= 30);
    heroVal = targetPrecip > 0 ? targetPrecip.toFixed(1) : `${targetProb}%`;
    heroUnit = targetPrecip > 0 ? 'mm/h' : 'prob.';

    badgeHTML = `<div class="metric-projection-badge" title="Acumulado estimado en ${fc.horizonTitle}"><span class="projection-label">${fc.badgeText}:</span><span class="projection-val">${totalPrecip.toFixed(1)} mm</span></div>`;
    secondaryHTML = `<span>A las ${fc.targetTimeStr} h: ${targetPrecip.toFixed(1)} mm/h (${targetProb}%)</span><span class="telemetry-sep">&bull;</span><span>${hasRain ? `Acumulado: ${totalPrecip.toFixed(1)} mm` : 'Sin lluvia prevista'}</span>`;

    if (maxProb >= 70 || totalPrecip >= 5 || targetPrecip >= 5) {
      rule = UMBRALES_LLUVIA.INTENSA;
    } else if (maxProb >= 40 || totalPrecip >= 2 || targetPrecip >= 1) {
      rule = UMBRALES_LLUVIA.MODERADA;
    } else if (hasRain) {
      rule = UMBRALES_LLUVIA.LLOVIZNA;
    }

    const hourlyTimes = data?.hourly?.time || [];
    const stepCount = windowProbs.length;
    for (let i = 0; i < stepCount; i++) {
      const p = windowProbs[i] || 0;
      const heightPct = Math.max(8, p);
      const isAlert = p >= 40;
      const isRain = p > 0;
      const barClass = isAlert ? 'bar-alert' : isRain ? 'bar-rain' : '';
      const tStr = hourlyTimes[currentHourIdx + i] ? hourlyTimes[currentHourIdx + i].slice(11, 16) : '';
      barsHTML += `<div class="mini-bar ${barClass}" style="height: ${heightPct}%;" title="${tStr} h: ${p}% prob"></div>`;
    }
    barsHTML = `<div class="mini-histogram-chart" title="Probabilidad de precipitación (${fc.badgeText})">${barsHTML}</div>`;
  }

  ctx.factors.lluvia = { severity: rule.severity, value: fc.isRealTime ? currentPrecip : (fc.getValue('precipitation', 0)) };
  ctx.scoreDeductions += rule.deduccion;
  if (rule.severity === 0) ctx.safeCount++; else ctx.alertCount++;

  if (rule.severity > ctx.highestRisk.severityScore) {
    ctx.highestRisk = {
      title: 'Precipitación pluvial',
      subtitle: fc.isRealTime ? `Tasa actual: ${currentPrecip.toFixed(1)} mm/h` : `Previsto a las ${fc.targetTimeStr} h: ${heroVal} ${heroUnit}`,
      value: heroVal,
      unit: heroUnit,
      caption: fc.isRealTime ? 'Lectura en tiempo real' : `Acumulado ${fc.badgeText}`,
      recommendation: rule.recomendacion,
      severityScore: rule.severity
    };
  }

  const hasAlert = rule.severity > 0;
  const cardClass = hasAlert ? (rule.severity >= 4 ? 'risk-card card-alert' : 'risk-card card-warning') : 'risk-card';

  const controlBoxHTML = `
    <div class="control-measure-box">
      <span class="control-box-label">Controles:</span>
      <p class="control-box-text">${escapeHTML(rule.recomendacion)}</p>
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
      <span class="risk-status-pill ${rule.pill}">${rule.nivel}</span>
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

function createWindCard(data, ctx, fc) {
  const currentHourIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const currentSpeed = data?.current?.wind_speed_10m ?? 0;
  const currentGust = data?.current?.wind_gusts_10m ?? currentSpeed;
  const current80m = data?.hourly?.wind_speed_80m?.[currentHourIdx] ?? currentSpeed;

  const targetSpeed = fc.isRealTime ? currentSpeed : fc.getValue('wind_speed_10m', 0);
  const targetGust = fc.isRealTime ? currentGust : fc.getValue('wind_gusts_10m', targetSpeed);
  const targetBoom = fc.isRealTime ? current80m : fc.getValue('wind_speed_80m', targetSpeed);
  const windowGusts = fc.getWindowValues('wind_gusts_10m', targetGust);
  const maxGust = Math.max(targetGust, ...windowGusts);

  let rule = UMBRALES_VIENTO.NORMAL;
  let pillClass = 'pill-green';

  if (targetGust >= 50 || targetBoom >= 50 || maxGust >= 50) {
    rule = UMBRALES_VIENTO.SUSPENSION;
    pillClass = 'pill-red';
  } else if (targetGust >= 32 || targetBoom >= 32 || maxGust >= 32) {
    rule = UMBRALES_VIENTO.RESTRICCION;
    pillClass = 'pill-red';
  } else if (targetGust >= 25 || targetBoom >= 25 || maxGust >= 25) {
    rule = UMBRALES_VIENTO.PRECAUCION;
    pillClass = 'pill-amber';
  }

  ctx.factors.viento = { severity: rule.severity, value: targetGust };
  ctx.scoreDeductions += rule.deduccion;
  if (rule.severity === 0) ctx.safeCount++; else ctx.alertCount++;

  if (rule.severity > ctx.highestRisk.severityScore) {
    ctx.highestRisk = {
      title: 'Velocidad del viento',
      subtitle: `${rule.nivel}`,
      value: Math.round(targetGust),
      unit: 'km/h',
      caption: fc.isRealTime ? `Ráfaga actual: ${Math.round(currentGust)} km/h` : `A las ${fc.targetTimeStr} h: ráfaga ${Math.round(targetGust)} km/h`,
      recommendation: rule.recomendacion,
      severityScore: rule.severity
    };
  }

  const hasAlert = rule.severity > 0;
  const cardClass = hasAlert ? (rule.severity >= 4 ? 'risk-card card-alert' : 'risk-card card-warning') : 'risk-card';

  const controlBoxHTML = `
    <div class="control-measure-box">
      <span class="control-box-label">Controles:</span>
      <p class="control-box-text">${escapeHTML(rule.recomendacion)}</p>
    </div>
  `;

  const badgeHTML = fc.isRealTime
    ? `<div class="metric-projection-badge" title="Ráfaga instantánea"><span class="projection-label">Ráfaga:</span><span class="projection-val">${Math.round(currentGust)} km/h</span></div>`
    : `<div class="metric-projection-badge" title="Ráfaga prevista a las ${fc.targetTimeStr} h"><span class="projection-label">Ráfaga:</span><span class="projection-val">${Math.round(targetGust)} km/h</span></div>`;

  const secondaryText = fc.isRealTime
    ? `<span>Pluma 80m: ${Math.round(current80m)} km/h</span><span class="telemetry-sep">&bull;</span><span>Anemómetro en mástil 10m</span>`
    : `<span>A las ${fc.targetTimeStr} h</span><span class="telemetry-sep">&bull;</span><span>Pluma 80m: ${Math.round(targetBoom)} km/h</span><span class="telemetry-sep">&bull;</span><span>Pico ventana: ${Math.round(maxGust)} km/h</span>`;

  const card = document.createElement('article');
  card.className = cardClass;
  card.innerHTML = `
    <div class="risk-card-top-row">
      <div class="factor-identifier">
        <span class="factor-badge-circle">03</span>
        <span class="factor-title">Viento y ráfagas</span>
      </div>
      <span class="risk-status-pill ${pillClass}">${rule.nivel}</span>
    </div>

    <div class="risk-metric-hero-line">
      <div class="metric-main-group">
        <span class="metric-hero-val">${Math.round(targetSpeed)}</span>
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

function createThunderstormCard(data, ctx, fc) {
  const currentHourIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const currentCape = data?.hourly?.cape ? (data.hourly.cape[currentHourIdx] ?? 0) : 0;
  const currentCode = data?.current?.weather_code ?? (data?.hourly?.weather_code?.[currentHourIdx] ?? 0);

  const targetCape = fc.isRealTime ? currentCape : fc.getValue('cape', 0);
  const targetCode = fc.isRealTime ? currentCode : fc.getValue('weather_code', 0);
  const windowCapes = fc.getWindowValues('cape', targetCape);
  const maxCape = Math.max(targetCape, ...windowCapes);
  const windowCodes = fc.getWindowValues('weather_code', targetCode);

  let stormDetected = false;
  if (fc.isRealTime) {
    stormDetected = WEATHER_CODES_TORMENTA.includes(currentCode);
  } else {
    stormDetected = WEATHER_CODES_TORMENTA.includes(targetCode) || windowCodes.some((c) => WEATHER_CODES_TORMENTA.includes(c));
  }

  let level = 'BAJO';
  if (targetCape >= 2500 || maxCape >= 2500) level = 'MUY_ALTO';
  else if (targetCape >= 1500 || maxCape >= 1500) level = 'ALTO';
  else if (targetCape >= 500 || maxCape >= 500) level = 'MODERADO';

  let rule = UMBRALES_CAPE[level];
  let pillClass = (level === 'MUY_ALTO') ? 'pill-red' : (level === 'ALTO') ? 'pill-amber' : (level === 'MODERADO') ? 'pill-amber' : 'pill-green';

  if (stormDetected) {
    rule = REGLA_TORMENTA_ACTIVA;
    pillClass = 'pill-red';
  }

  ctx.factors.tormenta = { severity: rule.severity, value: targetCape };
  ctx.scoreDeductions += rule.deduccion;
  if (rule.severity === 0) ctx.safeCount++; else ctx.alertCount++;

  if (rule.severity > ctx.highestRisk.severityScore) {
    ctx.highestRisk = {
      title: 'Tormenta eléctrica',
      subtitle: stormDetected ? (fc.isRealTime ? 'Alerta Roja: Tormenta en faena (< 16 km)' : `Alerta Roja hacia las ${fc.targetTimeStr} h`) : `${rule.nivel} (${rule.badge})`,
      value: Math.round(targetCape),
      unit: 'J/kg',
      caption: fc.isRealTime ? 'Protocolo ThunderBolt / D.S. 024' : `Previsto a las ${fc.targetTimeStr} h`,
      recommendation: rule.recomendacion,
      severityScore: rule.severity
    };
  }

  const hasAlert = rule.severity > 0;
  const cardClass = hasAlert ? (rule.severity >= 4 ? 'risk-card card-alert' : 'risk-card card-warning') : 'risk-card';

  const controlBoxHTML = `
    <div class="control-measure-box">
      <span class="control-box-label">Controles:</span>
      <p class="control-box-text">${escapeHTML(rule.recomendacion)}</p>
    </div>
  `;

  const badgeHTML = fc.isRealTime
    ? `<div class="metric-projection-badge" title="Protocolo operativo de tormenta (ThunderBolt)"><span class="projection-label">Protocolo:</span><span class="projection-val"${stormDetected ? ' style="color:#ef4444;"' : ''}>${rule.badge}</span></div>`
    : `<div class="metric-projection-badge" title="Energía convectiva pico en ventana"><span class="projection-label">${fc.badgeText}:</span><span class="projection-val">${rule.badge}</span></div>`;

  const secondaryText = stormDetected
    ? (fc.isRealTime ? 'Alerta Roja activa &bull; Tormenta &lt; 16 km &bull; Regla 30/30' : `Alerta Roja prevista a las ${fc.targetTimeStr} h &bull; Regla 30/30`)
    : (fc.isRealTime ? 'Monitoreo de descargas &bull; Protocolo ThunderBolt / D.S. 024' : `Previsto a las ${fc.targetTimeStr} h &bull; Pico: ${Math.round(maxCape)} J/kg`);

  const card = document.createElement('article');
  card.className = cardClass;
  card.innerHTML = `
    <div class="risk-card-top-row">
      <div class="factor-identifier">
        <span class="factor-badge-circle">04</span>
        <span class="factor-title">Tormenta eléctrica</span>
      </div>
      <span class="risk-status-pill ${pillClass}">${rule.nivel}</span>
    </div>

    <div class="risk-metric-hero-line">
      <div class="metric-main-group">
        <span class="metric-hero-val">${Math.round(targetCape)}</span>
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

function createTemperatureCard(data, ctx, fc) {
  const currentTemp = data?.current?.temperature_2m ?? 18;
  const currentApparent = data?.current?.apparent_temperature ?? currentTemp;
  const dailyMin = data?.daily?.temperature_2m_min?.[0] ?? currentTemp;
  const dailyMax = data?.daily?.temperature_2m_max?.[0] ?? currentTemp;

  const targetTemp = fc.isRealTime ? currentTemp : fc.getValue('temperature_2m', 18);
  const targetApparent = fc.isRealTime ? currentApparent : fc.getValue('apparent_temperature', targetTemp);
  const windowTemps = fc.getWindowValues('temperature_2m', targetTemp);
  const minTemp = Math.min(targetTemp, ...windowTemps);
  const maxTemp = Math.max(targetTemp, ...windowTemps);

  let rule = UMBRALES_TEMPERATURA.CONFORT;
  let pillClass = 'pill-green';
  let deduction = 0;
  let severityScore = 0;

  if (targetTemp <= -5 || minTemp <= -5) {
    rule = UMBRALES_TEMPERATURA.FRIO_EXTREMO;
    pillClass = 'pill-red';
    deduction = 25;
    severityScore = 5;
  } else if (targetTemp <= 0 || minTemp <= 0) {
    rule = UMBRALES_TEMPERATURA.FRIO_SEVERO;
    pillClass = 'pill-orange';
    deduction = 15;
    severityScore = 4;
  } else if (targetTemp >= 38 || maxTemp >= 38) {
    rule = UMBRALES_TEMPERATURA.GOLPE_CALOR;
    pillClass = 'pill-red';
    deduction = 25;
    severityScore = 5;
  } else if (targetTemp >= 32 || maxTemp >= 32) {
    rule = UMBRALES_TEMPERATURA.CALOR_SEVERO;
    pillClass = 'pill-amber';
    deduction = 15;
    severityScore = 3;
  } else if (targetTemp <= 8 || minTemp <= 8) {
    rule = UMBRALES_TEMPERATURA.FRIO_MODERADO;
    pillClass = 'pill-amber';
    deduction = 6;
    severityScore = 1;
  } else if (targetTemp >= 28 || maxTemp >= 28) {
    rule = UMBRALES_TEMPERATURA.CALOR_MODERADO;
    pillClass = 'pill-amber';
    deduction = 6;
    severityScore = 1;
  }

  ctx.factors.temperatura = { severity: severityScore, value: targetTemp };
  ctx.scoreDeductions += deduction;
  if (severityScore === 0) ctx.safeCount++; else ctx.alertCount++;

  if (severityScore > ctx.highestRisk.severityScore) {
    ctx.highestRisk = {
      title: 'Temperatura y estrés térmico',
      subtitle: `${rule.nivel} (${targetTemp.toFixed(1)}°C)`,
      value: `${targetTemp.toFixed(1)}`,
      unit: '°C',
      caption: fc.isRealTime ? `Sensación: ${currentApparent.toFixed(1)}°C` : `A las ${fc.targetTimeStr} h: sensación ${targetApparent.toFixed(1)}°C`,
      recommendation: rule.recomendacion,
      severityScore
    };
  }

  const hasAlert = severityScore > 0;
  const cardClass = hasAlert ? (severityScore >= 4 ? 'risk-card card-alert' : 'risk-card card-warning') : 'risk-card';

  const controlBoxHTML = `
    <div class="control-measure-box">
      <span class="control-box-label">Controles:</span>
      <p class="control-box-text">${escapeHTML(rule.recomendacion)}</p>
    </div>
  `;

  const badgeHTML = fc.isRealTime
    ? `<div class="metric-projection-badge" title="Sensación térmica calculada"><span class="projection-label">Sensación:</span><span class="projection-val">${currentApparent.toFixed(1)}°C</span></div>`
    : `<div class="metric-projection-badge" title="Sensación térmica prevista"><span class="projection-label">Sensación:</span><span class="projection-val">${targetApparent.toFixed(1)}°C</span></div>`;

  const secondaryText = fc.isRealTime
    ? `<span>Rango del día: ${dailyMin.toFixed(0)}° a ${dailyMax.toFixed(0)}°C</span><span class="telemetry-sep">&bull;</span><span>${rule.badge === 'Normal' ? 'Rango confortable' : rule.nivel}</span>`
    : `<span>A las ${fc.targetTimeStr} h</span><span class="telemetry-sep">&bull;</span><span>Sensación: ${targetApparent.toFixed(1)}°C</span><span class="telemetry-sep">&bull;</span><span>Rango ${fc.badgeText}: ${minTemp.toFixed(0)}° a ${maxTemp.toFixed(0)}°C</span>`;

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
        <span class="metric-hero-val">${targetTemp.toFixed(1)}</span>
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

function createSnowCard(data, ctx, fc) {
  const currentHourIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const currentSnow = data?.current?.snowfall ?? (data?.hourly?.snowfall?.[currentHourIdx] ?? 0);
  const currentDepthCm = Math.round((data?.hourly?.snow_depth?.[currentHourIdx] ?? 0) * 100);
  const currentFreezing = Math.round(data?.hourly?.freezing_level_height?.[currentHourIdx] ?? 4500);

  const targetSnow = fc.isRealTime ? currentSnow : fc.getValue('snowfall', 0);
  const targetDepthCm = Math.round((fc.getValue('snow_depth', 0)) * 100);
  const targetFreezing = Math.round(fc.getValue('freezing_level_height', 4500));
  const windowSnow = fc.getWindowValues('snowfall', targetSnow);
  const totalSnowAccum = fc.isRealTime ? currentSnow : windowSnow.reduce((acc, v) => acc + (v || 0), 0);

  let rule = UMBRALES_NIEVE.SIN_NIEVE;
  let pillClass = 'pill-green';
  let deduction = 0;
  let severityScore = 0;

  if (totalSnowAccum >= 5 || targetDepthCm >= 5 || targetSnow >= 5) {
    rule = UMBRALES_NIEVE.INTENSA;
    pillClass = 'pill-red';
    deduction = 30;
    severityScore = 5;
  } else if (totalSnowAccum >= 1 || targetDepthCm >= 1 || targetSnow >= 1) {
    rule = UMBRALES_NIEVE.MODERADA;
    pillClass = 'pill-amber';
    deduction = 18;
    severityScore = 3;
  } else if (totalSnowAccum > 0 || targetSnow > 0) {
    rule = UMBRALES_NIEVE.LIGERA;
    pillClass = 'pill-amber';
    deduction = 8;
    severityScore = 1;
  }

  ctx.factors.nieve = { severity: severityScore, value: targetSnow };
  ctx.scoreDeductions += deduction;
  if (severityScore === 0) ctx.safeCount++; else ctx.alertCount++;

  if (severityScore > ctx.highestRisk.severityScore) {
    ctx.highestRisk = {
      title: 'Nieve y congelamiento',
      subtitle: `${rule.nivel} (${targetSnow > 0 ? targetSnow.toFixed(1) : totalSnowAccum.toFixed(1)} cm)`,
      value: `${targetSnow > 0 ? targetSnow.toFixed(1) : totalSnowAccum.toFixed(1)}`,
      unit: 'cm',
      caption: fc.isRealTime ? `Isoterma 0° a ${currentFreezing} msnm` : `A las ${fc.targetTimeStr} h: isoterma a ${targetFreezing} msnm`,
      recommendation: rule.recomendacion,
      severityScore
    };
  }

  const hasAlert = severityScore > 0;
  const cardClass = hasAlert ? (severityScore >= 4 ? 'risk-card card-alert' : 'risk-card card-warning') : 'risk-card';

  const controlBoxHTML = `
    <div class="control-measure-box">
      <span class="control-box-label">Controles:</span>
      <p class="control-box-text">${escapeHTML(rule.recomendacion)}</p>
    </div>
  `;

  const badgeHTML = fc.isRealTime
    ? `<div class="metric-projection-badge" title="Isoterma de cero grados"><span class="projection-label">Isoterma 0°:</span><span class="projection-val">${currentFreezing} m</span></div>`
    : `<div class="metric-projection-badge" title="Isoterma a las ${fc.targetTimeStr} h"><span class="projection-label">Isoterma 0°:</span><span class="projection-val">${targetFreezing} m</span></div>`;

  const secondaryText = fc.isRealTime
    ? `<span>Espesor actual: ${currentDepthCm} cm</span><span class="telemetry-sep">&bull;</span><span>${currentSnow > 0 ? 'Nevada activa en cota alta' : 'Vías libres de nieve y hielo'}</span>`
    : `<span>A las ${fc.targetTimeStr} h</span><span class="telemetry-sep">&bull;</span><span>Espesor: ${targetDepthCm} cm</span><span class="telemetry-sep">&bull;</span><span>Acumulado: ${totalSnowAccum.toFixed(1)} cm</span>`;

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
        <span class="metric-hero-val">${targetSnow > 0 ? targetSnow.toFixed(1) : totalSnowAccum.toFixed(1)}</span>
        <span class="metric-hero-unit">${targetSnow > 0 ? 'cm/h' : (fc.isRealTime ? 'cm actual' : 'cm acum')}</span>
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

function createVisibilityCard(data, ctx, fc) {
  const currentHourIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const currentVis = data?.current?.visibility ?? (data?.hourly?.visibility?.[currentHourIdx] ?? 10000);
  const currentHumidity = data?.current?.relative_humidity_2m ?? (data?.hourly?.relative_humidity_2m?.[currentHourIdx] ?? 60);

  const targetVis = fc.isRealTime ? currentVis : fc.getValue('visibility', 10000);
  const targetHumidity = fc.isRealTime ? currentHumidity : fc.getValue('relative_humidity_2m', 60);
  const windowVis = fc.getWindowValues('visibility', targetVis);
  const minVis = Math.min(targetVis, ...windowVis);

  let rule = UMBRALES_VISIBILIDAD.OPTIMA;
  let pillClass = 'pill-green';
  let deduction = 0;
  let severityScore = 0;

  if (targetVis < 100 || minVis < 100) {
    rule = UMBRALES_VISIBILIDAD.CRITICA;
    pillClass = 'pill-red';
    deduction = 25;
    severityScore = 5;
  } else if (targetVis < 500 || minVis < 500) {
    rule = UMBRALES_VISIBILIDAD.REDUCIDA;
    pillClass = 'pill-amber';
    deduction = 12;
    severityScore = 3;
  } else if (targetVis < 2000 || minVis < 2000) {
    rule = UMBRALES_VISIBILIDAD.LIGERA;
    pillClass = 'pill-amber';
    deduction = 5;
    severityScore = 1;
  }

  ctx.factors.visibilidad = { severity: severityScore, value: targetVis };
  ctx.scoreDeductions += deduction;
  if (severityScore === 0) ctx.safeCount++; else ctx.alertCount++;

  const visDisplay = targetVis < 1000 ? `${Math.round(targetVis)}` : (targetVis / 1000).toFixed(1);
  const visUnit = targetVis < 1000 ? 'm' : 'km';
  const minVisDisplay = minVis < 1000 ? `${Math.round(minVis)} m` : `${(minVis / 1000).toFixed(1)} km`;

  if (severityScore > ctx.highestRisk.severityScore) {
    ctx.highestRisk = {
      title: 'Visibilidad en ruta',
      subtitle: `${rule.nivel} (${visDisplay} ${visUnit})`,
      value: visDisplay,
      unit: visUnit,
      caption: fc.isRealTime ? 'Lectura en tiempo real' : `A las ${fc.targetTimeStr} h: mín en ventana ${minVisDisplay}`,
      recommendation: rule.recomendacion,
      severityScore
    };
  }

  const hasAlert = severityScore > 0;
  const cardClass = hasAlert ? (severityScore >= 4 ? 'risk-card card-alert' : 'risk-card card-warning') : 'risk-card';

  const controlBoxHTML = `
    <div class="control-measure-box">
      <span class="control-box-label">Controles:</span>
      <p class="control-box-text">${escapeHTML(rule.recomendacion)}</p>
    </div>
  `;

  const badgeHTML = fc.isRealTime
    ? `<div class="metric-projection-badge" title="Humedad relativa en faena"><span class="projection-label">Humedad:</span><span class="projection-val">${currentHumidity}%</span></div>`
    : `<div class="metric-projection-badge" title="Visibilidad mínima en ventana ${fc.badgeText}"><span class="projection-label">Mín ${fc.badgeText}:</span><span class="projection-val">${minVisDisplay}</span></div>`;

  const secondaryText = fc.isRealTime
    ? `<span>Tránsito de volquetes</span><span class="telemetry-sep">&bull;</span><span>${currentVis < 1000 ? 'Niebla en haul roads' : 'Ruta despejada y transitable'}</span>`
    : `<span>A las ${fc.targetTimeStr} h</span><span class="telemetry-sep">&bull;</span><span>Humedad: ${targetHumidity}%</span><span class="telemetry-sep">&bull;</span><span>${targetVis < 1000 ? 'Riesgo de niebla' : 'Ruta despejada'}</span>`;

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
        <span class="metric-hero-val">${visDisplay}</span>
        <span class="metric-hero-unit">${visUnit}</span>
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

function createSoilCard(data, ctx, fc) {
  const currentHourIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const currentMoisture = data?.hourly?.soil_moisture_0_to_7cm?.[currentHourIdx] ?? 0.15;

  const targetMoisture = fc.isRealTime ? currentMoisture : fc.getValue('soil_moisture_0_to_7cm', 0.15);
  const windowMoisture = fc.getWindowValues('soil_moisture_0_to_7cm', targetMoisture);
  const maxMoisture = Math.max(targetMoisture, ...windowMoisture);

  let rule = UMBRALES_SUELO.ESTABLE;
  let pillClass = 'pill-green';
  let deduction = 0;
  let severityScore = 0;

  if (targetMoisture >= 0.40 || maxMoisture >= 0.40) {
    rule = UMBRALES_SUELO.SATURADO;
    pillClass = 'pill-red';
    deduction = 20;
    severityScore = 4;
  } else if (targetMoisture >= 0.28 || maxMoisture >= 0.28) {
    rule = UMBRALES_SUELO.HUMEDO;
    pillClass = 'pill-amber';
    deduction = 10;
    severityScore = 2;
  }

  ctx.factors.suelo = { severity: severityScore, value: targetMoisture };
  ctx.scoreDeductions += deduction;
  if (severityScore === 0) ctx.safeCount++; else ctx.alertCount++;

  const moisturePct = Math.round(targetMoisture * 100);
  const maxPct = Math.round(maxMoisture * 100);

  if (severityScore > ctx.highestRisk.severityScore) {
    ctx.highestRisk = {
      title: 'Humedad de suelo',
      subtitle: `${rule.nivel} (${moisturePct}%)`,
      value: `${moisturePct}`,
      unit: '%',
      caption: fc.isRealTime ? 'Lectura en tiempo real' : `A las ${fc.targetTimeStr} h: saturación máx ${maxPct}%`,
      recommendation: rule.recomendacion,
      severityScore
    };
  }

  const hasSoilAlert = severityScore > 0;
  const soilCardClass = hasSoilAlert ? (severityScore >= 4 ? 'risk-card card-alert' : 'risk-card card-warning') : 'risk-card';

  const soilControlBoxHTML = `
    <div class="control-measure-box">
      <span class="control-box-label">Controles:</span>
      <p class="control-box-text">${escapeHTML(rule.recomendacion)}</p>
    </div>
  `;

  const badgeHTML = fc.isRealTime
    ? `<div class="metric-projection-badge" title="Contenido volumétrico de agua"><span class="projection-label">Volumen:</span><span class="projection-val">${currentMoisture.toFixed(3)} m³/m³</span></div>`
    : `<div class="metric-projection-badge" title="Contenido volumétrico a las ${fc.targetTimeStr} h"><span class="projection-label">Volumen:</span><span class="projection-val">${targetMoisture.toFixed(3)} m³/m³</span></div>`;

  const secondaryText = fc.isRealTime
    ? `<span>Capa 0-7 cm: ${currentMoisture.toFixed(3)} m³/m³</span><span class="telemetry-sep">&bull;</span><span>Taludes y botaderos</span>`
    : `<span>A las ${fc.targetTimeStr} h</span><span class="telemetry-sep">&bull;</span><span>Capa 0-7 cm: ${targetMoisture.toFixed(3)} m³/m³</span><span class="telemetry-sep">&bull;</span><span>Taludes y botaderos</span>`;

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
      ${secondaryText}
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
