import { approxDistMeters } from './poi';

/**
 * Hobby-grade cross-border price seed. A handful of towns on the German,
 * Belgian and French sides of the Luxembourg border with INDICATIVE average
 * apartment prices (€/m²), so hexes outside Luxembourg still get a rough value
 * in Price mode.
 *
 * These are approximate public-knowledge ballpark figures — NOT official data.
 * Real per-country sources differ (German Bodenrichtwerte, French DVF, …); the
 * lookup mechanism stays the same if `perM2` is later replaced.
 */
export interface BorderTown {
  name: string;
  country: 'DE' | 'BE' | 'FR';
  lat: number;
  lon: number;
  /** Indicative average apartment €/m² (rough, not official). */
  perM2: number;
}

export const BORDER_TOWNS: BorderTown[] = [
  // --- Germany (Rheinland-Pfalz / Saarland) ---
  { name: 'Trier', country: 'DE', lat: 49.7596, lon: 6.6439, perM2: 3700 },
  { name: 'Konz', country: 'DE', lat: 49.7008, lon: 6.5772, perM2: 3400 },
  { name: 'Saarburg', country: 'DE', lat: 49.6086, lon: 6.5497, perM2: 2900 },
  { name: 'Wittlich', country: 'DE', lat: 49.9858, lon: 6.8911, perM2: 2600 },
  { name: 'Bitburg', country: 'DE', lat: 49.9747, lon: 6.5253, perM2: 2500 },
  { name: 'Bernkastel-Kues', country: 'DE', lat: 49.9133, lon: 7.07, perM2: 2900 },
  { name: 'Perl', country: 'DE', lat: 49.4711, lon: 6.3697, perM2: 3300 },
  { name: 'Merzig', country: 'DE', lat: 49.4439, lon: 6.6386, perM2: 2500 },
  { name: 'Mettlach', country: 'DE', lat: 49.4953, lon: 6.5969, perM2: 2400 },
  { name: 'Saarlouis', country: 'DE', lat: 49.3134, lon: 6.7519, perM2: 2500 },
  { name: 'Dillingen', country: 'DE', lat: 49.3567, lon: 6.7289, perM2: 2300 },
  { name: 'Saarbrücken', country: 'DE', lat: 49.2402, lon: 6.9969, perM2: 2900 },
  { name: 'Wadgassen', country: 'DE', lat: 49.2706, lon: 6.7872, perM2: 2200 },
  // --- Belgium (Province de Luxembourg, Arlon area) ---
  { name: 'Arlon', country: 'BE', lat: 49.6833, lon: 5.8167, perM2: 3000 },
  { name: 'Messancy', country: 'BE', lat: 49.5969, lon: 5.8186, perM2: 2700 },
  { name: 'Aubange', country: 'BE', lat: 49.5667, lon: 5.8, perM2: 2600 },
  { name: 'Athus', country: 'BE', lat: 49.5536, lon: 5.8264, perM2: 2600 },
  { name: 'Habay', country: 'BE', lat: 49.7228, lon: 5.6394, perM2: 2400 },
  { name: 'Virton', country: 'BE', lat: 49.5686, lon: 5.5328, perM2: 2100 },
  { name: 'Bastogne', country: 'BE', lat: 50.0036, lon: 5.7178, perM2: 2200 },
  // --- France (Lorraine: Moselle / Meurthe-et-Moselle) ---
  { name: 'Hettange-Grande', country: 'FR', lat: 49.4072, lon: 6.1631, perM2: 2800 },
  { name: 'Thionville', country: 'FR', lat: 49.3589, lon: 6.1683, perM2: 2600 },
  { name: 'Yutz', country: 'FR', lat: 49.3611, lon: 6.1856, perM2: 2400 },
  { name: 'Cattenom', country: 'FR', lat: 49.4153, lon: 6.27, perM2: 2400 },
  { name: 'Sierck-les-Bains', country: 'FR', lat: 49.4419, lon: 6.3589, perM2: 2300 },
  { name: 'Audun-le-Tiche', country: 'FR', lat: 49.475, lon: 5.9469, perM2: 2500 },
  { name: 'Villerupt', country: 'FR', lat: 49.4658, lon: 5.9314, perM2: 2300 },
  { name: 'Longwy', country: 'FR', lat: 49.5197, lon: 5.7608, perM2: 2100 },
  { name: 'Mont-Saint-Martin', country: 'FR', lat: 49.5347, lon: 5.7806, perM2: 2000 },
  { name: 'Hayange', country: 'FR', lat: 49.3306, lon: 6.0628, perM2: 1800 },
];

/** Nearest border town (DE/BE/FR) within `maxKm`, or null if none is close. */
export function nearestBorderTown(lat: number, lon: number, maxKm = 18): BorderTown | null {
  let best: BorderTown | null = null;
  let bestD = maxKm * 1000;
  for (const t of BORDER_TOWNS) {
    const d = approxDistMeters(lat, lon, t.lat, t.lon);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
}
