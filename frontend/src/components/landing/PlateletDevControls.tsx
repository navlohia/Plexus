import { useState, useCallback } from 'react';
import { useStoryStore, DEFAULT_PLATELET_SETTINGS } from '../../store/storyStore';
import { Sliders, Copy, Check, RefreshCw, Zap } from 'lucide-react';

export default function PlateletDevControls() {
  const [collapsed, setCollapsed] = useState(true);
  const [copied, setCopied] = useState(false);

  const progress = useStoryStore((s) => s.progress);
  const setProgress = useStoryStore((s) => s.setProgress);
  const devSettings = useStoryStore((s) => s.devSettings);
  const setDevSettings = useStoryStore((s) => s.setDevSettings);
  const useLiteMaterial = useStoryStore((s) => s.useLiteMaterial);
  const setUseLiteMaterial = useStoryStore((s) => s.setUseLiteMaterial);
  const fps = useStoryStore((s) => s.fps);
  const plateletScreen = useStoryStore((s) => s.plateletScreen);
  const showVoronoiSeeds = useStoryStore((s) => s.showVoronoiSeeds);
  const setShowVoronoiSeeds = useStoryStore((s) => s.setShowVoronoiSeeds);

  const handleProgressChange = useCallback((newP: number) => {
    setProgress(newP);
    if (typeof window !== 'undefined') {
      const lenis = (window as any).__lenis;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (lenis && typeof lenis.scrollTo === 'function') {
        lenis.scrollTo(maxScroll * newP, { immediate: true });
      } else {
        window.scrollTo(0, maxScroll * newP);
      }
    }
  }, [setProgress]);

  const handleCopy = useCallback(() => {
    const jsonStr = JSON.stringify(devSettings, null, 2);
    navigator.clipboard.writeText(jsonStr).catch(() => {});
    console.log('[PlateletDevControls] Exported Settings JSON:\n', jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [devSettings]);

  const handleReset = useCallback(() => {
    setDevSettings(DEFAULT_PLATELET_SETTINGS);
  }, [setDevSettings]);

  // Compute current uAge
  const uAge = Math.max(0, Math.min(1, (progress - 0.15) / (0.30 - 0.15)));

  if (!import.meta.env.DEV) return null;

  return (
    <div
      className="platelet-dev-controls"
      style={{
        position: 'fixed',
        top: '14px',
        left: '160px',
        zIndex: 9999,
        backgroundColor: 'rgba(15, 7, 12, 0.92)',
        border: '1px solid rgba(242, 198, 207, 0.22)',
        borderRadius: '10px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.65)',
        color: '#E2E8F0',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: '11px',
        padding: collapsed ? '8px 12px' : '14px 16px',
        minWidth: collapsed ? 'auto' : '300px',
        maxWidth: '340px',
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          paddingBottom: collapsed ? 0 : '10px',
          borderBottom: collapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={13} color="#F2C6CF" />
          <span style={{ fontWeight: 600, color: '#F2C6CF', letterSpacing: '0.5px' }}>
            PLATELET DEV
          </span>
          <span
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '4px',
              background: useLiteMaterial ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)',
              color: useLiteMaterial ? '#FACC15' : '#4ADE80',
            }}
          >
            {useLiteMaterial ? 'LITE' : 'PBR'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8' }}>
          <span>{fps} FPS</span>
          <span style={{ fontSize: '10px' }}>{collapsed ? '▲' : '▼'}</span>
        </div>
      </div>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          {/* Telemetry Readout */}
          <div
            style={{
              padding: '6px 8px',
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '6px',
              fontSize: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              color: '#94A3B8',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Progress: {(progress * 100).toFixed(1)}%</span>
              <span style={{ color: uAge > 0 ? '#FB7185' : '#94A3B8' }}>
                uAge: {(uAge * 100).toFixed(0)}% ({uAge < 0.01 ? 'fresh' : uAge >= 1 ? 'dull/tired' : 'aging'})
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Screen Center:</span>
              <span style={{ color: '#E2E8F0' }}>
                {plateletScreen ? `${plateletScreen.x.toFixed(0)}px, ${plateletScreen.y.toFixed(0)}px` : 'N/A'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Apparent Radius:</span>
              <span style={{ color: '#E2E8F0' }}>
                {plateletScreen ? `${plateletScreen.radius.toFixed(1)}px` : 'N/A'}
              </span>
            </div>
          </div>

          {/* Progress Scrubber (0.00 .. 1.00) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ color: '#94A3B8' }}>Progress Scrubber:</span>
              <span style={{ color: '#F2C6CF' }}>{progress.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.0"
              step="0.005"
              value={progress}
              onChange={(e) => handleProgressChange(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#F2C6CF' }}
            />
            {/* Fracture Step Buttons */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
              {[0.30, 0.32, 0.33, 0.36].map((p) => (
                <button
                  key={p}
                  onClick={() => handleProgressChange(p)}
                  style={{
                    flex: 1,
                    padding: '3px 0',
                    fontSize: '10px',
                    borderRadius: '4px',
                    backgroundColor: Math.abs(progress - p) < 0.003 ? 'rgba(242, 198, 207, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                    color: Math.abs(progress - p) < 0.003 ? '#F2C6CF' : '#94A3B8',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                  }}
                >
                  {p.toFixed(2)}
                </button>
              ))}
            </div>
          </div>

          {/* Voronoi Seeds Overlay Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 6px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '6px',
            }}
          >
            <span style={{ color: '#94A3B8' }}>Voronoi Seeds (25):</span>
            <button
              onClick={() => setShowVoronoiSeeds(!showVoronoiSeeds)}
              style={{
                padding: '2px 8px',
                fontSize: '10px',
                borderRadius: '4px',
                backgroundColor: showVoronoiSeeds ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                color: showVoronoiSeeds ? '#F87171' : '#94A3B8',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
              }}
            >
              {showVoronoiSeeds ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Tilt (0° .. 45°) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ color: '#94A3B8' }}>Tilt Angle:</span>
              <span>{devSettings.tiltDeg.toFixed(1)}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="45"
              step="1"
              value={devSettings.tiltDeg}
              onChange={(e) => setDevSettings({ tiltDeg: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#F2C6CF' }}
            />
          </div>

          {/* Thickness (0.4 .. 2.5) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ color: '#94A3B8' }}>Optical Thickness:</span>
              <span>{devSettings.thickness.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.05"
              value={devSettings.thickness}
              onChange={(e) => setDevSettings({ thickness: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#F2C6CF' }}
            />
          </div>

          {/* Roughness (0.05 .. 0.8) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ color: '#94A3B8' }}>Surface Roughness:</span>
              <span>{devSettings.roughness.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.8"
              step="0.02"
              value={devSettings.roughness}
              onChange={(e) => setDevSettings({ roughness: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#F2C6CF' }}
            />
          </div>

          {/* Transmission (0.0 .. 1.0) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ color: '#94A3B8' }}>Transmission:</span>
              <span>{devSettings.transmission.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={devSettings.transmission}
              onChange={(e) => setDevSettings({ transmission: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#F2C6CF' }}
            />
          </div>

          {/* Rim Fresnel Intensity (0.0 .. 2.0) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ color: '#94A3B8' }}>Rim Fresnel Glow:</span>
              <span>{devSettings.rimIntensity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="2.0"
              step="0.05"
              value={devSettings.rimIntensity}
              onChange={(e) => setDevSettings({ rimIntensity: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#F2C6CF' }}
            />
          </div>

          {/* Rotation Speed (0.0 .. 0.4 rad/s) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ color: '#94A3B8' }}>Rotation Speed:</span>
              <span>{devSettings.rotationSpeed.toFixed(2)} rad/s</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.4"
              step="0.02"
              value={devSettings.rotationSpeed}
              onChange={(e) => setDevSettings({ rotationSpeed: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#F2C6CF' }}
            />
          </div>

          {/* Toggle Material & Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={() => setUseLiteMaterial(!useLiteMaterial)}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: useLiteMaterial ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                color: useLiteMaterial ? '#FACC15' : '#E2E8F0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                fontFamily: 'inherit',
                fontSize: '10px',
              }}
            >
              <Zap size={11} />
              {useLiteMaterial ? 'Lite Mat' : 'PBR Mat'}
            </button>

            <button
              onClick={handleReset}
              title="Reset to defaults"
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#94A3B8',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '10px',
              }}
            >
              <RefreshCw size={11} />
            </button>
          </div>

          {/* Copy JSON Button */}
          <button
            onClick={handleCopy}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(242, 198, 207, 0.35)',
              backgroundColor: copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(242, 198, 207, 0.12)',
              color: copied ? '#4ADE80' : '#F2C6CF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontFamily: 'inherit',
              fontSize: '11px',
              fontWeight: 500,
              transition: 'all 0.15s ease',
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied JSON to Clipboard!' : 'Copy Current Values (JSON)'}
          </button>
        </div>
      )}
    </div>
  );
}

