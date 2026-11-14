import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import rawHospitals from '../world/hospitals.json';
import { Truck } from 'lucide-react';
import { CLINICAL_ATLAS_STYLE } from '../story/clinicalAtlasStyle';

interface HospitalRouteMapProps {
  fromCode: string;
  toCode: string;
  vehicleId?: string;
  elapsedPct?: number; // 0 to 100
  tempC?: number;
  minutesRemaining?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const HospitalRouteMap: React.FC<HospitalRouteMapProps> = ({
  fromCode,
  toCode,
  vehicleId = 'VAN-02',
  elapsedPct = 58,
  tempC = 22.0,
  minutesRemaining = 8,
  className = '',
  style,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapError, setMapError] = useState(false);

  const fromHosp = rawHospitals.find((h) => h.code.toUpperCase() === fromCode.toUpperCase()) || {
    name: 'Medanta Hub',
    code: 'MDT',
    lng: 77.0408,
    lat: 28.4395,
  };

  const toHosp = rawHospitals.find((h) => h.code.toUpperCase() === toCode.toUpperCase()) || {
    name: 'Safdarjung Hospital',
    code: 'SFD',
    lng: 77.2100,
    lat: 28.5672,
  };

  // Intermediate curved waypoints through NCR Delhi arterial corridors
  const midLng = fromHosp.lng + (toHosp.lng - fromHosp.lng) * 0.48 - 0.015;
  const midLat = fromHosp.lat + (toHosp.lat - fromHosp.lat) * 0.52 + 0.012;

  const routeCoords: [number, number][] = [
    [fromHosp.lng, fromHosp.lat],
    [fromHosp.lng + (midLng - fromHosp.lng) * 0.5, fromHosp.lat + (midLat - fromHosp.lat) * 0.5],
    [midLng, midLat],
    [midLng + (toHosp.lng - midLng) * 0.5, midLat + (toHosp.lat - midLat) * 0.5],
    [toHosp.lng, toHosp.lat],
  ];

  // Current interpolated vehicle position along route
  const progressRatio = Math.max(0.05, Math.min(0.95, elapsedPct / 100));
  const currentLng = fromHosp.lng + (toHosp.lng - fromHosp.lng) * progressRatio;
  const currentLat = fromHosp.lat + (toHosp.lat - fromHosp.lat) * progressRatio + Math.sin(progressRatio * Math.PI) * 0.014;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: CLINICAL_ATLAS_STYLE,
        center: [(fromHosp.lng + toHosp.lng) / 2, (fromHosp.lat + toHosp.lat) / 2],
        zoom: 11,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on('load', () => {
        // Fit bounds to include both hospitals with generous padding
        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([fromHosp.lng, fromHosp.lat]);
        bounds.extend([toHosp.lng, toHosp.lat]);
        map.fitBounds(bounds, { padding: 45, maxZoom: 13, duration: 0 });

        // Add Route GeoJSON Line
        map.addSource('dispatch-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routeCoords,
            },
          },
        });

