/**
 * ui.js - Manejo del DOM, renderizado visual e interacción de usuario
 * Proyecto: MiEntorno
 * 
 * Fase 2: Tarjetas de riesgos SST con semáforo y una recomendación por línea
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
const elements = {
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

/**
 * Inicializa los textos de la interfaz con las constantes del proyecto.
 */
export function initUI() {
  if (elements.appName) {
    elements.appName.textContent = APP_NAME;
  }
}

/**
 * Actualiza el estado del botón de geolocalización.
 * @param {boolean} isLoading Indicador de carga
 * @param {string} text Texto opcional
 */
export function setLocationButtonLoading(isLoading, text = null) {
  if (!elements.btnLocation) return;
  elements.btnLocation.disabled = isLoading;
  elements.btnLocation.innerHTML = isLoading
    ? `<span class="spinner" aria-hidden="true"></span> ${text || 'Obteniendo GPS...'}`
    : `<span class="icon">📍</span> ${text || 'Usar mi ubicación'}`;
}

/**
 * Actualiza el estado del botón de actualización manual.
 * @param {boolean} isRefreshing
 */
export function setRefreshButtonLoading(isRefreshing) {
  if (!elements.btnRefresh) return;
  elements.btnRefresh.disabled = isRefreshing;
  elements.btnRefresh.innerHTML = isRefreshing
    ? `<span class="spinner-sm" aria-hidden="true"></span> Actualizando...`
    : `🔄 Actualizar`;
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
 * Aplica la regla: si la precisión es mayor a 500 m, avisa: "Ubicación aproximada. Ajusta el punto en el mapa".
 * @param {number} lat Latitud
 * @param {number} lon Longitud
 * @param {number|null} accuracy Precisión en metros
 * @param {string} source Origen del punto ('gps', 'arrastre_marcador', 'click_mapa', 'busqueda', 'storage')
 */
export function updateLocationInfo(lat, lon, accuracy, source = 'gps') {
  if (!elements.locationStatus || !elements.coordsDisplay) return;

  elements.coordsDisplay.textContent = `Lat: ${lat.toFixed(5)} | Lon: ${lon.toFixed(5)}`;

  if (accuracy !== null && accuracy !== undefined) {
    const roundedAcc = Math.round(accuracy);
    elements.locationStatus.textContent = `Precisión GPS: ±${roundedAcc} m`;

    if (roundedAcc > ACCURACY_WARNING_THRESHOLD_METERS) {
      elements.accuracyAlert.innerHTML = `
        <div class="alert alert-warning" role="alert">
          <span class="alert-icon">⚠️</span>
          <span><strong>Ubicación aproximada</strong> (${roundedAcc} m). Ajusta el punto en el mapa para mayor exactitud.</span>
        </div>
      `;
      elements.accuracyAlert.hidden = false;
    } else {
      elements.accuracyAlert.innerHTML = `
        <div class="alert alert-success" role="alert">
          <span class="alert-icon">✓</span>
          <span>Ubicación GPS de alta precisión (±${roundedAcc} m).</span>
        </div>
      `;
      elements.accuracyAlert.hidden = false;
    }
  } else {
    const label = source === 'arrastre_marcador'
      ? 'Punto reajustado en el mapa'
      : source === 'click_mapa'
        ? 'Punto seleccionado manualmente en el mapa'
        : source === 'busqueda'
          ? 'Ubicación seleccionada mediante búsqueda'
          : 'Ubicación recuperada de sesión anterior';

    elements.locationStatus.textContent = label;
    elements.accuracyAlert.innerHTML = `
      <div class="alert alert-info" role="alert">
        <span class="alert-icon">📍</span>
        <span>${label}. Puedes arrastrar el marcador para afinar la posición.</span>
      </div>
    `;
    elements.accuracyAlert.hidden = false;
  }
}

/**
 * Muestra mensaje de error o notificación al usuario.
 * @param {string} message Mensaje en español
 * @param {'error'|'warning'|'info'} type Tipo de mensaje
 */
export function showNotification(message, type = 'error') {
  if (!elements.accuracyAlert) return;
  const icon = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  const alertClass = type === 'error' ? 'alert-danger' : type === 'warning' ? 'alert-warning' : 'alert-info';

  elements.accuracyAlert.innerHTML = `
    <div class="alert ${alertClass}" role="alert">
      <span class="alert-icon">${icon}</span>
      <span>${message}</span>
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
      <div class="search-item-title">${escapeHTML(item.name)}</div>
      <div class="search-item-sub">${escapeHTML(item.displayName)}</div>
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
 * RENDERIZADO DE TARJETAS DE RIESGO - FASE 2
 * Regla: Si una tarjeta falla, muestra "Dato no disponible" y las demás siguen operando.
 * =========================================================================
 */

/**
 * Renderiza todas las tarjetas de riesgo evaluadas con Open-Meteo.
 * @param {object} weatherData Datos provenientes de api.fetchWeatherData
 */
export function renderRiskCards(weatherData) {
  if (!elements.cardsContainer) return;
  elements.cardsContainer.innerHTML = '';

  // 1. Tarjeta Radiación UV
  try {
    const uvCard = createUVCard(weatherData);
    elements.cardsContainer.appendChild(uvCard);
  } catch (err) {
    console.error('Error generando tarjeta UV:', err);
    elements.cardsContainer.appendChild(createErrorCard('Radiación UV', '☀️'));
  }

  // 2. Tarjeta Lluvia por hora
  try {
    const rainCard = createRainCard(weatherData);
    elements.cardsContainer.appendChild(rainCard);
  } catch (err) {
    console.error('Error generando tarjeta Lluvia:', err);
    elements.cardsContainer.appendChild(createErrorCard('Lluvia por Hora', '🌧️'));
  }

  // 3. Tarjeta Viento y Ráfagas
  try {
    const windCard = createWindCard(weatherData);
    elements.cardsContainer.appendChild(windCard);
  } catch (err) {
    console.error('Error generando tarjeta Viento:', err);
    elements.cardsContainer.appendChild(createErrorCard('Viento y Ráfagas', '💨'));
  }

  // 4. Tarjeta Tormenta Eléctrica
  try {
    const stormCard = createThunderstormCard(weatherData);
    elements.cardsContainer.appendChild(stormCard);
  } catch (err) {
    console.error('Error generando tarjeta Tormenta:', err);
    elements.cardsContainer.appendChild(createErrorCard('Tormenta Eléctrica', '⚡'));
  }

  updateLastRefreshTimestamp();
}

/**
 * Determina el índice de la hora actual en el array horario de Open-Meteo.
 */
function getCurrentHourIndex(hourlyTime, currentTimeStr) {
  if (!hourlyTime || !Array.isArray(hourlyTime)) return 0;
  if (!currentTimeStr) return 0;
  const currentPrefix = currentTimeStr.slice(0, 13); // e.g. "2026-11-04T21"
  const idx = hourlyTime.findIndex((t) => t.startsWith(currentPrefix));
  return idx !== -1 ? idx : 0;
}

/**
 * 1. Tarjeta Radiación UV:
 * Valor actual y máximo del día. Niveles OMS: 0-2 bajo, 3-5 moderado, 6-7 alto, 8-10 muy alto, 11+ extremo.
 * Una sola línea de recomendación por nivel.
 */
function createUVCard(data) {
  const currentHourIdx = getCurrentHourIndex(data.hourly?.time, data.current?.time);
  const currentUV = data.hourly?.uv_index ? (data.hourly.uv_index[currentHourIdx] ?? 0) : 0;
  const maxUV = data.daily?.uv_index_max?.[0] ?? currentUV;

  // Evaluar regla según el valor máximo previsto para la jornada
  const evaluatedValue = Math.max(currentUV, maxUV);
  const rule = REGLAS_UV.find((r) => evaluatedValue >= r.min && evaluatedValue <= r.max) || REGLAS_UV[0];

  const card = document.createElement('article');
  card.className = `risk-card risk-border-${rule.color}`;
  card.innerHTML = `
    <header class="risk-card-header">
      <div class="risk-title-wrapper">
        <span class="risk-card-icon" aria-hidden="true">☀️</span>
        <h3 class="risk-card-title">Radiación UV</h3>
      </div>
      <span class="risk-badge badge-${rule.color}">${rule.badge}</span>
    </header>

    <div class="risk-body">
      <div class="risk-metrics">
        <div class="metric-block">
          <span class="metric-label">Actual</span>
          <span class="metric-value">${currentUV.toFixed(1)}</span>
        </div>
        <div class="metric-divider"></div>
        <div class="metric-block">
          <span class="metric-label">Máx. Hoy</span>
          <span class="metric-value font-bold">${maxUV.toFixed(1)}</span>
        </div>
        <div class="metric-subtext">Escala OMS (0 - 11+)</div>
      </div>
    </div>

    <footer class="risk-card-footer">
      <p class="risk-recommendation">
        <strong>Acción SST:</strong> ${escapeHTML(rule.recomendacion)}
      </p>
    </footer>
  `;
  return card;
}

/**
 * 2. Tarjeta Lluvia por hora:
 * Gráfico simple de barras de las próximas 24 h y texto:
 * "Próxima lluvia probable: HH:MM" o "Sin lluvia en las próximas 24 h".
 */
function createRainCard(data) {
  const currentIdx = getCurrentHourIndex(data.hourly?.time, data.current?.time);
  const times = data.hourly?.time?.slice(currentIdx, currentIdx + 24) || [];
  const probs = data.hourly?.precipitation_probability?.slice(currentIdx, currentIdx + 24) || [];
  const amounts = data.hourly?.precipitation?.slice(currentIdx, currentIdx + 24) || [];

  // Buscar primer evento de lluvia probable (prob >= 30% o mm > 0.1)
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
      nextRainText = `Próxima lluvia probable: ${timeStr} (${p}% - ${mm.toFixed(1)} mm)`;
      hasRain = true;
    }
  }

  // Nivel semafórico
  const color = !hasRain
    ? 'verde'
    : maxProb >= 70 || totalPrecip > 5
      ? 'rojo'
      : maxProb >= 40 || totalPrecip > 1
        ? 'naranja'
        : 'amarillo';

  const badge = !hasRain ? 'SIN LLUVIA' : maxProb >= 70 ? 'LLUVIA FUERTE' : 'PROBABLE';

  // Recomendación de una línea
  const recomendacion = !hasRain
    ? 'Superficies secas. Tránsito vehicular en campamento y pista sin restricción hídrica.'
    : color === 'rojo'
      ? 'Pistas resbaladizas y riesgo de taludes: reducir velocidad en ruta y revisar canaletas.'
      : 'Uso de ropa impermeable de campo (capotín) y precaución al descender de equipos móviles.';

  // Generar gráfico de barras de las 24 horas
  let barsHTML = '';
  for (let i = 0; i < times.length; i++) {
    const prob = probs[i] || 0;
    const mm = amounts[i] || 0;
    const hourLabel = times[i].slice(11, 13);
    const barHeight = Math.max(6, Math.round(prob * 0.5)); // 6px a 50px de altura
    const isPeak = prob >= 40;
    const showLabel = i % 4 === 0 || i === times.length - 1;

    barsHTML += `
      <div class="rain-bar-col" title="${hourLabel}:00 h | ${prob}% | ${mm.toFixed(1)} mm">
        <div class="rain-bar ${isPeak ? 'bar-peak' : ''}" style="height: ${barHeight}px;"></div>
        <span class="rain-hour-label">${showLabel ? hourLabel : ''}</span>
      </div>
    `;
  }

  const card = document.createElement('article');
  card.className = `risk-card risk-border-${color}`;
  card.innerHTML = `
    <header class="risk-card-header">
      <div class="risk-title-wrapper">
        <span class="risk-card-icon" aria-hidden="true">🌧️</span>
        <h3 class="risk-card-title">Lluvia por Hora</h3>
      </div>
      <span class="risk-badge badge-${color}">${badge}</span>
    </header>

    <div class="risk-body">
      <div class="rain-status-line">
        <span class="rain-highlight ${hasRain ? 'text-warn' : ''}">
          ${escapeHTML(nextRainText)}
        </span>
      </div>

      <div class="rain-chart-container" aria-label="Gráfico de probabilidad de precipitación en las próximas 24 horas">
        <div class="rain-chart-header">
          <span>Próximas 24 horas (probabilidad %)</span>
          <span>Máx: ${maxProb}%</span>
        </div>
        <div class="rain-bars-wrapper">
          ${barsHTML}
        </div>
      </div>
    </div>

    <footer class="risk-card-footer">
      <p class="risk-recommendation">
        <strong>Acción SST:</strong> ${escapeHTML(recomendacion)}
      </p>
    </footer>
  `;
  return card;
}

/**
 * 3. Tarjeta Viento y ráfagas:
 * Velocidad y ráfaga actual y máxima de las próximas 12 h, en km/h.
 * Umbrales configurables en reglas.js:
 * ráfaga < 25 verde, 25-35 amarillo, 36-50 naranja (trabajo en altura e izaje con restricción), > 50 rojo.
 */
function createWindCard(data) {
  const currentSpeed = data.current?.wind_speed_10m ?? 0;
  const currentGust = data.current?.wind_gusts_10m ?? currentSpeed;

  const currentIdx = getCurrentHourIndex(data.hourly?.time, data.current?.time);
  const next12Gusts = data.hourly?.wind_gusts_10m?.slice(currentIdx, currentIdx + 12) || [];
  const max12hGust = Math.max(currentGust, ...next12Gusts);

  // Evaluar según la ráfaga máxima esperada
  let rule = UMBRALES_VIENTO.NORMAL;
  if (max12hGust > 50) {
    rule = UMBRALES_VIENTO.SUSPENSION;
  } else if (max12hGust >= 36) {
    rule = UMBRALES_VIENTO.RESTRICCION;
  } else if (max12hGust >= 25) {
    rule = UMBRALES_VIENTO.PRECAUCION;
  }

  const card = document.createElement('article');
  card.className = `risk-card risk-border-${rule.color}`;
  card.innerHTML = `
    <header class="risk-card-header">
      <div class="risk-title-wrapper">
        <span class="risk-card-icon" aria-hidden="true">💨</span>
        <h3 class="risk-card-title">Viento y Ráfagas</h3>
      </div>
      <span class="risk-badge badge-${rule.color}">${rule.badge}</span>
    </header>

    <div class="risk-body">
      <div class="risk-metrics">
        <div class="metric-block">
          <span class="metric-label">Viento Actual</span>
          <span class="metric-value">${Math.round(currentSpeed)} <small>km/h</small></span>
        </div>
        <div class="metric-divider"></div>
        <div class="metric-block">
          <span class="metric-label">Ráfaga Actual</span>
          <span class="metric-value">${Math.round(currentGust)} <small>km/h</small></span>
        </div>
        <div class="metric-divider"></div>
        <div class="metric-block">
          <span class="metric-label">Ráfaga Máx. 12h</span>
          <span class="metric-value font-bold">${Math.round(max12hGust)} <small>km/h</small></span>
        </div>
      </div>
      <div class="metric-subtext">Estándar: restricción > 35 km/h | suspensión > 50 km/h</div>
    </div>

    <footer class="risk-card-footer">
      <p class="risk-recommendation">
        <strong>Acción SST:</strong> ${escapeHTML(rule.recomendacion)}
      </p>
    </footer>
  `;
  return card;
}

/**
 * 4. Tarjeta Tormenta eléctrica:
 * Usa CAPE y weather_code (95, 96, 99 = tormenta).
 * Nivel según CAPE (<500 bajo, 500-1500 moderado, 1500-2500 alto, >2500 muy alto).
 * Si hay weather_code de tormenta en las próximas horas, sube el nivel y muestra hora estimada.
 */
function createThunderstormCard(data) {
  const currentIdx = getCurrentHourIndex(data.hourly?.time, data.current?.time);
  const times = data.hourly?.time?.slice(currentIdx, currentIdx + 24) || [];
  const capes = data.hourly?.cape?.slice(currentIdx, currentIdx + 24) || [];
  const weatherCodes = data.hourly?.weather_code?.slice(currentIdx, currentIdx + 24) || [];

  const currentCape = capes[0] || 0;
  const maxCape = Math.max(currentCape, ...(capes.slice(0, 12) || [0]));

  // Nivel base por energía convectiva (CAPE)
  let level = 'BAJO';
  if (maxCape > 2500) {
    level = 'MUY_ALTO';
  } else if (maxCape >= 1500) {
    level = 'ALTO';
  } else if (maxCape >= 500) {
    level = 'MODERADO';
  }

  let capeRule = UMBRALES_CAPE[level];

  // Evaluar detección de códigos de tormenta (95, 96, 99)
  let stormDetected = false;
  let estimatedStormTime = null;

  for (let i = 0; i < weatherCodes.length; i++) {
    if (WEATHER_CODES_TORMENTA.includes(weatherCodes[i])) {
      stormDetected = true;
      estimatedStormTime = times[i] ? times[i].slice(11, 16) : null;
      break;
    }
  }

  // Escalación del nivel de riesgo si el modelo prevé tormenta explícita
  let color = capeRule.color;
  let badge = capeRule.badge;
  let recomendacion = capeRule.recomendacion;

  if (stormDetected) {
    if (level === 'BAJO' || level === 'MODERADO') {
      color = 'naranja';
      badge = 'TORMENTA PREVISTA';
    } else {
      color = 'rojo';
      badge = 'CRÍTICO / TORMENTA';
    }
    const horaMsg = estimatedStormTime ? ` estimada aprox. a las ${estimatedStormTime} h.` : '.';
    recomendacion = `Tormenta eléctrica${horaMsg} Activar protocolo de detector de tormentas y preparar repliegue a refugio.`;
  }

  const card = document.createElement('article');
  card.className = `risk-card risk-border-${color}`;
  card.innerHTML = `
    <header class="risk-card-header">
      <div class="risk-title-wrapper">
        <span class="risk-card-icon" aria-hidden="true">⚡</span>
        <h3 class="risk-card-title">Tormenta Eléctrica</h3>
      </div>
      <span class="risk-badge badge-${color}">${badge}</span>
    </header>

    <div class="risk-body">
      <div class="risk-metrics">
        <div class="metric-block">
          <span class="metric-label">CAPE Actual</span>
          <span class="metric-value">${Math.round(currentCape)} <small>J/kg</small></span>
        </div>
        <div class="metric-divider"></div>
        <div class="metric-block">
          <span class="metric-label">CAPE Máx. 12h</span>
          <span class="metric-value font-bold">${Math.round(maxCape)} <small>J/kg</small></span>
        </div>
        <div class="metric-divider"></div>
        <div class="metric-block">
          <span class="metric-label">Detección WMO</span>
          <span class="metric-value ${stormDetected ? 'text-danger font-bold' : ''}">
            ${stormDetected ? 'Activa ⚡' : 'Sin alerta'}
          </span>
        </div>
      </div>
      <div class="metric-subtext">Energía Convectiva Potencial Disponible (CAPE)</div>
    </div>

    <footer class="risk-card-footer">
      <p class="risk-recommendation">
        <strong>Acción SST:</strong> ${escapeHTML(recomendacion)}
      </p>
    </footer>
  `;
  return card;
}

/**
 * Genera una tarjeta de contingencia cuando un servicio o dato no está disponible.
 * Regla: "si una falla, esa tarjeta muestra 'Dato no disponible' y las demás siguen funcionando"
 */
function createErrorCard(title, icon = '⚠️') {
  const card = document.createElement('article');
  card.className = 'risk-card risk-border-error';
  card.innerHTML = `
    <header class="risk-card-header">
      <div class="risk-title-wrapper">
        <span class="risk-card-icon" aria-hidden="true">${icon}</span>
        <h3 class="risk-card-title">${escapeHTML(title)}</h3>
      </div>
      <span class="risk-badge badge-gris">NO DISPONIBLE</span>
    </header>
    <div class="risk-body">
      <div class="card-empty-state">
        <span class="empty-icon">📡</span>
        <p class="empty-text">Dato no disponible</p>
        <small class="empty-subtext">No se pudo recuperar la lectura actual. Las demás tarjetas operan normalmente.</small>
      </div>
    </div>
  `;
  return card;
}

/**
 * Escapa caracteres HTML para seguridad.
 */
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
