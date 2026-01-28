import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'white' | 'black';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  noPointer?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  href,
  external = false,
  disabled = false,
  fullWidth = false,
  icon,
  leftIcon,
  noPointer = false,
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-3xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 gap-2 whitespace-nowrap hover:opacity-95 active:opacity-90 disabled:hover:opacity-50';

  const variantClasses = {
    primary: 'bg-primary text-white focus:ring-transparent hover:brightness-95',
    secondary: 'bg-gray-100 text-gray-900 focus:ring-transparent hover:bg-gray-200',
    white: '!bg-white !text-black !border-0 focus:ring-transparent hover:bg-[#f5f5f5]',
    black: 'bg-black text-white focus:ring-transparent hover:bg-[#0d0d0d] active:bg-[#1a1a1a]',
  } as const;

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-3 text-base text-semibold',
    lg: 'px-5 py-4 text-semibold leading-[1]',
  };

  const cursorClasses = disabled ? 'opacity-50 cursor-not-allowed' : noPointer ? 'cursor-default' : 'cursor-pointer';
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
    fullWidth ? 'w-full' : ''
  } ${cursorClasses} ${className}`;

  if (href) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={classes}
      >
        {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        {children}
        {icon && <span className="flex-shrink-0">{icon}</span>}
      </a>
    );
  }

  return (
    <button className={classes} onClick={onClick} disabled={disabled}>
      {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      {children}
      {icon && <span className="flex-shrink-0">{icon}</span>}
    </button>
  );
}
