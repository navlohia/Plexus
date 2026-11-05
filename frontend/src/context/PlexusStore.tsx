/**
 * src/context/PlexusStore.tsx
 * Unified Global State Store for Plexus Autonomous Platform
 * DISPATCH-SPEC.md (v3) Section 1.1 & 1.2
 *
 * Single Source of Truth across:
 *   1. Live Disruption TV (FlightyTVMapTab)
 *   2. Dispatch Dashboard (MoveonDashboard)
 *   3. Stress Lab (SurgeTab)
 */

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { NCR_HOSPITAL_METAS } from '../lib/hospitalTelemetry';
import { useDispatchStore, type DispatchOrder } from '../data/dispatch';

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
  availableUnits: number;
  etaMin: number;
  fefoMatchPct: number;
  isOptimal?: boolean;
}

export interface HospitalRequestItem {
  id: string; // 'REQ-901'
  orderIdAlias: string; // 'TX-1044'
  targetHospital: string; // 'AIM'
  neededUnits: number; // 12
  bloodGroup: string; // 'O-'
  product: string; // 'Apheresis'
  urgency: 'Critical' | 'High' | 'Moderate';
  deficitStr: string; // '-15u'
  estWindow: string; // '< 45 min'
  donors: HospitalRequestDonor[];
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

// ── Default 25 Delhi-NCR Hospital Nodes ──────────────────────────────────────
export function createInitialHospitalNodes(): HospitalNodeState[] {
  return Object.entries(NCR_HOSPITAL_METAS).map(([id, meta]) => {
    const unitsOnHand = meta.baselineStock;
    const targetBaseline = meta.targetBaseline;
    const netBalance = unitsOnHand - targetBaseline;
    const status: 'critical' | 'warning' | 'optimal' =
      netBalance < -10 ? 'critical' : netBalance < 0 ? 'warning' : 'optimal';

    return {
      id,
      code: meta.code,
      name: meta.short,
      fullName: meta.fullName,
      city: meta.city,
      zone: meta.zone,
      coords: meta.coords,
      isTrauma: meta.isTrauma,
      targetBaseline,
      unitsOnHand,
      expiringWithin36h: meta.baselineExp36,
      netBalance,
      status,
      activeCourierText: meta.activeCourierText,
    };
  });
}

// ── Default 4 Incoming Hospital Blood Requests ──────────────────────────────
export const DEFAULT_PROPOSED_REQUESTS: HospitalRequestItem[] = [
  {
    id: 'REQ-901',
    orderIdAlias: 'TX-1044',
    targetHospital: 'AIM',
    neededUnits: 12,
    bloodGroup: 'O-',
    product: 'Apheresis',
    urgency: 'Critical',
    deficitStr: '-15u',
    estWindow: '< 45 min',
    donors: [
      { code: 'N62', availableUnits: 28, etaMin: 14, fefoMatchPct: 98, isOptimal: true },
      { code: 'APL', availableUnits: 19, etaMin: 11, fefoMatchPct: 92 },
      { code: 'MDT', availableUnits: 34, etaMin: 22, fefoMatchPct: 85 },
    ],
  },
  {
    id: 'REQ-902',
    orderIdAlias: 'TX-1045',
    targetHospital: 'GTB',
    neededUnits: 6,
    bloodGroup: 'B+',
    product: 'Random',
    urgency: 'High',
    deficitStr: '-8u',
    estWindow: '< 1.5 h',
    donors: [
      { code: 'SGR', availableUnits: 24, etaMin: 18, fefoMatchPct: 96, isOptimal: true },
      { code: 'BLK', availableUnits: 16, etaMin: 15, fefoMatchPct: 91 },
      { code: 'N62', availableUnits: 22, etaMin: 20, fefoMatchPct: 84 },
    ],
  },
  {
    id: 'REQ-903',
    orderIdAlias: 'TX-1046',
    targetHospital: 'LNJ',
    neededUnits: 10,
    bloodGroup: 'A+',
    product: 'Apheresis',
    urgency: 'Critical',
    deficitStr: '-12u',
    estWindow: '< 60 min',
    donors: [
      { code: 'APL', availableUnits: 30, etaMin: 12, fefoMatchPct: 97, isOptimal: true },
      { code: 'SFD', availableUnits: 18, etaMin: 16, fefoMatchPct: 89 },
      { code: 'AIM', availableUnits: 25, etaMin: 14, fefoMatchPct: 86 },
    ],
  },
  {
    id: 'REQ-904',
    orderIdAlias: 'TX-1047',
    targetHospital: 'SFD',
    neededUnits: 4,
    bloodGroup: 'AB+',
    product: 'Plasma',
    urgency: 'Moderate',
    deficitStr: '-4u',
    estWindow: '< 2.5 h',
    donors: [
      { code: 'AIM', availableUnits: 16, etaMin: 8, fefoMatchPct: 99, isOptimal: true },
      { code: 'MAX', availableUnits: 20, etaMin: 14, fefoMatchPct: 93 },
      { code: 'MDT', availableUnits: 26, etaMin: 24, fefoMatchPct: 82 },
    ],
  },
];

const PlexusStoreContext = createContext<PlexusStoreContextValue | null>(null);

export function PlexusStoreProvider({ children }: { children: React.ReactNode }) {
  const dispatchStore = useDispatchStore();

  const [hospitals, setHospitals] = useState<HospitalNodeState[]>(() => createInitialHospitalNodes());
  const [inTransitOrders, setInTransitOrders] = useState<DispatchOrder[]>(() =>
    dispatchStore.orders.filter((o) => o.status === 'in_transit' || o.status === 'picked_up')
  );
  const [proposedRequests, setProposedRequests] = useState<HospitalRequestItem[]>(DEFAULT_PROPOSED_REQUESTS);
  const [activeVehicleId, setActiveVehicleIdState] = useState<string>('TX-0412');
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);

