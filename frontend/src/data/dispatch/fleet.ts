/**
 * src/data/dispatch/fleet.ts
 * 4 Vans and 4 Two-Wheelers with demo couriers.
 * LANDING_SPEC.md (v5.2) Section 21.2 (Widget 11) & Section 21.3.
 */

import type { Courier, Vehicle } from './types';
import { NCR_HOSPITAL_METAS } from '../../lib/hospitalTelemetry';

export const DISPATCH_FLEET_VEHICLES: Vehicle[] = [
  { id: 'VAN-01', type: 'van', label: 'Isothermal Van (Standard)', maxUnits: 12, courierId: 'CR-01', plate: 'DL-1L-AA-2041' },
  { id: 'VAN-02', type: 'van', label: 'Isothermal Van (Standard)', maxUnits: 12, courierId: 'CR-02', plate: 'DL-1L-BB-8461' },
  { id: 'VAN-03', type: 'large_van', label: 'Heavy Isothermal Box', maxUnits: 24, courierId: 'CR-03', plate: 'DL-1L-CC-9104' },
  { id: 'VAN-04', type: 'van', label: 'Isothermal Van (Standard)', maxUnits: 12, courierId: 'CR-04', plate: 'HR-26-DD-5321' },
  { id: 'BIKE-01', type: 'bike', label: 'Rapid Cold-Box Bike', maxUnits: 4, courierId: 'CR-05', plate: 'DL-3S-EE-1120' },
  { id: 'BIKE-02', type: 'bike', label: 'Rapid Cold-Box Bike', maxUnits: 4, courierId: 'CR-06', plate: 'DL-3S-FF-3409' },
  { id: 'BIKE-03', type: 'bike', label: 'Rapid Cold-Box Bike', maxUnits: 4, courierId: 'CR-07', plate: 'UP-16-GG-7823' },
  { id: 'BIKE-04', type: 'bike', label: 'Rapid Cold-Box Bike', maxUnits: 4, courierId: 'CR-08', plate: 'HR-51-HH-4491' },
];

export const DISPATCH_COURIERS: Courier[] = [
  { id: 'CR-01', name: 'Rajesh Kumar', phone: '+91 98110 23451', vehicleId: 'VAN-01', rating: 4.9 },
  { id: 'CR-02', name: 'Amit Sharma', phone: '+91 98712 55432', vehicleId: 'VAN-02', rating: 4.95 },
  { id: 'CR-03', name: 'Vikram Singh', phone: '+91 99103 44521', vehicleId: 'VAN-03', rating: 4.88 },
  { id: 'CR-04', name: 'Suresh Patel', phone: '+91 98188 77610', vehicleId: 'VAN-04', rating: 4.92 },
  { id: 'CR-05', name: 'Manoj Verma', phone: '+91 98731 22904', vehicleId: 'BIKE-01', rating: 4.96 },
  { id: 'CR-06', name: 'Deepak Yadav', phone: '+91 99580 66312', vehicleId: 'BIKE-02', rating: 4.91 },
  { id: 'CR-07', name: 'Rahul Gupta', phone: '+91 98104 88129', vehicleId: 'BIKE-03', rating: 4.89 },
  { id: 'CR-08', name: 'Sanjay Rao', phone: '+91 99991 33201', vehicleId: 'BIKE-04', rating: 4.94 },
];

// Base vehicle depots distributed across Delhi-NCR hubs
const VEHICLE_DEPOTS: Record<string, [number, number]> = {
  'VAN-01': [28.5672, 77.2100], // AIIMS Central Hub
  'VAN-02': [28.5412, 77.2831], // Apollo Sarita
  'VAN-03': [28.4393, 77.0416], // Medanta Gurugram
  'VAN-04': [28.6189, 77.3614], // Fortis Noida
  'BIKE-01': [28.6247, 77.2023], // RML Central
  'BIKE-02': [28.6835, 77.3105], // GTB East
  'BIKE-03': [28.5888, 77.0601], // Manipal Dwarka
  'BIKE-04': [28.7125, 77.1189], // Saroj Rohini
};

/**
 * Determine vehicle type strictly by payload per Spec 21.2 Widget 11:
 * ≤ 4u: two-wheeler, 5–12u: van, > 12u: large van
 */
export function getVehicleTypeForPayload(units: number): 'bike' | 'van' | 'large_van' {
  if (units <= 4) return 'bike';
  if (units <= 12) return 'van';
  return 'large_van';
}

/**
 * Assign the nearest free vehicle to the pickup hospital (haversine) with deterministic tie-break.
 */
export function assignVehicleAndCourier(
  pickupHospitalIdOrCode: string,
  units: number,
  usedVehicleIds: Set<string> = new Set()
): { vehicle: Vehicle; courier: Courier } {
  const reqType = getVehicleTypeForPayload(units);

  const meta =
    NCR_HOSPITAL_METAS[pickupHospitalIdOrCode] ||
    Object.values(NCR_HOSPITAL_METAS).find((m) => m.code === pickupHospitalIdOrCode) ||
    NCR_HOSPITAL_METAS['ND-01'];

  const [pickupLng, pickupLat] = meta.coords;

  // Filter eligible vehicles by capacity
  const eligible = DISPATCH_FLEET_VEHICLES.filter((v) => {
    if (usedVehicleIds.has(v.id)) return false;
    if (reqType === 'bike') return v.type === 'bike';
    if (reqType === 'large_van') return v.type === 'large_van' || v.type === 'van';
    return v.type === 'van' || v.type === 'large_van';
  });

  const candidates = eligible.length > 0 ? eligible : DISPATCH_FLEET_VEHICLES;

  let bestVehicle = candidates[0];
  let minDistance = Infinity;

  for (const v of candidates) {
    const depot = VEHICLE_DEPOTS[v.id] || [28.61, 77.23];
    const dLat = (depot[0] - pickupLat) * 111;
    const dLng = (depot[1] - pickupLng) * 111 * Math.cos((pickupLat * Math.PI) / 180);
    const dist = Math.hypot(dLat, dLng);

    if (dist < minDistance) {
      minDistance = dist;
      bestVehicle = v;
    }
  }

  const courier =
    DISPATCH_COURIERS.find((c) => c.vehicleId === bestVehicle.id) || DISPATCH_COURIERS[0];

  return { vehicle: bestVehicle, courier };
}

