/**
 * src/world/seed.ts
 * Seed Generator for World Model
 * PORTAL_SPEC.md Section 1.1, 1.3, 1.10
 */

import rawHospitals from './hospitals.json';
import { INITIAL_VEHICLES as FLEET } from './vehicles';
import type {
  Hospital,
  HospitalTier,
  Lot,
  DispatchOrder,
  PlateletRequest,
  Vehicle,
  Scenario,
  DayHistoryRecord,
  BloodGroup,
  PlateletProduct,
} from './types';
import { SHELF_LIFE_H } from './config';

export const ANCHOR_SIM_TIME = 1793874000000; // 05 Nov 2026, 15:40:00 IST

export interface SeedData {
  simNow: number;
  hospitals: Record<string, Hospital>;
  lots: Record<string, Lot>;
  requests: Record<string, PlateletRequest>;
  orders: Record<string, DispatchOrder>;
  vehicles: Record<string, Vehicle>;
  activeScenario: Scenario | null;
  settings: {
    speed: number;
    sound: boolean;
    autopilot: boolean;
  };
  history30d: DayHistoryRecord[];
}

/**
 * Deterministic PRNG: Mulberry32
 */
export function createPRNG(seed: number = 20261108) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates calibrated seed data for the 25-hospital Delhi-NCR network
 */
