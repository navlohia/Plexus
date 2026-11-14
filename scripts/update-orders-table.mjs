import fs from 'fs';
import path from 'path';

const filePath = path.resolve('frontend/src/components/workspace/MoveonDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = `{/* Table rows */}`;
const endMarker = `              )}\r\n            </div>`;
const endMarkerLF = `              )}\n            </div>`;

let startIndex = content.indexOf(startMarker);
let endIndex = content.indexOf(endMarker);
let endLength = endMarker.length;

if (endIndex === -1) {
  endIndex = content.indexOf(endMarkerLF);
  endLength = endMarkerLF.length;
}

console.log('startIndex:', startIndex, 'endIndex:', endIndex);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found!');
  process.exit(1);
}

const replacement = `                {/* Table rows container */}
                <div
                  data-testid="orders-table-body"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    overflowY: 'auto',
                    minHeight: 0,
                  }}
                >
                  {activeTab === 'proposed' ? (
                    (() => {
                      const visibleRequests = showAllEarlier ? incomingRequests : incomingRequests.slice(0, 8);
                      return (
                        <>
                          {visibleRequests.map((req) => (
                            <div
                              key={req.id}
                              data-testid={\`request-row-\${req.id}\`}
                              onClick={() => setModalRequestId(req.id)}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '85px 135px 145px 80px 85px 1fr',
                                gap: 8,
                                alignItems: 'center',
                                height: 44,
                                minHeight: 44,
                                maxHeight: 44,
                                borderBottom: '1px solid #F4F4F5',
                                background: modalRequestId === req.id ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                                padding: '0 4px',
                                cursor: 'pointer',
                                boxSizing: 'border-box',
                                transition: 'background 0.15s ease',
                              }}
                            >
                              {/* 1. Request (#REQ-mono) */}
                              <div>
                                <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, fontWeight: 500, color: '#18181B' }}>
                                  #{req.id}
                                </span>
                              </div>

                              {/* 2. Hospital (plain mono code + sans name) */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
                                <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, fontWeight: 600, color: '#18181B' }}>
                                  {req.targetHospital}
                                </span>
                                <span style={{ fontSize: 11, color: '#71717A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {HOSPITAL_DIRECTORY[req.targetHospital]?.name?.split(' ')[0] || req.targetHospital}
                                </span>
                              </div>

                              {/* 3. Need (12u O− Apheresis) */}
                              <div style={{ fontSize: 12, fontWeight: 500, color: '#18181B', whiteSpace: 'nowrap' }}>
                                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{req.neededUnits}u </span>
                                <BloodGroup group={req.bloodGroup} />
                                <span style={{ color: '#71717A', fontSize: 11 }}> {req.product}</span>
                              </div>

                              {/* 4. Deficit (−15u with state dot) */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <StatusDot variant={req.urgency === 'Critical' ? 'bad' : 'warn'} />
                                <span style={{ fontSize: 12, fontWeight: 500, color: req.urgency === 'Critical' ? '#DC2626' : '#B45309', fontVariantNumeric: 'tabular-nums' }}>
                                  {req.deficitStr.startsWith('-') ? req.deficitStr.replace('-', '−') : \`−\${req.deficitStr}\`}
                                </span>
                              </div>

                              {/* 5. Needed within */}
                              <div style={{ fontSize: 12, color: '#71717A', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                {req.estWindow.replace(' min', 'm').replace(' h', 'h')}
                              </div>

                              {/* 6. Action (Assign text button) */}
                              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  data-testid={\`assign-btn-\${req.id}\`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalRequestId(req.id);
                                  }}
                                  style={{
                                    background: 'transparent',
                                    color: '#18181B',
                                    border: 'none',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    padding: '4px 6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 2,
                                  }}
                                >
                                  Assign →
                                </button>
                              </div>
                            </div>
                          ))}

                          {incomingRequests.length > 8 && !showAllEarlier && (
                            <button
                              type="button"
                              data-testid="show-earlier-btn"
                              onClick={() => setShowAllEarlier(true)}
                              style={{
                                width: '100%',
                                padding: '8px 0',
                                background: 'transparent',
                                border: 'none',
                                borderTop: '1px solid #F4F4F5',
                                color: '#71717A',
                                fontSize: 11,
                                fontWeight: 500,
                                cursor: 'pointer',
                                textAlign: 'center',
                                marginTop: 4,
                              }}
                            >
                              Show earlier ({incomingRequests.length - 8} more) ↓
                            </button>
                          )}
                        </>
                      );
                    })()
                  ) : activeTab === 'in_transit' ? (
                    (() => {
                      const visibleOrders = showAllEarlier ? filteredOrders : filteredOrders.slice(0, 8);
                      return (
                        <>
                          {visibleOrders.map((order) => {
                            const isSelected = activeOrder?.id === order.id;
                            return (
                              <div
                                key={order.id}
                                data-testid={\`order-row-\${order.id}\`}
                                onClick={() => selectOrder(order.id)}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '80px 110px 50px 140px 180px 1fr',
                                  gap: 8,
                                  alignItems: 'center',
                                  height: 44,
                                  minHeight: 44,
                                  maxHeight: 44,
                                  borderBottom: '1px solid #F4F4F5',
                                  background: isSelected ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                                  padding: '0 4px',
                                  cursor: 'pointer',
                                  boxSizing: 'border-box',
                                  transition: 'background 0.15s ease',
                                }}
                              >
                                {/* 1. Order (mono) */}
                                <div>
                                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, fontWeight: 500, color: '#18181B' }}>
                                    #{order.id}
                                  </span>
                                </div>

                                {/* 2. Route (mono) */}
                                <div>
                                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: '#18181B' }}>
                                    {order.from} → {order.to}
                                  </span>
                                </div>

                                {/* 3. Units (tabular, right-aligned) */}
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#18181B' }}>
                                    {order.units}u
                                  </span>
                                </div>

                                {/* 4. Courier and vehicle */}
                                <div style={{ fontSize: 12, color: '#18181B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {order.courier.name.split(' ')[0]} <span style={{ color: '#71717A', fontSize: 11 }}>· {order.courier.vehicleId || 'VAN-01'}</span>
                                </div>

                                {/* 5. ETA (with 56 px mini rail per spec section 10) */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 12, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: '#18181B', whiteSpace: 'nowrap' }}>
                                    {order.etaTime} · {order.etaMin ?? 7} min
                                  </span>
                                  <div
                                    data-testid={\`mini-rail-\${order.id}\`}
                                    style={{
                                      width: 56,
                                      height: 4,
                                      background: '#E4E4E7',
                                      borderRadius: 2,
                                      overflow: 'hidden',
                                      flexShrink: 0,
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: \`\${Math.max(12, Math.min(56, Math.round((order.progress || 0.45) * 56)))}px\`,
                                        height: '100%',
                                        background: order.hasTempExcursion ? '#DC2626' : order.isDelayed ? '#D97706' : '#18181B',
                                        borderRadius: 2,
                                      }}
                                    />
                                  </div>
                                </div>

                                {/* 6. StatusDot */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                                  <StatusDot variant={order.hasTempExcursion ? 'bad' : order.isDelayed ? 'delayed' : 'ontime'} />
                                  <span style={{ fontSize: 11, color: order.hasTempExcursion ? '#DC2626' : order.isDelayed ? '#D97706' : '#71717A' }}>
                                    {order.hasTempExcursion ? 'Alert' : order.isDelayed ? 'Delayed' : 'On time'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}

                          {filteredOrders.length > 8 && !showAllEarlier && (
                            <button
                              type="button"
                              data-testid="show-earlier-btn"
                              onClick={() => setShowAllEarlier(true)}
                              style={{
                                width: '100%',
                                padding: '8px 0',
                                background: 'transparent',
                                border: 'none',
                                borderTop: '1px solid #F4F4F5',
                                color: '#71717A',
                                fontSize: 11,
                                fontWeight: 500,
                                cursor: 'pointer',
                                textAlign: 'center',
                                marginTop: 4,
                              }}
                            >
                              Show earlier ({filteredOrders.length - 8} more) ↓
                            </button>
                          )}
                        </>
                      );
                    })()
                  ) : activeTab === 'delivered' ? (
                    (() => {
                      const now = simClock.now();
                      const deliveredToday = filteredOrders.filter(o => !o.deliveredAtMs || (now - o.deliveredAtMs) < 24 * 3600 * 1000);
                      const deliveredYesterday = filteredOrders.filter(o => o.deliveredAtMs && (now - o.deliveredAtMs) >= 24 * 3600 * 1000);

                      const visibleToday = showAllEarlier ? deliveredToday : deliveredToday.slice(0, 8);
                      const remainingSlots = Math.max(0, 8 - visibleToday.length);
                      const visibleYesterday = showAllEarlier ? deliveredYesterday : deliveredYesterday.slice(0, remainingSlots);

                      const renderDeliveredRow = (order: DispatchOrder) => {
                        const isSelected = activeOrder?.id === order.id;
                        return (
                          <div
                            key={order.id}
                            data-testid={\`order-row-\${order.id}\`}
                            onClick={() => selectOrder(order.id)}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '80px 110px 50px 105px 120px 1fr',
                              gap: 8,
                              alignItems: 'center',
                              height: 44,
                              minHeight: 44,
                              maxHeight: 44,
                              borderBottom: '1px solid #F4F4F5',
                              background: isSelected ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                              padding: '0 4px',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            {/* 1. Order (mono) */}
                            <div>
                              <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, fontWeight: 500, color: '#18181B' }}>
                                #{order.id}
                              </span>
                            </div>

                            {/* 2. Route (mono) */}
                            <div>
                              <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: '#18181B' }}>
                                {order.from} → {order.to}
                              </span>
                            </div>

                            {/* 3. Units (tabular, right-aligned) */}
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#18181B' }}>
                                {order.units}u
                              </span>
                            </div>

                            {/* 4. Delivered at */}
                            <div>
                              <span style={{ fontSize: 12, color: '#71717A', fontVariantNumeric: 'tabular-nums' }}>
                                {order.deliveredAt || order.etaTime}
                              </span>
                            </div>

                            {/* 5. Outcome (plain text / StatusDot, NO pill badge) */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              {order.hasTempExcursion ? (
                                <>
                                  <StatusDot variant="bad" />
                                  <span style={{ fontSize: 12, fontWeight: 500, color: '#DC2626' }}>Alert</span>
                                </>
                              ) : order.delayMin && order.delayMin > 0 ? (
                                <span style={{ fontSize: 12, color: '#B45309', fontVariantNumeric: 'tabular-nums' }}>+{order.delayMin} min</span>
                              ) : (
                                <span style={{ fontSize: 12, color: '#18181B' }}>On time</span>
                              )}
                            </div>

                            {/* 6. Receipt (plain text, NO pill badge) */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: 12, color: order.receivedAt ? '#18181B' : '#71717A', fontVariantNumeric: 'tabular-nums' }}>
                              {order.receivedAt ? \`Confirmed \${order.receivedAt}\` : 'Awaiting'}
                            </div>
                          </div>
                        );
                      };

                      return (
                        <>
                          {/* Group header: Today */}
                          <div
                            style={{
                              position: 'sticky',
                              top: 0,
                              zIndex: 4,
                              background: '#FFFFFF',
                              padding: '5px 4px',
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#71717A',
                              letterSpacing: '0.04em',
                              borderBottom: '1px solid #F4F4F5',
                            }}
                          >
                            Today ({deliveredToday.length})
                          </div>
                          {visibleToday.map(renderDeliveredRow)}

                          {/* Group header: Yesterday */}
                          {visibleYesterday.length > 0 && (
                            <>
                              <div
                                style={{
                                  position: 'sticky',
                                  top: 0,
                                  zIndex: 4,
                                  background: '#FFFFFF',
                                  padding: '5px 4px',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: '#71717A',
                                  letterSpacing: '0.04em',
                                  borderBottom: '1px solid #F4F4F5',
                                  marginTop: 4,
                                }}
                              >
                                Yesterday ({deliveredYesterday.length})
                              </div>
                              {visibleYesterday.map(renderDeliveredRow)}
                            </>
                          )}

                          {filteredOrders.length > 8 && !showAllEarlier && (
                            <button
                              type="button"
                              data-testid="show-earlier-btn"
                              onClick={() => setShowAllEarlier(true)}
                              style={{
                                width: '100%',
                                padding: '8px 0',
                                background: 'transparent',
                                border: 'none',
                                borderTop: '1px solid #F4F4F5',
                                color: '#71717A',
                                fontSize: 11,
                                fontWeight: 500,
                                cursor: 'pointer',
                                textAlign: 'center',
                                marginTop: 4,
                              }}
                            >
                              Show earlier ({filteredOrders.length - (visibleToday.length + visibleYesterday.length)} more) ↓
                            </button>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    /* activeTab === 'exceptions' */
                    (() => {
                      const visibleExceptions = showAllEarlier ? filteredOrders : filteredOrders.slice(0, 8);
                      return (
                        <>
                          {visibleExceptions.length === 0 ? (
                            <div style={{ padding: '32px 0', textAlign: 'center', color: '#71717A', fontSize: 12 }}>
                              No exceptions recorded.
                            </div>
                          ) : (
                            visibleExceptions.map((order) => {
                              const isSelected = activeOrder?.id === order.id;
                              return (
                                <div
                                  key={order.id}
                                  data-testid={\`order-row-\${order.id}\`}
                                  onClick={() => selectOrder(order.id)}
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: '80px 110px 1fr 90px 75px',
                                    gap: 8,
                                    alignItems: 'center',
                                    height: 44,
                                    minHeight: 44,
                                    maxHeight: 44,
                                    borderBottom: '1px solid #F4F4F5',
                                    background: isSelected ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                                    padding: '0 4px',
                                    cursor: 'pointer',
                                    boxSizing: 'border-box',
                                    transition: 'background 0.15s ease',
                                  }}
                                >
                                  {/* 1. Order (mono) */}
                                  <div>
                                    <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, fontWeight: 500, color: '#18181B' }}>
                                      #{order.id}
                                    </span>
                                  </div>

                                  {/* 2. Route (mono) */}
                                  <div>
                                    <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: '#18181B' }}>
                                      {order.from} → {order.to}
                                    </span>
                                  </div>

                                  {/* 3. Issue */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
                                    <StatusDot variant="bad" />
                                    <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      Temperature {order.coldChain?.tempC?.toFixed(1) || '24.6'} °C · {order.coldChain?.excursionMin || 6} min
                                    </span>
                                  </div>

                                  {/* 4. Since */}
                                  <div>
                                    <span style={{ fontSize: 12, color: '#71717A', fontVariantNumeric: 'tabular-nums' }}>
                                      {order.coldChain?.excursionMin || 6}m ago
                                    </span>
                                  </div>

                                  {/* 5. Action */}
                                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        selectOrder(order.id);
                                      }}
                                      style={{
                                        background: 'transparent',
                                        color: '#18181B',
                                        border: 'none',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        padding: '4px 6px',
                                      }}
                                    >
                                      Review →
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}

                          {filteredOrders.length > 8 && !showAllEarlier && (
                            <button
                              type="button"
                              data-testid="show-earlier-btn"
                              onClick={() => setShowAllEarlier(true)}
                              style={{
                                width: '100%',
                                padding: '8px 0',
                                background: 'transparent',
                                border: 'none',
                                borderTop: '1px solid #F4F4F5',
                                color: '#71717A',
                                fontSize: 11,
                                fontWeight: 500,
                                cursor: 'pointer',
                                textAlign: 'center',
                                marginTop: 4,
                              }}
                            >
                              Show earlier ({filteredOrders.length - 8} more) ↓
                            </button>
                          )}
                        </>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>`;

content = content.slice(0, startIndex) + replacement + content.slice(endIndex + endLength);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated MoveonDashboard.tsx!');

