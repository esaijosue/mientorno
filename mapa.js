import { PERU_DEFAULT_COORDS } from './reglas.js';

let map = null;
let marker = null;
let accuracyCircle = null;

function createPulseMarkerIcon() {
  if (typeof L === 'undefined') return null;
  return L.divIcon({
    className: 'sat-marker-wrapper',
    html: `
      <div class="sat-marker-container">
        <div class="sat-marker-ring"></div>
        <div class="sat-marker-ping"></div>
        <div class="sat-marker-dot"></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
}

export function initMap(containerId, onLocationChange) {
  if (typeof L === 'undefined') {
    console.warn('Leaflet aún no está cargado');
    return null;
  }

  if (map) {
    map.remove();
  }

  map = L.map(containerId, {
    zoomControl: false,
    attributionControl: false
  }).setView([PERU_DEFAULT_COORDS.lat, PERU_DEFAULT_COORDS.lon], PERU_DEFAULT_COORDS.zoom);

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Esri, Maxar, Earthstar Geographics'
  }).addTo(map);

  L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    opacity: 0.65
  }).addTo(map);

  map.on('click', (e) => {
    const { lat, lng } = e.latlng;
    setMarkerPosition(lat, lng, null, false);
    if (typeof onLocationChange === 'function') {
      onLocationChange(lat, lng, null, 'click_mapa');
    }
  });

  return map;
}

export function setMarkerPosition(lat, lon, accuracy = null, panTo = true, customZoom = null, onDragCallback = null) {
  if (typeof L === 'undefined' || !map) return;

  const coords = [lat, lon];
  const pulseIcon = createPulseMarkerIcon();

  if (!marker) {
    marker = L.marker(coords, {
      draggable: true,
      icon: pulseIcon,
      title: 'Punto de monitoreo de campo'
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

  if (accuracyCircle) {
    map.removeLayer(accuracyCircle);
    accuracyCircle = null;
  }

  if (accuracy && accuracy > 0) {
    accuracyCircle = L.circle(coords, {
      radius: accuracy,
      color: '#38bdf8',
      fillColor: '#38bdf8',
      fillOpacity: 0.12,
      weight: 1.5,
      dashArray: '3, 4'
    }).addTo(map);
  }

  if (panTo) {
    let targetZoom = customZoom;
    if (!targetZoom) {
      if (accuracy) {
        targetZoom = accuracy > 1000 ? 13 : accuracy > 500 ? 15 : 17;
      } else {
        targetZoom = Math.max(map.getZoom(), 15);
      }
    }

    map.setView(coords, targetZoom, { animate: true, duration: 0.8 });

    if (window.innerWidth > 1024) {
      setTimeout(() => {
        if (map) {
          map.panBy([-150, 0], { animate: true, duration: 0.5 });
        }
      }, 400);
    }
  }

  setTimeout(() => {
    map?.invalidateSize();
  }, 100);
}

export function centerPeru() {
  if (!map) return;
  map.setView([PERU_DEFAULT_COORDS.lat, PERU_DEFAULT_COORDS.lon], PERU_DEFAULT_COORDS.zoom, {
    animate: true,
    duration: 0.8
  });
}

export function zoomIn() {
  if (map) map.zoomIn();
}

export function zoomOut() {
  if (map) map.zoomOut();
}

export function resizeMap() {
  if (map) {
    map.invalidateSize();
  }
}
