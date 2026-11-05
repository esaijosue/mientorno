/**
 * ui.js - Manejo del DOM, renderizado visual e interacción de usuario
 * Proyecto: MiEntorno
 */

import { APP_NAME, ACCURACY_WARNING_THRESHOLD_METERS } from './reglas.js';

// Elementos cacheados del DOM
const elements = {
  appName: document.getElementById('app-name'),
  btnLocation: document.getElementById('btn-location'),
  locationStatus: document.getElementById('location-status'),
  accuracyAlert: document.getElementById('accuracy-alert'),
  coordsDisplay: document.getElementById('coords-display'),
  searchInput: document.getElementById('search-input'),
  searchResults: document.getElementById('search-results'),
  cardsContainer: document.getElementById('cards-container')
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
    ? `<span class="spinner" aria-hidden="true"></span> ${text || 'Obteniendo ubicación...'}`
    : `<span class="icon">📍</span> ${text || 'Usar mi ubicación'}`;
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

  // Formato legible de coordenadas
  elements.coordsDisplay.textContent = `Lat: ${lat.toFixed(5)} | Lon: ${lon.toFixed(5)}`;

  // Evaluación de precisión
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
    // Origen manual o búsqueda
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
 * @param {Array<{name: string, displayName: string, lat: number, lon: number}>} results
 * @param {Function} onSelect Callback al seleccionar un resultado
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
 * Escapa cadenas HTML para prevenir inyecciones.
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
