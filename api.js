/**
 * api.js - Módulo de llamadas a servicios externos
 * Proyecto: MiEntorno
 * 
 * En Fase 1: búsqueda de lugares vía OpenStreetMap Nominatim.
 * En Fase 2: llamada unificada a Open-Meteo Forecast (gratis, sin clave de API).
 */

let lastNominatimRequestTime = 0;

/**
 * Busca ubicaciones por nombre en OpenStreetMap (Nominatim).
 * Respeta la política de uso de máximo 1 consulta por segundo.
 * @param {string} query Texto a buscar
 * @returns {Promise<Array<{name: string, displayName: string, lat: number, lon: number}>>}
 */
export async function searchLocationNominatim(query) {
  const cleanQuery = query?.trim();
  if (!cleanQuery || cleanQuery.length < 2) {
    return [];
  }

  // Control estricto de tasa: mínimo 1 segundo entre solicitudes a Nominatim
  const now = Date.now();
  const timeSinceLast = now - lastNominatimRequestTime;
  if (timeSinceLast < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - timeSinceLast));
  }
  lastNominatimRequestTime = Date.now();

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'json');
    url.searchParams.set('q', cleanQuery);
    url.searchParams.set('limit', '5');
    url.searchParams.set('addressdetails', '1');

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error en el servidor de búsqueda (${response.status})`);
    }

    const items = await response.json();
    return items.map((item) => ({
      name: item.name || item.display_name.split(',')[0],
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon)
    }));
  } catch (error) {
    console.error('Error al consultar Nominatim:', error);
    throw error;
  }
}

/**
 * Consulta unificada a Open-Meteo Forecast API (gratis, sin API key).
 * Obtiene variables actuales, horarias y diarias requeridas para la matriz de riesgos SST.
 * 
 * @param {number} lat Latitud
 * @param {number} lon Longitud
 * @returns {Promise<object>} Objeto de datos meteorológicos procesados
 */
export async function fetchWeatherData(lat, lon) {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat.toFixed(4));
    url.searchParams.set('longitude', lon.toFixed(4));
    url.searchParams.set('timezone', 'auto');
    
    // Variables actuales
    url.searchParams.set('current', 'temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m');
    
    // Variables horarias (próximas horas para análisis de tendencias)
    url.searchParams.set(
      'hourly',
      'precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,uv_index,cape,weather_code'
    );
    
    // Variables diarias
    url.searchParams.set('daily', 'uv_index_max,sunrise,sunset');

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Open-Meteo respondió con estado ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error en fetchWeatherData (Open-Meteo):', error);
    throw error;
  }
}
