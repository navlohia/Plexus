import { describe, it, expect } from 'vitest';
import { createSeedData, fold } from '../../world';
import { deriveOrderStatus } from '../../world/derive';

describe('PORTAL_SPEC Section 3.4 & 1.8 Request Detail & Receiving Flow', () => {
  it('preserves the five lifecycle stages (Requested -> Source found -> Packed -> On the way -> Delivered)', () => {
    const seed = createSeedData(1000);
    const order = Object.values(seed.orders)[0];
    expect(order).toBeDefined();

    // Stage 1: assigned (simNow < packedAt)
    expect(deriveOrderStatus(order, order.assignedAt + 1000)).toBe('assigned');
    // Stage 2: packed (simNow < pickedUpAt)
    expect(deriveOrderStatus(order, order.packedAt + 1000)).toBe('packed');
    // Stage 3: in_transit (simNow < deliveredAt)
    expect(deriveOrderStatus(order, order.pickedUpAt + 1000)).toBe('in_transit');
    // Stage 4: arrived (simNow >= deliveredAt)
    expect(deriveOrderStatus(order, order.deliveredAt + 1000)).toBe('arrived');
  });

  it('preserves the stage flow when exceptions occur (delay or cold-chain alert)', () => {
    const seed = createSeedData(1000);
    const order = Object.values(seed.orders)[0];
    const delayEvent = {
      id: 'ev-test-delay',
      type: 'OrderDelayed' as const,
      at: order.pickedUpAt + 5000,
      actor: 'operator:AIM',
      payload: { orderId: order.id, delayMin: 15, reason: 'Traffic jam on Ring Road' },
    };

    const excursionEvent = {
      id: 'ev-test-excursion',
      type: 'ColdChainExcursion' as const,
      at: order.pickedUpAt + 6000,
      actor: 'SYSTEM',
      payload: { orderId: order.id, tempC: 24.6, excursionMin: 6 },
    };

    const foldedWorld = fold(seed, [delayEvent, excursionEvent], order.pickedUpAt + 7000);
    const updatedOrder = foldedWorld.orders[order.id];

    // Exception flags are set
    expect(updatedOrder.delayed).toBe(true);
    expect(updatedOrder.delayMin).toBe(15);
    expect(updatedOrder.alert).toBe(true);
    expect(updatedOrder.coldChain.tempC).toBe(24.6);

    // The order lifecycle stage is STILL in_transit (does not crash or collapse to cancelled)
    expect(updatedOrder.status).toBe('in_transit');
  });

  it('OrderReceived creates lots at destination hospital preserving ORIGINAL expiresAt', () => {
    const seed = createSeedData(1000);
    const order = Object.values(seed.orders)[0];
    const originalExpiry = order.allocations[0].expiresAt;
    const originalUnits = order.allocations[0].units;

    const receiveEvent = {
      id: 'ev-test-receive',
      type: 'OrderReceived' as const,
      at: order.deliveredAt + 2000,
      actor: `operator:${order.to}`,
      payload: {
        orderId: order.id,
        unitsReceived: order.units,
        verificationChecklist: { sealOk: true, tempOk: true, labelsMatch: true },
      },
    };

    const foldedWorld = fold(seed, [receiveEvent], order.deliveredAt + 3000);
    const updatedOrder = foldedWorld.orders[order.id];

    // Order status is received
    expect(updatedOrder.status).toBe('received');
    expect(updatedOrder.receivedAt).toBe(order.deliveredAt + 2000);

    // Newly created lot at destination hospital
    const newLot = Object.values(foldedWorld.lots).find(
      (l) => l.hospital === order.to && l.lotId.includes(order.id)
    );

    expect(newLot).toBeDefined();
    expect(newLot?.units).toBe(originalUnits);
    // Crucial check: MUST match the original expiration timestamp, NOT a newly generated +120h timestamp!
    expect(newLot?.expiresAt).toBe(originalExpiry);
    expect(newLot?.origin).toBe('transfer');
  });
});

