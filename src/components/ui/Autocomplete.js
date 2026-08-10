import React, { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";

export function Autocomplete({ 
  value, 
  onChange, 
  onSelect, 
  options, 
  placeholder, 
  className,
  renderOption
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => {
    const text = typeof opt === 'string' ? opt : (opt.label || opt.name || opt.test_name || "");
    return text.toLowerCase().includes((value || "").toLowerCase());
  }).slice(0, 15);

  return (
    <div className="relative flex-1" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={className}
      />
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2">
          {filteredOptions.map((opt, idx) => (
            <div
              key={idx}
              className="px-4 py-2 hover:bg-[#0067A1]/5 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-50 dark:border-gray-700/50 last:border-0 transition-colors"
              onClick={() => {
                onSelect(opt);
                setIsOpen(false);
              }}
            >
              {renderOption ? renderOption(opt) : (
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {typeof opt === 'string' ? opt : (opt.label || opt.name || opt.test_name)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
