import React from 'react';
import { useStoryStore } from '../../store/storyStore';

export const DebugProgressReadout: React.FC = () => {
  const [collapsed, setCollapsed] = React.useState(true);
  const progress = useStoryStore((state) => state.progress);
  const routeMode = useStoryStore((state) => state.routeMode);
  const mapCreated = useStoryStore((state) => state.mapCreated);
  const setProgress = useStoryStore((state) => state.setProgress);

  const handleJump = (val: number) => {
    setProgress(val);
    if (routeMode === 'story') {
      const lenis = (window as any).__lenis;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (lenis && typeof lenis.scrollTo === 'function') {
        lenis.scrollTo(maxScroll * val, { immediate: true });
      } else {
        window.scrollTo({ top: maxScroll * val, behavior: 'instant' });
      }
    }
  };

  return (
    <div
      id="story-debug-readout"
      style={{
        position: 'fixed',
        top: '14px',
        right: '170px',
        zIndex: 9999,
        background: 'rgba(12, 14, 20, 0.88)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '8px',
        padding: '10px 14px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '11px',
        color: '#F8FAFC',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        pointerEvents: 'auto',
        minWidth: collapsed ? 'auto' : '220px',
      }}
    >
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: collapsed ? 0 : '6px',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#94A3B8', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em' }}>
            DEBUG // MAP
          </span>
          <span style={{ color: '#38BDF8', fontSize: '10px' }}>{progress.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              padding: '1px 5px',
              borderRadius: '3px',
              fontSize: '8px',
              fontWeight: 700,
              background: mapCreated ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
              color: mapCreated ? '#10B981' : '#F43F5E',
              border: `1px solid ${mapCreated ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
            }}
          >
            {mapCreated ? '1x' : 'INIT'}
          </span>
          <span style={{ fontSize: '9px', color: '#64748B' }}>{collapsed ? '▲' : '▼'}</span>
        </div>
      </div>

      {!collapsed && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#94A3B8' }}>progress:</span>
            <strong style={{ color: '#38BDF8' }}>{progress.toFixed(3)}</strong>
          </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: '#94A3B8' }}>routeMode:</span>
        <strong style={{ color: routeMode === 'workspace' ? '#10B981' : '#F59E0B' }}>
          {routeMode}
        </strong>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ color: '#94A3B8' }}>interaction:</span>
        <strong style={{ color: routeMode === 'workspace' ? '#10B981' : '#64748B' }}>
          {routeMode === 'workspace' ? 'ENABLED' : 'DISABLED'}
        </strong>
      </div>

      {/* Progress scrubbing scrubber / quick jumpers */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        {[0, 0.25, 0.5, 0.75, 1.0].map((val) => (
          <button
            key={val}
            onClick={() => handleJump(val)}
            style={{
              flex: 1,
              padding: '3px 0',
              fontSize: '9px',
              fontFamily: "'JetBrains Mono', monospace",
              background: Math.abs(progress - val) < 0.03 ? '#38BDF8' : 'rgba(255,255,255,0.06)',
              color: Math.abs(progress - val) < 0.03 ? '#08090D' : '#94A3B8',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {val}
          </button>
        ))}
      </div>

      {/* Quick Route Switcher to test acceptance criteria */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={() => {
            window.location.hash = '#/';
          }}
          style={{
            flex: 1,
            padding: '4px 6px',
            fontSize: '10px',
            fontFamily: "'JetBrains Mono', monospace",
            background: routeMode === 'story' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(255,255,255,0.05)',
            color: routeMode === 'story' ? '#F59E0B' : '#CBD5E1',
            border: `1px solid ${routeMode === 'story' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          #/ (Story)
        </button>
        <button
          onClick={() => {
            window.location.hash = '#/workspace/map';
          }}
          style={{
            flex: 1,
            padding: '4px 6px',
            fontSize: '10px',
            fontFamily: "'JetBrains Mono', monospace",
            background: routeMode === 'workspace' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255,255,255,0.05)',
            color: routeMode === 'workspace' ? '#10B981' : '#CBD5E1',
            border: `1px solid ${routeMode === 'workspace' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          #/workspace/map
        </button>
      </div>
    </>
  )}
</div>
  );
};

export default DebugProgressReadout;