        // Glowing outer halo
        map.addLayer({
          id: 'route-glow',
          type: 'line',
          source: 'dispatch-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#A855F7',
            'line-width': 8,
            'line-opacity': 0.35,
          },
        });

        // Sharp active polyline
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'dispatch-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#9333EA',
            'line-width': 3.5,
          },
        });

        // 1. Source Hospital Marker
        const fromEl = document.createElement('div');
        fromEl.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;">
            <div style="background:#0F172A;color:#FFFFFF;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25);margin-bottom:4px;font-family:'Inter',sans-serif;">
              ${fromHosp.code} · ${fromHosp.name}
            </div>
            <div style="width:12px;height:12px;border-radius:50%;background:#9333EA;border:2px solid #FFFFFF;box-shadow:0 0 8px rgba(147,51,234,0.6);"></div>
          </div>
        `;
        new maplibregl.Marker({ element: fromEl }).setLngLat([fromHosp.lng, fromHosp.lat]).addTo(map);

        // 2. Receiving Hospital Marker
        const toEl = document.createElement('div');
        toEl.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;">
            <div style="background:#10B981;color:#FFFFFF;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(16,185,129,0.35);margin-bottom:4px;font-family:'Inter',sans-serif;">
              ${toHosp.code} · Receiving Bay
            </div>
            <div style="width:14px;height:14px;border-radius:50%;background:#10B981;border:2.5px solid #FFFFFF;box-shadow:0 0 10px rgba(16,185,129,0.8);"></div>
          </div>
        `;
        new maplibregl.Marker({ element: toEl }).setLngLat([toHosp.lng, toHosp.lat]).addTo(map);

        // 3. Live Moving Vehicle Marker with Tooltip
        const vehicleEl = document.createElement('div');
        vehicleEl.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;position:relative;pointer-events:none;">
            <div style="background:#1E293B;color:#FFFFFF;padding:4px 9px;border-radius:7px;font-size:10px;font-weight:600;white-space:nowrap;box-shadow:0 4px 14px rgba(15,23,42,0.3);display:flex;align-items:center;gap:5px;font-family:'Inter',sans-serif;margin-bottom:5px;">
              <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#10B981;"></span>
              <span>${tempC.toFixed(1)}°C · ${minutesRemaining} min left</span>
            </div>
            <div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid #1E293B;margin-top:-6px;margin-bottom:2px;"></div>
            <div style="background:#0F172A;color:#FFFFFF;border:2px solid #FFFFFF;padding:3px 8px;border-radius:999px;font-size:9.5px;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,0.35);display:flex;align-items:center;gap:4px;">
              <span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:#8B5CF6;"></span>
              <span>${vehicleId}</span>
            </div>
          </div>
        `;
        new maplibregl.Marker({ element: vehicleEl }).setLngLat([currentLng, currentLat]).addTo(map);
      });
    } catch (_err) {
      setMapError(true);
    }

    return () => {
      mapRef.current?.remove();
    };
  }, [fromHosp.lng, fromHosp.lat, toHosp.lng, toHosp.lat, currentLng, currentLat, tempC, minutesRemaining, vehicleId]);

  return (
    <div
      data-testid="hospital-route-map-container"
      className={className}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 380,
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        background: '#F8FAFC',
        border: '1px solid rgba(15,23,42,0.06)',
        ...style,
      }}
    >
      {!mapError ? (
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />
      ) : (
        /* High-craft SVG fallback if WebGL unavailable */
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 500 320" style={{ width: '100%', height: '100%' }}>
            {/* Soft grid background */}
            <defs>
              <pattern id="routeMapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(15,23,42,0.04)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="500" height="320" fill="url(#routeMapGrid)" />

            {/* Glowing route curve */}
            <path d="M 90 220 Q 230 140 400 90" stroke="#A855F7" strokeWidth="8" strokeOpacity="0.3" fill="none" strokeLinecap="round" />
            <path d="M 90 220 Q 230 140 400 90" stroke="#9333EA" strokeWidth="3.5" fill="none" strokeLinecap="round" />

            {/* Source Pin */}
            <g transform="translate(90, 220)">
              <circle r="6" fill="#9333EA" stroke="#FFFFFF" strokeWidth="2" />
              <rect x="-45" y="12" width="90" height="22" rx="5" fill="#0F172A" />
              <text x="0" y="27" fill="#FFFFFF" fontSize="9.5" fontWeight="700" textAnchor="middle" fontFamily="'Inter', sans-serif">
                {fromHosp.code} · {fromHosp.name}
              </text>
            </g>

            {/* Destination Pin */}
            <g transform="translate(400, 90)">
              <circle r="7" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.5" />
              <rect x="-55" y="-32" width="110" height="22" rx="5" fill="#10B981" />
              <text x="0" y="-18" fill="#FFFFFF" fontSize="9.5" fontWeight="700" textAnchor="middle" fontFamily="'Inter', sans-serif">
                {toHosp.code} · Receiving bay
              </text>
            </g>

            {/* Live Vehicle Marker */}
            <g transform="translate(260, 140)">
              <rect x="-65" y="-36" width="130" height="24" rx="7" fill="#1E293B" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.25))" />
              <polygon points="-4,-12 4,-12 0,-8" fill="#1E293B" />
              <circle cx="-50" cy="-24" r="3" fill="#10B981" />
              <text x="0" y="-20" fill="#FFFFFF" fontSize="10" fontWeight="600" textAnchor="middle" fontFamily="'Inter', sans-serif">
                {tempC.toFixed(1)}°C · {minutesRemaining} min left
              </text>
              <rect x="-32" y="2" width="64" height="22" rx="11" fill="#0F172A" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="-16" cy="13" r="3" fill="#8B5CF6" />
              <text x="6" y="16" fill="#FFFFFF" fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="'Inter', sans-serif">
                {vehicleId}
              </text>
            </g>
          </svg>
        </div>
      )}

      {/* Floating Card Badge Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(8px)',
          borderRadius: 10,
          padding: '6px 12px',
          boxShadow: '0 2px 10px rgba(15,23,42,0.06)',
          border: '1px solid rgba(15,23,42,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          zIndex: 10,
        }}
      >
        <Truck size={14} color="#9333EA" />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}>
          Live Courier GPS · {vehicleId}
        </span>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
      </div>
    </div>
  );
};
