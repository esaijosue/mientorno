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
  name: runtimeEnv.DEFAULT_LOCATION_NAME || null
};

export const ACCURACY_WARNING_THRESHOLD_METERS = Number(runtimeEnv.ACCURACY_THRESHOLD) || 500;

export const GEOLOCATION_CONFIG = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0
};

export const STORAGE_KEY_LOCATION = 'mientorno_ubicacion_v1';

export const AUTO_REFRESH_INTERVAL_MS = Number(runtimeEnv.REFRESH_INTERVAL_MS) || (10 * 60 * 1000);

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

export const WEATHER_CODES_TORMENTA = [95, 96, 99];

export const UMBRALES_TEMPERATURA = {
  FRIO_EXTREMO: {
    maxTemp: -5.0,
    nivel: 'Helada extrema',
    color: 'rojo',
    badge: 'Helada extrema',
    deduccion: 25,
    recomendacion: 'Riesgo crítico de hipotermia y congelamiento: suspender labores exteriores no esenciales, proveer calefacción y bebidas calientes.'
  },
  FRIO_SEVERO: {
    minTemp: -4.9,
    maxTemp: 0.0,
    nivel: 'Bajo cero',
    color: 'naranja',
    badge: 'Bajo cero',
    deduccion: 15,
    recomendacion: 'Temperaturas bajo cero: uso de ropa térmica multicapa, guantes aislantes y pausas en refugios térmicos.'
  },
  FRIO_MODERADO: {
    minTemp: 0.1,
    maxTemp: 8.0,
    nivel: 'Frío moderado',
    color: 'amarillo',
    badge: 'Frío moderado',
    deduccion: 6,
    recomendacion: 'Uso obligatorio de cortavientos, ropa térmica y monitoreo del estado físico del personal.'
  },
  CONFORT: {
    minTemp: 8.1,
    maxTemp: 28.0,
    nivel: 'Confort térmico',
    color: 'verde',
    badge: 'Normal',
    deduccion: 0,
    recomendacion: 'Rango térmico confortable para operaciones en campo.'
  },
  CALOR_MODERADO: {
    minTemp: 28.1,
    maxTemp: 32.0,
    nivel: 'Calor moderado',
    color: 'amarillo',
    badge: 'Calor moderado',
    deduccion: 8,
    recomendacion: 'Puntos de hidratación cada 100 m, consumo mínimo de 500 ml de agua por hora y pausas a la sombra.'
  },
  CALOR_SEVERO: {
    minTemp: 32.1,
    maxTemp: 38.0,
    nivel: 'Estrés térmico',
    color: 'naranja',
    badge: 'Estrés térmico',
    deduccion: 18,
    recomendacion: 'Riesgo de deshidratación y calambres: rotación obligatoria de cuadrillas 45 min trabajo / 15 min descanso a la sombra.'
  },
  GOLPE_CALOR: {
    minTemp: 38.1,
    nivel: 'Golpe de calor',
    color: 'rojo',
    badge: 'Golpe de calor',
    deduccion: 25,
    recomendacion: 'Peligro inminente de shock térmico: suspender trabajos físicos pesados a cielo abierto.'
  }
};

export const UMBRALES_NIEVE = {
  INTENSA: {
    minNieve: 5.0,
    nivel: 'Nevada intensa',
    color: 'rojo',
    badge: 'Nevada severa',
    deduccion: 30,
    recomendacion: 'Bloqueo crítico de vías y taludes: suspender tránsito de acarreo, izajes y trabajos en altura. Despeje mecánico con motoniveladoras.'
  },
  MODERADA: {
    minNieve: 1.0,
    maxNieve: 4.9,
    nivel: 'Nevada moderada',
    color: 'naranja',
    badge: 'Nieve / hielo',
    deduccion: 18,
    recomendacion: 'Acumulación de nieve en bermas y accesos: uso obligatorio de cadenas en llantas y velocidad reducida a 20 km/h.'
  },
  LIGERA: {
    minNieve: 0.1,
    maxNieve: 0.9,
    nivel: 'Nevada ligera',
    color: 'amarillo',
    badge: 'Escarcha / aguanieve',
    deduccion: 8,
    recomendacion: 'Presencia de escarcha o aguanieve en superficies metálicas y calzadas. Precaución en escaleras y andamios.'
  },
  SIN_NIEVE: {
    maxNieve: 0.0,
    nivel: 'Sin nieve',
    color: 'verde',
    badge: 'Seco',
    deduccion: 0,
    recomendacion: 'Sin precipitación sólida ni acumulación de nieve en terreno.'
  }
};

export const UMBRALES_VISIBILIDAD = {
  CRITICA: {
    maxMetros: 100,
    nivel: 'Niebla densa',
    color: 'rojo',
    badge: 'Niebla < 100 m',
    deduccion: 25,
    recomendacion: 'Visibilidad nula en frente de tajo: detención inmediata de tránsito de volquetes gigantes y vehículos livianos.'
  },
  REDUCIDA: {
    minMetros: 101,
    maxMetros: 500,
    nivel: 'Niebla moderada',
    color: 'naranja',
    badge: 'Visibilidad < 500 m',
    deduccion: 12,
    recomendacion: 'Circulación restringida: encendido de faros neblineros, pértiga con luz estroboscópica y distancia mínima de 50 m entre unidades.'
  },
  LIGERA: {
    minMetros: 501,
    maxMetros: 2000,
    nivel: 'Neblina ligera',
    color: 'amarillo',
    badge: 'Neblina ligera',
    deduccion: 5,
    recomendacion: 'Conducción a la defensiva con luces bajas obligatorias.'
  },
  OPTIMA: {
    minMetros: 2001,
    nivel: 'Óptima',
    color: 'verde',
    badge: 'Óptima',
    deduccion: 0,
    recomendacion: 'Visibilidad despejada para operaciones regulares en faena.'
  }
};

export const UMBRALES_SUELO = {
  SATURADO: {
    minHumedad: 0.40,
    nivel: 'Suelo saturado',
    color: 'rojo',
    badge: 'Suelo saturado',
    deduccion: 20,
    recomendacion: 'Saturación hídrica crítica en taludes y botaderos: riesgo inminente de deslizamientos y asentamiento de zapatas de grúas.'
  },
  HUMEDO: {
    minHumedad: 0.28,
    maxHumedad: 0.399,
    nivel: 'Suelo húmedo',
    color: 'amarillo',
    badge: 'Suelo húmedo',
    deduccion: 10,
    recomendacion: 'Terreno blando: verificar capacidad portante antes de posicionar equipos pesados o grúas móviles.'
  },
  ESTABLE: {
    maxHumedad: 0.279,
    nivel: 'Suelo estable',
    color: 'verde',
    badge: 'Estable',
    deduccion: 0,
    recomendacion: 'Humedad de terreno en rango normal y compactado.'
  }
};
