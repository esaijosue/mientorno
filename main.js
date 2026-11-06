import {
  APP_NAME,
  GEOLOCATION_CONFIG,
  STORAGE_KEY_LOCATION,
  PERU_DEFAULT_COORDS,
  OPERATIONAL_DEFAULT_COORDS,
  AUTO_REFRESH_INTERVAL_MS
} from './reglas.js';
import { searchLocationNominatim, fetchWeatherData, reverseGeocodeNominatim } from './api.js';
import { initMap, setMarkerPosition, centerPeru, resizeMap, zoomIn, zoomOut } from './mapa.js';
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

let currentLocation = {
  lat: null,
  lon: null,
  accuracy: null,
  placeName: null
};

let searchDebounceTimer = null;
let autoRefreshTimer = null;

function guardarUbicacionLocalStorage(lat, lon, accuracy = null, placeName = null) {
  try {
    const data = {
      lat,
      lon,
      accuracy,
      placeName,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(data));
  } catch (err) {
    console.warn('No se pudo guardar la ubicación en localStorage:', err);
  }
}

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

async function cargarDatosMeteorologicos(lat, lon) {
  if (lat === null || lon === null) return;

  setRefreshButtonLoading(true);

  try {
    const weatherData = await fetchWeatherData(lat, lon);
    renderRiskCards(weatherData);
  } catch (err) {
    console.error('Error al cargar datos meteorológicos:', err);
    showNotification('No se pudieron actualizar los datos meteorológicos en tiempo real. Mostrando estado de contingencia.', 'warning');
    renderRiskCards(null);
  } finally {
    setRefreshButtonLoading(false);
  }
}

function alCambiarUbicacion(lat, lon, accuracy = null, origen = 'manual', placeName = null) {
  currentLocation = { lat, lon, accuracy, placeName };
  guardarUbicacionLocalStorage(lat, lon, accuracy, placeName);
  updateLocationInfo(lat, lon, accuracy, origen, placeName);
  cargarDatosMeteorologicos(lat, lon);

  if (!placeName) {
    reverseGeocodeNominatim(lat, lon).then((resolvedName) => {
      if (resolvedName && currentLocation.lat === lat && currentLocation.lon === lon) {
        currentLocation.placeName = resolvedName;
        guardarUbicacionLocalStorage(lat, lon, accuracy, resolvedName);
        updateLocationInfo(lat, lon, accuracy, origen, resolvedName);
      }
    });
  }
}

function solicitarGeolocalizacion(isAutoInit = false) {
  if (!('geolocation' in navigator)) {
    if (!isAutoInit) {
      showNotification('Tu navegador o dispositivo no soporta geolocalización GPS.', 'error');
    }
    return;
  }

  setLocationButtonLoading(true, isAutoInit ? 'Detectando GPS...' : 'Obteniendo GPS...');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setLocationButtonLoading(false);
      const { latitude, longitude, accuracy } = pos.coords;

      setMarkerPosition(
        latitude,
        longitude,
        accuracy,
        true,
        null,
        (lat, lon, acc, origen) => alCambiarUbicacion(lat, lon, acc, origen)
      );

      alCambiarUbicacion(latitude, longitude, accuracy, 'gps');
    },
    (error) => {
      setLocationButtonLoading(false);

      if (isAutoInit) {
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

function iniciarAutoRefresco() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
  }

  autoRefreshTimer = setInterval(() => {
    if (currentLocation.lat !== null && currentLocation.lon !== null) {
      cargarDatosMeteorologicos(currentLocation.lat, currentLocation.lon);
    }
  }, AUTO_REFRESH_INTERVAL_MS);
}

