let lastNominatimRequestTime = 0;

function getFetchTimeoutSignal(timeoutMs = 12000) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs);
  }
  return undefined;
}

export async function searchLocationNominatim(query) {
  const cleanQuery = query?.trim();
  if (!cleanQuery || cleanQuery.length < 2) {
    return [];
  }

  // 1. Intentar con Nominatim (OpenStreetMap)
  try {
    const now = Date.now();
    const timeSinceLast = now - lastNominatimRequestTime;
    if (timeSinceLast < 1000) {
      await new Promise((resolve) => setTimeout(resolve, 1000 - timeSinceLast));
    }
    lastNominatimRequestTime = Date.now();

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'json');
    url.searchParams.set('q', cleanQuery);
    url.searchParams.set('limit', '5');
    url.searchParams.set('addressdetails', '1');

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json'
      },
      signal: getFetchTimeoutSignal(5000)
    });

    if (response.ok) {
      const items = await response.json();
      if (Array.isArray(items) && items.length > 0) {
        return items.map((item) => ({
          name: item.name || item.display_name.split(',')[0],
          displayName: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon)
        }));
      }
    }
  } catch (osmError) {
    console.warn('Servicio primario Nominatim no disponible, consultando geocodificación de respaldo Open-Meteo:', osmError?.message || osmError);
  }

  // 2. Respaldo resiliente: API de Geocodificación de Open-Meteo
  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', cleanQuery);
    url.searchParams.set('count', '5');
    url.searchParams.set('language', 'es');
    url.searchParams.set('format', 'json');

    const response = await fetch(url.toString(), {
      signal: getFetchTimeoutSignal(6000)
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.results && Array.isArray(data.results)) {
        return data.results.map((item) => {
          const parts = [item.name];
          if (item.admin1 && item.admin1 !== item.name) parts.push(item.admin1);
          if (item.country && item.country !== item.admin1) parts.push(item.country);
          return {
            name: item.name,
            displayName: parts.join(', '),
            lat: item.latitude,
            lon: item.longitude
          };
        });
      }
    }
  } catch (omError) {
    console.warn('Geocodificación de respaldo Open-Meteo no disponible:', omError?.message || omError);
  }

  return [];
}

export async function reverseGeocodeNominatim(lat, lon) {
  const now = Date.now();
  const timeSinceLast = now - lastNominatimRequestTime;
  if (timeSinceLast < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - timeSinceLast));
  }
  lastNominatimRequestTime = Date.now();

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'json');
    url.searchParams.set('lat', lat.toFixed(5));
    url.searchParams.set('lon', lon.toFixed(5));
    url.searchParams.set('zoom', '14');

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json'
      },
      signal: getFetchTimeoutSignal(6000)
    });

    if (!response.ok) return null;

    const data = await response.json();
    const addr = data.address || {};
    const local = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || addr.county || data.name;
    const region = addr.state || addr.region;

    if (local && region && local !== region) {
      return `${local}, ${region}`;
    }
    return local || region || data.display_name?.split(',')[0] || null;
  } catch {
    return null;
  }
}

export async function fetchWeatherData(lat, lon) {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat.toFixed(4));
    url.searchParams.set('longitude', lon.toFixed(4));
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set(
      'current',
      'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,surface_pressure'
    );
    url.searchParams.set(
      'hourly',
      'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,surface_pressure,visibility,wind_speed_10m,wind_speed_80m,wind_gusts_10m,wind_direction_10m,uv_index,cape,freezing_level_height,snowfall,snow_depth,soil_moisture_0_to_7cm'
    );
    url.searchParams.set(
      'minutely_15',
      'temperature_2m,apparent_temperature,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m,visibility,uv_index,cape,snowfall'
    );
    url.searchParams.set(
      'daily',
      'uv_index_max,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset'
    );

    const response = await fetch(url.toString(), {
      signal: getFetchTimeoutSignal(12000)
    });

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
