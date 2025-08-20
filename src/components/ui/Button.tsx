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
  noPointer = false,
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-3xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 gap-1 whitespace-nowrap';

  const variantClasses = {
    primary: 'bg-primary text-white focus:ring-transparent',
    secondary: 'bg-gray-100 text-gray-900 focus:ring-transparent',
    white: '!bg-white !text-black border border-gray-200 focus:ring-transparent',
    black: 'bg-black text-white focus:ring-transparent',
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
        {children}
        {icon}
      </a>
    );
  }

  return (
    <button className={classes} onClick={onClick} disabled={disabled}>
      {children}
      {icon}
    </button>
  );
}
