/**
 * main.js - Orquestador principal de la aplicación SST/HSE
 * Proyecto: MiEntorno - Fase 2
 */

import {
  APP_NAME,
  GEOLOCATION_CONFIG,
  STORAGE_KEY_LOCATION,
  PERU_DEFAULT_COORDS,
  OPERATIONAL_DEFAULT_COORDS,
  AUTO_REFRESH_INTERVAL_MS
} from './reglas.js';
import { searchLocationNominatim, fetchWeatherData } from './api.js';
import { initMap, setMarkerPosition, centerPeru, resizeMap } from './mapa.js';
import {
  initUI,
  setLocationButtonLoading,
  setRefreshButtonLoading,
  updateLocationInfo,
  showNotification,
  renderSearchResults,
  hideSearchResults,
  renderRiskCards
} from './ui.js';

// Estado global de la ubicación seleccionada
let currentLocation = {
  lat: null,
  lon: null,
  accuracy: null
};

// Variable para el temporizador de búsqueda con debounce
let searchDebounceTimer = null;

// Variable para el temporizador de auto-refresco (cada 10 min)
let autoRefreshTimer = null;

/**
 * Guarda la última ubicación en localStorage dentro de try/catch seguro.
 */
function guardarUbicacionLocalStorage(lat, lon, accuracy = null) {
  try {
    const data = {
      lat,
      lon,
      accuracy,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(data));
  } catch (err) {
    console.warn('No se pudo guardar la ubicación en localStorage:', err);
  }
}

/**
 * Recupera la última ubicación guardada en localStorage.
 */
function recuperarUbicacionLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCATION);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
      return parsed;
    }
  } catch (err) {
    console.warn('Error al leer de localStorage:', err);
  }
  return null;
}

/**
 * Consulta la API meteorológica y actualiza todas las tarjetas de riesgo.
 * Si ocurre un error, cada tarjeta maneja su contingencia mostrando "Dato no disponible".
 */
async function cargarDatosMeteorologicos(lat, lon) {
  if (lat === null || lon === null) return;

  setRefreshButtonLoading(true);

  try {
    const weatherData = await fetchWeatherData(lat, lon);
    renderRiskCards(weatherData);
  } catch (err) {
    console.error('Error al cargar datos meteorológicos:', err);
    showNotification('No se pudieron actualizar los datos meteorológicos en tiempo real. Mostrando estado de contingencia.', 'warning');
    // Enviar objeto nulo para que cada tarjeta individual renderice "Dato no disponible"
    renderRiskCards(null);
  } finally {
    setRefreshButtonLoading(false);
  }
}

/**
 * Función central de cambio de ubicación (recalcula tarjetas al mover marcador o seleccionar punto).
 */
function alCambiarUbicacion(lat, lon, accuracy = null, origen = 'manual') {
  currentLocation = { lat, lon, accuracy };

  // Guardar en almacenamiento seguro
  guardarUbicacionLocalStorage(lat, lon, accuracy);

  // Actualizar indicadores visuales de precisión y coordenadas
  updateLocationInfo(lat, lon, accuracy, origen);

  // Recalcular inmediatamente las tarjetas de riesgo para las nuevas coordenadas
  cargarDatosMeteorologicos(lat, lon);
}

/**
 * Solicita geolocalización al navegador mediante navigator.geolocation.
 * @param {boolean} isAutoInit Si es llamada automática al inicio
 */
function solicitarGeolocalizacion(isAutoInit = false) {
  if (!('geolocation' in navigator)) {
    if (!isAutoInit) {
      showNotification('Tu navegador o dispositivo no soporta geolocalización GPS.', 'error');
    }
    return;
  }

  setLocationButtonLoading(true, isAutoInit ? 'Detectando GPS...' : 'Obteniendo GPS...');

  navigator.geolocation.getCurrentPosition(
    // Éxito
    (pos) => {
      setLocationButtonLoading(false);
      const { latitude, longitude, accuracy } = pos.coords;

      // Actualizar marcador y vista en el mapa
      setMarkerPosition(
        latitude,
        longitude,
        accuracy,
        true,
        null,
        (lat, lon, acc, origen) => alCambiarUbicacion(lat, lon, acc, origen)
      );

      // Actualizar estado general y calcular tarjetas
      alCambiarUbicacion(latitude, longitude, accuracy, 'gps');
    },
    // Error / Rechazo
    (error) => {
      setLocationButtonLoading(false);

      if (isAutoInit) {
        // En auto-inicio silencioso no interrumpir agresivamente si ya hay caché
        const saved = recuperarUbicacionLocalStorage();
        if (saved) return;
      }

      switch (error.code) {
        case error.PERMISSION_DENIED:
          showNotification(
            'Permiso de GPS no concedido. Se muestra el mapa del Perú para elegir el punto de trabajo manualmente.',
            'warning'
          );
          centerPeru();
          break;

        case error.POSITION_UNAVAILABLE:
          showNotification(
            'Señal GPS no disponible temporalmente. Selecciona tu punto directamente en el mapa.',
            'warning'
          );
          break;

        case error.TIMEOUT:
          showNotification(
            'Se agotó el tiempo de espera (15 s) para la señal GPS. Por favor, pulsa en el mapa o reintenta.',
            'warning'
          );
          break;

        default:
          showNotification('No se pudo obtener la posición GPS. Selecciona un punto en el mapa.', 'error');
          break;
      }
    },
    GEOLOCATION_CONFIG
  );
}

