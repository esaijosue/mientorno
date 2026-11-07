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
    deduccion: 0,
    severity: 0,
    recomendacion: 'Riesgo bajo: uso obligatorio de lentes de seguridad con filtro UV400 para personal en áreas abiertas.'
  },
  {
    min: 3,
    max: 5.9,
    nivel: 'Moderado',
    color: 'amarillo',
    badge: 'Moderado',
    deduccion: 0,
    severity: 0,
    recomendacion: 'Uso obligatorio de bloqueador solar FPS 50+ (reaplicar cada 3 h), casco con cortaviento/cubrenuca y camisa manga larga.'
  },
  {
    min: 6,
    max: 7.9,
    nivel: 'Alto',
    color: 'naranja',
    badge: 'Alto',
    deduccion: 10,
    severity: 3,
    recomendacion: 'Casco con cortaviento tipo legionario (cubrenuca), visera amplia y camisa manga larga. Hidratación programada (mínimo 250 ml cada 45 min) y reaplicación de bloqueador cada 2 h.'
  },
  {
    min: 8,
    max: 10.9,
    nivel: 'Muy alto',
    color: 'rojo',
    badge: 'Muy alto',
    deduccion: 18,
    severity: 4,
    recomendacion: 'Riesgo severo: habilitar toldos o mallas raschel en frentes de trabajo y rotar cuadrillas a la sombra. Hidratación continua obligatoria cada 20-30 min y reaplicación horaria de bloqueador FPS 50+.'
  },
  {
    min: 11,
    max: Infinity,
    nivel: 'Extremo',
    color: 'rojo-extremo',
    badge: 'Extremo',
    deduccion: 25,
    severity: 5,
    recomendacion: 'Peligro crítico de quemaduras y golpe de calor: suspender tareas pesadas a cielo abierto entre 11:00 y 15:00 h. Disponer de sales de rehidratación oral en refugios y descanso obligatorio bajo sombra.'
  }
];

export const UMBRALES_LLUVIA = {
  SECO: {
    nivel: 'Seco',
    pill: 'pill-green',
    deduccion: 0,
    severity: 0,
    recomendacion: 'Vías secas y compactadas: tránsito regular de volquetes y equipos móviles. Mantener riego controlado antipolvo.'
  },
  LLOVIZNA: {
    nivel: 'Llovizna',
    pill: 'pill-amber',
    deduccion: 6,
    severity: 1,
    recomendacion: 'Alerta de calzada resbaladiza: reducir velocidad en rampas un 20%, activar tracción auxiliar e inspeccionar adherencia de neumáticos.'
  },
  MODERADA: {
    nivel: 'Lluvia moderada',
    pill: 'pill-amber',
    deduccion: 12,
    severity: 3,
    recomendacion: 'Condición de riesgo en ruta: velocidad máx 20 km/h, duplicar distancia entre volquetes (mín 60 m), uso de trajes impermeables y 3 puntos de apoyo en cabinas.'
  },
  INTENSA: {
    nivel: 'Lluvia intensa',
    pill: 'pill-red',
    deduccion: 20,
    severity: 4,
    recomendacion: 'Suspensión preventiva de acarreo en rampas empinadas y labores al pie de taludes: verificar cunetas de coronación y drenajes de tajo.'
  }
};

export const UMBRALES_VIENTO = {
  NORMAL: {
    maxRafaga: 24.9,
    nivel: 'Normal',
    color: 'verde',
    badge: 'Normal',
    deduccion: 0,
    severity: 0,
    recomendacion: 'Condiciones aerodinámicas seguras: trabajos en altura, andamios e izajes autorizados con PETAR y viento guía regular.'
  },
  PRECAUCION: {
    minRafaga: 25,
    maxRafaga: 31.9,
    nivel: 'Precaución',
    color: 'amarillo',
    badge: 'Precaución',
    deduccion: 8,
    severity: 2,
    recomendacion: 'Alerta en izajes: uso obligatorio de dos vientos guía (taglines), barbiquejo de 3 puntos en cascos, amarre de herramientas y prohibición de izar cargas de gran superficie.'
  },
  RESTRICCION: {
    minRafaga: 32,
    maxRafaga: 49.9,
    nivel: 'Restricción izaje',
    color: 'rojo',
    badge: 'Restricción izaje',
    deduccion: 20,
    severity: 4,
    recomendacion: 'Parada obligatoria de izajes de cargas críticas y grúas móviles (≥ 32 km/h D.S. 024-2016-EM Art. 385). Descenso de personal de manlifts y plataformas.'
  },
  SUSPENSION: {
    minRafaga: 50.0,
    nivel: 'Suspensión',
    color: 'rojo',
    badge: 'Suspensión',
    deduccion: 35,
    severity: 5,
    recomendacion: 'Parada obligatoria total de trabajos en altura (Norma G.050 / OSHA): desalojo de andamios y techos, aseguramiento de plumas en posición de reposo y repliegue de cuadrillas.'
  }
};

