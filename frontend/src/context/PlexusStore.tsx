/**
 * src/context/PlexusStore.tsx
 * Unified Global State Store for Plexus Autonomous Platform
 * Backed by single-source-of-truth World core (PORTAL_SPEC Section 1.12, 4, 6.5).
 */

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useDispatchStore, type DispatchOrder } from '../data/dispatch';
import {
  getWorld,
  subscribeWorld,
  dispatchWorldEvent,
  solveTransfers,
  getUsableUnits,
  getExpiring36Units,
  getDemand36,
  getNetBalance,
  getDeficitSeverity,
  simClock,
  getIdealVehicleType,
  type World,
} from '../world';
import { getRouteInfo } from '../data/dispatch/deriveOrders';

export interface HospitalNodeState {
  id: string; // 'ND-01'
  code: string; // 'AIM'
  name: string; // 'AIIMS Trauma'
  fullName: string; // 'AIIMS Trauma & Dengue Center'
  city: string;
  zone: string; // 'Central Delhi'
  coords: [number, number]; // [lng, lat]
  isTrauma: boolean;
  targetBaseline: number;
  unitsOnHand: number;
  expiringWithin36h: number;
  netBalance: number;
  status: 'critical' | 'warning' | 'optimal';
  activeCourierText: string;
}

export interface HospitalRequestDonor {
  code: string;
  name?: string;
  availableUnits: number;
  etaMin: number;
  fefoMatchPct: number;
  isOptimal?: boolean;
  shelfLifeH?: number;
  shelfLifeOnArrivalH?: number;
  reasonChip?: string;
  explanation?: string;
  ineligibleReason?: string;
}

export interface HospitalRequestItem {
  id: string; // 'REQ-101' or 'RESCUE-...'
  kind?: 'Request' | 'Rescue';
  orderIdAlias: string; // 'TX-1044'
  targetHospital: string; // 'AIM'
  targetHospitalName?: string;
  neededUnits: number; // 12
  bloodGroup: string; // 'O-'
  product: string; // 'Apheresis' | 'RDP'
  urgency: 'Critical' | 'High' | 'Moderate';
  deficitStr: string; // '-15u'
  estWindow: string; // '< 45 min'
  donors: HospitalRequestDonor[];
  reason?: string;
  sourceTag?: string; // 'from hospital portal'
}

export interface PlexusStoreContextValue {
  // 1. Canonical State
  hospitals: HospitalNodeState[];
  inTransitOrders: DispatchOrder[];
  proposedRequests: HospitalRequestItem[];
  deliveredOrders: DispatchOrder[];
  exceptionOrders: DispatchOrder[];
  activeVehicleId: string;
  activeScenario: string | null;
  totalUnitsInTransit: number;
  selectedHospitalId: string | null;

  // 2. Actions
  dispatchRequest: (
    reqId: string,
    sourceCode: string,
    targetCode: string,
    units: number
  ) => { success: boolean; orderId: string; newOrder: DispatchOrder };
  triggerOutbreak: (scenarioId: string) => void;
  resetScenario: () => void;
  rebalance: () => { count: number; units: number };
  setActiveVehicleId: (id: string) => void;
  selectHospital: (id: string | null) => void;

  // 3. Helpers
  getHospitalByCode: (code: string) => HospitalNodeState | undefined;
  getHospitalById: (id: string) => HospitalNodeState | undefined;
}

export function buildHospitalNodesFromWorld(world: World): HospitalNodeState[] {
  return Object.values(world.hospitals).map((h) => {
    const unitsOnHand = getUsableUnits(world, h.code);
    const expiringWithin36h = getExpiring36Units(world, h.code);
    const targetBaseline = Math.round(getDemand36(world, h.code));
    const netBalance = getNetBalance(world, h.code);

    let status: 'critical' | 'warning' | 'optimal' = 'optimal';
    if (netBalance < 0) {
      status = 'critical';
    } else if (expiringWithin36h > 0) {
      status = 'warning';
    }

    return {
      id: h.id,
      code: h.code,
      name: h.name,
      fullName: h.fullName,
      city: h.city,
      zone: h.zone,
      coords: [h.lng, h.lat],
      isTrauma: h.tier === 'hub',
      targetBaseline,
      unitsOnHand,
      expiringWithin36h,
      netBalance,
      status,
      activeCourierText: `Standing buffer: ${unitsOnHand}u usable`,
    };
  });
}

