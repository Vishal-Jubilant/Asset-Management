import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

const CustomSelect = ({ options, value, onChange, name, placeholder = 'Select an option', disabled = false, required = false, isMulti = false, menuPlacement = 'bottom' }) => {
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

  const handleSelect = (optionValue) => {
    if (disabled) return;
    
    if (isMulti) {
      const currentValues = Array.isArray(value) ? value : [];
      let newValues;
      if (currentValues.includes(optionValue)) {
        newValues = currentValues.filter(v => v !== optionValue);
      } else {
        newValues = [...currentValues, optionValue];
      }
      onChange({ target: { name, value: newValues } });
    } else {
      onChange({ target: { name, value: optionValue } });
      setIsOpen(false);
    }
  };

  const removeValue = (e, optionValue) => {
    e.stopPropagation();
    if (disabled) return;
    const currentValues = Array.isArray(value) ? value : [];
    const newValues = currentValues.filter(v => v !== optionValue);
    onChange({ target: { name, value: newValues } });
  };

  const renderDisplay = () => {
    if (isMulti) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.length === 0) return <span className="text-slate-400">{placeholder}</span>;
      
      return (
        <div className="flex flex-wrap gap-1">
          {currentValues.map(val => {
            const opt = options.find(o => o.value === val);
            const label = opt ? opt.label : val;
            return (
              <span key={val} className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 text-[11px] font-semibold px-2 py-0.5 rounded border border-brand-100">
                {label}
                <button 
                  type="button" 
                  onClick={(e) => removeValue(e, val)}
                  className="hover:bg-brand-200/50 p-0.5 rounded-full transition-colors"
                >
                  <X size={10} />
                </button>
              </span>
            );
          })}
        </div>
      );
    } else {
      const selectedOption = options.find(opt => opt.value === value);
      return selectedOption ? selectedOption.label : <span className="text-slate-400">{placeholder}</span>;
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Hidden input to handle 'required' validation if wrapped in a form */}
      <input 
        type="text" 
        required={required && (!value || (isMulti && value.length === 0))} 
        value={isMulti ? (Array.isArray(value) ? value.join(',') : '') : value} 
        onChange={() => {}} 
        className="absolute opacity-0 pointer-events-none w-full h-full" 
        tabIndex={-1} 
      />
      
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-full cursor-pointer text-left transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 flex items-center justify-between min-h-[38px] ${
          disabled ? 'cursor-not-allowed bg-slate-50 border-slate-200 text-slate-500' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
        } border rounded-lg pl-3.5 pr-10 py-1.5 text-sm ${isOpen ? 'ring-2 ring-brand-500/20 border-brand-500 bg-white' : ''}`}
      >
        <span className="block truncate flex-1">
          {renderDisplay()}
        </span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-500' : ''}`} />
        </span>
      </button>

      {isOpen && !disabled && (
        <div className={`absolute z-[100] w-full max-h-60 overflow-auto rounded-md bg-white py-1 text-base shadow-lg border border-slate-200 focus:outline-none sm:text-sm animate-in fade-in zoom-in-95 duration-100 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 ${menuPlacement === 'top' ? 'bottom-full mb-1' : 'mt-1'}`}>
          <ul className="flex flex-col">
            {options.map((option) => {
              const isSelected = isMulti 
                ? (Array.isArray(value) && value.includes(option.value))
                : value === option.value;
                
              return (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`relative cursor-default select-none py-2 pl-3 pr-9 transition-all text-sm mx-1 my-0.5 rounded-md ${
                    isSelected 
                      ? 'bg-brand-50/80 text-brand-700 font-medium' 
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="block truncate">
                    {option.label}
                  </span>
                  {isSelected && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-brand-600">
                      <Check size={16} />
                    </span>
                  )}
                </li>
              );
            })}
            {options.length === 0 && (
              <li className="relative cursor-default select-none py-2 pl-3 pr-9 text-slate-500">
                No options available
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
