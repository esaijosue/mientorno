/**
 * ui.js - Manejo visual de la interfaz de usuario
 * Proyecto: MiEntorno
 * 
 * Réplica exacta del estilo de la referencia: mapa satelital inmersivo con tarjeta de cristal
 * flotante, píldoras translúcidas y panel inferior de riesgos con tarjetas oscuras tintadas.
 * Tipografía en mayúsculas y minúsculas naturales (sentence case), sin mayúsculas sostenidas ni guiones largos.
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
    appName: document.getElementById('app-name'),
    btnLocation: document.getElementById('btn-location'),
    topBtnGps: document.getElementById('top-btn-gps'),
    locationStatus: document.getElementById('location-status'),
    accuracyAlert: document.getElementById('accuracy-alert'),
    coordsDisplay: document.getElementById('coords-display'),
    searchInput: document.getElementById('search-input'),
    searchResults: document.getElementById('search-results'),
    cardsContainer: document.getElementById('cards-container'),
    btnRefresh: document.getElementById('btn-refresh'),
    pillLocationText: document.getElementById('pill-location-text'),
    pillSelectLocation: document.getElementById('pill-select-location'),
    floatingKpiTitle: document.getElementById('floating-kpi-title'),
    floatingKpiSubtitle: document.getElementById('floating-kpi-subtitle'),
    floatingKpiValue: document.getElementById('floating-kpi-value'),
    floatingKpiUnit: document.getElementById('floating-kpi-unit')
  };

  if (elements.appName) {
    elements.appName.textContent = APP_NAME;
  }

  // Al hacer clic en la píldora de ubicación del mapa, enfocar el buscador
  if (elements.pillSelectLocation && elements.searchInput) {
    elements.pillSelectLocation.addEventListener('click', () => {
      elements.searchInput.focus();
      elements.searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

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
  const topBtn = getElements().topBtnGps;
  if (btn) {
    btn.disabled = isLoading;
    btn.innerHTML = isLoading
      ? `<div class="spinner-ring" aria-hidden="true"></div><span>${text || 'Obteniendo GPS...'}</span>`
      : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg><span>${text || 'Usar mi ubicación GPS'}</span>`;
  }
  if (topBtn) {
    topBtn.disabled = isLoading;
    topBtn.classList.toggle('spinning', isLoading);
  }
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
 * Actualiza la hora de la última sincronización.
 */
export function updateLastRefreshTimestamp() {
  const timeEl = getElements().coordsDisplay;
  if (!timeEl) return;
  // Mantiene formato legible y discreto
}

/**
 * Muestra el estado de la ubicación y la precisión en metros.
 */
