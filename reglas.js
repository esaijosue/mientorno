/**
 * reglas.js - Constantes, umbrales y reglas de negocio SST / HSE
 * Proyecto: MiEntorno
 * 
 * NOTA PARA AUDITORÍA Y PERSONALIZACIÓN TÉCNICA:
 * Los umbrales definidos en este archivo corresponden a normativas nacionales
 * (D.S. 024-2016-EM Minería, Norma G.050 Construcción) y estándares internacionales (OSHA, OMS, OMM).
 * Son valores por defecto y totalmente editables según los estándares internos de cada empresa.
 */

// Nombre oficial de la aplicación (única constante para cambiarlo fácilmente)
export const APP_NAME = 'MiEntorno';

// Coordenadas por defecto para centrar en Perú (si no hay GPS o el usuario rechaza permisos)
export const PERU_DEFAULT_COORDS = {
  lat: -9.189967,
  lon: -75.015152,
  zoom: 6
};

// Ubicación operativa inicial para carga instantánea sin esperar GPS
export const OPERATIONAL_DEFAULT_COORDS = {
  lat: -12.0464,
  lon: -77.0428,
  name: 'Lima / Callao (Frente Operativo)'
};

// Umbral de precisión para considerar la ubicación como aproximada (en metros)
export const ACCURACY_WARNING_THRESHOLD_METERS = 500;

// Configuración requerida de geolocalización de alta precisión
export const GEOLOCATION_CONFIG = {
  enableHighAccuracy: true,
  timeout: 15000, // 15 segundos
  maximumAge: 0
};

// Clave de almacenamiento local seguro
export const STORAGE_KEY_LOCATION = 'mientorno_ubicacion_v1';

// Intervalo de actualización automática en milisegundos (10 minutos)
export const AUTO_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

/**
 * =========================================================================
 * REGLAS DE RADIACIÓN UV (Estándar OMS / SENAMHI)
 * =========================================================================
 */
export const REGLAS_UV = [
  {
    min: 0,
    max: 2.9,
    nivel: 'Bajo',
    color: 'verde',
    badge: 'BAJO',
    recomendacion: 'Protección mínima requerida: uso de lentes de seguridad con filtro UV para trabajos exteriores.'
  },
  {
    min: 3,
    max: 5.9,
    nivel: 'Moderado',
    color: 'amarillo',
    badge: 'MODERADO',
    recomendacion: 'Usar bloqueador solar FPS 50+ cada 3 horas, cortavientos/sombrero de ala ancha y gafas oscuras.'
  },
  {
    min: 6,
    max: 7.9,
    nivel: 'Alto',
    color: 'naranja',
    badge: 'ALTO',
    recomendacion: 'Manga larga, casco con cubrenuca y bloqueador cada 2 horas.'
  },
  {
    min: 8,
    max: 10.9,
    nivel: 'Muy Alto',
    color: 'rojo',
    badge: 'MUY ALTO',
    recomendacion: 'Protección extrema: rotación de cuadrillas a la sombra y reaplicación horaria de fotoprotector.'
  },
  {
    min: 11,
    max: Infinity,
    nivel: 'Extremo',
    color: 'rojo-extremo',
    badge: 'EXTREMO',
    recomendacion: 'Riesgo crítico de quemaduras solares: suspender trabajos a cielo abierto no esenciales entre 11:00 y 15:00 h.'
  }
];

/**
 * =========================================================================
 * REGLAS DE VIENTO Y RÁFAGAS (Umbrales configurables SST / Izaje / Altura)
 * D.S. 024-2016-EM Minería / Norma G.050 / ASME B30.5
 * =========================================================================
 */
export const UMBRALES_VIENTO = {
  NORMAL: {
    maxRafaga: 24.9,
    color: 'verde',
    badge: 'NORMAL',
    recomendacion: 'Condiciones de viento seguras para trabajos en altura, andamios e izajes mecánicos regulares.'
  },
  PRECAUCION: {
    minRafaga: 25,
    maxRafaga: 35,
    color: 'amarillo',
    badge: 'PRECAUCIÓN',
    recomendacion: 'Inspeccionar estabilización de cargas suspendidas y uso permanente de barbiquejo.'
  },
  RESTRICCION: {
    minRafaga: 36,
    maxRafaga: 50,
    color: 'naranja',
    badge: 'RESTRINGIDO',
    recomendacion: 'Trabajo en altura e izaje con restricción: suspender cargas de gran volumen y evaluar plataformas.'
  },
  SUSPENSION: {
    minRafaga: 50.1,
    color: 'rojo',
    badge: 'CRÍTICO / SUSPENSIÓN',
    recomendacion: 'SUSPENSIÓN INMEDIATA de trabajos en altura (andamios/techos) y maniobras de grúa por ráfagas peligrosas.'
  }
};

/**
 * =========================================================================
 * REGLAS DE TORMENTA ELÉCTRICA (CAPE - Convective Available Potential Energy)
 * Conforme a estándares de alerta temprana de tormentas en minería de tajo abierto
 * =========================================================================
 */
export const UMBRALES_CAPE = {
  BAJO: {
    maxCape: 499,
    nivel: 'Bajo',
    color: 'verde',
    badge: 'BAJO',
    recomendacion: 'Atmósfera estable. Riesgo convectivo mínimo para el personal de campo.'
  },
  MODERADO: {
    minCape: 500,
    maxCape: 1499,
    nivel: 'Moderado',
    color: 'amarillo',
    badge: 'MODERADO',
    recomendacion: 'Inestabilidad atmosférica moderada. Monitorear formación de nubes cumulonimbus.'
  },
  ALTO: {
    minCape: 1500,
    maxCape: 2499,
    nivel: 'Alto',
    color: 'naranja',
    badge: 'ALTO',
    recomendacion: 'Fuerte energía convectiva: verificar operatividad de detectores de tormenta y refugios Faraday.'
  },
  MUY_ALTO: {
    minCape: 2500,
    nivel: 'Muy Alto',
    color: 'rojo',
    badge: 'MUY ALTO',
    recomendacion: 'Condición severa de convección: riesgo inminente de descargas a tierra y caída de rayos.'
  }
};

// Códigos meteorológicos WMO que indican tormenta eléctrica activa o inminente
export const WEATHER_CODES_TORMENTA = [95, 96, 99];