  // Delivered and exception orders derived from dispatchStore
  const deliveredOrders = useMemo(() => {
    return dispatchStore.orders.filter((o) => o.status === 'delivered');
  }, [dispatchStore.orders]);

  const exceptionOrders = useMemo(() => {
    return dispatchStore.orders.filter((o) => o.status === 'delayed' || o.status === 'alert');
  }, [dispatchStore.orders]);

  // Total Units in Transit (Synchronized)
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

  // ── Dispatch Request (Section 1.2) ──────────────────────────────────────────
  const dispatchRequest = useCallback(
    (reqId: string, sourceCode: string, targetCode: string, units: number) => {
      const newOrderId = 'TX-0419';
      const isBike = units <= 6;
      const vehicleId = isBike ? 'BIKE-02' : 'VAN-05';
      const courierName = isBike ? 'Manoj Verma' : 'Vikram Singh';
      const courierId = isBike ? 'CR-04' : 'CR-05';

      const sourceNode = hospitals.find((h) => h.code === sourceCode || h.id === sourceCode);
      const targetNode = hospitals.find((h) => h.code === targetCode || h.id === targetCode);

      const fromName = sourceNode?.fullName || sourceCode;
      const fromZone = sourceNode?.zone || 'Delhi-NCR';
      const toName = targetNode?.fullName || targetCode;
      const toZone = targetNode?.zone || 'Delhi-NCR';

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const newOrder: DispatchOrder = {
        id: newOrderId,
        from: sourceCode,
        fromId: sourceNode?.id || 'ND-04',
        fromName,
        fromZone,
        to: targetCode,
        toId: targetNode?.id || 'ND-01',
        toName,
        toZone,
        units,
        product: 'Apheresis',
        group: 'O-',
        shelfLifeAtDispatchH: 34,
        distanceKm: 14.2,
        etaMin: 16,
        status: 'in_transit',
        vehicleId,
        courier: {
          id: courierId,
          name: courierName,
          phone: '+91 98110 44219',
          vehicleId,
          rating: 4.96,
        },
        startedAt: timeStr,
        etaTime: '+16 min',
        progress: 0.05,
        coldChain: {
          tempC: 22.1,
          agitationOffMin: 0,
          doorOpens: 0,
          tiltEvents: 0,
          sealOk: true,
        },
        fefoReason: `Optimal corridor from ${sourceCode} reserves`,
        reasonText: 'Urgent emergency platelet leveling',
      };

      // 1. Prepend to inTransitOrders
      setInTransitOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrderId)]);

      // 2. Remove fulfilled request from proposedRequests
      setProposedRequests((prev) => prev.filter((r) => r.id !== reqId));

      // 3. Mutate hospitals balances (atomic source deduction & target credit)
      setHospitals((prev) =>
        prev.map((h) => {
          if (h.code === sourceCode || h.id === sourceCode) {
            const unitsOnHand = Math.max(0, h.unitsOnHand - units);
            const netBalance = unitsOnHand - h.targetBaseline;
            const status: 'critical' | 'warning' | 'optimal' =
              netBalance < -10 ? 'critical' : netBalance < 0 ? 'warning' : 'optimal';
            return { ...h, unitsOnHand, netBalance, status };
          }
          if (h.code === targetCode || h.id === targetCode) {
            const unitsOnHand = h.unitsOnHand + units;
            const netBalance = unitsOnHand - h.targetBaseline;
            const status: 'critical' | 'warning' | 'optimal' =
              netBalance < -10 ? 'critical' : netBalance < 0 ? 'warning' : 'optimal';
            return { ...h, unitsOnHand, netBalance, status };
          }
          return h;
        })
      );

      // 4. Set activeVehicleId to the new order
      setActiveVehicleIdState(newOrderId);

      // 5. Synchronize with useDispatchStore
      const curDispatchState = useDispatchStore.getState();
      useDispatchStore.setState({
        orders: [newOrder, ...curDispatchState.orders.filter((o) => o.id !== newOrderId)],
        selectedOrderId: newOrderId,
        activeTab: 'in_transit',
      });

      // 6. Smoothly scroll Row 3 horizontal carousel to left: 0
      if (typeof document !== 'undefined') {
        const carouselEl = document.querySelector('[data-testid="fleet-queue-row"]');
        if (carouselEl) {
          carouselEl.scrollTo({ left: 0, behavior: 'smooth' });
        }
      }

      return { success: true, orderId: newOrderId, newOrder };
    },
    [hospitals]
  );

  // ── Trigger Outbreak (Section 1.2) ──────────────────────────────────────────
  const triggerOutbreak = useCallback((scenarioId: string) => {
    setActiveScenario(scenarioId);

    // 1. Mutate affected hospitals in global store
    setHospitals((prev) =>
      prev.map((h) => {
        if (scenarioId === 'dengue') {
          if (h.code === 'GTB') {
            const unitsOnHand = 32;
            const netBalance = unitsOnHand - h.targetBaseline; // -53
            return { ...h, unitsOnHand, netBalance, status: 'critical' as const };
          }
          if (h.code === 'LNJ') {
            const unitsOnHand = 48;
            const netBalance = unitsOnHand - h.targetBaseline; // -37
            return { ...h, unitsOnHand, netBalance, status: 'critical' as const };
          }
          if (h.code === 'AIM') {
            const unitsOnHand = 52;
            const netBalance = unitsOnHand - h.targetBaseline; // -33
            return { ...h, unitsOnHand, netBalance, status: 'critical' as const };
          }
          if (h.code === 'RGV') {
            const unitsOnHand = 36;
            const netBalance = unitsOnHand - h.targetBaseline; // -24
            return { ...h, unitsOnHand, netBalance, status: 'critical' as const };
          }
        } else if (scenarioId === 'trauma') {
          if (h.code === 'MDT') {
            const unitsOnHand = 40;
            const netBalance = unitsOnHand - h.targetBaseline;
            return { ...h, unitsOnHand, netBalance, status: 'critical' as const };
          }
          if (h.code === 'NH4') {
            const unitsOnHand = 35;
            const netBalance = unitsOnHand - h.targetBaseline;
            return { ...h, unitsOnHand, netBalance, status: 'critical' as const };
          }
          if (h.code === 'AIM') {
            const unitsOnHand = 45;
            const netBalance = unitsOnHand - h.targetBaseline;
            return { ...h, unitsOnHand, netBalance, status: 'critical' as const };
          }
        } else if (scenarioId === 'agitator') {
          if (h.code === 'N62') {
            const unitsOnHand = 30;
            const netBalance = unitsOnHand - h.targetBaseline;
            return { ...h, unitsOnHand, netBalance, status: 'critical' as const };
          }
          if (h.code === 'NBV') {
            const unitsOnHand = 35;
            const netBalance = unitsOnHand - h.targetBaseline;
            return { ...h, unitsOnHand, netBalance, status: 'critical' as const };
          }
        }
        return h;
      })
    );

    // 2. Injects urgent new #REQ-90X items at top of proposedRequests
    const urgentRequests: HospitalRequestItem[] =
      scenarioId === 'dengue'
        ? [
            {
              id: 'REQ-905',
              orderIdAlias: 'TX-1051',
              targetHospital: 'GTB',
              neededUnits: 16,
              bloodGroup: 'O+',
              product: 'Platelets',
              urgency: 'Critical',
              deficitStr: '-28u',
              estWindow: '< 30 min',
              donors: [
                { code: 'N62', availableUnits: 26, etaMin: 12, fefoMatchPct: 98, isOptimal: true },
                { code: 'APL', availableUnits: 20, etaMin: 15, fefoMatchPct: 91 },
                { code: 'MDT', availableUnits: 30, etaMin: 24, fefoMatchPct: 86 },
              ],
            },
            {
              id: 'REQ-906',
              orderIdAlias: 'TX-1052',
              targetHospital: 'LNJ',
              neededUnits: 14,
              bloodGroup: 'A+',
              product: 'Apheresis',
              urgency: 'Critical',
              deficitStr: '-20u',
              estWindow: '< 40 min',
              donors: [
                { code: 'APL', availableUnits: 24, etaMin: 11, fefoMatchPct: 97, isOptimal: true },
                { code: 'SFD', availableUnits: 16, etaMin: 14, fefoMatchPct: 88 },
                { code: 'AIM', availableUnits: 22, etaMin: 16, fefoMatchPct: 84 },
              ],
            },
            {
              id: 'REQ-907',
              orderIdAlias: 'TX-1053',
              targetHospital: 'AIM',
              neededUnits: 12,
              bloodGroup: 'O-',
              product: 'Apheresis',
              urgency: 'Critical',
              deficitStr: '-18u',
              estWindow: '< 45 min',
              donors: [
                { code: 'N62', availableUnits: 22, etaMin: 14, fefoMatchPct: 96, isOptimal: true },
                { code: 'APL', availableUnits: 18, etaMin: 12, fefoMatchPct: 90 },
                { code: 'MDT', availableUnits: 28, etaMin: 22, fefoMatchPct: 84 },
              ],
            },
          ]
        : scenarioId === 'trauma'
        ? [
            {
              id: 'REQ-908',
              orderIdAlias: 'TX-1054',
              targetHospital: 'MDT',
              neededUnits: 18,
              bloodGroup: 'O-',
              product: 'Emergency',
              urgency: 'Critical',
              deficitStr: '-35u',
              estWindow: '< 20 min',
              donors: [
                { code: 'AIM', availableUnits: 20, etaMin: 16, fefoMatchPct: 99, isOptimal: true },
                { code: 'MAX', availableUnits: 24, etaMin: 18, fefoMatchPct: 93 },
                { code: 'N62', availableUnits: 26, etaMin: 26, fefoMatchPct: 85 },
              ],
            },
            {
              id: 'REQ-909',
              orderIdAlias: 'TX-1055',
              targetHospital: 'NH4',
              neededUnits: 12,
              bloodGroup: 'O+',
              product: 'Platelets',
              urgency: 'Critical',
              deficitStr: '-25u',
              estWindow: '< 35 min',
              donors: [
                { code: 'MDT', availableUnits: 22, etaMin: 10, fefoMatchPct: 97, isOptimal: true },
                { code: 'APL', availableUnits: 18, etaMin: 20, fefoMatchPct: 89 },
                { code: 'MAX', availableUnits: 20, etaMin: 16, fefoMatchPct: 86 },
              ],
            },
            {
              id: 'REQ-910',
              orderIdAlias: 'TX-1056',
              targetHospital: 'AIM',
              neededUnits: 10,
              bloodGroup: 'O-',
              product: 'STAT Buffer',
              urgency: 'Critical',
              deficitStr: '-20u',
              estWindow: '< 40 min',
              donors: [
                { code: 'N62', availableUnits: 20, etaMin: 14, fefoMatchPct: 96, isOptimal: true },
                { code: 'MDT', availableUnits: 24, etaMin: 22, fefoMatchPct: 88 },
                { code: 'SGR', availableUnits: 16, etaMin: 18, fefoMatchPct: 85 },
              ],
            },
          ]
        : [
            {
              id: 'REQ-911',
              orderIdAlias: 'TX-1057',
              targetHospital: 'N62',
              neededUnits: 16,
              bloodGroup: 'O+',
              product: 'Platelets',
              urgency: 'Critical',
              deficitStr: '-30u',
              estWindow: '< 25 min',
              donors: [
                { code: 'APL', availableUnits: 26, etaMin: 12, fefoMatchPct: 98, isOptimal: true },
                { code: 'MDT', availableUnits: 28, etaMin: 24, fefoMatchPct: 88 },
                { code: 'MAX', availableUnits: 22, etaMin: 16, fefoMatchPct: 85 },
              ],
            },
          ];

    setProposedRequests((prev) => [
      ...urgentRequests,
      ...prev.filter((r) => !urgentRequests.some((u) => u.id === r.id)),
    ]);
  }, []);

  // ── Reset Scenario ──────────────────────────────────────────────────────────
  const resetScenario = useCallback(() => {
    setActiveScenario(null);
    setHospitals(createInitialHospitalNodes());
    setProposedRequests(DEFAULT_PROPOSED_REQUESTS);
    const store = useDispatchStore.getState();
    const initialTransit = store.orders.filter(
      (o) => o.status === 'in_transit' || o.status === 'picked_up'
    );
    setInTransitOrders(initialTransit);
    setActiveVehicleIdState('TX-0412');
  }, []);

  // ── Rebalance (+6h Solver) ──────────────────────────────────────────────────
  const rebalance = useCallback(() => {
    const res = useDispatchStore.getState().rebalance();
    // Refresh in-transit orders from dispatch store
    const store = useDispatchStore.getState();
    setInTransitOrders(
      store.orders.filter((o) => o.status === 'in_transit' || o.status === 'picked_up')
    );
    return res;
  }, []);

  const value: PlexusStoreContextValue = useMemo(
    () => ({
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
    }),
    [
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
    ]
  );

  return <PlexusStoreContext.Provider value={value}>{children}</PlexusStoreContext.Provider>;
}

