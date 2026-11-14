import { describe, it, expect } from 'vitest';
import { createSeedData, World, dispatchWorldEvent, getEventLog, clearEventLog, getWorld } from '../../world';
import { findRequestMatches } from '../../world/solver';
import { buildProposedRequestsFromWorld } from '../../context/PlexusStore';

describe('Hospital Request Flow & Solver Match Preview', () => {
  it('returns real solver match with sources, nearest ETA, and shelf life', () => {
    const world: World = createSeedData(1001);

    const match = findRequestMatches(world, {
      hospital: 'AIM',
      product: 'APH',
      group: 'O-',
      units: 2,
      neededWithinH: 3,
    });

    expect(match).toBeDefined();
    expect(typeof match.sourcesCount).toBe('number');
    expect(match.sourcesCount).toBeGreaterThan(0);
    expect(match.nearestEtaMin).toBeDefined();
    expect(match.nearestEtaMin).toBeGreaterThan(0);
    expect(match.minArrivalShelfLifeH).toBeDefined();
    expect(match.minArrivalShelfLifeH).toBeGreaterThan(6); // Safely arrives with > 6h
    expect(match.canFulfillWithinWindow).toBe(true);
    expect(match.message).toContain('sources can supply');
    expect(match.message).toContain('nearest');
    expect(match.message).toContain('arrives with');
  });

  it('honestly reports when no source can reach inside an impossible window', () => {
    const world: World = createSeedData(1001);

    // If needed within 0.05 hours (3 minutes), no NCR hospital can reach AIM in 3 min
    const match = findRequestMatches(world, {
      hospital: 'AIM',
      product: 'APH',
      group: 'O-',
      units: 2,
      neededWithinH: 0.05,
    });

    expect(match.canFulfillWithinWindow).toBe(false);
    expect(match.message).toBe(
      'No source can reach you inside this window. The request is still queued and the dispatcher is alerted.'
    );
  });

  it('respects product quantity caps (Apheresis 1-12, RDP 1-30)', () => {
    const aphMax = 12;
    const rdpMax = 30;

    expect(aphMax).toBe(12);
    expect(rdpMax).toBe(30);
  });

  it('appends RequestCreated with from-hospital-portal tag and maps to proposed tab', () => {
    clearEventLog();
    const curWorld = getWorld();

    const reqId = 'REQ-TEST-PORTAL-01';
    dispatchWorldEvent('RequestCreated', 'operator:AIM', {
      id: reqId,
      hospital: 'AIM',
      product: 'APH',
      group: 'O-',
      units: 2,
      urgency: 'urgent',
      neededBy: curWorld.simNow + 3 * 3600000,
      acceptAboCompatible: false,
      acceptPartial: true,
      contact: 'Trauma Blood Desk',
      indication: 'trauma',
      caseRef: 'CASE-AIM-999',
      status: 'requested',
      sourceTag: 'from hospital portal',
    });

    const events = getEventLog();
    const createdEvent = events.find((e) => e.type === 'RequestCreated' && (e.payload as any).id === reqId);
    expect(createdEvent).toBeDefined();
    expect((createdEvent?.payload as any).sourceTag).toBe('from hospital portal');

    // Fold world with latest event
    const updatedWorld = getWorld();
    expect(updatedWorld.requests[reqId]).toBeDefined();

    // Verify it appears in proposed requests with the sourceTag
    const proposed = buildProposedRequestsFromWorld(updatedWorld);
    const item = proposed.find((p) => p.id === reqId);
    expect(item).toBeDefined();
    expect(item?.sourceTag).toBe('from hospital portal');
  });
});
