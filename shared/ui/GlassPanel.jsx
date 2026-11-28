import React from 'react';

export default function GlassPanel({
  as: Tag = 'div',
  variant = 'elevated', // elevated | subtle | solid
  padding = 16,
  className = '',
  style = {},
  children,
  ...rest
}) {
  const variantClass =
    variant === 'subtle' ? 'lp-glass-subtle' : variant === 'solid' ? 'bg-white border border-slate-200/80 rounded-[14px]' : 'lp-glass';

  return (
    <Tag
      className={`${variantClass} ${className}`}
      style={{ padding, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