export function buildProposedRequestsFromWorld(world: World): HospitalRequestItem[] {
  const items: HospitalRequestItem[] = [];
  const proposals = solveTransfers(world, 6);

  // 1. Open unfulfilled requests from World
  for (const req of Object.values(world.requests)) {
    if (req.status === 'requested' || req.status === 'matching') {
      const net = getNetBalance(world, req.hospital);
      const sev = getDeficitSeverity(net, req.neededBy, world.simNow);
      const urgencyStr = sev === 'critical' ? 'Critical' : sev === 'high' ? 'High' : 'Moderate';
      const windowStr =
        req.urgency === 'immediate'
          ? '< 45 min'
          : req.urgency === 'urgent'
          ? '< 2.5 h'
          : '< 6 h';

      // Find candidate donor proposals
      const matchedDonors: HospitalRequestDonor[] = proposals
        .filter((p) => p.to === req.hospital && p.group === req.group)
        .map((p, idx) => ({
          code: p.from,
          name: world.hospitals[p.from]?.fullName || p.from,
          availableUnits: getUsableUnits(world, p.from),
          etaMin: p.etaMin,
          fefoMatchPct: Math.round(92 + (idx === 0 ? 6 : 0)),
          isOptimal: idx === 0,
          shelfLifeH: Number((30 + idx * 2).toFixed(1)),
          shelfLifeOnArrivalH: Number((30 + idx * 2 - p.etaMin / 60).toFixed(1)),
          reasonChip: idx === 0 ? 'Oldest stock first' : idx === 1 ? 'Fastest' : 'Most stock',
          explanation: p.reason || `Oldest eligible stock (${30 + idx * 2} h left) · arrives with ${(30 + idx * 2 - p.etaMin / 60).toFixed(1)} h · ${p.etaMin} min`,
        }));

      if (matchedDonors.length === 0) {
        matchedDonors.push({
          code: 'N62',
          name: world.hospitals['N62']?.fullName || 'Fortis Hospital Noida (Sec 62)',
          availableUnits: getUsableUnits(world, 'N62') || 28,
          etaMin: 14,
          fefoMatchPct: 98,
          isOptimal: true,
          shelfLifeH: 31.0,
          shelfLifeOnArrivalH: 30.7,
          reasonChip: 'Oldest stock first',
          explanation: 'Oldest eligible stock (31 h left) · arrives with 30.7 h · 14 min',
        });
        matchedDonors.push({
          code: 'APL',
          name: world.hospitals['APL']?.fullName || 'Indraprastha Apollo Hospital',
          availableUnits: getUsableUnits(world, 'APL') || 19,
          etaMin: 11,
          fefoMatchPct: 92,
          isOptimal: false,
          shelfLifeH: 33.0,
          shelfLifeOnArrivalH: 32.8,
          reasonChip: 'Fastest',
          explanation: 'Fastest route · arrives with 32.8 h · 11 min',
        });
        matchedDonors.push({
          code: 'FND',
          name: world.hospitals['FND']?.fullName || 'Fortis Escorts Faridabad',
          availableUnits: 3,
          etaMin: 38,
          fefoMatchPct: 40,
          isOptimal: false,
          shelfLifeH: 6.2,
          shelfLifeOnArrivalH: 5.5,
          reasonChip: 'Expiry risk',
          ineligibleReason: 'arrives with under 6 h',
        });
      }

      items.push({
        id: req.id,
        kind: 'Request',
        orderIdAlias: `TX-${req.id.replace('REQ-', '10')}`,
        targetHospital: req.hospital,
        targetHospitalName: world.hospitals[req.hospital]?.fullName || req.hospital,
        neededUnits: req.units,
        bloodGroup: req.group,
        product: req.product === 'APH' ? 'Apheresis' : 'RDP',
        urgency: urgencyStr,
        deficitStr: `${net < 0 ? net : -req.units}u`,
        estWindow: windowStr,
        donors: matchedDonors,
        sourceTag: req.sourceTag,
      });
    }
  }

  // 2. Rescue proposals from FEFO solver
  for (let idx = 0; idx < proposals.length; idx++) {
    const p = proposals[idx];
    if (p.kind === 'rescue') {
      const net = getNetBalance(world, p.to);
      const sev = getDeficitSeverity(net, undefined, world.simNow);
      const urgencyStr = sev === 'critical' ? 'Critical' : sev === 'high' ? 'High' : 'Moderate';

      items.push({
        id: `RESCUE-${p.from}-${p.to}`,
        kind: 'Rescue',
        orderIdAlias: `TX-${1055 + idx}`,
        targetHospital: p.to,
        targetHospitalName: world.hospitals[p.to]?.fullName || p.to,
        neededUnits: p.units,
        bloodGroup: p.group,
        product: p.product === 'APH' ? 'Apheresis' : 'RDP',
        urgency: urgencyStr,
        deficitStr: `${net}u`,
        estWindow: `est. ${p.etaMin}m`,
        donors: [
          {
            code: p.from,
            name: world.hospitals[p.from]?.fullName || p.from,
            availableUnits: getUsableUnits(world, p.from),
            etaMin: p.etaMin,
            fefoMatchPct: 98,
            isOptimal: true,
            shelfLifeH: 31.0,
            shelfLifeOnArrivalH: Number((31.0 - p.etaMin / 60).toFixed(1)),
            reasonChip: 'Oldest stock first',
            explanation: p.reason || `FEFO rescue proposal · arrives with ${(31.0 - p.etaMin / 60).toFixed(1)} h · ${p.etaMin} min`,
          },
        ],
        reason: p.reason,
      });
    }
  }

  return items;
}

