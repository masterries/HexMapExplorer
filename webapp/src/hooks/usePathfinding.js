/**
 * React hook for A* pathfinding algorithm with visualization
 */

import { useState, useCallback, useRef } from 'react';
import * as turf from '@turf/turf';
import { AStarState } from '../utils/pathfinding';
import { findHexContaining, hexDistance, hexKey } from '../utils/hexGrid';
import { useCache } from './useCache';

/**
 * Hook for managing pathfinding state and execution
 * @returns {Object} Pathfinding state and controls
 */
export function usePathfinding() {
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState({
    step: 0,
    queueSize: 0,
    visitedCount: 0,
    pathLength: '-',
    status: 'Ready'
  });
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [speed, setSpeed] = useState(50);
  const [path, setPath] = useState([]);

  const stopRequestedRef = useRef(false);
  const aStarStateRef = useRef(null);
  const { getDrivingTime, isCached, getCachedValue } = useCache();

  /**
   * Run A* algorithm with visualization
   * @param {Object} params - Algorithm parameters
   * @param {Function} onHexUpdate - Callback when hex state changes
   * @returns {Promise<Array>} - Final path
   */
  const runPathfinding = useCallback(async ({
    centerLat,
    centerLon,
    destLat,
    destLon,
    radius,
    hexSizeKm,
    onHexUpdate
  }) => {
    setIsRunning(true);
    setPath([]);
    stopRequestedRef.current = false;

    const hexSizeMeters = hexSizeKm * 1000;

    // Convert to Mercator
    const centerPt = turf.point([centerLon, centerLat]);
    const centerMerc = turf.toMercator(centerPt).geometry.coordinates;

    // Find destination hex
    const destHex = findHexContaining(destLat, destLon, centerLat, centerLon, hexSizeMeters);

    // Check if destination is within radius
    const destHexDist = hexDistance(0, 0, destHex.q, destHex.r);
    if (destHexDist > radius) {
      setStatusMessage(`Destination outside grid! Distance: ${destHexDist} > radius ${radius}`);
      setStats(prev => ({ ...prev, status: 'Out of Range' }));
      setIsRunning(false);
      return [];
    }

    setStatusMessage(`Target hex: (${destHex.q}, ${destHex.r})`);

    // Initialize A* state
    const astar = new AStarState(destHex, radius);
    astar.initialize();
    aStarStateRef.current = astar;

    const totalHexes = 3 * radius * (radius + 1) + 1;

    setStats({
      step: 0,
      queueSize: 1,
      visitedCount: 0,
      pathLength: '-',
      status: 'Starting A*'
    });

    // Add start hex to visualization
    onHexUpdate(0, 0, 'queued', null, 0);

    // Main A* loop
    while (!astar.isComplete && !stopRequestedRef.current) {
      const current = astar.getNext();
      if (!current) break;

      const currentKey = hexKey(current.q, current.r);

      // Update stats
      setStats({
        step: astar.step + 1,
        queueSize: astar.openSet.size(),
        visitedCount: astar.visited.size,
        pathLength: '-',
        status: 'Exploring...'
      });
      setStatusMessage(`Exploring (${current.q}, ${current.r}) - Step ${astar.step + 1}`);

      // Visualize current as exploring
      onHexUpdate(current.q, current.r, 'exploring', null, current.g);

      // Wait for animation
      await new Promise(r => setTimeout(r, speed));

      if (stopRequestedRef.current) break;

      // Get driving time - INSTANT if cached, otherwise fetch
      let drivingTime;
      if (isCached(current.q, current.r, hexSizeMeters, centerMerc, destLat, destLon)) {
        // INSTANT access from memory cache
        drivingTime = getCachedValue(current.q, current.r, hexSizeMeters, centerMerc, destLat, destLon);
      } else {
        // Need to fetch - this will cache it for future use
        drivingTime = await getDrivingTime(current.q, current.r, hexSizeMeters, centerMerc, destLat, destLon);
      }

      // Mark as visited
      astar.markVisited(current.q, current.r, drivingTime, current.g);
      onHexUpdate(current.q, current.r, 'visited', drivingTime, current.g);

      // Update progress
      setProgress((astar.visited.size / totalHexes) * 100);

      // Process neighbors
      const neighbors = astar.processNeighbors(current.q, current.r, current.g);
      for (const neighbor of neighbors) {
        if (neighbor.isNew) {
          onHexUpdate(neighbor.q, neighbor.r, 'queued', null, astar.gScore[hexKey(neighbor.q, neighbor.r)]);
        }
      }

      // Small delay for smooth visualization
      await new Promise(r => setTimeout(r, 10));
    }

    // Reconstruct and highlight path
    if (astar.pathFound && !stopRequestedRef.current) {
      const finalPath = astar.reconstructPath();
      setPath(finalPath);

      setStats(prev => ({
        ...prev,
        pathLength: finalPath.length,
        status: 'Highlighting Path'
      }));
      setStatusMessage(`Found path with ${finalPath.length} hexagons!`);

      // Animate path highlight
      for (const hex of finalPath) {
        const key = hexKey(hex.q, hex.r);
        const data = astar.hexData[key];
        onHexUpdate(hex.q, hex.r, 'path', data?.drivingTime, astar.gScore[key]);
        await new Promise(r => setTimeout(r, speed / 2));
      }

      setStats(prev => ({
        ...prev,
        status: 'Complete!'
      }));
      setStatusMessage(`Path found: ${finalPath.length} hexagons in ${astar.step} steps`);

      setIsRunning(false);
      return finalPath;
    } else if (stopRequestedRef.current) {
      setStats(prev => ({
        ...prev,
        status: 'Stopped'
      }));
      setStatusMessage('Generation stopped by user');
    } else {
      setStats(prev => ({
        ...prev,
        pathLength: 'None',
        status: 'No Path'
      }));
      setStatusMessage('No path found to destination!');
    }

    setIsRunning(false);
    return [];
  }, [speed, getDrivingTime, isCached, getCachedValue]);

  /**
   * Stop the running algorithm
   */
  const stopPathfinding = useCallback(() => {
    stopRequestedRef.current = true;
    if (aStarStateRef.current) {
      aStarStateRef.current.stop();
    }
    setStats(prev => ({ ...prev, status: 'Stopping...' }));
    setStatusMessage('Stopping generation...');
  }, []);

  /**
   * Reset pathfinding state
   */
  const resetPathfinding = useCallback(() => {
    setIsRunning(false);
    setStats({
      step: 0,
      queueSize: 0,
      visitedCount: 0,
      pathLength: '-',
      status: 'Ready'
    });
    setProgress(0);
    setStatusMessage('');
    setPath([]);
    stopRequestedRef.current = false;
    aStarStateRef.current = null;
  }, []);

  return {
    // State
    isRunning,
    stats,
    progress,
    statusMessage,
    speed,
    path,

    // Actions
    runPathfinding,
    stopPathfinding,
    resetPathfinding,
    setSpeed
  };
}

export default usePathfinding;
