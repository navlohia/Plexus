/**
 * src/world/derive.ts
 * Pure Deterministic Fold: World(now) = fold(seed, eventLog, now)
 * PORTAL_SPEC.md Section 1.1, 1.4, 1.8
 */

import type {
  World,
  WorldEvent,
  DispatchOrder,
  OrderStatus,
  PlateletRequest,
  RequestStatus,
  Lot,
  BloodGroup,
} from './types';
import type { SeedData } from './seed';

/**
 * Derives an order's dynamic lifecycle status purely from timestamps and simNow:
 * assigned (t < packedAt) -> packed -> in_transit (pickedUpAt <= t < deliveredAt) -> arrived (t >= deliveredAt) -> received
 */
export function deriveOrderStatus(order: DispatchOrder, simNow: number): OrderStatus {
  if (order.cancelledAt !== null && order.cancelledAt !== undefined) {
    return 'cancelled';
  }
  if (order.receivedAt !== null && order.receivedAt !== undefined) {
    return 'received';
  }
  if (simNow < order.packedAt) {
    return 'assigned';
  }
  if (simNow < order.pickedUpAt) {
    return 'packed';
  }
  if (simNow < order.deliveredAt) {
    return 'in_transit';
  }
  return 'arrived';
}

/**
 * Derives route progress (0.0 to 1.0) along the transit line
 */
export function deriveOrderProgress(order: DispatchOrder, simNow: number): number {
  if (simNow <= order.pickedUpAt) {
    return 0.0;
  }
  if (simNow >= order.deliveredAt) {
    return 1.0;
  }
  const total = order.deliveredAt - order.pickedUpAt;
  if (total <= 0) return 1.0;
  return Number(((simNow - order.pickedUpAt) / total).toFixed(4));
}

/**
 * Derives request status from associated orders or expiry
 */
export function deriveRequestStatus(
  req: PlateletRequest,
  orders: Record<string, DispatchOrder>,
  simNow: number
): RequestStatus {
  if (req.status === 'cancelled' || req.status === 'unfulfilled') {
    return req.status;
  }

  const assignedOrders = req.assignedOrderIds
    .map((id) => orders[id])
    .filter((o): o is DispatchOrder => Boolean(o) && o.status !== 'cancelled');

  if (assignedOrders.length === 0) {
    if (simNow > req.neededBy) {
      return 'unfulfilled';
    }
    return req.status === 'matching' ? 'matching' : 'requested';
  }

  const allReceived = assignedOrders.every((o) => o.status === 'received');
  if (allReceived) {
    return 'confirmed';
  }

  const anyDelivered = assignedOrders.some((o) => o.status === 'arrived');
  if (anyDelivered) {
    return 'delivered';
  }

  const anyInTransit = assignedOrders.some((o) => o.status === 'in_transit');
  if (anyInTransit) {
    return 'in_transit';
  }

  return 'assigned';
}

/**
 * Pure Fold function: takes baseline seed and folds all append-only events up to simNow
 */
