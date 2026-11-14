import React, { useState } from 'react';
import {
  LEDGER_TOKENS,
  BloodGroup,
  StatusDot,
  StageGlyph,
  Button,
  Kbd,
  TextTabs,
  Row,
  Properties,
  Popover,
  Sentence,
  EmptyState,
  Sheet,
  HourRail,
  HourRailMarker,
  ExpiryStrip,
  ExpiryRowData,
} from './index';

export const LedgerGallery: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('primitives');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<'APH' | 'RDP'>('APH');

  // Sample data for Hour Rail
  const sampleMarkers: HourRailMarker[] = [
    {
      id: 'm1',
      kind: 'arrival',
      hourOffset: 4,
      timeStr: '15:58',
      primaryLabel: '15:58',
      secondaryLabel: '12u O− · Medanta',
      lane: 1,
    },
    {
      id: 'm2',
      kind: 'expiry',
      hourOffset: 9,
      timeStr: '21:00',
      primaryLabel: '6u expire',
      secondaryLabel: '9 h left',
      lane: 2,
    },
    {
      id: 'm3',
      kind: 'deadline',
      hourOffset: 16,
      timeStr: '04:00',
      primaryLabel: 'REQ-901 due',
      lane: 1,
    },
    {
      id: 'm4',
      kind: 'arrival',
      hourOffset: 22,
      timeStr: '10:00',
      primaryLabel: '10:00',
      secondaryLabel: '4u A+ · Max Saket',
      lane: 2,
    },
  ];

  // Sample data for Expiry Strip (8 ABO groups, 24 bins each)
  const sampleExpiryRows: ExpiryRowData[] = [
    {
      group: 'O-',
      parLevel: 4,
      totalUnits: 0,
      coverDays: 0.0,
      isCritical: true,
      bins: Array.from({ length: 24 }, (_, i) => ({
        binIndex: i,
        hoursRange: `${i * 5}–${(i + 1) * 5} h`,
        units: 0,
      })),
    },
    {
      group: 'O+',
      parLevel: 18,
      totalUnits: 26,
      coverDays: 6.0,
      bins: Array.from({ length: 24 }, (_, i) => {
        let u = 0;
        if (i === 1) u = 2; // < 12h
        if (i === 4) u = 6; // 12-36h
        if (i === 10) u = 10;
        if (i === 18) u = 8;
        return {
          binIndex: i,
          hoursRange: `${i * 5}–${(i + 1) * 5} h`,
          units: u,
        };
      }),
    },
    {
      group: 'A-',
      parLevel: 4,
      totalUnits: 2,
      coverDays: 1.0,
      isCritical: true,
      bins: Array.from({ length: 24 }, (_, i) => ({
        binIndex: i,
        hoursRange: `${i * 5}–${(i + 1) * 5} h`,
        units: i === 2 ? 2 : 0,
      })),
    },
    {
      group: 'A+',
      parLevel: 12,
      totalUnits: 14,
      coverDays: 3.5,
      bins: Array.from({ length: 24 }, (_, i) => ({
        binIndex: i,
        hoursRange: `${i * 5}–${(i + 1) * 5} h`,
        units: i === 5 ? 4 : i === 12 ? 6 : i === 16 ? 4 : 0,
      })),
    },
    {
      group: 'B-',
      parLevel: 4,
      totalUnits: 0,
      coverDays: null,
      bins: Array.from({ length: 24 }, (_, i) => ({
        binIndex: i,
        hoursRange: `${i * 5}–${(i + 1) * 5} h`,
        units: 0,
      })),
    },
    {
      group: 'B+',
      parLevel: 12,
      totalUnits: 18,
      coverDays: 4.5,
      bins: Array.from({ length: 24 }, (_, i) => ({
        binIndex: i,
        hoursRange: `${i * 5}–${(i + 1) * 5} h`,
        units: i === 3 ? 4 : i === 8 ? 6 : i === 20 ? 8 : 0,
      })),
    },
    {
      group: 'AB-',
      parLevel: 2,
      totalUnits: 1,
      coverDays: null,
      bins: Array.from({ length: 24 }, (_, i) => ({
        binIndex: i,
        hoursRange: `${i * 5}–${(i + 1) * 5} h`,
        units: i === 7 ? 1 : 0,
      })),
    },
    {
      group: 'AB+',
      parLevel: 4,
      totalUnits: 6,
      coverDays: 3.0,
      bins: Array.from({ length: 24 }, (_, i) => ({
        binIndex: i,
        hoursRange: `${i * 5}–${(i + 1) * 5} h`,
        units: i === 9 ? 3 : i === 15 ? 3 : 0,
      })),
    },
  ];

  return (
    <div
      className="ledger-root"
      data-testid="dev-ui-root"
      style={{
        background: LEDGER_TOKENS.canvas,
        minHeight: '100vh',
        padding: '32px 24px',
        color: LEDGER_TOKENS.ink,
        fontFamily: LEDGER_TOKENS.fontUi,
      }}
    >
      <div style={{ maxWidth: LEDGER_TOKENS.layout.contentMax, margin: '0 auto' }}>
        {/* Gallery Header */}
        <div style={{ borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`, paddingBottom: '16px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: LEDGER_TOKENS.ink3, fontWeight: 600 }}>
                HOSPITAL_UI_SPEC_V2 Design Foundation
              </div>
              <h1 style={{ margin: '4px 0 0 0', fontFamily: LEDGER_TOKENS.fontDisplay, fontSize: '34px', fontWeight: 400 }}>
                Ledger Component Kit & Primitives Gallery
              </h1>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Kbd>Ctrl K</Kbd>
              <Button
                variant="secondary"
                data-testid="open-sheet-btn"
                onClick={() => setIsSheetOpen(true)}
              >
                Test Sheet Drawer
              </Button>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <TextTabs
              tabs={[
                { id: 'primitives', label: 'All Primitives', count: 14 },
                { id: 'states', label: 'States & Edge Cases', count: 6 },
                { id: 'hour-rail', label: 'Hour Rail & Expiry', count: 2 },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </div>
        </div>

        {/* SECTION 1: SENTENCE (Page Headlines) */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '16px' }}>
            1. Sentence (Display Headlines · Max 9 words + Subline)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Arrived State */}
            <div style={{ borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`, paddingBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: LEDGER_TOKENS.ink4, marginBottom: '6px' }}>State: Arrived (Primary Action)</div>
              <Sentence
                headline="2u O− arrived."
                subline="Confirm receipt for TX-1138 from Medanta Hub."
                action={<Button variant="primary">Confirm receipt</Button>}
                secondaryLines={[
                  { dotColor: LEDGER_TOKENS.bad, text: 'O− cover is 0.0 d · Request platelets →' },
                ]}
              />
            </div>

            {/* Inbound State */}
            <div style={{ borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`, paddingBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: LEDGER_TOKENS.ink4, marginBottom: '6px' }}>State: Inbound (On the way)</div>
              <Sentence
                headline="On the way."
                subline="Arrives 15:52–16:04 · est. · 29 h left on arrival"
                action={<Button variant="secondary">View tracking</Button>}
              />
            </div>

            {/* Delayed / Alert State */}
            <div style={{ borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`, paddingBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: LEDGER_TOKENS.ink4, marginBottom: '6px' }}>State: Delayed (With Reason)</div>
              <Sentence
                headline="Delayed 8 min."
                subline="Heavy traffic on Outer Ring Road corridor."
                action={<Button variant="text">Report exception →</Button>}
              />
            </div>

            {/* Steady State */}
            <div>
              <div style={{ fontSize: '11px', color: LEDGER_TOKENS.ink4, marginBottom: '6px' }}>State: Steady (All clear)</div>
              <Sentence
                headline="All steady."
                subline="Network balance safe · 26u usable on hand"
              />
            </div>
          </div>
        </section>

        {/* SECTION 2: TEXT TABS */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '16px' }}>
            2. TextTabs (14/500, ink-3 inactive, ink active with 2px underline, 28px gap, no pills)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <TextTabs
              tabs={[
                { id: 'today', label: 'Today' },
                { id: 'requests', label: 'Requests', count: 2 },
                { id: 'stock', label: 'Stock' },
              ]}
              activeTab="today"
              onChange={() => {}}
            />

            <TextTabs
              tabs={[
                { id: 'active', label: 'Active', count: 2 },
                { id: 'completed', label: 'Completed', count: 14 },
              ]}
              activeTab="active"
              onChange={() => {}}
            />
          </div>
        </section>

        {/* SECTION 3: ROWS (44px, no box, 1px bottom hairline, hover --surface) */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '16px' }}>
            3. Rows (44px, no card box, bottom hairline, hover surface, right-aligned numbers)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Row onClick={() => {}}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%' }}>
                <StageGlyph stage={4} />
                <span className="ledger-mono" style={{ fontSize: '13px', color: LEDGER_TOKENS.ink3 }}>TX-0412</span>
                <span style={{ fontSize: '13px' }}>APL → AIM</span>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>
                  12u <BloodGroup group="O-" size={14} /> Apheresis
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '18px' }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>15:58</span>
                  <StatusDot status="ontime" text="On time" />
                </div>
              </div>
            </Row>

            <Row onClick={() => {}}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%' }}>
                <StageGlyph stage={3} variant="delayed" />
                <span className="ledger-mono" style={{ fontSize: '13px', color: LEDGER_TOKENS.ink3 }}>TX-1138</span>
                <span style={{ fontSize: '13px' }}>MDT → AIM</span>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>
                  2u <BloodGroup group="O-" size={14} /> Apheresis
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '18px' }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: LEDGER_TOKENS.warn }}>16:06</span>
                  <StatusDot status="delayed" text="Delayed +8 min" />
                </div>
              </div>
            </Row>

            <Row onClick={() => {}}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%' }}>
                <StageGlyph stage={5} />
                <span className="ledger-mono" style={{ fontSize: '13px', color: LEDGER_TOKENS.ink3 }}>TX-0892</span>
                <span style={{ fontSize: '13px' }}>RML → AIM</span>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>
                  6u <BloodGroup group="A+" size={14} /> RDP
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '18px' }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: LEDGER_TOKENS.ink3 }}>14:32</span>
                  <StatusDot status="good" text="Delivered" />
                </div>
              </div>
            </Row>

            {/* Long text truncation row */}
            <Row onClick={() => {}}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%', overflow: 'hidden' }}>
                <StageGlyph stage={1} variant="alert" />
                <span className="ledger-mono" style={{ fontSize: '13px', color: LEDGER_TOKENS.ink3 }}>REQ-901</span>
                <span style={{ fontSize: '13px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  Urgent trauma transfusion consignment from Northern Regional Agitator Reserve Hub
                </span>
                <div style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '18px' }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>&lt; 1 h</span>
                  <StatusDot status="alert" text="Alert" />
                </div>
              </div>
            </Row>
          </div>
        </section>

        {/* SECTION 4: STATUS DOTS & STAGE GLYPHS */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '16px' }}>
            4. StatusDot & StageGlyph (State-driven, never filled pills)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '11px', color: LEDGER_TOKENS.ink4 }}>StatusDot Examples</div>
              <StatusDot status="ontime" text="On time" />
              <StatusDot status="delayed" text="Delayed +8 min" />
              <StatusDot status="alert" text="Cold-chain alert" />
              <StatusDot status="packed" text="Packed & awaiting vehicle" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '11px', color: LEDGER_TOKENS.ink4 }}>StageGlyph (1 to 5)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <StageGlyph stage={1} /> <span>1. Requested</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <StageGlyph stage={2} /> <span>2. Found</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <StageGlyph stage={3} /> <span>3. Packed</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <StageGlyph stage={4} /> <span>4. In transit</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <StageGlyph stage={5} /> <span>5. Delivered</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: SAFETY - BLOOD GROUP COMPONENT */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '16px' }}>
            5. Safety: BloodGroup Component (§14: Never mono, U+2212 minus sign, letter O)
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] as const).map((g) => (
              <div
                key={g}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${LEDGER_TOKENS.hairline}`,
                  borderRadius: LEDGER_TOKENS.radius.md,
                  background: LEDGER_TOKENS.surface,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <BloodGroup group={g} size={18} />
              </div>
            ))}
          </div>

          {/* Capital O vs Digit 0 Evidence (§14 & §2.1) */}
          <div
            data-testid="o-vs-zero-evidence"
            style={{
              marginTop: '16px',
              padding: '16px',
              border: `1px solid ${LEDGER_TOKENS.hairline}`,
              borderRadius: LEDGER_TOKENS.radius.md,
              background: LEDGER_TOKENS.canvas,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxWidth: '560px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink2 }}>
              Safety Proof: Capital letter O vs. digit 0 (Instrument Sans vs tabular digits)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '24px', fontSize: '32px', fontFamily: LEDGER_TOKENS.fontUi }}>
              <div>
                <span style={{ fontWeight: 600, color: LEDGER_TOKENS.ink }}>O</span>
                <span style={{ fontSize: '12px', color: LEDGER_TOKENS.ink3, marginLeft: '6px' }}>Letter O (round, wide)</span>
              </div>
              <div>
                <span style={{ fontWeight: 600, color: LEDGER_TOKENS.ink, fontVariantNumeric: 'tabular-nums' }}>0</span>
                <span style={{ fontSize: '12px', color: LEDGER_TOKENS.ink3, marginLeft: '6px' }}>Digit 0 (narrower, oval)</span>
              </div>
              <div>
                <span style={{ fontWeight: 600, color: LEDGER_TOKENS.ink }}>O− 0u</span>
                <span style={{ fontSize: '12px', color: LEDGER_TOKENS.ink3, marginLeft: '6px' }}>Clinical contrast</span>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: LEDGER_TOKENS.ink3 }}>
              Glyph ratio: Capital O width/height is ~0.82; Digit 0 tabular width is fixed ~0.55. Minus sign is Unicode U+2212 (&minus;), not hyphen (-).
            </div>
          </div>
        </section>

        {/* SECTION 6: PROPERTIES LIST */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '16px' }}>
            6. Properties (140px label + value rows with hairlines, no boxes)
          </div>

          <div style={{ maxWidth: '480px' }}>
            <Properties
              items={[
                { label: 'Origin Hub', value: 'Medanta Hospital (MDT)' },
                { label: 'Units allocated', value: '12u O− Apheresis' },
                { label: 'Courier vehicle', value: 'VAN-02 (Cold-chain Agitator)', mono: true },
                { label: 'Driver contact', value: 'Rajesh · +91 98101 23456' },
                { label: 'Temperature log', value: '22.0 °C · seal verified' },
                { label: 'Oldest lot expiry', value: '31 hours remaining' },
              ]}
            />
          </div>
        </section>

        {/* SECTION 7: BUTTONS & KBD KEYCAPS */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '16px' }}>
            7. Buttons & Kbd (Ink primary 36px, secondary hairline, text button, mono keycaps)
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Button variant="primary">Send request</Button>
            <Button variant="secondary">Update stock</Button>
            <Button variant="text">All requests →</Button>
            <Button variant="primary" disabled>Disabled primary</Button>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '12px' }}>
              <span style={{ fontSize: '12px', color: LEDGER_TOKENS.ink3 }}>Shortcuts:</span>
              <Kbd>Ctrl K</Kbd>
              <Kbd>g t</Kbd>
              <Kbd>r</Kbd>
              <Kbd>Esc</Kbd>
            </div>
          </div>
        </section>

        {/* SECTION 8: EMPTY STATE */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '16px' }}>
            8. EmptyState (Left-aligned text only, under 15 words, ghost preview, no icon circles)
          </div>

          <div style={{ border: `1px solid ${LEDGER_TOKENS.hairline}`, borderRadius: LEDGER_TOKENS.radius.md, padding: '16px 20px' }}>
            <EmptyState
              headline="No active requests"
              explanation="All current patient transfers have been confirmed and received."
              actionLabel="Request platelets"
              onAction={() => setIsSheetOpen(true)}
            />
          </div>
        </section>

        {/* SECTION 9: HOUR RAIL */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '16px' }}>
            9. Hour Rail (§4.1: 72px time axis, 3 marker kinds, 2 collision lanes)
          </div>

          <div style={{ background: '#FFFFFF', border: `1px solid ${LEDGER_TOKENS.hairline}`, borderRadius: LEDGER_TOKENS.radius.md, padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Today 36-hour outlook</div>
            <HourRail markers={sampleMarkers} />

            <div style={{ marginTop: '24px', borderTop: `1px solid ${LEDGER_TOKENS.hairline}`, paddingTop: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Tracking variant (Pickup to ETA checkpoints)</div>
              <HourRail isTrackingVariant trackingElapsedPct={65} />
            </div>
          </div>
        </section>

        {/* SECTION 10: EXPIRY STRIP */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '16px' }}>
            10. Expiry Strip (§4.2: 56px rows, shared 0–120 h axis, 24 bins, zone bands)
          </div>

          <div style={{ background: '#FFFFFF', border: `1px solid ${LEDGER_TOKENS.hairline}`, borderRadius: LEDGER_TOKENS.radius.md, padding: '20px' }}>
            <ExpiryStrip
              rows={sampleExpiryRows}
              selectedProduct={selectedProduct}
              onProductChange={setSelectedProduct}
              onParChange={(grp, val) => alert(`Updated par for ${grp} to ${val}`)}
              onBinClick={(grp, bin) => alert(`Clicked ${grp} bin: ${bin.hoursRange} (${bin.units}u)`)}
            />
          </div>
        </section>

        {/* SECTION 11: POPOVER (§3: radius 6, --shadow-pop, 12/400, max 240px) */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.ink3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '16px' }}>
            11. Popover (§3: radius 6, --shadow-pop, 12/400, max 240px)
          </div>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Popover
              trigger="click"
              content={
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '4px', color: LEDGER_TOKENS.ink }}>Lot details · LOT-2026-904</div>
                  <div style={{ color: LEDGER_TOKENS.ink2, lineHeight: 1.4 }}>
                    Collected 14h ago at Rotary Delhi. Expires in 106 hours.
                  </div>
                </div>
              }
            >
              <Button variant="secondary">Click for lot popover</Button>
            </Popover>

            <Popover
              trigger="hover"
              content={
                <div style={{ color: LEDGER_TOKENS.ink2, lineHeight: 1.4 }}>
                  Par level is the minimum safety reserve maintained per blood group.
                </div>
              }
            >
              <span style={{ fontSize: '13px', color: LEDGER_TOKENS.ink2, textDecoration: 'underline dotted', cursor: 'help' }}>
                Hover for explanation popover
              </span>
            </Popover>
          </div>
        </section>

        {/* INTERACTIVE SHEET DRAWER (§3: 440px width, sticky 72px footer with 104px padding) */}
        <Sheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          title="Request platelets"
          subtitle="AIIMS Trauma Center"
          footerSummary="2u O− Apheresis · within 3 h"
          footerActionLabel="Send request"
          onFooterAction={() => {
            alert('Request submitted');
            setIsSheetOpen(false);
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Product</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" style={{ flex: 1 }}>Apheresis (SDP)</Button>
                <Button variant="secondary" style={{ flex: 1 }}>RDP (random donor)</Button>
              </div>
              <div style={{ fontSize: '12px', color: LEDGER_TOKENS.ink3, marginTop: '4px' }}>
                1 unit ≈ 1 adult dose (≈ 4–6 RDP)
              </div>
            </div>

            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Blood group</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    style={{
                      height: '56px',
                      border: g === 'O-' ? `1.5px solid ${LEDGER_TOKENS.ink}` : `1px solid ${LEDGER_TOKENS.hairline}`,
                      background: g === 'O-' ? LEDGER_TOKENS.surface : '#FFFFFF',
                      borderRadius: LEDGER_TOKENS.radius.md,
                      cursor: 'pointer',
                    }}
                  >
                    <BloodGroup group={g} size={16} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Units needed</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Button variant="secondary" style={{ minWidth: '36px' }}>-</Button>
                <span style={{ fontSize: '22px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>2</span>
                <Button variant="secondary" style={{ minWidth: '36px' }}>+</Button>
                <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                  <Button variant="text">1</Button>
                  <Button variant="text">2</Button>
                  <Button variant="text">4</Button>
                  <Button variant="text">6</Button>
                </div>
              </div>
            </div>

            <Properties
              items={[
                { label: 'Dispatch match', value: 'Medanta Hub (14 min away)' },
                { label: 'Freshness on arrival', value: '29 hours remaining' },
                { label: 'Clinical priority', value: 'Urgent (< 3 h)' },
              ]}
            />
          </div>
        </Sheet>
      </div>
    </div>
  );
};

export default LedgerGallery;
