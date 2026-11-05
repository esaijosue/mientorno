/**
 * ui.js - Manejo del DOM, renderizado visual de alto impacto e interacción de usuario
 * Proyecto: MiEntorno
 * 
 * Interfaz Ejecutiva de Centro de Control SST / HSE
 */

import {
  APP_NAME,
  ACCURACY_WARNING_THRESHOLD_METERS,
  REGLAS_UV,
  UMBRALES_VIENTO,
  UMBRALES_CAPE,
  WEATHER_CODES_TORMENTA
} from './reglas.js';

// Elementos cacheados del DOM
let elements = {};

/**
 * Inicializa y recupera los elementos de la interfaz.
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
 * Actualiza el estado del botón de geolocalización con animación fluida.
 */
export function setLocationButtonLoading(isLoading, text = null) {
  if (!elements.btnLocation) return;
  elements.btnLocation.disabled = isLoading;
  elements.btnLocation.innerHTML = isLoading
    ? `
      <div class="btn-spinner-ring" aria-hidden="true"></div>
      <span>${text || 'Localizando GPS...'}</span>
    `
    : `
      <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
      </svg>
      <span>${text || 'Usar mi ubicación GPS'}</span>
    `;
}

/**
 * Actualiza el estado del botón de actualización manual.
 */
export function setRefreshButtonLoading(isRefreshing) {
  if (!elements.btnRefresh) return;
  elements.btnRefresh.disabled = isRefreshing;
  elements.btnRefresh.innerHTML = isRefreshing
    ? `
      <div class="btn-spinner-ring-sm" aria-hidden="true"></div>
      <span>Sincronizando...</span>
    `
    : `
      <svg class="refresh-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
      </svg>
      <span>Actualizar</span>
    `;
}

/**
 * Actualiza la hora de la última sincronización.
 */
export function updateLastRefreshTimestamp() {
  if (!elements.lastUpdated) return;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  elements.lastUpdated.textContent = `Actualizado: ${timeStr}`;
}

/**
 * Muestra el estado de la ubicación y la precisión en metros.
 */
export function updateLocationInfo(lat, lon, accuracy, source = 'gps') {
  if (!elements.locationStatus || !elements.coordsDisplay) return;

  // Formato monospace de alta precisión
  elements.coordsDisplay.textContent = `${lat >= 0 ? '+' : ''}${lat.toFixed(4)}°, ${lon >= 0 ? '+' : ''}${lon.toFixed(4)}°`;

  if (accuracy !== null && accuracy !== undefined) {
    const roundedAcc = Math.round(accuracy);
    elements.locationStatus.textContent = `GPS fijado (±${roundedAcc} m)`;

    if (roundedAcc > ACCURACY_WARNING_THRESHOLD_METERS) {
      elements.accuracyAlert.innerHTML = `
        <div class="modern-alert alert-warning-glow" role="alert">
          <span class="alert-pulse-dot"></span>
          <div class="alert-content">
            <strong>Precisión aproximada (${roundedAcc} m):</strong> Arrastra el radar en el mapa para afinar la coordenada exacta de tu frente de trabajo.
          </div>
        </div>
      `;
      elements.accuracyAlert.hidden = false;
    } else {
      elements.accuracyAlert.innerHTML = `
        <div class="modern-alert alert-success-glow" role="alert">
          <span class="alert-pulse-dot dot-emerald"></span>
          <div class="alert-content">
            Señal GPS de alta resolución operativa activa (±${roundedAcc} m).
          </div>
        </div>
      `;
      elements.accuracyAlert.hidden = false;
    }
  } else {
    const label = source === 'arrastre_marcador'
      ? 'Punto reajustado en el mapa'
      : source === 'click_mapa'
        ? 'Punto fijado en el mapa'
        : source === 'busqueda'
          ? 'Ubicación seleccionada por búsqueda'
          : source === 'inicial'
            ? 'Frente de operación activo (Lima / Callao)'
            : 'Ubicación recuperada de sesión';

    elements.locationStatus.textContent = label;

    if (source === 'inicial') {
      elements.accuracyAlert.hidden = true;
    } else {
      elements.accuracyAlert.innerHTML = `
        <div class="modern-alert alert-info-glow" role="alert">
          <span class="alert-pulse-dot dot-blue"></span>
          <div class="alert-content">
            ${label}. Puedes arrastrar el marcador para afinar la ubicación exacta de campo.
          </div>
        </div>
      `;
      elements.accuracyAlert.hidden = false;
    }
  }
}

