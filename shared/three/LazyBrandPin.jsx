import React, { Suspense, lazy } from 'react';

const AsyncThreePin = lazy(() => import('./ThreeBrandLogo'));

function StaticGoldPinFallback({ size = 82 }) {
  return (
    <span
      style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      aria-hidden="true"
    >
      <svg width={size * 0.72} height={size * 0.72} viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="lpPinGold" x1="12" y1="6" x2="52" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="45%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <path
          d="M32 6C19.85 6 10 15.85 10 28C10 42.5 32 58 32 58C32 58 54 42.5 54 28C54 15.85 44.15 6 32 6ZM32 36C27.58 36 24 32.42 24 28C24 23.58 27.58 20 32 20C36.42 20 40 23.58 40 28C40 32.42 36.42 36 32 36Z"
          fill="url(#lpPinGold)"
        />
        <circle cx="32" cy="28" r="5" fill="#0284c7" />
      </svg>
    </span>
  );
}

export default function LazyBrandPin(props) {
  return (
    <Suspense fallback={<StaticGoldPinFallback size={props.size || 82} />}>
      <AsyncThreePin {...props} />
    </Suspense>
  );
}
