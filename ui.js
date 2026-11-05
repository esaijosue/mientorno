/**
 * ui.js - Manejo visual de la interfaz de usuario
 * Proyecto: MiEntorno
 * 
 * Estilo de misión crítica inspirado en paneles operativos oscuros.
 * Tipografía en minúsculas y mayúsculas naturales (sentence case), sin mayúsculas sostenidas ni guiones largos.
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
    locationStatus: document.getElementById('location-status'),
    accuracyAlert: document.getElementById('accuracy-alert'),
    coordsDisplay: document.getElementById('coords-display'),
    searchInput: document.getElementById('search-input'),
    searchResults: document.getElementById('search-results'),
    cardsContainer: document.getElementById('cards-container'),
    btnRefresh: document.getElementById('btn-refresh'),
    lastUpdated: document.getElementById('last-updated')
  };

  if (elements.appName) {
    elements.appName.textContent = APP_NAME;
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
  if (!btn) return;
  btn.disabled = isLoading;
  btn.innerHTML = isLoading
    ? `
      <div class="spinner-ring" aria-hidden="true"></div>
      <span>${text || 'Obteniendo GPS...'}</span>
    `
    : `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
      </svg>
      <span>${text || 'Usar mi ubicación GPS'}</span>
    `;
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
  const timeEl = getElements().lastUpdated;
  if (!timeEl) return;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  timeEl.textContent = `Actualizado: ${timeStr}`;
}

/**
 * Muestra el estado de la ubicación y la precisión en metros.
 */