export function createSeedData(simNow: number = ANCHOR_SIM_TIME): SeedData {
  const rng = createPRNG(42069);

  // 1. Build Hospitals
  const hospitals: Record<string, Hospital> = {};
  const staleHospitalCodes = new Set(['STP', 'DRB', 'PRS']);

  for (const raw of rawHospitals) {
    const tier = (raw.tier || 'mid') as HospitalTier;
    const tierFactor = tier === 'hub' ? 1.8 : tier === 'large' ? 1.2 : 0.8;

    const parLevels: Record<BloodGroup, number> = {
      'O+': Math.round(10 * tierFactor),
      'O-': Math.round(5 * tierFactor),
      'A+': Math.round(8 * tierFactor),
      'A-': Math.round(4 * tierFactor),
      'B+': Math.round(8 * tierFactor),
      'B-': Math.round(4 * tierFactor),
      'AB+': Math.round(3 * tierFactor),
      'AB-': Math.round(2 * tierFactor),
    };

    // Platelets only: Apheresis (APH) & RDP daily usage
    const dailyBase = tier === 'hub' ? 12 : tier === 'large' ? 8 : 4;
    const usagePerDay: Record<BloodGroup, Record<PlateletProduct, number>> = {
      'O+': { APH: Math.round(dailyBase * 0.2), RDP: Math.round(dailyBase * 0.2) },
      'O-': { APH: 0, RDP: Math.max(1, Math.round(dailyBase * 0.1)) },
      'A+': { APH: Math.round(dailyBase * 0.1), RDP: Math.round(dailyBase * 0.15) },
      'A-': { APH: 0, RDP: 0 },
      'B+': { APH: Math.round(dailyBase * 0.1), RDP: Math.round(dailyBase * 0.15) },
      'B-': { APH: 0, RDP: 0 },
      'AB+': { APH: 0, RDP: 0 },
      'AB-': { APH: 0, RDP: 0 },
    };

    // Stale hospitals: last verified > 26 hours ago; others verified 1-3 hours ago
    const lastVerifiedAt = staleHospitalCodes.has(raw.code)
      ? simNow - 26 * 3600 * 1000
      : simNow - (1 + Math.floor(rng() * 3)) * 3600 * 1000;

    hospitals[raw.code] = {
      code: raw.code,
      id: raw.id,
      name: raw.name,
      fullName: raw.fullName,
      city: raw.city,
      zone: raw.zone,
      lat: raw.lat,
      lng: raw.lng,
      tier,
      parLevels,
      usagePerDay,
      lastVerifiedAt,
    };
  }

  // 2. Initial Open Requests
  // REQ-101 (GTB): needs 17u RDP B+, urgent
  // REQ-102 (SFD): needs 6u Apheresis O-, immediate
  const requests: Record<string, PlateletRequest> = {
    'REQ-101': {
      id: 'REQ-101',
      hospital: 'GTB',
      product: 'RDP',
      group: 'B+',
      units: 17,
      urgency: 'urgent',
      createdAt: simNow - 10 * 60 * 1000,
      neededBy: simNow + 3 * 3600 * 1000,
      acceptAboCompatible: false,
      acceptPartial: true,
      contact: 'Dr. Neha Sen · Blood Bank In-Charge',
      indication: 'dengue',
      caseRef: 'CASE-GTB-881',
      status: 'requested',
      assignedOrderIds: [],
    },
    'REQ-102': {
      id: 'REQ-102',
      hospital: 'SFD',
      product: 'APH',
      group: 'O-',
      units: 6,
      urgency: 'immediate',
      createdAt: simNow - 5 * 60 * 1000,
      neededBy: simNow + 1 * 3600 * 1000,
      acceptAboCompatible: false,
      acceptPartial: true,
      contact: 'Emergency Trauma Ward B',
      indication: 'trauma',
      caseRef: 'CASE-SFD-402',
      status: 'matching',
      assignedOrderIds: [],
    },
  };

  // 3. Initial Active and Delivered Orders
  // Lifecycles derive cleanly from timestamps:
  // assigned (t < packedAt) -> packed -> in_transit (pickedUpAt <= t < deliveredAt) -> arrived -> received
  const orders: Record<string, DispatchOrder> = {
    'TX-0412': {
      id: 'TX-0412',
      requestId: null,
      from: 'MDT',
      to: 'AIM',
      product: 'APH',
      group: 'O-',
      units: 12,
      allocations: [
        { lotId: 'LOT-MDT-APH-01', units: 6, expiresAt: simNow + 28 * 3600 * 1000 },
        { lotId: 'LOT-MDT-APH-02', units: 6, expiresAt: simNow + 30 * 3600 * 1000 },
      ],
      vehicleId: 'VAN-01',
      courier: 'Rajesh Kumar',
      distanceKm: 26.6,
      durationMin: 31,
      assignedAt: simNow - 23 * 60 * 1000,
      packedAt: simNow - 19 * 60 * 1000,
      pickedUpAt: simNow - 15 * 60 * 1000,
      deliveredAt: simNow + 16 * 60 * 1000, // in_transit
      receivedAt: null,
      cancelledAt: null,
      status: 'in_transit',
      delayed: false,
      delayMin: 0,
      alert: false,
      coldChain: {
        tempC: 22.1,
        minTempC: 21.8,
        maxTempC: 22.4,
        excursionMin: 0,
        agitationOffMin: 15,
        sealOk: true,
        doorOpens: 0,
        tiltEvents: 0,
      },
    },
    'TX-1042': {
      id: 'TX-1042',
      requestId: null,
      from: 'MDT',
      to: 'GTB',
      product: 'APH',
      group: 'O-',
      units: 6,
      allocations: [
        { lotId: 'LOT-MDT-APH-03', units: 6, expiresAt: simNow + 27 * 3600 * 1000 },
      ],
      vehicleId: 'VAN-02',
      courier: 'Rajesh Kumar',
      distanceKm: 34.2,
      durationMin: 38,
      assignedAt: simNow - 30 * 60 * 1000,
      packedAt: simNow - 26 * 60 * 1000,
      pickedUpAt: simNow - 22 * 60 * 1000,
      deliveredAt: simNow + 8 * 60 * 1000, // in_transit
      receivedAt: null,
      cancelledAt: null,
      status: 'in_transit',
      delayed: false,
      delayMin: 0,
      alert: true,
      alertReason: 'Temperature 24.6 °C for 6 min',
      coldChain: {
        tempC: 24.6,
        minTempC: 21.9,
        maxTempC: 24.6,
        excursionMin: 6,
        agitationOffMin: 22,
        sealOk: true,
        doorOpens: 1,
        tiltEvents: 0,
      },
    },
    'TX-1049': {
      id: 'TX-1049',
      requestId: null,
      from: 'BLK',
      to: 'SGR',
      product: 'RDP',
      group: 'B+',
      units: 20,
      allocations: [
        { lotId: 'LOT-BLK-RDP-01', units: 20, expiresAt: simNow + 24 * 3600 * 1000 },
      ],
      vehicleId: 'VAN-03',
      courier: 'Manoj Verma',
      distanceKm: 5.5,
      durationMin: 12,
      assignedAt: simNow - 15 * 60 * 1000,
      packedAt: simNow - 12 * 60 * 1000,
      pickedUpAt: simNow - 10 * 60 * 1000,
      deliveredAt: simNow + 2 * 60 * 1000, // in_transit (2 min left)
      receivedAt: null,
      cancelledAt: null,
      status: 'in_transit',
      delayed: false,
      delayMin: 0,
      alert: false,
      coldChain: {
        tempC: 21.7,
        minTempC: 21.4,
        maxTempC: 22.0,
        excursionMin: 0,
        agitationOffMin: 10,
        sealOk: true,
        doorOpens: 0,
        tiltEvents: 0,
      },
    },
    'TX-1044': {
      id: 'TX-1044',
      requestId: null,
      from: 'MAX',
      to: 'SFD',
      product: 'APH',
      group: 'B+',
      units: 6,
      allocations: [
        { lotId: 'LOT-MAX-APH-01', units: 6, expiresAt: simNow + 40 * 3600 * 1000 },
      ],
      vehicleId: 'BIKE-01',
      courier: 'Amit Sharma',
      distanceKm: 6.8,
      durationMin: 14,
      assignedAt: simNow - 12 * 60 * 1000,
      packedAt: simNow - 9 * 60 * 1000,
      pickedUpAt: simNow - 6 * 60 * 1000,
      deliveredAt: simNow + 8 * 60 * 1000,
      receivedAt: null,
      cancelledAt: null,
      status: 'in_transit',
      delayed: false,
      delayMin: 0,
      alert: false,
      coldChain: {
        tempC: 22.0,
        minTempC: 21.9,
        maxTempC: 22.2,
        excursionMin: 0,
        agitationOffMin: 6,
        sealOk: true,
        doorOpens: 0,
        tiltEvents: 0,
      },
    },
    'TX-1045': {
      id: 'TX-1045',
      requestId: null,
      from: 'NBV',
      to: 'RGV',
      product: 'RDP',
      group: 'O+',
      units: 4,
      allocations: [
        { lotId: 'LOT-NBV-RDP-01', units: 4, expiresAt: simNow + 48 * 3600 * 1000 },
      ],
      vehicleId: 'BIKE-02',
      courier: 'Suresh Singh',
      distanceKm: 8.2,
      durationMin: 16,
      assignedAt: simNow - 10 * 60 * 1000,
      packedAt: simNow - 7 * 60 * 1000,
      pickedUpAt: simNow - 4 * 60 * 1000,
      deliveredAt: simNow + 12 * 60 * 1000,
      receivedAt: null,
      cancelledAt: null,
      status: 'in_transit',
      delayed: false,
      delayMin: 0,
      alert: false,
      coldChain: {
        tempC: 21.9,
        minTempC: 21.7,
        maxTempC: 22.1,
        excursionMin: 0,
        agitationOffMin: 4,
        sealOk: true,
        doorOpens: 0,
        tiltEvents: 0,
      },
    },
    'TX-0419': {
      id: 'TX-0419',
      requestId: null,
      from: 'SGR',
      to: 'GTB',
      product: 'APH',
      group: 'O-',
      units: 6,
      allocations: [
        { lotId: 'LOT-SGR-APH-01', units: 6, expiresAt: simNow + 32 * 3600 * 1000 },
      ],
      vehicleId: 'BIKE-03',
      courier: 'Vikram Rao',
      distanceKm: 18.5,
      durationMin: 24,
      assignedAt: simNow - 16 * 60 * 1000,
      packedAt: simNow - 12 * 60 * 1000,
      pickedUpAt: simNow - 9 * 60 * 1000,
      deliveredAt: simNow + 15 * 60 * 1000,
      receivedAt: null,
      cancelledAt: null,
      status: 'in_transit',
      delayed: false,
      delayMin: 0,
      alert: false,
      coldChain: {
        tempC: 22.3,
        minTempC: 22.0,
        maxTempC: 22.5,
        excursionMin: 0,
        agitationOffMin: 9,
        sealOk: true,
        doorOpens: 0,
        tiltEvents: 0,
      },
    },
    // Historical delivered orders from earlier today
    'TX-0398': {
      id: 'TX-0398',
      requestId: null,
      from: 'N62',
      to: 'AIM',
      product: 'APH',
      group: 'O+',
      units: 8,
      allocations: [{ lotId: 'LOT-DELIV-01', units: 8, expiresAt: simNow + 65 * 3600 * 1000 }],
      vehicleId: 'VAN-04',
      courier: 'Rajesh Kumar',
      distanceKm: 21.0,
      durationMin: 28,
      assignedAt: simNow - 80 * 60 * 1000,
      packedAt: simNow - 75 * 60 * 1000,
      pickedUpAt: simNow - 70 * 60 * 1000,
      deliveredAt: simNow - 42 * 60 * 1000,
      receivedAt: simNow - 38 * 60 * 1000,
      cancelledAt: null,
      status: 'received',
      delayed: false,
      delayMin: 0,
      alert: false,
      coldChain: {
        tempC: 22.0,
        minTempC: 21.6,
        maxTempC: 22.3,
        excursionMin: 0,
        agitationOffMin: 28,
        sealOk: true,
        doorOpens: 0,
        tiltEvents: 0,
      },
    },
    'TX-0401': {
      id: 'TX-0401',
      requestId: null,
      from: 'APL',
      to: 'SFD',
      product: 'RDP',
      group: 'A+',
      units: 4,
      allocations: [{ lotId: 'LOT-DELIV-02', units: 4, expiresAt: simNow + 52 * 3600 * 1000 }],
      vehicleId: 'BIKE-04',
      courier: 'Amit Sharma',
      distanceKm: 12.4,
      durationMin: 20,
      assignedAt: simNow - 95 * 60 * 1000,
      packedAt: simNow - 90 * 60 * 1000,
      pickedUpAt: simNow - 86 * 60 * 1000,
      deliveredAt: simNow - 66 * 60 * 1000,
      receivedAt: simNow - 60 * 60 * 1000,
      cancelledAt: null,
      status: 'received',
      delayed: false,
      delayMin: 0,
      alert: false,
      coldChain: {
        tempC: 21.8,
        minTempC: 21.5,
        maxTempC: 22.1,
        excursionMin: 0,
        agitationOffMin: 20,
        sealOk: true,
        doorOpens: 0,
        tiltEvents: 0,
      },
    },
    'TX-0395': {
      id: 'TX-0395',
      requestId: null,
      from: 'SGR',
      to: 'BLK',
      product: 'APH',
      group: 'B-',
      units: 6,
      allocations: [{ lotId: 'LOT-DELIV-03', units: 6, expiresAt: simNow + 44 * 3600 * 1000 }],
      vehicleId: 'BIKE-02',
      courier: 'Suresh Singh',
      distanceKm: 5.8,
      durationMin: 14,
      assignedAt: simNow - 140 * 60 * 1000,
      packedAt: simNow - 135 * 60 * 1000,
      pickedUpAt: simNow - 130 * 60 * 1000,
      deliveredAt: simNow - 116 * 60 * 1000,
      receivedAt: simNow - 110 * 60 * 1000,
      cancelledAt: null,
      status: 'received',
      delayed: false,
      delayMin: 0,
      alert: false,
      coldChain: {
        tempC: 22.1,
        minTempC: 21.7,
        maxTempC: 22.4,
        excursionMin: 0,
        agitationOffMin: 14,
        sealOk: true,
        doorOpens: 0,
        tiltEvents: 0,
      },
    },
    'TX-0392': {
      id: 'TX-0392',
      requestId: null,
      from: 'MAX',
      to: 'LNJ',
      product: 'APH',
      group: 'O-',
      units: 10,
      allocations: [{ lotId: 'LOT-DELIV-04', units: 10, expiresAt: simNow + 38 * 3600 * 1000 }],
      vehicleId: 'VAN-03',
      courier: 'Manoj Verma',
      distanceKm: 18.2,
      durationMin: 26,
      assignedAt: simNow - 210 * 60 * 1000,
      packedAt: simNow - 205 * 60 * 1000,
      pickedUpAt: simNow - 200 * 60 * 1000,
      deliveredAt: simNow - 174 * 60 * 1000,
      receivedAt: simNow - 170 * 60 * 1000,
      cancelledAt: null,
      status: 'received',
      delayed: false,
      delayMin: 0,
      alert: true,
      alertReason: 'Temperature spike 24.5 °C',
      coldChain: {
        tempC: 24.5,
        minTempC: 21.8,
        maxTempC: 24.5,
        excursionMin: 6,
        agitationOffMin: 26,
        sealOk: true,
        doorOpens: 1,
        tiltEvents: 0,
      },
    },
    'TX-0388': {
      id: 'TX-0388',
      requestId: null,
      from: 'FTN',
      to: 'GTB',
      product: 'RDP',
      group: 'AB+',
      units: 5,
      allocations: [{ lotId: 'LOT-DELIV-05', units: 5, expiresAt: simNow + 58 * 3600 * 1000 }],
      vehicleId: 'BIKE-03',
      courier: 'Vikram Rao',
      distanceKm: 22.5,
      durationMin: 32,
      assignedAt: simNow - 280 * 60 * 1000,
      packedAt: simNow - 275 * 60 * 1000,
      pickedUpAt: simNow - 270 * 60 * 1000,
      deliveredAt: simNow - 238 * 60 * 1000,
      receivedAt: null,
      cancelledAt: null,
      status: 'received',
      delayed: false,
      delayMin: 0,
      alert: false,
      coldChain: {
        tempC: 22.0,
        minTempC: 21.6,
        maxTempC: 22.2,
        excursionMin: 0,
        agitationOffMin: 32,
        sealOk: true,
        doorOpens: 0,
        tiltEvents: 0,
      },
    },
    'TX-0385': {
      id: 'TX-0385',
      requestId: null,
      from: 'MDT',
      to: 'AIM',
      product: 'APH',
      group: 'O-',
      units: 12,
      allocations: [{ lotId: 'LOT-DELIV-06', units: 12, expiresAt: simNow + 40 * 3600 * 1000 }],
      vehicleId: 'VAN-01',
      courier: 'Rajesh Kumar',
      distanceKm: 26.6,
      durationMin: 31,
      assignedAt: simNow - 350 * 60 * 1000,
      packedAt: simNow - 345 * 60 * 1000,
      pickedUpAt: simNow - 340 * 60 * 1000,
      deliveredAt: simNow - 303 * 60 * 1000,
      receivedAt: simNow - 298 * 60 * 1000,
      cancelledAt: null,
      status: 'received',
      delayed: true,
      delayMin: 6,
      alert: false,
      coldChain: {
        tempC: 22.2,
        minTempC: 21.8,
        maxTempC: 22.5,
        excursionMin: 0,
        agitationOffMin: 37,
        sealOk: true,
        doorOpens: 0,
        tiltEvents: 0,
      },
    },
    'TX-0377': {
      id: 'TX-0377',
      requestId: null,
      from: 'N62',
      to: 'MAX',
      product: 'APH',
      group: 'A-',
      units: 6,
      allocations: [{ lotId: 'LOT-DELIV-07', units: 6, expiresAt: simNow + 68 * 3600 * 1000 }],
      vehicleId: 'VAN-02',
      courier: 'Rajesh Kumar',
      distanceKm: 24.1,
      durationMin: 30,
      assignedAt: simNow - (24 * 3600 + 75 * 60) * 1000,
      packedAt: simNow - (24 * 3600 + 70 * 60) * 1000,
      pickedUpAt: simNow - (24 * 3600 + 65 * 60) * 1000,
      deliveredAt: simNow - (24 * 3600 + 35 * 60) * 1000,
      receivedAt: simNow - (24 * 3600 + 30 * 60) * 1000,
      cancelledAt: null,
      status: 'received',
      delayed: false,
      delayMin: 0,
      alert: false,
      coldChain: {
        tempC: 22.0,
        minTempC: 21.6,
        maxTempC: 22.2,
        excursionMin: 0,
        agitationOffMin: 30,
        sealOk: true,
        doorOpens: 0,
        tiltEvents: 0,
      },
    },
    'TX-0374': {
      id: 'TX-0374',
      requestId: null,
      from: 'APL',
      to: 'MDT',
      product: 'RDP',
      group: 'O+',
      units: 4,
      allocations: [{ lotId: 'LOT-DELIV-08', units: 4, expiresAt: simNow + 60 * 3600 * 1000 }],
      vehicleId: 'BIKE-01',
      courier: 'Amit Sharma',
      distanceKm: 28.5,
      durationMin: 36,
      assignedAt: simNow - (27 * 3600 + 80 * 60) * 1000,
      packedAt: simNow - (27 * 3600 + 75 * 60) * 1000,
      pickedUpAt: simNow - (27 * 3600 + 70 * 60) * 1000,
      deliveredAt: simNow - (27 * 3600 + 22 * 60) * 1000,
      receivedAt: simNow - (27 * 3600 + 15 * 60) * 1000,
      cancelledAt: null,
      status: 'received',
      delayed: true,
      delayMin: 12,
      alert: false,
      coldChain: {
        tempC: 22.3,
        minTempC: 21.9,
        maxTempC: 22.6,
        excursionMin: 0,
        agitationOffMin: 48,
        sealOk: true,
        doorOpens: 0,
        tiltEvents: 0,
      },
    },
    'TX-0370': {
      id: 'TX-0370',
      requestId: null,
      from: 'BLK',
      to: 'SFD',
      product: 'RDP',
      group: 'B+',
      units: 8,
      allocations: [{ lotId: 'LOT-DELIV-09', units: 8, expiresAt: simNow + 50 * 3600 * 1000 }],
      vehicleId: 'VAN-03',
      courier: 'Manoj Verma',
      distanceKm: 14.8,
      durationMin: 22,
      assignedAt: simNow - (30 * 3600 + 60 * 60) * 1000,
      packedAt: simNow - (30 * 3600 + 55 * 60) * 1000,
      pickedUpAt: simNow - (30 * 3600 + 50 * 60) * 1000,
      deliveredAt: simNow - (30 * 3600 + 28 * 60) * 1000,
      receivedAt: simNow - (30 * 3600 + 22 * 60) * 1000,
      cancelledAt: null,
      status: 'received',
      delayed: false,
      delayMin: 0,
      alert: false,
      coldChain: {
        tempC: 22.0,
        minTempC: 21.7,
        maxTempC: 22.3,
        excursionMin: 0,
        agitationOffMin: 22,
        sealOk: true,
        doorOpens: 0,
        tiltEvents: 0,
      },
    },
    'TX-0365': {
      id: 'TX-0365',
      requestId: null,
      from: 'GTB',
      to: 'AIM',
      product: 'APH',
      group: 'O-',
      units: 6,
      allocations: [{ lotId: 'LOT-DELIV-10', units: 6, expiresAt: simNow + 42 * 3600 * 1000 }],
      vehicleId: 'VAN-04',
      courier: 'Rajesh Kumar',
      distanceKm: 20.4,
      durationMin: 28,
      assignedAt: simNow - (33 * 3600 + 65 * 60) * 1000,
      packedAt: simNow - (33 * 3600 + 60 * 60) * 1000,
      pickedUpAt: simNow - (33 * 3600 + 55 * 60) * 1000,
      deliveredAt: simNow - (33 * 3600 + 27 * 60) * 1000,
      receivedAt: simNow - (33 * 3600 + 20 * 60) * 1000,
      cancelledAt: null,
      status: 'received',
      delayed: false,
      delayMin: 0,
      alert: false,
      coldChain: {
        tempC: 22.1,
        minTempC: 21.8,
        maxTempC: 22.4,
        excursionMin: 0,
        agitationOffMin: 28,
        sealOk: true,
        doorOpens: 0,
        tiltEvents: 0,
      },
    },
  };

  // 4. Initial Lots (Platelets only: Apheresis & RDP)
  // Calibrated so at simNow:
  // EXACTLY 5 hospitals are 'short' (net < 0): AIM, SFD, GTB, LNJ, ROH
  // EXACTLY 11 hospitals are 'risk' (net >= 0 and expiring36 > 0): MDT, FTN, RML, SGR, APL, RGV, FSB, BLK, MPD, DWK, GCH
  // EXACTLY 9 hospitals are 'ok' (net >= 0 and expiring36 === 0): MAX, N62, STP, NBV, DRB, SDP, NH4, MXP, PRS
  const lots: Record<string, Lot> = {};
  let lotCounter = 100;

  function addLot(
    hospital: string,
    product: PlateletProduct,
    group: BloodGroup,
    units: number,
    hoursLeft: number
  ) {
    const lotId = `LOT-${hospital}-${++lotCounter}`;
    const expiresAt = simNow + Math.round(hoursLeft * 3600 * 1000);
    const collectedAt = expiresAt - SHELF_LIFE_H * 3600 * 1000;
    lots[lotId] = {
      lotId,
      hospital,
      product,
      group,
      units,
      collectedAt,
      expiresAt,
      origin: 'seed',
    };
  }

  // --- 5 SHORT HOSPITALS ---
  // AIM: demand36 = 17. Incoming = 12 (TX-0412). Usable = 4. Net = 4 + 12 - 17 = -1 (< 0)
  addLot('AIM', 'APH', 'O+', 2, 72);
  addLot('AIM', 'RDP', 'A+', 2, 80);

  // SFD: demand36 = 15 + 6(REQ-102) = 21. Incoming = 6 (TX-1044). Usable = 8. Net = 8 + 6 - 21 = -7 (< 0)
  addLot('SFD', 'RDP', 'B+', 5, 60);
  addLot('SFD', 'APH', 'A+', 3, 75);

  // GTB: demand36 = 15 + 17(REQ-101) = 32. Incoming = 6(TX-1042) + 6(TX-0419) = 12. Usable = 12. Net = 12 + 12 - 32 = -8 (< 0)
  addLot('GTB', 'RDP', 'O+', 8, 55);
  addLot('GTB', 'APH', 'B+', 4, 68);

  // LNJ: demand36 = 15. Incoming = 0. Usable = 9. Net = 9 - 15 = -6 (< 0)
  addLot('LNJ', 'RDP', 'O+', 6, 70);
  addLot('LNJ', 'APH', 'O-', 3, 85);

  // ROH: demand36 = 9. Incoming = 0. Usable = 4. Net = 4 - 9 = -5 (< 0)
  addLot('ROH', 'RDP', 'B+', 4, 90);

  // --- 11 AT-RISK HOSPITALS (net >= 0, and expiring36 > 0) ---
  // MDT: demand36 = 24. Usable = 36 (has lots with 20h, 28h left). Net = 36 - 24 = +12 (expiring36 = 14)
  addLot('MDT', 'APH', 'O-', 8, 20); // expiring
  addLot('MDT', 'APH', 'O+', 6, 28); // expiring
  addLot('MDT', 'RDP', 'B+', 12, 72);
  addLot('MDT', 'RDP', 'A+', 10, 84);

  // FTN: demand36 = 15. Usable = 22. Net = +7. (expiring36 = 6)
  addLot('FTN', 'APH', 'O+', 6, 26); // expiring
  addLot('FTN', 'RDP', 'O-', 8, 65);
  addLot('FTN', 'RDP', 'B+', 8, 90);

  // RML: demand36 = 15. Usable = 20. Net = +5. (expiring36 = 5)
  addLot('RML', 'APH', 'B+', 5, 22); // expiring
  addLot('RML', 'RDP', 'A+', 9, 60);
  addLot('RML', 'RDP', 'O+', 6, 75);

  // SGR: demand36 = 15. Usable = 24. Net = +9. (expiring36 = 8)
  addLot('SGR', 'APH', 'O-', 8, 30); // expiring
  addLot('SGR', 'RDP', 'B+', 8, 64);
  addLot('SGR', 'APH', 'A+', 8, 88);

  // APL: demand36 = 15. Usable = 26. Net = +11. (expiring36 = 8)
  addLot('APL', 'APH', 'O+', 8, 25); // expiring
  addLot('APL', 'RDP', 'O-', 10, 68);
  addLot('APL', 'RDP', 'A+', 8, 92);

  // RGV: demand36 = 9. Usable = 14 + 4(incoming TX-1045) = 18. Net = +9. (expiring36 = 4)
  addLot('RGV', 'APH', 'B+', 4, 31); // expiring
  addLot('RGV', 'RDP', 'O+', 10, 70);

  // FSB: demand36 = 9. Usable = 16. Net = +7. (expiring36 = 4)
  addLot('FSB', 'APH', 'A+', 4, 28); // expiring
  addLot('FSB', 'RDP', 'B+', 12, 85);

  // BLK: demand36 = 15. Usable = 28. Net = +13. (expiring36 = 10)
  addLot('BLK', 'RDP', 'B+', 10, 24); // expiring
  addLot('BLK', 'APH', 'O+', 10, 60);
  addLot('BLK', 'RDP', 'O-', 8, 80);

  // MPD: demand36 = 9. Usable = 15. Net = +6. (expiring36 = 4)
  addLot('MPD', 'APH', 'O-', 4, 29); // expiring
  addLot('MPD', 'RDP', 'A+', 11, 75);

  // DWK: demand36 = 9. Usable = 16. Net = +7. (expiring36 = 5)
  addLot('DWK', 'RDP', 'O+', 5, 27); // expiring
  addLot('DWK', 'APH', 'B+', 11, 80);

  // GCH: demand36 = 9. Usable = 14. Net = +5. (expiring36 = 4)
  addLot('GCH', 'APH', 'A-', 4, 32); // expiring
  addLot('GCH', 'RDP', 'O+', 10, 88);

  // --- 9 OK HOSPITALS (net >= 0, and expiring36 === 0) ---
  // MAX: demand36 = 24. Usable = 32. Net = +8. (expiring36 = 0)
  addLot('MAX', 'APH', 'O+', 12, 65);
  addLot('MAX', 'RDP', 'B+', 12, 80);
  addLot('MAX', 'APH', 'O-', 8, 95);

  // N62: demand36 = 24. Usable = 30. Net = +6. (expiring36 = 0)
  addLot('N62', 'APH', 'O+', 10, 60);
  addLot('N62', 'RDP', 'A+', 12, 85);
  addLot('N62', 'APH', 'B+', 8, 90);

  // STP (stale): demand36 = 9. Usable = 15. Net = +6. (expiring36 = 0)
  addLot('STP', 'RDP', 'O+', 8, 70);
  addLot('STP', 'APH', 'A+', 7, 95);

  // NBV: demand36 = 9. Usable = 16. Net = +7. (expiring36 = 0)
  addLot('NBV', 'RDP', 'B+', 8, 75);
  addLot('NBV', 'APH', 'O+', 8, 100);

  // DRB (stale): demand36 = 9. Usable = 14. Net = +5. (expiring36 = 0)
  addLot('DRB', 'RDP', 'O-', 6, 80);
  addLot('DRB', 'APH', 'B+', 8, 92);

  // SDP: demand36 = 9. Usable = 15. Net = +6. (expiring36 = 0)
  addLot('SDP', 'APH', 'O+', 7, 72);
  addLot('SDP', 'RDP', 'A+', 8, 86);

  // NH4: demand36 = 17. Usable = 24. Net = +7. (expiring36 = 0)
  addLot('NH4', 'RDP', 'B+', 12, 78);
  addLot('NH4', 'APH', 'O-', 12, 94);

  // MXP: demand36 = 9. Usable = 15. Net = +6. (expiring36 = 0)
  addLot('MXP', 'APH', 'A+', 7, 82);
  addLot('MXP', 'RDP', 'O+', 8, 90);

  // PRS (stale): demand36 = 9. Usable = 15. Net = +6. (expiring36 = 0)
  addLot('PRS', 'APH', 'B+', 7, 76);
  addLot('PRS', 'RDP', 'A-', 8, 88);

  // 5. Vehicles (14 vehicles from fleet)
  const vehicles: Record<string, Vehicle> = {};
  for (const v of FLEET) {
    vehicles[v.id] = { ...v };
  }

  // 6. Settings
  const settings = {
    speed: 1,
    sound: true,
    autopilot: false,
  };

  // 7. 30-Day Seeded Operational History
  // Calibrated so totalExpired / totalReceived ≈ 8.1% (within 6% - 10%)
  // Mean on-time delivery ≈ 92.6%
  const history30d: DayHistoryRecord[] = [];
  const onTimeVariations = [
    91.2, 94.0, 92.5, 93.8, 90.4, 95.1, 93.2, 91.8, 92.0, 94.5,
    89.6, 92.8, 93.5, 95.0, 91.4, 92.2, 94.1, 93.0, 90.8, 93.4,
    92.1, 94.8, 89.9, 93.6, 91.7, 92.9, 94.2, 93.1, 91.5, 93.8,
  ];

  for (let i = 1; i <= 30; i++) {
    const received = 50 + Math.floor(rng() * 15); // ~50-65 units
    const expired = Math.max(3, Math.round(received * 0.081 + (rng() - 0.5) * 1.5));
    const issued = Math.round(received * 0.85);
    const sent = Math.round(received * 0.08);
    const rescued = Math.round(expired * 1.8 + Math.floor(rng() * 4));
    const onTimePct = onTimeVariations[i - 1] ?? 92.6;

    history30d.push({
      day: i,
      received,
      issued,
      sent,
      expired,
      rescued,
      onTimePct,
    });
  }

  return {
    simNow,
    hospitals,
    lots,
    requests,
    orders,
    vehicles,
    activeScenario: null,
    settings,
    history30d,
  };
}

