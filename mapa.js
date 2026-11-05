/**
 * mapa.js - Inicialización y control del mapa interactivo Leaflet
 * Proyecto: MiEntorno
 */

import { PERU_DEFAULT_COORDS } from './reglas.js';

let map = null;
let marker = null;
let accuracyCircle = null;

/**
 * Inicializa el mapa Leaflet con capa OpenStreetMap.
 * @param {string} containerId ID del contenedor HTML
 * @param {Function} onLocationChange Callback al mover marcador o hacer clic
 */
export function initMap(containerId, onLocationChange) {
  if (map) {
    map.remove();
  }

  // Inicializar mapa centrado en Perú por defecto
  map = L.map(containerId, {
    zoomControl: true,
    attributionControl: true
  }).setView([PERU_DEFAULT_COORDS.lat, PERU_DEFAULT_COORDS.lon], PERU_DEFAULT_COORDS.zoom);

  // Capa base de OpenStreetMap con atribución oficial
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> colaboradores'
  }).addTo(map);

  // Permitir selección manual al hacer clic en cualquier parte del mapa
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
 * Ubica o mueve el marcador arrastrable en las coordenadas indicadas.
 * @param {number} lat Latitud
 * @param {number} lon Longitud
 * @param {number|null} accuracy Precisión en metros (opcional)
 * @param {boolean} panTo Centrar la cámara en las coordenadas
 * @param {number|null} customZoom Nivel de zoom específico (opcional)
 * @param {Function} onDragCallback Callback al terminar de arrastrar el marcador
 */
export function setMarkerPosition(lat, lon, accuracy = null, panTo = true, customZoom = null, onDragCallback = null) {
  if (!map) return;

  const coords = [lat, lon];

  // Crear marcador arrastrable si no existe
  if (!marker) {
    marker = L.marker(coords, {
      draggable: true,
      title: 'Punto de monitoreo de riesgos'
    }).addTo(map);

    // Escuchar cuando el usuario termina de arrastrar el marcador
    marker.on('dragend', () => {
      const pos = marker.getLatLng();

      // Al mover manualmente, removemos el radio del GPS anterior
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

  // Actualizar círculo de precisión si se proporciona
  if (accuracyCircle) {
    map.removeLayer(accuracyCircle);
    accuracyCircle = null;
  }

  if (accuracy && accuracy > 0) {
    accuracyCircle = L.circle(coords, {
      radius: accuracy,
      color: '#0284c7',
      fillColor: '#38bdf8',
      fillOpacity: 0.15,
      weight: 1.5
    }).addTo(map);
  }

  // Centrar la vista si corresponde
  if (panTo) {
    let targetZoom = customZoom;
    if (!targetZoom) {
      if (accuracy) {
        targetZoom = accuracy > 1000 ? 12 : accuracy > 500 ? 14 : 16;
      } else {
        targetZoom = Math.max(map.getZoom(), 14);
      }
    }
    map.setView(coords, targetZoom);
  }

  // Ajustar tamaño del mapa por cambios dinámicos de DOM
  setTimeout(() => {
    map?.invalidateSize();
  }, 100);
}

/**
 * Centra el mapa en la vista general del Perú
 */
export function centerPeru() {
  if (!map) return;
  map.setView([PERU_DEFAULT_COORDS.lat, PERU_DEFAULT_COORDS.lon], PERU_DEFAULT_COORDS.zoom);
}

/**
 * Redimensiona el mapa para evitar errores de renderizado
 */
export function resizeMap() {
  if (map) {
    map.invalidateSize();
  }
}

