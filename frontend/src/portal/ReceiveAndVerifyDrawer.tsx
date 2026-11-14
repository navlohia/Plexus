import React, { useState, useEffect, useRef } from 'react';
import { DispatchOrder, PlateletRequest } from '../world/types';
import { dispatchWorldEvent } from '../world';
import { getHospitalName } from './portalData';
import { LEDGER_TOKENS } from '../ui/ledger';
import { Check, X, AlertTriangle } from 'lucide-react';

interface ReceiveAndVerifyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  order: DispatchOrder;
  request?: PlateletRequest;
  hospitalCode: string;
  onSuccess: (orderId: string, unitsReceived: number, outcome: 'all' | 'issues' | 'rejected') => void;
}

export const ReceiveAndVerifyDrawer: React.FC<ReceiveAndVerifyDrawerProps> = ({
  isOpen,
  onClose,
  order,
  request: _request,
  hospitalCode,
  onSuccess,
}) => {
  // Focus return & Keyboard navigation (Escape key per Section 11 & QA)
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousActiveElement.current = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const fromHospName = getHospitalName(order.from);
  const [unitsReceived, setUnitsReceived] = useState<number>(order.units);
  const [mismatchReason, setMismatchReason] = useState<string>('Damaged / leaking container in transit');
  const [customMismatchNote, setCustomMismatchNote] = useState<string>('');

  // Checklist states
  const [sealIntact, setSealIntact] = useState<boolean>(true);
  const [tempVerified, setTempVerified] = useState<boolean>(!order.alert);
  const [labelsMatch, setLabelsMatch] = useState<boolean>(true);

  // Issues note
  const [issueNote, setIssueNote] = useState<string>('');

  const hasMismatch = unitsReceived !== order.units;
  const hasIssues = hasMismatch || !sealIntact || !tempVerified || !labelsMatch || Boolean(issueNote.trim());

  // Cold chain data
  const tempC = order.coldChain?.tempC ?? 22.4;
  const minTempC = order.coldChain?.minTempC ?? 21.8;
  const maxTempC = order.coldChain?.maxTempC ?? 22.9;
  const excursionMin = order.coldChain?.excursionMin ?? 0;

  const handleConfirm = (outcome: 'all' | 'issues' | 'rejected') => {
    let effectiveIssues = '';
    if (outcome === 'rejected') {
      effectiveIssues = `Rejected by ${hospitalCode}: ${
        !sealIntact
          ? 'Broken security seal'
          : !tempVerified
          ? `Temperature excursion (${tempC} °C)`
          : hasMismatch
          ? `Quantity mismatch (${unitsReceived} received vs ${order.units} shipped)`
          : 'Failed receiving inspection'
      }`;
    } else if (outcome === 'issues' || hasIssues) {
      const parts = [];
      if (hasMismatch) parts.push(`Count: ${unitsReceived}/${order.units}u (${mismatchReason}${customMismatchNote ? ` - ${customMismatchNote}` : ''})`);
      if (!sealIntact) parts.push('Damaged seal');
      if (!tempVerified) parts.push(`Temp excursion ${tempC} °C`);
      if (!labelsMatch) parts.push('Label verification flag');
      if (issueNote.trim()) parts.push(issueNote.trim());
      effectiveIssues = parts.join('; ');
    }

    if (outcome !== 'rejected') {
      // Dispatches OrderReceived: Creates lots with ORIGINAL expiry in world reducer
      dispatchWorldEvent('OrderReceived', `operator:${hospitalCode}`, {
        orderId: order.id,
        unitsReceived,
        issues: effectiveIssues || undefined,
        verificationChecklist: {
          sealOk: sealIntact,
          tempOk: tempVerified,
          labelsMatch,
        },
      });
    } else {
      // In case of full rejection, log quality issue to dispatch
      dispatchWorldEvent('ColdChainExcursion', `operator:${hospitalCode}`, {
        orderId: order.id,
        tempC,
        excursionMin: excursionMin || 15,
        reason: effectiveIssues,
      });
    }

    onSuccess(order.id, outcome === 'rejected' ? 0 : unitsReceived, outcome);
    onClose();
  };

  return (
    <div
      data-testid="receive-verify-drawer"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(20, 23, 28, 0.3)',
      }}
      onClick={onClose}
    >
      <div
        data-testid="receive-verify-drawer-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '520px',
          maxWidth: '100vw',
          height: '100vh',
          background: LEDGER_TOKENS.canvas,
          color: LEDGER_TOKENS.ink,
          boxShadow: LEDGER_TOKENS.shadow.sheet,
          borderLeft: `1px solid ${LEDGER_TOKENS.hairline}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: LEDGER_TOKENS.fontUi,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(20, 27, 45, 0.10)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FFFFFF',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: '#DCFCE7',
                  color: '#166534',
                }}
              >
                Inbound Verification
              </span>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: '15px' }}>
                #{order.id}
              </span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '6px 0 2px 0' }}>
              Receive & Verify Platelets
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(20, 27, 45, 0.65)' }}>
              Source: {fromHospName} ({order.from}) • Courier: {order.courier || 'Plexus Courier'}
            </p>
          </div>

          <button
            data-testid="close-receive-drawer-btn"
            onClick={onClose}
            aria-label="Close receive drawer"
            style={{
              minWidth: '44px',
              minHeight: '44px',
              background: 'none',
              border: 'none',
              fontSize: '22px',
              cursor: 'pointer',
              color: 'rgba(20, 27, 45, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '22px',
          }}
        >
          {/* Section 1: Units Shipped vs Received */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid rgba(20, 27, 45, 0.10)',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(20, 27, 45, 0.55)', marginBottom: '10px' }}>
              1. Units Received Inspection
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>
                  {order.units}u {order.group} {order.product === 'APH' ? 'Apheresis' : 'RDP'} Shipped
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(20, 27, 45, 0.6)' }}>
                  Verify intact units ready for transfusion stock
                </div>
              </div>

              {/* Stepper */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  data-testid="decrement-units-received"
                  onClick={() => setUnitsReceived((u) => Math.max(0, u - 1))}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '6px',
                    border: '1px solid rgba(20, 27, 45, 0.2)',
                    background: '#FAF7F0',
                    fontSize: '18px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  −
                </button>
                <span
                  data-testid="units-received-display"
                  style={{
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: '18px',
                    fontWeight: 800,
                    minWidth: '36px',
                    textAlign: 'center',
                  }}
                >
                  {unitsReceived}
                </span>
                <button
                  type="button"
                  data-testid="increment-units-received"
                  onClick={() => setUnitsReceived((u) => Math.min(order.units + 4, u + 1))}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '6px',
                    border: '1px solid rgba(20, 27, 45, 0.2)',
                    background: '#FAF7F0',
                    fontSize: '18px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Mismatch Warning & Reason Input */}
            {hasMismatch && (
              <div
                data-testid="mismatch-reason-card"
                style={{
                  marginTop: '14px',
                  padding: '12px',
                  background: '#FEF3C7',
                  border: '1px solid #F59E0B',
                  borderRadius: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#92400E', marginBottom: '8px' }}>
                  <AlertTriangle size={15} />
                  <span>Mismatch Detected: {unitsReceived} received vs {order.units} shipped</span>
                </div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#78350F', marginBottom: '4px' }}>
                  Select discrepancy reason (Required by Section 3.4):
                </label>
                <select
                  data-testid="mismatch-reason-select"
                  value={mismatchReason}
                  onChange={(e) => setMismatchReason(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(20, 27, 45, 0.2)',
                    background: '#FFFFFF',
                    fontSize: '13px',
                    color: '#141B2D',
                    marginBottom: '8px',
                  }}
                >
                  <option value="Damaged / leaking container in transit">Damaged / leaking container in transit</option>
                  <option value="Short delivery / missing unit bag">Short delivery / missing unit bag</option>
                  <option value="Gross hemolysis or clumping observed">Gross hemolysis or clumping observed</option>
                  <option value="Incorrect blood group label on bag">Incorrect blood group label on bag</option>
                  <option value="Other discrepancy">Other discrepancy</option>
                </select>
                <input
                  type="text"
                  placeholder="Additional note (e.g. Courier noted crushed box upon delivery)..."
                  value={customMismatchNote}
                  onChange={(e) => setCustomMismatchNote(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(20, 27, 45, 0.2)',
                    fontSize: '12.5px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}
          </div>

          {/* Section 2: Quality & Custody Checklist */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid rgba(20, 27, 45, 0.10)',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(20, 27, 45, 0.55)', marginBottom: '12px' }}>
              2. Receiving Quality Checklist
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Check 1: Seal */}
              <label
                data-testid="checklist-seal"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '6px',
                  background: sealIntact ? 'transparent' : '#FEF2F2',
                }}
              >
                <input
                  type="checkbox"
                  checked={sealIntact}
                  onChange={(e) => setSealIntact(e.target.checked)}
                  style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: '#17805F', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600 }}>Security seal intact and undamaged</div>
                  <div style={{ fontSize: '12px', color: 'rgba(20, 27, 45, 0.6)' }}>
                    Tamper-evident transport lock verified intact upon courier handover.
                  </div>
                </div>
              </label>

              {/* Check 2: Temperature */}
              <label
                data-testid="checklist-temp"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '6px',
                  background: tempVerified ? 'transparent' : '#FEF2F2',
                }}
              >
                <input
                  type="checkbox"
                  checked={tempVerified}
                  onChange={(e) => setTempVerified(e.target.checked)}
                  style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: '#17805F', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600 }}>
                    Temperature within 20–24 °C validated
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(20, 27, 45, 0.65)', marginTop: '2px' }}>
                    Logged: <strong>{tempC} °C</strong> (Min {minTempC} °C · Max {maxTempC} °C) • Agitation continuous
                  </div>
                  {order.alert && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#B91C1C', fontWeight: 600, marginTop: '2px' }}>
                      <AlertTriangle size={13} />
                      <span>Sensor flagged {excursionMin || 6} min excursion during transport</span>
                    </div>
                  )}
                </div>
              </label>

              {/* Check 3: Labels */}
              <label
                data-testid="checklist-labels"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '6px',
                  background: labelsMatch ? 'transparent' : '#FEF2F2',
                }}
              >
                <input
                  type="checkbox"
                  checked={labelsMatch}
                  onChange={(e) => setLabelsMatch(e.target.checked)}
                  style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: '#17805F', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600 }}>
                    Bag barcode labels match requisition & ABO
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(20, 27, 45, 0.6)' }}>
                    Donation ID, ABO/RhD label, and volume correspond to patient order.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Section 3: Allocations & Original Expiry Ingestion Notice */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid rgba(20, 27, 45, 0.10)',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(20, 27, 45, 0.55)', marginBottom: '8px' }}>
              3. Lot Custody & Expiry Ingestion
            </div>
            <div style={{ fontSize: '12.5px', color: 'rgba(20, 27, 45, 0.7)', marginBottom: '10px' }}>
              Accepting will create stock lots at <strong>{hospitalCode}</strong> with their <strong>ORIGINAL</strong> expiration timestamp:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(order.allocations || []).map((alloc, idx) => {
                const expDate = new Date(alloc.expiresAt);
                const expStr = `${expDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${expDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                const hoursLeft = Math.max(0, Math.round((alloc.expiresAt - order.deliveredAt) / 3600000));
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: '#F4EEE3',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                    }}
                  >
                    <div>
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>
                        #{alloc.lotId}
                      </span>
                      <span style={{ color: 'rgba(20, 27, 45, 0.6)', marginLeft: '8px' }}>
                        {alloc.units}u {order.group}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, color: hoursLeft < 36 ? '#D97706' : '#141B2D' }}>
                      Expires {expStr} ({hoursLeft} h left)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Optional Quality Note */}
          <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid rgba(20, 27, 45, 0.10)', padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(20, 27, 45, 0.55)', marginBottom: '6px' }}>
              Quality / Clinical Receiving Note (Optional)
            </div>
            <textarea
              data-testid="receive-quality-note-input"
              rows={2}
              placeholder="Add verification note or clinical QA remarks..."
              value={issueNote}
              onChange={(e) => setIssueNote(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(20, 27, 45, 0.2)',
                fontSize: '13px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(20, 27, 45, 0.10)',
            background: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {hasIssues ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                data-testid="accept-with-issues-btn"
                onClick={() => handleConfirm('issues')}
                style={{
                  flex: 1,
                  minHeight: '46px',
                  borderRadius: '6px',
                  background: '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <AlertTriangle size={16} />
                <span>Accept with issues ({unitsReceived}u)</span>
              </button>
              <button
                type="button"
                data-testid="reject-shipment-btn"
                onClick={() => handleConfirm('rejected')}
                style={{
                  minHeight: '46px',
                  padding: '0 16px',
                  borderRadius: '6px',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  border: '1px solid #DC2626',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
              >
                Reject
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-testid="accept-all-btn"
              onClick={() => handleConfirm('all')}
              style={{
                width: '100%',
                minHeight: '46px',
                borderRadius: '6px',
                background: '#17805F',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Check size={16} />
              <span>Accept all ({unitsReceived}u · Original Expiry Ingestion) →</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              minHeight: '44px',
              background: 'none',
              border: 'none',
              color: 'rgba(20, 27, 45, 0.6)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel and inspect later
          </button>
        </div>
      </div>
    </div>
  );
};