/**
 * Maneja el evento de búsqueda con debounce de 1 segundo (máx 1 req/seg para Nominatim).
 */
function manejarBusqueda(texto) {
  clearTimeout(searchDebounceTimer);

  const cleanText = texto?.trim();
  if (!cleanText || cleanText.length < 2) {
    hideSearchResults();
    return;
  }

  searchDebounceTimer = setTimeout(async () => {
    try {
      const results = await searchLocationNominatim(cleanText);
      renderSearchResults(results, (seleccionado) => {
        setMarkerPosition(
          seleccionado.lat,
          seleccionado.lon,
          null,
          true,
          15,
          (lat, lon, acc, origen) => alCambiarUbicacion(lat, lon, acc, origen)
        );
        alCambiarUbicacion(seleccionado.lat, seleccionado.lon, null, 'busqueda');
      });
    } catch (err) {
      showNotification('Servicio de búsqueda no disponible momentáneamente. Intenta nuevamente.', 'warning');
    }
  }, 1000);
}

/**
 * Configuración del ciclo de auto-refresco cada 10 minutos.
 */
function iniciarAutoRefresco() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
  }

  autoRefreshTimer = setInterval(() => {
    if (currentLocation.lat !== null && currentLocation.lon !== null) {
      console.log('Ejecutando auto-refresco periódico de riesgos (10 min)...');
      cargarDatosMeteorologicos(currentLocation.lat, currentLocation.lon);
    }
  }, AUTO_REFRESH_INTERVAL_MS);
}

/**
 * Inicialización de la aplicación al cargar el DOM.
 */
function iniciarApp() {
  initUI();

  // Inicializar mapa interactivo Leaflet con captura segura
  try {
    initMap('map', (lat, lon, acc, origen) => {
      alCambiarUbicacion(lat, lon, acc, origen);
    });
  } catch (err) {
    console.error('Error al inicializar mapa Leaflet:', err);
  }

  // Configurar botón "Usar mi ubicación"
  const btnLocation = document.getElementById('btn-location');
  if (btnLocation) {
    btnLocation.addEventListener('click', () => solicitarGeolocalizacion(false));
  }

  // Configurar botón "Actualizar"
  const btnRefresh = document.getElementById('btn-refresh');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      if (currentLocation.lat !== null && currentLocation.lon !== null) {
        cargarDatosMeteorologicos(currentLocation.lat, currentLocation.lon);
      } else {
        showNotification('Selecciona primero una ubicación en el mapa o activa tu GPS.', 'info');
      }
    });
  }

  // Configurar campo de búsqueda
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      manejarBusqueda(e.target.value);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hideSearchResults();
      }
    });
  }

  // Ocultar resultados de búsqueda al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box-container')) {
      hideSearchResults();
    }
  });

  // Iniciar temporizador de actualización periódica de 10 minutos
  iniciarAutoRefresco();

  // Ajuste responsive automático del mapa ante redimensionamiento o rotación de pantalla
  let resizeTimeout = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      resizeMap();
    }, 150);
  });
  window.addEventListener('orientationchange', () => {
    setTimeout(resizeMap, 300);
  });

  // 1. Cargar ubicación inicial instantánea (evita pantallas en blanco o esperas de GPS)
  const saved = recuperarUbicacionLocalStorage();
  if (saved) {
    setMarkerPosition(
      saved.lat,
      saved.lon,
      saved.accuracy,
      true,
      null,
      (lat, lon, acc, origen) => alCambiarUbicacion(lat, lon, acc, origen)
    );
    alCambiarUbicacion(saved.lat, saved.lon, saved.accuracy, 'storage');
  } else {
    // Carga inmediata de la base operativa de referencia para disponibilidad 100% instantánea
    setMarkerPosition(
      OPERATIONAL_DEFAULT_COORDS.lat,
      OPERATIONAL_DEFAULT_COORDS.lon,
      null,
      true,
      12,
      (lat, lon, acc, origen) => alCambiarUbicacion(lat, lon, acc, origen)
    );
    alCambiarUbicacion(OPERATIONAL_DEFAULT_COORDS.lat, OPERATIONAL_DEFAULT_COORDS.lon, null, 'inicial');
  }

  // 2. Intentar reconocimiento automático de GPS de inmediato (solicitado para experiencia óptima de campo)
  solicitarGeolocalizacion(true);
}

// Ejecución infalible (maneja tanto DOMContentLoaded como ejecución diferida de type=module)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarApp);
} else {
  iniciarApp();
}
