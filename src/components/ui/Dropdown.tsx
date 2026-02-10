'use client';

import React from 'react';

export interface Option {
  key: string;
  label: string;
}

interface DropdownProps {
  value: string;
  onChange: React.Dispatch<React.SetStateAction<string>>;
  options: Option[];
  className?: string;
  disabled?: boolean;
}

export default function Dropdown({ value, onChange, options, className = '', disabled = false }: DropdownProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open || disabled) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, disabled]);

  const active = options.find((o) => o.key === value);

  return (
    <div className={['relative', className].join(' ')} ref={rootRef}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={[
          'text-xs px-3 py-1 rounded-[5px] font-semibold shadow-sm transition whitespace-nowrap',
          disabled
            ? 'bg-[#4a4a4a] text-black cursor-not-allowed'
            : 'bg-white text-black cursor-pointer hover:opacity-90',
        ].join(' ')}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select period"
        aria-disabled={disabled}
      >
        {active?.label ?? ''}
        <span
          className={[
            'ml-1 inline-block text-base leading-none align-middle transform transition-transform duration-200',
            open ? 'rotate-180' : '-translate-y-[2px]',
          ].join(' ')}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 rounded-[5px] bg-white shadow-lg ring-1 ring-black/10 p-2.5 z-50">
          <ul role="listbox" aria-label="Select TVL period" className="space-y-1">
            {options.map((opt) => {
              const isActive = opt.key === value;
              return (
                <li key={opt.key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      onChange(opt.key);
                      setOpen(false);
                    }}
                    className={[
                      'cursor-pointer w-full text-center px-4 py-2 rounded-[5px] text-sm font-semibold whitespace-nowrap',
                      isActive ? 'bg-black text-white' : 'text-black hover:bg-black/20',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