export function updateLocationInfo(lat, lon, accuracy, source = 'gps', placeName = null) {
  const els = getElements();
  if (!els.locationStatus || !els.coordsDisplay) return;

  els.coordsDisplay.textContent = `${lat >= 0 ? '+' : ''}${lat.toFixed(4)}°, ${lon >= 0 ? '+' : ''}${lon.toFixed(4)}°`;

  const displayName = placeName || (source === 'inicial' ? 'Lima / Callao' : `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`);
  if (els.pillLocationText) {
    els.pillLocationText.textContent = displayName;
  }

  if (accuracy !== null && accuracy !== undefined) {
    const roundedAcc = Math.round(accuracy);
    els.locationStatus.textContent = `Señal GPS activa (±${roundedAcc} m de precisión)`;

    if (roundedAcc > ACCURACY_WARNING_THRESHOLD_METERS) {
      els.accuracyAlert.innerHTML = `
        <div class="alert-box alert-warning">
          <span class="alert-badge">!</span>
          <div class="alert-text-block">
            <span class="alert-title">Ubicación aproximada (${roundedAcc} m)</span>
            <span class="alert-desc">Puedes arrastrar el radar en el mapa para afinar tu frente de trabajo.</span>
          </div>
        </div>
      `;
      els.accuracyAlert.hidden = false;
    } else {
      els.accuracyAlert.hidden = true;
    }
  } else {
    const label = source === 'arrastre_marcador'
      ? 'Punto reajustado en el mapa'
      : source === 'click_mapa'
        ? 'Punto fijado en el mapa'
        : source === 'busqueda'
          ? `Ubicación: ${displayName}`
          : source === 'inicial'
            ? 'Frente de operación activo'
            : 'Ubicación recuperada de sesión';

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
  const alertClass = type === 'error' ? 'alert-danger' : type === 'warning' ? 'alert-warning' : 'alert-info';
  const badgeChar = type === 'error' ? '!' : type === 'warning' ? '!' : 'i';

  alertEl.innerHTML = `
    <div class="alert-box ${alertClass}">
      <span class="alert-badge">${badgeChar}</span>
      <div class="alert-text-block">
        <span class="alert-desc">${escapeHTML(message)}</span>
      </div>
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
    li.className = 'search-item';
    li.innerHTML = `
      <div class="search-item-title">${escapeHTML(item.name)}</div>
      <div class="search-item-sub">${escapeHTML(item.displayName)}</div>
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
 * Oculta la lista de resultados de búsqueda.
 */
export function hideSearchResults() {
  const listEl = getElements().searchResults;
  if (listEl) {
    listEl.hidden = true;
  }
}

/**
 * =========================================================================
 * RENDERIZADO DE TARJETAS DE RIESGO
 * =========================================================================
 */

export function renderRiskCards(weatherData) {
  const els = getElements();
  if (!els.cardsContainer) return;
  els.cardsContainer.innerHTML = '';

  const riskSummary = {
    leadingTitle: 'Condición normal',
    leadingSubtitle: 'Operaciones de campo',
    leadingValue: 'Seguro',
    leadingUnit: '',
    severityScore: 0
  };

  // 1. Radiación UV
  try {
    const uv = createUVCard(weatherData, riskSummary);
    els.cardsContainer.appendChild(uv);
  } catch (err) {
    console.error('Error generando tarjeta UV:', err);
    els.cardsContainer.appendChild(createErrorCard('Radiación UV'));
  }

  // 2. Lluvia por hora
  try {
    const rain = createRainCard(weatherData, riskSummary);
    els.cardsContainer.appendChild(rain);
  } catch (err) {
    console.error('Error generando tarjeta Lluvia:', err);
    els.cardsContainer.appendChild(createErrorCard('Lluvia y precipitación'));
  }

  // 3. Viento y ráfagas
  try {
    const wind = createWindCard(weatherData, riskSummary);
    els.cardsContainer.appendChild(wind);
  } catch (err) {
    console.error('Error generando tarjeta Viento:', err);
    els.cardsContainer.appendChild(createErrorCard('Viento y ráfagas'));
  }

  // 4. Tormenta eléctrica
  try {
    const storm = createThunderstormCard(weatherData, riskSummary);
    els.cardsContainer.appendChild(storm);
  } catch (err) {
    console.error('Error generando tarjeta Tormenta:', err);
    els.cardsContainer.appendChild(createErrorCard('Tormenta eléctrica'));
  }

  // Actualizar tarjeta de cristal flotante sobre el mapa satelital
  updateFloatingMapCard(riskSummary);
}

/**
 * Actualiza la tarjeta de cristal flotante sobre el mapa satelital
 * (réplica exacta de la tarjeta 'Passenger Load 87%' de la referencia).
 */
function updateFloatingMapCard(summary) {
  const els = getElements();
  if (!els.floatingKpiTitle || !els.floatingKpiValue) return;

  els.floatingKpiTitle.textContent = summary.leadingTitle;
  els.floatingKpiSubtitle.textContent = summary.leadingSubtitle;
  els.floatingKpiValue.textContent = summary.leadingValue;
  els.floatingKpiUnit.textContent = summary.leadingUnit;
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
function createUVCard(data, summary) {
  const currentHourIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const currentUV = data?.hourly?.uv_index ? (data.hourly.uv_index[currentHourIdx] ?? 0) : 0;
  const maxUV = data?.daily?.uv_index_max?.[0] ?? currentUV;

  const evaluatedValue = Math.max(currentUV, maxUV);
  const rule = REGLAS_UV.find((r) => evaluatedValue >= r.min && evaluatedValue <= r.max) || REGLAS_UV[0];

  // Si el UV es alto o extremo, actualizar tarjeta flotante del mapa
  const score = evaluatedValue >= 11 ? 5 : evaluatedValue >= 8 ? 4 : evaluatedValue >= 6 ? 3 : 1;
  if (score > summary.severityScore) {
    summary.severityScore = score;
    summary.leadingTitle = 'Radiación UV';
    summary.leadingSubtitle = `Nivel ${rule.nivel.toLowerCase()} previsto`;
    summary.leadingValue = maxUV.toFixed(1);
    summary.leadingUnit = 'UV';
  }

  const card = document.createElement('article');
  card.className = `modern-issue-card tone-${rule.color}`;
  card.innerHTML = `
    <div class="issue-card-head">
      <div class="issue-badge-circle">${rule.color === 'rojo' || rule.color === 'rojo-extremo' ? '!' : '•'}</div>
      <div class="issue-titles">
        <h3 class="issue-main-title">Radiación UV: nivel ${rule.nivel.toLowerCase()}</h3>
        <span class="issue-sub-info">Índice actual: ${currentUV.toFixed(1)} &bull; Máximo hoy: ${maxUV.toFixed(1)} UV</span>
      </div>
      <div class="issue-kpi-pill">${maxUV.toFixed(1)} <small>UV</small></div>
    </div>

    <div class="issue-card-body">
      <div class="protocol-box">
        <span class="protocol-label">Medida de control</span>
        <p class="protocol-detail">${escapeHTML(rule.recomendacion)}</p>
      </div>
    </div>
  `;
  return card;
}

/**
 * 2. Tarjeta Lluvia por hora
 */
function createRainCard(data, summary) {
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

  const color = !hasRain
    ? 'verde'
    : maxProb >= 70 || totalPrecip > 5
      ? 'rojo'
      : maxProb >= 40 || totalPrecip > 1
        ? 'naranja'
        : 'amarillo';

  const nivelLabel = !hasRain ? 'Seco' : maxProb >= 70 ? 'Lluvia intensa' : 'Lluvia probable';

  const recomendacion = !hasRain
    ? 'Vías secas. Tránsito de volquetes y equipos móviles sin restricción por humedad.'
    : color === 'rojo'
      ? 'Pistas resbaladizas y riesgo de taludes: reducir velocidad en ruta y revisar drenajes.'
      : 'Uso de ropa impermeable de campo y precaución al subir o bajar de equipos móviles.';

  const score = color === 'rojo' ? 4 : color === 'naranja' ? 3 : color === 'amarillo' ? 2 : 0;
  if (score > summary.severityScore) {
    summary.severityScore = score;
    summary.leadingTitle = 'Lluvia probable';
    summary.leadingSubtitle = nextRainText;
    summary.leadingValue = `${maxProb}%`;
    summary.leadingUnit = 'prob';
  }

  // Generar barras del histograma
  let barsHTML = '';
  for (let i = 0; i < times.length; i++) {
    const prob = probs[i] || 0;
    const mm = amounts[i] || 0;
    const hourLabel = times[i].slice(11, 13);
    const heightPct = Math.max(6, prob);
    const isPeak = prob >= 40;
    const showLabel = i % 4 === 0 || i === times.length - 1;

    barsHTML += `
      <div class="chart-col" title="${hourLabel}:00 h &bull; ${prob}% &bull; ${mm.toFixed(1)} mm">
        <div class="chart-bar ${isPeak ? 'bar-alert' : ''}" style="height: ${heightPct}%;"></div>
        <span class="chart-hour">${showLabel ? hourLabel : ''}</span>
      </div>
    `;
  }

  const card = document.createElement('article');
  card.className = `modern-issue-card tone-${color}`;
  card.innerHTML = `
    <div class="issue-card-head">
      <div class="issue-badge-circle">${hasRain ? '!' : '•'}</div>
      <div class="issue-titles">
        <h3 class="issue-main-title">Lluvia: ${nivelLabel.toLowerCase()}</h3>
        <span class="issue-sub-info">${escapeHTML(nextRainText)}</span>
      </div>
      <div class="issue-kpi-pill">${maxProb}% <small>prob</small></div>
    </div>

    <div class="issue-card-body">
      <div class="rain-mini-chart">
        <div class="chart-labels-row">
          <span>Próximas 24 horas</span>
          <span>Pico máximo: ${maxProb}%</span>
        </div>
        <div class="chart-bars-track">
          ${barsHTML}
        </div>
      </div>

      <div class="protocol-box">
        <span class="protocol-label">Medida de control</span>
        <p class="protocol-detail">${escapeHTML(recomendacion)}</p>
      </div>
    </div>
  `;
  return card;
}

/**
 * 3. Tarjeta Viento y ráfagas
 */
function createWindCard(data, summary) {
  const currentSpeed = data?.current?.wind_speed_10m ?? 0;
  const currentGust = data?.current?.wind_gusts_10m ?? currentSpeed;

  const currentIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const next12Gusts = data?.hourly?.wind_gusts_10m?.slice(currentIdx, currentIdx + 12) || [];
  const max12hGust = Math.max(currentGust, ...(next12Gusts.length ? next12Gusts : [0]));

  let rule = UMBRALES_VIENTO.NORMAL;
  let nivelLabel = 'Normal';
  let score = 0;

  if (max12hGust > 50) {
    rule = UMBRALES_VIENTO.SUSPENSION;
    nivelLabel = 'Suspensión obligatoria';
    score = 5;
  } else if (max12hGust >= 36) {
    rule = UMBRALES_VIENTO.RESTRICCION;
    nivelLabel = 'Restricción de izajes';
    score = 4;
  } else if (max12hGust >= 25) {
    rule = UMBRALES_VIENTO.PRECAUCION;
    nivelLabel = 'Precaución';
    score = 2;
  }

  if (score > summary.severityScore) {
    summary.severityScore = score;
    summary.leadingTitle = 'Viento y ráfagas';
    summary.leadingSubtitle = `${nivelLabel} en altura`;
    summary.leadingValue = Math.round(max12hGust);
    summary.leadingUnit = 'km/h';
  }

  const card = document.createElement('article');
  card.className = `modern-issue-card tone-${rule.color}`;
  card.innerHTML = `
    <div class="issue-card-head">
      <div class="issue-badge-circle">${score >= 3 ? '!' : '•'}</div>
      <div class="issue-titles">
        <h3 class="issue-main-title">Viento: ${nivelLabel.toLowerCase()}</h3>
        <span class="issue-sub-info">Ráfaga máxima: ${Math.round(max12hGust)} km/h &bull; Sostenido: ${Math.round(currentSpeed)} km/h</span>
      </div>
      <div class="issue-kpi-pill">${Math.round(max12hGust)} <small>km/h</small></div>
    </div>

    <div class="issue-card-body">
      <div class="protocol-box">
        <span class="protocol-label">Medida de control</span>
        <p class="protocol-detail">${escapeHTML(rule.recomendacion)}</p>
      </div>
    </div>
  `;
  return card;
}

/**
 * 4. Tarjeta Tormenta eléctrica
 */
function createThunderstormCard(data, summary) {
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

  let color = capeRule.color;
  let nivelLabel = capeRule.nivel;
  let recomendacion = capeRule.recomendacion;
  let score = level === 'MUY_ALTO' ? 4 : level === 'ALTO' ? 3 : 1;

  if (stormDetected) {
    color = 'rojo';
    nivelLabel = 'Tormenta prevista';
    score = 5;
    const horaMsg = estimatedStormTime ? ` a las ${estimatedStormTime} h.` : '.';
    recomendacion = `Tormenta eléctrica prevista aprox.${horaMsg} Activar detector de rayos y preparar repliegue a refugio.`;
  }

  if (score > summary.severityScore) {
    summary.severityScore = score;
    summary.leadingTitle = 'Tormenta eléctrica';
    summary.leadingSubtitle = stormDetected ? `Prevista a las ${estimatedStormTime || '--:--'} h` : `Energía CAPE ${Math.round(maxCape)} J/kg`;
    summary.leadingValue = Math.round(maxCape);
    summary.leadingUnit = 'J/kg';
  }

  const card = document.createElement('article');
  card.className = `modern-issue-card tone-${color}`;
  card.innerHTML = `
    <div class="issue-card-head">
      <div class="issue-badge-circle">${stormDetected || score >= 3 ? '!' : '•'}</div>
      <div class="issue-titles">
        <h3 class="issue-main-title">Tormenta eléctrica: nivel ${nivelLabel.toLowerCase()}</h3>
        <span class="issue-sub-info">Energía CAPE: ${Math.round(maxCape)} J/kg &bull; ${stormDetected ? `Detección a las ${estimatedStormTime} h` : 'Sin alerta WMO'}</span>
      </div>
      <div class="issue-kpi-pill">${Math.round(maxCape)} <small>J/kg</small></div>
    </div>

    <div class="issue-card-body">
      <div class="protocol-box">
        <span class="protocol-label">Medida de control</span>
        <p class="protocol-detail">${escapeHTML(recomendacion)}</p>
      </div>
    </div>
  `;
  return card;
}

/**
 * Tarjeta de contingencia
 */
function createErrorCard(title) {
  const card = document.createElement('article');
  card.className = 'modern-issue-card tone-gris';
  card.innerHTML = `
    <div class="issue-card-head">
      <div class="issue-badge-circle">•</div>
      <div class="issue-titles">
        <h3 class="issue-main-title">${escapeHTML(title)}</h3>
        <span class="issue-sub-info">Lectura no disponible temporalmente</span>
      </div>
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