export function updateLocationInfo(lat, lon, accuracy, source = 'gps') {
  const els = getElements();
  if (!els.locationStatus || !els.coordsDisplay) return;

  els.coordsDisplay.textContent = `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;

  if (accuracy !== null && accuracy !== undefined) {
    const roundedAcc = Math.round(accuracy);
    els.locationStatus.textContent = `Ubicación GPS (precisión de ±${roundedAcc} m)`;

    if (roundedAcc > ACCURACY_WARNING_THRESHOLD_METERS) {
      els.accuracyAlert.innerHTML = `
        <div class="alert-box alert-warning">
          <span class="alert-dot dot-amber"></span>
          <span>Ubicación aproximada (${roundedAcc} m). Puedes arrastrar el marcador en el mapa para afinar el punto exacto.</span>
        </div>
      `;
      els.accuracyAlert.hidden = false;
    } else {
      els.accuracyAlert.innerHTML = `
        <div class="alert-box alert-success">
          <span class="alert-dot dot-green"></span>
          <span>Señal GPS de alta precisión (±${roundedAcc} m).</span>
        </div>
      `;
      els.accuracyAlert.hidden = false;
    }
  } else {
    const label = source === 'arrastre_marcador'
      ? 'Punto reajustado en el mapa'
      : source === 'click_mapa'
        ? 'Punto fijado en el mapa'
        : source === 'busqueda'
          ? 'Ubicación seleccionada por búsqueda'
          : source === 'inicial'
            ? 'Punto de referencia activo (Lima y Callao)'
            : 'Ubicación guardada en sesión';

    els.locationStatus.textContent = label;

    if (source === 'inicial') {
      els.accuracyAlert.hidden = true;
    } else {
      els.accuracyAlert.innerHTML = `
        <div class="alert-box alert-info">
          <span class="alert-dot dot-blue"></span>
          <span>${label}. Arrastra el marcador en cualquier momento para recalcular los riesgos.</span>
        </div>
      `;
      els.accuracyAlert.hidden = false;
    }
  }
}

/**
 * Muestra mensaje de notificación al usuario.
 */
export function showNotification(message, type = 'error') {
  const alertEl = getElements().accuracyAlert;
  if (!alertEl) return;
  const dotClass = type === 'error' ? 'dot-red' : type === 'warning' ? 'dot-amber' : 'dot-blue';
  const boxClass = type === 'error' ? 'alert-danger' : type === 'warning' ? 'alert-warning' : 'alert-info';

  alertEl.innerHTML = `
    <div class="alert-box ${boxClass}">
      <span class="alert-dot ${dotClass}"></span>
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

  // 1. Radiación UV
  try {
    els.cardsContainer.appendChild(createUVCard(weatherData));
  } catch (err) {
    console.error('Error generando tarjeta UV:', err);
    els.cardsContainer.appendChild(createErrorCard('Radiación UV'));
  }

  // 2. Lluvia por hora
  try {
    els.cardsContainer.appendChild(createRainCard(weatherData));
  } catch (err) {
    console.error('Error generando tarjeta Lluvia:', err);
    els.cardsContainer.appendChild(createErrorCard('Lluvia y precipitación'));
  }

  // 3. Viento y ráfagas
  try {
    els.cardsContainer.appendChild(createWindCard(weatherData));
  } catch (err) {
    console.error('Error generando tarjeta Viento:', err);
    els.cardsContainer.appendChild(createErrorCard('Viento y ráfagas'));
  }

  // 4. Tormenta eléctrica
  try {
    els.cardsContainer.appendChild(createThunderstormCard(weatherData));
  } catch (err) {
    console.error('Error generando tarjeta Tormenta:', err);
    els.cardsContainer.appendChild(createErrorCard('Tormenta eléctrica'));
  }

  updateLastRefreshTimestamp();
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
function createUVCard(data) {
  const currentHourIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const currentUV = data?.hourly?.uv_index ? (data.hourly.uv_index[currentHourIdx] ?? 0) : 0;
  const maxUV = data?.daily?.uv_index_max?.[0] ?? currentUV;

  const evaluatedValue = Math.max(currentUV, maxUV);
  const rule = REGLAS_UV.find((r) => evaluatedValue >= r.min && evaluatedValue <= r.max) || REGLAS_UV[0];

  const card = document.createElement('article');
  card.className = `risk-card status-${rule.color}`;
  card.innerHTML = `
    <header class="risk-card-head">
      <div>
        <h3 class="risk-card-title">Radiación UV</h3>
        <p class="risk-card-subtitle">Índice según escala de la OMS</p>
      </div>
      <span class="badge-status badge-${rule.color}">
        <span class="badge-indicator"></span>
        <span>${rule.nivel}</span>
      </span>
    </header>

    <div class="risk-card-metric-row">
      <div class="metric-main">
        <span class="metric-number">${maxUV.toFixed(1)}</span>
        <span class="metric-unit">máximo hoy</span>
      </div>
      <div class="metric-secondary">
        <span class="metric-sub-label">Valor actual</span>
        <span class="metric-sub-value">${currentUV.toFixed(1)} UV</span>
      </div>
    </div>

    <footer class="risk-card-action">
      <span class="action-tag">Medida de control</span>
      <p class="action-text">${escapeHTML(rule.recomendacion)}</p>
    </footer>
  `;
  return card;
}

/**
 * 2. Tarjeta Lluvia por hora
 */
function createRainCard(data) {
  const currentIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const times = data?.hourly?.time?.slice(currentIdx, currentIdx + 24) || [];
  const probs = data?.hourly?.precipitation_probability?.slice(currentIdx, currentIdx + 24) || [];
  const amounts = data?.hourly?.precipitation?.slice(currentIdx, currentIdx + 24) || [];

  let nextRainText = 'Sin lluvia en las próximas 24 h';
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
      nextRainText = `Próxima lluvia probable: ${timeStr} h (${p}% prob, ${mm.toFixed(1)} mm)`;
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

  const nivelTexto = !hasRain ? 'Seco' : maxProb >= 70 ? 'Lluvia intensa' : 'Lluvia probable';

  const recomendacion = !hasRain
    ? 'Vías secas. Tránsito de equipos móviles y volquetes sin restricción de humedad.'
    : color === 'rojo'
      ? 'Pistas resbaladizas y riesgo de taludes: reducir velocidad en ruta y revisar drenajes.'
      : 'Uso de ropa impermeable de campo y precaución al subir o bajar de equipos móviles.';

  // Barras sutiles para las 24 horas
  let barsHTML = '';
  for (let i = 0; i < times.length; i++) {
    const prob = probs[i] || 0;
    const mm = amounts[i] || 0;
    const hourLabel = times[i].slice(11, 13);
    const heightPct = Math.max(6, prob);
    const isPeak = prob >= 40;
    const showLabel = i % 4 === 0 || i === times.length - 1;

    barsHTML += `
      <div class="histogram-col" title="${hourLabel}:00 h &bull; ${prob}% &bull; ${mm.toFixed(1)} mm">
        <div class="histogram-bar ${isPeak ? 'bar-alert' : ''}" style="height: ${heightPct}%;"></div>
        <span class="histogram-label">${showLabel ? hourLabel : ''}</span>
      </div>
    `;
  }

  const card = document.createElement('article');
  card.className = `risk-card status-${color}`;
  card.innerHTML = `
    <header class="risk-card-head">
      <div>
        <h3 class="risk-card-title">Lluvia por hora</h3>
        <p class="risk-card-subtitle">${escapeHTML(nextRainText)}</p>
      </div>
      <span class="badge-status badge-${color}">
        <span class="badge-indicator"></span>
        <span>${nivelTexto}</span>
      </span>
    </header>

    <div class="histogram-container" aria-label="Gráfico de probabilidad horaria de lluvia">
      <div class="histogram-legend">
        <span>Próximas 24 horas</span>
        <span>Pico: ${maxProb}%</span>
      </div>
      <div class="histogram-track">
        ${barsHTML}
      </div>
    </div>

    <footer class="risk-card-action">
      <span class="action-tag">Medida de control</span>
      <p class="action-text">${escapeHTML(recomendacion)}</p>
    </footer>
  `;
  return card;
}

/**
 * 3. Tarjeta Viento y ráfagas
 */
function createWindCard(data) {
  const currentSpeed = data?.current?.wind_speed_10m ?? 0;
  const currentGust = data?.current?.wind_gusts_10m ?? currentSpeed;

  const currentIdx = getCurrentHourIndex(data?.hourly?.time, data?.current?.time);
  const next12Gusts = data?.hourly?.wind_gusts_10m?.slice(currentIdx, currentIdx + 12) || [];
  const max12hGust = Math.max(currentGust, ...(next12Gusts.length ? next12Gusts : [0]));

  let rule = UMBRALES_VIENTO.NORMAL;
  let nivelLabel = 'Normal';
  if (max12hGust > 50) {
    rule = UMBRALES_VIENTO.SUSPENSION;
    nivelLabel = 'Suspensión';
  } else if (max12hGust >= 36) {
    rule = UMBRALES_VIENTO.RESTRICCION;
    nivelLabel = 'Restricción';
  } else if (max12hGust >= 25) {
    rule = UMBRALES_VIENTO.PRECAUCION;
    nivelLabel = 'Precaución';
  }

  const card = document.createElement('article');
  card.className = `risk-card status-${rule.color}`;
  card.innerHTML = `
    <header class="risk-card-head">
      <div>
        <h3 class="risk-card-title">Viento y ráfagas</h3>
        <p class="risk-card-subtitle">Límites para trabajos en altura e izajes</p>
      </div>
      <span class="badge-status badge-${rule.color}">
        <span class="badge-indicator"></span>
        <span>${nivelLabel}</span>
      </span>
    </header>

    <div class="risk-card-metric-row">
      <div class="metric-main">
        <span class="metric-number">${Math.round(max12hGust)}</span>
        <span class="metric-unit">km/h ráfaga máxima</span>
      </div>
      <div class="metric-secondary">
        <span class="metric-sub-label">Viento sostenido</span>
        <span class="metric-sub-value">${Math.round(currentSpeed)} km/h</span>
      </div>
    </div>

    <footer class="risk-card-action">
      <span class="action-tag">Medida de control</span>
      <p class="action-text">${escapeHTML(rule.recomendacion)}</p>
    </footer>
  `;
  return card;
}

/**
 * 4. Tarjeta Tormenta eléctrica
 */
function createThunderstormCard(data) {
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

  if (stormDetected) {
    if (level === 'BAJO' || level === 'MODERADO') {
      color = 'naranja';
      nivelLabel = 'Tormenta prevista';
    } else {
      color = 'rojo';
      nivelLabel = 'Riesgo crítico';
    }
    const horaMsg = estimatedStormTime ? ` a las ${estimatedStormTime} h.` : '.';
    recomendacion = `Tormenta eléctrica prevista aprox.${horaMsg} Activar detector de rayos y preparar repliegue a refugio.`;
  }

  const card = document.createElement('article');
  card.className = `risk-card status-${color}`;
  card.innerHTML = `
    <header class="risk-card-head">
      <div>
        <h3 class="risk-card-title">Tormenta eléctrica</h3>
        <p class="risk-card-subtitle">Energía convectiva atmosférica (CAPE)</p>
      </div>
      <span class="badge-status badge-${color}">
        <span class="badge-indicator"></span>
        <span>${nivelLabel}</span>
      </span>
    </header>

    <div class="risk-card-metric-row">
      <div class="metric-main">
        <span class="metric-number">${Math.round(maxCape)}</span>
        <span class="metric-unit">J/kg CAPE</span>
      </div>
      <div class="metric-secondary">
        <span class="metric-sub-label">Detección WMO</span>
        <span class="metric-sub-value ${stormDetected ? 'text-warn' : ''}">
          ${stormDetected ? `Alerta ~${estimatedStormTime || '--:--'} h` : 'Sin tormenta'}
        </span>
      </div>
    </div>

    <footer class="risk-card-action">
      <span class="action-tag">Medida de control</span>
      <p class="action-text">${escapeHTML(recomendacion)}</p>
    </footer>
  `;
  return card;
}

/**
 * Tarjeta de contingencia
 */
function createErrorCard(title) {
  const card = document.createElement('article');
  card.className = 'risk-card status-gris';
  card.innerHTML = `
    <header class="risk-card-head">
      <div>
        <h3 class="risk-card-title">${escapeHTML(title)}</h3>
        <p class="risk-card-subtitle">Sensor meteorológico</p>
      </div>
      <span class="badge-status badge-gris">
        <span class="badge-indicator"></span>
        <span>No disponible</span>
      </span>
    </header>
    <div class="error-notice">
      <span>Dato no disponible en este momento. Las demás tarjetas continúan funcionando con normalidad.</span>
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
