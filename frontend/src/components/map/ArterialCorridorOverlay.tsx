import React, { useEffect, useRef } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { getPointAlongCurvedCorridor, getCurvedSegment } from '../../lib/delhiRoadCorridors';

export interface ArterialRouteItem {
  id: string;
  source: string;
  target: string;
  blood: string;
  units: number;
  eta: number;
  routeColor: string;
  coords: [number, number][];
  isSelected?: boolean;
}

interface ArterialCorridorOverlayProps {
  map: MapLibreMap | null;
  routes: ArterialRouteItem[];
  visible?: boolean;
}

// Deterministic speed and phase offsets per route so pulses travel dynamically in cascade
const ROUTE_TIMING_PROFILES: Record<string, { durationMs: number; phaseOffsetMs: number }> = {
  'ND-03-ND-01': { durationMs: 4400, phaseOffsetMs: 0 },       // MAX -> AIM (Critical)
  'ND-04-ND-07': { durationMs: 5000, phaseOffsetMs: 1400 },    // N62 -> GTB (Rebalance)
  'ND-05-ND-18': { durationMs: 4600, phaseOffsetMs: 2700 },    // MDT -> NH4 (Expiry)
  'ND-11-ND-09': { durationMs: 5400, phaseOffsetMs: 800 },     // APL -> LNJ (Rebalance)
  'ND-23-ND-19': { durationMs: 4000, phaseOffsetMs: 2100 },    // Artemis -> Paras (Critical)
  'ND-06-ND-01': { durationMs: 4500, phaseOffsetMs: 3300 },    // FTN -> AIM (Critical)
  'ND-14-ND-10': { durationMs: 4200, phaseOffsetMs: 1900 },    // BLK -> SGR (Expiry)
  'ND-04-ND-01': { durationMs: 4800, phaseOffsetMs: 1100 },    // N62 -> AIM
};

export const ArterialCorridorOverlay: React.FC<ArterialCorridorOverlayProps> = ({
  map,
  routes,
  visible = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const polylinesRef = useRef<Record<string, SVGPolylineElement | null>>({});
  const headsRef = useRef<Record<string, SVGCircleElement | null>>({});
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!visible || !map || routes.length === 0) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    const animate = () => {
      const now = performance.now();

      for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        if (!route.coords || route.coords.length < 2) continue;

        const routeKey = `${route.source}-${route.target}`;
        const timing = ROUTE_TIMING_PROFILES[routeKey] || {
          durationMs: 4600 + (i % 3) * 400,
          phaseOffsetMs: (i * 900) % 3600,
        };

        const totalCycle = timing.durationMs;
        const progressT = ((now + timing.phaseOffsetMs) % totalCycle) / totalCycle;

        // Smooth fade-in on departure (0..0.08) and fade-out on landing (0.92..1.0)
        let opacity = 1.0;
        if (progressT < 0.08) {
          opacity = progressT / 0.08;
        } else if (progressT > 0.92) {
          opacity = (1.0 - progressT) / 0.08;
        }

        // Head position
        const { coord: headCoord } = getPointAlongCurvedCorridor(route.coords, progressT);
        let headScreen = { x: -9999, y: -9999 };
        try {
          const pt = map.project(headCoord);
          headScreen = { x: Math.round(pt.x * 10) / 10, y: Math.round(pt.y * 10) / 10 };
        } catch {
          // Map projection unavailable
        }

        // 1. Trailing comet path (last 16% of curve behind the leading pulse)
        const cometPolyline = polylinesRef.current[route.id];
        if (cometPolyline) {
          const trailStartT = Math.max(0, progressT - 0.16);
          const segmentCoords = getCurvedSegment(route.coords, trailStartT, progressT, 10);

          let pointsStr = '';
          for (let j = 0; j < segmentCoords.length; j++) {
            try {
              const pt = map.project(segmentCoords[j]);
              pointsStr += `${Math.round(pt.x * 10) / 10},${Math.round(pt.y * 10) / 10} `;
            } catch {
              // Ignore
            }
          }

          if (pointsStr) {
            cometPolyline.setAttribute('points', pointsStr.trim());
            cometPolyline.style.opacity = `${(opacity * 0.95).toFixed(3)}`;
          }
        }

        // 2. Luminous comet head glowing dot
        const headDot = headsRef.current[route.id];
        if (headDot) {
          if (headScreen.x > -100 && headScreen.y > -100) {
            headDot.setAttribute('cx', `${headScreen.x}`);
            headDot.setAttribute('cy', `${headScreen.y}`);
            headDot.style.opacity = `${(opacity * 0.95).toFixed(3)}`;
          }
        }
      }

      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [map, routes, visible]);

  if (!visible || routes.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="arterial-corridor-overlay-root"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 26,
        overflow: 'hidden',
      }}
    >
      {/* SVG layer for Layer 3 Animated Comet Pulse Trails (Zero moving dark box pills!) */}
      <svg
        className="arterial-corridor-svg-layer"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
        }}
      >
        <defs>
          <filter id="comet-pulse-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {routes.map((route) => (
          <g key={`comet-group-${route.id}`}>
            {/* Glowing comet trail line */}
            <polyline
              ref={(el) => {
                polylinesRef.current[route.id] = el;
              }}
              stroke={route.routeColor}
              strokeWidth={route.isSelected ? '4.5' : '3.2'}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              filter="url(#comet-pulse-glow)"
              style={{
                opacity: 0,
                willChange: 'points, opacity',
              }}
            />

            {/* Luminous comet head pulse */}
            <circle
              ref={(el) => {
                headsRef.current[route.id] = el;
              }}
              r={route.isSelected ? '5.0' : '3.8'}
              fill="#FFFFFF"
              stroke={route.routeColor}
              strokeWidth="2.2"
              filter="url(#comet-pulse-glow)"
              style={{
                opacity: 0,
                willChange: 'cx, cy, opacity',
              }}
            />
          </g>
        ))}
      </svg>
    </div>
  );
};
