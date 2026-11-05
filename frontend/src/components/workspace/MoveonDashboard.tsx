/**
 * MoveonDashboard.tsx
 * Exact 1:1 replica of the Moveon logistics dashboard (DISPATCH-SPEC.md),
 * re-skinned as Plexus platelet logistics dispatch.
 * — SPEC Section 1 (colors, typography) + Section 2 (Row 1 header, Row 2 Left + Right columns) —
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Bell,
  Globe,
  Truck as TruckIcon,
  ClipboardList,
  TrendingUp,
  Phone,
  MessageSquare,
  Clock,
  Filter,
  Calendar,
} from 'lucide-react';
import {
  useDispatchStore,
  selectActiveOrder,
  selectActiveOrderShelfLife,
  selectTotalRescuedUnits30D,
  select30DayHistory,
  selectExceptionsCount,
  selectUnitsInTransit,
  selectOnTimeDeliveryPct,
  selectTabCounts,
  selectZoneNetBalances,
  getZoneForHospital,
  type DailyHistoryPoint,
  type DispatchOrder,
} from '../../data/dispatch';
import { soundEngine } from '../../utils/soundEngine';
import { usePlexusStore } from '../../context/PlexusStore';

// ─── Tokens ──────────────────────────────────────────────────────────────────
const C = {
  canvas:    '#E4E5EC',
  board:     '#F2F3F7',
  card:      '#FFFFFF',
  cardMuted: 'rgba(255,255,255,0.55)',
  textPrimary:   '#18181B',
  textSecondary: '#8E929F',
  purple:    '#A855F7',
  purpleSoft:'#E9D5FF',
  purpleCube:'rgba(192,132,252,0.38)',
  purpleStroke:'rgba(147,51,234,0.55)',
  mint:      '#BBF7D0',
  mintTop:   '#86EFAC',
  mintBg:    '#ECFDF5',
  amber:     '#FDBA74',
  amberDeep: '#FB923C',
  amberBg:   '#FFFDF9',
  greenPill: '#BBF7D0',
  greenText: '#15803D',
  purplePillBg:'#E9D5FF',
  purplePillTx:'#7E22CE',
  amberPillBg:'#FDE68A',
  amberPillTx:'#B45309',
};

// ─── Wheel helper (reusable lug-nut wheel with 3D brushed alloy) ──────────────
function Wheel({
  cx,
  cy,
  r = 26,
  isSpinning,
}: {
  cx: number;
  cy: number;
  r?: number;
  isSpinning?: boolean;
}) {
  const rim = r * 0.72;
  const hub = r * 0.38;
  const lugR = r * 0.075;
  const lugRing = r * 0.52;
  return (
    <g>
      {/* Heavy 3D Rubber Tyre */}
      <circle cx={cx} cy={cy} r={r} fill="#18181B" />
      <circle cx={cx} cy={cy} r={r - 2.5} fill="#27272A" />
      {/* Rim & Lug Nuts (rotates during drive-off animation) */}
      <g style={isSpinning ? { animation: 'wheelSpin 0.15s linear infinite', transformOrigin: `${cx}px ${cy}px` } : undefined}>
        {/* Brushed-aluminum alloy rim */}
        <circle cx={cx} cy={cy} r={rim} fill="#E2E8F0" />
        {/* Inner rim bevel shadow */}
        <circle cx={cx} cy={cy} r={rim * 0.82} fill="#94A3B8" />
        <circle cx={cx} cy={cy} r={rim * 0.74} fill="#CBD5E1" />
        {/* 10 metallic lug bolts with shadow */}
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          return (
            <circle
              key={i}
              cx={cx + Math.cos(a) * lugRing}
              cy={cy + Math.sin(a) * lugRing}
              r={lugR}
              fill="#F1F5F9"
              stroke="#64748B"
              strokeWidth="0.5"
            />
          );
        })}
        {/* Recessed hub cap */}
        <circle cx={cx} cy={cy} r={hub} fill="#64748B" />
        <circle cx={cx} cy={cy} r={hub * 0.65} fill="#E2E8F0" />
        <circle cx={cx} cy={cy} r={hub * 0.3} fill="#0F172A" />
      </g>
    </g>
  );
}

// ─── Pure Vector Logistics Van (Studio 3D-shaded, facing left) ────────────────
function PureVectorVanSVG({
  withXray,
  litCubes,
  isSirenStrobing,
  isCargoFlashing,
  isSpinning,
}: {
  withXray?: boolean;
  litCubes?: number;
  isSirenStrobing?: boolean;
  isCargoFlashing?: boolean;
  isSpinning?: boolean;
}) {
  return (
    <svg viewBox="0 0 600 240" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        {/* 3D Cylindrical Clay Gradients */}
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="20%" stopColor="#F8FAFC" />
          <stop offset="70%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        <linearGradient id="cabGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="30%" stopColor="#F8FAFC" />
          <stop offset="75%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        {/* Deep Slate-Blue Glass Windshield */}
        <linearGradient id="windGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1E293B" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#334155" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#475569" stopOpacity="0.85" />
        </linearGradient>
        {/* Brushed Chrome Stack */}
        <linearGradient id="chromeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="35%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
        {/* Translucent Violet X-Ray Window */}
        <linearGradient id="xrayGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(192,132,252,0.38)" />
          <stop offset="100%" stopColor="rgba(147,51,234,0.2)" />
        </linearGradient>
        {/* Multi-stop Ground Contact Shadow */}
        <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(15, 23, 42, 0.24)" />
          <stop offset="55%" stopColor="rgba(15, 23, 42, 0.08)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      {/* ── Soft Studio Elliptical Ground Shadow ── */}
      <ellipse cx="305" cy="223" rx="275" ry="13" fill="url(#shadowGrad)" />

      {/* ══════════ REAR ISOTHERMAL LOGISTICS MODULE ══════════ */}
      {/* Main isothermal box */}
      <rect x="226" y="44" width="330" height="150" rx="7"
        fill="url(#bodyGrad)" stroke="#CBD5E1" strokeWidth="1.2" />
      {/* Top face bevel highlight */}
      <rect x="226" y="44" width="330" height="9" rx="6" fill="#FFFFFF" opacity="0.85" />
      {/* Bottom edge shadow strip */}
      <rect x="226" y="188" width="330" height="6" rx="3" fill="#94A3B8" opacity="0.5" />
      {/* Metallic frame rail border */}
      <rect x="228" y="46" width="326" height="146" rx="6" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
      {/* Top metallic accent rail */}
      <rect x="226" y="44" width="330" height="3" fill="#64748B" opacity="0.6" />

      {/* ══════════ 3D ISOMETRIC X-RAY CARGO BAY ══════════ */}
      {withXray && (
        <g style={isCargoFlashing ? { filter: 'drop-shadow(0 0 16px rgba(168, 85, 247, 0.95))', animation: 'cargoPulseGlow 0.35s infinite alternate' } : undefined}>
          {/* Translucent violet cutaway window */}
          <rect x="242" y="54" width="298" height="126" rx="5"
            fill="url(#xrayGrad)"
            stroke="rgba(147,51,234,0.55)"
            strokeWidth="1.3"
          />
          {/* Subtle inner ambient violet glow */}
          <rect x="242" y="54" width="298" height="126" rx="5"
            fill="rgba(192,132,252,0.09)"
          />

          {/* 6 columns × 4 rows of 3D ISOMETRIC PURPLE CARGO CUBES */}
          {Array.from({ length: 6 }, (_, col) => {
            const x = 246 + col * 46 + (col >= 3 ? 8 : 0);
            return Array.from({ length: 4 }, (_, row) => {
              const y = 60 + row * 28;
              const w = 40;
              const h = 23;
              const dx = 4;
              const dy = 3;
              const cubeIndex = col * 4 + (3 - row);
              const isLit = litCubes === undefined || cubeIndex < litCubes;

              return (
                <g key={`${col}-${row}`}>
                  {/* Top Facet (Angled back-right, light source from above) */}
                  <polygon
                    points={`${x},${y + dy} ${x + dx},${y} ${x + w},${y} ${x + w - dx},${y + dy}`}
                    fill={isLit ? "#D8B4FE" : "rgba(216, 180, 254, 0.22)"}
                    stroke={isLit ? "#A855F7" : "rgba(168, 85, 247, 0.3)"}
                    strokeWidth="0.8"
                    strokeLinejoin="round"
                  />
                  {/* Front Facet (Main facing facet) */}
                  <polygon
                    points={`${x},${y + dy} ${x + w - dx},${y + dy} ${x + w - dx},${y + h} ${x},${y + h}`}
                    fill={isLit ? "#C084FC" : "rgba(192, 132, 252, 0.16)"}
                    stroke={isLit ? "#9333EA" : "rgba(147, 51, 234, 0.25)"}
                    strokeWidth="0.8"
                    strokeLinejoin="round"
                  />
                  {/* Side Facet (Right facet, cast shadow) */}
                  <polygon
                    points={`${x + w - dx},${y + dy} ${x + w},${y} ${x + w},${y + h - dy} ${x + w - dx},${y + h}`}
                    fill={isLit ? "#9333EA" : "rgba(147, 51, 234, 0.18)"}
                    stroke={isLit ? "#7E22CE" : "rgba(126, 34, 206, 0.25)"}
                    strokeWidth="0.8"
                    strokeLinejoin="round"
                  />
                  {/* Front Facet Specular Glare Line */}
                  <line
                    x1={x + 3}
                    y1={y + dy + 3}
                    x2={x + 14}
                    y2={y + dy + 15}
                    stroke="#FFFFFF"
                    strokeWidth="1"
                    opacity={isLit ? 0.45 : 0.08}
                    strokeLinecap="round"
                  />
                </g>
              );
            });
          })}

          {/* Structural dark vertical T-beam divider */}
          <rect x="388" y="54" width="5" height="126" rx="2"
            fill="rgba(59, 18, 89, 0.55)" />
          {/* Top and bottom inner window track bars */}
          <rect x="242" y="54" width="298" height="4" rx="2" fill="rgba(59, 18, 89, 0.25)" />
          <rect x="242" y="176" width="298" height="4" rx="2" fill="rgba(59, 18, 89, 0.25)" />
        </g>
      )}

      {/* Rear door seam + lock rods */}
      <line x1="544" y1="48" x2="544" y2="190" stroke="#CBD5E1" strokeWidth="1.2" />
      <rect x="536" y="120" width="8" height="24" rx="4" fill="#94A3B8" stroke="#64748B" strokeWidth="0.8" />

      {/* ══════════ CHROME VERTICAL EXHAUST STACK ══════════ */}
      <rect x="216" y="28" width="9" height="162" rx="4.5" fill="url(#chromeGrad)" stroke="#64748B" strokeWidth="0.8" />
      {/* Curved top tip */}
      <path d="M220.5 28 Q220.5 16 232 14 L234 19 Q225 21 225 28 Z" fill="#E2E8F0" stroke="#64748B" strokeWidth="0.7" />
      {/* Perforated heat shield cylinder */}
      <rect x="214" y="56" width="13" height="96" rx="4" fill="url(#chromeGrad)" stroke="#64748B" strokeWidth="0.8" />
      {Array.from({ length: 9 }, (_, i) => (
        <circle key={i} cx={220.5} cy={66 + i * 10.5} r={1.9} fill="#0F172A" opacity="0.6" />
      ))}

      {/* ══════════ CAB (AERODYNAMIC HEAVY-DUTY LOGISTICS VEHICLE) ══════════ */}
      {/* Main cab outer path */}
      <path
        d="M45 204 L45 186 Q46 170 65 164 L96 142 Q108 132 118 102 L142 58 Q148 48 165 46 L218 44 L218 204 Z"
        fill="url(#cabGrad)"
        stroke="#CBD5E1"
        strokeWidth="1.2"
      />

      {/* Aerodynamic high-roof fairing highlight */}
      <path
        d="M142 58 Q148 48 165 46 L218 44 L218 52 L168 54 Q152 56 146 62 Z"
        fill="#FFFFFF"
        opacity="0.65"
      />

      {/* Low-profile cab emergency beacon bar */}
      <rect x="160" y="36" width="52" height="10" rx="5"
        fill="#18181B" stroke="#334155" strokeWidth="0.8" />
      {[165, 176, 187, 198].map((bx, i) => (
        <rect
          key={i}
          x={bx}
          y="38.5"
          width="8"
          height="5"
          rx="2.5"
          fill={i % 2 === 0 ? '#E11D48' : '#3B82F6'}
          opacity="0.9"
          style={isSirenStrobing ? {
            animation: i % 2 === 0 ? 'sirenStrobeRed 0.16s infinite alternate' : 'sirenStrobeBlue 0.16s infinite alternate',
          } : undefined}
        />
      ))}
      {isSirenStrobing && (
        <g>
          <ellipse cx="170" cy="34" rx="20" ry="9" fill="rgba(225, 29, 72, 0.45)" style={{ animation: 'sirenStrobeRed 0.16s infinite alternate' }} />
          <ellipse cx="192" cy="34" rx="20" ry="9" fill="rgba(59, 130, 246, 0.45)" style={{ animation: 'sirenStrobeBlue 0.16s infinite alternate' }} />
        </g>
      )}
      <rect x="160" y="36" width="52" height="2" rx="1" fill="rgba(255,255,255,0.4)" />

      {/* Aerodynamic windshield */}
      <path
        d="M102 140 Q112 128 122 96 L144 60 Q148 54 158 53 L204 53 L204 104 Q162 104 106 140 Z"
        fill="url(#windGrad)"
        stroke="#334155"
        strokeWidth="1"
      />
      {/* Windshield diagonal glare streaks */}
      <line x1="126" y1="62" x2="162" y2="100" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
      <line x1="140" y1="58" x2="170" y2="90" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />

      {/* Side window */}
      <rect x="58" y="78" width="42" height="30" rx="5"
        fill="#334155" stroke="#475569" strokeWidth="0.8" opacity="0.85" />
      <line x1="62" y1="82" x2="76" y2="104" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />

      {/* Cab door panel line */}
      <path d="M58 114 L58 188 L204 188 L204 114 Z" fill="none" stroke="#CBD5E1" strokeWidth="0.9" />
      {/* Recessed Door handle */}
      <rect x="150" y="142" width="24" height="7" rx="3.5"
        fill="#94A3B8" stroke="#64748B" strokeWidth="0.7" />
      <rect x="152" y="143" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.4)" />

      {/* Aerodynamic 3D side mirror */}
      <path d="M208 80 Q218 77 220 84 Q218 91 208 90 Z"
        fill="#94A3B8" stroke="#64748B" strokeWidth="0.8" />
      <rect x="209" y="81" width="8" height="8" rx="2" fill="#475569" opacity="0.85" />

      {/* Front bumper and headlight */}
      <rect x="40" y="186" width="24" height="20" rx="4"
        fill="#94A3B8" stroke="#64748B" strokeWidth="1" />
      <rect x="41" y="187" width="22" height="3" rx="1.5" fill="rgba(255,255,255,0.55)" />
      {/* Projector LED Headlight Cluster */}
      <rect x="46" y="132" width="15" height="22" rx="4"
        fill="#FEF08A" stroke="#EAB308" strokeWidth="0.8" />
      <rect x="47" y="133" width="13" height="6" rx="2" fill="#FFFFFF" opacity="0.7" />

      {/* ══════════ LOWER CHASSIS, STEP, & SIDE SKIRTS ══════════ */}
      {/* Cab lower step / battery box */}
      <rect x="120" y="186" width="88" height="22" rx="4" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="0.8" />
      <line x1="126" y1="193" x2="202" y2="193" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.65" />
      <line x1="126" y1="199" x2="202" y2="199" stroke="#64748B" strokeWidth="1.2" />

      {/* Trailer aerodynamic lower skirt */}
      <rect x="226" y="190" width="186" height="20" rx="4" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.8" />
      <line x1="226" y1="200" x2="412" y2="200" stroke="#CBD5E1" strokeWidth="1" />

      {/* Rear tandem wheel arches (Dark recessed #0F172A) */}
      <path d="M394 206 Q420 182 444 206 Q468 182 494 206 Z" fill="#0F172A" opacity="0.4" />
      {/* Mudflap */}
      <rect x="494" y="200" width="6" height="18" rx="1.5" fill="#18181B" />

      {/* ══════════ WHEELS ══════════ */}
      <Wheel cx={98} cy={210} r={25} isSpinning={isSpinning} />
      <Wheel cx={422} cy={210} r={25} isSpinning={isSpinning} />
      <Wheel cx={470} cy={210} r={25} isSpinning={isSpinning} />
    </svg>
  );
}

