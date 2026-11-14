import React, { useState, useEffect } from 'react';
import { World, BloodGroup as BloodGroupType, PlateletProduct, Lot } from '../world/types';
import { getSession } from './session';
import { dispatchWorldEvent, getEventLog } from '../world';
import {
  LEDGER_TOKENS,
  Sheet,
  TextTabs,
  BloodGroup,
  Button,
} from '../ui/ledger';
import { Minus, Plus } from 'lucide-react';

interface UpdateStockDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  world: World;
  hospitalCode: string;
  initialTab?: 'adjust' | 'receive' | 'count' | 'audit';
  onShowToast?: (message: string, undoEventId?: string) => void;
  onTriggerUndo?: (action: { eventId: string; description: string; expiresAt: number }) => void;
}

const BLOOD_GROUPS: BloodGroupType[] = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

const ADJUST_REASONS = [
  'Received (donation)',
  'Issued to patient',
  'Sent to another hospital',
  'Expired or discarded',
  'Damaged or QC fail',
  'Recount correction',
] as const;

export const UpdateStockDrawer: React.FC<UpdateStockDrawerProps> = ({
  isOpen,
  onClose,
  world,
  hospitalCode,
  initialTab = 'adjust',
  onShowToast,
  onTriggerUndo,
}) => {
  const session = getSession();
  const operatorRole = session.role === 'hospital' ? 'In-charge' : 'Dispatcher';

  const [activeTab, setActiveTab] = useState<'adjust' | 'receive' | 'count' | 'audit'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Current lots at this hospital
  const hospLots = Object.values(world.lots).filter((l) => l.hospital === hospitalCode);

  const getGroupUnitsOnHand = (g: BloodGroupType, p: PlateletProduct) => {
    return hospLots
      .filter((l) => l.group === g && l.product === p)
      .reduce((sum, l) => sum + l.units, 0);
  };

  // ---------------------------------------------------------------------------
  // Tab 1: Adjust State (Batch adjust per Section 9)
  // ---------------------------------------------------------------------------
  const [adjustProduct, setAdjustProduct] = useState<PlateletProduct>('APH');
  const [adjustDeltas, setAdjustDeltas] = useState<Record<BloodGroupType, number>>(() => ({
    'O-': 0,
    'O+': 0,
    'A-': 0,
    'A+': 0,
    'B-': 0,
    'B+': 0,
    'AB-': 0,
    'AB+': 0,
  }));
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const handleAdjustStep = (group: BloodGroupType, increment: number) => {
    const currentOnHand = getGroupUnitsOnHand(group, adjustProduct);
    const currentDelta = adjustDeltas[group] || 0;
    const newDelta = currentDelta + increment;

    // Prevent negative stock: cannot reduce more than on hand
    if (newDelta < -currentOnHand) {
      setAdjustError(`Cannot discard more than ${currentOnHand}u on hand for ${group}`);
      return;
    }
    setAdjustError(null);
    setAdjustDeltas((prev) => ({ ...prev, [group]: newDelta }));
  };

  const changedGroups = BLOOD_GROUPS.filter((g) => adjustDeltas[g] !== 0);
  const totalChangedCount = changedGroups.length;

  const handleSaveAdjustBatch = () => {
    if (!adjustReason || totalChangedCount === 0) return;

    const eventId = `batch-adj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const changesSummary: string[] = [];

    changedGroups.forEach((g) => {
      const delta = adjustDeltas[g];
      const before = getGroupUnitsOnHand(g, adjustProduct);
      const after = Math.max(0, before + delta);

      dispatchWorldEvent(
        'StockAdjusted',
        `operator:${hospitalCode}`,
        {
          hospital: hospitalCode,
          group: g,
          product: adjustProduct,
          deltaUnits: delta,
          reason: adjustReason,
          before,
          after,
        },
        `${eventId}-${g}`
      );

      const sign = delta > 0 ? `+${delta}u` : `${delta}u`;
      changesSummary.push(`${sign} ${g}`);
    });

    const desc = `Stock adjusted: ${changesSummary.join(', ')} · ${adjustReason}`;

    if (onTriggerUndo) {
      onTriggerUndo({
        eventId,
        description: desc,
        expiresAt: Date.now() + 8000,
      });
    }

    if (onShowToast) {
      onShowToast(desc, eventId);
    }

    // Reset deltas and close
    setAdjustDeltas({
      'O-': 0,
      'O+': 0,
      'A-': 0,
      'A+': 0,
      'B-': 0,
      'B+': 0,
      'AB-': 0,
      'AB+': 0,
    });
    setAdjustReason('');
    onClose();
  };

  // ---------------------------------------------------------------------------
  // Tab 2: Receive Units State
  // ---------------------------------------------------------------------------
  const [receiveProduct, setReceiveProduct] = useState<PlateletProduct>('APH');
  const [receiveGroup, setReceiveGroup] = useState<BloodGroupType>('O+');
  const [receiveUnits, setReceiveUnits] = useState<number>(2);
  const [shelfLifeHours, setShelfLifeHours] = useState<number>(120);
  const [receiveSource, setReceiveSource] = useState<string>('In-house Blood Camp');

  const handleReceiveSubmit = () => {
    const lotId = `LOT-${hospitalCode}-${receiveGroup}-${Date.now().toString(36).toUpperCase().substring(2, 8)}`;
    const expiresAt = world.simNow + shelfLifeHours * 3600000;

    const newLot: Lot = {
      lotId,
      hospital: hospitalCode,
      product: receiveProduct,
      group: receiveGroup,
      units: receiveUnits,
      collectedAt: world.simNow,
      expiresAt,
      origin: 'donation',
    };

    const eventId = `lotrec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    dispatchWorldEvent('LotReceived', `operator:${hospitalCode}`, newLot, eventId);

    const currentOnHand = getGroupUnitsOnHand(receiveGroup, receiveProduct);
    dispatchWorldEvent(
      'StockAdjusted',
      `operator:${hospitalCode}`,
      {
        hospital: hospitalCode,
        group: receiveGroup,
        product: receiveProduct,
        deltaUnits: receiveUnits,
        lotId,
        reason: 'Received (donation)',
        before: currentOnHand,
        after: currentOnHand + receiveUnits,
      },
      `${eventId}-adj`
    );

    const desc = `Received ${receiveUnits}u ${receiveGroup} ${receiveProduct === 'APH' ? 'Apheresis (SDP)' : 'RDP'}`;

    if (onTriggerUndo) {
      onTriggerUndo({
        eventId,
        description: desc,
        expiresAt: Date.now() + 8000,
      });
    }

    if (onShowToast) {
      onShowToast(desc, eventId);
    }

    onClose();
  };

  // ---------------------------------------------------------------------------
  // Tab 3: Count State (Physical count)
  // ---------------------------------------------------------------------------
  const [countProduct, setCountProduct] = useState<PlateletProduct>('APH');
  const [physicalCounts, setPhysicalCounts] = useState<Record<BloodGroupType, number>>(() => {
    const init: Record<BloodGroupType, number> = {} as any;
    BLOOD_GROUPS.forEach((g) => {
      init[g] = getGroupUnitsOnHand(g, 'APH');
    });
    return init;
  });

  // Re-sync physical count inputs when switching product
  useEffect(() => {
    const updated: Record<BloodGroupType, number> = {} as any;
    BLOOD_GROUPS.forEach((g) => {
      updated[g] = getGroupUnitsOnHand(g, countProduct);
    });
    setPhysicalCounts(updated);
  }, [countProduct, world.lots]);

  const handlePhysicalCountChange = (group: BloodGroupType, val: number) => {
    setPhysicalCounts((prev) => ({ ...prev, [group]: Math.max(0, val) }));
  };

  const handleCountSubmit = () => {
    const eventId = `count-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    let adjustedCount = 0;

    BLOOD_GROUPS.forEach((g) => {
      const current = getGroupUnitsOnHand(g, countProduct);
      const counted = physicalCounts[g] ?? current;
      const diff = counted - current;

      if (diff !== 0) {
        adjustedCount++;
        dispatchWorldEvent(
          'StockAdjusted',
          `operator:${hospitalCode}`,
          {
            hospital: hospitalCode,
            group: g,
            product: countProduct,
            deltaUnits: diff,
            reason: 'Recount correction',
            before: current,
            after: counted,
          },
          `${eventId}-${g}`
        );
      }
    });

    const desc = `Physical count saved · ${adjustedCount} adjustments recorded`;

    if (onTriggerUndo) {
      onTriggerUndo({
        eventId,
        description: desc,
        expiresAt: Date.now() + 8000,
      });
    }

    if (onShowToast) {
      onShowToast(desc, eventId);
    }

    onClose();
  };

  // ---------------------------------------------------------------------------
  // Tab 4: Audit / History Filter
  // ---------------------------------------------------------------------------
  const [auditReasonFilter, setAuditReasonFilter] = useState<string>('all');
  const eventLog = getEventLog();
  const hospitalAdjustments = eventLog
    .filter((e) => e.type === 'StockAdjusted' && (e.payload?.hospital === hospitalCode || e.actor?.includes(hospitalCode)))
    .filter((e) => {
      if (auditReasonFilter === 'all') return true;
      return e.payload?.reason === auditReasonFilter;
    })
    .sort((a, b) => b.at - a.at);

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Update stock"
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Navigation Tabs per Section 9 */}
        <div style={{ marginBottom: '20px' }}>
          <TextTabs
            tabs={[
              { id: 'adjust', label: 'Adjust' },
              { id: 'receive', label: 'Receive' },
              { id: 'count', label: 'Count' },
              { id: 'audit', label: 'History' },
            ]}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as any)}
          />
        </div>

        {/* ================================================================= */}
        {/* TAB 1: ADJUST                                                     */}
        {/* ================================================================= */}
        {activeTab === 'adjust' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '104px' }}>
            {/* Product Segmented Toggle */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`, paddingBottom: '12px' }}>
              <button
                type="button"
                onClick={() => setAdjustProduct('APH')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: adjustProduct === 'APH' ? 600 : 400,
                  color: adjustProduct === 'APH' ? LEDGER_TOKENS.ink : LEDGER_TOKENS.ink3,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
              >
                Apheresis (SDP)
              </button>
              <button
                type="button"
                onClick={() => setAdjustProduct('RDP')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: adjustProduct === 'RDP' ? 600 : 400,
                  color: adjustProduct === 'RDP' ? LEDGER_TOKENS.ink : LEDGER_TOKENS.ink3,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
              >
                RDP (random donor)
              </button>
            </div>

            {/* Stepper Rows per group */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {BLOOD_GROUPS.map((g) => {
                const onHand = getGroupUnitsOnHand(g, adjustProduct);
                const delta = adjustDeltas[g] || 0;

                return (
                  <div
                    key={g}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      height: '44px',
                      borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <BloodGroup group={g} size={15} />
                      <span style={{ fontSize: '13px', color: LEDGER_TOKENS.ink3, fontVariantNumeric: 'tabular-nums' }}>
                        {onHand}u on hand
                      </span>
                    </div>

                    {/* Compact stepper controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        aria-label={`Decrease ${g}`}
                        onClick={() => handleAdjustStep(g, -1)}
                        disabled={delta <= -onHand}
                        style={{
                          width: '28px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          border: `1px solid ${LEDGER_TOKENS.hairlineStrong}`,
                          background: 'transparent',
                          color: delta <= -onHand ? LEDGER_TOKENS.ink4 : LEDGER_TOKENS.ink,
                          cursor: delta <= -onHand ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <Minus size={13} />
                      </button>

                      <span
                        style={{
                          width: '32px',
                          textAlign: 'center',
                          fontSize: '14px',
                          fontWeight: delta !== 0 ? 600 : 400,
                          color: delta > 0 ? LEDGER_TOKENS.good : delta < 0 ? LEDGER_TOKENS.bad : LEDGER_TOKENS.ink3,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '0'}
                      </span>

                      <button
                        type="button"
                        aria-label={`Increase ${g}`}
                        onClick={() => handleAdjustStep(g, 1)}
                        style={{
                          width: '28px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          border: `1px solid ${LEDGER_TOKENS.hairlineStrong}`,
                          background: 'transparent',
                          color: LEDGER_TOKENS.ink,
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Error banner if negative stock attempted */}
            {adjustError && (
              <div style={{ fontSize: '12px', color: LEDGER_TOKENS.bad, marginTop: '4px' }}>
                {adjustError}
              </div>
            )}

            {/* ONE Reason Selector for the batch per Section 9 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink2 }}>
                Reason for adjustment (required)
              </label>
              <select
                data-testid="adjust-reason-select"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                style={{
                  height: '40px',
                  borderRadius: LEDGER_TOKENS.radius.md,
                  border: `1px solid ${LEDGER_TOKENS.hairlineStrong}`,
                  background: LEDGER_TOKENS.canvas,
                  color: LEDGER_TOKENS.ink,
                  fontSize: '13px',
                  padding: '0 12px',
                  outline: 'none',
                  cursor: 'pointer',
                  fontFamily: LEDGER_TOKENS.fontUi,
                }}
              >
                <option value="">Select a canonical reason...</option>
                {ADJUST_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Sticky Footer: "Save N changes" per Section 9 */}
            <div
              style={{
                position: 'fixed',
                bottom: 0,
                right: 0,
                width: '440px',
                maxWidth: '100vw',
                height: '72px',
                background: LEDGER_TOKENS.canvas,
                borderTop: `1px solid ${LEDGER_TOKENS.hairline}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 24px',
                zIndex: 10,
                boxSizing: 'border-box',
              }}
            >
              <span style={{ fontSize: '13px', color: LEDGER_TOKENS.ink3 }}>
                {totalChangedCount > 0 ? `${totalChangedCount} group${totalChangedCount === 1 ? '' : 's'} altered` : 'No changes'}
              </span>

              <Button
                variant="primary"
                data-testid="save-stock-adjustments-btn"
                disabled={totalChangedCount === 0 || !adjustReason}
                onClick={handleSaveAdjustBatch}
              >
                {totalChangedCount > 0
                  ? `Save ${totalChangedCount} change${totalChangedCount === 1 ? '' : 's'}`
                  : 'Save changes'}
              </Button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: RECEIVE                                                    */}
        {/* ================================================================= */}
        {activeTab === 'receive' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '104px' }}>
            {/* Product Toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink2 }}>Product</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {(['APH', 'RDP'] as const).map((p) => {
                  const isSel = receiveProduct === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setReceiveProduct(p)}
                      style={{
                        flex: 1,
                        height: '40px',
                        borderRadius: LEDGER_TOKENS.radius.md,
                        border: isSel ? `1.5px solid ${LEDGER_TOKENS.ink}` : `1px solid ${LEDGER_TOKENS.hairlineStrong}`,
                        background: isSel ? LEDGER_TOKENS.surface : 'transparent',
                        fontSize: '13px',
                        fontWeight: isSel ? 600 : 400,
                        color: LEDGER_TOKENS.ink,
                        cursor: 'pointer',
                        fontFamily: LEDGER_TOKENS.fontUi,
                      }}
                    >
                      {p === 'APH' ? 'Apheresis (SDP)' : 'RDP (random donor)'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Blood Group 4x2 Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink2 }}>Blood group</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {BLOOD_GROUPS.map((g) => {
                  const isSel = receiveGroup === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setReceiveGroup(g)}
                      style={{
                        height: '44px',
                        borderRadius: LEDGER_TOKENS.radius.md,
                        border: isSel ? `1.5px solid ${LEDGER_TOKENS.ink}` : `1px solid ${LEDGER_TOKENS.hairlineStrong}`,
                        background: isSel ? LEDGER_TOKENS.surface : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <BloodGroup group={g} size={15} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Units Stepper */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink2 }}>Units received</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setReceiveUnits((u) => Math.max(1, u - 1))}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '4px',
                    border: `1px solid ${LEDGER_TOKENS.hairlineStrong}`,
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <Minus size={15} />
                </button>
                <span style={{ fontSize: '18px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', width: '40px', textAlign: 'center' }}>
                  {receiveUnits}
                </span>
                <button
                  type="button"
                  onClick={() => setReceiveUnits((u) => Math.min(30, u + 1))}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '4px',
                    border: `1px solid ${LEDGER_TOKENS.hairlineStrong}`,
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>

            {/* Shelf-life Presets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink2 }}>Shelf-life on arrival</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { h: 120, label: 'Fresh (120 h)' },
                  { h: 96, label: '4 days (96 h)' },
                  { h: 72, label: '3 days (72 h)' },
                ].map(({ h, label }) => {
                  const isSel = shelfLifeHours === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setShelfLifeHours(h)}
                      style={{
                        flex: 1,
                        height: '36px',
                        borderRadius: LEDGER_TOKENS.radius.md,
                        border: isSel ? `1.5px solid ${LEDGER_TOKENS.ink}` : `1px solid ${LEDGER_TOKENS.hairlineStrong}`,
                        background: isSel ? LEDGER_TOKENS.surface : 'transparent',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontFamily: LEDGER_TOKENS.fontUi,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Source */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink2 }}>Source</label>
              <input
                type="text"
                value={receiveSource}
                onChange={(e) => setReceiveSource(e.target.value)}
                style={{
                  height: '40px',
                  borderRadius: LEDGER_TOKENS.radius.md,
                  border: `1px solid ${LEDGER_TOKENS.hairlineStrong}`,
                  background: LEDGER_TOKENS.canvas,
                  color: LEDGER_TOKENS.ink,
                  fontSize: '13px',
                  padding: '0 12px',
                  fontFamily: LEDGER_TOKENS.fontUi,
                }}
              />
            </div>

            {/* Sticky Footer */}
            <div
              style={{
                position: 'fixed',
                bottom: 0,
                right: 0,
                width: '440px',
                maxWidth: '100vw',
                height: '72px',
                background: LEDGER_TOKENS.canvas,
                borderTop: `1px solid ${LEDGER_TOKENS.hairline}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '0 24px',
                zIndex: 10,
                boxSizing: 'border-box',
              }}
            >
              <Button variant="primary" onClick={handleReceiveSubmit}>
                Register consignment
              </Button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: COUNT (System vs counted with variance in text)           */}
        {/* ================================================================= */}
        {activeTab === 'count' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '104px' }}>
            {/* Product Segmented Toggle */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`, paddingBottom: '12px' }}>
              <button
                type="button"
                onClick={() => setCountProduct('APH')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: countProduct === 'APH' ? 600 : 400,
                  color: countProduct === 'APH' ? LEDGER_TOKENS.ink : LEDGER_TOKENS.ink3,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
              >
                Apheresis (SDP)
              </button>
              <button
                type="button"
                onClick={() => setCountProduct('RDP')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: countProduct === 'RDP' ? 600 : 400,
                  color: countProduct === 'RDP' ? LEDGER_TOKENS.ink : LEDGER_TOKENS.ink3,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
              >
                RDP (random donor)
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`, paddingBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: LEDGER_TOKENS.ink3 }}>Group</span>
              <span style={{ fontSize: '12px', color: LEDGER_TOKENS.ink3 }}>System · Counted · Variance</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {BLOOD_GROUPS.map((g) => {
                const sysCount = getGroupUnitsOnHand(g, countProduct);
                const physCount = physicalCounts[g] ?? sysCount;
                const variance = physCount - sysCount;

                return (
                  <div
                    key={g}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      height: '44px',
                      borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`,
                    }}
                  >
                    <BloodGroup group={g} size={15} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '13px', color: LEDGER_TOKENS.ink3, fontVariantNumeric: 'tabular-nums' }}>
                        {sysCount}u sys
                      </span>

                      {/* Stepper for counted */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handlePhysicalCountChange(g, physCount - 1)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '3px',
                            border: `1px solid ${LEDGER_TOKENS.hairlineStrong}`,
                            background: 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <Minus size={11} />
                        </button>
                        <span style={{ width: '28px', textAlign: 'center', fontSize: '13px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {physCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePhysicalCountChange(g, physCount + 1)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '3px',
                            border: `1px solid ${LEDGER_TOKENS.hairlineStrong}`,
                            background: 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <Plus size={11} />
                        </button>
                      </div>

                      {/* Variance in text per Section 9 */}
                      <span
                        style={{
                          width: '40px',
                          textAlign: 'right',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: variance > 0 ? LEDGER_TOKENS.good : variance < 0 ? LEDGER_TOKENS.bad : LEDGER_TOKENS.ink3,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {variance > 0 ? `+${variance}u` : variance < 0 ? `${variance}u` : '0u'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sticky Footer */}
            <div
              style={{
                position: 'fixed',
                bottom: 0,
                right: 0,
                width: '440px',
                maxWidth: '100vw',
                height: '72px',
                background: LEDGER_TOKENS.canvas,
                borderTop: `1px solid ${LEDGER_TOKENS.hairline}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '0 24px',
                zIndex: 10,
                boxSizing: 'border-box',
              }}
            >
              <Button variant="primary" onClick={handleCountSubmit}>
                Commit physical count
              </Button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: AUDIT / HISTORY                                            */}
        {/* ================================================================= */}
        {activeTab === 'audit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Filter by Reason */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink2 }}>Filter reason:</span>
              <select
                value={auditReasonFilter}
                onChange={(e) => setAuditReasonFilter(e.target.value)}
                style={{
                  height: '32px',
                  borderRadius: LEDGER_TOKENS.radius.sm,
                  border: `1px solid ${LEDGER_TOKENS.hairlineStrong}`,
                  background: LEDGER_TOKENS.canvas,
                  fontSize: '12px',
                  padding: '0 8px',
                }}
              >
                <option value="all">All reasons</option>
                {ADJUST_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* History rows: who, when, why, before → after */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {hospitalAdjustments.length === 0 ? (
                <div style={{ padding: '24px 0', fontSize: '13px', color: LEDGER_TOKENS.ink3, textAlign: 'center' }}>
                  No adjustment audit records found.
                </div>
              ) : (
                hospitalAdjustments.map((evt) => {
                  const d = new Date(evt.at);
                  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                  const p = evt.payload;
                  const deltaStr = p.deltaUnits > 0 ? `+${p.deltaUnits}u` : `${p.deltaUnits}u`;

                  return (
                    <div
                      key={evt.id}
                      style={{
                        padding: '10px 0',
                        borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: LEDGER_TOKENS.ink }}>
                          {p.reason || 'Manual adjustment'}
                        </span>
                        <span style={{ fontSize: '12px', color: LEDGER_TOKENS.ink3, fontFamily: LEDGER_TOKENS.fontMono }}>
                          {hm}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '12px', color: LEDGER_TOKENS.ink2 }}>
                        <span>
                          {p.group} · {p.before ?? 0}u → {p.after ?? 0}u ({deltaStr})
                        </span>
                        <span style={{ fontFamily: LEDGER_TOKENS.fontMono, fontSize: '11px', color: LEDGER_TOKENS.ink3 }}>
                          {evt.actor || operatorRole}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
};
