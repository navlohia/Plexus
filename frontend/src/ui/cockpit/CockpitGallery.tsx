import React, { useState } from 'react';
import {
  COCKPIT_TOKENS,
  Hero,
  StatDominant,
  StatMini,
  Board,
  BoardRow,
  TicketCard,
  StatusChip,
  Timeline,
  ShelfMargin,
  LadderGrid,
  FlowBar,
  Sheet,
  EmptyState,
  HospitalMenu,
  VehicleArt,
} from './index';

export const CockpitGallery: React.FC = () => {
  const [activeWidth, setActiveWidth] = useState<'1440' | '390' | 'full'>('full');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [ladderProduct, setLadderProduct] = useState<'APH' | 'RDP'>('APH');
  const [heroState, setHeroState] = useState<'inbound' | 'arrived' | 'shortage' | 'risk' | 'stale' | 'steady'>('inbound');

  const widthStyle =
    activeWidth === '390'
      ? { width: '390px', margin: '0 auto', boxShadow: '0 0 40px rgba(20,27,45,0.15)' }
      : activeWidth === '1440'
        ? { width: '1440px', margin: '0 auto', boxShadow: '0 0 40px rgba(20,27,45,0.08)' }
        : { width: '100%', maxWidth: '1320px', margin: '0 auto' };

  return (
    <div
      data-testid="cockpit-gallery-root"
      style={{
        background: COCKPIT_TOKENS.surfaces.pageBg,
        minHeight: '100vh',
        fontFamily: COCKPIT_TOKENS.fonts.display,
        color: COCKPIT_TOKENS.ink.primary,
        padding: '24px 20px 100px 20px',
      }}
    >
      {/* Gallery Controls Header */}
      <div
        style={{
          position: 'relative',
          zIndex: 50,
          background: 'rgba(255, 255, 255, 0.92)',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(20, 27, 45, 0.08)',
          border: '1px solid rgba(20, 27, 45, 0.10)',
          padding: '12px 20px',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          maxWidth: '1320px',
          margin: '0 auto 32px auto',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '4px',
                background: COCKPIT_TOKENS.lavender[100],
                color: COCKPIT_TOKENS.lavender[800],
              }}
            >
              Dev UI
            </span>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
              Cockpit Design System Component Kit
            </h1>
          </div>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: COCKPIT_TOKENS.ink.muted }}>
            Sampled from Moveon Dispatch Dashboard • Radius 24/32 • Tabular Figures • Zero Blue
          </p>
        </div>

        {/* Viewport Width Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="cockpit-label" style={{ fontSize: '12px', marginRight: '4px' }}>
            Preview width:
          </span>
          <button
            type="button"
            data-testid="toggle-width-full"
            onClick={() => setActiveWidth('full')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: activeWidth === 'full' ? COCKPIT_TOKENS.ink.primary : COCKPIT_TOKENS.surfaces.pageBg,
              color: activeWidth === 'full' ? '#FFFFFF' : COCKPIT_TOKENS.ink.primary,
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Responsive (1320px)
          </button>
          <button
            type="button"
            data-testid="toggle-width-1440"
            onClick={() => setActiveWidth('1440')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: activeWidth === '1440' ? COCKPIT_TOKENS.ink.primary : COCKPIT_TOKENS.surfaces.pageBg,
              color: activeWidth === '1440' ? '#FFFFFF' : COCKPIT_TOKENS.ink.primary,
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Desktop (1440px)
          </button>
          <button
            type="button"
            data-testid="toggle-width-390"
            onClick={() => setActiveWidth('390')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: activeWidth === '390' ? COCKPIT_TOKENS.ink.primary : COCKPIT_TOKENS.surfaces.pageBg,
              color: activeWidth === '390' ? '#FFFFFF' : COCKPIT_TOKENS.ink.primary,
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Mobile (390px)
          </button>
        </div>
      </div>

      {/* Main Component Kit Content */}
      <div style={{ ...widthStyle, transition: 'width 0.25s ease' }}>

        {/* ------------------------------------------------------------------------- */}
        {/* SECTION 1: HERO (All 6 States + Loading + Error) */}
        {/* ------------------------------------------------------------------------- */}
        <section style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: COCKPIT_TOKENS.ink.primary }}>
                1. Hero Component (State-Aware, Radius 32, Vehicle Art)
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: COCKPIT_TOKENS.ink.muted }}>
                Giant ETA 72/72, filled progress segment without moving dots, glass chips, and one primary action.
              </p>
            </div>

            {/* State Picker Buttons */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {(['inbound', 'arrived', 'shortage', 'risk', 'stale', 'steady'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  data-testid={`hero-state-btn-${st}`}
                  onClick={() => setHeroState(st)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: heroState === st ? COCKPIT_TOKENS.lavender[500] : '#FFFFFF',
                    color: heroState === st ? '#FFFFFF' : COCKPIT_TOKENS.ink.primary,
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Active Selected State */}
            <Hero
              state={heroState}
              orderId="TX-0412"
              fromHospital={{ code: 'APL', name: 'Apollo Indraprastha' }}
              toHospital={{ code: 'AIM', name: 'AIIMS Trauma' }}
              etaTime="15:58"
              etaRemainingMin={7}
              progressPercent={68}
              shelfLifeH={29}
              temperatureC={22.0}
              courierName="Rajesh"
              vehicleId="VAN-01"
              outbreakMode={heroState === 'shortage'}
              outbreakDemandMultiplier={2.4}
              onPrimaryAction={() => alert(`Hero action clicked for state: ${heroState}`)}
            />

            {/* Side-by-Side: Loading & Error States */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '20px' }}>
              <div>
                <div className="cockpit-label" style={{ marginBottom: '8px' }}>
                  Hero: Loading State (Skeleton, no shimmer gradients)
                </div>
                <Hero isLoading />
              </div>
              <div>
                <div className="cockpit-label" style={{ marginBottom: '8px' }}>
                  Hero: Error State (Calm message with retry)
                </div>
                <Hero error="Telemetry lost for corridor North-East. Retrying connection..." onRetry={() => alert('Retrying...')} />
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* SECTION 2: STAT DOMINANT & STAT MINI */}
        {/* ------------------------------------------------------------------------- */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 700, color: COCKPIT_TOKENS.ink.primary }}>
            2. Stat Cards (Dominant 56/56 Numeral & Mini Stats)
          </h2>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: COCKPIT_TOKENS.ink.muted }}>
            Net position numeral, 36h outlook sparkline, and unified two-row mini stat card.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
            <StatDominant
              label="Net position"
              value="+11u"
              subtext="16u usable · 17u expected demand · 12u incoming"
              tone="ok"
              sparklineData={[12, 13, 15, 14, 18, 19, 21]}
            />
            <StatDominant
              label="Deficit projection"
              value="−4u"
              subtext="8u usable · 16u expected demand · 4u incoming"
              tone="short"
              sparklineData={[18, 16, 14, 11, 8, 5, 4]}
            />
            <StatDominant
              label="Surplus buffer"
              value="0u"
              subtext="Balanced inventory · Safe operational margin"
              tone="risk"
              sparklineData={[10, 10, 10, 10, 10, 10, 10]}
            />
            <StatMini
              rows={[
                { label: 'Expiring < 36 h', value: '0u', subtext: 'Safe buffer', tone: 'ok' },
                { label: 'Verified inventory', value: '14:02', subtext: 'In-charge checked', tone: 'neutral' },
              ]}
            />
            <StatMini isLoading />
          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* SECTION 3: BOARD & BOARD ROWS */}
        {/* ------------------------------------------------------------------------- */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 700, color: COCKPIT_TOKENS.ink.primary }}>
            3. Departure Board & Board Rows
          </h2>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: COCKPIT_TOKENS.ink.muted }}>
            One line per transfer, vehicle thumbnail 56×28, mono IDs, hover 2px lift, and calm empty state.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))', gap: '24px' }}>
            {/* Populated Board */}
            <Board
              title="Active transfers (Departure board)"
              transfers={[
                { id: 'TX-0412', fromCode: 'APL', toCode: 'AIM', units: 12, group: 'O−', product: 'Apheresis (SDP)', etaTime: '15:58', vehicleType: 'van', statusVariant: 'ontime', statusLabel: 'On time' },
                { id: 'TX-0415', fromCode: 'MDT', toCode: 'AIM', units: 4, group: 'A+', product: 'RDP (random donor)', etaTime: '16:15', vehicleType: 'bike', statusVariant: 'delayed', statusLabel: 'Delayed +8 min' },
                { id: 'TX-0419', fromCode: 'SFD', toCode: 'AIM', units: 6, group: 'B+', product: 'Apheresis (SDP)', etaTime: '16:40', vehicleType: 'van', statusVariant: 'assigned', statusLabel: 'Packed' },
              ]}
              onViewAll={() => alert('View all transfers clicked')}
              onRowClick={(row) => alert(`Clicked transfer ${row.id}`)}
            />

            {/* Empty Board per Section 4 (Nothing in motion + ghost row preview) */}
            <Board
              title="Transfers in motion (Empty state)"
              transfers={[]}
            />
          </div>

          {/* Standalone BoardRow State Demonstration */}
          <div
            style={{
              marginTop: '16px',
              padding: '16px 20px',
              background: COCKPIT_TOKENS.surfaces.cardBg,
              borderRadius: COCKPIT_TOKENS.radii.card,
              border: COCKPIT_TOKENS.hairlines.default,
            }}
          >
            <div className="cockpit-label" style={{ marginBottom: '10px' }}>
              Standalone BoardRow (Hover & focus interactive)
            </div>
            <BoardRow
              data={{
                id: 'TX-0488',
                fromCode: 'GTB',
                toCode: 'AIM',
                units: 8,
                group: 'O+',
                product: 'Apheresis (SDP)',
                etaTime: '17:05',
                vehicleType: 'van',
                statusVariant: 'ontime',
                statusLabel: 'On time',
              }}
              onClick={() => alert('Clicked standalone BoardRow')}
            />
          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* SECTION 4: TICKET CARD (BOARDING PASS) & STATUS CHIPS */}
        {/* ------------------------------------------------------------------------- */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 700, color: COCKPIT_TOKENS.ink.primary }}>
            4. Boarding Passes (TicketCard) & Status Chips
          </h2>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: COCKPIT_TOKENS.ink.muted }}>
            4px status bar on left, route, 5-dot stage indicator, large ETA. Chips always icon + text.
          </p>

          {/* Status Chips Row */}
          <div
            style={{
              background: COCKPIT_TOKENS.surfaces.cardBg,
              borderRadius: COCKPIT_TOKENS.radii.card,
              border: COCKPIT_TOKENS.hairlines.default,
              padding: '18px 24px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <span className="cockpit-label" style={{ marginRight: '8px' }}>
              Status chip variants:
            </span>
            <StatusChip variant="ontime" label="On time" />
            <StatusChip variant="delayed" label="Delayed +8 min" />
            <StatusChip variant="alert" label="Cold chain alert" />
            <StatusChip variant="assigned" label="Packed & ready" />
            <StatusChip variant="waiting" label="Waiting for vehicle" />
          </div>

          {/* Ticket Cards Stack */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <TicketCard
              data={{
                id: 'REQ-901',
                fromCode: 'APL',
                toCode: 'AIM',
                units: 12,
                group: 'O−',
                product: 'Apheresis (SDP)',
                currentStage: 4,
                etaTime: '15:58',
                statusVariant: 'ontime',
                statusLabel: 'On time',
                urgency: 'urgent',
              }}
              onClick={() => alert('Ticket clicked: REQ-901')}
            />

            <TicketCard
              data={{
                id: 'REQ-904',
                fromCode: 'MDT',
                toCode: 'AIM',
                units: 4,
                group: 'B+',
                product: 'RDP (random donor)',
                currentStage: 2,
                etaTime: '16:45',
                statusVariant: 'delayed',
                statusLabel: 'Delayed +14 min',
                urgency: 'immediate',
              }}
              onClick={() => alert('Ticket clicked: REQ-904')}
            />

            <TicketCard
              data={{
                id: 'REQ-889',
                fromCode: 'SFD',
                toCode: 'AIM',
                units: 6,
                group: 'A−',
                product: 'Apheresis (SDP)',
                currentStage: 5,
                etaTime: '14:20',
                statusVariant: 'ontime',
                statusLabel: 'Delivered',
              }}
            />
          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* SECTION 5: TIMELINE & SHELF MARGIN */}
        {/* ------------------------------------------------------------------------- */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 700, color: COCKPIT_TOKENS.ink.primary }}>
            5. Five-Step Timeline & Shelf-Life Margin
          </h2>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: COCKPIT_TOKENS.ink.muted }}>
            Requested → Source found → Packed → On the way → Delivered with timestamps and non-collapsing exception notes.
          </p>

          <div
            style={{
              background: COCKPIT_TOKENS.surfaces.cardBg,
              borderRadius: COCKPIT_TOKENS.radii.card,
              border: COCKPIT_TOKENS.hairlines.default,
              padding: '28px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
          >
            {/* Shelf Margin Chips Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span className="cockpit-label">Shelf-life margin thresholds:</span>
              <ShelfMargin hoursLeft={42} label="Safe buffer" />
              <ShelfMargin hoursLeft={24} label="Tight margin" />
              <ShelfMargin hoursLeft={8} label="Critical shelf life" />
            </div>

            <div style={{ height: '1px', background: 'rgba(20, 27, 45, 0.06)' }} />

            {/* Standard Timeline */}
            <Timeline currentStage={4} />

            {/* Timeline with Delay Exception Note */}
            <Timeline
              currentStage={4}
              exceptionNote={{
                type: 'delay',
                title: 'Delayed +8 min in transit',
                description: 'Courier rerouted via Ring Road corridor due to surface congestion. New ETA: 16:04.',
              }}
            />

            {/* Timeline with Cold Chain Alert */}
            <Timeline
              currentStage={3}
              exceptionNote={{
                type: 'alert',
                title: 'Cold-chain alert: 24.5 °C for 12 minutes',
                description: 'Insulated transport container seal sensor logged temperature deviation. Inspection required at receiving bay.',
              }}
            />
          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* SECTION 6: LADDER GRID & 30-DAY FLOW BAR */}
        {/* ------------------------------------------------------------------------- */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 700, color: COCKPIT_TOKENS.ink.primary }}>
            6. Stock Screen: Expiry LadderGrid & FlowBar
          </h2>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: COCKPIT_TOKENS.ink.muted }}>
            8 groups × 4 buckets, sticky first column, faint dots for empty cells, outdate rate headline, single stacked bar.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <LadderGrid
              product={ladderProduct}
              onProductChange={setLadderProduct}
              onCellClick={(g, b, u) => alert(`Inspecting cell: ${u}u ${g} in bucket ${b}`)}
              onEditPar={(g, p) => alert(`Par level for ${g} updated to ${p}`)}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '20px' }}>
              <FlowBar
                metrics={{
                  outdateRatePct: 7.8,
                  totalReceived: 340,
                  issuedUnits: 285,
                  sentUnits: 32,
                  expiredUnits: 23,
                  networkComparisonText: 'Network baseline derived from 30-day mesh history',
                }}
              />

              <FlowBar
                metrics={{
                  outdateRatePct: 14.2,
                  totalReceived: 210,
                  issuedUnits: 155,
                  sentUnits: 18,
                  expiredUnits: 37,
                  networkComparisonText: 'Outbreak mode alert: discard rate elevated',
                }}
              />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* SECTION 7: EMPTY STATES & HOSPITAL MENU & SHEET TRIGGER */}
        {/* ------------------------------------------------------------------------- */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 700, color: COCKPIT_TOKENS.ink.primary }}>
            7. Empty States, Hospital Menu & Interactive Sheet
          </h2>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: COCKPIT_TOKENS.ink.muted }}>
            Answers what/why/next under 15 words. Header menu dropdown with node switcher and sound controls.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '20px', marginBottom: '24px' }}>
            <EmptyState
              variant="all_caught_up"
              onAction={() => alert('Refreshed!')}
            />
            <EmptyState
              variant="first_time"
              onAction={() => setIsSheetOpen(true)}
            />
            <EmptyState
              variant="no_results"
              onAction={() => alert('Filters cleared!')}
            />
          </div>

          <div
            style={{
              background: COCKPIT_TOKENS.surfaces.cardBg,
              borderRadius: COCKPIT_TOKENS.radii.card,
              border: COCKPIT_TOKENS.hairlines.default,
              padding: '24px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <HospitalMenu
                currentHospitalCode="AIM"
                currentHospitalName="AIIMS Trauma Center"
                onSelectHospital={(code) => alert(`Switched to demo node: ${code}`)}
                onToggleSound={() => alert('Toggled audio alert settings')}
                onSignOut={() => alert('Sign out clicked')}
              />
              <span style={{ fontSize: '13px', color: COCKPIT_TOKENS.ink.muted }}>
                ← Click to inspect HospitalMenu dropdown popover
              </span>
            </div>

            <button
              type="button"
              data-testid="open-sheet-demo-btn"
              onClick={() => setIsSheetOpen(true)}
              style={{
                minHeight: '44px',
                padding: '0 20px',
                borderRadius: COCKPIT_TOKENS.radii.sm,
                background: COCKPIT_TOKENS.status.green.solid,
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 600,
                fontSize: '13.5px',
                cursor: 'pointer',
              }}
            >
              Open Sheet Drawer Demo
            </button>
          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* SECTION 8: VEHICLE ART SHOWCASE */}
        {/* ------------------------------------------------------------------------- */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 700, color: COCKPIT_TOKENS.ink.primary }}>
            8. Vehicle Art (2:1 Hero Aspect Ratio & Fallbacks)
          </h2>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: COCKPIT_TOKENS.ink.muted }}>
            3D Studio renders for Van and Bike with soft ground shadow and crisp vector fallback.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '24px' }}>
            <div
              style={{
                background: COCKPIT_TOKENS.surfaces.cardBg,
                borderRadius: COCKPIT_TOKENS.radii.card,
                border: COCKPIT_TOKENS.hairlines.default,
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div className="cockpit-label" style={{ marginBottom: '16px' }}>
                Fleet Van (Studio 3D Asset)
              </div>
              <VehicleArt type="van" variant="hero" />
            </div>

            <div
              style={{
                background: COCKPIT_TOKENS.surfaces.cardBg,
                borderRadius: COCKPIT_TOKENS.radii.card,
                border: COCKPIT_TOKENS.hairlines.default,
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div className="cockpit-label" style={{ marginBottom: '16px' }}>
                Rapid Bike Courier (Studio 3D Asset)
              </div>
              <VehicleArt type="bike" variant="hero" />
            </div>
          </div>
        </section>

      </div>

      {/* Interactive Sheet Drawer Instance */}
      <Sheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Request Platelet Units"
        subtitle="AIIMS Trauma Center • Logistics Network"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsSheetOpen(false)}
              style={{
                minHeight: '44px',
                padding: '0 16px',
                background: 'transparent',
                border: 'none',
                color: COCKPIT_TOKENS.ink.muted,
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                alert('Request submitted in Cockpit Design System!');
                setIsSheetOpen(false);
              }}
              style={{
                minHeight: '44px',
                padding: '0 20px',
                background: COCKPIT_TOKENS.status.green.solid,
                border: 'none',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Confirm 4u O− Request
            </button>
          </>
        }
      >
        <div>
          <label className="cockpit-label" style={{ display: 'block', marginBottom: '8px' }}>
            Product type
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['Apheresis (SDP)', 'RDP (random donor)'].map((p, i) => (
              <button
                key={p}
                type="button"
                style={{
                  flex: 1,
                  minHeight: '48px',
                  borderRadius: '8px',
                  border: i === 0 ? '2px solid #16A34A' : COCKPIT_TOKENS.hairlines.default,
                  background: i === 0 ? COCKPIT_TOKENS.status.green.bg : COCKPIT_TOKENS.surfaces.cardBg,
                  color: i === 0 ? COCKPIT_TOKENS.status.green.text : COCKPIT_TOKENS.ink.primary,
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="cockpit-label" style={{ display: 'block', marginBottom: '8px' }}>
            Blood group
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map((g) => (
              <button
                key={g}
                type="button"
                style={{
                  minHeight: '48px',
                  borderRadius: '8px',
                  border: g === 'O-' ? '2px solid #16A34A' : COCKPIT_TOKENS.hairlines.default,
                  background: g === 'O-' ? COCKPIT_TOKENS.status.green.bg : COCKPIT_TOKENS.surfaces.cardBg,
                  color: g === 'O-' ? COCKPIT_TOKENS.status.green.text : COCKPIT_TOKENS.ink.primary,
                  fontFamily: COCKPIT_TOKENS.fonts.mono,
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="cockpit-label" style={{ display: 'block', marginBottom: '8px' }}>
            Units needed
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              style={{
                minWidth: '48px',
                minHeight: '48px',
                borderRadius: '8px',
                border: COCKPIT_TOKENS.hairlines.default,
                background: COCKPIT_TOKENS.surfaces.pageBg,
                fontSize: '18px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              −
            </button>
            <span style={{ fontSize: '24px', fontWeight: 700, minWidth: '48px', textAlign: 'center' }}>
              4u
            </span>
            <button
              type="button"
              style={{
                minWidth: '48px',
                minHeight: '48px',
                borderRadius: '8px',
                border: COCKPIT_TOKENS.hairlines.default,
                background: COCKPIT_TOKENS.surfaces.pageBg,
                fontSize: '18px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              +
            </button>
            <span style={{ fontSize: '13px', color: COCKPIT_TOKENS.ink.muted, marginLeft: '8px' }}>
              ≈ 4 adult clinical doses
            </span>
          </div>
        </div>
      </Sheet>
    </div>
  );
};

export default CockpitGallery;