export const UMBRALES_CAPE = {
  BAJO: {
    maxCape: 499,
    nivel: 'Verde (Normal)',
    color: 'verde',
    badge: 'Estable (> 50 km)',
    deduccion: 0,
    severity: 0,
    recomendacion: 'Condición normal: atmósfera estable sin potencial convectivo. Operaciones regulares de campo y monitoreo rutinario del detector de tormentas.'
  },
  MODERADO: {
    minCape: 500,
    maxCape: 1499,
    nivel: 'Alerta Amarilla',
    color: 'amarillo',
    badge: 'Vigilancia (32-50 km)',
    deduccion: 6,
    severity: 1,
    recomendacion: 'Alerta Amarilla (Vigilancia 32-50 km): inestabilidad convectiva en desarrollo. Notificación radial preventiva a supervisores, verificar disponibilidad de refugios Faraday y prohibir inicio de voladuras a la intemperie.'
  },
  ALTO: {
    minCape: 1500,
    maxCape: 2499,
    nivel: 'Alerta Naranja',
    color: 'naranja',
    badge: 'Restricción (16-32 km)',
    deduccion: 14,
    severity: 3,
    recomendacion: 'Alerta Naranja (Restricción 16-32 km): fuerte energía convectiva. Suspensión obligatoria de izajes con grúas, trabajos en altura (andamios) y voladuras; repliegue preventivo de cuadrillas en crestas y cumbres hacia refugios.'
  },
  MUY_ALTO: {
    minCape: 2500,
    nivel: 'Alerta Roja',
    color: 'rojo',
    badge: 'Evacuación (< 16 km)',
    deduccion: 22,
    severity: 4,
    recomendacion: 'Alerta Roja (Evacuación inminente < 16 km): energía convectiva extrema con alto potencial de descargas directas. Evacuación inmediata de frentes abiertos a refugios Faraday certificados o vehículos cerrados.'
  }
};

export const WEATHER_CODES_TORMENTA = [95, 96, 99];

export const REGLA_TORMENTA_ACTIVA = {
  nivel: 'Alerta Roja',
  badge: 'Descargas en faena (< 16 km)',
  deduccion: 35,
  severity: 5,
  recomendacion: 'Alerta Roja de emergencia (Descargas en faena < 16 km): evacuación inmediata obligatoria a refugios Faraday certificados o vehículos con cabina metálica cerrada (D.S. 024-2016-EM). Aplicar regla 30/30 OMM: esperar 30 min sin descargas para reanudar.'
};

export const UMBRALES_TEMPERATURA = {
  FRIO_EXTREMO: {
    maxTemp: -5.0,
    nivel: 'Helada extrema',
    color: 'rojo',
    badge: 'Helada extrema',
    deduccion: 25,
    severity: 5,
    recomendacion: 'Riesgo crítico de hipotermia: suspender labores exteriores no esenciales. Régimen de trabajo 30 min labor / 30 min en caseta climatizada, ropa térmica multicapa y bebidas calientes.'
  },
  FRIO_SEVERO: {
    minTemp: -4.9,
    maxTemp: 0.0,
    nivel: 'Bajo cero',
    color: 'naranja',
    badge: 'Bajo cero',
    deduccion: 15,
    severity: 4,
    recomendacion: 'Temperaturas bajo cero: uso de ropa térmica multicapa, guantes aislantes certificados y pausas de 15 min cada 2 h en refugios calefaccionados.'
  },
  FRIO_MODERADO: {
    minTemp: 0.1,
    maxTemp: 8.0,
    nivel: 'Frío moderado',
    color: 'amarillo',
    badge: 'Frío moderado',
    deduccion: 6,
    severity: 1,
    recomendacion: 'Uso obligatorio de cortavientos, casacas térmicas de faena y calistenia muscular previa para evitar lesiones osteomusculares.'
  },
  CONFORT: {
    minTemp: 8.1,
    maxTemp: 28.0,
    nivel: 'Confort térmico',
    color: 'verde',
    badge: 'Normal',
    deduccion: 0,
    severity: 0,
    recomendacion: 'Rango térmico confortable para operaciones en campo: mantener consumo basal de agua (mínimo 2 litros por turno).'
  },
  CALOR_MODERADO: {
    minTemp: 28.1,
    maxTemp: 32.0,
    nivel: 'Calor moderado',
    color: 'amarillo',
    badge: 'Calor moderado',
    deduccion: 6,
    severity: 1,
    recomendacion: 'Prevención de deshidratación: puntos de hidratación cada 100 m con consumo mínimo de 500 ml de agua por hora y pausas en sombra ventilada.'
  },
  CALOR_SEVERO: {
    minTemp: 32.1,
    maxTemp: 38.0,
    nivel: 'Estrés térmico',
    color: 'naranja',
    badge: 'Estrés térmico',
    deduccion: 15,
    severity: 3,
    recomendacion: 'Régimen de descanso obligatorio (ISO 7243 / R.M. 375-2008-TR): rotación de cuadrillas 45 min trabajo / 15 min descanso bajo sombra ventilada, e hidratación de 750 ml a 1 L/h con electrolitos.'
  },
  GOLPE_CALOR: {
    minTemp: 38.1,
    nivel: 'Golpe de calor',
    color: 'rojo',
    badge: 'Golpe de calor',
    deduccion: 25,
    severity: 5,
    recomendacion: 'Peligro inminente de shock térmico: suspender trabajos físicos pesados a la intemperie. Aplicar vigilancia de síntomas y traslado inmediato a área climatizada.'
  }
};

