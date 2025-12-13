/**
 * A* Pathfinding algorithm implementation for hex grids
 */

import { hexKey, hexDistance, getNeighbors, isValidHex } from './hexGrid';

/**
 * Priority queue implementation using min-heap by f-score
 */
export class PriorityQueue {
  constructor() {
    this.items = [];
  }

  push(node) {
    this.items.push(node);
    this.items.sort((a, b) => a.f - b.f);
  }

  pop() {
    return this.items.shift();
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }

  has(q, r) {
    return this.items.some(n => n.q === q && n.r === r);
  }
}

/**
 * A* Algorithm state manager
 */
export class AStarState {
  constructor(destHex, radius) {
    this.destHex = destHex;
    this.radius = radius;
    this.openSet = new PriorityQueue();
    this.cameFrom = {};
    this.gScore = {};
    this.visited = new Set();
    this.hexData = {};
    this.step = 0;
    this.pathFound = false;
    this.isComplete = false;
    this.isStopped = false;
  }

  /**
   * Initialize with start node
   */
  initialize() {
    const startH = hexDistance(0, 0, this.destHex.q, this.destHex.r);
    const startKey = hexKey(0, 0);
    this.gScore[startKey] = 0;
    this.openSet.push({ q: 0, r: 0, f: startH, g: 0, h: startH });
  }

  /**
   * Get next node to explore
   * @returns {{q: number, r: number, f: number, g: number, h: number}|null}
   */
  getNext() {
    if (this.openSet.isEmpty()) {
      this.isComplete = true;
      return null;
    }
    return this.openSet.pop();
  }

  /**
   * Mark node as visited with driving time
   * @param {number} q
   * @param {number} r
   * @param {number|null} drivingTime
   * @param {number} gCost
   */
  markVisited(q, r, drivingTime, gCost) {
    const key = hexKey(q, r);
    this.visited.add(key);
    this.hexData[key] = { drivingTime, gCost, q, r };
    this.step++;

    if (q === this.destHex.q && r === this.destHex.r) {
      this.pathFound = true;
    }
  }

  /**
   * Process neighbors of current node
   * @param {number} q
   * @param {number} r
   * @param {number} currentG
   * @returns {Array<{q: number, r: number, isNew: boolean}>} - Neighbors that were added/updated
   */
  processNeighbors(q, r, currentG) {
    const neighbors = getNeighbors(q, r);
    const processed = [];

    for (const neighbor of neighbors) {
      const nKey = hexKey(neighbor.q, neighbor.r);

      // Skip invalid or visited
      if (!isValidHex(neighbor.q, neighbor.r, this.radius)) continue;
      if (this.visited.has(nKey)) continue;

      const tentativeG = currentG + 1;

      if (this.gScore[nKey] === undefined || tentativeG < this.gScore[nKey]) {
        this.cameFrom[nKey] = { q, r };
        this.gScore[nKey] = tentativeG;
        const h = hexDistance(neighbor.q, neighbor.r, this.destHex.q, this.destHex.r);
        const f = tentativeG + h;

        const isNew = !this.openSet.has(neighbor.q, neighbor.r);
        if (isNew) {
          this.openSet.push({ q: neighbor.q, r: neighbor.r, f, g: tentativeG, h });
        }

        processed.push({ ...neighbor, isNew });
      }
    }

    return processed;
  }

  /**
   * Reconstruct path from destination to start
   * @returns {Array<{q: number, r: number}>}
   */
  reconstructPath() {
    if (!this.pathFound) return [];

    const path = [];
    let curr = { ...this.destHex };

    while (curr) {
      path.push(curr);
      const key = hexKey(curr.q, curr.r);
      curr = this.cameFrom[key];
    }

    return path.reverse();
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      step: this.step,
      queueSize: this.openSet.size(),
      visitedCount: this.visited.size,
      pathFound: this.pathFound,
      isComplete: this.isComplete
    };
  }

  /**
   * Stop the algorithm
   */
  stop() {
    this.isStopped = true;
    this.isComplete = true;
  }
}

/**
 * Request queue for managing concurrent OSRM requests
 */
export class RequestQueue {
  constructor(concurrency = 6) {
    this.concurrency = concurrency;
    this.pending = 0;
    this.queue = [];
  }

  async add(fn) {
    if (this.pending >= this.concurrency) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    this.pending++;
    try {
      return await fn();
    } finally {
      this.pending--;
      if (this.queue.length > 0) {
        this.queue.shift()();
      }
    }
  }
}
