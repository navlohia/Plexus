import React, { useState, useEffect, useRef, useMemo } from 'react';
import { World } from '../world/types';
import { getWorld, subscribeWorld } from '../world';
import { getScenarioMultiplier } from '../world/selectors';
import { HospitalHeader } from './HospitalHeader';
import { HospitalTodayScreen } from './HospitalTodayScreen';
import { HospitalRequestsScreen } from './HospitalRequestsScreen';
import { HospitalRequestDetailScreen } from './HospitalRequestDetailScreen';
import { HospitalStockScreen } from './HospitalStockScreen';
import { RequestPlateletsModal } from './RequestPlateletsModal';
import { LEDGER_TOKENS, CommandPalette } from '../ui/ledger';
import { Calendar, ArrowUpDown, Layers, AlertTriangle, Check, LogIn } from 'lucide-react';
import GraphChatbot from '../components/chat/GraphChatbot';

interface HospitalPortalShellProps {
  hospitalCode: string;
  initialTab?: 'today' | 'requests' | 'stock';
  initialRequestId?: string | null;
}

export const HospitalPortalShell: React.FC<HospitalPortalShellProps> = ({
  hospitalCode,
  initialTab = 'today',
  initialRequestId = null,
}) => {
  const [world, setWorld] = useState<World>(() => getWorld());
  const [activeTab, setActiveTab] = useState<'today' | 'requests' | 'stock'>(initialTab);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(initialRequestId);
  const [showRequestModal, setShowRequestModal] = useState<boolean>(false);
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Focus return ref for Section 12 & 16 accessibility
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  const openRequestModal = () => {
    lastActiveElementRef.current = document.activeElement as HTMLElement | null;
    setShowRequestModal(true);
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setTimeout(() => {
      lastActiveElementRef.current?.focus();
    }, 40);
  };

  const openCommandPalette = () => {
    lastActiveElementRef.current = document.activeElement as HTMLElement | null;
    setShowCommandPalette(true);
  };

  const closeCommandPalette = () => {
    setShowCommandPalette(false);
    setTimeout(() => {
      lastActiveElementRef.current?.focus();
    }, 40);
  };

  // Available requests for search by ID in Command Palette per Section 12
  const availableRequests = useMemo(() => {
    const list: { id: string; units: number; group: string; status: string; product?: string }[] = [];
    Object.values(world.requests)
      .filter((r) => r.hospital === hospitalCode)
      .forEach((r) => {
        list.push({
          id: r.id,
          units: r.units,
          group: r.group,
          status: r.status,
          product: r.product,
        });
      });
    Object.values(world.orders)
      .filter((o) => o.to === hospitalCode || o.from === hospitalCode)
      .forEach((o) => {
        const orderOrReqId = o.requestId || o.id;
        if (!list.some((l) => l.id === orderOrReqId || l.id === o.id)) {
          list.push({
            id: o.id,
            units: o.units,
            group: o.group,
            status: o.status,
            product: o.product,
          });
        }
      });
    return list;
  }, [world, hospitalCode]);

  const handleToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Sync with World state updates
  useEffect(() => {
    setWorld(getWorld());
    const unsub = subscribeWorld((updatedWorld) => {
      setWorld(updatedWorld);
    });
    return unsub;
  }, []);

  // Synchronize hash with selectedRequestId and activeTab
  useEffect(() => {
    const handleHash = () => {
      const hashClean = window.location.hash.split('?')[0].replace(/^#\/?/, '');
      const parts = hashClean.split('/');
      if (parts[0] === 'hospital' && parts[1]?.toUpperCase() === hospitalCode.toUpperCase()) {
        const tab = parts[2];
        const req = parts[3];
        if (tab === 'requests') {
          setActiveTab('requests');
          setSelectedRequestId(req || null);
        } else if (tab === 'stock') {
          setActiveTab('stock');
          setSelectedRequestId(null);
        } else {
          setActiveTab('today');
          setSelectedRequestId(null);
        }
      }
      setShowRequestModal(window.location.href.includes('new=1'));
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [hospitalCode]);

  // Update URL hash when tab changes
  const handleTabChange = (tab: 'today' | 'requests' | 'stock') => {
    setActiveTab(tab);
    setSelectedRequestId(null);
    window.location.hash = `#/hospital/${hospitalCode}/${tab}`;
  };

  // Keyboard shortcuts (Cmd+K, g t, g r, g s, r, u, j/k, Enter, Esc) per Section 12
  useEffect(() => {
    let keyBuffer = '';
    let bufferTimer: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input / textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Cmd+K or Ctrl+K opens Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (showCommandPalette) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
        return;
      }

      // If modal or palette open, Esc closes and returns focus
      if (showRequestModal || showCommandPalette) {
        if (e.key === 'Escape') {
          e.preventDefault();
          if (showRequestModal) closeRequestModal();
          if (showCommandPalette) closeCommandPalette();
        }
        return;
      }

      // 2-key sequences: g t, g r, g s per Section 12
      const k = e.key.toLowerCase();
      keyBuffer += k;
      clearTimeout(bufferTimer);
      bufferTimer = setTimeout(() => {
        keyBuffer = '';
      }, 500);

      if (keyBuffer === 'gt') {
        e.preventDefault();
        keyBuffer = '';
        handleTabChange('today');
        return;
      } else if (keyBuffer === 'gr') {
        e.preventDefault();
        keyBuffer = '';
        handleTabChange('requests');
        return;
      } else if (keyBuffer === 'gs') {
        e.preventDefault();
        keyBuffer = '';
        handleTabChange('stock');
        return;
      }

      // If user typed 'g' as first letter, wait for next letter
      if (k === 'g') {
        return;
      }

      // Single key shortcuts
      if (k === 'r') {
        e.preventDefault();
        keyBuffer = '';
        openRequestModal();
        return;
      }
      if (k === 'u') {
        e.preventDefault();
        keyBuffer = '';
        lastActiveElementRef.current = document.activeElement as HTMLElement | null;
        window.location.hash = `#/hospital/${hospitalCode}/stock?update=adjust`;
        return;
      }

      // j / k row navigation per Section 12
      if (e.key === 'j' || e.key === 'k') {
        const selectableRows = Array.from(
          document.querySelectorAll<HTMLElement>(
            '[data-testid^="in-motion-row-"], [data-testid^="request-row-"], [data-testid^="mobile-arrival-row-"]'
          )
        );
        if (selectableRows.length > 0) {
          e.preventDefault();
          const currentIdx = selectableRows.findIndex(
            (r) => r === document.activeElement || r.dataset.rowSelected === 'true'
          );
          let nextIdx = 0;
          if (e.key === 'j') {
            nextIdx = currentIdx >= 0 ? (currentIdx + 1) % selectableRows.length : 0;
          } else {
            nextIdx = currentIdx > 0 ? currentIdx - 1 : selectableRows.length - 1;
          }
          selectableRows.forEach((r, idx) => {
            if (idx === nextIdx) {
              r.setAttribute('tabindex', '0');
              r.dataset.rowSelected = 'true';
              r.style.outline = `2px solid ${LEDGER_TOKENS.ink}`;
              r.style.outlineOffset = '-2px';
              r.focus();
              r.scrollIntoView({ block: 'nearest' });
            } else {
              r.removeAttribute('data-row-selected');
              r.style.outline = 'none';
            }
          });
        }
        return;
      }

      // Enter key opens selected row per Section 12
      if (e.key === 'Enter') {
        const selectedRow = document.querySelector<HTMLElement>('[data-row-selected="true"]');
        if (selectedRow) {
          e.preventDefault();
          selectedRow.click();
          return;
        }
      }

      // Esc key clears row selection per Section 12
      if (e.key === 'Escape') {
        const selectedRow = document.querySelector<HTMLElement>('[data-row-selected="true"]');
        if (selectedRow) {
          e.preventDefault();
          selectedRow.removeAttribute('data-row-selected');
          selectedRow.style.outline = 'none';
          selectedRow.blur();
          return;
        }
      }


    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(bufferTimer);
    };
  }, [hospitalCode, showRequestModal, showCommandPalette]);

  // Check URL query flags (e.g. ?new=1 opens request modal)
  useEffect(() => {
    const fullUrl = window.location.href;
    if (fullUrl.includes('new=1')) {
      setShowRequestModal(true);
    }
  }, []);

  const handleRequestSuccess = (newReqId: string) => {
    setShowRequestModal(false);
    setSelectedRequestId(newReqId);
    setActiveTab('requests');
    window.location.hash = `#/hospital/${hospitalCode}/requests/${newReqId}`;
    setToastMessage(`Request #${newReqId} submitted · Dispatch alerted`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  return (
    <div
      data-testid="hospital-portal-shell"
      className="ledger-root"
      style={{
        minHeight: '100vh',
        background: '#F2F3F7',
        color: '#0F172A',
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1. Header (Desktop: 60px height, Dispatch header styling) */}
      <HospitalHeader
        world={world}
        hospitalCode={hospitalCode}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onRequestPlatelets={openRequestModal}
        onOpenCommandPalette={openCommandPalette}
      />

      {/* 2. Main Screen Area (max-width 1240px, centered Bento cards) */}
      <main
        className="ledger-main-container"
        style={{
          flex: 1,
          paddingBottom: '80px',
          maxWidth: '1240px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
          paddingLeft: '24px',
          paddingRight: '24px',
          paddingTop: '24px',
        }}
      >
        {/* Outbreak banner: terse styling with warn tint per Section 11 */}
        {(() => {
          const hosp = world.hospitals[hospitalCode];
          const mult = hosp ? getScenarioMultiplier(world, hosp.zone) : 1.0;
          if (world.activeScenario && mult > 1.0) {
            return (
              <div
                data-testid="hospital-outbreak-banner"
                style={{
                  background: LEDGER_TOKENS.warnTint,
                  border: `1px solid ${LEDGER_TOKENS.hairlineStrong}`,
                  borderRadius: LEDGER_TOKENS.radius.md,
                  padding: '10px 14px',
                  marginTop: '16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  color: LEDGER_TOKENS.ink,
                  fontSize: LEDGER_TOKENS.type.t13,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={15} color={LEDGER_TOKENS.warn} />
                  <span>
                    Outbreak mode · demand ×{mult.toFixed(1)} in zone {hosp?.zone}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: LEDGER_TOKENS.fontMono,
                    color: LEDGER_TOKENS.ink3,
                  }}
                >
                  AUTO
                </span>
              </div>
            );
          }
          return null;
        })()}

        {activeTab === 'today' && (
          <HospitalTodayScreen
            world={world}
            hospitalCode={hospitalCode}
            onRequestPlatelets={() => setShowRequestModal(true)}
            onOpenRequests={() => handleTabChange('requests')}
            onOpenStock={() => handleTabChange('stock')}
          />
        )}
        {activeTab === 'requests' && selectedRequestId && (
          <HospitalRequestDetailScreen
            world={world}
            hospitalCode={hospitalCode}
            requestId={selectedRequestId}
            onBack={() => {
              setSelectedRequestId(null);
              window.location.hash = `#/hospital/${hospitalCode}/requests`;
            }}
            onRequestPlatelets={() => setShowRequestModal(true)}
            onShowToast={handleToast}
          />
        )}
        {activeTab === 'requests' && !selectedRequestId && (
          <HospitalRequestsScreen
            world={world}
            hospitalCode={hospitalCode}
            onRequestPlatelets={() => setShowRequestModal(true)}
            onSelectRequest={(id) => {
              setSelectedRequestId(id);
              window.location.hash = `#/hospital/${hospitalCode}/requests/${id}`;
            }}
          />
        )}
        {activeTab === 'stock' && (
          <HospitalStockScreen
            world={world}
            hospitalCode={hospitalCode}
            onShowToast={handleToast}
          />
        )}
      </main>

      {/* 3. Mobile Bottom Tab Bar (56px high, hairline top, text-labeled icons per Sections 5 & 13) */}
      <nav
        data-testid="mobile-bottom-tabs"
        className="mobile-bottom-nav"
        style={{
          display: 'none', // Shown via CSS media query on mobile
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '56px', // 56px high per Section 5
          background: LEDGER_TOKENS.canvas,
          borderTop: `1px solid ${LEDGER_TOKENS.hairline}`,
          zIndex: 40,
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '0 8px env(safe-area-inset-bottom, 0px) 8px',
        }}
      >
        {[
          { tab: 'today', label: 'Today', icon: Calendar },
          { tab: 'requests', label: 'Requests', icon: ArrowUpDown },
          { tab: 'stock', label: 'Stock', icon: Layers },
        ].map(({ tab, label, icon: Icon }) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              data-testid={`mobile-tab-${tab}`}
              onClick={() => handleTabChange(tab as 'today' | 'requests' | 'stock')}
              style={{
                flex: 1,
                minHeight: '44px', // 44px min touch target
                background: 'transparent',
                border: 'none',
                color: isActive ? LEDGER_TOKENS.ink : LEDGER_TOKENS.ink3,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                padding: '4px 0',
              }}
            >
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: LEDGER_TOKENS.fontUi,
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* 4. Request Platelets Modal / Sheet */}
      {showRequestModal && (
        <RequestPlateletsModal
          world={world}
          hospitalCode={hospitalCode}
          onClose={closeRequestModal}
          onSuccess={handleRequestSuccess}
        />
      )}

      {/* 5. Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={closeCommandPalette}
        hospitalCode={hospitalCode}
        onRequestPlatelets={openRequestModal}
        onNavigateTab={handleTabChange}
        onSelectHospital={(code) => {
          window.location.hash = `#/hospital/${code}/today`;
        }}
        requests={availableRequests}
        onSelectRequest={(id) => {
          setSelectedRequestId(id);
          setActiveTab('requests');
          window.location.hash = `#/hospital/${hospitalCode}/requests/${id}`;
        }}
      />

      {/* 6. Toast Notification (positioned cleanly above bottom-right controls) */}
      {toastMessage && (
        <div
          data-testid="portal-toast"
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '82px',
            right: '24px',
            background: LEDGER_TOKENS.ink,
            color: '#FFFFFF',
            padding: '10px 16px',
            borderRadius: LEDGER_TOKENS.radius.md,
            fontSize: LEDGER_TOKENS.type.t13,
            fontWeight: 500,
            boxShadow: LEDGER_TOKENS.shadow.pop,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Check size={14} color="#FFFFFF" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 7. Aesthetic Floating Sign In Button (Bottom Right) */}
      <button
        type="button"
        data-testid="hospital-signin-button"
        onClick={() => {
          window.location.hash = '#/signin';
        }}
        aria-label="Sign in"
        className="hospital-portal-floating-signin"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          padding: '10px 18px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(15, 23, 42, 0.12)',
          borderRadius: '9999px',
          boxShadow: '0 10px 25px -3px rgba(15, 23, 42, 0.12), 0 4px 6px -2px rgba(15, 23, 42, 0.05)',
          color: '#0F172A',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          letterSpacing: '-0.01em',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 14px 34px -4px rgba(15, 23, 42, 0.18), 0 6px 12px -2px rgba(15, 23, 42, 0.08)';
          e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)';
          e.currentTarget.style.background = '#FFFFFF';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 10px 25px -3px rgba(15, 23, 42, 0.12), 0 4px 6px -2px rgba(15, 23, 42, 0.05)';
          e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.12)';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
        }}
        title="Sign In (Reroutes to Sign In page)"
      >
        <span
          style={{
            position: 'relative',
            display: 'flex',
            width: '8px',
            height: '8px',
          }}
        >
          <span
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: '#10B981',
              opacity: 0.75,
              animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
            }}
          />
          <span
            style={{
              position: 'relative',
              display: 'inline-flex',
              borderRadius: '50%',
              width: '8px',
              height: '8px',
              background: '#10B981',
            }}
          />
        </span>
        <LogIn size={15} color="#0F172A" strokeWidth={2.2} />
        <span>Sign In</span>
      </button>

      {/* 8. Floating GraphDB AI Copilot Chatbot (Bottom Left) */}
      <GraphChatbot />

      {/* Responsive Styles for Mobile Navigation */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-header-tabs {
            display: none !important;
          }
          .mobile-bottom-nav {
            display: flex !important;
          }
          .hospital-portal-floating-signin {
            bottom: 74px !important;
            right: 16px !important;
            padding: 8px 14px !important;
            font-size: 12px !important;
          }
        }
        @media (max-width: 600px) {
          .ledger-main-container {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default HospitalPortalShell;
