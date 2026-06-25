import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import AppleScrollPicker from './AppleScrollPicker';

const ApplePicker = ({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Select...', 
  className = '', 
  icon: Icon,
  buttonClassName = '',
  position = 'bottom',
  theme = 'dark'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  // Map options to string values for the scroll picker if needed, but AppleScrollPicker handles objects
  const columns = [
    { options, value, onChange, onItemClick: () => setIsOpen(false) }
  ];

  const isDark = theme === 'dark';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between border rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none transition-all text-left ${
          isDark 
            ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white focus:ring-2 focus:ring-[#D4AF37]/50 active:bg-white/20' 
            : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-800 shadow-sm focus:ring-2 focus:ring-blue-500'
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          {Icon && <Icon size={20} className={isDark ? "text-white/40 shrink-0" : "text-gray-400 shrink-0"} />}
          <span className={selectedOption ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-white/40' : 'text-gray-400')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown size={18} className={`${isDark ? 'text-white/30' : 'text-gray-400'} transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute z-[9999] p-2 ${
          isDark ? 'bg-[#111]/95 border-white/10 shadow-2xl' : 'bg-white border-gray-100 shadow-[0_16px_48px_rgba(0,0,0,0.1)]'
        } backdrop-blur-2xl border rounded-[24px] animate-in fade-in duration-150 flex flex-col min-w-[280px] w-full ${
          position === 'top' 
            ? 'bottom-full mb-2 origin-bottom slide-in-from-bottom-1' 
            : 'mt-2 origin-top slide-in-from-top-1'
        }`}>
          
          <AppleScrollPicker columns={columns} theme={theme} className="w-full" />
        </div>
      )}
    </div>
  );
};

export default ApplePicker;
