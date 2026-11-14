import React from 'react';
import { LEDGER_TOKENS } from './tokens';

export interface TabItem {
  id: string;
  label: string;
  count?: number | string;
  shortcut?: string;
  title?: string;
}

export interface TextTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  style?: React.CSSProperties;
  testIdPrefix?: string;
}

export const TextTabs: React.FC<TextTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
  style,
  testIdPrefix = 'ledger-tab-',
}) => {
  return (
    <div
      role="tablist"
      className={`ledger-text-tabs ${className}`}
      data-testid="ledger-text-tabs"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`,
        paddingBottom: '0',
        ...style,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            data-testid={`${testIdPrefix}${tab.id}`}
            title={tab.title || (tab.shortcut ? `${tab.label} (${tab.shortcut})` : tab.label)}
            onClick={() => onChange(tab.id)}
            style={{
              background: 'transparent', // NO pill background
              border: 'none',
              borderBottom: isActive ? `2px solid ${LEDGER_TOKENS.ink}` : '2px solid transparent', // 2px underline
              padding: '6px 0 8px 0',
              fontFamily: LEDGER_TOKENS.fontUi,
              fontSize: '13px',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? LEDGER_TOKENS.ink : LEDGER_TOKENS.ink3,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'color 0.15s ease, border-color 0.15s ease',
              outline: 'none',
              marginBottom: '-1px', // Align underline with bottom border
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                style={{
                  color: LEDGER_TOKENS.ink3,
                  fontSize: '11px',
                  fontWeight: 400,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

