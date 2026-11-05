/**
 * mapa.js - Inicialización y control del mapa interactivo
 * Proyecto: MiEntorno
 * 
 * Utiliza mosaicos de alto impacto visual (CartoDB Positron / Dark Matter)
 * y marcador de radar pulsante de alta precisión para operaciones SST.
 */

import { PERU_DEFAULT_COORDS } from './reglas.js';

let map = null;
let marker = null;
let accuracyCircle = null;
let currentTileLayer = null;

/**
 * Crea el icono personalizado de radar pulsante para el marcador de campo.
 */
function createPulseMarkerIcon() {
  if (typeof L === 'undefined') return null;
  return L.divIcon({
    className: 'pulse-marker-wrapper',
    html: `
      <div class="pulse-marker-container">
        <div class="pulse-marker-ring"></div>
        <div class="pulse-marker-ping"></div>
        <div class="pulse-marker-dot"></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
}

/**
 * Obtiene la URL de mosaicos según el esquema de color del sistema.
 */
function getTileUrl() {
  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
}

/**
 * Inicializa el mapa Leaflet con estética de centro de control moderno.
 * @param {string} containerId ID del contenedor HTML
 * @param {Function} onLocationChange Callback al mover marcador o hacer clic
 */
export function initMap(containerId, onLocationChange) {
  if (typeof L === 'undefined') {
    console.warn('Leaflet aún no está cargado');
    return null;
  }

  if (map) {
    map.remove();
  }

  // Inicializar mapa centrado en Perú por defecto
  map = L.map(containerId, {
    zoomControl: false, // Reemplazaremos por control estilizado en posición óptima
    attributionControl: false
  }).setView([PERU_DEFAULT_COORDS.lat, PERU_DEFAULT_COORDS.lon], PERU_DEFAULT_COORDS.zoom);

  // Control de zoom en esquina superior derecha para no interferir con controles móviles
  L.control.zoom({ position: 'topright' }).addTo(map);

  // Atribución compacta oficial
  L.control.attribution({
    position: 'bottomright',
    prefix: false
  }).addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OSM</a> &bull; <a href="https://carto.com/" target="_blank" rel="noopener">CARTO</a>').addTo(map);

  // Capa base moderna (CartoDB Voyager / Dark Matter)
  currentTileLayer = L.tileLayer(getTileUrl(), {
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(map);

  // Escuchar cambios de tema oscuro/claro para actualizar los tiles automáticamente
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (currentTileLayer && map) {
        map.removeLayer(currentTileLayer);
        currentTileLayer = L.tileLayer(getTileUrl(), {
          maxZoom: 19,
          subdomains: 'abcd'
        }).addTo(map);
      }
    });
  }

  // Selección manual interactiva al pulsar sobre el mapa
  map.on('click', (e) => {
    const { lat, lng } = e.latlng;
    setMarkerPosition(lat, lng, null, false);
    if (typeof onLocationChange === 'function') {
      onLocationChange(lat, lng, null, 'click_mapa');
    }
  });

  return map;
}

/**
 * Ubica o mueve el marcador arrastrable con estilo radar.
 */
export function setMarkerPosition(lat, lon, accuracy = null, panTo = true, customZoom = null, onDragCallback = null) {
  if (typeof L === 'undefined' || !map) return;

  const coords = [lat, lon];
  const pulseIcon = createPulseMarkerIcon();

  // Crear o actualizar marcador
  if (!marker) {
    marker = L.marker(coords, {
      draggable: true,
      icon: pulseIcon,
      title: 'Punto de monitoreo de riesgos SST'
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();

      if (accuracyCircle) {
        map.removeLayer(accuracyCircle);
        accuracyCircle = null;
      }

      if (typeof onDragCallback === 'function') {
        onDragCallback(pos.lat, pos.lng, null, 'arrastre_marcador');
      }
    });
  } else {
    marker.setLatLng(coords);
  }

  // Círculo de radio de precisión translúcido
  if (accuracyCircle) {
    map.removeLayer(accuracyCircle);
    accuracyCircle = null;
  }

  if (accuracy && accuracy > 0) {
    accuracyCircle = L.circle(coords, {
      radius: accuracy,
      color: '#06b6d4',
      fillColor: '#06b6d4',
      fillOpacity: 0.12,
      weight: 1.5,
      dashArray: '4, 4'
    }).addTo(map);
  }

  if (panTo) {
    let targetZoom = customZoom;
    if (!targetZoom) {
      if (accuracy) {
        targetZoom = accuracy > 1000 ? 12 : accuracy > 500 ? 14 : 16;
      } else {
        targetZoom = Math.max(map.getZoom(), 14);
      }
    }
    map.setView(coords, targetZoom, { animate: true, duration: 0.8 });
  }

  setTimeout(() => {
    map?.invalidateSize();
  }, 100);
}

/**
 * Centra el mapa en el Perú
 */
export function centerPeru() {
  if (!map) return;
  map.setView([PERU_DEFAULT_COORDS.lat, PERU_DEFAULT_COORDS.lon], PERU_DEFAULT_COORDS.zoom, {
    animate: true,
    duration: 0.8
  });
}

/**
 * Redimensiona el mapa para evitar errores de renderizado
 */
export function resizeMap() {
  if (map) {
    map.invalidateSize();
  }
}
