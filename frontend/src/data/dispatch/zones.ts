/**
 * src/data/dispatch/zones.ts
 * 9 NCR Zone Centroids and nearest-centroid assignment.
 * LANDING_SPEC.md (v5.2) Section 21.3.
 */

import { NCR_HOSPITAL_METAS } from '../../lib/hospitalTelemetry';
import type { ZoneSummary } from './types';

export interface ZoneCentroid {
  name: string;
  lat: number;
  lng: number;
}

export const NCR_ZONE_CENTROIDS: Record<string, [number, number]> = {
  'North Delhi': [28.72, 77.17],
  'West Delhi': [28.65, 77.05],
  'Central Delhi': [28.63, 77.21],
  'East Delhi': [28.66, 77.30],
  'South Delhi': [28.53, 77.21],
  'Gurugram': [28.46, 77.03],
  'Faridabad': [28.41, 77.31],
  'Noida': [28.57, 77.35],
  'Ghaziabad': [28.67, 77.43],
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Assign hospital to nearest centroid via Haversine distance
 */
export function assignHospitalToNearestZone(lat: number, lng: number): string {
  let closestZone = 'Central Delhi';
  let minDistance = Infinity;

  for (const [zoneName, [zLat, zLng]] of Object.entries(NCR_ZONE_CENTROIDS)) {
    const dist = haversineKm(lat, lng, zLat, zLng);
    if (dist < minDistance) {
      minDistance = dist;
      closestZone = zoneName;
    }
  }

  return closestZone;
}

/**
 * Pre-computed deterministic zone mapping for all 25 hospitals
 */
export const HOSPITAL_ZONE_MAPPING: Record<string, { code: string; name: string; zone: string; distKm: number }> =
  (() => {
    const map: Record<string, { code: string; name: string; zone: string; distKm: number }> = {};
    for (const [id, meta] of Object.entries(NCR_HOSPITAL_METAS)) {
      const [lng, lat] = meta.coords;
      let closestZone = 'Central Delhi';
      let minDistance = Infinity;
      for (const [zoneName, [zLat, zLng]] of Object.entries(NCR_ZONE_CENTROIDS)) {
        const dist = haversineKm(lat, lng, zLat, zLng);
        if (dist < minDistance) {
          minDistance = dist;
          closestZone = zoneName;
        }
      }
      map[id] = {
        code: meta.code,
        name: meta.fullName,
        zone: closestZone,
        distKm: Number(minDistance.toFixed(1)),
      };
    }
    return map;
  })();

export function getZoneForHospital(idOrCode: string): string {
  if (HOSPITAL_ZONE_MAPPING[idOrCode]) {
    return HOSPITAL_ZONE_MAPPING[idOrCode].zone;
  }
  const match = Object.entries(NCR_HOSPITAL_METAS).find(
    ([id, meta]) => id === idOrCode || meta.code.toUpperCase() === idOrCode.toUpperCase()
  );
  if (match) {
    return HOSPITAL_ZONE_MAPPING[match[0]]?.zone || 'Central Delhi';
  }
  return 'Central Delhi';
}

/**
 * Compute Zone Summaries from current hospital states / baseline stock
 */
export function computeZoneSummaries(
  nodeNetBalances?: Record<string, number>
): ZoneSummary[] {
  const zoneHospitals: Record<string, { codes: string[]; ids: string[]; netBalance: number }> = {};

  for (const zoneName of Object.keys(NCR_ZONE_CENTROIDS)) {
    zoneHospitals[zoneName] = { codes: [], ids: [], netBalance: 0 };
  }

  for (const [id, meta] of Object.entries(NCR_HOSPITAL_METAS)) {
    const zone = HOSPITAL_ZONE_MAPPING[id]?.zone || 'Central Delhi';
    const netBal =
      nodeNetBalances && nodeNetBalances[id] !== undefined
        ? nodeNetBalances[id]
        : meta.baselineNetBal;

    if (!zoneHospitals[zone]) {
      zoneHospitals[zone] = { codes: [], ids: [], netBalance: 0 };
    }
    zoneHospitals[zone].codes.push(meta.code);
    zoneHospitals[zone].ids.push(id);
    zoneHospitals[zone].netBalance += netBal;
  }

  return Object.entries(NCR_ZONE_CENTROIDS).map(([zoneName, centroid]) => {
    const data = zoneHospitals[zoneName] || { codes: [], ids: [], netBalance: 0 };
    const status: 'surplus' | 'shortage' | 'balanced' =
      data.netBalance > 2 ? 'surplus' : data.netBalance < -2 ? 'shortage' : 'balanced';

    return {
      zone: zoneName,
      centroid,
      netBalance: data.netBalance,
      status,
      hospitalCount: data.codes.length,
      hospitalCodes: data.codes,
      hospitalIds: data.ids,
    };
  });
}