function iniciarApp() {
  initUI();

  try {
    initMap('map', (lat, lon, acc, origen) => {
      alCambiarUbicacion(lat, lon, acc, origen);
    });
  } catch (err) {
    console.error('Error al inicializar mapa Leaflet:', err);
  }

  const btnLocation = document.getElementById('btn-location');
  if (btnLocation) {
    btnLocation.addEventListener('click', () => solicitarGeolocalizacion(false));
  }

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

  const btnZoomIn = document.getElementById('map-zoom-in');
  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', zoomIn);
  }
  const btnZoomOut = document.getElementById('map-zoom-out');
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', zoomOut);
  }
  const btnRecenter = document.getElementById('map-recenter-gps');
  if (btnRecenter) {
    btnRecenter.addEventListener('click', () => solicitarGeolocalizacion(false));
  }

  const mapLocationPill = document.getElementById('map-location-pill');
  const searchInput = document.getElementById('search-input');
  if (mapLocationPill && searchInput) {
    mapLocationPill.addEventListener('click', () => {
      searchInput.focus();
      searchInput.select();
    });
  }

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

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.header-search-wrapper')) {
      hideSearchResults();
    }
  });

  const navTabs = document.querySelectorAll('.nav-tab-pill');
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  const btnSearchMobile = document.getElementById('btn-search-mobile-toggle');
  const searchWrapper = document.getElementById('header-search-wrapper');
  if (btnSearchMobile && searchWrapper) {
    btnSearchMobile.addEventListener('click', (e) => {
      e.stopPropagation();
      searchWrapper.classList.toggle('mobile-search-active');
      if (searchWrapper.classList.contains('mobile-search-active') && searchInput) {
        searchInput.focus();
      }
    });
  }

  const btnCloseMobile = document.getElementById('btn-close-dashboard-mobile');
  if (btnCloseMobile) {
    btnCloseMobile.addEventListener('click', () => {
      document.body.classList.remove('mobile-dashboard-focus');
      document.body.classList.add('mobile-map-focus');
      updateActiveDock('map');
      setTimeout(resizeMap, 150);
    });
  }

  const floatingCard = document.getElementById('map-floating-card');
  if (floatingCard) {
    floatingCard.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        document.body.classList.remove('mobile-map-focus');
        document.body.classList.add('mobile-dashboard-focus');
        updateActiveDock('dashboard');
        setTimeout(resizeMap, 150);
      }
    });
  }

  const dragHandle = document.querySelector('.mobile-sheet-drag-handle');
  if (dragHandle) {
    dragHandle.addEventListener('click', () => {
      if (document.body.classList.contains('mobile-dashboard-focus')) {
        document.body.classList.remove('mobile-dashboard-focus');
        document.body.classList.add('mobile-map-focus');
        updateActiveDock('map');
      } else {
        document.body.classList.remove('mobile-map-focus');
        document.body.classList.add('mobile-dashboard-focus');
        updateActiveDock('dashboard');
      }
      setTimeout(resizeMap, 200);
    });
  }

  const dockBtns = document.querySelectorAll('.dock-action-btn');
  function updateActiveDock(targetName) {
    dockBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.target === targetName);
    });
  }

  dockBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;

      if (target === 'dashboard') {
        updateActiveDock(target);
        document.body.classList.remove('mobile-map-focus');
        document.body.classList.add('mobile-dashboard-focus');
        setTimeout(resizeMap, 150);
      } else if (target === 'map') {
        updateActiveDock(target);
        document.body.classList.remove('mobile-dashboard-focus');
        document.body.classList.add('mobile-map-focus');
        setTimeout(resizeMap, 150);
      } else if (target === 'gps') {
        solicitarGeolocalizacion(false);
      }
    });
  });

  if (window.innerWidth <= 768) {
    document.body.classList.add('mobile-map-focus');
    updateActiveDock('map');
  }

  iniciarAutoRefresco();

  let resizeTimeout = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (window.innerWidth <= 768) {
        if (!document.body.classList.contains('mobile-map-focus') && !document.body.classList.contains('mobile-dashboard-focus')) {
          document.body.classList.add('mobile-map-focus');
          updateActiveDock('map');
        }
      } else {
        document.body.classList.remove('mobile-map-focus', 'mobile-dashboard-focus');
      }
      resizeMap();
    }, 150);
  });
  window.addEventListener('orientationchange', () => {
    setTimeout(resizeMap, 300);
  });

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
    alCambiarUbicacion(saved.lat, saved.lon, saved.accuracy, 'storage', saved.placeName || null);
  } else {
    setMarkerPosition(
      OPERATIONAL_DEFAULT_COORDS.lat,
      OPERATIONAL_DEFAULT_COORDS.lon,
      null,
      true,
      12,
      (lat, lon, acc, origen) => alCambiarUbicacion(lat, lon, acc, origen)
    );
    alCambiarUbicacion(OPERATIONAL_DEFAULT_COORDS.lat, OPERATIONAL_DEFAULT_COORDS.lon, null, 'inicial', OPERATIONAL_DEFAULT_COORDS.name || null);
  }

  solicitarGeolocalizacion(true);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarApp);
} else {
  iniciarApp();
}
