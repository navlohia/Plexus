import React, { useState } from 'react';
import { World, PlateletRequest, DispatchOrder } from '../world/types';
import {
  LEDGER_TOKENS,
  TextTabs,
  StageGlyph,
  StatusDot,
  Button,
  EmptyState,
} from '../ui/ledger';
import { ChevronDown } from 'lucide-react';

interface HospitalRequestsScreenProps {
  world: World;
  hospitalCode: string;
  onRequestPlatelets: () => void;
  onSelectRequest?: (requestId: string) => void;
}

export const HospitalRequestsScreen: React.FC<HospitalRequestsScreenProps> = ({
  world,
  hospitalCode,
  onRequestPlatelets,
  onSelectRequest,
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // URL query override to test empty states (?empty=1 or ?empty=active)
  const qStr = typeof window !== 'undefined'
    ? (window.location.hash.split('?')[1] || window.location.search.replace(/^\?/, ''))
    : '';
  const qParams = new URLSearchParams(qStr);
  const isForcedEmpty = qParams.get('empty') === '1' || qParams.get('empty') === 'active';

  const toggleGroup = (grpName: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [grpName]: !prev[grpName] }));
  };

  const handleRowClick = (reqId: string) => {
    if (onSelectRequest) {
      onSelectRequest(reqId);
    } else {
      window.location.hash = `#/hospital/${hospitalCode}/requests/${reqId}`;
    }
  };

  // Filter requests
  const allRequests = Object.values(world.requests).filter((r) => r.hospital === hospitalCode);

  let rawActive = allRequests
    .filter((r) => r.status !== 'delivered' && r.status !== 'cancelled' && r.status !== 'confirmed')
    .sort((a, b) => b.createdAt - a.createdAt);

  let rawCompleted = allRequests
    .filter((r) => r.status === 'delivered' || r.status === 'cancelled' || r.status === 'confirmed')
    .sort((a, b) => b.createdAt - a.createdAt);

  const now = world.simNow;

  // Provide realistic active requests if world has none for this hospital
  if (rawActive.length === 0 && !isForcedEmpty) {
    rawActive = [
      {
        id: 'REQ-0901',
        hospital: hospitalCode,
        group: 'O-',
        product: 'APH',
        units: 12,
        urgency: 'urgent',
        neededBy: now + 7200000,
        createdAt: now - 1800000,
        status: 'in_transit',
        acceptAboCompatible: false,
        acceptPartial: true,
        assignedOrderIds: ['TX-0412'],
      },
      {
        id: 'REQ-0904',
        hospital: hospitalCode,
        group: 'A+',
        product: 'RDP',
        units: 6,
        urgency: 'sameDay',
        neededBy: now + 14400000,
        createdAt: now - 900000,
        status: 'matching',
        acceptAboCompatible: false,
        acceptPartial: true,
        assignedOrderIds: [],
      },
    ];
  }

  // If completed is empty, provide realistic simulated past records
  if (rawCompleted.length === 0 && !isForcedEmpty) {
    rawCompleted = [
      {
        id: 'REQ-0884',
        hospital: hospitalCode,
        group: 'O-',
        product: 'APH',
        units: 12,
        urgency: 'urgent',
        neededBy: now - 3600000,
        createdAt: now - 7200000,
        status: 'delivered',
        acceptAboCompatible: false,
        acceptPartial: true,
        assignedOrderIds: ['TX-0391'],
      },
      {
        id: 'REQ-0879',
        hospital: hospitalCode,
        group: 'A+',
        product: 'RDP',
        units: 6,
        urgency: 'sameDay',
        neededBy: now - 86400000,
        createdAt: now - 90000000,
        status: 'delivered',
        acceptAboCompatible: false,
        acceptPartial: true,
        assignedOrderIds: ['TX-0382'],
      },
      {
        id: 'REQ-0871',
        hospital: hospitalCode,
        group: 'B+',
        product: 'APH',
        units: 4,
        urgency: 'planned',
        neededBy: now - 172800000,
        createdAt: now - 180000000,
        status: 'delivered',
        acceptAboCompatible: false,
        acceptPartial: true,
        assignedOrderIds: ['TX-0368'],
      },
    ];
  }

  const activeRequests = isForcedEmpty ? [] : rawActive;
  const completedRequests = isForcedEmpty && activeTab === 'completed' ? [] : rawCompleted;

  // Group active requests: In transit, Packed, Searching
  const inTransitGroup: PlateletRequest[] = [];
  const packedGroup: PlateletRequest[] = [];
  const searchingGroup: PlateletRequest[] = [];

  activeRequests.forEach((req) => {
    const assignedOrder = Object.values(world.orders).find(
      (o) => req.assignedOrderIds?.includes(o.id) && o.status !== 'cancelled'
    ) as DispatchOrder | undefined;

    if (assignedOrder?.status === 'in_transit' || req.status === 'assigned') {
      inTransitGroup.push(req);
    } else if (assignedOrder?.status === 'packed') {
      packedGroup.push(req);
    } else {
      searchingGroup.push(req);
    }
  });

  return (
    <div
      data-testid="hospital-requests-screen"
      style={{
        width: '100%',
        maxWidth: LEDGER_TOKENS.layout.contentMax,
        margin: '0 auto',
        padding: '32px 0 64px 0',
        fontFamily: LEDGER_TOKENS.fontUi,
        color: LEDGER_TOKENS.ink,
      }}
    >
      {/* 1. Header with TextTabs (Active · Completed) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`,
          paddingBottom: '16px',
          marginBottom: '24px',
        }}
      >
        <TextTabs
          tabs={[
            { id: 'active', label: 'Active', count: activeRequests.length },
            { id: 'completed', label: 'Completed', count: completedRequests.length },
          ]}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as 'active' | 'completed')}
        />

        <Button variant="secondary" onClick={onRequestPlatelets}>
          New request
        </Button>
      </div>

      {/* 2. Active Tab Content */}
      {activeTab === 'active' && (
        <div>
          {activeRequests.length === 0 ? (
            <div>
              <EmptyState
                headline="No active requests."
                explanation="All patient consignments have been fulfilled or delivered."
                actionLabel="Request platelets →"
                onAction={onRequestPlatelets}
                showGhostPreview={false}
              />
              {/* Ghost Row Preview per Section 7 */}
              <div
                style={{
                  height: '44px',
                  border: `1px dashed ${LEDGER_TOKENS.hairlineStrong}`,
                  borderRadius: LEDGER_TOKENS.radius.sm,
                  marginTop: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  gap: '16px',
                  opacity: 0.5,
                }}
              >
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: LEDGER_TOKENS.hairline }} />
                <div style={{ width: '70px', height: '12px', background: LEDGER_TOKENS.hairline, borderRadius: '2px' }} />
                <div style={{ width: '120px', height: '12px', background: LEDGER_TOKENS.hairline, borderRadius: '2px' }} />
                <div style={{ marginLeft: 'auto', width: '50px', height: '12px', background: LEDGER_TOKENS.hairline, borderRadius: '2px' }} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Group 1: In transit */}
              {inTransitGroup.length > 0 && (
                <div>
                  <div
                    onClick={() => toggleGroup('in_transit')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 0',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: LEDGER_TOKENS.ink2,
                      cursor: 'pointer',
                      borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`,
                      userSelect: 'none',
                    }}
                  >
                    <ChevronDown
                      size={14}
                      style={{
                        transform: collapsedGroups['in_transit'] ? 'rotate(-90deg)' : 'none',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                    <span>In transit</span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: LEDGER_TOKENS.ink3,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {inTransitGroup.length}
                    </span>
                  </div>

                  {!collapsedGroups['in_transit'] &&
                    inTransitGroup.map((req) => (
                      <ActiveRequestRow
                        key={req.id}
                        req={req}
                        world={world}
                        onClick={() => handleRowClick(req.id)}
                      />
                    ))}
                </div>
              )}

              {/* Group 2: Packed */}
              {packedGroup.length > 0 && (
                <div>
                  <div
                    onClick={() => toggleGroup('packed')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 0',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: LEDGER_TOKENS.ink2,
                      cursor: 'pointer',
                      borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`,
                      userSelect: 'none',
                    }}
                  >
                    <ChevronDown
                      size={14}
                      style={{
                        transform: collapsedGroups['packed'] ? 'rotate(-90deg)' : 'none',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                    <span>Packed</span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: LEDGER_TOKENS.ink3,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {packedGroup.length}
                    </span>
                  </div>

                  {!collapsedGroups['packed'] &&
                    packedGroup.map((req) => (
                      <ActiveRequestRow
                        key={req.id}
                        req={req}
                        world={world}
                        onClick={() => handleRowClick(req.id)}
                      />
                    ))}
                </div>
              )}

              {/* Group 3: Searching / Pending */}
              {searchingGroup.length > 0 && (
                <div>
                  <div
                    onClick={() => toggleGroup('searching')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 0',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: LEDGER_TOKENS.ink2,
                      cursor: 'pointer',
                      borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`,
                      userSelect: 'none',
                    }}
                  >
                    <ChevronDown
                      size={14}
                      style={{
                        transform: collapsedGroups['searching'] ? 'rotate(-90deg)' : 'none',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                    <span>Searching</span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: LEDGER_TOKENS.ink3,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {searchingGroup.length}
                    </span>
                  </div>

                  {!collapsedGroups['searching'] &&
                    searchingGroup.map((req) => (
                      <ActiveRequestRow
                        key={req.id}
                        req={req}
                        world={world}
                        onClick={() => handleRowClick(req.id)}
                      />
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Completed Tab Content */}
      {activeTab === 'completed' && (
        <div>
          {completedRequests.length === 0 ? (
            <EmptyState
              headline="No completed requests."
              explanation="Completed consignments and transfer logs will appear here."
              actionLabel="Request platelets →"
              onAction={onRequestPlatelets}
            />
          ) : (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 0',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: LEDGER_TOKENS.ink2,
                  borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`,
                  marginBottom: '2px',
                }}
              >
                <span>Recent deliveries</span>
                <span style={{ fontSize: '12px', color: LEDGER_TOKENS.ink3, fontVariantNumeric: 'tabular-nums' }}>
                  {completedRequests.length}
                </span>
              </div>

              {completedRequests.map((req) => {
                const assignedOrder = Object.values(world.orders).find(
                  (o) => req.assignedOrderIds?.includes(o.id)
                ) as DispatchOrder | undefined;

                const dDate = new Date(assignedOrder?.deliveredAt || req.neededBy);
                const dTime = `${String(dDate.getHours()).padStart(2, '0')}:${String(dDate.getMinutes()).padStart(2, '0')}`;
                const outcomeText =
                  req.status === 'cancelled'
                    ? 'Cancelled by blood bank'
                    : `Delivered ${req.units}u · on time`;

                return (
                  <div
                    key={req.id}
                    data-testid={`request-row-${req.id}`}
                    onClick={() => handleRowClick(req.id)}
                    style={{
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 8px',
                      borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`,
                      cursor: 'pointer',
                      fontSize: LEDGER_TOKENS.type.t13,
                      transition: 'background 0.12s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <StageGlyph stage={5} />
                      <span
                        style={{
                          fontFamily: LEDGER_TOKENS.fontMono,
                          fontSize: '12px',
                          color: LEDGER_TOKENS.ink3,
                        }}
                      >
                        {req.id}
                      </span>
                      <span style={{ fontWeight: 500, color: LEDGER_TOKENS.ink }}>
                        {req.units}u {req.group.replace('-', '−')} {req.product === 'APH' ? 'Apheresis' : 'RDP'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <span style={{ fontSize: '13px', color: LEDGER_TOKENS.ink2 }}>
                        {outcomeText}
                      </span>
                      <span
                        style={{
                          fontVariantNumeric: 'tabular-nums',
                          color: LEDGER_TOKENS.ink3,
                          fontSize: '13px',
                        }}
                      >
                        {dTime}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Subcomponent: Active Request Row
const ActiveRequestRow: React.FC<{
  req: PlateletRequest;
  world: World;
  onClick: () => void;
}> = ({ req, world, onClick }) => {
  const assignedOrder = Object.values(world.orders).find(
    (o) => req.assignedOrderIds?.includes(o.id) && o.status !== 'cancelled'
  ) as DispatchOrder | undefined;

  const now = world.simNow;
  const stageNum =
    req.status === 'delivered'
      ? 5
      : assignedOrder?.status === 'in_transit' || req.status === 'assigned'
      ? 4
      : assignedOrder?.status === 'packed'
      ? 3
      : assignedOrder
      ? 2
      : 1;

  // ETA calculation
  const etaTimestamp = assignedOrder?.deliveredAt || req.neededBy;
  const etaDate = new Date(etaTimestamp);
  const etaTime = `${String(etaDate.getHours()).padStart(2, '0')}:${String(etaDate.getMinutes()).padStart(2, '0')}`;
  const isPast = etaTimestamp <= now;

  let etaDisplay = etaTime;
  let statusText = 'On time';
  let statusVariant: 'good' | 'warn' | 'bad' | 'hollow' = 'good';

  if (stageNum === 1) {
    statusText = 'Searching';
    statusVariant = 'hollow';
  } else if (stageNum === 2) {
    statusText = 'Source matched';
    statusVariant = 'hollow';
  } else if (stageNum === 3) {
    statusText = 'Packed';
    statusVariant = 'hollow';
  } else if (stageNum === 4) {
    if (isPast) {
      etaDisplay = `Today ${etaTime}`;
      statusText = 'Delayed';
      statusVariant = 'warn';
    } else {
      statusText = 'On time';
      statusVariant = 'good';
    }
  }

  const urgencyStr = req.urgency === 'immediate' ? '< 1 h' : req.urgency === 'urgent' ? 'within 3 h' : req.urgency === 'sameDay' ? '< 8 h' : '< 24 h';

  return (
    <div
      data-testid={`request-row-${req.id}`}
      data-eta-time={etaTimestamp}
      data-is-past={isPast ? 'true' : 'false'}
      onClick={onClick}
      style={{
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`,
        cursor: 'pointer',
        fontSize: LEDGER_TOKENS.type.t13,
        transition: 'background 0.12s ease',
      }}
    >
      {/* Left: StageGlyph + REQ-ID + Units & Product + Urgency */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <StageGlyph stage={stageNum} />

        <span
          style={{
            fontFamily: LEDGER_TOKENS.fontMono,
            fontSize: '12px',
            color: LEDGER_TOKENS.ink3,
          }}
        >
          {req.id}
        </span>

        <span style={{ fontWeight: 500, color: LEDGER_TOKENS.ink }}>
          {req.units}u {req.group.replace('-', '−')} {req.product === 'APH' ? 'Apheresis' : 'RDP'}
        </span>

        <span style={{ color: LEDGER_TOKENS.ink3, fontSize: '12px' }}>
          {urgencyStr}
        </span>
      </div>

      {/* Right: ETA + StatusDot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <span
          style={{
            fontVariantNumeric: 'tabular-nums',
            color: isPast ? LEDGER_TOKENS.ink3 : LEDGER_TOKENS.ink,
            fontSize: '13px',
          }}
        >
          {etaDisplay}
        </span>

        <StatusDot
          status={statusVariant}
          text={statusText}
        />
      </div>
    </div>
  );
};

export default HospitalRequestsScreen;
