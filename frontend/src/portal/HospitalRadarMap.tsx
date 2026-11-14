import React from 'react';
import zonesSvgData from '../data/zones.svg.json';
import { Compass } from 'lucide-react';

interface HospitalRadarMapProps {
  hospitalCode: string;
  inboundOrders?: Array<{ id: string; from: string; to: string; units: number; etaMin?: number }>;
  style?: React.CSSProperties;
}

export const HospitalRadarMap: React.FC<HospitalRadarMapProps> = ({
  hospitalCode,
  inboundOrders = [],
  style,
}) => {
  const districts = (zonesSvgData as any).districts || [];
  const hospitals = (zonesSvgData as any).hospitals || [];

  const targetHosp = hospitals.find((h: any) => h.code.toUpperCase() === hospitalCode.toUpperCase()) || {
    code: hospitalCode,
    name: 'Hospital',
    x: 174,
    y: 110,
  };

  return (
    <div
      data-testid="hospital-radar-map"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Compass size={15} color="#10B981" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}>
            Live NCR Radar · Inbound Corridors
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981', fontFamily: "'Inter', sans-serif" }}>
            Live Radar Active
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', flex: 1, minHeight: 180 }}>
        <svg
          viewBox="0 0 320 180"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          {/* District boundaries */}
          <g id="radar-districts">
            {districts.map((d: any) => (
              <path
                key={d.id}
                d={d.path}
                fill="#F1F5F9"
                stroke="#FFFFFF"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            ))}
          </g>

          {/* Radar concentric pulse rings around receiving hospital */}
          <g transform={`translate(${targetHosp.x}, ${targetHosp.y})`} pointerEvents="none">
            <circle r="16" fill="none" stroke="#10B981" strokeWidth="1.2" strokeOpacity="0.4" />
            <circle r="32" fill="none" stroke="#10B981" strokeWidth="1.0" strokeOpacity="0.25" strokeDasharray="3 3" />
            <circle r="48" fill="none" stroke="#10B981" strokeWidth="0.8" strokeOpacity="0.15" strokeDasharray="4 4" />
          </g>

          {/* Inbound Courier vectors to receiving hospital */}
          {inboundOrders.map((ord, idx) => {
            const fromH = hospitals.find((h: any) => h.code.toUpperCase() === ord.from?.toUpperCase());
            if (!fromH) return null;
            return (
              <g key={ord.id || idx}>
                <line
                  x1={fromH.x}
                  y1={fromH.y}
                  x2={targetHosp.x}
                  y2={targetHosp.y}
                  stroke="#8B5CF6"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                />
                <circle cx={fromH.x} cy={fromH.y} r="3.5" fill="#8B5CF6" stroke="#FFFFFF" strokeWidth="1" />
                <circle
                  cx={fromH.x + (targetHosp.x - fromH.x) * 0.65}
                  cy={fromH.y + (targetHosp.y - fromH.y) * 0.65}
                  r="4"
                  fill="#10B981"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              </g>
            );
          })}

          {/* Other hospital dots */}
          <g id="radar-hospitals" pointerEvents="none">
            {hospitals.map((h: any) => {
              const isTarget = h.code.toUpperCase() === hospitalCode.toUpperCase();
              if (isTarget) return null;
              return (
                <circle
                  key={h.code}
                  cx={h.x}
                  cy={h.y}
                  r="2.5"
                  fill="#94A3B8"
                  stroke="#FFFFFF"
                  strokeWidth="0.8"
                />
              );
            })}
          </g>

          {/* Target receiving hospital prominent pin */}
          <g transform={`translate(${targetHosp.x}, ${targetHosp.y})`}>
            <circle r="6" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
            <circle r="2.5" fill="#FFFFFF" />
          </g>
        </svg>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: '#64748B', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
        <span>Target: {hospitalCode} ({targetHosp.name})</span>
        <span>Boundary data: geoBoundaries</span>
      </div>
    </div>
  );
};