export const UMBRALES_NIEVE = {
  SIN_NIEVE: {
    maxNieve: 0.0,
    nivel: 'Sin nieve',
    color: 'verde',
    badge: 'Seco',
    deduccion: 0,
    severity: 0,
    recomendacion: 'Superficies y accesos libres de precipitación sólida: operaciones de acarreo y frentes de trabajo regulares.'
  },
  LIGERA: {
    minNieve: 0.1,
    maxNieve: 0.9,
    nivel: 'Escarcha ligera',
    color: 'amarillo',
    badge: 'Escarcha / aguanieve',
    deduccion: 8,
    severity: 1,
    recomendacion: 'Alerta de hielo negro (black ice): precaución extrema en parrillas metálicas (gratings), escaleras de maquinaria y curvas sombreadas de calzadas.'
  },
  MODERADA: {
    minNieve: 1.0,
    maxNieve: 4.9,
    nivel: 'Nevada moderada',
    color: 'naranja',
    badge: 'Nevada moderada',
    deduccion: 18,
    severity: 3,
    recomendacion: 'Uso obligatorio de cadenas en llantas de vehículos livianos y camiones, velocidad máx 20 km/h y esparcido de sal/arena en rampas críticas. Prohibido trabajos en techos.'
  },
  INTENSA: {
    minNieve: 5.0,
    nivel: 'Nevada severa',
    color: 'rojo',
    badge: 'Nevada severa',
    deduccion: 30,
    severity: 5,
    recomendacion: 'Parada obligatoria de acarreo y movimiento de tierras: repliegue de cuadrillas a refugios. Tránsito exclusivo de motoniveladoras y tractores para despeje de vías de emergencia.'
  }
};

export const UMBRALES_VISIBILIDAD = {
  OPTIMA: {
    minMetros: 2001,
    nivel: 'Óptima',
    color: 'verde',
    badge: 'Óptima',
    deduccion: 0,
    severity: 0,
    recomendacion: 'Visibilidad despejada: tránsito regular de volquetes y equipos móviles a velocidades normadas de faena con luces bajas encendidas.'
  },
  LIGERA: {
    minMetros: 501,
    maxMetros: 2000,
    nivel: 'Neblina ligera',
    color: 'amarillo',
    badge: 'Neblina ligera',
    deduccion: 5,
    severity: 1,
    recomendacion: 'Conducción a la defensiva: velocidad máx 40 km/h en haul roads, distancia mínima de 30 m entre unidades y chalecos reflectivos clase 3 en personal de piso.'
  },
  REDUCIDA: {
    minMetros: 101,
    maxMetros: 500,
    nivel: 'Niebla moderada',
    color: 'naranja',
    badge: 'Niebla moderada',
    deduccion: 12,
    severity: 3,
    recomendacion: 'Circulación restringida: faros neblineros amarillos, pértiga estroboscópica LED activa, distancia mínima de 60 m entre camiones y comunicación radial por punto kilométrico.'
  },
  CRITICA: {
    maxMetros: 100,
    nivel: 'Niebla densa',
    color: 'rojo',
    badge: 'Niebla densa',
    deduccion: 25,
    severity: 5,
    recomendacion: 'Detención total de tránsito de acarreo pesado y vehículos livianos: parqueo seguro en bahías de emergencia, luces de emergencia encendidas y prohibición de tránsito peatonal en tajo.'
  }
};