/**
 * Muestra mensaje de notificación al usuario.
 */
export function showNotification(message, type = 'error') {
  if (!elements.accuracyAlert) return;
  const dotColor = type === 'error' ? 'dot-rose' : type === 'warning' ? 'dot-amber' : 'dot-cyan';
  const glowClass = type === 'error' ? 'alert-danger-glow' : type === 'warning' ? 'alert-warning-glow' : 'alert-info-glow';

  elements.accuracyAlert.innerHTML = `
    <div class="modern-alert ${glowClass}" role="alert">
      <span class="alert-pulse-dot ${dotColor}"></span>
      <div class="alert-content">${escapeHTML(message)}</div>
    </div>
  `;
  elements.accuracyAlert.hidden = false;
}

/**
 * Renderiza la lista de sugerencias de búsqueda.
 */
export function renderSearchResults(results, onSelect) {
  if (!elements.searchResults) return;

  elements.searchResults.innerHTML = '';
  if (!results || results.length === 0) {
    elements.searchResults.hidden = true;
    return;
  }

  results.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'search-item';
    li.innerHTML = `
      <div class="search-item-icon">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </div>
      <div class="search-item-info">
        <span class="search-item-title">${escapeHTML(item.name)}</span>
        <span class="search-item-sub">${escapeHTML(item.displayName)}</span>
      </div>
    `;
    li.addEventListener('click', () => {
      elements.searchResults.hidden = true;
      if (elements.searchInput) {
        elements.searchInput.value = item.name;
      }
      onSelect(item);
    });
    elements.searchResults.appendChild(li);
  });

  elements.searchResults.hidden = false;
}

/**
 * Oculta la lista de resultados de búsqueda.
 */
export function hideSearchResults() {
  if (elements.searchResults) {
    elements.searchResults.hidden = true;
  }
}

/**
 * =========================================================================
 * RENDERIZADO DE TARJETAS DE RIESGO DE ALTO IMPACTO - FASE 2
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
    els.cardsContainer.appendChild(createErrorCard('Radiación UV', 'solar'));
  }

  // 2. Lluvia por hora
  try {
    els.cardsContainer.appendChild(createRainCard(weatherData));
  } catch (err) {
    console.error('Error generando tarjeta Lluvia:', err);
    els.cardsContainer.appendChild(createErrorCard('Lluvia y Precipitación', 'rain'));
  }

  // 3. Viento y Ráfagas
  try {
    els.cardsContainer.appendChild(createWindCard(weatherData));
  } catch (err) {
    console.error('Error generando tarjeta Viento:', err);
    els.cardsContainer.appendChild(createErrorCard('Viento y Ráfagas', 'wind'));
  }

  // 4. Tormenta Eléctrica
  try {
    els.cardsContainer.appendChild(createThunderstormCard(weatherData));
  } catch (err) {
    console.error('Error generando tarjeta Tormenta:', err);
    els.cardsContainer.appendChild(createErrorCard('Tormenta Eléctrica (CAPE)', 'storm'));
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
 * SVG Icons ejecutivos para cada tipo de riesgo
 */
const ICONS = {
  solar: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  rain: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><line x1="8" y1="19" x2="8" y2="21"/><line x1="8" y1="13" x2="8" y2="15"/><line x1="16" y1="19" x2="16" y2="21"/><line x1="16" y1="13" x2="16" y2="15"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="12" y1="15" x2="12" y2="17"/></svg>`,
  wind: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>`,
  storm: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
};

/**
 * 1. Tarjeta Radiación UV
 */
