/**
 * src/world/vehicles.ts
 * Fleet Vehicles Definitions and Assignment Helpers
 * PORTAL_SPEC.md Section 1.3 & 1.11
 */

import { CAPACITY } from './config';
import type { Vehicle, VehicleType, RequestUrgency, DispatchOrder } from './types';
import { haversineKm } from './zones';
import hospitalsData from './hospitals.json';

const HOSPITAL_MAP = new Map(hospitalsData.map((h) => [h.code, h]));

export const INITIAL_VEHICLES: Vehicle[] = [
  // 6 Courier Bikes (capacity: 4u)
  { id: 'BIKE-01', type: 'bike', capacity: CAPACITY.bike, homeHospital: 'AIM', courier: 'Manoj Verma' },
  { id: 'BIKE-02', type: 'bike', capacity: CAPACITY.bike, homeHospital: 'SFD', courier: 'Arvind Yadav' },
  { id: 'BIKE-03', type: 'bike', capacity: CAPACITY.bike, homeHospital: 'LNJ', courier: 'Rahul Mehta' },
  { id: 'BIKE-04', type: 'bike', capacity: CAPACITY.bike, homeHospital: 'GTB', courier: 'Suresh Patel' },
  { id: 'BIKE-05', type: 'bike', capacity: CAPACITY.bike, homeHospital: 'MAX', courier: 'Deepak Rawat' },
  { id: 'BIKE-06', type: 'bike', capacity: CAPACITY.bike, homeHospital: 'BLK', courier: 'Anand Mohan' },

  // 6 Cold-Chain Vans (capacity: 16u)
  { id: 'VAN-01', type: 'van', capacity: CAPACITY.van, homeHospital: 'APL', courier: 'Rajesh Kumar' },
  { id: 'VAN-02', type: 'van', capacity: CAPACITY.van, homeHospital: 'N62', courier: 'Amit Sharma' },
  { id: 'VAN-03', type: 'van', capacity: CAPACITY.van, homeHospital: 'MDT', courier: 'Vikram Singh' },
  { id: 'VAN-04', type: 'van', capacity: CAPACITY.van, homeHospital: 'SGR', courier: 'Sanjay Gupta' },
  { id: 'VAN-05', type: 'van', capacity: CAPACITY.van, homeHospital: 'NH4', courier: 'Pradeep Joshi' },
  { id: 'VAN-06', type: 'van', capacity: CAPACITY.van, homeHospital: 'RML', courier: 'Rakesh Nair' },

  // 2 Cold-Chain Trucks (capacity: 40u)
  { id: 'TRUCK-01', type: 'truck', capacity: CAPACITY.truck, homeHospital: 'MDT', courier: 'Sunil Chauhan' },
  { id: 'TRUCK-02', type: 'truck', capacity: CAPACITY.truck, homeHospital: 'AIM', courier: 'Dinesh Pandey' },
];

/**
 * Determine ideal vehicle type by units payload and urgency:
 * - bike <= 4
 * - van 5-16
 * - truck > 16
 * - for 'immediate' requests of <= 4u: prefer bike
 */
export function getIdealVehicleType(units: number, _urgency?: RequestUrgency): VehicleType {
  if (units <= 4) {
    return 'bike';
  }
  if (units <= 16) {
    return 'van';
  }
  return 'truck';
}

/**
 * Pick the nearest available vehicle of matching or fitting type
 */
export function pickVehicle(
  units: number,
  fromHospitalCode: string,
  urgency: RequestUrgency = 'urgent',
  activeOrders: DispatchOrder[],
  vehicles: Record<string, Vehicle> = Object.fromEntries(INITIAL_VEHICLES.map((v) => [v.id, v])),
  now: number = Date.now()
): Vehicle | null {
  const idealType = getIdealVehicleType(units, urgency);

  // A vehicle is busy if it is allocated to an active order that has not yet been delivered / received
  const busyVehicleIds = new Set<string>();
  for (const order of activeOrders) {
    if (order.vehicleId && order.status !== 'received' && order.status !== 'cancelled') {
      if (now < order.deliveredAt) {
        busyVehicleIds.add(order.vehicleId);
      }
    }
  }

  const fromHosp = HOSPITAL_MAP.get(fromHospitalCode);
  const fromLat = fromHosp?.lat ?? 28.6;
  const fromLng = fromHosp?.lng ?? 77.2;

  // Filter candidates that have capacity >= units
  const available = Object.values(vehicles).filter(
    (v) => !busyVehicleIds.has(v.id) && v.capacity >= units
  );

  if (available.length === 0) {
    return null; // None free
  }

  // Prefer ideal type first, then larger
  const typeMatches = available.filter((v) => v.type === idealType);
  const pool = typeMatches.length > 0 ? typeMatches : available;

  // Sort by distance from homeHospital to pickup hospital
  pool.sort((a, b) => {
    const hospA = HOSPITAL_MAP.get(a.homeHospital);
    const hospB = HOSPITAL_MAP.get(b.homeHospital);
    const distA = hospA ? haversineKm(fromLat, fromLng, hospA.lat, hospA.lng) : 999;
    const distB = hospB ? haversineKm(fromLat, fromLng, hospB.lat, hospB.lng) : 999;
    if (Math.abs(distA - distB) > 0.1) {
      return distA - distB;
    }
    return a.id.localeCompare(b.id);
  });

  return pool[0] ?? null;
}