// ─── Pure Vector Delivery Bike (Zomato-Style Commuter Silhouette, facing left) ───
function PureVectorBikeSVG({
  litCubes,
  isSirenStrobing,
  isCargoFlashing,
  isSpinning,
}: {
  litCubes?: number;
  isSirenStrobing?: boolean;
  isCargoFlashing?: boolean;
  isSpinning?: boolean;
}) {
  return (
    <svg viewBox="0 0 600 240" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <linearGradient id="bikeBodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#F8FAFC" />
          <stop offset="75%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        <linearGradient id="bikeBoxGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="25%" stopColor="#F8FAFC" />
          <stop offset="70%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        <linearGradient id="xrayBikeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(192,132,252,0.38)" />
          <stop offset="100%" stopColor="rgba(147,51,234,0.2)" />
        </linearGradient>
        <radialGradient id="bikeShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(15, 23, 42, 0.22)" />
          <stop offset="55%" stopColor="rgba(15, 23, 42, 0.07)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      {/* ── Soft Ground Contact Shadow ── */}
      <ellipse cx="300" cy="223" rx="245" ry="12" fill="url(#bikeShadow)" />

      {/* ══════════ REAR CARRIER RACK & MOUNTING STRUTS ══════════ */}
      {/* Tubular black steel mounting frame */}
      <line x1="288" y1="140" x2="324" y2="175" stroke="#1E293B" strokeWidth="5" strokeLinecap="round" />
      <line x1="316" y1="175" x2="495" y2="175" stroke="#0F172A" strokeWidth="5.5" strokeLinecap="round" />
      <line x1="430" y1="175" x2="455" y2="206" stroke="#334155" strokeWidth="4" strokeLinecap="round" />

      {/* ══════════ ZOMATO-STYLE REAR SQUARE ISOTHERMAL DELIVERY BOX ══════════ */}
      {/* Main Square Delivery Box Body */}
      <rect x="320" y="58" width="195" height="136" rx="9"
        fill="url(#bikeBoxGrad)" stroke="#CBD5E1" strokeWidth="1.4" />
      {/* Top Bevel Highlight */}
      <rect x="320" y="58" width="195" height="9" rx="7" fill="#FFFFFF" opacity="0.85" />
      {/* Structural Beading Border */}
      <rect x="320" y="58" width="195" height="136" rx="9" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
      {/* Bottom base rail */}
      <rect x="320" y="186" width="195" height="8" rx="4" fill="#94A3B8" opacity="0.45" />

      {/* Heavy nylon mounting tie-downs */}
      <rect x="345" y="58" width="6" height="136" fill="#18181B" opacity="0.15" />
      <rect x="475" y="58" width="6" height="136" fill="#18181B" opacity="0.15" />

      {/* ══════════ 3D ISOMETRIC X-RAY CARGO BAY (BIKE 6U) ══════════ */}
      <g style={isCargoFlashing ? { filter: 'drop-shadow(0 0 16px rgba(168, 85, 247, 0.95))', animation: 'cargoPulseGlow 0.35s infinite alternate' } : undefined}>
        {/* Cutaway Window */}
        <rect x="332" y="68" width="171" height="114" rx="6"
          fill="url(#xrayBikeGrad)"
          stroke="rgba(147,51,234,0.6)"
          strokeWidth="1.2"
        />
        {/* Inner ambient violet glow */}
        <rect x="332" y="68" width="171" height="114" rx="6"
          fill="rgba(192,132,252,0.08)"
        />

        {/* 3 columns × 2 rows of 3D ISOMETRIC PURPLE CARGO CUBES (6u total capacity) */}
        {[
          { col: 0, x: 340 },
          { col: 1, x: 394 },
          { col: 2, x: 448 },
        ].map(({ col, x }) =>
          [0, 1].map((row) => {
            const y = row === 0 ? 74 : 124;
            const w = 46;
            const h = 42;
            const dx = 5;
            const dy = 4;
            const cubeIndex = col * 2 + (1 - row);
            const isLit = litCubes === undefined || cubeIndex < litCubes;

            return (
              <g key={`${col}-${row}`}>
                {/* Top Facet (Angled back-right) */}
                <polygon
                  points={`${x},${y + dy} ${x + dx},${y} ${x + w},${y} ${x + w - dx},${y + dy}`}
                  fill={isLit ? "#D8B4FE" : "rgba(216, 180, 254, 0.22)"}
                  stroke={isLit ? "#A855F7" : "rgba(168, 85, 247, 0.3)"}
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                />
                {/* Front Facet */}
                <polygon
                  points={`${x},${y + dy} ${x + w - dx},${y + dy} ${x + w - dx},${y + h} ${x},${y + h}`}
                  fill={isLit ? "#C084FC" : "rgba(192, 132, 252, 0.16)"}
                  stroke={isLit ? "#9333EA" : "rgba(147, 51, 234, 0.25)"}
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                />
                {/* Side Facet */}
                <polygon
                  points={`${x + w - dx},${y + dy} ${x + w},${y} ${x + w},${y + h - dy} ${x + w - dx},${y + h}`}
                  fill={isLit ? "#9333EA" : "rgba(147, 51, 234, 0.18)"}
                  stroke={isLit ? "#7E22CE" : "rgba(126, 34, 206, 0.25)"}
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                />
                {/* Front Facet Diagonal Specular Glare */}
                <line
                  x1={x + 4}
                  y1={y + dy + 4}
                  x2={x + 18}
                  y2={y + dy + 24}
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                  opacity={isLit ? 0.45 : 0.08}
                  strokeLinecap="round"
                />
              </g>
            );
          })
        )}

        {/* Structural vertical divider beam */}
        <rect x="441" y="68" width="4" height="114" rx="2" fill="rgba(59, 18, 89, 0.45)" />
      </g>

      {/* Low-profile emergency beacon on top of cargo box */}
      <rect x="365" y="48" width="52" height="9" rx="4.5"
        fill="#18181B" stroke="#334155" strokeWidth="0.8" />
      {[370, 382, 394, 406].map((bx, i) => (
        <rect
          key={i}
          x={bx}
          y="50"
          width="8"
          height="5"
          rx="2.5"
          fill={i % 2 === 0 ? '#E11D48' : '#3B82F6'}
          opacity="0.9"
          style={isSirenStrobing ? {
            animation: i % 2 === 0 ? 'sirenStrobeRed 0.16s infinite alternate' : 'sirenStrobeBlue 0.16s infinite alternate',
          } : undefined}
        />
      ))}
      {isSirenStrobing && (
        <g>
          <ellipse cx="376" cy="46" rx="18" ry="9" fill="rgba(225, 29, 72, 0.45)" style={{ animation: 'sirenStrobeRed 0.16s infinite alternate' }} />
          <ellipse cx="400" cy="46" rx="18" ry="9" fill="rgba(59, 130, 246, 0.45)" style={{ animation: 'sirenStrobeBlue 0.16s infinite alternate' }} />
        </g>
      )}

      {/* Rear door hinge seam + lock clamp */}
      <line x1="508" y1="62" x2="508" y2="190" stroke="#CBD5E1" strokeWidth="1.2" />
      <rect x="502" y="122" width="7" height="18" rx="3.5" fill="#94A3B8" />

      {/* ══════════ COMMUTER MOTORCYCLE SILHOUETTE ══════════ */}
      {/* Dark engine block & crankcase */}
      <rect x="220" y="152" width="74" height="46" rx="6"
        fill="#1E293B" stroke="#334155" strokeWidth="1" />
      {/* Horizontal cooling fins */}
      {[160, 168, 176, 184].map((fy) => (
        <line key={fy} x1="225" y1={fy} x2="288" y2={fy} stroke="#475569" strokeWidth="2" strokeLinecap="round" />
      ))}
      {/* Engine round crankcase clutch cover */}
      <circle cx="282" cy="174" r="12" fill="#334155" stroke="#64748B" strokeWidth="1" />
      <circle cx="282" cy="174" r="6" fill="#94A3B8" />

      {/* Sweeping Chrome Exhaust Header & Upswept Silencer */}
      <path
        d="M214 162 Q210 190 240 195 L345 195 Q385 192 410 182"
        fill="none"
        stroke="#64748B"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M214 162 Q210 190 240 195 L345 195 Q385 192 410 182"
        fill="none"
        stroke="#E2E8F0"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Matte black silencer heat shield */}
      <rect x="330" y="186" width="62" height="11" rx="5" fill="#18181B" stroke="#334155" strokeWidth="0.8" />

      {/* Rear Swingarm to Axle */}
      <line x1="282" y1="174" x2="455" y2="206" stroke="#475569" strokeWidth="7" strokeLinecap="round" />
      <line x1="282" y1="174" x2="455" y2="206" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" />
      {/* Rear mono-shock spring */}
      <line x1="298" y1="148" x2="330" y2="182" stroke="#E11D48" strokeWidth="4" strokeLinecap="round" />

      {/* Sculpted 3D Teardrop Fuel Tank */}
      <path
        d="M192 136 C200 102 238 98 274 114 C278 116 274 148 245 152 C216 156 194 146 192 136 Z"
        fill="url(#bikeBodyGrad)"
        stroke="#CBD5E1"
        strokeWidth="1.2"
      />
      {/* Tank top specular highlight curve */}
      <path
        d="M208 112 C228 104 250 106 266 114"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Stepped Rider & Pillion Saddle */}
      <path
        d="M260 118 C272 120 292 126 320 126 C322 136 295 138 266 138 C256 138 258 126 260 118 Z"
        fill="#18181B"
      />
      <ellipse cx="288" cy="123" rx="24" ry="4" fill="#27272A" />

      {/* Front Telescopic Inverted Forks */}
      <line x1="145" y1="206" x2="195" y2="105" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
      <line x1="151" y1="204" x2="199" y2="107" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
      <line x1="151" y1="204" x2="199" y2="107" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />

      {/* Front Mudguard Arc */}
      <path
        d="M124 196 Q142 170 174 184"
        stroke="#CBD5E1"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Angular Commuter Headlamp Cowl */}
      <path
        d="M140 156 Q154 134 178 126 L195 105 L190 144 Q164 152 140 156 Z"
        fill="url(#bikeBodyGrad)"
        stroke="#CBD5E1"
        strokeWidth="1"
      />
      {/* Projector LED Headlamp & Amber Side Turn Indicator */}
      <circle cx="140" cy="154" r="9" fill="#FEF08A" stroke="#EAB308" strokeWidth="0.8" />
      <circle cx="140" cy="153" r="5" fill="#FFFFFF" opacity="0.8" />
      <rect x="135" y="165" width="5" height="3" rx="1" fill="#F59E0B" />

      {/* Handlebars with Grips & Side-view Mirror */}
      <path d="M198 102 Q208 96 212 90" stroke="#475569" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="212" cy="90" r="4" fill="#18181B" />
      {/* Sleek aerodynamic mirror */}
      <path d="M195 98 L188 84" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="186" cy="82" rx="6" ry="4" fill="#334155" stroke="#64748B" strokeWidth="0.7" />

      {/* Front & rear alloy disc brake calipers */}
      <circle cx="145" cy="206" r="14" fill="none" stroke="#64748B" strokeWidth="2" />
      <rect x="151" y="196" width="8" height="12" rx="2" fill="#F59E0B" stroke="#B45309" strokeWidth="0.7" />

      {/* ══════════ WHEELS ══════════ */}
      <Wheel cx={145} cy={206} r={26} isSpinning={isSpinning} />
      <Wheel cx={455} cy={206} r={26} isSpinning={isSpinning} />
    </svg>
  );
}

