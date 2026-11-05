/**
 * reglas.js - Constantes y configuración del sistema SST/HSE
 * Proyecto: MiEntorno
 */

// Nombre oficial de la aplicación (única constante para cambiarlo fácilmente)
export const APP_NAME = 'MiEntorno';

// Coordenadas por defecto para centrar en Perú (si no hay GPS o el usuario rechaza permisos)
export const PERU_DEFAULT_COORDS = {
  lat: -9.189967,
  lon: -75.015152,
  zoom: 6
};

// Umbral de precisión para considerar la ubicación como aproximada (en metros)
export const ACCURACY_WARNING_THRESHOLD_METERS = 500;

// Configuración requerida de geolocalización
export const GEOLOCATION_CONFIG = {
  enableHighAccuracy: true,
  timeout: 15000, // 15 segundos
  maximumAge: 0
};

// Clave de almacenamiento local seguro
export const STORAGE_KEY_LOCATION = 'mientorno_ubicacion_v1';
