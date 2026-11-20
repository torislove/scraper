import React, { useMemo } from 'react';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function OdometerDigit({ char }) {
  const isDigit = /^[0-9]$/.test(char);
  if (!isDigit) {
    return <span className="odometer-num" style={{ opacity: 0.7, padding: '0 1px' }}>{char}</span>;
  }

  const num = parseInt(char, 10);
  return (
    <span className="odometer-digit">
      <span
        className="odometer-ribbon"
        style={{
          transform: `translateY(-${num * 10}%)`,
          transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {DIGITS.map(d => (
          <span key={d} className="odometer-num">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

export default function OdometerCounter({ value = 0, className = '' }) {
  const formatted = useMemo(() => (
    typeof value === 'number' ? value.toLocaleString() : String(value || '0')
  ), [value]);

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums', display: 'inline-block' }}>
      {formatted}
    </span>
  );
}
