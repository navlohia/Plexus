import React, { useState, useRef, useEffect } from 'react';
import { COCKPIT_TOKENS } from './tokens';
import { Volume2, VolumeX, LogOut, ChevronDown, Check } from 'lucide-react';

export interface HospitalOption {
  code: string;
  name: string;
  tier?: string;
  state?: 'short' | 'risk' | 'ok';
}

export interface HospitalMenuProps {
  currentHospitalCode: string;
  currentHospitalName?: string;
  demoHospitals?: HospitalOption[];
  onSelectHospital?: (code: string) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onSignOut?: () => void;
  isDemoMode?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_DEMO_HOSPITALS: HospitalOption[] = [
  { code: 'AIM', name: 'AIIMS Trauma Center', state: 'short' },
  { code: 'MDT', name: 'Medanta The Medicity', state: 'risk' },
  { code: 'ROH', name: 'Dr. RML Hospital', state: 'ok' },
  { code: 'SFD', name: 'Safdarjung Hospital', state: 'short' },
  { code: 'MAX', name: 'Max Super Speciality (Saket)', state: 'ok' },
  { code: 'FTN', name: 'Fortis Escorts Heart Inst.', state: 'risk' },
];

export const HospitalMenu: React.FC<HospitalMenuProps> = ({
  currentHospitalCode = 'AIM',
  currentHospitalName = 'AIIMS Trauma Center',
  demoHospitals = DEFAULT_DEMO_HOSPITALS,
  onSelectHospital,
  soundEnabled = true,
  onToggleSound,
  onSignOut,
  isDemoMode = true,
  className = '',
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div
      ref={menuRef}
      className={`cockpit-hospital-menu ${className}`}
      data-testid="cockpit-hospital-menu"
      style={{ position: 'relative', display: 'inline-block', ...style }}
    >
      {/* Trigger Button: Hospital Chip + Menu Indicator */}
      <button
        type="button"
        data-testid="hospital-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          minHeight: '44px',
          padding: '0 12px 0 6px',
          borderRadius: COCKPIT_TOKENS.radii.pill,
          background: COCKPIT_TOKENS.surfaces.cardBg,
          border: COCKPIT_TOKENS.hairlines.default,
          boxShadow: '0 1px 2px rgba(20,27,45,0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          color: COCKPIT_TOKENS.ink.primary,
          transition: 'all 0.15s ease',
        }}
      >
        <span
          className="cockpit-mono"
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 7px',
            borderRadius: '999px',
            background: COCKPIT_TOKENS.lavender[50],
            color: COCKPIT_TOKENS.lavender[800],
            border: `1px solid ${COCKPIT_TOKENS.lavender[200]}`,
          }}
        >
          {currentHospitalCode}
        </span>
        <span style={{ fontSize: '13px', fontWeight: 600, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentHospitalName}
        </span>
        <ChevronDown size={14} color={COCKPIT_TOKENS.ink.muted} />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          data-testid="hospital-menu-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '280px',
            background: COCKPIT_TOKENS.surfaces.cardBg,
            borderRadius: COCKPIT_TOKENS.radii.card,
            boxShadow: COCKPIT_TOKENS.shadows.popover,
            border: COCKPIT_TOKENS.hairlines.default,
            zIndex: 100,
            overflow: 'hidden',
            padding: '8px 0',
            animation: 'cockpit-fade 0.16s ease-out',
          }}
        >
          {/* Header Info */}
          <div style={{ padding: '8px 16px 10px 16px', borderBottom: '1px solid rgba(20, 27, 45, 0.06)' }}>
            <div className="cockpit-label" style={{ fontSize: '11px', marginBottom: '2px' }}>
              Connected node
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: COCKPIT_TOKENS.ink.primary }}>
              {currentHospitalName}
            </div>
          </div>

          {/* Demo Hospital Switcher per Section 3 (demoMode only) */}
          {isDemoMode && (
            <div style={{ padding: '8px 8px 6px 8px' }}>
              <div className="cockpit-label" style={{ padding: '4px 8px', fontSize: '11px' }}>
                Switch demo node
              </div>
              <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {demoHospitals.map((hosp) => {
                  const isSelected = hosp.code === currentHospitalCode;
                  return (
                    <button
                      key={hosp.code}
                      type="button"
                      data-testid={`demo-switch-${hosp.code}`}
                      onClick={() => {
                        onSelectHospital?.(hosp.code);
                        setIsOpen(false);
                      }}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: isSelected ? COCKPIT_TOKENS.surfaces.pageBg : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '12.5px',
                        color: COCKPIT_TOKENS.ink.primary,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="cockpit-mono" style={{ fontWeight: 700, fontSize: '11px', color: COCKPIT_TOKENS.ink.secondary }}>
                          {hosp.code}
                        </span>
                        <span style={{ fontSize: '12px' }}>{hosp.name}</span>
                      </div>
                      {isSelected && <Check size={14} color={COCKPIT_TOKENS.status.green.solid} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Controls: Sound Toggle & Sign Out */}
          <div style={{ borderTop: '1px solid rgba(20, 27, 45, 0.06)', padding: '6px 8px 2px 8px' }}>
            <button
              type="button"
              onClick={onToggleSound}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                fontSize: '13px',
                color: COCKPIT_TOKENS.ink.primary,
              }}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>{soundEnabled ? 'Audio alerts enabled' : 'Mute audio alerts'}</span>
            </button>

            <button
              type="button"
              onClick={onSignOut}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                fontSize: '13px',
                color: COCKPIT_TOKENS.status.red.text,
              }}
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>

          {/* Simulated Data Footnote per Section 3 */}
          <div
            style={{
              padding: '6px 16px',
              borderTop: '1px solid rgba(20, 27, 45, 0.06)',
              fontSize: '11px',
              color: COCKPIT_TOKENS.ink.subtle,
              textAlign: 'center',
            }}
          >
            Simulated data · Plexus Mesh v2.0
          </div>
        </div>
      )}
    </div>
  );
};

