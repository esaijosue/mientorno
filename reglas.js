/**
 * reglas.js - Constantes de configuración, umbrales y reglas de negocio SST
 * Proyecto: MiEntorno
 * 
 * Umbrales técnicos basados en:
 * - D.S. 024-2016-EM (Reglamento de Seguridad y Salud Ocupacional en Minería)
 * - Ley 30102 (Medidas preventivas contra efectos nocivos de radiación solar)
 * - Ley 29783 (Ley de Seguridad y Salud en el Trabajo)
 * - Norma Técnica G.050 (Seguridad durante la Construcción)
 * - ASME B30.5 / OSHA 1926.1431 (Límites operacionales de viento en izaje)
 * - Estándares de la Organización Meteorológica Mundial (OMM / WMO)
 */

// Configuración opcional inyectada por entorno o valores por defecto
const runtimeEnv = (typeof window !== 'undefined' && window.ENV) ? window.ENV : {};

export const APP_NAME = runtimeEnv.APP_NAME || 'MiEntorno';

export const PERU_DEFAULT_COORDS = {
  lat: Number(runtimeEnv.PERU_LAT) || -9.189967,
  lon: Number(runtimeEnv.PERU_LON) || -75.015152,
  zoom: Number(runtimeEnv.PERU_ZOOM) || 6
};

export const OPERATIONAL_DEFAULT_COORDS = {
  lat: Number(runtimeEnv.DEFAULT_LAT) || -12.0464,
  lon: Number(runtimeEnv.DEFAULT_LON) || -77.0428,
  name: runtimeEnv.DEFAULT_LOCATION_NAME || 'Lima / Callao (frente operativo)'
};

export const ACCURACY_WARNING_THRESHOLD_METERS = Number(runtimeEnv.ACCURACY_THRESHOLD) || 500;

export const GEOLOCATION_CONFIG = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0
};

export const STORAGE_KEY_LOCATION = 'mientorno_ubicacion_v1';

export const AUTO_REFRESH_INTERVAL_MS = Number(runtimeEnv.REFRESH_INTERVAL_MS) || (10 * 60 * 1000);

/**
 * Reglas de radiación UV (OMS, Senamhi, Ley 30102)
 */
export const REGLAS_UV = [
  {
    min: 0,
    max: 2.9,
    nivel: 'Bajo',
    color: 'verde',
    badge: 'Bajo',
    recomendacion: 'Protección mínima requerida: uso de lentes de seguridad con filtro UV para trabajos exteriores.'
  },
  {
    min: 3,
    max: 5.9,
    nivel: 'Moderado',
    color: 'amarillo',
    badge: 'Moderado',
    recomendacion: 'Usar bloqueador solar FPS 50+ cada 3 horas, cortavientos/sombrero de ala ancha y gafas oscuras.'
  },
  {
    min: 6,
    max: 7.9,
    nivel: 'Alto',
    color: 'naranja',
    badge: 'Alto',
    recomendacion: 'Manga larga, casco con cubrenuca y bloqueador cada 2 horas.'
  },
  {
    min: 8,
    max: 10.9,
    nivel: 'Muy alto',
    color: 'rojo',
    badge: 'Muy alto',
    recomendacion: 'Protección extrema: rotación de cuadrillas a la sombra y reaplicación horaria de fotoprotector.'
  },
  {
    min: 11,
    max: Infinity,
    nivel: 'Extremo',
    color: 'rojo-extremo',
    badge: 'Extremo',
    recomendacion: 'Riesgo crítico de quemaduras solares: suspender trabajos a cielo abierto no esenciales entre 11:00 y 15:00 h.'
  }
];

/**
 * Reglas de viento y ráfagas (D.S. 024-2016-EM, Norma G.050, ASME B30.5)
 */
export const UMBRALES_VIENTO = {
  NORMAL: {
    maxRafaga: 24.9,
    color: 'verde',
    badge: 'Normal',
    recomendacion: 'Condiciones de viento seguras para trabajos en altura, andamios e izajes mecánicos regulares.'
  },
  PRECAUCION: {
    minRafaga: 25,
    maxRafaga: 35,
    color: 'amarillo',
    badge: 'Precaución',
    recomendacion: 'Inspeccionar estabilización de cargas suspendidas y uso permanente de barbiquejo.'
  },
  RESTRICCION: {
    minRafaga: 36,
    maxRafaga: 50,
    color: 'naranja',
    badge: 'Restringido',
    recomendacion: 'Trabajo en altura e izaje con restricción: suspender cargas de gran volumen y evaluar plataformas.'
  },
  SUSPENSION: {
    minRafaga: 50.1,
    color: 'rojo',
    badge: 'Crítico / suspensión',
    recomendacion: 'Suspensión inmediata de trabajos en altura (andamios/techos) y maniobras de grúa por ráfagas peligrosas.'
  }
};

/**
 * Reglas de potencial de tormenta eléctrica (CAPE - Convective Available Potential Energy)
 */
export const UMBRALES_CAPE = {
  BAJO: {
    maxCape: 499,
    nivel: 'Bajo',
    color: 'verde',
    badge: 'Bajo',
    recomendacion: 'Atmósfera estable. Riesgo convectivo mínimo para el personal de campo.'
  },
  MODERADO: {
    minCape: 500,
    maxCape: 1499,
    nivel: 'Moderado',
    color: 'amarillo',
    badge: 'Moderado',
    recomendacion: 'Inestabilidad atmosférica moderada. Monitorear formación de nubes cumulonimbus.'
  },
  ALTO: {
    minCape: 1500,
    maxCape: 2499,
    nivel: 'Alto',
    color: 'naranja',
    badge: 'Alto',
    recomendacion: 'Fuerte energía convectiva: verificar operatividad de detectores de tormenta y refugios Faraday.'
  },
  MUY_ALTO: {
    minCape: 2500,
    nivel: 'Muy alto',
    color: 'rojo',
    badge: 'Muy alto',
    recomendacion: 'Condición severa de convección: riesgo inminente de descargas a tierra y caída de rayos.'
  }
};

// Códigos meteorológicos WMO que indican tormenta eléctrica activa o inminente
export const WEATHER_CODES_TORMENTA = [95, 96, 99];