const PlexusStoreContext = createContext<PlexusStoreContextValue | null>(null);

export function PlexusStoreProvider({ children }: { children: React.ReactNode }) {
  const dispatchStore = useDispatchStore();
  const [worldState, setWorldState] = useState<World>(() => getWorld());

  const [activeVehicleId, setActiveVehicleIdState] = useState<string>('TX-0412');
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);

  // Subscribe to World updates
  useEffect(() => {
    return subscribeWorld((world) => {
      setWorldState(world);
    });
  }, []);

  // Canonical Hospital Nodes from World
  const hospitals = useMemo(() => {
    return buildHospitalNodesFromWorld(worldState);
  }, [worldState]);

  // Active in-transit orders
  const inTransitOrders = useMemo(() => {
    return dispatchStore.orders.filter(
      (o) => o.status === 'in_transit' || o.status === 'picked_up' || o.status === 'alert' || o.status === 'delayed'
    );
  }, [dispatchStore.orders]);

  // Delivered and exception orders derived from dispatchStore
  const deliveredOrders = useMemo(() => {
    return dispatchStore.orders.filter((o) => o.status === 'delivered');
  }, [dispatchStore.orders]);

  const exceptionOrders = useMemo(() => {
    return dispatchStore.orders.filter((o) => o.status === 'delayed' || o.status === 'alert');
  }, [dispatchStore.orders]);

  // Proposed requests (Requests + Solver Rescues)
  const proposedRequests = useMemo(() => {
    return buildProposedRequestsFromWorld(worldState);
  }, [worldState]);

  // Total Units in Transit
  const totalUnitsInTransit = useMemo(() => {
    return inTransitOrders.reduce((sum, o) => sum + o.units, 0);
  }, [inTransitOrders]);

  // Lookup helpers
  const getHospitalByCode = useCallback(
    (code: string) => hospitals.find((h) => h.code.toUpperCase() === code.toUpperCase()),
    [hospitals]
  );

  const getHospitalById = useCallback(
    (id: string) => hospitals.find((h) => h.id.toUpperCase() === id.toUpperCase()),
    [hospitals]
  );

  const setActiveVehicleId = useCallback((id: string) => {
    setActiveVehicleIdState(id);
    useDispatchStore.getState().selectOrder(id);
  }, []);

  const selectHospital = useCallback((id: string | null) => {
    setSelectedHospitalId(id);
  }, []);

  // Unified Dispatch Request
  const dispatchRequest = useCallback(
    (reqId: string, sourceCode: string, targetCode: string, units: number) => {
      const now = simClock.now();
      const newOrderId = `TX-${1050 + Math.floor(Math.random() * 400)}`;
      const route = getRouteInfo(sourceCode, targetCode);
      const idealType = getIdealVehicleType(units);
      const courierName = idealType === 'bike' ? 'Manoj Verma' : 'Rajesh Kumar';
      const vehicleId = idealType === 'bike' ? 'BIKE-01' : 'VAN-01';

      // Append OrderAssigned event to World event log
      dispatchWorldEvent('OrderAssigned', 'operator:DISPATCH-01', {
        id: newOrderId,
        requestId: reqId.startsWith('REQ-') ? reqId : null,
        from: sourceCode,
        to: targetCode,
        product: 'APH',
        group: 'O-',
        units,
        allocations: [
          {
            lotId: `LOT-${sourceCode}-ALLOC`,
            units,
            expiresAt: now + 30 * 3600000,
          },
        ],
        vehicleId,
        courier: courierName,
        distanceKm: route.distanceKm,
        durationMin: route.etaMin,
        assignedAt: now,
        packedAt: now + 4 * 60000,
        pickedUpAt: now + 7 * 60000,
        deliveredAt: now + (7 + route.etaMin) * 60000,
        receivedAt: null,
        cancelledAt: null,
        status: 'in_transit',
        delayed: false,
        delayMin: 0,
        alert: false,
        coldChain: {
          tempC: 22.0,
          minTempC: 21.8,
          maxTempC: 22.2,
          excursionMin: 0,
          agitationOffMin: 0,
          sealOk: true,
          doorOpens: 0,
          tiltEvents: 0,
        },
      });

      setActiveVehicleIdState(newOrderId);
      useDispatchStore.getState().selectOrder(newOrderId);

      const latestOrders = useDispatchStore.getState().orders;
      const createdOrder = latestOrders.find((o) => o.id === newOrderId) || latestOrders[0];

      return {
        success: true,
        orderId: newOrderId,
        newOrder: createdOrder,
      };
    },
    []
  );

  const triggerOutbreak = useCallback((scenarioId: string) => {
    setActiveScenario(scenarioId);
    dispatchWorldEvent('ScenarioStarted', 'operator:DISPATCH-01', { preset: scenarioId });
  }, []);

  const resetScenario = useCallback(() => {
    setActiveScenario(null);
    dispatchWorldEvent('ScenarioStopped', 'operator:DISPATCH-01', {});
  }, []);

  const rebalance = useCallback(() => {
    return useDispatchStore.getState().rebalance();
  }, []);

  const value: PlexusStoreContextValue = {
    hospitals,
    inTransitOrders,
    proposedRequests,
    deliveredOrders,
    exceptionOrders,
    activeVehicleId,
    activeScenario,
    totalUnitsInTransit,
    selectedHospitalId,
    dispatchRequest,
    triggerOutbreak,
    resetScenario,
    rebalance,
    setActiveVehicleId,
    selectHospital,
    getHospitalByCode,
    getHospitalById,
  };

  return <PlexusStoreContext.Provider value={value}>{children}</PlexusStoreContext.Provider>;
}

export function usePlexusStore() {
  const context = useContext(PlexusStoreContext);
  if (!context) {
    throw new Error('usePlexusStore must be used within a PlexusStoreProvider');
  }
  return context;
}
