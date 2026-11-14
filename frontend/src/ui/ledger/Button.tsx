import React from 'react';
import { LEDGER_TOKENS } from './tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'text';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  'data-testid'?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  icon,
  className = '',
  style,
  disabled,
  ...props
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  let bg: string = LEDGER_TOKENS.primary;
  let text: string = LEDGER_TOKENS.primaryText;
  let border: string = 'none';
  let height = '36px';
  let padding = '0 14px';
  let textDecoration = 'none';

  if (variant === 'secondary') {
    bg = isHovered ? LEDGER_TOKENS.surface : 'transparent';
    text = LEDGER_TOKENS.ink;
    border = `1px solid ${LEDGER_TOKENS.hairlineStrong}`;
  } else if (variant === 'text') {
    bg = 'transparent';
    text = isHovered ? LEDGER_TOKENS.ink : LEDGER_TOKENS.ink2;
    border = 'none';
    padding = '0 6px';
    height = '32px';
    textDecoration = isHovered ? 'underline' : 'none';
  } else {
    // primary
    bg = isHovered ? LEDGER_TOKENS.primaryHover : LEDGER_TOKENS.primary;
    text = LEDGER_TOKENS.primaryText;
    border = 'none';
  }

  return (
    <button
      disabled={disabled}
      className={`ledger-button ledger-button-${variant} ${className}`}
      data-testid={props['data-testid'] || `ledger-btn-${variant}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        minHeight: height,
        padding,
        borderRadius: LEDGER_TOKENS.radius.md,
        background: disabled ? LEDGER_TOKENS.hairline : bg,
        color: disabled ? LEDGER_TOKENS.ink4 : text,
        border,
        fontFamily: LEDGER_TOKENS.fontUi,
        fontSize: LEDGER_TOKENS.type.t14,
        fontWeight: 500,
        textDecoration,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
        outline: 'none',
        ...style,
      }}
    >
      {icon && <span aria-hidden="true" style={{ display: 'inline-flex' }}>{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