function createUVCard(data) {
  const currentHourIdx = getCurrentHourIndex(data.hourly?.time, data.current?.time);
  const currentUV = data.hourly?.uv_index ? (data.hourly.uv_index[currentHourIdx] ?? 0) : 0;
  const maxUV = data.daily?.uv_index_max?.[0] ?? currentUV;

  const evaluatedValue = Math.max(currentUV, maxUV);
  const rule = REGLAS_UV.find((r) => evaluatedValue >= r.min && evaluatedValue <= r.max) || REGLAS_UV[0];

  const card = document.createElement('article');
  card.className = `modern-risk-card theme-${rule.color}`;
  card.innerHTML = `
    <div class="card-accent-bar"></div>
    <header class="risk-card-header">
      <div class="risk-type-badge">
        <div class="risk-icon-pill">${ICONS.solar}</div>
        <div>
          <h3 class="risk-card-name">Radiación UV</h3>
          <span class="risk-scale-sub">Índice OMS (0 - 11+)</span>
        </div>
      </div>
      <div class="status-pill-badge badge-${rule.color}">
        <span class="badge-dot"></span>
        <span>${rule.badge}</span>
      </div>
    </header>

    <div class="risk-card-body">
      <div class="kpi-hero-group">
        <div class="kpi-main-block">
          <span class="kpi-label">ÍNDICE MÁXIMO HOY</span>
          <div class="kpi-hero-value">
            <span class="val-num">${maxUV.toFixed(1)}</span>
            <span class="val-unit">UV-I</span>
          </div>
        </div>

        <div class="kpi-sub-block">
          <span class="sub-label">VALOR ACTUAL</span>
          <span class="sub-value">${currentUV.toFixed(1)}</span>
          <span class="sub-state">${currentUV > 0 ? 'En exposición' : 'Bajo horizonte'}</span>
        </div>
      </div>
    </div>

    <footer class="risk-card-footer">
      <div class="protocol-header">
        ${ICONS.shield}
        <span>MEDIDA DE CONTROL OPERACIONAL SST</span>
      </div>
      <p class="protocol-text">${escapeHTML(rule.recomendacion)}</p>
    </footer>
  `;
  return card;
}

/**
 * 2. Tarjeta Lluvia por hora
 */
function createRainCard(data) {
  const currentIdx = getCurrentHourIndex(data.hourly?.time, data.current?.time);
  const times = data.hourly?.time?.slice(currentIdx, currentIdx + 24) || [];
  const probs = data.hourly?.precipitation_probability?.slice(currentIdx, currentIdx + 24) || [];
  const amounts = data.hourly?.precipitation?.slice(currentIdx, currentIdx + 24) || [];

  let nextRainText = 'Sin precipitaciones en las próximas 24 h';
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
      nextRainText = `Próxima lluvia estimada: ${timeStr} h (${p}% prob &bull; ${mm.toFixed(1)} mm)`;
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

  const badge = !hasRain ? 'DESPEJADO' : maxProb >= 70 ? 'LLUVIA FUERTE' : 'PROBABLE';

  const recomendacion = !hasRain
    ? 'Vías secas. Tránsito de volquetes y equipos móviles sin restricción por terreno húmedo.'
    : color === 'rojo'
      ? 'Pistas resbaladizas y riesgo de taludes: activar protocolo de lluvia severa y reducir velocidad.'
      : 'Uso obligatorio de impermeable y verificación de drenajes en frentes de excavación.';

  // Generar barras elegantes con gradientes
  let barsHTML = '';
  for (let i = 0; i < times.length; i++) {
    const prob = probs[i] || 0;
    const mm = amounts[i] || 0;
    const hourLabel = times[i].slice(11, 13);
    const heightPct = Math.max(8, prob);
    const isPeak = prob >= 40;
    const showLabel = i % 4 === 0 || i === times.length - 1;

    barsHTML += `
      <div class="rain-bar-item" title="${hourLabel}:00 h | ${prob}% prob | ${mm.toFixed(1)} mm">
        <div class="bar-fill ${isPeak ? 'bar-peak-accent' : ''}" style="height: ${heightPct}%;"></div>
        <span class="bar-hour">${showLabel ? hourLabel : ''}</span>
      </div>
    `;
  }

  const card = document.createElement('article');
  card.className = `modern-risk-card theme-${color}`;
  card.innerHTML = `
    <div class="card-accent-bar"></div>
    <header class="risk-card-header">
      <div class="risk-type-badge">
        <div class="risk-icon-pill">${ICONS.rain}</div>
        <div>
          <h3 class="risk-card-name">Lluvia y Precipitación</h3>
          <span class="risk-scale-sub">Ventana de pronóstico a 24 horas</span>
        </div>
      </div>
      <div class="status-pill-badge badge-${color}">
        <span class="badge-dot"></span>
        <span>${badge}</span>
      </div>
    </header>

    <div class="risk-card-body">
      <div class="rain-summary-line">
        <span class="rain-status-pill ${hasRain ? 'pill-alert' : 'pill-ok'}">
          ${nextRainText}
        </span>
      </div>

      <div class="rain-histogram-box">
        <div class="histogram-legend">
          <span>PROBABILIDAD HORARIA (%)</span>
          <span>PICO: ${maxProb}%</span>
        </div>
        <div class="rain-histogram-track">
          ${barsHTML}
        </div>
      </div>
    </div>

    <footer class="risk-card-footer">
      <div class="protocol-header">
        ${ICONS.shield}
        <span>MEDIDA DE CONTROL OPERACIONAL SST</span>
      </div>
      <p class="protocol-text">${escapeHTML(recomendacion)}</p>
    </footer>
  `;
  return card;
}

