/**
 * OSRM (Open Source Routing Machine) service for driving time calculations
 */

const OSRM_URL = 'https://router.project-osrm.org';

/**
 * Fetch driving time between two points
 * @param {number[]} source - [lon, lat]
 * @param {number[]} dest - [lon, lat]
 * @returns {Promise<number|null>} - Driving time in minutes or null on error
 */
export async function fetchDrivingTime(source, dest) {
  const url = `${OSRM_URL}/route/v1/driving/${source[0]},${source[1]};${dest[0]},${dest[1]}?overview=false`;

  try {
    const response = await fetch(url);

    if (response.status !== 200) {
      return null;
    }

    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      // Convert seconds to minutes
      return data.routes[0].duration / 60.0;
    }

    return null;
  } catch (error) {
    console.error('OSRM request failed:', error);
    return null;
  }
}

/**
 * Fetch driving times for multiple routes in parallel
 * @param {Array<{source: number[], dest: number[]}>} routes
 * @param {number} concurrency - Max concurrent requests
 * @returns {Promise<Array<number|null>>}
 */
export async function fetchDrivingTimesBatch(routes, concurrency = 6) {
  const results = new Array(routes.length).fill(null);
  const queue = [...routes.map((route, index) => ({ ...route, index }))];
  const pending = [];

  while (queue.length > 0 || pending.length > 0) {
    // Fill up to concurrency limit
    while (pending.length < concurrency && queue.length > 0) {
      const route = queue.shift();
      const promise = fetchDrivingTime(route.source, route.dest)
        .then(time => {
          results[route.index] = time;
          return route.index;
        });
      pending.push(promise);
    }

    // Wait for one to complete
    if (pending.length > 0) {
      const completedIndex = await Promise.race(pending);
      const idx = pending.findIndex(p => p === completedIndex);
      if (idx > -1) pending.splice(idx, 1);
    }
  }

  return results;
}