export const UMBRALES_SUELO = {
  ESTABLE: {
    maxHumedad: 0.279,
    nivel: 'Suelo estable',
    color: 'verde',
    badge: 'Estable',
    deduccion: 0,
    severity: 0,
    recomendacion: 'Terreno compactado y estable: operaciones regulares de excavación, tránsito de acarreo y posicionamiento de equipos sin restricción geotécnica.'
  },
  HUMEDO: {
    minHumedad: 0.28,
    maxHumedad: 0.399,
    nivel: 'Suelo húmedo',
    color: 'amarillo',
    badge: 'Suelo húmedo',
    deduccion: 10,
    severity: 2,
    recomendacion: 'Terreno blando: inspección visual de grietas en coronación de taludes. En grúas móviles, uso obligatorio de almohadillas (mats) de doble área bajo zapatas estabilizadoras y distancia mínima de 3 m al borde de zanjas.'
  },
  SATURADO: {
    minHumedad: 0.40,
    nivel: 'Suelo saturado',
    color: 'rojo',
    badge: 'Suelo saturado',
    deduccion: 20,
    severity: 4,
    recomendacion: 'Saturación hídrica crítica en taludes y botaderos: riesgo inminente de deslizamiento y asentamiento de equipos. Evacuación inmediata de cuadrillas al pie de talud y prohibición absoluta de izajes sobre terreno natural.'
  }
};

/**
 * METODOLOGÍA DEL ÍNDICE DE SEGURIDAD EN FAENA (ISF) - 2 CAPAS
 * Conforme a Ley N° 29783, D.S. 024-2016-EM e ICMM Critical Risk Management.
 * Capa 1: Ponderación multicriterio por criticidad operacional (suma 100%).
 * Capa 2: Puerta de Control Crítico (Non-compensatory Gating) por severidad máxima.
 */
export const FACTOR_WEIGHTS = {
  tormenta: 0.25,      // 25% - Riesgo de fatalidad inmediata por descargas (D.S. 024-2016-EM)
  viento: 0.20,        // 20% - Riesgo crítico en izajes con grúas y trabajos en altura (ASME B30.5 / G.050)
  temperatura: 0.15,   // 15% - Estrés térmico extremo (hipotermia severa o golpe de calor mortal ISO 7243)
  lluvia: 0.10,        // 10% - Pérdida de adherencia, derrape de volquetes y anegamiento en tajo
  nieve: 0.10,         // 10% - Congelamiento de pistas, pérdida de tracción en alta montaña
  suelo: 0.10,         // 10% - Inestabilidad de taludes y asentamiento de maquinaria pesada
  visibilidad: 0.05,   // 5%  - Pérdida visual en tránsito de acarreo (niebla/polvo)
  uv: 0.05             // 5%  - Exposición solar acumulativa (Ley N° 30102)
};

export const SEVERITY_APTITUDES = {
  0: 100, // Normal / Seguro (100% de aptitud)
  1: 85,  // Bajo / Leve (85% de aptitud)
  2: 65,  // Moderado / Precaución (65% de aptitud)
  3: 40,  // Alto / Restricción táctica (40% de aptitud)
  4: 15,  // Muy alto / Severo (15% de aptitud)
  5: 0    // Crítico extremo / Parada técnica (0% de aptitud)
};

export const BASE_CRITICAL_CEILINGS = {
  5: 25.0, // Parada técnica obligatoria (Alerta Roja Crítica)
  4: 50.0, // Operación restringida (Alerta Naranja)
  3: 75.0, // Precaución táctica (Alerta Amarilla)
  2: 100.0,
  1: 100.0,
  0: 100.0
};

