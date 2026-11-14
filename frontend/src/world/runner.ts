/**
 * src/world/runner.ts
 * Idempotent Event Producer Runner
 * PORTAL_SPEC.md Section 1.10
 */

import { AUTOPILOT_DELAY_S } from './config';
import type { World, WorldEvent, DispatchOrder } from './types';
import { eventLog } from './eventLog';
import { runSolver } from './solver';
import { pickVehicle } from './vehicles';

const SLOT_DURATION_MS = 3 * 3600 * 1000; // 3-hour slots

/**
 * Runner producing deterministic, idempotent background events
 */
export class WorldRunner {
  private timer: any = null;
  private lastProcessedSlot: number = 0;
  private isRunning: boolean = false;

  public start(getLatestWorld: () => World): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const initialWorld = getLatestWorld();
    this.lastProcessedSlot = Math.floor(initialWorld.simNow / SLOT_DURATION_MS);

    // Run tick every 1000ms
    this.timer = setInterval(() => {
      this.tick(getLatestWorld());
    }, 1000);

    // Run immediately on tab visibility change
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.tick(getLatestWorld());
        }
      });
    }
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  /**
   * Evaluates due events and appends them with deterministic idempotent IDs
   */
  public tick(world: World): WorldEvent[] {
    const simNow = world.simNow;
    const currentSlot = Math.floor(simNow / SLOT_DURATION_MS);
    const producedEvents: WorldEvent[] = [];

    // ── 1. Autopilot Assignments: auto:<requestId> after AUTOPILOT_DELAY_S ──
    if (world.settings.autopilot || world.activeScenario?.autopilot) {
      const pendingRequests = Object.values(world.requests).filter(
        (r) =>
          (r.status === 'requested' || r.status === 'matching') &&
          simNow >= r.createdAt + AUTOPILOT_DELAY_S * 1000
      );

      if (pendingRequests.length > 0) {
        const proposals = runSolver(world, 6);
        for (const req of pendingRequests) {
          const match = proposals.find((p) => p.requestId === req.id);
          if (match) {
            const vehicle = pickVehicle(
              match.units,
              match.from,
              req.urgency,
              Object.values(world.orders),
              world.vehicles,
              simNow
            );

            const assignedAt = simNow;
            const prepMs = 4 * 60000;
            const waitMs = 3 * 60000;
            const transitMs = match.etaMin * 60000;

            const newOrder: DispatchOrder = {
              id: `TX-${match.from}${match.to}-${String(simNow).slice(-4)}`,
              requestId: req.id,
              from: match.from,
              to: match.to,
              product: match.product,
              group: match.group,
              units: match.units,
              allocations: match.allocations,
              vehicleId: vehicle?.id || 'VAN-01',
              courier: vehicle?.courier || 'Amit Sharma',
              distanceKm: match.distanceKm,
              durationMin: match.etaMin,
              assignedAt,
              packedAt: assignedAt + prepMs,
              pickedUpAt: assignedAt + prepMs + waitMs,
              deliveredAt: assignedAt + prepMs + waitMs + transitMs,
              status: 'assigned',
              delayed: false,
              delayMin: 0,
              alert: false,
              coldChain: {
                tempC: 22.0,
                minTempC: 21.8,
                maxTempC: 22.3,
                excursionMin: 0,
                agitationOffMin: 0,
                sealOk: true,
                doorOpens: 0,
                tiltEvents: 0,
              },
            };

            const autoEvent: WorldEvent = {
              id: `auto:${req.id}`,
              type: 'OrderAssigned',
              at: simNow,
              actor: 'AUTO',
              payload: newOrder,
            };

            if (eventLog.appendEvent(autoEvent)) {
              producedEvents.push(autoEvent);
            }
          }
        }
      }
    }

    // ── 2. Scenario Requests: scn:<scenarioId>:<hospital>:<k> every 10 sim-minutes ──
    if (world.activeScenario) {
      const scn = world.activeScenario;
      const elapsedSimMs = simNow - scn.startedAt;
      const totalDurationMs = (scn.durationH || 72) * 3600 * 1000;

      if (elapsedSimMs >= 0 && elapsedSimMs <= totalDurationMs) {
        const SCENARIO_INTERVAL_MS = 10 * 60 * 1000; // 10 sim-minutes
        const currentK = Math.floor(elapsedSimMs / SCENARIO_INTERVAL_MS);

        // Find affected hospitals by matching zones
        const affectedZoneNames = scn.zones.map((z) => z.zone.toLowerCase());
        const affectedHospitals = Object.values(world.hospitals).filter((h) =>
          affectedZoneNames.includes(h.zone.toLowerCase())
        );

        if (affectedHospitals.length > 0) {
          // Generate requests for recent slots up to currentK
          const startK = Math.max(0, currentK - 12);
          for (let k = startK; k <= currentK; k++) {
            if (producedEvents.length >= 50) break;
            const slotTime = scn.startedAt + k * SCENARIO_INTERVAL_MS;

            // Hospital deterministic selection
            const hosp = affectedHospitals[k % affectedHospitals.length];
            const reqId = `scn:${scn.id}:${hosp.code}:${k}`;

            if (!world.requests[reqId]) {
              // Apheresis share +15 points: baseline ~30%, with +15 points ~45-50%
              const isApheresis = ((k + hosp.code.charCodeAt(0)) % 10) < 5;
              const product = isApheresis ? 'APH' : 'RDP';

              const groups = ['O-', 'O+', 'B+', 'A+', 'O+', 'O-', 'A-', 'B-'] as const;
              const group = groups[(k + hosp.code.charCodeAt(1)) % groups.length];
              const units = ((k % 3) + 1) * 2; // 2, 4, or 6 units
              const urgency = k % 2 === 0 ? 'urgent' : 'immediate';
              const neededBy = slotTime + (urgency === 'immediate' ? 45 * 60000 : 150 * 60000);

              const reqEvent: WorldEvent = {
                id: reqId,
                type: 'RequestCreated',
                at: slotTime,
                actor: 'SYSTEM',
                payload: {
                  id: reqId,
                  hospital: hosp.code,
                  product,
                  group,
                  units,
                  urgency,
                  neededBy,
                  substitutesOk: true,
                  partialOk: true,
                  createdAt: slotTime,
                  status: 'requested',
                  assignedOrderIds: [],
                  sourceTag: 'Simulated scenario',
                },
              };

              if (eventLog.appendEvent(reqEvent)) {
                producedEvents.push(reqEvent);
              }
            }
          }
        }
      }
    }

    // ── 2. Back-fill baseline usage and donation slots (cap 500 events per tick) ──
    if (this.lastProcessedSlot === 0) {
      this.lastProcessedSlot = currentSlot;
    }

    if (currentSlot > this.lastProcessedSlot) {
      const startSlot = this.lastProcessedSlot + 1;
      const endSlot = Math.min(currentSlot, startSlot + 10); // at most 10 slots per tick

      for (let s = startSlot; s <= endSlot; s++) {
        if (producedEvents.length >= 500) break;

        const slotTime = s * SLOT_DURATION_MS;

        // Baseline hospital usage and donations
        for (const hosp of Object.values(world.hospitals)) {
          if (producedEvents.length >= 500) break;

          // Deterministic slot donation
          const donEvent: WorldEvent = {
            id: `don:${hosp.code}:${s}`,
            type: 'LotReceived',
            at: slotTime,
            actor: 'SYSTEM',
            payload: {
              lotId: `lot:${hosp.code}:don:${s}`,
              hospital: hosp.code,
              product: (s % 3 === 0 ? 'APH' : 'RDP') as any,
              group: 'O+',
              units: 2,
              collectedAt: slotTime,
              expiresAt: slotTime + 120 * 3600000,
              origin: 'donation',
            },
          };

          if (eventLog.appendEvent(donEvent)) {
            producedEvents.push(donEvent);
          }
        }
      }

      this.lastProcessedSlot = endSlot;
    }

    return producedEvents;
  }
}

export const worldRunner = new WorldRunner();

export function startWorldRunner(getLatestWorld: () => World): () => void {
  worldRunner.start(getLatestWorld);
  return () => worldRunner.stop();
}

export function stopWorldRunner(): void {
  worldRunner.stop();
}


