import React, { useState, useMemo, useEffect } from 'react';
import { World, BloodGroup, PlateletProduct } from '../world/types';
import { dispatchWorldEvent, findRequestMatches } from '../world';
import {
  LEDGER_TOKENS,
  Sheet,
  BloodGroup as BloodGroupBadge,
} from '../ui/ledger';

interface RequestPlateletsModalProps {
  world: World;
  hospitalCode: string;
  onClose: () => void;
  onSuccess: (requestId: string) => void;
}

export const RequestPlateletsModal: React.FC<RequestPlateletsModalProps> = ({
  world,
  hospitalCode,
  onClose,
  onSuccess,
}) => {
  // 1. Core Fields (Section 7)
  const [product, setProduct] = useState<PlateletProduct>('APH');
  const [group, setGroup] = useState<BloodGroup>('O-');
  const [units, setUnits] = useState<number>(2);
  const [urgency, setUrgency] = useState<'immediate' | 'urgent' | 'same_day' | 'planned'>('urgent');

  // 2. "More Options" Disclosure
  const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);
  const [acceptAboCompatible, setAcceptAboCompatible] = useState<boolean>(false);
  const [acceptPartial, setAcceptPartial] = useState<boolean>(true);
  const [contact, setContact] = useState<string>('Blood Bank On-Duty Officer');
  const [indication, setIndication] = useState<'dengue' | 'oncology' | 'trauma' | 'surgery' | 'other'>('trauma');
  const [caseRef, setCaseRef] = useState<string>(() => `CASE-${hospitalCode}-${Math.floor(100 + Math.random() * 900)}`);

  // Check URL query override (?step=options or ?step=2 opens More Options for screenshots)
  useEffect(() => {
    const checkStep = () => {
      const qStr = typeof window !== 'undefined'
        ? (window.location.hash.split('?')[1] || window.location.search.replace(/^\?/, ''))
        : '';
      const qParams = new URLSearchParams(qStr);
      const stepParam = qParams.get('step');
      if (stepParam === 'options' || stepParam === '2') {
        setShowMoreOptions(true);
      } else {
        setShowMoreOptions(false);
      }
    };
    checkStep();
    window.addEventListener('hashchange', checkStep);
    return () => window.removeEventListener('hashchange', checkStep);
  }, []);

  const maxUnits = product === 'APH' ? 12 : 30;

  const handleProductChange = (newProd: PlateletProduct) => {
    setProduct(newProd);
    if (newProd === 'APH' && units > 12) {
      setUnits(12);
    }
  };

  const handleUnitsChange = (newUnits: number) => {
    const clamped = Math.max(1, Math.min(maxUnits, newUnits));
    setUnits(clamped);
  };

  const groups: BloodGroup[] = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

  const urgencyHours = {
    immediate: 1,
    urgent: 3,
    same_day: 8,
    planned: 24,
  }[urgency];

  const adultDoses = product === 'APH' ? units : Math.max(1, Math.round(units / 5));

  // 3. Live Solver Match Preview
  const matchResult = useMemo(() => {
    return findRequestMatches(world, {
      hospital: hospitalCode,
      product,
      group,
      units,
      neededWithinH: urgencyHours,
      acceptAboCompatible,
      acceptPartial,
    });
  }, [world, hospitalCode, product, group, units, urgencyHours, acceptAboCompatible, acceptPartial]);

  const topMatch = matchResult.sources?.[0];

  // Compute live match line
  const matchLine = useMemo(() => {
    if (!topMatch) {
      return 'No source can reach you in this window';
    }
    const sourceName = topMatch.name.split(' ')[0] || topMatch.code;
    const transitMin = topMatch.etaMin;
    const shelfH = Math.max(12, Math.round(topMatch.arrivalShelfLifeH));
    return `Best source ${sourceName} · ${transitMin} min · arrives with ${shelfH} h left`;
  }, [topMatch]);

  const isMatchFound = Boolean(topMatch);

  // 4. Submit Handler
  const handleSubmit = () => {
    const now = world.simNow;
    const count = Object.keys(world.requests).length + 1;
    const newReqId = `REQ-${String(count).padStart(4, '0')}`;

    dispatchWorldEvent('RequestCreated', `operator:${hospitalCode}`, {
      request: {
        id: newReqId,
        hospital: hospitalCode,
        group,
        product,
        units,
        urgency: urgency === 'same_day' ? 'sameDay' : urgency,
        neededBy: now + urgencyHours * 3600000,
        createdAt: now,
        status: 'requested',
        acceptAboCompatible,
        acceptPartial,
        contact,
        indication,
        assignedOrderIds: [],
      },
    });

    onSuccess(newReqId);
  };

  const footerSummaryNode = (
    <div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
        {units}u {group.replace('-', '−')} {product === 'APH' ? 'Apheresis' : 'RDP'} · within {urgencyHours} h
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          background: isMatchFound ? '#ECFDF5' : '#FFFBEB',
          color: isMatchFound ? '#047857' : '#B45309',
          padding: '2px 8px',
          borderRadius: 6,
          fontSize: '11px',
          fontWeight: 600,
          marginTop: '4px',
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: isMatchFound ? '#10B981' : '#F59E0B' }} />
        <span>{matchLine}</span>
      </div>
    </div>
  );

  return (
    <Sheet
      isOpen={true}
      onClose={onClose}
      title="Request platelets"
      subtitle="AIIMS Trauma Center"
      footerSummary={footerSummaryNode}
      footerActionLabel="Send request"
      onFooterAction={handleSubmit}
    >
      <div
        data-testid="request-sheet-content"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          fontFamily: LEDGER_TOKENS.fontUi,
        }}
      >
        {/* 1. PRODUCT (Segmented Text Buttons per Section 7) */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink3, marginBottom: '8px' }}>
            Product
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}
          >
            <button
              type="button"
              data-testid="product-aph-btn"
              onClick={() => handleProductChange('APH')}
              style={{
                height: '44px',
                borderRadius: LEDGER_TOKENS.radius.md,
                border: product === 'APH' ? '1.5px solid #0F172A' : '1px solid rgba(15, 23, 42, 0.1)',
                background: product === 'APH' ? '#F8FAFC' : '#FFFFFF',
                fontWeight: product === 'APH' ? 700 : 400,
                color: LEDGER_TOKENS.ink,
                fontSize: LEDGER_TOKENS.type.t13,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              Apheresis (SDP)
            </button>
            <button
              type="button"
              data-testid="product-rdp-btn"
              onClick={() => handleProductChange('RDP')}
              style={{
                height: '44px',
                borderRadius: LEDGER_TOKENS.radius.md,
                border: product === 'RDP' ? '1.5px solid #0F172A' : '1px solid rgba(15, 23, 42, 0.1)',
                background: product === 'RDP' ? '#F8FAFC' : '#FFFFFF',
                fontWeight: product === 'RDP' ? 700 : 400,
                color: LEDGER_TOKENS.ink,
                fontSize: LEDGER_TOKENS.type.t13,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              RDP (random donor)
            </button>
          </div>
          <div style={{ fontSize: '12px', color: LEDGER_TOKENS.ink3, marginTop: '6px' }}>
            1 unit ≈ 1 adult dose (≈ 4–6 RDP)
          </div>
        </div>

        {/* 2. BLOOD GROUP (4x2 grid of 56 px buttons per Section 7) */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink3, marginBottom: '8px' }}>
            Blood group
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
            }}
          >
            {groups.map((g) => {
              const isSelected = group === g;
              return (
                <button
                  key={g}
                  type="button"
                  data-testid={`blood-group-btn-${g}`}
                  onClick={() => setGroup(g)}
                  style={{
                    height: '56px', // Exactly 56 px per Section 7
                    borderRadius: LEDGER_TOKENS.radius.md,
                    border: isSelected ? '1.5px solid #0F172A' : '1px solid rgba(15, 23, 42, 0.1)',
                    background: isSelected ? '#F8FAFC' : '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <BloodGroupBadge group={g} size={17} />
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. UNITS (Stepper + Presets 1 · 2 · 4 · 6 per Section 7) */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink3, marginBottom: '8px' }}>
            Units
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                border: `1px solid ${LEDGER_TOKENS.hairlineStrong}`,
                borderRadius: LEDGER_TOKENS.radius.md,
                background: '#FFFFFF',
              }}
            >
              <button
                type="button"
                data-testid="units-decrement-btn"
                onClick={() => handleUnitsChange(units - 1)}
                style={{
                  width: '44px',
                  height: '44px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: LEDGER_TOKENS.ink,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                −
              </button>
              <span
                data-testid="units-value"
                style={{
                  minWidth: '40px',
                  textAlign: 'center',
                  fontSize: '22px', // 22/600 tabular per Section 7
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                  color: LEDGER_TOKENS.ink,
                }}
              >
                {units}
              </span>
              <button
                type="button"
                data-testid="units-increment-btn"
                onClick={() => handleUnitsChange(units + 1)}
                style={{
                  width: '44px',
                  height: '44px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: LEDGER_TOKENS.ink,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                +
              </button>
            </div>

            {/* Quick Presets: 1 · 2 · 4 · 6 */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {[1, 2, 4, 6].map((pVal) => (
                <button
                  key={pVal}
                  type="button"
                  data-testid={`preset-units-${pVal}`}
                  onClick={() => handleUnitsChange(pVal)}
                  style={{
                    height: '44px',
                    padding: '0 14px',
                    borderRadius: LEDGER_TOKENS.radius.sm,
                    border: units === pVal ? '1.5px solid #0F172A' : '1px solid rgba(15, 23, 42, 0.1)',
                    background: units === pVal ? '#F8FAFC' : '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: units === pVal ? 700 : 400,
                    color: LEDGER_TOKENS.ink,
                    cursor: 'pointer',
                  }}
                >
                  {pVal}
                </button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: '12px', color: LEDGER_TOKENS.ink3, marginTop: '6px' }}>
            ≈ {adultDoses} adult dose{adultDoses > 1 ? 's' : ''} · max {maxUnits}u
          </div>
        </div>

        {/* 4. NEEDED WITHIN (Four Radio Rows per Section 7) */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink3, marginBottom: '8px' }}>
            Needed within
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { id: 'immediate', label: 'Immediate', window: '< 1 h' },
              { id: 'urgent', label: 'Urgent', window: '< 3 h' },
              { id: 'same_day', label: 'Same day', window: '< 8 h' },
              { id: 'planned', label: 'Planned', window: '< 24 h' },
            ].map((opt) => {
              const isSelected = urgency === opt.id;
              return (
                <div
                  key={opt.id}
                  data-testid={`urgency-row-${opt.id}`}
                  onClick={() => setUrgency(opt.id as any)}
                  style={{
                    height: '44px',
                    borderRadius: LEDGER_TOKENS.radius.md,
                    border: isSelected ? '1.5px solid #0F172A' : '1px solid rgba(15, 23, 42, 0.1)',
                    background: isSelected ? '#F8FAFC' : '#FFFFFF',
                    padding: '0 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: LEDGER_TOKENS.type.t13,
                    transition: 'all 0.12s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        border: `1.5px solid ${isSelected ? LEDGER_TOKENS.ink : LEDGER_TOKENS.ink4}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && (
                        <div
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: LEDGER_TOKENS.ink,
                          }}
                        />
                      )}
                    </div>
                    <span style={{ fontWeight: isSelected ? 600 : 400, color: LEDGER_TOKENS.ink }}>
                      {opt.label}
                    </span>
                  </div>

                  <span
                    style={{
                      fontVariantNumeric: 'tabular-nums',
                      color: LEDGER_TOKENS.ink3,
                      fontSize: '12px',
                    }}
                  >
                    {opt.window}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. "MORE OPTIONS" DISCLOSURE (Section 7) */}
        <div>
          <button
            type="button"
            data-testid="more-options-toggle"
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0 8px',
              minHeight: '44px',
              cursor: 'pointer',
              fontSize: '13px',
              color: LEDGER_TOKENS.ink2,
              textDecoration: 'underline',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {showMoreOptions ? 'Fewer options ▴' : 'More options ▾'}
          </button>

          {showMoreOptions && (
            <div
              data-testid="more-options-panel"
              style={{
                marginTop: '12px',
                padding: '14px',
                borderRadius: LEDGER_TOKENS.radius.md,
                border: `1px solid ${LEDGER_TOKENS.hairline}`,
                background: LEDGER_TOKENS.surface,
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                fontSize: LEDGER_TOKENS.type.t13,
              }}
            >
              {/* ABO Compatibility */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  data-testid="opt-abo-compatible"
                  checked={acceptAboCompatible}
                  onChange={(e) => setAcceptAboCompatible(e.target.checked)}
                />
                <span>Accept ABO-compatible alternatives</span>
              </label>

              {/* Partial fulfillment */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  data-testid="opt-partial-ok"
                  checked={acceptPartial}
                  onChange={(e) => setAcceptPartial(e.target.checked)}
                />
                <span>Accept partial fulfillment</span>
              </label>

              {/* Indication */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: LEDGER_TOKENS.ink3, marginBottom: '4px' }}>
                  Clinical indication
                </label>
                <select
                  data-testid="opt-indication"
                  value={indication}
                  onChange={(e) => setIndication(e.target.value as any)}
                  style={{
                    width: '100%',
                    height: '36px',
                    borderRadius: LEDGER_TOKENS.radius.sm,
                    border: `1px solid ${LEDGER_TOKENS.hairlineStrong}`,
                    background: '#FFFFFF',
                    padding: '0 8px',
                    fontSize: '13px',
                    color: LEDGER_TOKENS.ink,
                  }}
                >
                  <option value="trauma">Trauma (Severe hemorrhage)</option>
                  <option value="dengue">Dengue hemorrhagic fever</option>
                  <option value="oncology">Oncology thrombocytopenia</option>
                  <option value="surgery">Cardiovascular surgery</option>
                  <option value="other">Other clinical indication</option>
                </select>
              </div>

              {/* Contact */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: LEDGER_TOKENS.ink3, marginBottom: '4px' }}>
                  Contact
                </label>
                <input
                  type="text"
                  data-testid="opt-contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    borderRadius: LEDGER_TOKENS.radius.sm,
                    border: `1px solid ${LEDGER_TOKENS.hairlineStrong}`,
                    background: '#FFFFFF',
                    padding: '0 8px',
                    fontSize: '13px',
                    color: LEDGER_TOKENS.ink,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Case Reference */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: LEDGER_TOKENS.ink3, marginBottom: '4px' }}>
                  Case reference
                </label>
                <input
                  type="text"
                  data-testid="opt-case-ref"
                  value={caseRef}
                  onChange={(e) => setCaseRef(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    borderRadius: LEDGER_TOKENS.radius.sm,
                    border: `1px solid ${LEDGER_TOKENS.hairlineStrong}`,
                    background: '#FFFFFF',
                    padding: '0 8px',
                    fontSize: '13px',
                    color: LEDGER_TOKENS.ink,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
};

export default RequestPlateletsModal;
