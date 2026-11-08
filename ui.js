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
let currentOpenModalFactor = null;

export function getReliabilityForHorizon(h) {
  if (h === 0) return { score: '98%', desc: 'Telemetría instantánea y Nowcasting (OMM)', level: 'rel-high' };
  if (h <= 0.5) return { score: '95%', desc: 'Alta resolución 15 min (Maniobras críticas)', level: 'rel-high' };
  if (h <= 1) return { score: '92%', desc: 'Nowcasting táctico de corto plazo', level: 'rel-high' };
  if (h <= 3) return { score: `${Math.round(92 - (h - 1) * 2)}%`, desc: 'Previsión de frentes dinámicos', level: 'rel-medium' };
  if (h <= 6) return { score: `${Math.round(88 - (h - 3) * 1.5)}%`, desc: 'Previsión táctica de turno', level: 'rel-medium' };
  if (h <= 12) return { score: `${Math.round(83 - (h - 6) * 0.8)}%`, desc: 'Jornada continua de trabajo (12h)', level: 'rel-standard' };
  return { score: `${Math.max(65, Math.round(78 - (h - 12) * 0.7))}%`, desc: 'Ciclo circadiano y relevo (24h)', level: 'rel-standard' };
}

export function updateReliabilityBanner(horizon = currentForecastHorizon) {
  const rel = getReliabilityForHorizon(horizon);
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
    dashboardAlertBanner: document.getElementById('dashboard-sst-alert-banner'),
    dashAlertTitle: document.getElementById('dash-alert-title'),
    dashAlertDesc: document.getElementById('dash-alert-desc'),
    dashAlertProtocolText: document.getElementById('dash-alert-protocol-text'),
    chartAreaPath: document.getElementById('chart-area-path'),
    chartLinePath: document.getElementById('chart-line-path'),
    dockBtnDashboard: document.getElementById('dock-btn-dashboard'),
    dockBtnMap: document.getElementById('dock-btn-map'),
    dockBtnGps: document.getElementById('dock-btn-gps'),
    horizonGroup: document.getElementById('horizon-toggle-group'),
    factorModal: document.getElementById('factor-detail-modal'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    modalContentBody: document.getElementById('modal-content-body')
  };

  updateReliabilityBanner(currentForecastHorizon);

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

  // Modal interactions
  elements.modalCloseBtn?.addEventListener('click', closeFactorDetailModal);
  elements.factorModal?.addEventListener('click', (e) => {
    if (e.target === elements.factorModal) {
      closeFactorDetailModal();
    }
  });

  // Delegación de clics en tarjetas de riesgo
  elements.cardsContainer?.addEventListener('click', (e) => {
    const card = e.target.closest('.risk-card[data-factor]');
    if (card && card.dataset.factor) {
      openFactorDetailModal(card.dataset.factor, cachedWeatherData, currentForecastHorizon);
    }
  });

  elements.cardsContainer?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.risk-card[data-factor]');
      if (card && card.dataset.factor) {
        e.preventDefault();
        openFactorDetailModal(card.dataset.factor, cachedWeatherData, currentForecastHorizon);
      }
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.factorModal && !elements.factorModal.hasAttribute('hidden')) {
      closeFactorDetailModal();
      return;
    }

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
  updateDashboardAlertBanner(riskContext);
  updateReliabilityBanner(horizon);
  updateLastRefreshTimestamp(horizon, fc.targetTimeStr);
  renderHourlyRibbon(data, horizon);

  if (currentOpenModalFactor) {
    openFactorDetailModal(currentOpenModalFactor, data, horizon);
  }
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
    ? `Operación con restricción (${context.alertCount} factor${context.alertCount > 1 ? 'es' : ''})`
    : 'Operación regular en campo';
  els.floatingKpiValue.textContent = currentScore.toFixed(1);
  els.floatingKpiUnit.textContent = '%';
  if (els.floatingKpiCaption) {
    els.floatingKpiCaption.textContent = hasAlerts
      ? 'Protocolos D.S. 024-2016-EM activos'
      : 'Parámetros dentro de umbrales permitidos';
  }
}