// ─── Photorealistic Studio Van Render + SVG 3D Isometric Purple X-Ray Overlay ───
function StudioVanRender({
  withXray,
  litCubes,
  isSirenStrobing,
  isCargoFlashing,
  isSpinning,
}: {
  withXray?: boolean;
  litCubes?: number;
  isSirenStrobing?: boolean;
  isCargoFlashing?: boolean;
  isSpinning?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {!imgFailed ? (
        <img
          src="/van_studio_3d.png"
          alt="Heavy Commercial Fleet Van"
          onError={() => setImgFailed(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <PureVectorVanSVG
          withXray={false}
          litCubes={litCubes}
          isSirenStrobing={isSirenStrobing}
          isCargoFlashing={isCargoFlashing}
          isSpinning={isSpinning}
        />
      )}

      {/* Interactive 3D Isometric Purple X-Ray Cargo Overlay */}
      <svg
        viewBox="0 0 560 312"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <linearGradient id="vanXrayOverlayGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(192,132,252,0.52)" />
            <stop offset="100%" stopColor="rgba(147,51,234,0.30)" />
          </linearGradient>
          <filter id="vanBayGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#C084FC" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Roof Siren Beacon Strobe */}
        {isSirenStrobing && (
          <g>
            <ellipse cx="180" cy="52" rx="20" ry="10" fill="rgba(225, 29, 72, 0.65)" style={{ animation: 'sirenStrobeRed 0.16s infinite alternate' }} />
            <ellipse cx="204" cy="52" rx="20" ry="10" fill="rgba(56, 189, 248, 0.65)" style={{ animation: 'sirenStrobeBlue 0.16s infinite alternate' }} />
          </g>
        )}

        {/* 3D Isometric Cargo Bay (6 cols × 4 rows = 24 cubes) */}
        {withXray && (
          <g
            filter="url(#vanBayGlow)"
            style={isCargoFlashing ? { filter: 'drop-shadow(0 0 16px rgba(168, 85, 247, 0.95))', animation: 'cargoPulseGlow 0.35s infinite alternate' } : undefined}
          >
            <rect
              x="213"
              y="81"
              width="272"
              height="119"
              rx="5"
              fill="url(#vanXrayOverlayGrad)"
              stroke="#9333EA"
              strokeWidth="1.2"
            />
            {Array.from({ length: 6 }, (_, col) => {
              const x = 217 + col * 44 + (col >= 3 ? 6 : 0);
              return Array.from({ length: 4 }, (_, row) => {
                const y = 86 + row * 26.5;
                const w = 38;
                const h = 22;
                const dx = 4;
                const dy = 3;
                const cubeIdx = col * 4 + (3 - row);
                const isLit = litCubes === undefined || cubeIdx < litCubes;

                return (
                  <g key={`${col}-${row}`}>
                    <polygon
                      points={`${x},${y + dy} ${x + dx},${y} ${x + w},${y} ${x + w - dx},${y + dy}`}
                      fill={isLit ? "#D8B4FE" : "rgba(216, 180, 254, 0.22)"}
                      stroke={isLit ? "#A855F7" : "rgba(168, 85, 247, 0.3)"}
                      strokeWidth="0.8"
                      strokeLinejoin="round"
                    />
                    <polygon
                      points={`${x},${y + dy} ${x + w - dx},${y + dy} ${x + w - dx},${y + h} ${x},${y + h}`}
                      fill={isLit ? "#C084FC" : "rgba(192, 132, 252, 0.16)"}
                      stroke={isLit ? "#9333EA" : "rgba(147, 51, 234, 0.25)"}
                      strokeWidth="0.8"
                      strokeLinejoin="round"
                    />
                    <polygon
                      points={`${x + w - dx},${y + dy} ${x + w},${y} ${x + w},${y + h - dy} ${x + w - dx},${y + h}`}
                      fill={isLit ? "#9333EA" : "rgba(147, 51, 234, 0.18)"}
                      stroke={isLit ? "#7E22CE" : "rgba(126, 34, 206, 0.25)"}
                      strokeWidth="0.8"
                      strokeLinejoin="round"
                    />
                    <line
                      x1={x + 3}
                      y1={y + dy + 3}
                      x2={x + 13}
                      y2={y + dy + 14}
                      stroke="#FFFFFF"
                      strokeWidth="1"
                      opacity={isLit ? 0.5 : 0.1}
                      strokeLinecap="round"
                    />
                  </g>
                );
              });
            })}
          </g>
        )}
      </svg>
    </div>
  );
}

// ─── Photorealistic Studio Delivery Motorcycle + SVG 3D Isometric Purple X-Ray Overlay ───
function StudioBikeRender({
  litCubes,
  isSirenStrobing,
  isCargoFlashing,
  isSpinning,
}: {
  litCubes?: number;
  isSirenStrobing?: boolean;
  isCargoFlashing?: boolean;
  isSpinning?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {!imgFailed ? (
        <img
          src="/bike_studio_3d.png"
          alt="Courier Delivery Motorcycle"
          onError={() => setImgFailed(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <PureVectorBikeSVG
          litCubes={litCubes}
          isSirenStrobing={isSirenStrobing}
          isCargoFlashing={isCargoFlashing}
          isSpinning={isSpinning}
        />
      )}

      {/* Interactive 3D Isometric Purple X-Ray Overlay on Rear Top-Box */}
      <svg
        viewBox="0 0 560 312"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <linearGradient id="bikeXrayOverlayGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(192,132,252,0.85)" />
            <stop offset="100%" stopColor="rgba(147,51,234,0.55)" />
          </linearGradient>
          <linearGradient id="tankSpecularBlend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#F1F5F9" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
          <filter id="bikeBayGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#C084FC" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Clean Specular Tank Patch (seamlessly removes any text/cross on fuel tank) */}
        <path
          d="M 198 108 C 215 104 235 105 252 112 C 255 120 238 126 215 125 C 200 125 197 116 198 108 Z"
          fill="url(#tankSpecularBlend)"
          opacity="0.92"
        />

        {/* Siren Strobe above rear top-box during animation */}
        {isSirenStrobing && (
          <g>
            <ellipse cx="430" cy="28" rx="16" ry="8" fill="rgba(225, 29, 72, 0.65)" style={{ animation: 'sirenStrobeRed 0.16s infinite alternate' }} />
            <ellipse cx="454" cy="28" rx="16" ry="8" fill="rgba(56, 189, 248, 0.65)" style={{ animation: 'sirenStrobeBlue 0.16s infinite alternate' }} />
          </g>
        )}

        {/* 3D Isometric Purple X-Ray Cargo Bay (3 cols × 2 rows = 6 cubes) */}
        <g
          filter="url(#bikeBayGlow)"
          style={isCargoFlashing ? { filter: 'drop-shadow(0 0 16px rgba(168, 85, 247, 0.95))', animation: 'cargoPulseGlow 0.35s infinite alternate' } : undefined}
        >
          <rect
            x="412"
            y="36"
            width="72"
            height="63"
            rx="5"
            fill="url(#bikeXrayOverlayGrad)"
            stroke="#9333EA"
            strokeWidth="1.2"
          />

          {[
            { col: 0, x: 416 },
            { col: 1, x: 439 },
            { col: 2, x: 462 },
          ].map(({ col, x }) =>
            [0, 1].map((row) => {
              const y = row === 0 ? 40 : 68;
              const w = 20;
              const h = 24;
              const dx = 2.5;
              const dy = 2.5;
              const cubeIdx = col * 2 + (1 - row);
              const isLit = litCubes === undefined || cubeIdx < litCubes;

              return (
                <g key={`${col}-${row}`}>
                  <polygon
                    points={`${x},${y + dy} ${x + dx},${y} ${x + w},${y} ${x + w - dx},${y + dy}`}
                    fill={isLit ? "#D8B4FE" : "rgba(216, 180, 254, 0.22)"}
                    stroke={isLit ? "#A855F7" : "rgba(168, 85, 247, 0.3)"}
                    strokeWidth="0.8"
                    strokeLinejoin="round"
                  />
                  <polygon
                    points={`${x},${y + dy} ${x + w - dx},${y + dy} ${x + w - dx},${y + h} ${x},${y + h}`}
                    fill={isLit ? "#C084FC" : "rgba(192, 132, 252, 0.16)"}
                    stroke={isLit ? "#9333EA" : "rgba(147, 51, 234, 0.25)"}
                    strokeWidth="0.8"
                    strokeLinejoin="round"
                  />
                  <polygon
                    points={`${x + w - dx},${y + dy} ${x + w},${y} ${x + w},${y + h - dy} ${x + w - dx},${y + h}`}
                    fill={isLit ? "#9333EA" : "rgba(147, 51, 234, 0.18)"}
                    stroke={isLit ? "#7E22CE" : "rgba(126, 34, 206, 0.25)"}
                    strokeWidth="0.8"
                    strokeLinejoin="round"
                  />
                  <line
                    x1={x + 2}
                    y1={y + dy + 2}
                    x2={x + 7}
                    y2={y + dy + 15}
                    stroke="#FFFFFF"
                    strokeWidth="0.9"
                    opacity={isLit ? 0.55 : 0.1}
                    strokeLinecap="round"
                  />
                </g>
              );
            })
          )}
        </g>
      </svg>
    </div>
  );
}

// ─── Vehicle X-Ray Render (switches between Van & Bike) ──────────────────────
function VehicleXRayRender({
  isBike,
  withXray,
  litCubes,
  isSirenStrobing,
  isCargoFlashing,
  isSpinning,
}: {
  isBike?: boolean;
  withXray?: boolean;
  litCubes?: number;
  isSirenStrobing?: boolean;
  isCargoFlashing?: boolean;
  isSpinning?: boolean;
}) {
  return isBike ? (
    <StudioBikeRender
      litCubes={litCubes}
      isSirenStrobing={isSirenStrobing}
      isCargoFlashing={isCargoFlashing}
      isSpinning={isSpinning}
    />
  ) : (
    <StudioVanRender
      withXray={withXray}
      litCubes={litCubes}
      isSirenStrobing={isSirenStrobing}
      isCargoFlashing={isCargoFlashing}
      isSpinning={isSpinning}
    />
  );
}

// ─── Status Chip Styles ─────────────────────────────────────────────────────
function getStatusChipStyles(status: string, hasExcursion?: boolean): { bg: string; tx: string; label: string; border?: string } {
  if (hasExcursion || status === 'delayed' || status === 'alert') {
    return { bg: '#FEE2E2', tx: '#B91C1C', label: status === 'delayed' ? 'Delayed' : 'Alert', border: '#FCA5A5' };
  }
  switch (status) {
    case 'in_transit':
      return { bg: C.greenPill, tx: C.greenText, label: 'In Transit' };
    case 'picked_up':
      return { bg: C.purplePillBg, tx: C.purplePillTx, label: 'Picked Up' };
    case 'proposed':
      return { bg: '#F5F3FF', tx: '#7C3AED', label: 'Proposed', border: '#DDD6FE' };
    case 'delivered':
      return { bg: C.greenPill, tx: C.greenText, label: 'Delivered' };
    default:
      return { bg: C.board, tx: C.textSecondary, label: status };
  }
}

// ─── Gauge SVG (Section 2 — Box Temperature Gauge) ─────────────────────────
function GaugeSVG({ tempC = 22.0 }: { tempC?: number }) {
  const r = 46;
  const cx = 80;
  const cy = 56;
  const totalAngle = 180; // half circle (180 to 360)
  const clampedTemp = Math.max(16, Math.min(28, tempC));
  const fillPct = (clampedTemp - 16) / (28 - 16);
  const arcEnd = 180 + totalAngle * fillPct;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (fromDeg: number, toDeg: number, radius: number) => {
    const start = { x: cx + radius * Math.cos(toRad(fromDeg)), y: cy + radius * Math.sin(toRad(fromDeg)) };
    const end   = { x: cx + radius * Math.cos(toRad(toDeg)),   y: cy + radius * Math.sin(toRad(toDeg))   };
    const large = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`;
  };

  const isSafe = tempC >= 20.0 && tempC <= 24.0;
  const safeStart = 180 + 180 * (4 / 12); // 20°C
  const safeEnd = 180 + 180 * (8 / 12); // 24°C

  return (
    <svg viewBox="0 0 160 66" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 125, height: 50 }}>
      {/* Track arc */}
      <path d={arcPath(180, 360, r)} stroke="#F4F4F5" strokeWidth="8" strokeLinecap="round" fill="none" />
      {/* 20-24°C safe transit band highlight */}
      <path d={arcPath(safeStart, safeEnd, r)} stroke="#BBF7D0" strokeWidth="8" fill="none" />
      {/* Active arc to current temp */}
      <path d={arcPath(180, arcEnd, r)} stroke={isSafe ? '#86EFAC' : '#FCA5A5'} strokeWidth="8" strokeLinecap="round" fill="none" />
      {/* Needle dot */}
      {(() => {
        const nx = cx + r * Math.cos(toRad(arcEnd));
        const ny = cy + r * Math.sin(toRad(arcEnd));
        return <circle cx={nx} cy={ny} r="4.5" fill={isSafe ? '#15803D' : '#DC2626'} />;
      })()}
    </svg>
  );
}

// ─── Expiry Horizon Curve SVG (Section 2 — Expiry Horizon Card) ────────────
function ExpiryCurveSVG({ horizon }: { horizon: 24 | 72 | 120 }) {
  const path = horizon === 24
    ? "M 10 75 C 50 72 80 55 120 48 C 160 40 180 32 220 25 L 220 90 L 10 90 Z"
    : horizon === 72
    ? "M 10 78 C 50 74 80 58 120 42 C 160 28 180 18 220 12 L 220 90 L 10 90 Z"
    : "M 10 82 C 50 78 80 62 120 45 C 160 22 180 12 220 6 L 220 90 L 10 90 Z";

  const line = horizon === 24
    ? "M 10 75 C 50 72 80 55 120 48 C 160 40 180 32 220 25"
    : horizon === 72
    ? "M 10 78 C 50 74 80 58 120 42 C 160 28 180 18 220 12"
    : "M 10 82 C 50 78 80 62 120 45 C 160 22 180 12 220 6";

  const midY = horizon === 24 ? 48 : horizon === 72 ? 42 : 45;
  const startY = horizon === 24 ? 75 : horizon === 72 ? 78 : 82;

  return (
    <svg viewBox="0 0 230 90" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 72 }}>
      <defs>
        <linearGradient id="expiryGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A855F7" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#A855F7" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={path} fill="url(#expiryGrad)" />
      <path d={line} stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="120" cy={midY} r="4.5" fill="white" stroke="#A855F7" strokeWidth="2" />
      <circle cx="10" cy={startY} r="4.5" fill="white" stroke="#A855F7" strokeWidth="2" />
      <line x1="120" y1={midY} x2="120" y2="90" stroke="#A855F7" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
      <line x1="10" y1={startY} x2="10" y2="90" stroke="#A855F7" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
    </svg>
  );
}

// ─── Shelf Life on Arrival Tank Card ──────────────────────────────────────
function ShelfLifeTank({
  shelfLife,
}: {
  shelfLife: { hoursRemaining: number; pctOf120h: number; isAmber: boolean; isRed: boolean };
}) {
  const bg = shelfLife.isRed ? '#FEF2F2' : shelfLife.isAmber ? '#FFFBEB' : C.mintBg;
  const waveFill = shelfLife.isRed ? '#FCA5A5' : shelfLife.isAmber ? '#FDE68A' : C.mint;
  const waveTop = shelfLife.isRed ? '#EF4444' : shelfLife.isAmber ? '#F59E0B' : C.mintTop;
  const textColor = shelfLife.isRed ? '#B91C1C' : shelfLife.isAmber ? '#B45309' : C.greenText;

  const fillPct = Math.max(0.12, Math.min(0.88, shelfLife.pctOf120h / 100));
  const waveY = 145 * (1 - fillPct);

  return (
    <div
      style={{
        background: bg,
        borderRadius: 16,
        padding: '10px 8px',
        boxShadow: '0 4px 20px rgba(15,23,42,0.03)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <svg
        viewBox="0 0 112 145"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        preserveAspectRatio="none"
      >
        <defs>
          <clipPath id="shelfCardClip">
            <rect x="0" y="0" width="112" height="145" rx="16" />
          </clipPath>
        </defs>
        <g clipPath="url(#shelfCardClip)">
          <rect x="0" y={waveY} width="112" height={145 - waveY} fill={waveFill} />
          <path
            d={`M0 ${waveY} Q28 ${waveY - 6} 56 ${waveY} Q84 ${waveY + 6} 112 ${waveY} L112 0 L0 0 Z`}
            fill={bg}
          />
          <path
            d={`M0 ${waveY + 1} Q28 ${waveY - 5} 56 ${waveY + 1} Q84 ${waveY + 7} 112 ${waveY + 1}`}
            stroke={waveTop}
            strokeWidth="2.5"
            fill="none"
          />
        </g>
      </svg>
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <Clock size={18} color={textColor} style={{ marginBottom: 3 }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
          {shelfLife.hoursRemaining.toFixed(0)}h
        </div>
        <div style={{ fontSize: 10, color: textColor, fontWeight: 600 }}>
          {shelfLife.pctOf120h}% of 120h
        </div>
      </div>
    </div>
  );
}

// ─── Miniature Logistics Van for Fleet Cards ──────────────────────────────────
function MiniBoxSVG({ purple }: { purple?: boolean }) {
  return (
    <svg viewBox="0 0 72 34" fill="none" style={{ width: 60, height: 28 }}>
      {/* Box body */}
      <rect x="22" y="4" width="44" height="22" rx="3" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="0.8" />
      {/* Top highlight */}
      <rect x="22" y="4" width="44" height="3" rx="1.5" fill="#FFFFFF" opacity="0.85" />
      {/* Subtle mid accent line */}
      <rect x="22" y="14" width="44" height="1.5" fill="#94A3B8" opacity="0.4" />
      {/* 3D X-Ray window */}
      {purple && (
        <g>
          <rect x="26" y="6" width="36" height="17" rx="2"
            fill="rgba(192,132,252,0.35)" stroke="rgba(147,51,234,0.5)" strokeWidth="0.6" />
          {/* 4×2 mini isometric cubes */}
          {[0, 1, 2, 3].map((c) =>
            [0, 1].map((r) => {
              const x = 27 + c * 8;
              const y = 8 + r * 7;
              return (
                <g key={`${c}-${r}`}>
                  <polygon points={`${x},${y+1} ${x+1.5},${y} ${x+6},${y} ${x+4.5},${y+1}`} fill="#D8B4FE" opacity="0.85" />
                  <rect x={x} y={y+1} width={4.5} height={4} rx="0.5" fill="#C084FC" />
                  <polygon points={`${x+4.5},${y+1} ${x+6},${y} ${x+6},${y+4} ${x+4.5},${y+5}`} fill="#9333EA" opacity="0.75" />
                </g>
              );
            })
          )}
          {/* Centre beam */}
          <rect x="43" y="6" width="1.5" height="17" fill="rgba(59,18,89,0.3)" />
        </g>
      )}
      {/* Rear door line */}
      <line x1="62" y1="5" x2="62" y2="25" stroke="#CBD5E1" strokeWidth="0.8" />
      {/* Cab */}
      <path d="M6 26 L6 11 Q7 8 12 7 L22 5.5 L22 26 Z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="0.8" />
      {/* Roof fairing */}
      <path d="M13 7 Q17 4 20 4 L22 4 L22 7 Z" fill="#E2E8F0" />
      {/* Windshield */}
      <path d="M8 11 Q13 7 18 6.5 L22 7 L22 14 Q14 14 9 14 Z" fill="#334155" opacity="0.85" />
      <line x1="11" y1="8" x2="15" y2="13" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      {/* Side window */}
      <rect x="7" y="11" width="5" height="4" rx="1" fill="#475569" opacity="0.85" />
      {/* Beacon */}
      <rect x="14" y="2.5" width="6" height="2.5" rx="1.2" fill="#18181B" />
      {[14.5, 16.5, 18.5].map((bx, i) => (
        <rect key={i} x={bx} y="2.8" width="1.5" height="1.5" rx="0.6"
          fill={i % 2 === 0 ? '#E11D48' : '#3B82F6'} />
      ))}
      {/* Door seam / handle */}
      <rect x="9" y="16" width="3" height="1.2" rx="0.6" fill="#94A3B8" />
      {/* Headlight */}
      <rect x="6" y="17" width="2.5" height="3.5" rx="1" fill="#FEF08A" />
      {/* Wheels */}
      {[12, 38, 52].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={28} r={5} fill="#18181B" />
          <circle cx={cx} cy={28} r={3} fill="#E2E8F0" />
          <circle cx={cx} cy={28} r={1.5} fill="#64748B" />
        </g>
      ))}
    </svg>
  );
}

// ─── Miniature Delivery Bike for Fleet Cards (Distinct 2-Wheeler Profile) ───
function MiniBikeSVG({ purple }: { purple?: boolean }) {
  return (
    <svg viewBox="0 0 72 34" fill="none" style={{ width: 62, height: 28, display: 'block' }}>
      {/* Rear Carrier Rack */}
      <line x1="33" y1="20" x2="62" y2="20" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" />

      {/* Signature Square Isothermal Box */}
      <rect x="36" y="7" width="26" height="17" rx="3" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="0.9" />
      <rect x="36" y="7" width="26" height="3" rx="1.5" fill="#FFFFFF" opacity="0.9" />
      <rect x="36" y="14" width="26" height="1.2" fill="#CBD5E1" />

      {/* 3D X-Ray Purple Cargo Cubes when active */}
      {purple && (
        <g>
          <rect x="38" y="9" width="22" height="13" rx="2"
            fill="rgba(192,132,252,0.35)" stroke="rgba(147,51,234,0.5)" strokeWidth="0.6" />
          {[0, 1].map((c) =>
            [0, 1].map((r) => {
              const x = 39.5 + c * 10;
              const y = 10.5 + r * 5.5;
              return (
                <g key={`${c}-${r}`}>
                  <polygon points={`${x},${y+1} ${x+1.5},${y} ${x+7},${y} ${x+5.5},${y+1}`} fill="#D8B4FE" opacity="0.85" />
                  <rect x={x} y={y+1} width={5.5} height={3.5} rx="0.5" fill="#C084FC" />
                  <polygon points={`${x+5.5},${y+1} ${x+7},${y} ${x+7},${y+3.5} ${x+5.5},${y+4.5}`} fill="#9333EA" opacity="0.75" />
                </g>
              );
            })
          )}
        </g>
      )}

      {/* Low-profile Beacon light atop box */}
      <rect x="43" y="4.5" width="12" height="2.2" rx="1.1" fill="#18181B" />
      <circle cx="46" cy="5.6" r="1.1" fill="#EF4444" />
      <circle cx="52" cy="5.6" r="1.1" fill="#3B82F6" />

      {/* Commuter Chassis / Spine */}
      <path d="M22 17 Q28 13 36 13 L36 19 L26 21 Z" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="0.8" />
      {/* Teardrop Fuel Tank */}
      <path d="M19 14 Q23 10 28 10 L33 13 L26 16 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.8" />
      {/* Rider Seat */}
      <path d="M27 13 Q31 11 36 13" stroke="#18181B" strokeWidth="3" strokeLinecap="round" />
      {/* Front Telescopic Fork & Handlebar */}
      <line x1="15" y1="27" x2="20" y2="10" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="18" y1="10" x2="23" y2="8" stroke="#334155" strokeWidth="2.2" strokeLinecap="round" />
      {/* Commuter Headlight Fairing */}
      <path d="M14 17 Q17 14 19 16 L17 21 Z" fill="#F8FAFC" stroke="#64748B" strokeWidth="0.8" />
      <circle cx="14" cy="18" r="2" fill="#FEF08A" />

      {/* Wheels */}
      <g>
        {/* Front Wheel */}
        <circle cx="15" cy="27" r="6" fill="#18181B" />
        <circle cx="15" cy="27" r="3.8" fill="#E2E8F0" />
        <circle cx="15" cy="27" r="1.8" fill="#64748B" />
        {/* Rear Wheel */}
        <circle cx="49" cy="27" r="6" fill="#18181B" />
        <circle cx="49" cy="27" r="3.8" fill="#E2E8F0" />
        <circle cx="49" cy="27" r="1.8" fill="#64748B" />
      </g>
    </svg>
  );
}

// ─── Miniature Vehicle for Fleet Cards (dispatches to Van or Bike) ────────────
function MiniVehicleSVG({ purple, isBike }: { purple?: boolean; isBike?: boolean }) {
  return isBike ? <MiniBikeSVG purple={purple} /> : <MiniBoxSVG purple={purple} />;
}

// ─── Hospital Code Lookup Directory & Reusable Badge (Spec 2.1 & 2.2) ─────────
export const HOSPITAL_DIRECTORY: Record<string, { name: string; zone: string }> = {
  APL: { name: 'Indraprastha Apollo Hospital', zone: 'South Delhi' },
  LNJ: { name: 'Lok Nayak Jai Prakash (LNJP)', zone: 'Central Delhi' },
  AIM: { name: 'AIIMS Trauma Center', zone: 'Ansari Nagar' },
  SFD: { name: 'Safdarjung Hospital', zone: 'New Delhi' },
  N62: { name: 'Fortis Hospital Sector 62', zone: 'Noida' },
  MDT: { name: 'Medanta The Medicity', zone: 'Gurugram' },
  GTB: { name: 'GTB Hospital', zone: 'Dilshad Garden' },
  BLK: { name: 'BLK-Max Super Speciality', zone: 'Pusa Road' },
  SGR: { name: 'Sir Ganga Ram Hospital', zone: 'Rajinder Nagar' },
  MAX: { name: 'Max Super Speciality', zone: 'Saket' },
};

export function HospitalCodeBadge({ code }: { code: string }) {
  const [hovered, setHovered] = useState(false);
  const info = HOSPITAL_DIRECTORY[code] || { name: code, zone: 'NCR' };

  // Status dot color per hospital role / urgency
  const dotColor =
    code === 'AIM' || code === 'SFD' || code === 'LNJ'
      ? '#EF4444' // Critical apex nodes
      : code === 'N62' || code === 'MDT'
      ? '#10B981' // Surplus reserves
      : code === 'APL' || code === 'MAX'
      ? '#9333EA' // Referral corridors
      : '#64748B'; // Neutral

  return (
    <div
      data-testid={`hospital-badge-${code}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'transparent',
        padding: '1px 2px',
        borderRadius: 4,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 700,
        color: '#18181B',
        fontFamily: "'JetBrains Mono', 'Plus Jakarta Sans', monospace",
        letterSpacing: '0.02em',
        userSelect: 'none',
        flexShrink: 0,
        transition: 'opacity 0.15s ease',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
        }}
      />
      <span>{code}</span>

      {hovered && (
        <div
          data-testid={`hospital-tooltip-${code}`}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            background: '#18181B',
            color: '#FFFFFF',
            padding: '5px 9px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 500,
            fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
            whiteSpace: 'nowrap',
            boxShadow: '0 8px 20px rgba(0,0,0,0.22)',
            zIndex: 99999,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>{info.name}</span>
          <span style={{ opacity: 0.6 }}>· {info.zone}</span>
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 12,
              width: 0,
              height: 0,
              borderLeft: '4.5px solid transparent',
              borderRight: '4.5px solid transparent',
              borderBottom: '4.5px solid #18181B',
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── PERFORMANCE BARS (Units Rescued 30 Days) ─────────────────────────────────
function PerformanceBars({ history }: { history?: DailyHistoryPoint[] }) {
  const points = history && history.length > 0 ? history : select30DayHistory();
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28 }}>
      {points.map((p, i) => {
        const h = Math.max(6, Math.min(26, Math.round((p.rescuedUnits / 38) * 26)));
        return (
          <div
            key={i}
            title={`${p.date}: ${p.rescuedUnits}u rescued, ${p.onTimePct}% on-time`}
            style={{
              width: 5,
              height: h,
              borderRadius: 2,
              background: p.isToday ? C.amberDeep : '#E4E4E7',
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Incoming Hospital Platelet Requests (Spec Section 3.1 & 3.2) ─────────────
export interface HospitalRequestDonor {
  code: string;
  availableUnits: number;
  etaMin: number;
  fefoMatchPct: number;
  isOptimal?: boolean;
}

export interface HospitalRequestItem {
  id: string; // 'REQ-901'
  orderIdAlias: string; // 'TX-1044'
  targetHospital: string; // 'AIM'
  neededUnits: number; // 12
  bloodGroup: string; // 'O-'
  product: string; // 'Apheresis'
  urgency: 'Critical' | 'High' | 'Moderate';
  deficitStr: string; // '-15u'
  estWindow: string; // '< 45 min'
  donors: HospitalRequestDonor[];
}

export const INCOMING_HOSPITAL_REQUESTS: HospitalRequestItem[] = [
  {
    id: 'REQ-901',
    orderIdAlias: 'TX-1044',
    targetHospital: 'AIM',
    neededUnits: 12,
    bloodGroup: 'O-',
    product: 'Apheresis',
    urgency: 'Critical',
    deficitStr: '-15u',
    estWindow: '< 45 min',
    donors: [
      { code: 'N62', availableUnits: 28, etaMin: 14, fefoMatchPct: 98, isOptimal: true },
      { code: 'APL', availableUnits: 19, etaMin: 11, fefoMatchPct: 92 },
      { code: 'MDT', availableUnits: 34, etaMin: 22, fefoMatchPct: 85 },
    ],
  },
  {
    id: 'REQ-902',
    orderIdAlias: 'TX-1045',
    targetHospital: 'GTB',
    neededUnits: 6,
    bloodGroup: 'B+',
    product: 'Random',
    urgency: 'High',
    deficitStr: '-8u',
    estWindow: '< 1.5 h',
    donors: [
      { code: 'SGR', availableUnits: 24, etaMin: 18, fefoMatchPct: 96, isOptimal: true },
      { code: 'BLK', availableUnits: 16, etaMin: 15, fefoMatchPct: 91 },
      { code: 'N62', availableUnits: 22, etaMin: 20, fefoMatchPct: 84 },
    ],
  },
  {
    id: 'REQ-903',
    orderIdAlias: 'TX-1046',
    targetHospital: 'LNJ',
    neededUnits: 10,
    bloodGroup: 'A+',
    product: 'Apheresis',
    urgency: 'Critical',
    deficitStr: '-12u',
    estWindow: '< 60 min',
    donors: [
      { code: 'APL', availableUnits: 30, etaMin: 12, fefoMatchPct: 97, isOptimal: true },
      { code: 'SFD', availableUnits: 18, etaMin: 16, fefoMatchPct: 89 },
      { code: 'AIM', availableUnits: 25, etaMin: 14, fefoMatchPct: 86 },
    ],
  },
  {
    id: 'REQ-904',
    orderIdAlias: 'TX-1047',
    targetHospital: 'SFD',
    neededUnits: 4,
    bloodGroup: 'AB+',
    product: 'Plasma',
    urgency: 'Moderate',
    deficitStr: '-4u',
    estWindow: '< 2.5 h',
    donors: [
      { code: 'AIM', availableUnits: 16, etaMin: 8, fefoMatchPct: 99, isOptimal: true },
      { code: 'MAX', availableUnits: 20, etaMin: 14, fefoMatchPct: 93 },
      { code: 'MDT', availableUnits: 26, etaMin: 24, fefoMatchPct: 82 },
    ],
  },
];

// ─── TRUE DELHI-NCR GEOGRAPHIC CHOROPLETH MAP (DISPATCH-SPEC.md Section 2.1) ──────────────
const NCR_DISTRICTS = [
  {
    id: 'NW',
    name: 'North West Delhi',
    zoneKey: 'North Delhi',
    d: 'M 90 42 L 105 22 L 128 16 L 150 18 L 154 38 L 152 54 L 146 68 L 130 72 L 114 70 L 96 68 L 82 58 Z',
    baseFill: '#E4E4E7',
    centerX: 120,
    centerY: 45,
    tooltipY: 22,
    statusText: '0u Balanced',
  },
  {
    id: 'ND',
    name: 'North Delhi',
    zoneKey: 'North Delhi',
    d: 'M 150 18 L 174 15 L 195 20 L 197 44 L 200 68 L 178 69 L 158 68 L 146 68 L 152 54 L 154 38 Z',
    baseFill: '#E4E4E7',
    centerX: 172,
    centerY: 44,
    tooltipY: 22,
    statusText: '0u Balanced',
  },
  {
    id: 'GTB',
    name: 'North East & Shahdara (GTB)',
    zoneKey: 'East Delhi',
    d: 'M 195 20 L 208 18 L 225 22 L 238 32 L 242 52 L 234 70 L 214 69 L 200 68 L 197 44 Z',
    baseFill: '#FDBA74',
    centerX: 216,
    centerY: 46,
    tooltipY: 24,
    statusText: '+15u Surplus',
  },
  {
    id: 'GZB',
    name: 'Ghaziabad',
    zoneKey: 'Ghaziabad',
    d: 'M 225 22 L 250 18 L 285 16 L 322 28 L 338 55 L 332 85 L 295 84 L 265 86 L 240 88 L 236 82 L 234 70 L 242 52 L 238 32 Z',
    baseFill: '#FDBA74',
    centerX: 280,
    centerY: 50,
    tooltipY: 26,
    statusText: '0u Balanced',
  },
  {
    id: 'WD',
    name: 'West Delhi',
    zoneKey: 'West Delhi',
    d: 'M 96 68 L 114 70 L 130 72 L 146 68 L 144 88 L 142 104 L 138 116 L 118 115 L 98 112 L 82 110 L 72 94 L 78 80 Z',
    baseFill: '#E4E4E7',
    centerX: 110,
    centerY: 92,
    tooltipY: 70,
    statusText: '+5u Surplus',
  },
  {
    id: 'CD',
    name: 'Central & New Delhi (AIM/LNJ)',
    zoneKey: 'Central Delhi',
    d: 'M 146 68 L 158 68 L 178 69 L 200 68 L 201 88 L 204 112 L 184 114 L 162 115 L 138 116 L 142 104 L 144 88 Z',
    baseFill: '#C084FC',
    centerX: 170,
    centerY: 92,
    tooltipY: 68,
    statusText: '-15u Shortage',
  },
  {
    id: 'ED',
    name: 'East Delhi',
    zoneKey: 'East Delhi',
    d: 'M 200 68 L 214 69 L 234 70 L 236 82 L 240 88 L 235 104 L 222 118 L 212 122 L 204 112 L 201 88 Z',
    baseFill: '#A855F7',
    centerX: 218,
    centerY: 94,
    tooltipY: 70,
    statusText: '+15u Surplus',
  },
  {
    id: 'SWD',
    name: 'South West Delhi (DWK)',
    zoneKey: 'West Delhi',
    d: 'M 82 110 L 98 112 L 118 115 L 138 116 L 134 134 L 130 152 L 124 164 L 104 162 L 82 156 L 60 150 L 52 132 L 64 118 Z',
    baseFill: '#E4E4E7',
    centerX: 95,
    centerY: 138,
    tooltipY: 114,
    statusText: '0u Balanced',
  },
  {
    id: 'SD',
    name: 'South Delhi (MAX/APL/SFD)',
    zoneKey: 'South Delhi',
    d: 'M 138 116 L 162 115 L 184 114 L 204 112 L 212 122 L 214 136 L 218 154 L 195 156 L 172 158 L 148 162 L 136 163 L 124 164 L 130 152 L 134 134 Z',
    baseFill: '#334155',
    centerX: 174,
    centerY: 138,
    tooltipY: 112,
    statusText: '+95u Surplus',
  },
  {
    id: 'NOI',
    name: 'Noida / G.B. Nagar (N62)',
    zoneKey: 'Noida',
    d: 'M 240 88 L 265 86 L 295 84 L 332 85 L 340 112 L 346 142 L 338 182 L 305 202 L 264 214 L 228 215 L 226 194 L 222 172 L 218 154 L 214 136 L 212 122 L 222 118 L 235 104 Z',
    baseFill: '#C084FC',
    centerX: 276,
    centerY: 142,
    tooltipY: 110,
    statusText: '+65u Surplus',
  },
  {
    id: 'GGN',
    name: 'Gurugram (MDT)',
    zoneKey: 'Gurugram',
    d: 'M 60 150 L 82 156 L 104 162 L 124 164 L 136 163 L 148 162 L 144 180 L 142 202 L 138 215 L 110 216 L 78 212 L 48 204 L 38 185 L 45 165 Z',
    baseFill: '#FDE68A',
    centerX: 92,
    centerY: 186,
    tooltipY: 158,
    statusText: '0u Balanced',
  },
  {
    id: 'FBD',
    name: 'Faridabad',
    zoneKey: 'Faridabad',
    d: 'M 148 162 L 172 158 L 195 156 L 218 154 L 222 172 L 226 194 L 228 215 L 198 216 L 168 215 L 138 215 L 142 202 L 144 180 Z',
    baseFill: '#E4E4E7',
    centerX: 182,
    centerY: 188,
    tooltipY: 160,
    statusText: '0u Balanced',
  },
];

function NCRZoneTileMap({
  selectedZone,
  onSelectZone,
  orders,
}: {
  selectedZone: string | null;
  onSelectZone: (zone: string | null) => void;
  orders: DispatchOrder[];
}) {
  const [hoveredDistrictId, setHoveredDistrictId] = useState<string | null>(null);

  const transferCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of NCR_DISTRICTS) {
      counts[d.id] = orders.filter(
        (o) => getZoneForHospital(o.from) === d.zoneKey || getZoneForHospital(o.to) === d.zoneKey
      ).length;
    }
    return counts;
  }, [orders]);

  const has0419 = orders.some((o) => o.id === 'TX-0419');
  const totalInTransitUnits = orders
    .filter((o) => o.status === 'in_transit' || o.status === 'picked_up')
    .reduce((sum, o) => sum + o.units, 0);

  const getDistrictStatusText = (d: (typeof NCR_DISTRICTS)[0]) => {
    if (has0419) {
      if (d.id === 'CD') return '-3u Leveled (+12u in transit)';
      if (d.id === 'NOI') return '+53u Surplus (-12u dispatched)';
    }
    return d.statusText;
  };

  // Active district for floating tooltip (defaults to Central Delhi if none hovered)
  const activeDistrict = hoveredDistrictId
    ? NCR_DISTRICTS.find((d) => d.id === hoveredDistrictId)
    : null;

  const defaultTarget = NCR_DISTRICTS.find((d) => d.id === 'CD')!;
  const activeTarget = activeDistrict || defaultTarget;
  const transfers = activeDistrict ? transferCounts[activeDistrict.id] || 0 : 0;
  const tooltipText = activeDistrict
    ? `${activeDistrict.name} · ${getDistrictStatusText(activeDistrict)}${transfers > 0 ? ` · ${transfers} transfers` : ''}`
    : `Central NCR · ${totalInTransitUnits}u in transit`;

  return (
    <svg
      viewBox="0 0 360 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
    >
      <defs>
        <filter id="mapPillShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* Contiguous High-Vertex District Polygons separated by crisp 1.2px white borders */}
      {NCR_DISTRICTS.map((d) => {
        const isSelected = selectedZone === d.zoneKey;
        const isHovered = hoveredDistrictId === d.id;

        return (
          <path
            key={d.id}
            id={d.id}
            data-testid={`zone-tile-${d.zoneKey}`}
            d={d.d}
            fill={d.baseFill}
            stroke={isSelected ? '#A855F7' : '#FFFFFF'}
            strokeWidth={isSelected ? 2.2 : isHovered ? 2.0 : 1.2}
            strokeLinejoin="round"
            strokeLinecap="round"
            onClick={() => onSelectZone(selectedZone === d.zoneKey ? null : d.zoneKey)}
            onMouseEnter={() => setHoveredDistrictId(d.id)}
            onMouseLeave={() => setHoveredDistrictId(null)}
            style={{
              cursor: 'pointer',
              filter: isHovered
                ? 'brightness(1.08) drop-shadow(0 2px 4px rgba(0,0,0,0.12))'
                : isSelected
                ? 'drop-shadow(0 2px 6px rgba(168,85,247,0.35))'
                : 'none',
              transition: 'all 0.18s ease',
            }}
          />
        );
      })}

      {/* Subtle Dashed Ring Road Loop */}
      <path
        d="M 134 82 L 168 76 L 188 90 L 188 112 L 162 122 L 132 114 L 126 96 Z"
        stroke="rgba(15, 23, 42, 0.14)"
        strokeWidth="1.2"
        strokeDasharray="3 3"
        fill="none"
        pointerEvents="none"
      />

      {/* Realistic Winding Yamuna River Channel (#BAE6FD) */}
      <path
        d="M 195 12 Q 196 28 198 48 Q 201 70 203 90 Q 206 112 214 126 Q 218 142 220 156 Q 224 178 227 198 Q 229 212 230 220"
        stroke="#BAE6FD"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        pointerEvents="none"
      />

      {/* Moveon-Style Floating Dark Charcoal Tooltip Pill with Pointer Triangle */}
      <g
        filter="url(#mapPillShadow)"
        pointerEvents="none"
        style={{
          transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: `translate(${activeTarget.centerX}px, ${activeTarget.tooltipY}px)`,
        }}
      >
        <rect
          x={-Math.max(68, (tooltipText.length * 6.5) / 2 + 10)}
          y={-14}
          width={Math.max(136, tooltipText.length * 6.5 + 20)}
          height={26}
          rx={7}
          fill="#1E293B"
        />
        <polygon points="-5,12 5,12 0,17" fill="#1E293B" />
        <text
          x={0}
          y={3.5}
          fill="#FFFFFF"
          fontSize="10.5"
          fontWeight="600"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', -apple-system, sans-serif"
        >
          {tooltipText}
        </text>
      </g>
    </svg>
  );
}

// ─── Export Orders to CSV (Spec 21.2 Widget 14) ───────────────────────────────
export function exportOrdersToCSV(ordersToExport: DispatchOrder[]) {
  const headers = [
    'Order ID',
    'Product',
    'Units',
    'Blood Group',
    'From Hospital',
    'From Code',
    'To Hospital',
    'To Code',
    'Courier',
    'Vehicle ID',
    'Distance (km)',
    'ETA',
    'Status',
    'Temp (°C)',
    'Agitation Off (min)',
  ];

  const rows = ordersToExport.map((o) => [
    o.id,
    o.product,
    o.units,
    o.group,
    `"${o.fromName.replace(/"/g, '""')}"`,
    o.from,
    `"${o.toName.replace(/"/g, '""')}"`,
    o.to,
    `"${o.courier.name.replace(/"/g, '""')}"`,
    o.vehicleId,
    o.distanceKm,
    o.etaTime,
    o.status,
    o.coldChain.tempC,
    o.coldChain.agitationOffMin,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `dispatch-orders-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Web Audio Synthesizer: Dispatch Whoosh / Siren (Spec 4.1 Step 3) ─────────
function playDispatchSiren() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    // 1. Subtle emergency siren sweep (520Hz -> 880Hz -> 620Hz)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.5);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.53);

    // 2. High-speed wind-tunnel air displacement whoosh
    const whoosh = ctx.createOscillator();
    const whooshGain = ctx.createGain();
    whoosh.type = 'sine';
    whoosh.frequency.setValueAtTime(260, now);
    whoosh.frequency.exponentialRampToValueAtTime(90, now + 0.5);
    whooshGain.gain.setValueAtTime(0.12, now);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
    whoosh.connect(whooshGain);
    whooshGain.connect(ctx.destination);
    whoosh.start(now);
    whoosh.stop(now + 0.53);
  } catch {}
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function MoveonDashboard() {
  const store = useDispatchStore();
  const plexus = usePlexusStore();
  const orders = store.orders;
  const selectOrder = store.selectOrder;
  const approve = store.approve;
  const rebalance = store.rebalance;
  const activeTab = store.activeTab;
  const setActiveTab = store.setActiveTab;
  const selectedZone = store.selectedZone;
  const setSelectedZone = store.setSelectedZone;

  const activeOrder = selectActiveOrder(store);
  const shelfLife = selectActiveOrderShelfLife(activeOrder);
  const history30Days = select30DayHistory();
  const totalRescuedUnits = selectTotalRescuedUnits30D();
  const exceptionsCount = selectExceptionsCount(store);
  const unitsInTransit = selectUnitsInTransit(store);
  const onTimeDeliveryPct = selectOnTimeDeliveryPct();
  const tabCounts = selectTabCounts(store);
  const { shortCount, surplusCount } = selectZoneNetBalances();

  const [expiryHorizon, setExpiryHorizon] = useState<24 | 72 | 120>(72);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showZoneDropdown, setShowZoneDropdown] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [productFilter, setProductFilter] = useState<'all' | 'Apheresis' | 'RDP'>('all');
  const [isFading, setIsFading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Option A & Section 4: 1.6s Kinetic Launch Animation State (Spec 4.1)
  interface LaunchAnimState {
    active: boolean;
    phase: 'idle' | 'locking' | 'revving' | 'launching' | 'entering';
    orderId: string;
    from: string;
    to: string;
    units: number;
    bloodGroup: string;
    isBike: boolean;
  }

  const [launchAnim, setLaunchAnim] = useState<LaunchAnimState>({
    active: false,
    phase: 'idle',
    orderId: 'TX-0419',
    from: 'N62',
    to: 'AIM',
    units: 12,
    bloodGroup: 'O-',
    isBike: false,
  });

  const launchTimerRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      launchTimerRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  // Section 1: Centered Glassmorphic Dispatch Modal (DISPATCH-SPEC.md)
  const incomingRequests = plexus.proposedRequests;
  const [modalRequestId, setModalRequestId] = useState<string | null>(null);
  const [selectedDonorMap, setSelectedDonorMap] = useState<Record<string, string>>({
    'REQ-901': 'N62',
    'REQ-902': 'SGR',
    'REQ-903': 'APL',
    'REQ-904': 'AIM',
  });
  const [configuredUnitsMap, setConfiguredUnitsMap] = useState<Record<string, number>>({
    'REQ-901': 12,
    'REQ-902': 6,
    'REQ-903': 10,
    'REQ-904': 4,
  });

  const activeModalRequest = useMemo(() => {
    if (!modalRequestId) return null;
    return incomingRequests.find((r) => r.id === modalRequestId) || null;
  }, [modalRequestId, incomingRequests]);

  // expandedRequest alias preserves center-stage sync with the active modal request
  const expandedRequest = activeModalRequest;

  const currentConfiguredUnits = useMemo(() => {
    if (!activeModalRequest) return null;
    return configuredUnitsMap[activeModalRequest.id] ?? activeModalRequest.neededUnits;
  }, [activeModalRequest, configuredUnitsMap]);

  const currentSelectedDonor = useMemo(() => {
    if (!activeModalRequest) return null;
    return selectedDonorMap[activeModalRequest.id] ?? activeModalRequest.donors[0].code;
  }, [activeModalRequest, selectedDonorMap]);

  const handleConfirmDispatch = (
    req: HospitalRequestItem,
    donorCode: string,
    units: number
  ) => {
    if (launchAnim.active) return;

    const isBike = units <= 6;
    const vehicleId = isBike ? 'BIKE-02' : 'VAN-04';
    const newOrderId = `TX-0419`;

    // Close modal immediately
    setModalRequestId(null);

    // Audio cue
    try {
      soundEngine.playButtonClick();
    } catch {}

    // Scroll center stage into view smoothly if needed
    try {
      document.querySelector('[data-testid="widget-center-art"]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch {}

    // Phase 1: 0ms – 350ms (Lock Cargo & Cargo Flash)
    setLaunchAnim({
      active: true,
      phase: 'locking',
      orderId: newOrderId,
      from: donorCode,
      to: req.targetHospital,
      units,
      bloodGroup: req.bloodGroup,
      isBike,
    });

    launchTimerRef.current.forEach((t) => clearTimeout(t));

    // Phase 2: 350ms – 900ms (Siren Strobe, Wheel Spin, Wind-Tunnel Streaks, Chassis Tilt)
    const t1 = window.setTimeout(() => {
      setLaunchAnim((prev) => ({ ...prev, phase: 'revving' }));
    }, 350);

    // Phase 3: 900ms – 1450ms (High-Speed Drive-Off Launch off left side)
    const t2 = window.setTimeout(() => {
      setLaunchAnim((prev) => ({ ...prev, phase: 'launching' }));
      playDispatchSiren();
    }, 900);

    // Phase 4: 1450ms – 1700ms (State update: In-transit tab, New order active, Glide-in)
    const t3 = window.setTimeout(() => {
      // Synchronize dispatch across global PlexusStore and useDispatchStore (Section 1.2)
      plexus.dispatchRequest(req.id, donorCode, req.targetHospital, units);
      setLaunchAnim((prev) => ({ ...prev, phase: 'entering' }));
      showToast(`⚡ Dispatched ${units}u ${req.bloodGroup} from ${donorCode} → ${req.targetHospital} (${vehicleId})`);
    }, 1450);

    // Completion: 1750ms (Return to idle)
    const t4 = window.setTimeout(() => {
      setLaunchAnim((prev) => ({ ...prev, active: false, phase: 'idle' }));
    }, 1750);

    launchTimerRef.current = [t1, t2, t3, t4];
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleRebalance = () => {
    setIsFading(true);
    setTimeout(() => {
      const res = rebalance();
      setIsFading(false);
      showToast(`Solver proposed ${res.count} transfers (${res.units}u)`);
    }, 400);
  };

  const operatorName = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('plexus_node_id') || localStorage.getItem('plexus_operator');
        if (stored) return stored;
      } catch {}
    }
    return 'Node ND-01';
  }, []);

  const operatorInitials = useMemo(() => {
    const parts = operatorName.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return operatorName.slice(0, 2).toUpperCase();
  }, [operatorName]);

  const queueOrders = useMemo(() => {
    const priority = (o: DispatchOrder) => {
      if (o.id === 'TX-0419') return 0;
      if (o.hasTempExcursion || o.isDelayed) return 1;
      if (o.status === 'in_transit' || o.status === 'picked_up') return 2;
      if (o.status === 'proposed') return 3;
      return 4;
    };
    let list = [...orders];
    if (selectedZone) {
      const zoneList = list.filter(
        (o) => getZoneForHospital(o.from) === selectedZone || getZoneForHospital(o.to) === selectedZone
      );
      if (zoneList.length > 0) list = zoneList;
    }
    return list.sort((a, b) => priority(a) - priority(b));
  }, [orders, selectedZone]);

  const filteredOrders = useMemo(() => {
    let list: DispatchOrder[] = [];
    if (activeTab === 'proposed') {
      list = orders.filter((o) => o.status === 'proposed');
    } else if (activeTab === 'in_transit') {
      list = orders.filter((o) => o.status === 'in_transit' || o.status === 'picked_up');
    } else if (activeTab === 'delivered') {
      list = orders.filter((o) => o.status === 'delivered');
    } else if (activeTab === 'exceptions') {
      list = orders.filter((o) => o.hasTempExcursion || o.isDelayed || (o.coldChain && (o.coldChain.tempC < 20 || o.coldChain.tempC > 24)));
    } else {
      list = orders;
    }

    if (selectedZone) {
      list = list.filter(
        (o) => getZoneForHospital(o.from) === selectedZone || getZoneForHospital(o.to) === selectedZone
      );
    }

    if (productFilter !== 'all') {
      list = list.filter((o) => o.product === productFilter);
    }

    return list;
  }, [orders, activeTab, selectedZone, productFilter]);

  const chipStyles = activeOrder ? getStatusChipStyles(activeOrder.status, activeOrder.hasTempExcursion) : null;

  // Determine vehicle, cubes, and animation state for widget-center-art (Spec Section 4)
  let renderIsBike = false;
  let renderLitCubes = 12;

  if (launchAnim.active) {
    renderIsBike = launchAnim.isBike;
    renderLitCubes = launchAnim.units;
  } else if (expandedRequest) {
    renderIsBike = currentConfiguredUnits !== null && currentConfiguredUnits <= 6;
    renderLitCubes = currentConfiguredUnits ?? 12;
  } else if (activeOrder) {
    renderIsBike = activeOrder.id === 'TX-1049' || activeOrder.vehicleId?.startsWith('BIKE') || activeOrder.units <= 4;
    renderLitCubes = activeOrder.units;
  }

  let vehicleTransform = 'translateX(0) translateY(0) scale(1) rotate(0deg)';
  let vehicleTransition = 'none';
  let vehicleAnimation: string | undefined = undefined;
  let vehicleOpacity = 1;

  if (launchAnim.active) {
    if (launchAnim.phase === 'locking') {
      vehicleTransform = 'translateX(0) translateY(0) scale(1) rotate(0deg)';
      vehicleTransition = 'transform 0.25s ease';
    } else if (launchAnim.phase === 'revving') {
      vehicleTransform = 'translateX(-4px) translateY(-2px) scale(1.01) rotate(1.2deg)';
      vehicleTransition = 'transform 0.35s ease-out';
    } else if (launchAnim.phase === 'launching') {
      vehicleTransform = 'translateX(-135%) translateY(-2px) scale(0.96) rotate(1.2deg)';
      vehicleTransition = 'transform 0.55s cubic-bezier(0.55, 0.05, 0.67, 0.19), opacity 0.55s ease';
      vehicleOpacity = 0.15;
    } else if (launchAnim.phase === 'entering') {
      vehicleAnimation = 'vehicleGlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    }
  }

  return (
    <div
      style={{
        background: C.canvas,
        minHeight: '100%',
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
      }}
    >
      {/* ── Keyframe styles for 1.6s Kinetic Fleet Launch Animation (Spec 4.1) ── */}
      <style>{`
        @keyframes wheelSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes sirenStrobeRed {
          0%, 100% { fill: #EF4444; filter: drop-shadow(0 0 10px #EF4444); opacity: 1; }
          50% { fill: #7F1D1D; filter: none; opacity: 0.25; }
        }
        @keyframes sirenStrobeBlue {
          0%, 100% { fill: #1E3A8A; filter: none; opacity: 0.25; }
          50% { fill: #3B82F6; filter: drop-shadow(0 0 10px #3B82F6); opacity: 1; }
        }
        @keyframes cargoPulseGlow {
          0% { filter: drop-shadow(0 0 4px rgba(168, 85, 247, 0.5)); }
          100% { filter: drop-shadow(0 0 18px rgba(168, 85, 247, 1)); }
        }
        @keyframes windStreak {
          0% { transform: translateX(-120px); opacity: 0; }
          25% { opacity: 0.9; }
          75% { opacity: 0.9; }
          100% { transform: translateX(600px); opacity: 0; }
        }
        @keyframes vehicleGlideIn {
          from {
            transform: translateX(120%) scale(0.97);
            opacity: 0.35;
          }
          to {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes pulseDot {
          0% { transform: scale(0.85); opacity: 0.6; }
          100% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          background: '#18181B',
          color: '#FFFFFF',
          padding: '10px 18px',
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 600,
          boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── DASHBOARD BOARD ── */}
      <div
        data-testid="dashboard-board"
        style={{
          background: C.board,
          borderRadius: 28,
          padding: '22px 26px',
          width: '100%',
          maxWidth: 1100,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {/* ════════════════════════════════════════════
            ROW 1: TOP HEADER BAR
        ════════════════════════════════════════════ */}
        <div
          data-testid="dashboard-header-bar"
          style={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          {/* LEFT: Logo ("Plexus." -> "Dispatch." with same icon tile) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28,
              background: C.textPrimary,
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 12, height: 12, border: '2px solid white', borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.02em' }}>
              Dispatch.
            </span>
          </div>

          {/* CENTER: Nav pills & Jump Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Active Dashboard pill */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: '#FFFFFF',
              padding: '8px 16px',
              borderRadius: 999,
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ width: 4, height: 4, background: C.textPrimary, borderRadius: 1 }} />
                ))}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>Dashboard</span>
            </div>

            {/* 4 Jump Links with tooltips (Spec 21.2 Widget 2) */}
            {[
              {
                icon: <Globe size={16} />,
                tooltip: 'Network map',
                onClick: () => { window.location.hash = '#/workspace/map'; },
              },
              {
                icon: <TruckIcon size={16} />,
                tooltip: 'Fleet & queue',
                onClick: () => {
                  document.querySelector('[data-testid="fleet-queue-row"]')?.scrollIntoView({ behavior: 'smooth' });
                },
              },
              {
                icon: <ClipboardList size={16} />,
                tooltip: 'Transfer orders',
                onClick: () => {
                  document.querySelector('[data-testid="orders-table-card"]')?.scrollIntoView({ behavior: 'smooth' });
                },
              },
              {
                icon: <TrendingUp size={16} />,
                tooltip: 'Insights',
                onClick: () => {
                  showToast('Operational Insights: 92.6% on-time delivery across 30 days.');
                },
              },
            ].map((btn, i) => (
              <button
                key={i}
                type="button"
                title={btn.tooltip}
                onClick={btn.onClick}
                style={{
                  width: 36, height: 36,
                  background: 'rgba(255,255,255,0.65)',
                  borderRadius: 10,
                  border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  color: C.textSecondary,
                  transition: 'all 0.15s ease',
                }}
              >
                {btn.icon}
              </button>
            ))}
          </div>

          {/* RIGHT: Bell + Profile (Spec 21.2 Widget 3) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              data-testid="header-bell-button"
              onClick={() => {
                setActiveTab('exceptions');
                showToast(`Switched to Exceptions view (${exceptionsCount} active)`);
                document.querySelector('[data-testid="orders-table-card"]')?.scrollIntoView({ behavior: 'smooth' });
              }}
              title={exceptionsCount > 0 ? `${exceptionsCount} exceptions active (Click to view)` : 'Exceptions queue'}
              style={{
                width: 36, height: 36,
                background: 'rgba(255,255,255,0.65)',
                borderRadius: 10,
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                color: exceptionsCount > 0 ? '#DC2626' : C.textSecondary,
                position: 'relative',
              }}
            >
              <Bell size={16} />
              {exceptionsCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 7,
                  right: 7,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#EF4444',
                  border: '1.5px solid white',
                }} />
              )}
            </button>

            <div style={{
              width: 38, height: 38,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 13,
              flexShrink: 0,
            }}>
              {operatorInitials}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, lineHeight: 1.2 }}>
                {operatorName}
              </div>
              <div style={{ fontSize: 11, color: C.textSecondary }}>Dispatch operator</div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════
            ROW 2: 3-COLUMN VEHICLE SHOWCASE
        ════════════════════════════════════════════ */}
        <div
          data-testid="dashboard-row-2-showcase"
          style={{
            display: 'grid',
            gridTemplateColumns: '260px 1fr 360px',
            gap: 18,
            height: 330,
            maxHeight: 330,
            marginBottom: 14,
          }}
        >
          {/* ── LEFT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: 330, maxHeight: 330, boxSizing: 'border-box' }}>

            {/* Card 1: Active Shipment Telemetry */}
            <div
              data-testid="widget-active-dispatch"
              style={{
                background: C.card,
                borderRadius: 16,
                padding: '10px 14px',
                boxShadow: '0 4px 20px rgba(15,23,42,0.03)',
                flex: 'none',
                height: 186,
                maxHeight: 186,
                boxSizing: 'border-box',
                overflow: 'visible',
                position: 'relative',
              }}
            >
              {!activeOrder ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 8 }}>
                    No active dispatches. Run +6h Solver Rebalance.
                  </div>
                  <button
                    type="button"
                    onClick={handleRebalance}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: '#15997A',
                      color: 'white',
                      border: 'none',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    +6h Solver Rebalance
                  </button>
                </div>
              ) : (
                <>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.01em' }}>
                      #{activeOrder.id}
                    </span>
                    <span style={{
                      background: chipStyles?.bg || C.greenPill,
                      color: chipStyles?.tx || C.greenText,
                      fontSize: 10.5,
                      fontWeight: 600,
                      padding: '2px 9px',
                      borderRadius: 999,
                    }}>
                      {chipStyles?.label || 'In Transit'}
                    </span>
                  </div>

                  {/* Metrics row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    marginBottom: 6,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: C.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                      {activeOrder.distanceKm} km
                    </span>
                    <span style={{ fontSize: 10, color: C.textSecondary }}>·</span>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: C.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                      {activeOrder.status === 'delivered' ? '0 min left' : `${Math.max(1, Math.round(activeOrder.etaMin * (1 - activeOrder.progress)))} min left`}
                    </span>
                    <span style={{ fontSize: 10, color: C.textSecondary }}>·</span>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: C.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                      ETA {activeOrder.etaTime}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ position: 'relative', marginBottom: 6 }}>
                    <div style={{
                      height: 4,
                      background: '#F3E8FF',
                      borderRadius: 2,
                      position: 'relative',
                      overflow: 'visible',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.round(activeOrder.progress * 100)}%`,
                        background: C.purple,
                        borderRadius: 2,
                        position: 'relative',
                        transition: 'width 0.4s ease',
                      }}>
                        <div style={{
                          position: 'absolute',
                          right: -5,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: 9,
                          color: C.textPrimary,
                          fontWeight: 900,
                          lineHeight: 1,
                        }}>
                          ▶
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Route timeline */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 7, height: 7, borderRadius: '50%',
                          border: `2px solid ${C.textSecondary}`,
                          background: 'white',
                          flexShrink: 0,
                        }} />
                        <HospitalCodeBadge code={activeOrder.from} />
                      </div>
                      <span style={{ fontSize: 9.5, color: C.textSecondary, fontFamily: "'JetBrains Mono', monospace" }}>
                        {activeOrder.startedAt} · {activeOrder.units}u {activeOrder.group}
                      </span>
                    </div>

                    <div style={{
                      marginLeft: 2.5,
                      width: 2,
                      height: 6,
                      background: `repeating-linear-gradient(to bottom, ${C.textSecondary} 0px, ${C.textSecondary} 2px, transparent 2px, transparent 4px)`,
                    }} />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: C.textPrimary,
                          flexShrink: 0,
                        }} />
                        <HospitalCodeBadge code={activeOrder.to} />
                      </div>
                      <span style={{ fontSize: 9.5, color: C.textSecondary, fontFamily: "'JetBrains Mono', monospace" }}>
                        ETA {activeOrder.etaTime}
                      </span>
                    </div>
                  </div>

                  {/* One-line FEFO reason string */}
                  <div style={{
                    fontSize: 9,
                    lineHeight: '12px',
                    color: C.textSecondary,
                    marginBottom: 6,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {activeOrder.fefoReason}
                  </div>

                  {/* Action button */}
                  {activeOrder.status === 'proposed' ? (
                    <button
                      type="button"
                      onClick={() => {
                        approve(activeOrder.id);
                        showToast(`✓ Approved & Dispatched #${activeOrder.id} (${activeOrder.units}u to ${activeOrder.to})`);
                      }}
                      style={{
                        width: '100%',
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: 'none',
                        background: '#15997A',
                        color: '#FFFFFF',
                        fontSize: 10.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      Approve & dispatch
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        window.location.hash = `#/workspace/map/${activeOrder.to}`;
                      }}
                      style={{
                        width: '100%',
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid #E4E4E7',
                        background: '#FAFAFA',
                        color: C.textPrimary,
                        fontSize: 10.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Open on map →
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Card 2: Units Rescued (Last 30 Days) */}
            <div
              data-testid="widget-units-rescued"
              style={{
                background: C.card,
                borderRadius: 16,
                padding: '8px 14px',
                boxShadow: '0 4px 20px rgba(15,23,42,0.03)',
                flex: 'none',
                height: 66,
                maxHeight: 66,
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary }}>Units Rescued</span>
                <span style={{ fontSize: 10.5, color: C.textSecondary }}>last 30 days</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PerformanceBars history={history30Days} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, flexShrink: 0 }}>
                  {totalRescuedUnits}u
                </span>
              </div>
            </div>

            {/* Card 3: Courier Strip */}
            <div
              data-testid="widget-courier-card"
              style={{
                background: C.card,
                borderRadius: 16,
                padding: '7px 14px',
                boxShadow: '0 4px 20px rgba(15,23,42,0.03)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flex: 'none',
                height: 62,
                maxHeight: 62,
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #FDE68A 0%, #FB923C 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: 12, flexShrink: 0,
              }}>
                {activeOrder ? activeOrder.courier.name.split(' ').map(n => n[0]).join('') : 'CR'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textPrimary, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeOrder ? activeOrder.courier.name : 'Unassigned Courier'}
                </div>
                <div style={{ fontSize: 10.5, color: C.textSecondary }}>
                  Courier · {activeOrder ? activeOrder.vehicleId : 'STANDBY'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (activeOrder) showToast(`Calling ${activeOrder.courier.name} (${activeOrder.courier.phone})...`);
                  }}
                  title={activeOrder ? `Call ${activeOrder.courier.name}` : 'Call courier'}
                  style={{
                    width: 26, height: 26,
                    background: C.board,
                    borderRadius: 7,
                    border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    color: C.textSecondary,
                  }}
                >
                  <Phone size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeOrder) showToast(`Opening secure channel with ${activeOrder.vehicleId}...`);
                  }}
                  title={activeOrder ? `Message ${activeOrder.vehicleId}` : 'Message courier'}
                  style={{
                    width: 26, height: 26,
                    background: C.board,
                    borderRadius: 7,
                    border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    color: C.textSecondary,
                  }}
                >
                  <MessageSquare size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* ── CENTER COLUMN: Studio Vehicle X-Ray Render ── */}
          <div
            data-testid="widget-center-art"
            style={{
              background: 'radial-gradient(65% 55% at 50% 45%, #FFFFFF 0%, #FAFAFC 60%, #F1F5F9 100%)',
              borderRadius: 16,
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 330,
              maxHeight: 330,
              boxSizing: 'border-box',
            }}
          >
            {/* Soft studio elliptical ground contact shadow under tires (Spec 3.1) */}
            <div
              style={{
                position: 'absolute',
                bottom: 22,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '84%',
                maxWidth: 420,
                height: 18,
                borderRadius: '50%',
                background: 'radial-gradient(50% 50% at 50% 50%, rgba(15, 23, 42, 0.22) 0%, rgba(15, 23, 42, 0.06) 55%, transparent 100%)',
                filter: 'blur(3px)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
            {/* Wind-tunnel speed lines during revving & launching (Spec 4.1 Step 2) */}
            {launchAnim.active && (launchAnim.phase === 'revving' || launchAnim.phase === 'launching') && (
              <div
                data-testid="wind-tunnel-streaks"
                style={{
                  position: 'absolute',
                  inset: 0,
                  overflow: 'hidden',
                  pointerEvents: 'none',
                  zIndex: 3,
                }}
              >
                {[45, 85, 125, 165, 205, 245, 275].map((y, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'absolute',
                      top: y,
                      left: 0,
                      width: `${90 + (idx % 4) * 35}px`,
                      height: idx % 2 === 0 ? 2 : 1.5,
                      borderRadius: 1,
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.9) 50%, rgba(192,132,252,0.9) 100%)',
                      animation: 'windStreak 0.38s linear infinite',
                      animationDelay: `${idx * 0.05}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Purple particle trail during high-speed drive-off launch (Spec 4.1 Step 3) */}
            {launchAnim.active && launchAnim.phase === 'launching' && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: 30,
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  pointerEvents: 'none',
                  zIndex: 3,
                }}
              >
                {[80, 140, 95].map((w, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: w,
                      height: 3,
                      borderRadius: 2,
                      background: 'linear-gradient(90deg, rgba(168,85,247,0.85) 0%, transparent 100%)',
                      filter: 'drop-shadow(0 0 6px #A855F7)',
                      animation: 'windStreak 0.28s linear infinite',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Vehicle container with dynamic transform & transition */}
            <div
              data-testid="center-art-vehicle-wrap"
              style={{
                width: '100%',
                maxWidth: 480,
                padding: '4px 14px 24px',
                height: 270,
                transform: vehicleTransform,
                transition: vehicleTransition,
                animation: vehicleAnimation,
                opacity: vehicleOpacity,
                transformOrigin: '50% 80%',
              }}
            >
              <VehicleXRayRender
                isBike={renderIsBike}
                withXray={true}
                litCubes={renderLitCubes}
                isSirenStrobing={launchAnim.active && (launchAnim.phase === 'revving' || launchAnim.phase === 'launching')}
                isCargoFlashing={launchAnim.active && (launchAnim.phase === 'locking' || launchAnim.phase === 'revving')}
                isSpinning={launchAnim.active && (launchAnim.phase === 'revving' || launchAnim.phase === 'launching')}
              />
            </div>

            {/* Subtle studio radial backdrop */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(70% 60% at 60% 70%, rgba(255,255,255,0.55) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            {/* Purple glow behind xray cargo */}
            {((expandedRequest && (currentConfiguredUnits ?? 12) > 4) || (!expandedRequest && activeOrder && activeOrder.units > 4) || (launchAnim.active && launchAnim.units > 4)) && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(50% 50% at 68% 55%, rgba(192,132,252,0.12) 0%, transparent 65%)',
                pointerEvents: 'none',
              }} />
            )}

            {/* Chain-of-Custody Telemetry Chips or Live Request Cargo Config Banner or Launch Banner */}
            {launchAnim.active && (launchAnim.phase === 'locking' || launchAnim.phase === 'revving' || launchAnim.phase === 'launching') ? (
              <div
                data-testid="center-art-launch-banner"
                style={{
                  position: 'absolute',
                  bottom: 10,
                  left: 12,
                  right: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(24, 24, 27, 0.94)',
                  backdropFilter: 'blur(8px)',
                  color: '#FFFFFF',
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 10.5,
                  fontWeight: 700,
                  zIndex: 10,
                  boxShadow: '0 4px 16px rgba(168, 85, 247, 0.35)',
                  border: '1px solid rgba(168, 85, 247, 0.5)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#EF4444',
                      animation: 'pulseDot 0.5s infinite alternate',
                    }}
                  />
                  <span>
                    ● SEAL LOCKED · DISPATCHING #{launchAnim.orderId} ({launchAnim.from} → {launchAnim.to})
                  </span>
                </div>
                <span
                  style={{
                    background: '#9333EA',
                    color: '#FFFFFF',
                    padding: '2px 7px',
                    borderRadius: 4,
                    fontSize: 9.5,
                    fontWeight: 700,
                  }}
                >
                  {launchAnim.units}u {launchAnim.bloodGroup} · {launchAnim.isBike ? 'BIKE-02' : 'VAN-04'}
                </span>
              </div>
            ) : expandedRequest ? (
              <div
                data-testid="center-art-config-banner"
                style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 12,
                  right: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 5,
                  zIndex: 2,
                }}
              >
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(4px)',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    color: (currentConfiguredUnits ?? 12) <= 6 ? '#059669' : '#7C3AED',
                    border: '1px solid rgba(0,0,0,0.06)',
                  }}>
                    {(currentConfiguredUnits ?? 12) <= 6 ? 'BIKE-02 · 2-Wheeler Box' : 'VAN-04 · Heavy Isothermal'}
                  </span>
                  <span style={{
                    background: 'rgba(245,243,255,0.95)',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#6D28D9',
                    border: '1px solid #DDD6FE',
                  }}>
                    Live Cargo: {currentSelectedDonor} → {expandedRequest.targetHospital} ({currentConfiguredUnits ?? expandedRequest.neededUnits}u {expandedRequest.bloodGroup})
                  </span>
                </div>
                <span style={{
                  background: 'rgba(255,255,255,0.9)',
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#64748B',
                }}>
                  {currentConfiguredUnits ?? 12} Lit Cubes
                </span>
              </div>
            ) : (
              activeOrder && (
              <div style={{
                position: 'absolute',
                bottom: 8,
                left: 12,
                right: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 5,
                zIndex: 2,
              }}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  <span style={{
                    background: 'rgba(255,255,255,0.88)',
                    backdropFilter: 'blur(4px)',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    color: C.textPrimary,
                    border: '1px solid rgba(0,0,0,0.06)',
                  }}>
                    {activeOrder.vehicleId}
                  </span>
                  <span style={{
                    background: 'rgba(255,255,255,0.88)',
                    backdropFilter: 'blur(4px)',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 600,
                    color: activeOrder.coldChain.sealOk ? '#15803D' : '#B91C1C',
                    border: '1px solid rgba(0,0,0,0.06)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: activeOrder.coldChain.sealOk ? '#15803D' : '#B91C1C' }} />
                    {activeOrder.coldChain.sealOk ? 'Seal intact' : 'Seal broken'}
                  </span>
                  <span style={{
                    background: 'rgba(255,255,255,0.88)',
                    backdropFilter: 'blur(4px)',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 500,
                    color: C.textSecondary,
                    border: '1px solid rgba(0,0,0,0.06)',
                  }}>
                    Door opened {activeOrder.coldChain.doorOpens}×
                  </span>
                  <span style={{
                    background: 'rgba(255,255,255,0.88)',
                    backdropFilter: 'blur(4px)',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 500,
                    color: C.textSecondary,
                    border: '1px solid rgba(0,0,0,0.06)',
                  }}>
                    Tilt events {activeOrder.coldChain.tiltEvents}
                  </span>
                </div>

                {/* Excursion Chip if active */}
                {(activeOrder.hasTempExcursion || activeOrder.coldChain.tempC > 24) && (
                  <span style={{
                    background: '#FEF2F2',
                    color: '#B91C1C',
                    border: '1px solid #FCA5A5',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    ⚠ Temp: {activeOrder.coldChain.tempC.toFixed(1)}°C ({activeOrder.coldChain.excursionMin || 6}m)
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* ── RIGHT COLUMN: 2-Row Telemetry Bento ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: 330, maxHeight: 330, boxSizing: 'border-box' }}>
            {/* Top Row: Shelf Life Tank + Box Temperature Gauge side by side */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '112px 1fr',
              gap: 10,
              height: 145,
              maxHeight: 145,
            }}>
              {/* Card A: Shelf Life on Arrival (Spec 21.2 Widget 8) */}
              <div data-testid="widget-shelf-life" style={{ height: 145 }}>
                <ShelfLifeTank shelfLife={shelfLife} />
              </div>

              {/* Card B: Box Temperature Gauge (Spec 21.2 Widget 9) */}
              <div
                data-testid="widget-box-temp"
                style={{
                  background: C.amberBg,
                  borderRadius: 16,
                  padding: '10px 12px 8px',
                  boxShadow: '0 4px 20px rgba(15,23,42,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  height: 145,
                  maxHeight: 145,
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textPrimary, marginBottom: 1 }}>
                  Box Temperature
                </div>
                <div style={{ fontSize: 9.5, color: C.textSecondary, marginBottom: 2 }}>
                  20.0–24.0 °C safe transit band
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <GaugeSVG tempC={activeOrder ? activeOrder.coldChain.tempC : 22.0} />
                  <div style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: (activeOrder && (activeOrder.coldChain.tempC < 20 || activeOrder.coldChain.tempC > 24)) ? '#DC2626' : C.textPrimary,
                    marginTop: -4,
                  }}>
                    {activeOrder ? activeOrder.coldChain.tempC.toFixed(1) : '22.0'} °C
                  </div>
                  <div style={{ fontSize: 9, color: C.textSecondary, marginTop: 1 }}>
                    Agitation off {activeOrder ? Math.floor(activeOrder.coldChain.agitationOffMin / 60) : 0}:{activeOrder ? String(activeOrder.coldChain.agitationOffMin % 60).padStart(2, '0') : '16'} of 24:00 h
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Expiry Horizon (Spec 21.2 Widget 10) */}
            <div
              data-testid="widget-expiry-horizon"
              style={{
                background: C.card,
                borderRadius: 16,
                padding: '10px 14px 8px',
                boxShadow: '0 4px 20px rgba(15,23,42,0.03)',
                display: 'flex',
                flexDirection: 'column',
                height: 177,
                maxHeight: 177,
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#52525B', fontWeight: 500, marginBottom: 1 }}>
                    Expiry Horizon
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.01em' }}>
                    49u expire within 36 h
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: C.board, borderRadius: 8, padding: 2, gap: 2 }}>
                    {([24, 72, 120] as const).map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setExpiryHorizon(h)}
                        style={{
                          padding: '2px 7px',
                          fontSize: 10,
                          fontWeight: expiryHorizon === h ? 700 : 500,
                          borderRadius: 6,
                          border: 'none',
                          background: expiryHorizon === h ? '#FFFFFF' : 'transparent',
                          color: expiryHorizon === h ? C.textPrimary : C.textSecondary,
                          boxShadow: expiryHorizon === h ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 9.5, color: C.purple, fontWeight: 600 }}>
                    37u covered · modelled
                  </div>
                </div>
              </div>
              {/* Dynamic Expiry curve chart */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                <ExpiryCurveSVG horizon={expiryHorizon} />
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════
            ROW 3: FLEET QUEUE CAROUSEL (DISPATCH-SPEC Section 2.2)
        ════════════════════════════════════════════ */}
        <div
          data-testid="fleet-queue-row"
          style={{
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            scrollBehavior: 'smooth',
            padding: '0 2px',
            marginBottom: 14,
            height: 74,
            maxHeight: 74,
            boxSizing: 'border-box',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {queueOrders.map(unit => {
            const isActive = activeOrder ? activeOrder.id === unit.id : false;
            const isBike = unit.id === 'TX-1049' || unit.vehicleId?.startsWith('BIKE') || unit.units <= 6;
            return (
              <div
                key={unit.id}
                data-testid={`fleet-card-${unit.id}`}
                onClick={() => selectOrder(unit.id)}
                style={{
                  minWidth: 225,
                  width: 225,
                  height: 74,
                  flexShrink: 0,
                  boxSizing: 'border-box',
                  background: isActive ? C.card : C.cardMuted,
                  borderRadius: 12,
                  padding: '9px 12px',
                  boxShadow: isActive ? '0 4px 20px rgba(15,23,42,0.07)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: isActive ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>
                    #{unit.id}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#71717A' }}>
                    {unit.product} · {unit.group} · {unit.units}u
                  </div>
                  <div style={{ fontSize: 10, color: '#A1A1AA' }}>
                    {unit.from} → {unit.to}
                  </div>
                </div>
                <MiniVehicleSVG purple={isActive} isBike={isBike} />
              </div>
            );
          })}
        </div>

        {/* ════════════════════════════════════════════
            ROW 4: BOTTOM SPLIT (Map + Orders Table)
        ════════════════════════════════════════════ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '340px 1fr',
          gap: 18,
          height: 288,
          maxHeight: 288,
          boxSizing: 'border-box',
          opacity: isFading ? 0.35 : 1,
          transition: 'opacity 0.4s ease',
        }}>
          {/* ── Left Card: Coverage · NCR (Spec 21.2 Widget 12 & 13) ── */}
          <div
            data-testid="widget-distribution-map"
            style={{
              background: C.card,
              borderRadius: 16,
              padding: '16px 16px',
              boxShadow: '0 4px 20px rgba(15,23,42,0.03)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              height: 288,
              maxHeight: 288,
              boxSizing: 'border-box',
            }}
          >
            {/* Header: Title + Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, position: 'relative' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>Coverage · NCR</span>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  data-testid="zone-dropdown-button"
                  onClick={() => setShowZoneDropdown(!showZoneDropdown)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: C.board,
                    padding: '4px 10px',
                    borderRadius: 999,
                    border: 'none',
                    fontSize: 12, fontWeight: 600, color: C.textPrimary,
                    cursor: 'pointer',
                  }}
                >
                  <span>{selectedZone || 'All NCR'}</span>
                  <span style={{ fontSize: 9 }}>▼</span>
                </button>

                {showZoneDropdown && (
                  <div
                    data-testid="zone-dropdown-menu"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: 6,
                      background: '#FFFFFF',
                      borderRadius: 10,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                      border: '1px solid #F1F5F9',
                      zIndex: 999,
                      minWidth: 150,
                      padding: '6px 0',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      onClick={() => { setSelectedZone(null); setShowZoneDropdown(false); }}
                      style={{
                        padding: '6px 14px',
                        fontSize: 11.5,
                        fontWeight: !selectedZone ? 700 : 500,
                        color: !selectedZone ? '#9333EA' : C.textPrimary,
                        background: !selectedZone ? '#FAF5FF' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      All NCR
                    </div>
                    {['North Delhi', 'West Delhi', 'Central Delhi', 'East Delhi', 'South Delhi', 'Gurugram', 'Faridabad', 'Noida', 'Ghaziabad'].map((zone) => (
                      <div
                        key={zone}
                        onClick={() => { setSelectedZone(zone); setShowZoneDropdown(false); }}
                        style={{
                          padding: '6px 14px',
                          fontSize: 11.5,
                          fontWeight: selectedZone === zone ? 700 : 500,
                          color: selectedZone === zone ? '#9333EA' : C.textPrimary,
                          background: selectedZone === zone ? '#FAF5FF' : 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        {zone}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Vector NCR Zone Tile Map */}
            <div style={{
              height: 160,
              borderRadius: 10,
              position: 'relative',
              marginBottom: 12,
            }}>
              <NCRZoneTileMap
                selectedZone={selectedZone}
                onSelectZone={(z) => setSelectedZone(selectedZone === z ? null : z)}
                orders={orders}
              />
            </div>

            {/* Footer stats (Spec 21.2 Widget 13) */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 'auto' }}>
              <div>
                <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 2 }}>Units in transit</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary }} data-testid="kpi-units-in-transit">
                  {unitsInTransit}u
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 2 }}>On-time delivery (30 d)</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary }} data-testid="kpi-ontime-pct">
                  {onTimeDeliveryPct}%
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444' }} />
                  <span style={{ fontSize: 10, color: C.textSecondary, fontWeight: 500 }}>{shortCount} zones short</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />
                  <span style={{ fontSize: 10, color: C.textSecondary, fontWeight: 500 }}>{surplusCount} zones surplus</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Card: Transfer orders Table (Spec 21.2 Widget 14) ── */}
          <div
            data-testid="orders-table-card"
            style={{
              background: C.card,
              borderRadius: 16,
              padding: '16px 18px',
              boxShadow: '0 4px 20px rgba(15,23,42,0.03)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              height: 288,
              maxHeight: 288,
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            {/* Header: Title + count badge | Tabs | Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>Transfer orders</span>
                <span
                  data-testid="table-total-count-badge"
                  style={{
                    background: C.board,
                    color: C.textSecondary,
                    fontSize: 11, fontWeight: 600,
                    padding: '2px 8px', borderRadius: 999,
                  }}
                >
                  {activeTab === 'proposed' ? incomingRequests.length : filteredOrders.length}
                </span>
              </div>

              {/* Status tabs */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                {[
                  { id: 'proposed' as const, label: 'Proposed', count: incomingRequests.length },
                  { id: 'in_transit' as const, label: 'In transit', count: tabCounts.in_transit },
                  { id: 'delivered' as const, label: 'Delivered', count: tabCounts.delivered },
                  { id: 'exceptions' as const, label: 'Exceptions', count: tabCounts.exceptions },
                ].map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <div
                      key={tab.id}
                      data-testid={`tab-${tab.id}`}
                      onClick={() => {
                        setActiveTab(tab.id);
                        if (tab.id !== 'proposed') setModalRequestId(null);
                      }}
                      style={{
                        fontSize: 12,
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? C.textPrimary : C.textSecondary,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'color 0.15s ease',
                        position: 'relative',
                        paddingBottom: 2,
                        borderBottom: isActive ? `2px solid ${C.textPrimary}` : '2px solid transparent',
                      }}
                    >
                      {tab.label} <span style={{ opacity: 0.7, fontSize: 11 }}>{tab.count}</span>
                    </div>
                  );
                })}

                {/* + New Dispatch quick button (DISPATCH-SPEC.md Section 1.2) */}
                <button
                  type="button"
                  data-testid="new-dispatch-quick-btn"
                  onClick={() => {
                    setActiveTab('proposed');
                    const targetReq = incomingRequests[0]?.id || 'REQ-901';
                    setModalRequestId(targetReq);
                  }}
                  style={{
                    background: activeTab === 'proposed' && modalRequestId ? '#9333EA' : '#F5F3FF',
                    color: activeTab === 'proposed' && modalRequestId ? '#FFFFFF' : '#7C3AED',
                    border: '1px solid #DDD6FE',
                    borderRadius: 999,
                    padding: '2px 8px',
                    fontSize: 10.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    transition: 'all 0.15s ease',
                  }}
                >
                  + New Dispatch
                </button>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
                <button
                  type="button"
                  data-testid="export-csv-btn"
                  title="Export CSV of filtered rows"
                  onClick={() => {
                    exportOrdersToCSV(filteredOrders);
                    showToast(`Exported ${filteredOrders.length} orders to CSV`);
                  }}
                  style={{
                    width: 30, height: 30,
                    background: C.board,
                    borderRadius: 8,
                    border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    color: C.textSecondary,
                  }}
                >
                  <Calendar size={14} />
                </button>

                <button
                  type="button"
                  data-testid="filter-popover-btn"
                  title="Filter orders"
                  onClick={() => setShowFilterPopover(!showFilterPopover)}
                  style={{
                    width: 30, height: 30,
                    background: showFilterPopover || productFilter !== 'all' || selectedZone ? '#FAF5FF' : C.board,
                    borderRadius: 8,
                    border: showFilterPopover ? '1px solid #C084FC' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    color: showFilterPopover || productFilter !== 'all' || selectedZone ? '#9333EA' : C.textSecondary,
                  }}
                >
                  <Filter size={14} />
                </button>

                {showFilterPopover && (
                  <div
                    data-testid="filter-popover-menu"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: 6,
                      background: '#FFFFFF',
                      borderRadius: 12,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                      border: '1px solid #E2E8F0',
                      zIndex: 999,
                      width: 220,
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.textPrimary }}>Filter Orders</span>
                      <button
                        type="button"
                        onClick={() => { setProductFilter('all'); setSelectedZone(null); }}
                        style={{ border: 'none', background: 'transparent', color: '#9333EA', fontSize: 10.5, cursor: 'pointer', fontWeight: 600 }}
                      >
                        Reset
                      </button>
                    </div>

                    <div>
                      <div style={{ fontSize: 10, color: C.textSecondary, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Product</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(['all', 'Apheresis', 'RDP'] as const).map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setProductFilter(p)}
                            style={{
                              flex: 1,
                              padding: '4px 6px',
                              borderRadius: 6,
                              border: productFilter === p ? '1px solid #9333EA' : '1px solid #E2E8F0',
                              background: productFilter === p ? '#FAF5FF' : '#F8FAFC',
                              color: productFilter === p ? '#9333EA' : C.textPrimary,
                              fontSize: 10.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {p === 'all' ? 'All' : p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 10, color: C.textSecondary, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Zone</div>
                      <select
                        value={selectedZone || 'all'}
                        onChange={(e) => setSelectedZone(e.target.value === 'all' ? null : e.target.value)}
                        style={{
                          width: '100%',
                          padding: '5px 8px',
                          borderRadius: 6,
                          border: '1px solid #E2E8F0',
                          fontSize: 11,
                          color: C.textPrimary,
                          background: '#FFFFFF',
                        }}
                      >
                        <option value="all">All Zones</option>
                        {['North Delhi', 'West Delhi', 'Central Delhi', 'East Delhi', 'South Delhi', 'Gurugram', 'Faridabad', 'Noida', 'Ghaziabad'].map(z => (
                          <option key={z} value={z}>{z}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Column headers (6 columns) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: activeTab === 'proposed'
                ? '90px 75px 145px 125px 70px 1fr'
                : '110px 175px 72px 72px 88px 1fr',
              gap: 8,
              paddingBottom: 8,
              borderBottom: '1px solid #F4F4F5',
              marginBottom: 2,
            }}>
              {(activeTab === 'proposed'
                ? ['Request', 'Hospital', 'Unit Request', 'Deficit', 'Window', 'Action']
                : ['Order ID', 'Order assigned to', 'Pickup', 'Delivery', 'Est. delivery', 'Status']
              ).map(h => (
                <div key={h} style={{ fontSize: 11, color: '#A1A1AA', fontWeight: 500 }}>{h}</div>
              ))}
            </div>

            {/* Table rows */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              maxHeight: 200,
              overflowY: 'auto',
              maskImage: (activeTab === 'proposed' ? incomingRequests.length : filteredOrders.length) > 4 ? 'linear-gradient(to bottom, black 82%, transparent 100%)' : 'none',
              WebkitMaskImage: (activeTab === 'proposed' ? incomingRequests.length : filteredOrders.length) > 4 ? 'linear-gradient(to bottom, black 82%, transparent 100%)' : 'none',
            }}>
              {activeTab === 'proposed' ? (
                incomingRequests.map((req, i) => {
                  const urgencyStyle =
                    req.urgency === 'Critical'
                      ? { bg: '#FEE2E2', tx: '#DC2626', border: '#FCA5A5' }
                      : req.urgency === 'High'
                      ? { bg: '#FFEDD5', tx: '#C2410C', border: '#FDBA74' }
                      : { bg: '#FEF3C7', tx: '#B45309', border: '#FCD34D' };

                  return (
                    <div
                      key={req.id}
                      data-testid={`request-row-${req.id}`}
                      onClick={() => setModalRequestId(req.id)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '90px 75px 145px 125px 70px 1fr',
                        gap: 8,
                        alignItems: 'center',
                        height: 46,
                        borderBottom: i < incomingRequests.length - 1 ? '1px solid #F4F4F5' : 'none',
                        background: modalRequestId === req.id ? 'rgba(168, 85, 247, 0.06)' : 'transparent',
                        borderRadius: 6,
                        padding: '0 4px',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Column 1 (Request): #REQ-901 */}
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary, whiteSpace: 'nowrap' }}>
                          #{req.id}
                        </span>
                      </div>

                      {/* Column 2 (Hospital): ONLY <HospitalCodeBadge code="AIM" /> */}
                      <div>
                        <HospitalCodeBadge code={req.targetHospital} />
                      </div>

                      {/* Column 3 (Unit Request): 12u O- Apheresis */}
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#18181B', whiteSpace: 'nowrap' }}>
                        {req.neededUnits}u {req.bloodGroup} {req.product}
                      </div>

                      {/* Column 4 (Deficit): Compact pill */}
                      <div>
                        <span style={{
                          fontSize: 10.5,
                          fontWeight: 600,
                          background: urgencyStyle.bg,
                          color: urgencyStyle.tx,
                          border: `1px solid ${urgencyStyle.border}`,
                          padding: '2px 8px',
                          borderRadius: 999,
                          whiteSpace: 'nowrap',
                        }}>
                          {req.urgency} · {req.deficitStr}
                        </span>
                      </div>

                      {/* Column 5 (Window): < 45m */}
                      <div style={{ fontSize: 12, color: '#71717A', whiteSpace: 'nowrap' }}>
                        {req.estWindow.replace(' min', 'm').replace(' h', 'h')}
                      </div>

                      {/* Column 6 (Action): Assign → */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          data-testid={`assign-btn-${req.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalRequestId(req.id);
                          }}
                          style={{
                            background: '#F3E8FF',
                            color: '#7E22CE',
                            border: '1px solid #DDD6FE',
                            padding: '5px 12px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          Assign →
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                filteredOrders.length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center', color: C.textSecondary, fontSize: 12 }}>
                    No orders matching the current filter.
                  </div>
                ) : (
                  filteredOrders.map((order, i) => {
                    const isSelected = activeOrder?.id === order.id;
                    const chip = getStatusChipStyles(order.status, order.hasTempExcursion);
                    return (
                      <div
                        key={order.id}
                        data-testid={`order-row-${order.id}`}
                        onClick={() => selectOrder(order.id)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '110px 175px 72px 72px 88px 1fr',
                          gap: 8,
                          alignItems: 'center',
                          height: 44,
                          borderBottom: i < filteredOrders.length - 1 ? '1px solid #F4F4F5' : 'none',
                          background: isSelected ? 'rgba(168, 85, 247, 0.05)' : 'transparent',
                          borderRadius: 6,
                          padding: '0 4px',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        {/* Column 1: Order ID only (12px bold #18181B) */}
                        <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary }}>#{order.id}</span>
                        </div>

                        {/* Column 2: Order assigned to only (12px #18181B) */}
                        <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: C.textPrimary, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {order.courier.name}
                          </span>
                        </div>

                        {/* Column 3: Pickup code badge */}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <HospitalCodeBadge code={order.from} />
                        </div>

                        {/* Column 4: Delivery code badge */}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <HospitalCodeBadge code={order.to} />
                        </div>

                        {/* Column 5: Est. delivery */}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                            {order.etaTime}
                          </span>
                        </div>

                        {/* Column 6: Status Pill only (Clean Moveon status pill, NO Map -> button) */}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: chip.bg,
                            color: chip.tx,
                            border: chip.border ? `1px solid ${chip.border}` : 'none',
                            fontSize: 10.5,
                            fontWeight: 600,
                            padding: '3px 9px',
                            borderRadius: 999,
                            whiteSpace: 'nowrap',
                          }}>
                            {chip.label}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>
        </div>

        {/* Footnote per spec 21.6 */}
        <div
          data-testid="dashboard-simulated-footnote"
          style={{
            marginTop: 14,
            padding: '6px 4px 0 4px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 10.5,
            color: '#94A3B8',
            textAlign: 'center',
            letterSpacing: '0.01em',
          }}
        >
          Simulated data, generated from the live solver run. ETAs are free-flow estimates (OSRM), not live traffic.
        </div>
      </div>

      {/* ─── Centered Glassmorphic Dispatch Modal (DISPATCH-SPEC.md Section 1.2 & 3.2) ─── */}
      {modalRequestId && activeModalRequest && (
        <div
          data-testid="dispatch-modal-backdrop"
          onClick={() => setModalRequestId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(15, 23, 42, 0.35)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            data-testid="dispatch-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 500,
              maxWidth: '94vw',
              background: '#FFFFFF',
              borderRadius: 20,
              padding: 24,
              boxShadow: '0 25px 60px rgba(15, 23, 42, 0.18)',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              animation: 'modalPop 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* 1. Header Row (Section 3.2 Item 1) */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#8E929F',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}>
                  Assign Transfer
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#18181B' }}>
                    #{activeModalRequest.id} · {activeModalRequest.targetHospital}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    background: '#FEE2E2',
                    color: '#B91C1C',
                    padding: '3px 9px',
                    borderRadius: 999,
                    letterSpacing: '0.01em',
                  }}>
                    {activeModalRequest.neededUnits}u {activeModalRequest.bloodGroup} {activeModalRequest.product}
                  </span>
                </div>
              </div>
              <button
                type="button"
                data-testid="modal-close-btn"
                onClick={() => setModalRequestId(null)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  background: '#F4F4F5',
                  border: 'none',
                  color: '#71717A',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.12s ease',
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* 2. Section 1 — Select Optimal Source Hub (3-Column Grid, Section 3.2 Item 2) */}
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#71717A', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 }}>
                Select Optimal Source Hub
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {activeModalRequest.donors.map((donor) => {
                  const isSelected = (selectedDonorMap[activeModalRequest.id] || activeModalRequest.donors[0].code) === donor.code;
                  const stockRatio = Math.min(100, Math.round((donor.availableUnits / 32) * 100));
                  return (
                    <div
                      key={donor.code}
                      data-testid={`donor-pill-${donor.code}`}
                      onClick={() => {
                        setSelectedDonorMap((prev) => ({ ...prev, [activeModalRequest.id]: donor.code }));
                      }}
                      style={{
                        borderRadius: 12,
                        padding: '12px 12px',
                        background: isSelected ? '#FAF5FF' : '#FFFFFF',
                        border: isSelected ? '1.5px solid #9333EA' : '1px solid #E4E4E7',
                        boxShadow: isSelected ? '0 4px 12px rgba(147, 51, 234, 0.12)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Top: ● N62 (with hover tooltip) | 14m pill */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <HospitalCodeBadge code={donor.code} />
                        <span style={{
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: isSelected ? '#7E22CE' : '#71717A',
                          background: isSelected ? '#F3E8FF' : '#F4F4F5',
                          padding: '2px 7px',
                          borderRadius: 999,
                        }}>
                          {donor.etaMin}m
                        </span>
                      </div>
                      {/* Middle: 28u available */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#18181B' }}>
                          {donor.availableUnits}u
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: '#71717A' }}>
                          available
                        </span>
                      </div>
                      {/* Bottom: Thin 3px progress bar showing stock ratio (#A855F7 on selected, #E4E4E7 on unselected) */}
                      <div style={{ width: '100%', height: 3, background: '#F4F4F5', borderRadius: 2, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${stockRatio}%`,
                            height: '100%',
                            background: isSelected ? '#A855F7' : '#E4E4E7',
                            borderRadius: 2,
                            transition: 'background 0.15s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Section 2 — Quantity & Carrier Bar (Section 3.2 Item 3, No Toy Squares, No Emoji) */}
            {(() => {
              const units = configuredUnitsMap[activeModalRequest.id] ?? activeModalRequest.neededUnits;
              const isBike = units <= 6;
              const maxCapacity = isBike ? 6 : 24;
              const capacityPct = Math.min(100, Math.round((units / maxCapacity) * 100));

              return (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  padding: '14px 16px',
                  background: '#F8FAFC',
                  borderRadius: 14,
                  border: '1px solid #E2E8F0',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}>
                    {/* Left: Clean Tactile Stepper */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Quantity:
                      </span>
                      <button
                        type="button"
                        data-testid="stepper-minus-btn"
                        disabled={units <= 1}
                        onClick={() => {
                          setConfiguredUnitsMap((prev) => ({ ...prev, [activeModalRequest.id]: Math.max(1, units - 1) }));
                        }}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          color: units <= 1 ? '#CBD5E1' : '#1E293B',
                          fontWeight: 700,
                          fontSize: 16,
                          cursor: units <= 1 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        }}
                      >
                        −
                      </button>
                      <div
                        data-testid="stepper-value"
                        style={{
                          minWidth: 54,
                          height: 30,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 13,
                          color: '#0F172A',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {units} units
                      </div>
                      <button
                        type="button"
                        data-testid="stepper-plus-btn"
                        disabled={units >= 24}
                        onClick={() => {
                          setConfiguredUnitsMap((prev) => ({ ...prev, [activeModalRequest.id]: Math.min(24, units + 1) }));
                        }}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          color: units >= 24 ? '#CBD5E1' : '#1E293B',
                          fontWeight: 700,
                          fontSize: 16,
                          cursor: units >= 24 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        }}
                      >
                        +
                      </button>
                    </div>

                    {/* Right: Architectural Carrier Badge with Monochrome Silhouette (NO Emoji) */}
                    <div
                      data-testid="assigned-vehicle-badge"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#FFFFFF',
                        color: '#18181B',
                        border: '1px solid #E2E8F0',
                        borderRadius: 999,
                        padding: '5px 12px',
                        fontSize: 11,
                        fontWeight: 600,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      }}
                    >
                      {isBike ? (
                        <svg width="18" height="13" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="5" cy="12" r="3" />
                          <circle cx="19" cy="12" r="3" />
                          <path d="M5 12l4-5h4l3 5" />
                          <path d="M12 7V4h3" />
                          <rect x="14" y="4.5" width="5.5" height="5" rx="1" fill="#71717A" />
                        </svg>
                      ) : (
                        <svg width="19" height="13" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="1" y="2" width="15" height="10" rx="1.5" />
                          <path d="M16 6h4l3 3v3h-7V6z" />
                          <circle cx="6" cy="12.5" r="2.5" />
                          <circle cx="18" cy="12.5" r="2.5" />
                        </svg>
                      )}
                      <span>{isBike ? 'BIKE-02 · 2-Wheeler Carrier' : 'VAN-04 · Isothermal Carrier'}</span>
                    </div>
                  </div>

                  {/* Smooth Continuous Capacity Bar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#64748B', fontWeight: 500 }}>
                      <span>Carrier Capacity</span>
                      <span style={{ fontWeight: 600, color: '#18181B' }}>{capacityPct}% ({units}/{maxCapacity}u)</span>
                    </div>
                    <div style={{ width: '100%', height: 4, background: '#E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${capacityPct}%`,
                          height: '100%',
                          background: isBike ? '#10B981' : '#9333EA',
                          borderRadius: 2,
                          transition: 'width 0.2s ease, background 0.2s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 4. Footer CTA Button (Section 3.2 Item 4) */}
            {(() => {
              const units = configuredUnitsMap[activeModalRequest.id] ?? activeModalRequest.neededUnits;
              const donor = selectedDonorMap[activeModalRequest.id] || activeModalRequest.donors[0].code;
              return (
                <button
                  type="button"
                  data-testid="confirm-dispatch-btn"
                  onClick={() => {
                    const req = activeModalRequest;
                    setModalRequestId(null);
                    handleConfirmDispatch(req, donor, units);
                  }}
                  style={{
                    width: '100%',
                    height: 46,
                    borderRadius: 12,
                    background: '#18181B',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  Confirm & Dispatch {units}u · {donor} → {activeModalRequest.targetHospital}
                </button>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