// Global fallback singleton for components rendered outside PlexusStoreProvider
let fallbackStoreInstance: PlexusStoreContextValue | null = null;

function getFallbackPlexusStore(): PlexusStoreContextValue {
  if (!fallbackStoreInstance) {
    const defaultHospitals = createInitialHospitalNodes();
    const store = useDispatchStore.getState();
    const transitOrders = store.orders.filter(
      (o) => o.status === 'in_transit' || o.status === 'picked_up'
    );
    fallbackStoreInstance = {
      hospitals: defaultHospitals,
      inTransitOrders: transitOrders,
      proposedRequests: DEFAULT_PROPOSED_REQUESTS,
      deliveredOrders: store.orders.filter((o) => o.status === 'delivered'),
      exceptionOrders: store.orders.filter((o) => o.status === 'delayed' || o.status === 'alert'),
      activeVehicleId: 'TX-0412',
      activeScenario: null,
      totalUnitsInTransit: transitOrders.reduce((s, o) => s + o.units, 0),
      selectedHospitalId: null,
      dispatchRequest: (_reqId, sourceCode, targetCode, units) => {
        const newOrderId = 'TX-0419';
        const isBike = units <= 6;
        const vehicleId = isBike ? 'BIKE-02' : 'VAN-05';
        const newOrder: DispatchOrder = {
          id: newOrderId,
          from: sourceCode,
          fromId: 'ND-04',
          fromName: 'Source Hub',
          fromZone: 'Delhi-NCR',
          to: targetCode,
          toId: 'ND-01',
          toName: 'Target Hub',
          toZone: 'Delhi-NCR',
          units,
          product: 'Apheresis',
          group: 'O-',
          shelfLifeAtDispatchH: 34,
          distanceKm: 14.2,
          etaMin: 16,
          status: 'in_transit',
          vehicleId,
          courier: {
            id: isBike ? 'CR-04' : 'CR-05',
            name: isBike ? 'Manoj Verma' : 'Vikram Singh',
            phone: '+91 98110 44219',
            vehicleId,
            rating: 4.96,
          },
          startedAt: '10:30',
          etaTime: '+16 min',
          progress: 0.05,
          coldChain: { tempC: 22.1, agitationOffMin: 0, doorOpens: 0, tiltEvents: 0, sealOk: true },
          fefoReason: `Optimal corridor from ${sourceCode} reserves`,
          reasonText: 'Urgent emergency platelet leveling',
        };
        const cur = useDispatchStore.getState();
        useDispatchStore.setState({
          orders: [newOrder, ...cur.orders.filter((o) => o.id !== newOrderId)],
          selectedOrderId: newOrderId,
          activeTab: 'in_transit',
        });
        return { success: true, orderId: newOrderId, newOrder };
      },
      triggerOutbreak: () => {},
      resetScenario: () => {},
      rebalance: () => useDispatchStore.getState().rebalance(),
      setActiveVehicleId: (id) => useDispatchStore.getState().selectOrder(id),
      selectHospital: () => {},
      getHospitalByCode: (code) => defaultHospitals.find((h) => h.code === code),
      getHospitalById: (id) => defaultHospitals.find((h) => h.id === id),
    };
  }
  return fallbackStoreInstance;
}

export function usePlexusStore(): PlexusStoreContextValue {
  const context = useContext(PlexusStoreContext);
  if (!context) {
    return getFallbackPlexusStore();
  }
  return context;
}
