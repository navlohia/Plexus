/**
 * src/world/types.ts
 * Domain Types for World Model
 * PORTAL_SPEC.md Section 1.3 - 1.9
 */

import { GROUPS, PRODUCTS, CAPACITY } from './config';

export type BloodGroup = (typeof GROUPS)[number];
export type PlateletProduct = (typeof PRODUCTS)[number];
export type VehicleType = keyof typeof CAPACITY; // 'bike' | 'van' | 'truck'
export type HospitalTier = 'hub' | 'large' | 'mid';

export interface Hospital {
  code: string; // 3-letter canonical code, e.g. 'AIM', 'SFD', 'N62'
  id: string; // Node ID, e.g. 'ND-01'
  name: string; // Short display name, e.g. 'AIIMS Trauma'
  fullName: string;
  city: string;
  zone: string;
  lat: number;
  lng: number;
  tier: HospitalTier;
  parLevels: Record<BloodGroup, number>;
  usagePerDay: Record<BloodGroup, Record<PlateletProduct, number>>;
  lastVerifiedAt: number; // sim ms
}

export interface Lot {
  lotId: string;
  hospital: string; // hospital code
  product: PlateletProduct;
  group: BloodGroup;
  units: number;
  collectedAt: number; // sim ms
  expiresAt: number; // sim ms (= collectedAt + 120h unless overridden)
  origin: 'donation' | 'transfer' | 'seed';
}

export type RequestUrgency = 'immediate' | 'urgent' | 'sameDay' | 'planned';
export type RequestStatus =
  | 'requested'
  | 'matching'
  | 'assigned'
  | 'in_transit'
  | 'delivered'
  | 'confirmed'
  | 'cancelled'
  | 'unfulfilled';

export interface PlateletRequest {
  id: string; // REQ-###
  hospital: string; // hospital code
  product: PlateletProduct;
  group: BloodGroup;
  units: number;
  urgency: RequestUrgency;
  createdAt: number; // sim ms
  neededBy: number; // sim ms (= createdAt + URGENCY_H)
  acceptAboCompatible: boolean;
  acceptPartial: boolean;
  contact?: string;
  indication?: 'dengue' | 'trauma' | 'oncology' | 'surgery' | 'other';
  caseRef?: string;
  status: RequestStatus;
  assignedOrderIds: string[];
  sourceTag?: string; // e.g. "from hospital portal"
}

export interface OrderAllocation {
  lotId: string;
  units: number;
  expiresAt: number; // sim ms
}

export type OrderStatus =
  | 'assigned'
  | 'packed'
  | 'in_transit'
  | 'arrived'
  | 'received'
  | 'cancelled';

export interface ColdChainTelemetry {
  tempC: number;
  minTempC: number;
  maxTempC: number;
  excursionMin: number;
  agitationOffMin: number;
  sealOk: boolean;
  doorOpens: number;
  tiltEvents: number;
}

export interface DispatchOrder {
  id: string; // TX-####
  requestId?: string | null;
  from: string; // hospital code
  to: string; // hospital code
  product: PlateletProduct;
  group: BloodGroup;
  units: number;
  allocations: OrderAllocation[];
  vehicleId?: string;
  courier: string;
  distanceKm: number;
  durationMin: number;
  assignedAt: number; // sim ms
  packedAt: number; // sim ms (= assignedAt + PREP_MIN)
  pickedUpAt: number; // sim ms (= packedAt + PICKUP_WAIT_MIN)
  deliveredAt: number; // sim ms (= pickedUpAt + durationMin * DURATION_FACTOR)
  receivedAt?: number | null;
  cancelledAt?: number | null;
  status: OrderStatus;
  delayed: boolean;
  delayMin: number;
  alert: boolean;
  alertReason?: string;
  coldChain: ColdChainTelemetry;
}

export interface Vehicle {
  id: string; // BIKE-01..06, VAN-01..06, TRUCK-01..02
  type: VehicleType;
  capacity: number;
  homeHospital: string; // hospital code
  courier: string;
}

export interface ScenarioZoneMultiplier {
  zone: string;
  multiplier: number;
}

export interface Scenario {
  id: string;
  preset: 'dengue' | 'trauma' | 'drought';
  startedAt: number; // sim ms
  durationH: number;
  zones: ScenarioZoneMultiplier[];
  productShift: number; // e.g. +0.15 Apheresis share
  donorDip: number; // e.g. -0.10
  autopilot: boolean;
}

export type WorldEventType =
  | 'ResetDemo'
  | 'RequestCreated'
  | 'RequestCancelled'
  | 'OrderAssigned'
  | 'OrderCancelled'
  | 'OrderDelayed'
  | 'ColdChainExcursion'
  | 'OrderReceived'
  | 'StockAdjusted'
  | 'LotReceived'
  | 'UnitsDiscarded'
  | 'CountSubmitted'
  | 'ParLevelSet'
  | 'SurplusReleased'
  | 'SolverRun'
  | 'ScenarioStarted'
  | 'ScenarioStopped'
  | 'SettingChanged'
  | 'UndoApplied';

export interface WorldEvent<T = any> {
  id: string; // idempotent string
  type: WorldEventType;
  at: number; // sim ms
  actor: string; // operator:<id> | AUTO | SCENARIO | SYSTEM
  payload: T;
}

export interface DayHistoryRecord {
  day: number;
  received: number;
  issued: number;
  sent: number;
  expired: number;
  rescued: number;
  onTimePct: number;
}

export interface World {
  simNow: number;
  hospitals: Record<string, Hospital>;
  lots: Record<string, Lot>;
  requests: Record<string, PlateletRequest>;
  orders: Record<string, DispatchOrder>;
  vehicles: Record<string, Vehicle>;
  activeScenario: Scenario | null;
  settings: {
    autopilot: boolean;
    speed: number;
  };
  history30d: DayHistoryRecord[];
}

export interface SolverProposal {
  kind: 'request' | 'rescue';
  requestId?: string;
  from: string; // source hospital code
  to: string; // recipient hospital code
  product: PlateletProduct;
  group: BloodGroup;
  units: number;
  allocations: OrderAllocation[];
  vehicleType: VehicleType;
  distanceKm: number;
  etaMin: number;
  arrivalShelfLifeH: number;
  score: number;
  reason: string;
}

export type HospitalState = 'short' | 'risk' | 'ok';
export type DeficitSeverity = 'critical' | 'high' | 'moderate';