export function fold(seed: SeedData, events: WorldEvent[], simNow: number): World {
  // Deep copy seed entities for pure mutation inside fold
  const hospitals = JSON.parse(JSON.stringify(seed.hospitals));
  const lots: Record<string, Lot> = JSON.parse(JSON.stringify(seed.lots));
  const requests: Record<string, PlateletRequest> = JSON.parse(JSON.stringify(seed.requests));
  const orders: Record<string, DispatchOrder> = JSON.parse(JSON.stringify(seed.orders));
  const vehicles = JSON.parse(JSON.stringify(seed.vehicles));
  let activeScenario = seed.activeScenario ? JSON.parse(JSON.stringify(seed.activeScenario)) : null;
  const settings = JSON.parse(JSON.stringify(seed.settings));
  const history30d = JSON.parse(JSON.stringify(seed.history30d));

  // Set of undone event IDs via UndoApplied
  const undoneEventIds = new Set<string>();
  for (const ev of events) {
    if (ev.type === 'UndoApplied' && ev.payload?.targetEventId) {
      undoneEventIds.add(ev.payload.targetEventId);
    }
  }

  // Filter and sort events chronologically
  const validEvents = events
    .filter((e) => !undoneEventIds.has(e.id))
    .sort((a, b) => a.at - b.at);

  for (const event of validEvents) {
    if (event.at > simNow) {
      continue; // Events in the future are not yet folded
    }

    switch (event.type) {
      case 'RequestCreated': {
        const req: PlateletRequest = {
          ...event.payload,
          createdAt: event.at,
          neededBy: event.payload.neededBy ?? event.at + 3 * 3600000,
          assignedOrderIds: event.payload.assignedOrderIds ?? [],
          status: 'requested',
        };
        requests[req.id] = req;
        break;
      }

      case 'RequestCancelled': {
        const { requestId } = event.payload;
        if (requests[requestId]) {
          requests[requestId].status = 'cancelled';
        }
        break;
      }

      case 'OrderAssigned': {
        const orderPayload = event.payload as DispatchOrder;
        const orderId = orderPayload.id || (orderPayload as any).orderId;
        if (!orderId) break;
        orders[orderId] = { ...orderPayload, id: orderId };

        // Deduct units from allocated source lots
        for (const alloc of orderPayload.allocations || []) {
          const lot = lots[alloc.lotId];
          if (lot) {
            lot.units = Math.max(0, lot.units - alloc.units);
            if (lot.units === 0) {
              delete lots[alloc.lotId];
            }
          }
        }

        // Link order to request if present
        if (orderPayload.requestId && requests[orderPayload.requestId]) {
          const req = requests[orderPayload.requestId];
          if (!req.assignedOrderIds.includes(orderPayload.id)) {
            req.assignedOrderIds.push(orderPayload.id);
          }
        }
        break;
      }

      case 'OrderCancelled': {
        const { orderId } = event.payload;
        const ord = orders[orderId];
        if (ord) {
          ord.cancelledAt = event.at;
          // Restore allocated lots to source hospital
          for (const alloc of ord.allocations || []) {
            if (lots[alloc.lotId]) {
              lots[alloc.lotId].units += alloc.units;
            } else {
              lots[alloc.lotId] = {
                lotId: alloc.lotId,
                hospital: ord.from,
                product: ord.product,
                group: ord.group,
                units: alloc.units,
                collectedAt: alloc.expiresAt - 120 * 3600000,
                expiresAt: alloc.expiresAt,
                origin: 'transfer',
              };
            }
          }
        }
        break;
      }

      case 'OrderDelayed': {
        const { orderId, delayMin, reason } = event.payload;
        const ord = orders[orderId];
        if (ord) {
          ord.delayed = true;
          ord.delayMin = (ord.delayMin || 0) + (delayMin || 10);
          ord.deliveredAt += (delayMin || 10) * 60000;
          if (reason) {
            ord.alertReason = reason;
          }
        }
        break;
      }

      case 'ColdChainExcursion': {
        const { orderId, tempC, excursionMin, reason } = event.payload;
        const ord = orders[orderId];
        if (ord) {
          ord.alert = true;
          ord.alertReason = reason || `Temperature ${tempC}°C excursion`;
          ord.coldChain.tempC = tempC;
          ord.coldChain.excursionMin = excursionMin || 6;
          ord.coldChain.maxTempC = Math.max(ord.coldChain.maxTempC, tempC);
        }
        break;
      }

      case 'OrderReceived': {
        const { orderId } = event.payload;
        const ord = orders[orderId];
        if (ord && !ord.receivedAt) {
          ord.receivedAt = event.at;
          // Create lots at destination hospital preserving ORIGINAL expiresAt
          for (const alloc of ord.allocations || []) {
            const newLotId = `lot:${ord.to}:${ord.id}:${alloc.lotId}`;
            lots[newLotId] = {
              lotId: newLotId,
              hospital: ord.to,
              product: ord.product,
              group: ord.group,
              units: alloc.units,
              collectedAt: alloc.expiresAt - 120 * 3600000,
              expiresAt: alloc.expiresAt,
              origin: 'transfer',
            };
          }
        }
        break;
      }

      case 'StockAdjusted': {
        const { lotId, hospital, product, group } = event.payload;
        const delta = event.payload.deltaUnits ?? event.payload.diffUnits ?? 0;
        if (hospital && hospitals[hospital]) {
          hospitals[hospital].lastVerifiedAt = event.at;
        }
        if (lotId && lots[lotId]) {
          lots[lotId].units = Math.max(0, lots[lotId].units + delta);
          if (lots[lotId].units === 0) {
            delete lots[lotId];
          }
        } else if (delta < 0 && hospital && group) {
          // FEFO reduction across active lots for this group
          let toDeduct = Math.abs(delta);
          const matchingLots = Object.values(lots)
            .filter((l) => l.hospital === hospital && l.group === group && (!product || l.product === product))
            .sort((a, b) => a.expiresAt - b.expiresAt);
          for (const l of matchingLots) {
            if (toDeduct <= 0) break;
            const take = Math.min(l.units, toDeduct);
            l.units -= take;
            toDeduct -= take;
            if (l.units === 0) {
              delete lots[l.lotId];
            }
          }
        } else if (delta > 0 && hospital && group) {
          const newLotId = lotId || `lot:${hospital}:adj:${event.id}`;
          lots[newLotId] = {
            lotId: newLotId,
            hospital,
            product: product || 'APH',
            group,
            units: delta,
            collectedAt: event.at,
            expiresAt: event.at + 120 * 3600000,
            origin: 'donation',
          };
        }
        break;
      }

      case 'LotReceived': {
        const lot = event.payload as Lot;
        if (lot && lot.lotId) {
          lots[lot.lotId] = { ...lot };
          if (lot.hospital && hospitals[lot.hospital]) {
            hospitals[lot.hospital].lastVerifiedAt = event.at;
          }
        }
        break;
      }

      case 'UnitsDiscarded': {
        const { lotId, units, hospital } = event.payload;
        if (hospital && hospitals[hospital]) {
          hospitals[hospital].lastVerifiedAt = event.at;
        }
        if (lots[lotId]) {
          lots[lotId].units = Math.max(0, lots[lotId].units - units);
          if (lots[lotId].units === 0) {
            delete lots[lotId];
          }
        }
        break;
      }

      case 'CountSubmitted': {
        const { hospitalCode, counts } = event.payload;
        if (hospitals[hospitalCode]) {
          hospitals[hospitalCode].lastVerifiedAt = event.at;
        }
        if (counts && hospitalCode) {
          for (const [grp, targetCount] of Object.entries(counts)) {
            const currentUnits = Object.values(lots)
              .filter((l) => l.hospital === hospitalCode && l.group === grp)
              .reduce((s, l) => s + l.units, 0);
            const diff = (targetCount as number) - currentUnits;
            if (diff > 0) {
              const newLotId = `lot:${hospitalCode}:count:${event.id}:${grp}`;
              lots[newLotId] = {
                lotId: newLotId,
                hospital: hospitalCode,
                product: 'APH',
                group: grp as BloodGroup,
                units: diff,
                collectedAt: event.at,
                expiresAt: event.at + 120 * 3600000,
                origin: 'donation',
              };
            } else if (diff < 0) {
              let toDeduct = Math.abs(diff);
              const groupLots = Object.values(lots)
                .filter((l) => l.hospital === hospitalCode && l.group === grp)
                .sort((a, b) => a.expiresAt - b.expiresAt);
              for (const l of groupLots) {
                if (toDeduct <= 0) break;
                const take = Math.min(l.units, toDeduct);
                l.units -= take;
                toDeduct -= take;
                if (l.units === 0) delete lots[l.lotId];
              }
            }
          }
        }
        break;
      }

      case 'ParLevelSet': {
        const { hospitalCode, group, level } = event.payload;
        if (hospitals[hospitalCode]) {
          hospitals[hospitalCode].parLevels[group] = level;
        }
        break;
      }

      case 'SurplusReleased': {
        // Hospital approves surplus release; dispatcher assigns per PORTAL_SPEC.md 3.5
        break;
      }

      case 'ScenarioStarted': {
        const payload = event.payload || {};
        const preset = payload.preset || 'dengue';
        const durationH = payload.durationH ?? (preset === 'dengue' ? 72 : 48);
        const zones = payload.zones ?? (preset === 'dengue'
          ? [
              { zone: 'East Delhi', multiplier: 2.0 },
              { zone: 'South Delhi', multiplier: 2.0 },
              { zone: 'Ghaziabad', multiplier: 2.0 },
            ]
          : [{ zone: 'All NCR', multiplier: 1.0 }]);
        activeScenario = {
          id: payload.id || `scn-${preset}-${event.at}`,
          preset,
          startedAt: event.at,
          durationH,
          zones,
          productShift: payload.productShift ?? (preset === 'dengue' ? 0.15 : 0),
          donorDip: payload.donorDip ?? (preset === 'dengue' ? -0.10 : -0.40),
          autopilot: payload.autopilot ?? true,
          ...payload,
        };
        break;
      }

      case 'ScenarioStopped': {
        activeScenario = null;
        break;
      }

      case 'SettingChanged': {
        if (event.payload.autopilot !== undefined) {
          settings.autopilot = event.payload.autopilot;
        }
        if (event.payload.speed !== undefined) {
          settings.speed = event.payload.speed;
        }
        break;
      }

      default:
        // Unknown event types are strictly ignored per Spec 1.4
        break;
    }
  }

  // Materialize time-derived statuses for all orders at simNow
  for (const ord of Object.values(orders)) {
    ord.status = deriveOrderStatus(ord, simNow);
  }

  // Materialize time-derived statuses for all requests at simNow
  for (const req of Object.values(requests)) {
    req.status = deriveRequestStatus(req, orders, simNow);
  }

  return {
    simNow,
    hospitals,
    lots,
    requests,
    orders,
    vehicles,
    activeScenario,
    settings,
    history30d,
  };
}

