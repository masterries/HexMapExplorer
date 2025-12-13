/**
 * Color utility functions
 */
const Colors = {
  /**
   * Get color based on driving time (green to red gradient)
   */
  getColor(duration, minVal = 5, maxVal = 70) {
    if (duration === null || duration === undefined) {
      return '#9ca3af'; // gray
    }

    let d = duration;
    if (d < minVal) d = minVal;
    if (d > maxVal) d = maxVal;

    const ratio = (d - minVal) / (maxVal - minVal);
    const r = Math.round(ratio * 255);
    const g = Math.round((1 - ratio) * 255);

    return `rgb(${r},${g},0)`;
  },

  /**
   * Get hex style based on state
   */
  getHexStyle(state, drivingTime, colorMin, colorMax) {
    switch (state) {
      case 'queued':
        return { color: '#3b82f6', weight: 2, fillColor: '#93c5fd', fillOpacity: 0.4 };
      case 'exploring':
        return { color: '#f59e0b', weight: 3, fillColor: '#fbbf24', fillOpacity: 0.8 };
      case 'visited':
        return { color: '#ffffff', weight: 1, fillColor: this.getColor(drivingTime, colorMin, colorMax), fillOpacity: 0.4 };
      case 'path':
        return { color: '#dc2626', weight: 4, fillColor: this.getColor(drivingTime, colorMin, colorMax), fillOpacity: 0.5 };
      default:
        return { color: '#9ca3af', weight: 1, fillColor: '#e5e7eb', fillOpacity: 0.3 };
    }
  }
};
