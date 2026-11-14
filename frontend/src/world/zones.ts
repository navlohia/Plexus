/**
 * src/world/zones.ts
 * Zone Centroids and Nearest-Centroid Assignment
 * PORTAL_SPEC.md Section 1.1, LANDING_SPEC.md Section 21.3
 */

import hospitalZoneMappingJson from '../data/hospitalZoneMapping.json';

export interface ZoneCentroid {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const HOSPITAL_ZONE_MAPPING = hospitalZoneMappingJson;

export const NCR_ZONE_CENTROIDS: ZoneCentroid[] = [
  { id: 'north-delhi', name: 'North Delhi', lat: 28.72, lng: 77.17 },
  { id: 'west-delhi', name: 'West Delhi', lat: 28.65, lng: 77.05 },
  { id: 'central-delhi', name: 'Central Delhi', lat: 28.63, lng: 77.21 },
  { id: 'east-delhi', name: 'East Delhi', lat: 28.66, lng: 77.30 },
  { id: 'south-delhi', name: 'South Delhi', lat: 28.53, lng: 77.21 },
  { id: 'gurugram', name: 'Gurugram', lat: 28.46, lng: 77.03 },
  { id: 'faridabad', name: 'Faridabad', lat: 28.41, lng: 77.31 },
  { id: 'noida', name: 'Noida', lat: 28.57, lng: 77.35 },
  { id: 'ghaziabad', name: 'Ghaziabad', lat: 28.67, lng: 77.43 },
];

/**
 * Haversine distance in kilometers between two lat/lng points
 */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Nearest-centroid assignment of a coordinate to an NCR zone
 */
export function assignZoneByCentroid(lat: number, lng: number): string {
  let bestZone = NCR_ZONE_CENTROIDS[0].name;
  let bestDist = Infinity;

  for (const z of NCR_ZONE_CENTROIDS) {
    const dist = haversineKm(lat, lng, z.lat, z.lng);
    if (dist < bestDist) {
      bestDist = dist;
      bestZone = z.name;
    }
  }

  return bestZone;
}

/**
 * Assign hospital to zone by point-in-polygon with centroid fallback
 * PORTAL_SPEC.md Section 6.1
 */
export function assignZoneByPointInPolygon(hospitalCodeOrId: string, lat?: number, lng?: number): string {
  const code = hospitalCodeOrId.toUpperCase();
  const entry = (HOSPITAL_ZONE_MAPPING as Record<string, any>)[code];
  if (entry && entry.zone) {
    return entry.zone;
  }
  if (lat !== undefined && lng !== undefined) {
    return assignZoneByCentroid(lat, lng);
  }
  return 'Central Delhi';
}

