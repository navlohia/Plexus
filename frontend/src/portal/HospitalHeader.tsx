import React, { useState, useRef, useEffect } from 'react';
import rawHospitals from '../world/hospitals.json';
import { World } from '../world/types';
import * as selectors from '../world/selectors';
import { clearSession, UserSession, getSession, canShowDemoSwitcher } from './session';
import {
  Kbd,
} from '../ui/ledger';
import { Bell, ChevronDown, Check, Volume2, VolumeX, LogOut, ArrowLeft } from 'lucide-react';

interface HospitalHeaderProps {
  world: World;
  hospitalCode: string;
  activeTab: 'today' | 'requests' | 'stock';
  onTabChange: (tab: 'today' | 'requests' | 'stock') => void;
  onRequestPlatelets: () => void;
  onOpenCommandPalette?: () => void;
}

export const HospitalHeader: React.FC<HospitalHeaderProps> = ({
  world,
  hospitalCode,
  activeTab,
  onTabChange,
  onRequestPlatelets,
  onOpenCommandPalette,
}) => {
  const session: UserSession = getSession();
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentHosp = rawHospitals.find((h) => h.code.toUpperCase() === hospitalCode.toUpperCase());
  const hospName = currentHosp ? currentHosp.name : hospitalCode;

  // Single attention selector drives the bell badge
  const attentionItems = selectors.getHospitalAttention(world, hospitalCode);
  const hasAlerts = attentionItems.length > 0;

  const handleSignOut = () => {
    clearSession();
    window.location.hash = '#/signin';
  };

  const handleSelectHospital = (code: string) => {
    setShowMenu(false);
    window.location.hash = `#/hospital/${code}/today`;
  };

  const isDemo = canShowDemoSwitcher(session);

  return (
    <header
      data-testid="hospital-portal-header"
      style={{
        height: '60px',
        background: '#FFFFFF',
        borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ========================================================================= */}
      {/* LEFT: Plexus Logo + Hospital Switcher Pill + Back to Dispatch Link        */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Plexus Emerald Logo */}
        <a
          href="#/workspace/dispatch"
          title="Plexus Logistics Mesh"
          data-testid="header-logo-tile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: '#0F172A',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.35)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: '#0F172A' }}>
            Plexus
          </span>
        </a>

        {/* Hospital Switcher Pill */}
        <div ref={menuRef} data-testid="cockpit-hospital-menu" style={{ position: 'relative' }}>
          <button
            type="button"
            data-testid="header-hospital-menu-trigger"
            onClick={() => setShowMenu(!showMenu)}
            style={{
              background: '#F1F5F9',
              border: '1px solid rgba(15, 23, 42, 0.06)',
              borderRadius: 999,
              padding: '0 14px',
              minHeight: '44px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#0F172A',
              outline: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
            <span>{hospName} ({hospitalCode})</span>
            <ChevronDown size={13} color="#64748B" />
          </button>

          {/* Hospital Menu Popover */}
          {showMenu && (
            <div
              data-testid="hospital-menu-popover"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                width: '280px',
                background: '#FFFFFF',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                borderRadius: 14,
                boxShadow: '0 12px 36px rgba(15, 23, 42, 0.12)',
                padding: '8px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              {isDemo && (
                <div style={{ marginBottom: '6px' }}>
                  <div
                    style={{
                      padding: '4px 8px',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Switch Hospital
                  </div>
                  {rawHospitals.slice(0, 6).map((h) => {
                    const isCurrent = h.code.toUpperCase() === hospitalCode.toUpperCase();
                    const st = selectors.getHospitalState(world, h.code);
                    const dotColor = st === 'short' ? '#EF4444' : st === 'risk' ? '#F59E0B' : '#10B981';
                    return (
                      <div
                        key={h.code}
                        onClick={() => handleSelectHospital(h.code)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 8px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontSize: '12.5px',
                          background: isCurrent ? '#F1F5F9' : 'transparent',
                          color: '#0F172A',
                          fontWeight: isCurrent ? 600 : 400,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor }} />
                          <span>{h.name}</span>
                        </div>
                        {isCurrent && <Check size={14} color="#10B981" />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sound Toggle */}
              <div
                onClick={() => setSoundEnabled(!soundEnabled)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 8px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: '12.5px',
                  color: '#475569',
                  borderTop: '1px solid rgba(15, 23, 42, 0.06)',
                  marginTop: '4px',
                }}
              >
                {soundEnabled ? <Volume2 size={14} color="#10B981" /> : <VolumeX size={14} color="#94A3B8" />}
                <span>Sound effects: {soundEnabled ? 'Enabled' : 'Muted'}</span>
              </div>

              {/* Sign out */}
              <div
                onClick={handleSignOut}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 8px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: '12.5px',
                  color: '#EF4444',
                  borderTop: '1px solid rgba(15, 23, 42, 0.06)',
                  marginTop: '4px',
                }}
              >
                <LogOut size={14} />
                <span>Sign out</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick link back to Dispatch Workspace */}
        <a
          href="#/workspace/dispatch"
          style={{
            fontSize: '12px',
            color: '#64748B',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: 6,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#0F172A')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#64748B')}
        >
          <ArrowLeft size={13} />
          <span>Dispatch Workspace</span>
        </a>
      </div>

      {/* ========================================================================= */}
      {/* CENTER: Floating White Pill Container with Tabs                           */}
      {/* ========================================================================= */}
      <div
        data-testid="header-nav-tabs"
        style={{
          background: '#FFFFFF',
          padding: '4px',
          borderRadius: 999,
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.05)',
          border: '1px solid rgba(15, 23, 42, 0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {(['today', 'requests', 'stock'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab === 'today' ? 'Today' : tab === 'requests' ? 'Requests' : 'Stock';
          const shortcut = tab === 'today' ? 'g t' : tab === 'requests' ? 'g r' : 'g s';

          return (
            <button
              key={tab}
              type="button"
              data-testid={`header-tab-${tab}`}
              onClick={() => onTabChange(tab)}
              title={`${label} (${shortcut})`}
              style={{
                background: isActive ? '#0F172A' : 'transparent',
                color: isActive ? '#FFFFFF' : '#64748B',
                border: 'none',
                borderRadius: 999,
                padding: '0 16px',
                minHeight: '44px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              {isActive && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#10B981',
                    display: 'inline-block',
                  }}
                />
              )}
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* RIGHT: Ctrl K Badge, Bell Icon, Primary + Request Platelets Pill Button  */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Ctrl K badge button */}
        <button
          type="button"
          data-testid="header-cmdk-trigger"
          onClick={onOpenCommandPalette}
          title="Command Palette (Ctrl K / Cmd K)"
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '44px',
            minWidth: '44px',
          }}
        >
          <Kbd>Ctrl K</Kbd>
        </button>

        {/* Bell Icon Button with Indicator */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            type="button"
            data-testid="portal-notif-bell"
            onClick={() => setShowNotifPanel(!showNotifPanel)}
            aria-label="Notifications"
            style={{
              width: '44px',
              height: '44px',
              background: '#F8FAFC',
              border: '1px solid rgba(15, 23, 42, 0.06)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              color: '#475569',
            }}
          >
            <Bell size={15} strokeWidth={1.8} />
            {hasAlerts && (
              <span
                data-testid="portal-notif-dot"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#EF4444',
                }}
              />
            )}
          </button>

          {/* Notifications List Popover */}
          {showNotifPanel && (
            <div
              data-testid="portal-notif-panel"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: '320px',
                background: '#FFFFFF',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                borderRadius: 14,
                boxShadow: '0 12px 36px rgba(15, 23, 42, 0.12)',
                padding: '10px',
                zIndex: 100,
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#64748B',
                  letterSpacing: '0.04em',
                  padding: '4px 6px 8px 6px',
                  borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
                  marginBottom: '6px',
                }}
              >
                Needs attention
              </div>
              {attentionItems.length === 0 ? (
                <div style={{ padding: '12px 6px', fontSize: '13px', color: '#64748B' }}>
                  No active alerts · All systems steady
                </div>
              ) : (
                attentionItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setShowNotifPanel(false);
                      window.location.hash = item.link;
                    }}
                    style={{
                      padding: '8px 6px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: '13px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: item.tone === 'danger' ? '#EF4444' : '#F59E0B',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.title}</span>
                    </div>
                    <span style={{ fontSize: '11.5px', color: '#64748B', marginLeft: '12px' }}>
                      {item.actionLabel} →
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Primary + Request Platelets Pill Button */}
        <button
          type="button"
          data-testid="header-request-platelets-btn"
          title="Request platelets (r)"
          onClick={onRequestPlatelets}
          style={{
            background: '#0F172A',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 999,
            padding: '0 20px',
            minHeight: '44px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#1E293B')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '#0F172A')}
        >
          <span style={{ fontSize: '14px', fontWeight: 700 }}>+</span>
          <span>Request platelets</span>
        </button>
      </div>
    </header>
  );
};

export default HospitalHeader;
