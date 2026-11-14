import React from 'react';

interface PlexusLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const PlexusLogo: React.FC<PlexusLogoProps> = ({ size = 28, className, style }) => {
  return (
    <img
      src="/favicon.svg"
      alt="Plexus"
      width={size}
      height={size}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        objectFit: 'contain',
        flexShrink: 0,
        ...style,
      }}
    />
  );
};

export default PlexusLogo;
