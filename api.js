/**
 * api.js - Módulo de llamadas a servicios externos
 * Proyecto: MiEntorno
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
