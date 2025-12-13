/**
 * A* Pathfinding Algorithm
 */
const Pathfinding = {
  // State
  openSet: [],
  cameFrom: {},
  gScore: {},
  visited: new Set(),
  hexData: {},
  step: 0,
  pathFound: false,
  stopRequested: false,

  /**
   * Reset state
   */
  reset() {
    this.openSet = [];
    this.cameFrom = {};
    this.gScore = {};
    this.visited = new Set();
    this.hexData = {};
    this.step = 0;
    this.pathFound = false;
    this.stopRequested = false;
  },

  /**
   * Priority queue push (sorted by f-score)
   */
  pushOpen(node) {
    this.openSet.push(node);
    this.openSet.sort((a, b) => a.f - b.f);
  },

  /**
   * Priority queue pop
   */
  popOpen() {
    return this.openSet.shift();
  },

  /**
   * Get driving time - INSTANT if cached, otherwise fetch
   */
  async getDrivingTime(q, r, hexSizeMeters, centerMerc, destLat, destLon) {
    const { lat: hexLat, lon: hexLon } = HexGrid.hexToLatLon(q, r, hexSizeMeters, centerMerc);
    const cacheKey = HexGrid.getCacheKey(hexLat, hexLon, destLat, destLon);

    // INSTANT: Check in-memory cache first
    const cached = CacheStore.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Try backend cache
    const backendData = await CacheStore.fetchFromBackend([cacheKey]);
    if (backendData[cacheKey] !== undefined) {
      return parseFloat(backendData[cacheKey]);
    }

    // Fetch from OSRM
    const time = await API.fetchOSRM([hexLon, hexLat], [destLon, destLat]);
    if (time !== null) {
      CacheStore.set(cacheKey, time);
    }
    return time;
  },

  /**
   * Run A* algorithm
   */
  async run(config, callbacks) {
    this.reset();

    const {
      centerLat, centerLon, destLat, destLon,
      radius, hexSizeKm, colorMin, colorMax
    } = config;

    const { onHexUpdate, onStatsUpdate, onStatusUpdate, onProgress, getSpeed } = callbacks;

    const hexSizeMeters = hexSizeKm * 1000;
    const centerPt = turf.point([centerLon, centerLat]);
    const centerMerc = turf.toMercator(centerPt).geometry.coordinates;
    const destPt = turf.point([destLon, destLat]);
    const destMerc = turf.toMercator(destPt).geometry.coordinates;

    // Find destination hex
    const destHex = HexGrid.findHexContaining(destMerc, centerMerc, hexSizeMeters);

    // Check if destination is within radius
    const destDist = HexGrid.hexDistance(0, 0, destHex.q, destHex.r);
    if (destDist > radius) {
      onStatusUpdate(`Destination outside grid! Distance: ${destDist} > radius ${radius}`);
      onStatsUpdate({ step: 0, queueSize: 0, visited: 0, pathLength: '-', status: 'Out of Range' });
      return [];
    }

    onStatusUpdate(`Target hex: (${destHex.q}, ${destHex.r})`);

    const totalHexes = HexGrid.calculateHexCount(radius);

    // Initialize start node
    const startH = HexGrid.hexDistance(0, 0, destHex.q, destHex.r);
    const startKey = HexGrid.hexKey(0, 0);
    this.gScore[startKey] = 0;
    this.pushOpen({ q: 0, r: 0, f: startH, g: 0, h: startH });
    onHexUpdate(0, 0, 'queued', null, 0, hexSizeMeters, centerMerc, colorMin, colorMax);

    onStatsUpdate({ step: 0, queueSize: 1, visited: 0, pathLength: '-', status: 'Starting A*' });

    // Main A* loop
    while (this.openSet.length > 0 && !this.stopRequested) {
      this.step++;
      const current = this.popOpen();
      const currentKey = HexGrid.hexKey(current.q, current.r);

      onStatsUpdate({
        step: this.step,
        queueSize: this.openSet.length,
        visited: this.visited.size,
        pathLength: '-',
        status: 'Exploring...'
      });
      onStatusUpdate(`Exploring (${current.q}, ${current.r}) - Step ${this.step}`);

      // Visualize as exploring
      onHexUpdate(current.q, current.r, 'exploring', null, current.g, hexSizeMeters, centerMerc, colorMin, colorMax);
      await new Promise(r => setTimeout(r, getSpeed()));

      if (this.stopRequested) break;

      // Get driving time - INSTANT if cached
      const drivingTime = await this.getDrivingTime(
        current.q, current.r, hexSizeMeters, centerMerc, destLat, destLon
      );

      // Mark visited
      this.visited.add(currentKey);
      this.hexData[currentKey] = { drivingTime, gCost: current.g, q: current.q, r: current.r };
      onHexUpdate(current.q, current.r, 'visited', drivingTime, current.g, hexSizeMeters, centerMerc, colorMin, colorMax);
      onProgress((this.visited.size / totalHexes) * 100);

      // Check if destination reached
      if (current.q === destHex.q && current.r === destHex.r) {
        this.pathFound = true;
      }

      // Explore neighbors
      const neighbors = HexGrid.getNeighbors(current.q, current.r);
      for (const neighbor of neighbors) {
        const nKey = HexGrid.hexKey(neighbor.q, neighbor.r);

        if (!HexGrid.isValid(neighbor.q, neighbor.r, radius)) continue;
        if (this.visited.has(nKey)) continue;

        const tentativeG = current.g + 1;

        if (this.gScore[nKey] === undefined || tentativeG < this.gScore[nKey]) {
          this.cameFrom[nKey] = { q: current.q, r: current.r };
          this.gScore[nKey] = tentativeG;
          const h = HexGrid.hexDistance(neighbor.q, neighbor.r, destHex.q, destHex.r);
          const f = tentativeG + h;

          const inOpen = this.openSet.find(n => n.q === neighbor.q && n.r === neighbor.r);
          if (!inOpen) {
            this.pushOpen({ q: neighbor.q, r: neighbor.r, f, g: tentativeG, h });
            onHexUpdate(neighbor.q, neighbor.r, 'queued', null, tentativeG, hexSizeMeters, centerMerc, colorMin, colorMax);
          }
        }
      }

      await new Promise(r => setTimeout(r, 10));
    }

    // Reconstruct path
    if (this.pathFound && !this.stopRequested) {
      const path = [];
      let curr = { ...destHex };
      while (curr) {
        path.push(curr);
        const key = HexGrid.hexKey(curr.q, curr.r);
        curr = this.cameFrom[key];
      }
      path.reverse();

      onStatsUpdate({
        step: this.step,
        queueSize: 0,
        visited: this.visited.size,
        pathLength: path.length,
        status: 'Highlighting Path'
      });
      onStatusUpdate(`Found path with ${path.length} hexagons!`);

      // Animate path
      for (const hex of path) {
        const key = HexGrid.hexKey(hex.q, hex.r);
        const data = this.hexData[key];
        onHexUpdate(hex.q, hex.r, 'path', data?.drivingTime, this.gScore[key], hexSizeMeters, centerMerc, colorMin, colorMax);
        await new Promise(r => setTimeout(r, getSpeed() / 2));
      }

      onStatsUpdate({
        step: this.step,
        queueSize: 0,
        visited: this.visited.size,
        pathLength: path.length,
        status: 'Complete!'
      });
      onStatusUpdate(`Path found: ${path.length} hexagons in ${this.step} steps`);

      return path;
    } else if (this.stopRequested) {
      onStatsUpdate({ step: this.step, queueSize: 0, visited: this.visited.size, pathLength: '-', status: 'Stopped' });
      onStatusUpdate('Generation stopped by user');
    } else {
      onStatsUpdate({ step: this.step, queueSize: 0, visited: this.visited.size, pathLength: 'None', status: 'No Path' });
      onStatusUpdate('No path found to destination!');
    }

    return [];
  },

  /**
   * Stop the algorithm
   */
  stop() {
    this.stopRequested = true;
  }
};
