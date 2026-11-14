/**
 * src/data/dispatch/store.ts
 * Zustand central state store for Plexus Autonomous Dispatch Data Layer.
 * LANDING_SPEC.md (v5.2) Section 21.1, 21.3, 21.4.
 * Backed by single-source-of-truth World core (PORTAL_SPEC Section 1.12, 4, 6.5).
 */

import { create } from 'zustand';
import type { DispatchOrder, DispatchTab } from './types';
import {
  mapWorldOrdersToDispatchOrders,
  generateRebalanceProposals,
  getRouteInfo,
} from './deriveOrders';
import {
  getWorld,
  subscribeWorld,
  dispatchWorldEvent,
  solveTransfers,
  simClock,
  getIdealVehicleType,
} from '../../world';

export interface DispatchState {
  orders: DispatchOrder[];
  selectedOrderId: string | null;
  activeTab: DispatchTab;
  selectedZone: string | null;
  speedMultiplier: number;
  lastTickTime: number;

  // Actions
  selectOrder: (orderId: string | null) => void;
  setActiveTab: (tab: DispatchTab) => void;
  setSelectedZone: (zone: string | null) => void;
  approve: (orderId: string) => { success: boolean; order?: DispatchOrder };
  rebalance: () => { count: number; units: number };
  tick: () => void;
  reset: () => void;
}

export const useDispatchStore = create<DispatchState>((set, get) => {
  const world = getWorld();
  const initialOrders = mapWorldOrdersToDispatchOrders(world);

  return {
    orders: initialOrders,
    selectedOrderId: 'TX-0412', // Primary hero order
    activeTab: 'in_transit',
    selectedZone: null,
    speedMultiplier: simClock.getState().speed,
    lastTickTime: Date.now(),

    selectOrder: (orderId) => set({ selectedOrderId: orderId }),

    setActiveTab: (tab) => set({ activeTab: tab }),

    setSelectedZone: (zone) => set({ selectedZone: zone }),

    approve: (orderId) => {
      const state = get();
      const currentWorld = getWorld();

      // Find target order or proposal
      let target = state.orders.find(
        (o) =>
          o.id === orderId ||
          (orderId === 'TX-1043' && o.id === 'TX-0412') ||
          (orderId === 'TX-0412' && o.id === 'TX-1043')
      );

      if (!target) {
        target = state.orders.find(
          (o) =>
            o.status === 'proposed' &&
            (o.toId === orderId ||
              o.fromId === orderId ||
              o.to === orderId ||
              o.from === orderId)
        );
      }

      const proposals = solveTransfers(currentWorld, 6);
      const matchedProposal = proposals.find(
        (p) => p.requestId === orderId || p.to === orderId || p.from === orderId
      );

      const fromCode = target ? target.from : matchedProposal ? matchedProposal.from : 'MDT';
      const toCode = target ? target.to : matchedProposal ? matchedProposal.to : 'AIM';
      const units = target ? target.units : matchedProposal ? matchedProposal.units : 6;
      const product = target
        ? target.product === 'Apheresis'
          ? 'APH'
          : 'RDP'
        : matchedProposal
        ? matchedProposal.product
        : 'APH';
      const group = target ? target.group : matchedProposal ? matchedProposal.group : 'O-';

      const route = getRouteInfo(fromCode, toCode);
      const idealType = getIdealVehicleType(units);
      const courierName = idealType === 'bike' ? 'Manoj Verma' : 'Rajesh Kumar';
      const vehicleId = idealType === 'bike' ? 'BIKE-01' : 'VAN-01';
      const now = simClock.now();
      const newOrderId = orderId.startsWith('TX-')
        ? orderId
        : `TX-${1050 + Math.floor(Math.random() * 500)}`;

      // Append OrderAssigned to canonical World event log
      dispatchWorldEvent('OrderAssigned', 'operator:DISPATCH-01', {
        id: newOrderId,
        requestId: orderId.startsWith('REQ-') ? orderId : null,
        from: fromCode,
        to: toCode,
        product,
        group,
        units,
        allocations: [
          {
            lotId: `LOT-${fromCode}-ALLOC`,
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

      const updatedOrders = mapWorldOrdersToDispatchOrders(getWorld());
      set({
        orders: updatedOrders,
        selectedOrderId: newOrderId,
        activeTab: 'in_transit',
      });

      const updated = updatedOrders.find((o) => o.id === newOrderId);
      return { success: true, order: updated };
    },

    rebalance: () => {
      dispatchWorldEvent('SolverRun', 'operator:DISPATCH-01', { horizonH: 6 });
      const proposals = solveTransfers(getWorld(), 6);
      const newProposals = generateRebalanceProposals(get().orders);
      const totalUnits = newProposals.reduce((sum, o) => sum + o.units, 0);

      const updatedOrders = mapWorldOrdersToDispatchOrders(getWorld());
      // Merge active world orders with solver proposals
      set({
        orders: [...newProposals, ...updatedOrders],
      });

      return { count: proposals.length || newProposals.length, units: totalUnits };
    },

    tick: () => {
      const currentWorld = getWorld();
      const updatedOrders = mapWorldOrdersToDispatchOrders(currentWorld);
      set({ orders: updatedOrders, lastTickTime: Date.now() });
    },

    reset: () => {
      const currentWorld = getWorld();
      set({
        orders: mapWorldOrdersToDispatchOrders(currentWorld),
        selectedOrderId: 'TX-0412',
        activeTab: 'in_transit',
        selectedZone: null,
        lastTickTime: Date.now(),
      });
    },
  };
});

// Reactively subscribe to World model updates
subscribeWorld((world) => {
  const updatedOrders = mapWorldOrdersToDispatchOrders(world);
  useDispatchStore.setState({ orders: updatedOrders });
});

if (typeof window !== 'undefined') {
  (window as any).__dispatchStore = useDispatchStore;
}
