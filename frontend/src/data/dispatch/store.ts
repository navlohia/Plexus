/**
 * src/data/dispatch/store.ts
 * Zustand central state store for Plexus Autonomous Dispatch Data Layer.
 * LANDING_SPEC.md (v5.2) Section 21.1, 21.3, 21.4.
 */

import { create } from 'zustand';
import type { DispatchOrder, DispatchTab } from './types';
import { deriveInitialDispatchOrders, generateRebalanceProposals } from './deriveOrders';
import { advanceSimulationOrders, getSimSpeedMultiplier } from './simClock';
import { soundEngine } from '../../utils/soundEngine';

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
  const initialOrders = deriveInitialDispatchOrders();

  return {
    orders: initialOrders,
    selectedOrderId: 'TX-0412', // Default to primary in-transit hero order per Spec 21.2
    activeTab: 'in_transit',
    selectedZone: null,
    speedMultiplier: getSimSpeedMultiplier(),
    lastTickTime: Date.now(),

    selectOrder: (orderId) => set({ selectedOrderId: orderId }),

    setActiveTab: (tab) => set({ activeTab: tab }),

    setSelectedZone: (zone) => set({ selectedZone: zone }),

    approve: (orderId) => {
      const state = get();
      // Look up target by exact id, alias (e.g. TX-1043 -> TX-0412), or hospital id/code
      let target = state.orders.find(
        (o) =>
          o.id === orderId ||
          (orderId === 'TX-1043' && o.id === 'TX-0412') ||
          (orderId === 'TX-0412' && o.id === 'TX-1043')
      );

      if (!target) {
        // Look up by hospital id or code among proposed orders
        target = state.orders.find(
          (o) =>
            o.status === 'proposed' &&
            (o.toId === orderId ||
              o.fromId === orderId ||
              o.to === orderId ||
              o.from === orderId)
        );
      }

      if (!target) {
        // Fallback to first proposed order
        target = state.orders.find((o) => o.status === 'proposed');
      }

      if (!target) return { success: false };

      const actualId = target.id;
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      // Status advances proposed -> picked_up per Spec 21.3
      const updatedOrders = state.orders.map((o) => {
        if (o.id === actualId) {
          return {
            ...o,
            status: 'picked_up' as const,
            startedAt: timeStr,
            progress: 0.02,
          };
        }
        return o;
      });

      set({
        orders: updatedOrders,
        selectedOrderId: actualId,
      });

      // Play tactical audio tick if sound is enabled (Spec 21.4)
      try {
        soundEngine.playButtonClick();
      } catch {}

      const updated = updatedOrders.find((o) => o.id === actualId);
      return { success: true, order: updated };
    },

    rebalance: () => {
      const state = get();
      const newProposals = generateRebalanceProposals(state.orders);

      if (newProposals.length === 0) {
        return { count: 0, units: 0 };
      }

      const totalUnits = newProposals.reduce((sum, o) => sum + o.units, 0);

      set({
        orders: [...newProposals, ...state.orders],
      });

      // Play soft sound
      try {
        soundEngine.playButtonClick();
      } catch {}

      return { count: newProposals.length, units: totalUnits };
    },

    tick: () => {
      const state = get();
      const now = Date.now();
      const deltaMs = now - state.lastTickTime;

      // Rate limit updates to at most 1 Hz (Spec 21.3: "Updates run at 1 Hz at most")
      if (deltaMs < 950) return;

      const deltaSec = (deltaMs / 1000) * state.speedMultiplier;
      const { orders: nextOrders, changed } = advanceSimulationOrders(state.orders, deltaSec);

      if (changed) {
        set({
          orders: nextOrders,
          lastTickTime: now,
        });
      } else {
        set({ lastTickTime: now });
      }
    },

    reset: () => {
      set({
        orders: deriveInitialDispatchOrders(),
        selectedOrderId: 'TX-0412',
        activeTab: 'in_transit',
        selectedZone: null,
        lastTickTime: Date.now(),
      });
    },
  };
});

// Setup 1 Hz simulation ticker (never exceeding 1 Hz)
if (typeof window !== 'undefined') {
  (window as any).__dispatchStore = useDispatchStore;
  setInterval(() => {
    useDispatchStore.getState().tick();
  }, 1000);
}