/**
 * 3. Tarjeta Viento y ráfagas
 */
function createWindCard(data) {
  const currentSpeed = data.current?.wind_speed_10m ?? 0;
  const currentGust = data.current?.wind_gusts_10m ?? currentSpeed;

  const currentIdx = getCurrentHourIndex(data.hourly?.time, data.current?.time);
  const next12Gusts = data.hourly?.wind_gusts_10m?.slice(currentIdx, currentIdx + 12) || [];
  const max12hGust = Math.max(currentGust, ...next12Gusts);

  let rule = UMBRALES_VIENTO.NORMAL;
  if (max12hGust > 50) {
    rule = UMBRALES_VIENTO.SUSPENSION;
  } else if (max12hGust >= 36) {
    rule = UMBRALES_VIENTO.RESTRICCION;
  } else if (max12hGust >= 25) {
    rule = UMBRALES_VIENTO.PRECAUCION;
  }

  const card = document.createElement('article');
  card.className = `modern-risk-card theme-${rule.color}`;
  card.innerHTML = `
    <div class="card-accent-bar"></div>
    <header class="risk-card-header">
      <div class="risk-type-badge">
        <div class="risk-icon-pill">${ICONS.wind}</div>
        <div>
          <h3 class="risk-card-name">Viento y Ráfagas</h3>
          <span class="risk-scale-sub">Límites D.S. 024-2016-EM / ASME B30.5</span>
        </div>
      </div>
      <div class="status-pill-badge badge-${rule.color}">
        <span class="badge-dot"></span>
        <span>${rule.badge}</span>
      </div>
    </header>

    <div class="risk-card-body">
      <div class="kpi-hero-group">
        <div class="kpi-main-block">
          <span class="kpi-label">RÁFAGA MÁXIMA 12H</span>
          <div class="kpi-hero-value">
            <span class="val-num">${Math.round(max12hGust)}</span>
            <span class="val-unit">km/h</span>
          </div>
        </div>

        <div class="kpi-sub-block">
          <span class="sub-label">ACTUAL SOSTENIDO</span>
          <span class="sub-value">${Math.round(currentSpeed)} <small>km/h</small></span>
          <span class="sub-state">Ráfaga actual: ${Math.round(currentGust)} km/h</span>
        </div>
      </div>
    </div>

    <footer class="risk-card-footer">
      <div class="protocol-header">
        ${ICONS.shield}
        <span>MEDIDA DE CONTROL OPERACIONAL SST</span>
      </div>
      <p class="protocol-text">${escapeHTML(rule.recomendacion)}</p>
    </footer>
  `;
  return card;
}