export function calcularIndiceSeguridad(factors) {
  let weightedScore = 0;
  let maxSeverity = 0;
  let criticalFactor = null;
  let sev5Count = 0;
  let sev4Count = 0;

  for (const [key, weight] of Object.entries(FACTOR_WEIGHTS)) {
    const factorData = factors[key] || { severity: 0 };
    const sev = Math.max(0, Math.min(5, Number(factorData.severity) || 0));
    const aptitude = SEVERITY_APTITUDES[sev] !== undefined ? SEVERITY_APTITUDES[sev] : 100;

    weightedScore += weight * aptitude;
    if (sev === 5) sev5Count++;
    if (sev === 4) sev4Count++;
    if (sev > maxSeverity) {
      maxSeverity = sev;
      criticalFactor = key;
    }
  }

  let ceiling = BASE_CRITICAL_CEILINGS[maxSeverity] !== undefined ? BASE_CRITICAL_CEILINGS[maxSeverity] : 100.0;
  if (sev5Count > 1) {
    ceiling = Math.max(0, ceiling - (sev5Count - 1) * 10);
  } else if (sev5Count === 1 && sev4Count > 0) {
    ceiling = Math.max(0, ceiling - sev4Count * 5);
  } else if (sev4Count > 1) {
    ceiling = Math.max(0, ceiling - (sev4Count - 1) * 8);
  }

  const isGateActive = weightedScore > ceiling;
  const finalScore = Math.max(0, Math.min(100, Math.min(weightedScore, ceiling)));

  return {
    finalScore: Number(finalScore.toFixed(1)),
    weightedScore: Number(weightedScore.toFixed(1)),
    maxSeverity,
    ceiling: Number(ceiling.toFixed(1)),
    isGateActive,
    criticalFactor,
    sev5Count,
    sev4Count
  };
}

export function evaluateHourlySlot(hourlyData, i) {
  const uvVal = hourlyData.uv_index?.[i] || 0;
  let uvSev = 0;
  if (uvVal >= 11) uvSev = 5;
  else if (uvVal >= 8) uvSev = 4;
  else if (uvVal >= 6) uvSev = 3;
  else if (uvVal >= 3) uvSev = 1;

  const rainVal = hourlyData.precipitation?.[i] || 0;
  const probVal = hourlyData.precipitation_probability?.[i] || 0;
  let rainSev = 0;
  if (rainVal >= 5.0 || probVal >= 70) rainSev = 4;
  else if (rainVal >= 1.0 || probVal >= 40) rainSev = 3;
  else if (rainVal >= 0.1 || probVal >= 20) rainSev = 1;

  const windVal = hourlyData.wind_speed_10m?.[i] || 0;
  const gustVal = hourlyData.wind_gusts_10m?.[i] || 0;
  const effectiveWind = Math.max(windVal, gustVal);
  let windSev = 0;
  if (effectiveWind >= 50.0) windSev = 5;
  else if (effectiveWind >= 32.0) windSev = 4;
  else if (effectiveWind >= 25.0) windSev = 2;

  const weatherCode = hourlyData.weather_code?.[i];
  const capeVal = hourlyData.cape?.[i] || 0;
  let stormSev = 0;
  if (WEATHER_CODES_TORMENTA.includes(weatherCode)) stormSev = 5;
  else if (capeVal >= 2500) stormSev = 4;
  else if (capeVal >= 1500) stormSev = 3;
  else if (capeVal >= 500) stormSev = 1;

  const tempVal = hourlyData.temperature_2m?.[i] ?? 15;
  const appVal = hourlyData.apparent_temperature?.[i] ?? tempVal;
  const minT = Math.min(tempVal, appVal);
  const maxT = Math.max(tempVal, appVal);
  let tempSev = 0;
  if (minT <= -5.0 || maxT >= 38.0) tempSev = 5;
  else if (minT <= 0.0) tempSev = 4;
  else if (maxT >= 32.0) tempSev = 3;
  else if (minT <= 8.0 || maxT >= 28.0) tempSev = 1;

  const snowVal = hourlyData.snowfall?.[i] || 0;
  let snowSev = 0;
  if (snowVal >= 5.0) snowSev = 5;
  else if (snowVal >= 1.0) snowSev = 3;
  else if (snowVal > 0) snowSev = 1;

  const visVal = hourlyData.visibility?.[i] ?? 10000;
  let visSev = 0;
  if (visVal < 100) visSev = 5;
  else if (visVal < 500) visSev = 3;
  else if (visVal < 2000) visSev = 1;

  const soilVal = hourlyData.soil_moisture_0_to_7cm?.[i] || 0.15;
  let soilSev = 0;
  if (soilVal >= 0.40) soilSev = 4;
  else if (soilVal >= 0.28) soilSev = 2;

  return calcularIndiceSeguridad({
    uv: { severity: uvSev },
    lluvia: { severity: rainSev },
    viento: { severity: windSev },
    tormenta: { severity: stormSev },
    temperatura: { severity: tempSev },
    nieve: { severity: snowSev },
    visibilidad: { severity: visSev },
    suelo: { severity: soilSev }
  });
}
