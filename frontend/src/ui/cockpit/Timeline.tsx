import React from 'react';
import { COCKPIT_TOKENS } from './tokens';
import { Check, Clock, AlertTriangle } from 'lucide-react';

export interface TimelineStep {
  id: string;
  label: string;
  timestamp?: string;
  status: 'completed' | 'current' | 'upcoming';
  note?: string;
}

export interface TimelineProps {
  currentStage?: 1 | 2 | 3 | 4 | 5; // 1: Requested, 2: Found, 3: Packed, 4: On the way, 5: Delivered
  steps?: TimelineStep[];
  exceptionNote?: {
    type: 'delay' | 'alert' | 'partial';
    title: string;
    description: string;
  } | null;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_STEPS: Omit<TimelineStep, 'status'>[] = [
  { id: 'step-1', label: 'Requested', timestamp: '14:15' },
  { id: 'step-2', label: 'Source found', timestamp: '14:22' },
  { id: 'step-3', label: 'Packed', timestamp: '14:38' },
  { id: 'step-4', label: 'On the way', timestamp: '14:44' },
  { id: 'step-5', label: 'Delivered', timestamp: 'est. 15:15' },
];

export const Timeline: React.FC<TimelineProps> = ({
  currentStage = 4,
  steps,
  exceptionNote = null,
  className = '',
  style,
}) => {
  const resolvedSteps: TimelineStep[] =
    steps ||
    DEFAULT_STEPS.map((s, idx) => {
      const stepNum = idx + 1;
      let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
      if (stepNum < currentStage) status = 'completed';
      else if (stepNum === currentStage) status = 'current';
      return { ...s, status };
    });

  return (
    <div
      className={`cockpit-timeline ${className}`}
      data-testid="cockpit-timeline"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        ...style,
      }}
    >
      {/* Horizontal Steps Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${resolvedSteps.length}, 1fr)`,
          gap: '8px',
          position: 'relative',
        }}
      >
        {resolvedSteps.map((step, idx) => {
          const isDone = step.status === 'completed';
          const isCurrent = step.status === 'current';

          return (
            <div
              key={step.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                position: 'relative',
              }}
            >
              {/* Connector Bar */}
              <div
                style={{
                  height: '4px',
                  borderRadius: '2px',
                  background: isDone
                    ? COCKPIT_TOKENS.status.green.solid
                    : isCurrent
                    ? COCKPIT_TOKENS.lavender[500]
                    : 'rgba(20, 27, 45, 0.10)',
                  transition: 'background 0.2s ease',
                }}
              />

              {/* Step Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: isDone
                      ? COCKPIT_TOKENS.status.green.solid
                      : isCurrent
                      ? COCKPIT_TOKENS.lavender[500]
                      : 'rgba(20, 27, 45, 0.15)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 700,
                  }}
                >
                  {isDone ? <Check size={11} strokeWidth={3} /> : idx + 1}
                </div>

                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: isCurrent ? 700 : isDone ? 600 : 500,
                    color: isCurrent || isDone ? COCKPIT_TOKENS.ink.primary : COCKPIT_TOKENS.ink.subtle,
                  }}
                >
                  {step.label}
                </span>
              </div>

              {step.timestamp && (
                <div
                  className="cockpit-label"
                  style={{
                    fontSize: '11px',
                    color: isCurrent ? COCKPIT_TOKENS.lavender[800] : COCKPIT_TOKENS.ink.muted,
                  }}
                >
                  {step.timestamp}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Exception Note Banner (keeps context without collapsing timeline per Section 1.8 & 6) */}
      {exceptionNote && (
        <div
          data-testid="timeline-exception-note"
          style={{
            padding: '12px 16px',
            borderRadius: COCKPIT_TOKENS.radii.sm,
            background:
              exceptionNote.type === 'alert'
                ? COCKPIT_TOKENS.status.red.bg
                : exceptionNote.type === 'delay'
                ? COCKPIT_TOKENS.status.amber.bg
                : COCKPIT_TOKENS.lavender[50],
            border: `1px solid ${
              exceptionNote.type === 'alert'
                ? COCKPIT_TOKENS.status.red.border
                : exceptionNote.type === 'delay'
                ? COCKPIT_TOKENS.status.amber.border
                : COCKPIT_TOKENS.lavender[200]
            }`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <span style={{ marginTop: '1px' }}>
            {exceptionNote.type === 'alert' ? (
              <AlertTriangle size={18} color={COCKPIT_TOKENS.status.red.text} />
            ) : (
              <Clock size={18} color={COCKPIT_TOKENS.status.amber.text} />
            )}
          </span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color:
                  exceptionNote.type === 'alert'
                    ? COCKPIT_TOKENS.status.red.text
                    : exceptionNote.type === 'delay'
                    ? COCKPIT_TOKENS.status.amber.text
                    : COCKPIT_TOKENS.lavender[800],
              }}
            >
              {exceptionNote.title}
            </div>
            <div style={{ fontSize: '12px', color: COCKPIT_TOKENS.ink.secondary, marginTop: '2px' }}>
              {exceptionNote.description}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

