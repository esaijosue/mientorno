/**
 * main.js - Orquestador principal de la aplicación SST/HSE
 * Proyecto: MiEntorno - Fase 1
 */

import {
  APP_NAME,
  GEOLOCATION_CONFIG,
  STORAGE_KEY_LOCATION,
  PERU_DEFAULT_COORDS
} from './reglas.js';
import { searchLocationNominatim } from './api.js';
import { initMap, setMarkerPosition, centerPeru } from './mapa.js';
import {
  initUI,
  setLocationButtonLoading,
  updateLocationInfo,
  showNotification,
  renderSearchResults,
  hideSearchResults
} from './ui.js';

// Estado global de la ubicación seleccionada
let currentLocation = {
  lat: null,
  lon: null,
  accuracy: null
};

// Variable de temporizador para debounce de búsqueda
let searchDebounceTimer = null;

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
 * Función central de cambio de ubicación (recalcula tarjetas al mover marcador o seleccionar punto).
 */
function alCambiarUbicacion(lat, lon, accuracy = null, origen = 'manual') {
  currentLocation = { lat, lon, accuracy };
  
  // Guardar en almacenamiento seguro
  guardarUbicacionLocalStorage(lat, lon, accuracy);

  // Actualizar indicadores visuales de precisión y coordenadas
  updateLocationInfo(lat, lon, accuracy, origen);

  // Recalcular tarjetas de riesgos (Base de Fase 1 lista para Fase 2)
  recalcularTarjetas(lat, lon);
}

/**
 * Función que disparará la actualización de riesgos en Fase 2.
 */
function recalcularTarjetas(lat, lon) {
  // Evento listo para orquestar la llamada unificada a Open-Meteo en Fase 2
  const event = new CustomEvent('mientorno:location-changed', {
    detail: { lat, lon }
  });
  window.dispatchEvent(event);
}

/**
 * Solicita geolocalización al navegador mediante navigator.geolocation.
 */
function solicitarGeolocalizacion() {
  if (!('geolocation' in navigator)) {
    showNotification('Tu navegador o dispositivo no soporta geolocalización GPS.', 'error');
    return;
  }

  setLocationButtonLoading(true, 'Obteniendo GPS...');

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

      // Actualizar estado general
      alCambiarUbicacion(latitude, longitude, accuracy, 'gps');
    },
    // Error / Rechazo
    (error) => {
      setLocationButtonLoading(false);

      switch (error.code) {
        case error.PERMISSION_DENIED:
          showNotification(
            'Permiso de ubicación denegado. Mostrando mapa centrado en Perú para elegir el punto manualmente.',
            'warning'
          );
          centerPeru();
          break;

        case error.POSITION_UNAVAILABLE:
          showNotification(
            'No se pudo determinar la señal GPS del dispositivo. Selecciona el punto directamente en el mapa.',
            'warning'
          );
          break;

        case error.TIMEOUT:
          showNotification(
            'Se agotó el tiempo de espera (15 s) para la geolocalización de alta precisión. Intenta nuevamente o ajusta en el mapa.',
            'warning'
          );
          break;

        default:
          showNotification('Error al obtener la ubicación. Por favor, selecciona un punto en el mapa.', 'error');
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

  // Debounce de 1000 ms
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
      showNotification('No se pudo completar la búsqueda en este momento. Intenta nuevamente.', 'warning');
    }
  }, 1000);
}

/**
 * Inicialización al cargar el DOM.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Iniciar textos y elementos
  initUI();

  // Inicializar mapa interactivo con Leaflet
  initMap('map', (lat, lon, acc, origen) => {
    alCambiarUbicacion(lat, lon, acc, origen);
  });

  // Configurar botón "Usar mi ubicación"
  const btnLocation = document.getElementById('btn-location');
  if (btnLocation) {
    btnLocation.addEventListener('click', solicitarGeolocalizacion);
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

  // Intentar cargar la última ubicación guardada en localStorage
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
    // Si no hay guardada, centrar en Perú de manera informativa
    centerPeru();
  }
});
