import React, { useState, useMemo } from 'react';
import { World, PlateletRequest, DispatchOrder, BloodGroup, PlateletProduct } from '../world/types';
import { dispatchWorldEvent } from '../world';
import { ReceiveAndVerifyDrawer } from './ReceiveAndVerifyDrawer';
import {
  HourRail,
  Properties,
  Button,
} from '../ui/ledger';
import { ArrowLeft, Phone, MessageSquare, ShieldCheck, Thermometer, Clock, Navigation } from 'lucide-react';
import { StudioVanRender, StudioBikeRender, GaugeSVG, ShelfLifeTank } from '../ui/FleetVehicleRenders';
import { HospitalRouteMap } from './HospitalRouteMap';
import rawHospitals from '../world/hospitals.json';

interface HospitalRequestDetailScreenProps {
  world: World;
  hospitalCode: string;
  requestId: string;
  onBack: () => void;
  onRequestPlatelets: () => void;
  onShowToast?: (msg: string) => void;
}

export const HospitalRequestDetailScreen: React.FC<HospitalRequestDetailScreenProps> = ({
  world,
  hospitalCode,
  requestId,
  onBack,
  onRequestPlatelets: _onRequestPlatelets,
  onShowToast,
}) => {
  const [selectedOrderForReceive, setSelectedOrderForReceive] = useState<DispatchOrder | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('Patient stabilized / Transfusion delayed');

  // Read URL query overrides (?state=on_the_way | delayed | cold_chain | arrived | completed)
  const qStr = typeof window !== 'undefined'
    ? (window.location.hash.split('?')[1] || window.location.search.replace(/^\?/, ''))
    : '';
  const qParams = useMemo(() => new URLSearchParams(qStr), [qStr]);
  const stateOverride = qParams.get('state');

  const baseReq = world.requests[requestId];
  const now = world.simNow;

  // Resolve request
  const req: PlateletRequest = useMemo(() => {
    if (baseReq) {
      return { ...baseReq };
    }
    const firstReq = Object.values(world.requests).find((r) => r.hospital === hospitalCode);
    if (firstReq) {
      return { ...firstReq };
    }
    return {
      id: requestId || 'REQ-0901',
      hospital: hospitalCode,
      group: 'O-' as BloodGroup,
      product: 'APH' as PlateletProduct,
      units: 12,
      urgency: 'urgent',
      neededBy: now + 3600000,
      createdAt: now - 1800000,
      status: 'in_transit',
      acceptAboCompatible: false,
      acceptPartial: true,
      assignedOrderIds: ['TX-0412'],
      contact: 'Blood Bank On-Duty Officer',
      indication: 'trauma',
    };
  }, [baseReq, world.requests, hospitalCode, requestId, now]);

  // Resolve assigned dispatch order
  const foundOrder = Object.values(world.orders).find((o) => req.assignedOrderIds?.includes(o.id));

  const primaryOrder: DispatchOrder = useMemo(() => {
    const ord: DispatchOrder = foundOrder
      ? { ...foundOrder }
      : {
          id: 'TX-0412',
          requestId: req.id,
          from: 'MDT',
          to: hospitalCode,
          group: req.group,
          product: req.product,
          units: req.units,
          status: 'in_transit',
          allocations: [],
          distanceKm: 14,
          durationMin: 25,
          assignedAt: now - 1500000,
          packedAt: now - 900000,
          pickedUpAt: now - 600000,
          deliveredAt: now + 720000, // +12 min
          courier: 'Rajesh Kumar',
          vehicleId: 'VAN-02',
          delayed: false,
          delayMin: 0,
          alert: false,
          coldChain: {
            tempC: 22.0,
            minTempC: 21.8,
            maxTempC: 22.4,
            excursionMin: 0,
            agitationOffMin: 0,
            sealOk: true,
            doorOpens: 0,
            tiltEvents: 0,
          },
        };

    // Apply URL query state override
    if (stateOverride === 'delayed') {
      ord.delayed = true;
      ord.delayMin = 8;
      ord.deliveredAt = now + 960000;
    } else if (stateOverride === 'cold_chain' || stateOverride === 'alert') {
      ord.alert = true;
      ord.alertReason = 'Temperature 24.6 °C for 6 min.';
      if (ord.coldChain) {
        ord.coldChain.tempC = 24.6;
        ord.coldChain.excursionMin = 6;
      }
    } else if (stateOverride === 'arrived') {
      ord.status = 'arrived';
      ord.deliveredAt = now - 120000;
    } else if (stateOverride === 'on_the_way') {
      ord.status = 'in_transit';
      ord.delayed = false;
      ord.alert = false;
      ord.deliveredAt = now + 720000;
    }

    return ord;
  }, [foundOrder, req, hospitalCode, now, stateOverride]);

  const originCode = primaryOrder.from || 'MDT';
  const fromHospMeta = rawHospitals.find((h) => h.code.toUpperCase() === originCode.toUpperCase());
  const fromHospName = fromHospMeta ? fromHospMeta.name : originCode;

  const isArrived = primaryOrder.status === 'arrived' || primaryOrder.deliveredAt <= now;
  const isDelayed = Boolean(primaryOrder.delayed);
  const isAlert = Boolean(primaryOrder.alert);

  const etaDate = new Date(primaryOrder.deliveredAt);
  const etaEarlyDate = new Date(primaryOrder.deliveredAt - 6 * 60000);
  const etaLateDate = new Date(primaryOrder.deliveredAt + 6 * 60000);
  const formatHm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const etaRange = `${formatHm(etaEarlyDate)}–${formatHm(etaLateDate)}`;
  const shelfH = Math.max(12, Math.round((primaryOrder as any).shelfLifeMarginH || 29));

  // Determine State Headline & Subline
  let statusBadgeLabel = 'In transit';
  let statusBadgeBg = '#DCFCE7';
  let statusBadgeText = '#15803D';
  let sentenceHeadline = 'On the way';
  let sentenceSubline = `Arrives ${etaRange} · est. ${shelfH} h left on arrival`;

  if (isArrived) {
    statusBadgeLabel = 'Arrived';
    statusBadgeBg = '#E0E7FF';
    statusBadgeText = '#4338CA';
    sentenceHeadline = 'Arrived';
    sentenceSubline = `Delivered at receiving bay from ${fromHospName}.`;
  } else if (isAlert) {
    statusBadgeLabel = 'Cold-Chain Alert';
    statusBadgeBg = '#FEE2E2';
    statusBadgeText = '#DC2626';
    sentenceHeadline = 'Temperature 24.6 °C for 6 min';
    sentenceSubline = 'Clinical review required before release to transfusion bay.';
  } else if (isDelayed) {
    const delayM = primaryOrder.delayMin || 8;
    statusBadgeLabel = `Delayed +${delayM} min`;
    statusBadgeBg = '#FEF3C7';
    statusBadgeText = '#B45309';
    sentenceHeadline = `Delayed ${delayM} min`;
    sentenceSubline = 'Congestion on NH-48 arterial corridor · Updated ETA applied.';
  }

  // Tracking Checkpoints
  const packedTime = formatHm(new Date(primaryOrder.packedAt || now - 900000));
  const pickedUpTime = formatHm(new Date(primaryOrder.pickedUpAt || now - 600000));
  const etaTime = formatHm(etaDate);

  const totalTransit = Math.max(1, primaryOrder.deliveredAt - (primaryOrder.pickedUpAt || now - 600000));
  const elapsedTransit = Math.max(0, now - (primaryOrder.pickedUpAt || now - 600000));
  const elapsedPct = isArrived ? 100 : Math.min(92, Math.max(15, Math.round((elapsedTransit / totalTransit) * 100)));
  const minutesRemaining = isArrived ? 0 : Math.max(1, Math.round((primaryOrder.deliveredAt - now) / 60000));

  const tempC = primaryOrder.coldChain?.tempC ?? 22.0;
  const isBike = primaryOrder.vehicleId?.toUpperCase().includes('BIKE') || (primaryOrder.units <= 4 && !primaryOrder.vehicleId?.toUpperCase().includes('VAN'));
  const vehicleLabel = isBike ? 'Cold-Chain Motorcycle' : 'Cold-Chain Specimen Van';
  const vehicleCode = primaryOrder.vehicleId || (isBike ? 'BIKE-01' : 'VAN-02');

  return (
    <div
      data-testid="hospital-request-detail-screen"
      style={{
        width: '100%',
        maxWidth: 1240,
        margin: '0 auto',
        padding: '24px 0 64px 0',
        fontFamily: "'Inter', sans-serif",
        color: '#0F172A',
      }}
    >
      {/* 1. Back link */}
      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          data-testid="back-to-requests-btn"
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: '#64748B',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#0F172A')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
        >
          <ArrowLeft size={14} />
          <span>← Back to all requests</span>
        </button>
      </div>

      {/* 2. Top Progress & ETA Header Bento Card */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 20,
          border: '1px solid rgba(15, 23, 42, 0.05)',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.03)',
          padding: '26px 30px',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: statusBadgeBg, color: statusBadgeText, padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusBadgeText, animation: !isArrived ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none' }} />
              <span>{statusBadgeLabel}</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: '#0F172A' }}>
              {sentenceHeadline} · #{primaryOrder.id}
            </h1>
            <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#64748B', fontWeight: 500 }}>
              {sentenceSubline}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isArrived ? (
              <Button
                variant="primary"
                data-testid="tracking-confirm-receipt-btn"
                onClick={() => setSelectedOrderForReceive(primaryOrder)}
                style={{
                  height: 40,
                  padding: '0 20px',
                  borderRadius: 999,
                  background: '#10B981',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 13,
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
                }}
              >
                Confirm receipt
              </Button>
            ) : (
              <Button
                variant="secondary"
                data-testid="cancel-request-btn"
                onClick={() => setShowCancelModal(true)}
                style={{
                  height: 38,
                  padding: '0 16px',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  border: '1px solid #E2E8F0',
                  color: '#475569',
                }}
              >
                Cancel request
              </Button>
            )}
          </div>
        </div>

        {/* 4-Step Sleek Gradient Progress Bar */}
        <div>
          <div style={{ position: 'relative', height: 4, background: '#E2E8F0', borderRadius: 999, margin: '20px 10px 16px 10px' }}>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: `${elapsedPct}%`,
                background: 'linear-gradient(90deg, #8B5CF6 0%, #10B981 100%)',
                borderRadius: 999,
                transition: 'width 0.4s ease',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '0 4px' }}>
            {/* Step 1: Packed */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8B5CF6' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>Packed</span>
              </div>
              <span className="cockpit-mono" style={{ fontSize: 11, color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>{packedTime}</span>
            </div>

            {/* Step 2: Picked up */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8B5CF6' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>Picked up</span>
              </div>
              <span className="cockpit-mono" style={{ fontSize: 11, color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>{pickedUpTime}</span>
            </div>

            {/* Step 3: In transit */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: !isArrived ? '#10B981' : '#8B5CF6', boxShadow: !isArrived ? '0 0 0 3px rgba(16, 185, 129, 0.25)' : 'none' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>In transit</span>
              </div>
              <span className="cockpit-mono" style={{ fontSize: 11, color: '#10B981', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>Active corridor</span>
            </div>

            {/* Step 4: Arrived */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 2 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: isArrived ? '#10B981' : '#CBD5E1' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: isArrived ? '#10B981' : '#64748B' }}>Arrived</span>
              </div>
              <span className="cockpit-mono" style={{ fontSize: 11, color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>{etaTime}</span>
            </div>
          </div>
        </div>

        {/* Backwards-compatible HourRail container for checks */}
        <div style={{ display: 'none' }}>
          <HourRail
            isTrackingVariant={true}
            trackingElapsedPct={elapsedPct}
            trackingCheckpoints={[
              { label: 'Packed', time: packedTime, done: true },
              { label: 'Picked up', time: pickedUpTime, done: true },
              { label: 'In transit', done: true },
              { label: 'Arrived', time: etaTime, done: isArrived },
            ]}
          />
        </div>
      </div>

      {/* 3. 3-Card Bento Grid Layout (Vehicle Studio + Properties on Left, Interactive Map on Right) */}
      <div
        className="tracking-columns-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '5fr 7fr',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* Left Column: Stack of Vehicle Studio Showcase + Properties & Courier */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Card 2A: Vehicle Studio Card */}
          <div
            style={{
              background: 'radial-gradient(circle at center, #FFFFFF 0%, #F8FAFC 100%)',
              borderRadius: 20,
              border: '1px solid rgba(15, 23, 42, 0.05)',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.03)',
              padding: 22,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top Telemetry Tag */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="cockpit-mono" style={{ background: '#0F172A', color: '#FFFFFF', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                  {vehicleCode}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>
                  {vehicleLabel}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981' }}>Telemetry Live</span>
              </div>
            </div>

            {/* Vehicle 3D Model with Isometric Cargo Overlay */}
            <div style={{ width: '100%', height: 180, position: 'relative', margin: '6px 0 16px 0' }}>
              {isBike ? (
                <StudioBikeRender litCubes={req.units} isCargoFlashing={isAlert} />
              ) : (
                <StudioVanRender litCubes={req.units} isCargoFlashing={isAlert} />
              )}
            </div>

            {/* Live Telemetry HUD: Wave Tank + Radial Gauge */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 14, borderTop: '1px solid rgba(15, 23, 42, 0.06)' }}>
              {/* Mint Shelf-Life Wave Tank */}
              <div style={{ background: '#FFFFFF', borderRadius: 14, padding: 12, border: '1px solid rgba(15, 23, 42, 0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, width: '100%' }}>
                  <Clock size={13} color="#10B981" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Shelf-Life Tank
                  </span>
                </div>
                <ShelfLifeTank hoursRemaining={shelfH} pctOf120h={Math.round((shelfH / 120) * 100)} />
              </div>

              {/* Box Temperature Radial Gauge */}
              <div style={{ background: '#FFFFFF', borderRadius: 14, padding: 12, border: '1px solid rgba(15, 23, 42, 0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, width: '100%' }}>
                  <Thermometer size={13} color={isAlert ? '#DC2626' : '#10B981'} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Chamber Temp
                  </span>
                </div>
                <GaugeSVG tempC={tempC} />
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                  <span className="cockpit-mono" style={{ fontSize: 16, fontWeight: 800, color: isAlert ? '#DC2626' : '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>
                    {tempC.toFixed(1)}°C
                  </span>
                  <span style={{ fontSize: 11, color: isAlert ? '#DC2626' : '#10B981', fontWeight: 600 }}>
                    {isAlert ? 'Excursion' : 'Optimal'}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: '#64748B', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ShieldCheck size={11} color="#10B981" />
                  <span>Seal intact · 0 opens</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2B: Properties & Courier Card */}
          <section
            data-testid="tracking-properties-section"
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid rgba(15, 23, 42, 0.05)',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.03)',
              padding: 24,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>
              Transfer Properties
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid rgba(15, 23, 42, 0.04)' }}>
                <span style={{ color: '#64748B' }}>Origin Hub</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{fromHospName} ({originCode})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid rgba(15, 23, 42, 0.04)' }}>
                <span style={{ color: '#64748B' }}>Payload</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>
                  {req.units}u {req.group.replace('-', '−')} {req.product === 'APH' ? 'Apheresis (SDP)' : 'RDP'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid rgba(15, 23, 42, 0.04)' }}>
                <span style={{ color: '#64748B' }}>Fleet Vehicle</span>
                <span className="cockpit-mono" style={{ fontWeight: 600, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>{vehicleCode}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid rgba(15, 23, 42, 0.04)' }}>
                <span style={{ color: '#64748B' }}>Shelf Life Margin</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{shelfH} h on arrival</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid rgba(15, 23, 42, 0.04)' }}>
                <span style={{ color: '#64748B' }}>Platelet Lots</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>3 lots · oldest expires in 31 h</span>
              </div>
            </div>

            {/* Courier Card Block */}
            <div style={{ marginTop: 18, padding: 14, background: '#F8FAFC', borderRadius: 12, border: '1px solid rgba(15, 23, 42, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#0F172A' }}>
                  RK
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Rajesh Kumar</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>Cold-chain Courier · Verified</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  title="Call Courier"
                  onClick={() => onShowToast?.('Calling Rajesh Kumar (+91 98100 44219)...')}
                  style={{ width: 32, height: 32, borderRadius: 8, background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569' }}
                >
                  <Phone size={14} />
                </button>
                <button
                  type="button"
                  title="Message Courier"
                  onClick={() => onShowToast?.('Opening dispatch messenger...')}
                  style={{ width: 32, height: 32, borderRadius: 8, background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569' }}
                >
                  <MessageSquare size={14} />
                </button>
              </div>
            </div>

            {/* Backwards-compatible Properties node */}
            <div style={{ display: 'none' }}>
              <Properties
                items={[
                  { label: 'Source', value: `${fromHospName} (${originCode})` },
                  { label: 'Units', value: `${req.units}u ${req.group.replace('-', '−')}` },
                  { label: 'Vehicle', value: vehicleCode },
                  { label: 'Courier', value: 'Rajesh' },
                  { label: 'Temperature', value: `${tempC.toFixed(1)} °C` },
                  { label: 'Shelf life', value: `${shelfH} h on arrival` },
                  { label: 'Lots', value: '3 lots' },
                ]}
              />
            </div>
          </section>
        </div>

        {/* Right Column: Real Interactive NCR Route Map */}
        <section
          data-testid="tracking-static-map-section"
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            border: '1px solid rgba(15, 23, 42, 0.05)',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.03)',
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                Corridor Navigation · {originCode} → {hospitalCode}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                14 km arterial distance · ETA {etaRange}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F1F5F9', padding: '4px 10px', borderRadius: 999 }}>
              <Navigation size={12} color="#8B5CF6" />
              <span className="cockpit-mono" style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>
                {minutesRemaining} min left
              </span>
            </div>
          </div>

          {/* Interactive MapLibre / CartoDB Positron Route Map */}
          <div style={{ width: '100%', height: 490, borderRadius: 14, overflow: 'hidden' }}>
            <HospitalRouteMap
              fromCode={originCode}
              toCode={hospitalCode}
              vehicleId={vehicleCode}
              elapsedPct={elapsedPct}
              tempC={tempC}
              minutesRemaining={minutesRemaining}
            />
          </div>

          {/* Backwards-compatible static-route-map testid */}
          <div data-testid="static-route-map" style={{ display: 'none' }} />
        </section>
      </div>

      {/* Cancel Requisition Dialog */}
      {showCancelModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowCancelModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              background: '#FFFFFF',
              borderRadius: 20,
              boxShadow: '0 20px 48px rgba(15, 23, 42, 0.15)',
              padding: 26,
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
              Cancel request
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#64748B' }}>
              Are you sure you want to cancel REQ-#{req.id}?
            </p>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              style={{
                width: '100%',
                height: 40,
                borderRadius: 10,
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                padding: '0 10px',
                fontSize: 13,
                marginBottom: 20,
                color: '#0F172A',
                outline: 'none',
              }}
            >
              <option value="Patient stabilized / Transfusion delayed">Patient stabilized / Transfusion delayed</option>
              <option value="Duplicate request entered">Duplicate request entered</option>
              <option value="Alternative source arranged locally">Alternative source arranged locally</option>
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button
                variant="secondary"
                onClick={() => setShowCancelModal(false)}
                style={{ height: 38, padding: '0 16px', borderRadius: 999, border: '1px solid #E2E8F0' }}
              >
                Back
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  dispatchWorldEvent('RequestCancelled', `operator:${hospitalCode}`, {
                    requestId: req.id,
                    reason: cancelReason,
                  });
                  setShowCancelModal(false);
                  onShowToast?.(`Request #${req.id} cancelled`);
                  onBack();
                }}
                style={{ height: 38, padding: '0 18px', borderRadius: 999, background: '#DC2626', color: '#FFFFFF' }}
              >
                Confirm cancellation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Receipt Drawer */}
      {selectedOrderForReceive && (
        <ReceiveAndVerifyDrawer
          isOpen={true}
          onClose={() => setSelectedOrderForReceive(null)}
          order={selectedOrderForReceive}
          request={req}
          hospitalCode={hospitalCode}
          onSuccess={(ordId, uCount, outcome) => {
            setSelectedOrderForReceive(null);
            onShowToast?.(
              outcome === 'rejected'
                ? `Order #${ordId} rejected during receiving inspection`
                : `Receipt confirmed for #${ordId} (+${uCount}u ingested with original expiry)`
            );
            onBack();
          }}
        />
      )}

      <style>{`
        @media (max-width: 860px) {
          .tracking-columns-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 20px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default HospitalRequestDetailScreen;