function updateDashboardAlertBanner(context) {
  const els = getElements();

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
      ? 'En superficie &bull; Exposición solar directa'
      : `Previsto a las ${fc.targetTimeStr} h &bull; Radiación ${rule.nivel.toLowerCase()}`);

  const badgeHTML = fc.isRealTime
    ? `<div class="metric-projection-badge" title="Pico máximo diurno previsto hoy"><span class="projection-label">Máx hoy:</span><span class="projection-val">${dailyMaxUV.toFixed(1)} UVI</span></div>`
    : `<div class="metric-projection-badge" title="Pico diurno hoy"><span class="projection-label">Máx hoy:</span><span class="projection-val">${dailyMaxUV.toFixed(1)} UVI</span></div>`;

  const card = document.createElement('article');
  card.className = `${cardClass} clickable-factor-card`;
  card.dataset.factor = 'uv';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-haspopup', 'dialog');
  card.setAttribute('title', 'Clic para ver análisis técnico detallado de radiación UV y marco Ley 30102');
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

    <div class="card-detail-cta">
      <span>Análisis técnico SST</span>
      <span class="cta-arrow">&nearr;</span>
    </div>
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
    secondaryHTML = `<span>${currentPrecip > 0 ? 'Precipitación activa en el área' : 'Superficie seca &bull; Sin lluvia actual'}</span>`;

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
  card.className = `${cardClass} clickable-factor-card`;
  card.dataset.factor = 'lluvia';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-haspopup', 'dialog');
  card.setAttribute('title', 'Clic para ver análisis técnico detallado de precipitación y D.S. 024 Art. 272');
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

    <div class="card-detail-cta">
      <span>Análisis técnico SST</span>
      <span class="cta-arrow">&nearr;</span>
    </div>
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
  card.className = `${cardClass} clickable-factor-card`;
  card.dataset.factor = 'viento';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-haspopup', 'dialog');
  card.setAttribute('title', 'Clic para ver telemetría de viento en pluma 80m, ráfagas y controles D.S. 024 Art. 385');
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

    <div class="card-detail-cta">
      <span>Análisis técnico SST</span>
      <span class="cta-arrow">&nearr;</span>
    </div>
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
  let pillClass = (level === 'MUY_ALTO') ? 'pill-red' : (level === 'ALTO') ? 'pill-orange' : (level === 'MODERADO') ? 'pill-amber' : 'pill-green';

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
      subtitle: stormDetected ? (fc.isRealTime ? 'Alerta Roja: Tormenta en proximidad (< 16 km)' : `Alerta Roja hacia las ${fc.targetTimeStr} h`) : `${rule.nivel} (${rule.badge})`,
      value: Math.round(targetCape),
      unit: 'J/kg',
      caption: fc.isRealTime ? 'Estándar D.S. 024-2016-EM / NFPA 780' : `Previsto a las ${fc.targetTimeStr} h`,
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
    ? `<div class="metric-projection-badge" title="Estándar de tormentas eléctricas (D.S. 024-2016-EM / NFPA 780)"><span class="projection-label">Protocolo:</span><span class="projection-val"${stormDetected ? ' style="color:#ef4444;"' : ''}>${rule.badge}</span></div>`
    : `<div class="metric-projection-badge" title="Energía convectiva pico en ventana"><span class="projection-label">${fc.badgeText}:</span><span class="projection-val">${rule.badge}</span></div>`;

  const secondaryText = stormDetected
    ? (fc.isRealTime ? 'Alerta Roja activa &bull; Tormenta &lt; 16 km &bull; Regla 30/30' : `Alerta Roja prevista a las ${fc.targetTimeStr} h &bull; Regla 30/30`)
    : (fc.isRealTime ? 'Monitoreo de descargas &bull; Estándar D.S. 024-2016-EM / NFPA 780' : `Previsto a las ${fc.targetTimeStr} h &bull; Pico: ${Math.round(maxCape)} J/kg`);

  const card = document.createElement('article');
  card.className = `${cardClass} clickable-factor-card`;
  card.dataset.factor = 'tormenta';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-haspopup', 'dialog');
  card.setAttribute('title', 'Clic para ver análisis de tormenta eléctrica, CAPE, regla 30/30 y D.S. 024 Art. 380');
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

    <div class="card-detail-cta">
      <span>Análisis técnico SST</span>
      <span class="cta-arrow">&nearr;</span>
    </div>
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
    pillClass = 'pill-orange';
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
  card.className = `${cardClass} clickable-factor-card`;
  card.dataset.factor = 'temperatura';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-haspopup', 'dialog');
  card.setAttribute('title', 'Clic para ver estrés térmico, índice WBGT, pausas ISO 7243 y confort');
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

    <div class="card-detail-cta">
      <span>Análisis técnico SST</span>
      <span class="cta-arrow">&nearr;</span>
    </div>
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
    pillClass = 'pill-orange';
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
  card.className = `${cardClass} clickable-factor-card`;
  card.dataset.factor = 'nieve';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-haspopup', 'dialog');
  card.setAttribute('title', 'Clic para ver nieve acumulada, cota de congelamiento 0°C y cadenas D.S. 024');
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

    <div class="card-detail-cta">
      <span>Análisis técnico SST</span>
      <span class="cta-arrow">&nearr;</span>
    </div>
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
    pillClass = 'pill-orange';
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
    ? `<div class="metric-projection-badge" title="Humedad relativa ambiental"><span class="projection-label">Humedad:</span><span class="projection-val">${currentHumidity}%</span></div>`
    : `<div class="metric-projection-badge" title="Visibilidad mínima en ventana ${fc.badgeText}"><span class="projection-label">Mín ${fc.badgeText}:</span><span class="projection-val">${minVisDisplay}</span></div>`;

  const secondaryText = fc.isRealTime
    ? `<span>Tránsito vehicular y equipos</span><span class="telemetry-sep">&bull;</span><span>${currentVis < 1000 ? 'Niebla en vías de circulación' : 'Ruta despejada y transitable'}</span>`
    : `<span>A las ${fc.targetTimeStr} h</span><span class="telemetry-sep">&bull;</span><span>Humedad: ${targetHumidity}%</span><span class="telemetry-sep">&bull;</span><span>${targetVis < 1000 ? 'Riesgo de niebla' : 'Ruta despejada'}</span>`;

  const card = document.createElement('article');
  card.className = `${cardClass} clickable-factor-card`;
  card.dataset.factor = 'visibilidad';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-haspopup', 'dialog');
  card.setAttribute('title', 'Clic para ver visibilidad en metros, límites de velocidad y balizamiento');
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

    <div class="card-detail-cta">
      <span>Análisis técnico SST</span>
      <span class="cta-arrow">&nearr;</span>
    </div>
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
  card.className = `${soilCardClass} clickable-factor-card`;
  card.dataset.factor = 'suelo';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-haspopup', 'dialog');
  card.setAttribute('title', 'Clic para ver humedad volumétrica de suelo, capacidad portante y retranqueo G.050');
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

    <div class="card-detail-cta">
      <span>Análisis técnico SST</span>
      <span class="cta-arrow">&nearr;</span>
    </div>
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

function getCompassDirection(deg) {
  if (deg === null || deg === undefined) return 'Var';
  const val = Math.floor((deg / 22.5) + 0.5);
  const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return arr[val % 16];
}

function getWMOCodeDesc(code) {
  if (code === undefined || code === null) return 'Despejado';
  if (code === 0) return 'Cielo despejado';
  if (code === 1 || code === 2 || code === 3) return 'Parcialmente nublado';
  if (code === 45 || code === 48) return 'Niebla o escarcha';
  if (code >= 51 && code <= 55) return 'Llovizna';
  if (code >= 61 && code <= 65) return 'Lluvia persistente';
  if (code >= 71 && code <= 77) return 'Nevada o aguanieve';
  if (code >= 80 && code <= 82) return 'Chubascos pluviales';
  if (code >= 85 && code <= 86) return 'Chubascos de nieve';
  if (code === 95) return 'Tormenta eléctrica';
  if (code === 96 || code === 99) return 'Tormenta con granizo';
  return 'Condición atmosférica reportada';
}

