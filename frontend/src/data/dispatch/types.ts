/**
 * src/data/dispatch/types.ts
 * Type definitions for Plexus Autonomous Dispatch Data Layer.
 * LANDING_SPEC.md (v5.2) Section 21.1, 21.2, 21.3.
 */

import type { BloodType } from '../../types';

export type DispatchStatus =
  | 'proposed'
  | 'approved'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'delayed'
  | 'alert';

export type DispatchProduct = 'Apheresis' | 'RDP';

export interface ColdChainTelemetry {
  tempC: number;
  agitationOffMin: number;
  sealOk: boolean;
  doorOpens: number;
  tiltEvents: number;
  excursionMin?: number;
}

export interface Courier {
  id: string;
  name: string;
  phone: string;
  vehicleId: string;
  avatar?: string;
  rating?: number;
}

export interface Vehicle {
  id: string;
  type: 'bike' | 'van' | 'large_van';
  label: string;
  maxUnits: number;
  courierId: string;
  plate: string;
}

export interface DispatchOrder {
  id: string; // e.g. "TX-0412"
  from: string; // Hospital Code e.g. "APL"
  fromId: string; // Hospital ID e.g. "ND-11"
  fromName: string; // Full Name
  fromZone: string; // NCR Zone
  to: string; // Hospital Code e.g. "LNJ"
  toId: string; // Hospital ID e.g. "ND-09"
  toName: string; // Full Name
  toZone: string; // NCR Zone
  units: number;
  product: DispatchProduct;
  group: BloodType;
  shelfLifeAtDispatchH: number; // Remaining shelf life (out of 120h)
  distanceKm: number; // Driving distance from routes.json
  etaMin: number; // Driving duration from routes.json
  status: DispatchStatus;
  vehicleId: string; // e.g. "VAN-02"
  courier: Courier;
  startedAt: string; // "10:14"
  etaTime: string; // "10:33"
  progress: number; // 0.0 to 1.0
  coldChain: ColdChainTelemetry;
  fefoReason: string; // Spec 21.3: "FEFO: {from}'s oldest unit has {h} h left; {to} is {n}u short."
  reasonText: string;
  isDelayed?: boolean;
  delayMin?: number;
  hasTempExcursion?: boolean;
  deliveredAt?: string;
}

export interface DailyHistoryPoint {
  date: string;
  dayIndex: number;
  rescuedUnits: number;
  expiredUnits: number;
  onTimePct: number;
  isToday: boolean;
}

export interface ZoneSummary {
  zone: string;
  centroid: [number, number]; // [lat, lng]
  netBalance: number;
  status: 'surplus' | 'shortage' | 'balanced';
  hospitalCount: number;
  hospitalCodes: string[];
  hospitalIds: string[];
}

export type DispatchTab = 'proposed' | 'in_transit' | 'delivered' | 'exceptions';

