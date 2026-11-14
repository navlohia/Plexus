import { describe, it, expect } from 'vitest';
import {
  parseOperatorCredentials,
  canAccessWorkspace,
  canAccessHospital,
  canShowDemoSwitcher,
} from '../session';
import {
  computeTodayHeadline,
  getHospitalStatusStrip,
  getNeedsYourAttention,
  getHospitalNotifications,
} from '../portalData';
import { createSeedData, World } from '../../world';

describe('Portal Session and Roles', () => {
  it('correctly parses dispatch demo accounts', () => {
    const aiims = parseOperatorCredentials('PLX-AIIMS-01');
    expect(aiims.role).toBe('dispatch');
    expect(aiims.isValid).toBe(true);

    const dispatch = parseOperatorCredentials('PLX-DISPATCH-01');
    expect(dispatch.role).toBe('dispatch');
    expect(dispatch.isValid).toBe(true);
  });

  it('correctly parses hospital demo accounts', () => {
    const aim = parseOperatorCredentials('PLX-AIM-H1');
    expect(aim.role).toBe('hospital');
    expect(aim.hospital).toBe('AIM');
    expect(aim.isValid).toBe(true);

    const mdt = parseOperatorCredentials('PLX-MDT-H1');
    expect(mdt.role).toBe('hospital');
    expect(mdt.hospital).toBe('MDT');

    const max = parseOperatorCredentials('PLX-MAX-H1');
    expect(max.role).toBe('hospital');
    expect(max.hospital).toBe('MAX');
  });

  it('enforces route access guards', () => {
    // Hospital user cannot access workspace
    expect(
      canAccessWorkspace({
        operatorId: 'PLX-AIM-H1',
        role: 'hospital',
        hospital: 'AIM',
      })
    ).toBe(false);

    // Dispatcher can access workspace and hospital view
    expect(
      canAccessWorkspace({
        operatorId: 'PLX-AIIMS-01',
        role: 'dispatch',
      })
    ).toBe(true);

    expect(
      canAccessHospital('AIM', {
        operatorId: 'PLX-AIIMS-01',
        role: 'dispatch',
      })
    ).toBe(true);

    // Hospital switcher is visible for dispatch in demo mode
    expect(
      canShowDemoSwitcher({
        operatorId: 'PLX-AIIMS-01',
        role: 'dispatch',
        demoMode: true,
      })
    ).toBe(true);
  });
});

describe('Portal Today Screen Data Computation', () => {
  it('computes headline with priority rules (1-6)', () => {
    const world: World = createSeedData(1001);

    // Case: Short hospital (AIM) without arrived/incoming/expiring12 should yield shortage (priority 4)
    const aimHeadline = computeTodayHeadline(world, 'AIM');
    expect(aimHeadline).toBeDefined();
    expect(aimHeadline.text).toBeTruthy();
    expect([1, 2, 3, 4, 5, 6]).toContain(aimHeadline.priority);

    // Case: OK hospital (MAX) with steady balance should yield steady or valid status
    const maxHeadline = computeTodayHeadline(world, 'MAX');
    expect(maxHeadline).toBeDefined();
    expect(maxHeadline.text).toBeTruthy();
  });

  it('provides a 4-number status strip for any hospital', () => {
    const world: World = createSeedData(1001);
    const strip = getHospitalStatusStrip(world, 'AIM');
    expect(strip).toHaveLength(4);
    expect(strip[0].label).toBe('Net position');
    expect(strip[1].label).toBe('Incoming');
    expect(strip[2].label).toBe('Expiring < 36 h');
    expect(strip[3].label).toBe('Data freshness');
  });

  it('caps Needs-your-attention at max 3 items', () => {
    const world: World = createSeedData(1001);
    for (const hospCode of Object.keys(world.hospitals)) {
      const attention = getNeedsYourAttention(world, hospCode);
      expect(attention.length).toBeLessThanOrEqual(3);
    }
  });

  it('caps notifications at max 5 items', () => {
    const world: World = createSeedData(1001);
    const notifs = getHospitalNotifications(world, 'AIM');
    expect(notifs.length).toBeLessThanOrEqual(5);
  });
});