export function renderHourlyRibbon(weatherData, currentHorizon = currentForecastHorizon) {
  const els = getElements();
  if (!els.horizonGroup) return;

  const hourly = weatherData?.hourly;
  if (!hourly?.time || !Array.isArray(hourly.time)) return;

  const currentTimeStr = weatherData?.current?.time || '';
  const currentHourIdx = getCurrentHourIndex(hourly.time, currentTimeStr);

  let html = '';

  // 1. Botón En vivo (0)
  const isLiveActive = (currentHorizon === 0);
  html += `
    <button class="horizon-btn ${isLiveActive ? 'active' : ''}" type="button" data-horizon="0" title="Lectura instantánea en tiempo real (OMM / Nowcasting)">
      <span class="live-pulse-dot"></span> En vivo
    </button>
  `;

  // 2. Botón +30m (0.5)
  const is30mActive = (Math.abs(currentHorizon - 0.5) < 0.1);
  html += `
    <button class="horizon-btn ${is30mActive ? 'active' : ''}" type="button" data-horizon="0.5" title="Proyección a 30 minutos (Alta resolución 15 min para maniobras críticas)">
      +30m
    </button>
  `;

  // 3. Botones para las siguientes 24 horas consecutivas
  const maxHours = Math.min(24, hourly.time.length - currentHourIdx - 1);
  for (let i = 1; i <= maxHours; i++) {
    const slotIdx = currentHourIdx + i;
    const timeStr = hourly.time[slotIdx] || '';
    const hourLabel = timeStr ? timeStr.slice(11, 16) : `+${i}h`;

    const evalSlot = evaluateHourlySlot(hourly, slotIdx);
    let dotClass = 'dot-safe';
    let riskLabel = 'Condición normal';

    if (evalSlot.finalScore < 60 || evalSlot.maxSeverity >= 4) {
      dotClass = 'dot-danger';
      riskLabel = 'Alerta o restricción';
    } else if (evalSlot.finalScore < 80 || evalSlot.maxSeverity >= 3) {
      dotClass = 'dot-warning';
      riskLabel = 'Atención requerida';
    }

    const isActive = (Math.abs(currentHorizon - i) < 0.1);
    html += `
      <button class="horizon-btn ${isActive ? 'active' : ''}" type="button" data-horizon="${i}" title="Proyección ${hourLabel} h (+${i}h) • ${riskLabel} (${evalSlot.finalScore}%)">
        <span class="ribbon-time">${hourLabel}</span>
        <span class="ribbon-risk-dot ${dotClass}" aria-hidden="true"></span>
      </button>
    `;
  }

  els.horizonGroup.innerHTML = html;

  const buttons = els.horizonGroup.querySelectorAll('.horizon-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const h = parseFloat(btn.dataset.horizon);
      if (isNaN(h) || currentForecastHorizon === h) return;
      currentForecastHorizon = h;
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      if (cachedWeatherData) {
        renderRiskCards(cachedWeatherData, currentForecastHorizon);
      }
    });
  });

  if (!els.horizonGroup.dataset.wheelBound) {
    els.horizonGroup.dataset.wheelBound = 'true';
    els.horizonGroup.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        els.horizonGroup.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }

  const activeBtn = els.horizonGroup.querySelector('.horizon-btn.active');
  if (activeBtn) {
    activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

function renderModalTimeline(factorKey, data, currentHourIdx, fc) {
  const hourly = data?.hourly;
  if (!hourly?.time) return '';
  const slots = [];
  const hoursToShow = 12;

  for (let i = 0; i < hoursToShow; i++) {
    const idx = currentHourIdx + i;
    if (!hourly.time[idx]) break;
    const timeStr = hourly.time[idx].slice(11, 16);
    const isCurrent = (idx === fc.targetHourIdx);

    let displayVal = '--';
    let dotClass = 'slot-safe';

    if (factorKey === 'uv') {
      const v = hourly.uv_index?.[idx] ?? 0;
      displayVal = `${v.toFixed(1)}`;
      if (v >= 8) dotClass = 'slot-danger';
      else if (v >= 6) dotClass = 'slot-warning';
    } else if (factorKey === 'lluvia') {
      const p = hourly.precipitation?.[idx] ?? 0;
      const prob = hourly.precipitation_probability?.[idx] ?? 0;
      displayVal = `${p.toFixed(1)}mm`;
      if (p >= 5 || prob >= 70) dotClass = 'slot-danger';
      else if (p >= 1 || prob >= 40) dotClass = 'slot-warning';
    } else if (factorKey === 'viento') {
      const w = hourly.wind_speed_10m?.[idx] ?? 0;
      const g = hourly.wind_gusts_10m?.[idx] ?? 0;
      const eff = Math.max(w, g);
      displayVal = `${Math.round(eff)}k`;
      if (eff >= 50) dotClass = 'slot-danger';
      else if (eff >= 32) dotClass = 'slot-warning';
    } else if (factorKey === 'tormenta') {
      const c = hourly.cape?.[idx] ?? 0;
      const code = hourly.weather_code?.[idx] ?? 0;
      displayVal = `${Math.round(c)}J`;
      if ([95, 96, 99].includes(code) || c >= 2500) dotClass = 'slot-danger';
      else if (c >= 1500) dotClass = 'slot-warning';
    } else if (factorKey === 'temperatura') {
      const t = hourly.temperature_2m?.[idx] ?? 15;
      displayVal = `${Math.round(t)}°C`;
      if (t <= 0 || t >= 36) dotClass = 'slot-danger';
      else if (t <= 8 || t >= 30) dotClass = 'slot-warning';
    } else if (factorKey === 'nieve') {
      const s = hourly.snowfall?.[idx] ?? 0;
      displayVal = `${s.toFixed(1)}cm`;
      if (s >= 5) dotClass = 'slot-danger';
      else if (s >= 1) dotClass = 'slot-warning';
    } else if (factorKey === 'visibilidad') {
      const v = (hourly.visibility?.[idx] ?? 10000) / 1000;
      displayVal = `${v.toFixed(1)}km`;
      if (v < 0.5) dotClass = 'slot-danger';
      else if (v < 2.0) dotClass = 'slot-warning';
    } else if (factorKey === 'suelo') {
      const sm = hourly.soil_moisture_0_to_7cm?.[idx] ?? 0.15;
      displayVal = `${(sm * 100).toFixed(0)}%`;
      if (sm >= 0.40) dotClass = 'slot-danger';
      else if (sm >= 0.28) dotClass = 'slot-warning';
    }

    slots.push(`
      <div class="timeline-slot-pill ${isCurrent ? 'current-slot' : ''}">
        <span class="slot-time">${timeStr}</span>
        <span class="slot-val">${displayVal}</span>
        <span class="slot-dot ${dotClass}" aria-hidden="true"></span>
      </div>
    `);
  }

  return `
    <div class="modal-timeline-box">
      <div class="modal-section-heading">Evolución horaria del factor en el turno (próximas 12 horas)</div>
      <div class="modal-timeline-scroll">
        ${slots.join('')}
      </div>
    </div>
  `;
}

export function openFactorDetailModal(factorKey, data = cachedWeatherData, horizon = currentForecastHorizon) {
  if (!data) return;
  const els = getElements();
  if (!els.factorModal || !els.modalContentBody) return;

  currentOpenModalFactor = factorKey;
  const fc = getForecastContext(data, horizon);
  const hourly = data.hourly || {};
  const currentHourIdx = getCurrentHourIndex(hourly.time, data.current?.time);
  const targetIdx = fc.targetHourIdx;

  let factorNum = '01';
  let factorTitle = '';
  let statusPillClass = 'pill-green';
  let statusText = 'Condición normal';
  let heroVal = '--';
  let heroUnit = '';
  let heroTag = fc.isRealTime ? 'Lectura en tiempo real' : `Proyección ${fc.targetTimeStr} h (+${fc.badgeText})`;
  let telemetryItems = [];
  let controlsList = [];
  let legalCitations = [];

  if (factorKey === 'uv') {
    factorNum = '01';
    factorTitle = 'Radiación Solar Ultravioleta (UV)';
    const currentUV = hourly.uv_index ? (hourly.uv_index[currentHourIdx] ?? 0) : 0;
    const targetUV = fc.isRealTime ? currentUV : fc.getValue('uv_index', 0);
    const dailyMaxUV = data?.daily?.uv_index_max?.[0] ?? targetUV;
    const sunrise = data?.daily?.sunrise?.[0]?.slice(11, 16) || '05:45';
    const sunset = data?.daily?.sunset?.[0]?.slice(11, 16) || '18:15';

    heroVal = targetUV.toFixed(1);
    heroUnit = 'UVI';

    if (targetUV < 0.2) {
      statusText = 'Turno nocturno (0.0 UVI)';
      statusPillClass = 'pill-green';
    } else if (targetUV >= 11) {
      statusText = 'Extremadamente alto (Severo)';
      statusPillClass = 'pill-red';
    } else if (targetUV >= 8) {
      statusText = 'Muy alto (Restricción)';
      statusPillClass = 'pill-red';
    } else if (targetUV >= 6) {
      statusText = 'Alto (Atención)';
      statusPillClass = 'pill-amber';
    } else {
      statusText = 'Bajo / Moderado';
      statusPillClass = 'pill-green';
    }

    telemetryItems = [
      { label: 'UVI proyectado / instantáneo', val: `${targetUV.toFixed(1)} UVI`, desc: 'Índice de radiación global en superficie' },
      { label: 'Pico solar diurno previsto', val: `${dailyMaxUV.toFixed(1)} UVI`, desc: 'Máxima irradiancia eritemática esperada' },
      { label: 'Ventana crítica de exposición', val: '10:00 h – 15:30 h', desc: 'Horario con mayor carga de fotones actínicos' },
      { label: 'Ciclo astronómico solar', val: `Orto: ${sunrise} • Ocaso: ${sunset}`, desc: 'Horas de salida y puesta del sol' }
    ];

    controlsList = [
      'Aplicación obligatoria de bloqueador solar de amplio espectro FPS 50+ en rostro, cuello y orejas cada 2 horas (o cada 60 min en caso de transpiración profusa).',
      'Uso permanente de lentes de seguridad con filtro ultravioleta UV400 certificado (norma técnica ANSI Z87.1 / EN 166).',
      'Uso de cubrenuca tipo legionario adosado al casco de seguridad y camisas de manga larga 100% algodón de tejido cerrado.',
      'Habilitación de mallas raschel con porcentaje de sombra mínimo del 80% o toldos desmontables en frentes de trabajo fijos.',
      'Rotación obligatoria de cuadrillas hacia zonas bajo sombra durante el cenit solar (11:00 h a 14:00 h).'
    ];

    legalCitations = [
      '<strong>Ley N° 30102:</strong> Dispone medidas preventivas contra los efectos nocivos para la salud por la exposición prolongada a la radiación solar.',
      '<strong>D.S. 024-2016-EM:</strong> Art. 101 y Art. 102 (Higiene ocupacional y agentes físicos no ionizantes en minería).',
      '<strong>R.M. 375-2008-TR:</strong> Norma básica de ergonomía y de procedimiento de evaluación de riesgo disergonómico.'
    ];
  } else if (factorKey === 'lluvia') {
    factorNum = '02';
    factorTitle = 'Precipitación Pluvial y Escorrentía';
    const currentPrecip = data?.current?.precipitation ?? 0;
    const targetPrecip = fc.isRealTime ? currentPrecip : fc.getValue('precipitation', 0);
    const currentProb = hourly.precipitation_probability?.[currentHourIdx] ?? 0;
    const targetProb = fc.isRealTime ? currentProb : fc.getValue('precipitation_probability', 0);
    const dailySum = data?.daily?.precipitation_sum?.[0] ?? targetPrecip;

    heroVal = targetPrecip.toFixed(1);
    heroUnit = 'mm/h';

    let frictionEstimate = '0.80 (Seco)';
    if (targetPrecip >= 5.0) {
      statusText = 'Lluvia intensa (Restricción)';
      statusPillClass = 'pill-red';
      frictionEstimate = '< 0.30 (Crítico / Fango)';
    } else if (targetPrecip >= 1.0) {
      statusText = 'Lluvia moderada (Atención)';
      statusPillClass = 'pill-amber';
      frictionEstimate = '0.45 (Húmedo / Resbaladizo)';
    } else if (targetPrecip > 0 || targetProb >= 40) {
      statusText = 'Llovizna / Probabilidad alta';
      statusPillClass = 'pill-amber';
      frictionEstimate = '0.55 (Superficie húmeda)';
    } else {
      statusText = 'Superficie seca / Despejado';
      statusPillClass = 'pill-green';
    }

    telemetryItems = [
      { label: 'Intensidad de precipitación', val: `${targetPrecip.toFixed(1)} mm/h`, desc: 'Tasa pluvial proyectada en superficie' },
      { label: 'Probabilidad de lluvia', val: `${targetProb}%`, desc: 'Certeza estadística del ensamble meteorológico' },
      { label: 'Acumulado 24 horas', val: `${dailySum.toFixed(1)} mm`, desc: 'Volumen total de agua previsto en la jornada' },
      { label: 'Coeficiente de fricción calzada', val: frictionEstimate, desc: 'Adherencia estimada neumático-suelo en acarreo' }
    ];

    controlsList = [
      'Reducción de velocidad máxima vehicular a 20 km/h en rampas principales de acarreo y accesos a tajos/plataformas.',
      'Aumento de la distancia de seguimiento entre equipos pesados y vehículos ligeros a un mínimo de 60 metros.',
      'Verificación y descolmatación continua de zanjas de coronación, cunetas de drenaje y activación de bombas de achique.',
      'Inspección obligatoria de la altura de bermas de seguridad (mínimo 3/4 del diámetro del neumático del camión de mayor porte).',
      'Dotación de trajes impermeables de dos piezas de alta visibilidad (chaqueta y pantalón) con cintas reflectivas y botas de jebe con puntera de acero.'
    ];

    legalCitations = [
      '<strong>D.S. 024-2016-EM:</strong> Art. 272 (Tránsito en operaciones mineras bajo lluvia) y Art. 248 (Estabilidad de taludes y drenaje).',
      '<strong>Norma Técnica G.050:</strong> Seguridad durante la Construcción, Art. 26 (Protección frente a condiciones climáticas adversas).'
    ];
  } else if (factorKey === 'viento') {
    factorNum = '03';
    factorTitle = 'Velocidad del Viento y Ráfagas';
    const currentSpeed = data?.current?.wind_speed_10m ?? 0;
    const currentGust = data?.current?.wind_gusts_10m ?? currentSpeed;
    const current80m = hourly.wind_speed_80m?.[currentHourIdx] ?? currentSpeed;
    const targetSpeed = fc.isRealTime ? currentSpeed : fc.getValue('wind_speed_10m', 0);
    const targetGust = fc.isRealTime ? currentGust : fc.getValue('wind_gusts_10m', targetSpeed);
    const targetBoom = fc.isRealTime ? current80m : (hourly.wind_speed_80m?.[targetIdx] ?? targetSpeed);
    const windDir = fc.getValue('wind_direction_10m', 0);
    const compass = getCompassDirection(windDir);

    const effSpeed = Math.max(targetSpeed, targetGust);
    heroVal = `${Math.round(targetSpeed)}`;
    heroUnit = 'km/h';

    if (effSpeed >= 50.0) {
      statusText = 'Viento muy fuerte (Crítico)';
      statusPillClass = 'pill-red';
    } else if (effSpeed >= 32.0) {
      statusText = 'Viento fuerte (Restricción izaje)';
      statusPillClass = 'pill-amber';
    } else if (effSpeed >= 25.0) {
      statusText = 'Brisa moderada';
      statusPillClass = 'pill-amber';
    } else {
      statusText = 'Condición normal / Favorable';
      statusPillClass = 'pill-green';
    }

    telemetryItems = [
      { label: 'Velocidad a 10m (Anemómetro)', val: `${Math.round(targetSpeed)} km/h (${(targetSpeed / 3.6).toFixed(1)} m/s)`, desc: 'Medición estándar OMM sobre mástil' },
      { label: 'Ráfagas pico previstas', val: `${Math.round(targetGust)} km/h (${(targetGust / 3.6).toFixed(1)} m/s)`, desc: 'Pico turbulento instantáneo en superficie' },
      { label: 'Viento en pluma (80m)', val: `${Math.round(targetBoom)} km/h (${(targetBoom / 3.6).toFixed(1)} m/s)`, desc: 'Velocidad estimada a altura de grúas móviles' },
      { label: 'Rumbo y dirección azimutal', val: `${windDir}° (${compass})`, desc: 'Orientación del flujo eólico dominante' }
    ];

    controlsList = [
      'Detención obligatoria e inmediata de izajes críticos con grúas móviles o torre al superar 32 km/h (8.8 m/s).',
      'Paralización de todo trabajo en altura (andamios multidireccionales, plataformas elevadoras y canastillas) al superar 50 km/h (13.8 m/s).',
      'Aseguramiento y arriostramiento de coberturas provisionales, planchas de calamina, cartelería y materiales ligeros.',
      'Uso obligatorio y ajuste ceñido de barbiquejo elástico de 3 o 4 puntos en casco de seguridad.',
      'Control estricto de estabilización con vientos o retenidas de soga para cualquier carga suspendida en maniobras permitidas.'
    ];

    legalCitations = [
      '<strong>D.S. 024-2016-EM:</strong> Art. 385 (Operación de grúas e izajes según viento) y Art. 134 (Trabajos en altura).',
      '<strong>Norma Técnica G.050:</strong> Art. 18 (Equipos de izaje y grúas) y Art. 19 (Seguridad en andamios y trabajos verticales).'
    ];
  } else if (factorKey === 'tormenta') {
    factorNum = '04';
    factorTitle = 'Alerta de Tormenta Eléctrica y Descargas';
    const currentCape = hourly.cape?.[currentHourIdx] ?? 0;
    const targetCape = fc.isRealTime ? currentCape : fc.getValue('cape', 0);
    const targetCode = fc.getValue('weather_code', 0);
    const isStormCode = WEATHER_CODES_TORMENTA.includes(targetCode);

    heroVal = `${Math.round(targetCape)}`;
    heroUnit = 'J/kg';

    let proximityText = '> 50 km (Sin riesgo directo)';
    if (isStormCode) {
      statusText = 'Alerta Roja (Tormenta activa <16 km)';
      statusPillClass = 'pill-red';
      proximityText = '< 16 km (Evacuación inmediata)';
    } else if (targetCape >= 2500) {
      statusText = 'Alerta Naranja (Inestabilidad severa)';
      statusPillClass = 'pill-red';
      proximityText = '16 – 32 km (Cese de izajes y altura)';
    } else if (targetCape >= 1500) {
      statusText = 'Alerta Amarilla (Inestabilidad moderada)';
      statusPillClass = 'pill-amber';
      proximityText = '32 – 50 km (Aviso preventivo)';
    } else {
      statusText = 'Atmósfera estable (Normal)';
      statusPillClass = 'pill-green';
    }

    telemetryItems = [
      { label: 'Energía Convectiva CAPE', val: `${Math.round(targetCape)} J/kg`, desc: 'Convective Available Potential Energy en atmósfera' },
      { label: 'Proximidad estimada de celda', val: proximityText, desc: 'Radio de acción respecto al frente de trabajo' },
      { label: 'Código meteorológico WMO', val: `WMO ${targetCode} (${getWMOCodeDesc(targetCode)})`, desc: 'Clasificación de hidrometeoro OMM' },
      { label: 'Nivel operacional de tormenta', val: isStormCode ? 'Alerta Roja (Crítica)' : (targetCape >= 1500 ? 'Alerta Amarilla/Naranja' : 'Condición Verde'), desc: 'Estándar D.S. 024-2016-EM / NFPA 780' }
    ];

    controlsList = [
      'Alerta Amarilla (32 a 50 km): Aviso preventivo radial a todas las cuadrillas en tajos, cerros y áreas despejadas.',
      'Alerta Naranja (16 a 32 km): Suspensión inmediata de izajes, cese de trabajos en torres/postes y manipulación de explosivos.',
      'Alerta Roja (<16 km o tormenta detectada): Evacuación obligatoria a refugios Jaula de Faraday (camionetas cerradas o módulos aterrados).',
      'Regla 30/30 OMM / NFPA 780: Esperar 30 minutos contados a partir del último trueno o descarga antes de autorizar el reingreso al campo.',
      'Prohibido terminantemente guarecerse bajo árboles solitarios, postes eléctricos, torres de antena o estructuras metálicas abiertas.'
    ];

    legalCitations = [
      '<strong>D.S. 024-2016-EM:</strong> Art. 380 (Sistemas de alerta temprana de tormentas eléctricas) y Art. 286 (Seguridad en voladura).',
      '<strong>Norma NFPA 780:</strong> Standard for the Installation of Lightning Protection Systems.',
      '<strong>Recomendaciones Técnicas OMM:</strong> Guía de gestión de riesgo por rayos y tormentas convectivas.'
    ];
  } else if (factorKey === 'temperatura') {
    factorNum = '05';
    factorTitle = 'Estrés Térmico y Confort Biometeorológico';
    const currentTemp = data?.current?.temperature_2m ?? 18;
    const currentApparent = data?.current?.apparent_temperature ?? currentTemp;
    const targetTemp = fc.isRealTime ? currentTemp : fc.getValue('temperature_2m', 18);
    const targetApparent = fc.isRealTime ? currentApparent : fc.getValue('apparent_temperature', targetTemp);
    const humidity = fc.getValue('relative_humidity_2m', 50);
    const pressure = data?.current?.surface_pressure ?? (hourly.surface_pressure?.[targetIdx] ?? 1013);

    heroVal = `${targetTemp.toFixed(1)}`;
    heroUnit = '°C';

    if (targetTemp <= -5 || targetTemp >= 38) {
      statusText = 'Estrés extremo (Crítico)';
      statusPillClass = 'pill-red';
    } else if (targetTemp <= 0 || targetTemp >= 32) {
      statusText = 'Estrés térmico (Atención)';
      statusPillClass = 'pill-amber';
    } else {
      statusText = 'Rango confortable / Seguro';
      statusPillClass = 'pill-green';
    }

    telemetryItems = [
      { label: 'Temperatura de bulbo seco', val: `${targetTemp.toFixed(1)} °C`, desc: 'Temperatura ambiental registrada a 2m' },
      { label: 'Temperatura aparente (sensación)', val: `${targetApparent.toFixed(1)} °C`, desc: 'Índice bioclimático considerando viento y humedad' },
      { label: 'Humedad relativa del aire', val: `${humidity}%`, desc: 'Grado de saturación hídrica atmosférica' },
      { label: 'Presión barométrica', val: `${Math.round(pressure)} hPa`, desc: 'Presión atmosférica en cota de superficie' }
    ];

    controlsList = [
      'Suministro obligatorio y continuo de agua fresca y sales de hidratación oral (mínimo 500 a 750 ml por hora por trabajador expuesto).',
      'Régimen de trabajo/descanso según ISO 7243: si la sensación térmica excede 32°C, implementar pausas de 15 a 30 min por hora a la sombra.',
      'En bajas temperaturas (<0°C): dotación de sistema de tres capas térmicas (primera capa térmica, polar intermedio y casaca cortaviento impermeable).',
      'Monitoreo activo de signos tempranos de fatiga térmica, golpe de calor o principio de hipotermia en personal de campo.',
      'Disponibilidad de zonas climatizadas de recuperación fisiológica en campamentos y garitas operativas.'
    ];

    legalCitations = [
      '<strong>Norma ISO 7243:</strong> Ergonomics of the thermal environment - Assessment of heat stress using the WBGT index.',
      '<strong>R.M. 375-2008-TR:</strong> Título VII (Factores ambientales de riesgo ergonómico y carga térmica).',
      '<strong>D.S. 024-2016-EM:</strong> Art. 103 (Estrés térmico por frío o calor en labores mineras).'
    ];
  } else if (factorKey === 'nieve') {
    factorNum = '06';
    factorTitle = 'Nieve, Heladas e Isoterma de Congelamiento';
    const currentSnow = data?.current?.snowfall ?? (hourly.snowfall?.[currentHourIdx] ?? 0);
    const targetSnow = fc.isRealTime ? currentSnow : fc.getValue('snowfall', 0);
    const currentDepthCm = Math.round((hourly.snow_depth?.[currentHourIdx] ?? 0) * 100);
    const targetDepthCm = Math.round((fc.getValue('snow_depth', 0)) * 100);
    const freezingLevel = Math.round(fc.getValue('freezing_level_height', 4500));

    heroVal = targetSnow > 0 ? targetSnow.toFixed(1) : targetDepthCm.toString();
    heroUnit = targetSnow > 0 ? 'cm/h' : 'cm acum';

    let blackIce = 'Bajo (Calzada despejada)';
    if (targetSnow >= 5.0) {
      statusText = 'Nevada intensa (Crítica)';
      statusPillClass = 'pill-red';
      blackIce = 'Crítico (Hielo negro latente)';
    } else if (targetSnow >= 1.0 || targetDepthCm > 0) {
      statusText = 'Nevada / Escarcha en vía';
      statusPillClass = 'pill-amber';
      blackIce = 'Moderado / Alto en curvas y sombra';
    } else {
      statusText = 'Sin nieve / Despejado';
      statusPillClass = 'pill-green';
    }

    telemetryItems = [
      { label: 'Tasa horaria de nevada', val: `${targetSnow.toFixed(1)} cm/h`, desc: 'Intensidad de precipitación sólida proyectada' },
      { label: 'Espesor acumulado en rasante', val: `${targetDepthCm} cm`, desc: 'Capa de nieve acumulada sobre el suelo' },
      { label: 'Cota de congelamiento (Isoterma 0°)', val: `${freezingLevel} m s.n.m.`, desc: 'Altitud donde la temperatura del aire alcanza 0°C' },
      { label: 'Riesgo de hielo negro (Black Ice)', val: blackIce, desc: 'Película delgada transparente de alta resbaladicidad' }
    ];

    controlsList = [
      'Montaje obligatorio de cadenas para nieve en neumáticos motrices de vehículos de acarreo y camionetas 4x4.',
      'Verificación diaria de anticongelante en radiadores y funcionamiento de calefacción y desempañador en cabinas.',
      'Despeje mecánico de vías con motoniveladora y esparcido de sal o arena fina en pendientes pronunciadas.',
      'Uso obligatorio de botas de seguridad térmicas con suela antideslizante para nieve y polainas impermeables.',
      'Prohibición de tránsito peatonal sobre taludes nevados o estructuras elevadas con escarcha acumulada.'
    ];

    legalCitations = [
      '<strong>D.S. 024-2016-EM:</strong> Art. 273 (Operación vehicular bajo nieve o calzada con hielo) y Art. 104 (Operaciones en alta montaña).',
      '<strong>Manual de Carreteras MTC:</strong> Especificaciones técnicas de mantenimiento vial en temporada invernal.'
    ];
  } else if (factorKey === 'visibilidad') {
    factorNum = '07';
    factorTitle = 'Visibilidad Horizontal en Vías y Operaciones';
    const currentVis = data?.current?.visibility ?? (hourly.visibility?.[currentHourIdx] ?? 10000);
    const targetVis = fc.isRealTime ? currentVis : fc.getValue('visibility', 10000);
    const visMeters = Math.round(targetVis);
    const visKm = (targetVis / 1000).toFixed(1);

    heroVal = visKm;
    heroUnit = 'km';

    let speedLimit = '60 km/h (Velocidad estándar)';
    if (targetVis < 100) {
      statusText = 'Visibilidad nula / densa (Paralización)';
      statusPillClass = 'pill-red';
      speedLimit = 'Paralización de tránsito vehicular';
    } else if (targetVis < 500) {
      statusText = 'Niebla densa (Restricción severa)';
      statusPillClass = 'pill-red';
      speedLimit = 'Máx 20 km/h (Con escolta obligatoria)';
    } else if (targetVis < 2000) {
      statusText = 'Bruma / Visibilidad reducida';
      statusPillClass = 'pill-amber';
      speedLimit = 'Máx 40 km/h (Luces y neblineros)';
    } else {
      statusText = 'Visibilidad óptima / Despejado';
      statusPillClass = 'pill-green';
    }

    telemetryItems = [
      { label: 'Alcance visual horizontal', val: `${visKm} km (${visMeters} m)`, desc: 'Distancia nítida de detección de obstáculos' },
      { label: 'Condición atmosférica óptica', val: targetVis < 1000 ? 'Presencia de niebla / hidrometeoro denso' : 'Atmósfera diáfana / despejada', desc: 'Fenómeno reductor de visibilidad' },
      { label: 'Velocidad vehicular permitida', val: speedLimit, desc: 'Límite de velocidad en pistas de acarreo' },
      { label: 'Balizamiento lumínico exigido', val: 'Neblineros ámbar + pértiga LED + circulinas', desc: 'Sistemas de señalización visual activa' }
    ];

    controlsList = [
      'Encendido obligatorio permanente de luces bajas y faros neblineros de penetración ámbar en toda la flota móvil.',
      'Inspección y uso mandatorio de pértiga telescópica reglamentaria (4.20 m) con banderola reflectiva y luz estroboscópica LED.',
      'Uso obligatorio de chaleco de seguridad clase 3 con cintas reflectivas de 2 pulgadas por todo el personal peatonal.',
      'Si la visibilidad cae por debajo de 100 metros: velocidad restringida a 20 km/h y avance únicamente en caravana guiada por camioneta escolta.',
      'Si la visibilidad es menor a 50 metros: suspensión total inmediata de tránsito y estacionamiento en bermas de seguridad autorizadas.'
    ];

    legalCitations = [
      '<strong>D.S. 024-2016-EM:</strong> Art. 275 (Reglas de tránsito minero con visibilidad restringida por niebla, polvo o lluvia).',
      '<strong>D.S. 016-2009-MTC:</strong> Texto Único Ordenado del Reglamento Nacional de Tránsito.'
    ];
  } else if (factorKey === 'suelo') {
    factorNum = '08';
    factorTitle = 'Humedad de Suelo y Capacidad Portante';
    const currentMoisture = hourly.soil_moisture_0_to_7cm?.[currentHourIdx] ?? 0.15;
    const targetMoisture = fc.isRealTime ? currentMoisture : fc.getValue('soil_moisture_0_to_7cm', 0.15);
    const moisturePct = Math.round(targetMoisture * 100);

    heroVal = `${moisturePct}`;
    heroUnit = '% saturación';

    let bearingCap = '> 250 kPa (Suelo firme)';
    if (targetMoisture >= 0.40) {
      statusText = 'Suelo saturado (Riesgo de hundimiento)';
      statusPillClass = 'pill-red';
      bearingCap = '< 80 kPa (Lodo saturado / Inestable)';
    } else if (targetMoisture >= 0.28) {
      statusText = 'Suelo húmedo (Consistencia plástica)';
      statusPillClass = 'pill-amber';
      bearingCap = '~ 150 kPa (Capacidad portante reducida)';
    } else {
      statusText = 'Suelo firme / Seco';
      statusPillClass = 'pill-green';
    }

    telemetryItems = [
      { label: 'Humedad volumétrica (0-7 cm)', val: `${targetMoisture.toFixed(3)} m³/m³ (${moisturePct}%)`, desc: 'Contenido hídrico en la capa superficial de apoyo' },
      { label: 'Capacidad portante para grúas', val: bearingCap, desc: 'Tensión admisible de apoyo para estabilizadores' },
      { label: 'Comportamiento mecánico', val: targetMoisture >= 0.40 ? 'Saturado / Riesgo de fluencia' : (targetMoisture >= 0.28 ? 'Plástico / Húmedo' : 'Firme y consolidado'), desc: 'Estado físico del terreno bajo carga' },
      { label: 'Retranqueo mínimo a talud/zanja', val: 'Mínimo 3.0 m (Norma G.050)', desc: 'Distancia de seguridad obligatoria a borde libre' }
    ];

    controlsList = [
      'Uso obligatorio de almohadillas o tacos de repartición de carga (outrigger pads) de polímero de alta densidad o madera dura bajo los estabilizadores de grúas móviles.',
      'Inspección visual previa del punto de apoyo para descartar grietas de tensión, tubificación o blandones antes de posicionar maquinaria pesada.',
      'Prohibición de estacionar o transitar maquinaria pesada a menos de 3 metros del borde superior de excavaciones o taludes no entibados.',
      'Monitoreo geotécnico de infiltración y escorrentía en botaderos y plataformas tras precipitaciones para prevenir desprendimientos.',
      'Uso de calzado de seguridad con suela profunda autolimpiante para evitar caídas en superficies lodosas.'
    ];

    legalCitations = [
      '<strong>D.S. 024-2016-EM:</strong> Art. 248 y Art. 249 (Estabilidad de taludes, bermas de seguridad y control de pisos).',
      '<strong>Norma Técnica G.050:</strong> Seguridad durante la Construcción, Art. 18 (Equipos de izaje y estabilización) y Art. 26 (Excavaciones y zanjas).'
    ];
  }

  const timelineHTML = renderModalTimeline(factorKey, data, currentHourIdx, fc);

  const telemetryHTML = telemetryItems.map(item => `
    <div class="modal-telemetry-item">
      <div class="telemetry-item-label">${escapeHTML(item.label)}</div>
      <div class="telemetry-item-val">${escapeHTML(item.val)}</div>
      <div class="telemetry-item-desc">${escapeHTML(item.desc)}</div>
    </div>
  `).join('');

  const controlsHTML = controlsList.map(ctrl => `
    <div class="control-item-row">
      <div class="control-icon-circle" aria-hidden="true">&bull;</div>
      <div class="control-text-content">${escapeHTML(ctrl)}</div>
    </div>
  `).join('');

  const legalHTML = legalCitations.map(cit => `
    <div class="legal-norm-badge">${cit}</div>
  `).join('');

  els.modalContentBody.innerHTML = `
    <div class="modal-header-top">
      <div class="modal-factor-badge">
        <span class="modal-factor-num">${factorNum}</span>
        <span>Análisis Técnico SST</span>
      </div>
      <span class="risk-status-pill ${statusPillClass}">${statusText}</span>
    </div>

    <div class="modal-title-row">
      <h2 id="modal-factor-title" class="modal-title">${escapeHTML(factorTitle)}</h2>
      <p class="modal-subtitle">Monitoreo operacional, evolución temporal y controles normativos de campo</p>
    </div>

    <div class="modal-hero-strip">
      <span class="modal-hero-val">${heroVal}</span>
      <span class="modal-hero-unit">${heroUnit}</span>
      <span class="modal-hero-tag">${heroTag}</span>
    </div>

    <div class="modal-section-heading">Telemetría de precisión (Sensores / Open-Meteo)</div>
    <div class="modal-telemetry-grid">
      ${telemetryHTML}
    </div>

    ${timelineHTML}

    <div class="modal-controls-card">
      <div class="modal-section-heading" style="color:#f8fafc; margin-bottom: 8px;">Medidas de control operacional y EPP exigido</div>
      ${controlsHTML}
    </div>

    <div class="modal-legal-footer">
      <div class="modal-section-heading" style="margin-bottom: 6px;">Marco normativo y base legal aplicable</div>
      ${legalHTML}
    </div>
  `;

  els.factorModal.removeAttribute('hidden');
  els.factorModal.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => {
    els.factorModal.classList.add('active');
  });
  document.body.classList.add('modal-open');
  els.modalCloseBtn?.focus?.();
}

export function closeFactorDetailModal() {
  const els = getElements();
  if (!els.factorModal) return;
  els.factorModal.classList.remove('active');
  els.factorModal.setAttribute('hidden', '');
  els.factorModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  currentOpenModalFactor = null;
}
