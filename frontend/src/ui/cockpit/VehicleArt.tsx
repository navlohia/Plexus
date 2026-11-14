import React, { useState } from 'react';
import { COCKPIT_TOKENS } from './tokens';

export type VehicleType = 'van' | 'bike' | 'truck';

export interface VehicleArtProps {
  type?: VehicleType;
  variant?: 'hero' | 'thumb' | 'card';
  alt?: string;
  className?: string;
  chips?: Array<{ label: string; icon?: React.ReactNode }>;
  style?: React.CSSProperties;
}

export const VehicleArt: React.FC<VehicleArtProps> = ({
  type = 'van',
  variant = 'hero',
  alt = 'Fleet Delivery Vehicle',
  className = '',
  chips,
  style,
}) => {
  const [imgError, setImgError] = useState(false);

  const imgSrc = type === 'bike' ? '/bike_studio_3d.png' : '/van_studio_3d.png';
  const isHero = variant === 'hero';
  const isThumb = variant === 'thumb';

  // Sizing definitions
  // Hero size 2:1 ratio per HOSPITAL_UI_SPEC.md 2
  const containerWidth = isHero ? 360 : isThumb ? 56 : 140;
  const containerHeight = isHero ? 180 : isThumb ? 28 : 70;

  return (
    <div
      className={`cockpit-vehicle-art ${className}`}
      data-testid="cockpit-vehicle-art"
      data-vehicle-type={type}
      style={{
        position: 'relative',
        width: isHero ? '100%' : containerWidth,
        maxWidth: isHero ? 420 : containerWidth,
        aspectRatio: isHero ? '2 / 1' : undefined,
        height: isHero ? undefined : containerHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {/* Soft Ground Shadow per Spec */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: isHero ? '8%' : '4%',
          width: isHero ? '78%' : '84%',
          height: isHero ? '16px' : '6px',
          background: 'radial-gradient(ellipse at center, rgba(20, 27, 45, 0.28) 0%, rgba(20, 27, 45, 0.08) 55%, transparent 75%)',
          borderRadius: '50%',
          filter: isHero ? 'blur(4px)' : 'blur(2px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Realistic 3D Asset or SVG Fallback */}
      {!imgError ? (
        <img
          src={imgSrc}
          alt={alt}
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            mixBlendMode: 'multiply',
            filter: 'contrast(1.04) brightness(1.02)',
            position: 'relative',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
      ) : (
        /* Crisp Clean Vector Silhouette Fallback */
        <div
          data-testid="vehicle-art-fallback"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 2,
            background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)',
            borderRadius: isHero ? '20px' : '6px',
            border: '1px solid rgba(20, 27, 45, 0.08)',
          }}
        >
          <svg
            viewBox="0 0 100 50"
            fill="none"
            style={{ width: '70%', height: '70%', opacity: 0.8 }}
          >
            {type === 'bike' ? (
              <g stroke={COCKPIT_TOKENS.ink.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="25" cy="35" r="9" />
                <circle cx="75" cy="35" r="9" />
                <path d="M25 35 L45 35 L55 20 L35 20 Z" />
                <path d="M55 20 L68 14 L75 35" />
                <rect x="22" y="14" width="16" height="12" rx="2" fill={COCKPIT_TOKENS.lavender[500]} stroke="none" />
              </g>
            ) : (
              <g stroke={COCKPIT_TOKENS.ink.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 35 L15 15 L65 15 L80 24 L85 35 Z" fill="#FFFFFF" />
                <rect x="62" y="18" width="14" height="8" rx="1" fill={COCKPIT_TOKENS.lavender[100]} />
                <circle cx="30" cy="36" r="6" fill={COCKPIT_TOKENS.ink.primary} />
                <circle cx="72" cy="36" r="6" fill={COCKPIT_TOKENS.ink.primary} />
              </g>
            )}
          </svg>
        </div>
      )}

      {/* Floating Glass Chips Over Vehicle Art (Allowed Glass Zone per Section 2 & 4) */}
      {isHero && chips && chips.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '16px',
            display: 'flex',
            gap: '8px',
            zIndex: 3,
            flexWrap: 'wrap',
          }}
        >
          {chips.map((chip, i) => (
            <div key={i} className="cockpit-glass-chip">
              {chip.icon}
              <span>{chip.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

