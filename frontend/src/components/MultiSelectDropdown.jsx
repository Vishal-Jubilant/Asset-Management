import React, { useState, useRef, useEffect } from 'react';
import { Filter, Check, ChevronDown } from 'lucide-react';

const MultiSelectDropdown = ({ options, selectedValues, onChange, label = "Filter" }) => {
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

  const toggleOption = (value) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const clearAll = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
          selectedValues.length > 0 
            ? 'bg-brand-50 border-brand-200 text-brand-700' 
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
        }`}
      >
        {label}
        {selectedValues.length > 0 && (
          <span className="flex items-center justify-center bg-brand-500 text-white text-xs font-bold w-5 h-5 rounded-full ml-1">
            {selectedValues.length}
          </span>
        )}
        <ChevronDown size={16} className={`ml-1 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-[100] mt-2 w-44 origin-top-right rounded-2xl bg-white shadow-xl border border-slate-200/60 focus:outline-none animate-in fade-in slide-in-from-top-2 p-2">
          <div className="p-1">
            <div className="flex justify-between items-center px-2 py-1.5 mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter by Role</span>
              {selectedValues.length > 0 && (
                <button onClick={clearAll} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                  Clear
                </button>
              )}
            </div>
            <div className="max-h-60 overflow-y-auto overscroll-contain space-y-1 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
              {options.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <label
                    key={option.value}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleOption(option.value);
                    }}
                    className="flex items-center px-2.5 py-2 hover:bg-slate-50 rounded-lg cursor-pointer group transition-colors"
                  >
                    <div className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${
                      isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 bg-white group-hover:border-brand-400'
                    }`}>
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span className={`ml-3 text-sm ${isSelected ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                      {option.label}
                    </span>
                  </label>
                );
              })}
              {options.length === 0 && (
                <div className="px-3 py-2 text-sm text-slate-500 text-center">No options available</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
