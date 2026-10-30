import React, { useRef, useEffect, useCallback } from 'react';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PADDING = ((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT;

const ScrollColumn = ({ options, value, onChange, onItemClick, isDark }) => {
  const ulRef = useRef(null);
  const currentIndexRef = useRef(0);
  const isSettlingRef = useRef(false);
  const touchStartY = useRef(null);
  const touchLastY = useRef(null);

  // Keep currentIndexRef in sync with value
  useEffect(() => {
    const idx = options.findIndex((o) => o.value === value);
    if (idx >= 0) currentIndexRef.current = idx;
  }, [value, options]);

  // Programmatically scroll to selected value
  useEffect(() => {
    if (!ulRef.current) return;
    const idx = options.findIndex((o) => o.value === value);
    if (idx >= 0) {
      ulRef.current.scrollTop = idx * ITEM_HEIGHT;
    }
  }, []); // only on mount

  const snapToIndex = useCallback((idx) => {
    const clamped = Math.max(0, Math.min(options.length - 1, idx));
    if (!ulRef.current) return;
    isSettlingRef.current = true;
    ulRef.current.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: 'smooth' });
    currentIndexRef.current = clamped;
    const newVal = options[clamped].value;
    if (newVal !== value) onChange(newVal);
    setTimeout(() => { isSettlingRef.current = false; }, 350);
  }, [options, value, onChange]);

  // Wheel: step exactly one item per wheel tick
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSettlingRef.current) return;
    const direction = e.deltaY > 0 ? 1 : -1;
    snapToIndex(currentIndexRef.current + direction);
  }, [snapToIndex]);

  // Touch: step one item per ~ITEM_HEIGHT of swipe
  const handleTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
    touchLastY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    if (!touchLastY.current || isSettlingRef.current) return;
    const delta = touchLastY.current - e.touches[0].clientY;
    if (Math.abs(delta) >= ITEM_HEIGHT) {
      const steps = Math.round(delta / ITEM_HEIGHT);
      touchLastY.current = e.touches[0].clientY;
      snapToIndex(currentIndexRef.current + steps);
    }
  }, [snapToIndex]);

  const handleTouchEnd = useCallback(() => {
    touchStartY.current = null;
    touchLastY.current = null;
  }, []);

  // Attach wheel listener as non-passive so preventDefault works
  useEffect(() => {
    const el = ulRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div
      className="flex-1 relative overflow-hidden"
      style={{ height: `${CONTAINER_HEIGHT}px` }}
    >
      <ul
        ref={ulRef}
        className={`no-scrollbar absolute inset-0 overflow-y-scroll outline-none min-w-[60px] ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}
        style={{
          paddingTop: `${PADDING}px`,
          paddingBottom: `${PADDING}px`,
          scrollSnapType: 'none', // we handle snapping manually for one-by-one control
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <li
              key={opt.value}
              className={`flex items-center justify-center text-center font-medium cursor-pointer px-2 select-none transition-all duration-200 ${
                isSelected
                  ? isDark
                    ? 'text-[#D4AF37] font-bold text-[17px] opacity-100 scale-105'
                    : 'text-blue-600 font-bold text-[17px] opacity-100 scale-105'
                  : isDark
                    ? 'text-white opacity-50 text-[14px] hover:opacity-70'
                    : 'text-gray-700 opacity-45 text-[14px] hover:opacity-65'
              }`}
              style={{ height: `${ITEM_HEIGHT}px` }}
              onClick={() => {
                const idx = options.findIndex((o) => o.value === opt.value);
                snapToIndex(idx);
                if (onItemClick) onItemClick(opt.value);
              }}
            >
              <span className="truncate leading-none">{opt.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const AppleScrollPicker = ({ columns = [], theme = 'dark', className = '' }) => {
  const isDark = theme === 'dark';

  return (
    <div
      className={`relative flex w-full overflow-hidden rounded-xl ${className}`}
      style={{ height: `${CONTAINER_HEIGHT}px` }}
    >
      {/* Selection highlight bar */}
      <div
        className="absolute left-2 right-2 top-1/2 -translate-y-1/2 z-0 pointer-events-none rounded-lg"
        style={{ height: `${ITEM_HEIGHT}px` }}
      >
        <div className={`w-full h-full rounded-lg ${
          isDark ? 'bg-white/[0.06] border-y border-white/10' : 'bg-gray-100 border-y border-gray-200'
        }`} />
      </div>

      {/* Top & bottom fade masks */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: isDark
            ? 'linear-gradient(to bottom, #111 0%, transparent 30%, transparent 70%, #111 100%)'
            : 'linear-gradient(to bottom, #fff 0%, transparent 30%, transparent 70%, #fff 100%)',
        }}
      />

      {/* Columns */}
      <div className="relative z-20 flex w-full">
        {columns.map((col, i) => (
          <ScrollColumn
            key={i}
            options={col.options}
            value={col.value}
            onChange={col.onChange}
            onItemClick={col.onItemClick}
            isDark={isDark}
          />
        ))}
      </div>
    </div>
  );
};

export default AppleScrollPicker;
