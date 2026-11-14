import React, { useState, useEffect, useRef } from 'react';
import { LEDGER_TOKENS } from './tokens';
import { Kbd } from './Kbd';
import { Search, ArrowRight } from 'lucide-react';

export interface CommandItem {
  id: string;
  title: string;
  shortcut?: string;
  category?: string;
  onSelect: () => void;
}

export interface RequestSearchResult {
  id: string;
  units: number;
  group: string;
  status: string;
  product?: string;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  hospitalCode: string;
  onRequestPlatelets: () => void;
  onNavigateTab: (tab: 'today' | 'requests' | 'stock') => void;
  onSelectHospital?: (code: string) => void;
  onToggleSound?: () => void;
  requests?: RequestSearchResult[];
  onSelectRequest?: (reqId: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  hospitalCode,
  onRequestPlatelets,
  onNavigateTab,
  onSelectHospital,
  onToggleSound,
  requests = [],
  onSelectRequest,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Default core command items
  const baseItems: CommandItem[] = [
    {
      id: 'cmd-request',
      title: 'Request platelets',
      shortcut: 'r',
      category: 'Actions',
      onSelect: () => {
        onClose();
        onRequestPlatelets();
      },
    },
    {
      id: 'cmd-stock-update',
      title: 'Update stock',
      shortcut: 'u',
      category: 'Actions',
      onSelect: () => {
        onClose();
        window.location.hash = `#/hospital/${hospitalCode}/stock?update=adjust`;
      },
    },
    {
      id: 'cmd-tab-today',
      title: 'Go to Today',
      shortcut: 'g t',
      category: 'Navigation',
      onSelect: () => {
        onClose();
        onNavigateTab('today');
      },
    },
    {
      id: 'cmd-tab-requests',
      title: 'Go to Requests',
      shortcut: 'g r',
      category: 'Navigation',
      onSelect: () => {
        onClose();
        onNavigateTab('requests');
      },
    },
    {
      id: 'cmd-tab-stock',
      title: 'Go to Stock',
      shortcut: 'g s',
      category: 'Navigation',
      onSelect: () => {
        onClose();
        onNavigateTab('stock');
      },
    },
  ];

  // Request search items per Section 12 ("open request by id")
  const requestItems: CommandItem[] = requests.map((req) => ({
    id: `cmd-req-${req.id}`,
    title: `Open ${req.id} · ${req.units}u ${req.group.replace('-', '−')} (${req.status.replace('_', ' ')})`,
    category: 'Requests',
    onSelect: () => {
      onClose();
      if (onSelectRequest) {
        onSelectRequest(req.id);
      } else {
        window.location.hash = `#/hospital/${hospitalCode}/requests/${req.id}`;
      }
    },
  }));

  // Demo hospitals per Section 12 ("switch hospital (demo)")
  const demoHospitals = [
    { code: 'AIM', name: 'AIIMS Trauma (AIM)' },
    { code: 'SFD', name: 'Safdarjung Hospital (SFD)' },
    { code: 'RML', name: 'Ram Manohar Lohia (RML)' },
    { code: 'FVK', name: 'Fortis Vasant Kunj (FVK)' },
    { code: 'MAX', name: 'Max Super Speciality (MAX)' },
  ];

  const hospitalItems: CommandItem[] = demoHospitals.map((h) => ({
    id: `cmd-hosp-${h.code}`,
    title: `Switch to ${h.name}`,
    category: 'Hospitals (demo)',
    onSelect: () => {
      onClose();
      onSelectHospital?.(h.code);
    },
  }));

  const settingsItems: CommandItem[] = [
    {
      id: 'cmd-toggle-sound',
      title: 'Toggle sound',
      category: 'Settings',
      onSelect: () => {
        onClose();
        onToggleSound?.();
      },
    },
  ];

  const allItems = [...baseItems, ...requestItems, ...hospitalItems, ...settingsItems];

  // If user typed something that looks like a request ID and not in list, add direct jump
  const cleanQuery = query.trim().toUpperCase();
  const dynamicItems: CommandItem[] = [];
  if (cleanQuery && (cleanQuery.startsWith('REQ') || cleanQuery.startsWith('TX') || /^\d+$/.test(cleanQuery))) {
    const directId = cleanQuery.startsWith('REQ') || cleanQuery.startsWith('TX') ? cleanQuery : `REQ-${cleanQuery}`;
    const alreadyListed = allItems.some((it) => it.title.toUpperCase().includes(directId));
    if (!alreadyListed) {
      dynamicItems.push({
        id: `cmd-direct-${directId}`,
        title: `Open request ${directId} →`,
        category: 'Requests',
        onSelect: () => {
          onClose();
          if (onSelectRequest) {
            onSelectRequest(directId);
          } else {
            window.location.hash = `#/hospital/${hospitalCode}/requests/${directId}`;
          }
        },
      });
    }
  }

  const combinedItems = [...dynamicItems, ...allItems];

  const filtered = combinedItems.filter((it) =>
    it.title.toLowerCase().includes(query.toLowerCase()) ||
    (it.category && it.category.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Key navigation (Arrows, j/k, Enter, Esc) per Section 12
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].onSelect();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      data-testid="command-palette-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(20, 23, 28, 0.32)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '14vh',
        backdropFilter: 'none', // Hard ban: no blur/glass
        animation: 'ledgerModalFadeIn 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        data-testid="command-palette-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '520px',
          background: LEDGER_TOKENS.canvas,
          borderRadius: '10px', // Exact radius 10 per Section 12
          border: `1px solid ${LEDGER_TOKENS.hairlineStrong}`,
          boxShadow: LEDGER_TOKENS.shadow.pop, // --shadow-pop per Section 12
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: LEDGER_TOKENS.fontUi,
          maxHeight: '440px',
          transition: 'all 240ms cubic-bezier(0.16, 1, 0.3, 1)', // 320ms max per Section 12
        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            height: '48px',
            borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`,
            gap: '10px',
          }}
        >
          <Search size={16} color={LEDGER_TOKENS.ink3} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, requests by ID, or tabs..."
            aria-label="Command search"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: LEDGER_TOKENS.type.t14,
              fontFamily: LEDGER_TOKENS.fontUi,
              color: LEDGER_TOKENS.ink,
            }}
          />
          <Kbd>Esc</Kbd>
        </div>

        {/* Results List */}
        <div
          style={{
            maxHeight: '340px',
            overflowY: 'auto',
            padding: '6px',
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                fontSize: LEDGER_TOKENS.type.t13,
                color: LEDGER_TOKENS.ink3,
              }}
            >
              No matching commands or requests
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: isSelected ? LEDGER_TOKENS.surface : 'transparent',
                    cursor: 'pointer',
                    fontSize: LEDGER_TOKENS.type.t13,
                    color: isSelected ? LEDGER_TOKENS.ink : LEDGER_TOKENS.ink2,
                    minHeight: '36px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowRight size={13} color={isSelected ? LEDGER_TOKENS.ink : 'transparent'} />
                    <span style={{ fontWeight: isSelected ? 500 : 400 }}>{item.title}</span>
                  </div>
                  {item.shortcut && <Kbd>{item.shortcut}</Kbd>}
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        @keyframes ledgerModalFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