/**
 * 4. Tarjeta Tormenta eléctrica
 */
function createThunderstormCard(data) {
  const currentIdx = getCurrentHourIndex(data.hourly?.time, data.current?.time);
  const times = data.hourly?.time?.slice(currentIdx, currentIdx + 24) || [];
  const capes = data.hourly?.cape?.slice(currentIdx, currentIdx + 24) || [];
  const weatherCodes = data.hourly?.weather_code?.slice(currentIdx, currentIdx + 24) || [];

  const currentCape = capes[0] || 0;
  const maxCape = Math.max(currentCape, ...(capes.slice(0, 12) || [0]));

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
  let badge = capeRule.badge;
  let recomendacion = capeRule.recomendacion;

  if (stormDetected) {
    if (level === 'BAJO' || level === 'MODERADO') {
      color = 'naranja';
      badge = 'TORMENTA ESTIMADA';
    } else {
      color = 'rojo';
      badge = 'CRÍTICO / DESCARGAS';
    }
    const horaMsg = estimatedStormTime ? ` estimada a las ${estimatedStormTime} h.` : '.';
    recomendacion = `Tormenta eléctrica${horaMsg} Activar protocolo de alerta amarilla/roja y verificar refugios Faraday.`;
  }

  const card = document.createElement('article');
  card.className = `modern-risk-card theme-${color}`;
  card.innerHTML = `
    <div class="card-accent-bar"></div>
    <header class="risk-card-header">
      <div class="risk-type-badge">
        <div class="risk-icon-pill">${ICONS.storm}</div>
        <div>
          <h3 class="risk-card-name">Tormenta Eléctrica</h3>
          <span class="risk-scale-sub">Energía Convectiva CAPE (J/kg)</span>
        </div>
      </div>
      <div class="status-pill-badge badge-${color}">
        <span class="badge-dot"></span>
        <span>${badge}</span>
      </div>
    </header>

    <div class="risk-card-body">
      <div class="kpi-hero-group">
        <div class="kpi-main-block">
          <span class="kpi-label">PICO CAPE 12H</span>
          <div class="kpi-hero-value">
            <span class="val-num">${Math.round(maxCape)}</span>
            <span class="val-unit">J/kg</span>
          </div>
        </div>

        <div class="kpi-sub-block">
          <span class="sub-label">DETECCIÓN WMO</span>
          <span class="sub-value ${stormDetected ? 'text-danger' : 'text-ok'}">
            ${stormDetected ? 'Alerta Activa' : 'Sin Alerta'}
          </span>
          <span class="sub-state">${stormDetected ? `Impacto ~${estimatedStormTime || '--:--'} h` : 'Atmósfera estable'}</span>
        </div>
      </div>
    </div>

    <footer class="risk-card-footer">
      <div class="protocol-header">
        ${ICONS.shield}
        <span>MEDIDA DE CONTROL OPERACIONAL SST</span>
      </div>
      <p class="protocol-text">${escapeHTML(recomendacion)}</p>
    </footer>
  `;
  return card;
}

/**
 * Tarjeta de contingencia
 */
function createErrorCard(title, iconType = 'shield') {
  const card = document.createElement('article');
  card.className = 'modern-risk-card theme-gris';
  card.innerHTML = `
    <div class="card-accent-bar"></div>
    <header class="risk-card-header">
      <div class="risk-type-badge">
        <div class="risk-icon-pill">${ICONS[iconType] || ICONS.shield}</div>
        <div>
          <h3 class="risk-card-name">${escapeHTML(title)}</h3>
          <span class="risk-scale-sub">Sensor meteorológico</span>
        </div>
      </div>
      <div class="status-pill-badge badge-gris">
        <span class="badge-dot"></span>
        <span>NO DISPONIBLE</span>
      </div>
    </header>
    <div class="risk-card-body">
      <div class="error-state-box">
        <span class="error-msg-main">Dato no disponible</span>
        <span class="error-msg-sub">El canal de datos no respondió. Las demás tarjetas operan con normalidad.</span>
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
