"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, Plus, Loader2 } from "lucide-react";

export function Autocomplete({ 
  value, 
  onChange, 
  onSelect, 
  options = [], 
  placeholder, 
  className,
  renderOption,
  preferredCategory = "",
  searchEndpoint = "",
  emptyActionLabel = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [remoteResults, setRemoteResults] = useState([]);
  const [isRemoteLoading, setIsRemoteLoading] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const query = (value || "").trim().toLowerCase();

  // Smart multi-field and semantic search & scoring
  const filteredOptions = useMemo(() => {
    const sourceList = Array.isArray(options) && options.length > 0 ? options : remoteResults;
    if (!sourceList || sourceList.length === 0) return [];

    const normPref = (preferredCategory || "").toLowerCase().trim();

    // If query is empty, show default/preferred items
    if (!query) {
      if (normPref) {
        const prefMatches = sourceList.filter(opt => {
          if (typeof opt === "string") return false;
          const cat = (opt.category || "").toLowerCase();
          const name = (opt.name || "").toLowerCase();
          if (normPref === "gel") {
            return cat === "gel" || cat === "ointment" || name.includes("gel") || name.includes("cream") || name.includes("ointment");
          }
          if (normPref === "syrup") {
            return cat === "syrup" || name.includes("syrup") || name.includes("syp") || name.includes("suspension");
          }
          if (normPref === "drops") {
            return cat === "drops" || name.includes("drop") || name.includes("spray");
          }
          if (normPref === "inhaler") {
            return cat === "inhaler" || name.includes("inhaler") || name.includes("respule");
          }
          if (normPref === "tablet") {
            return cat === "tablet" || cat === "capsule" || (!cat && !name.includes("syrup") && !name.includes("gel"));
          }
          return cat === normPref;
        });
        return (prefMatches.length > 0 ? prefMatches : sourceList).slice(0, 15);
      }
      return sourceList.slice(0, 15);
    }

    const queryTokens = query.split(/\s+/).filter(Boolean);

    const scored = [];

    for (let i = 0; i < sourceList.length; i++) {
      const opt = sourceList[i];
      const name = typeof opt === "string" ? opt : (opt.name || opt.label || opt.test_name || "");
      const cat = typeof opt === "string" ? "" : (opt.category || "");
      const salt = typeof opt === "string" ? "" : (opt.salt || "");
      const power = typeof opt === "string" ? "" : (opt.power || "");
      const desc = typeof opt === "string" ? "" : (opt.description || "");

      const nameLower = name.toLowerCase();
      const catLower = cat.toLowerCase();
      const saltLower = salt.toLowerCase();
      const powerLower = power.toLowerCase();
      const fullSearchText = `${nameLower} ${catLower} ${saltLower} ${powerLower} ${desc.toLowerCase()}`;

      // Check if all tokens are present somewhere in the combined record
      const allTokensMatch = queryTokens.every(tok => {
        // Direct match
        if (fullSearchText.includes(tok)) return true;
        // Semantic alias for "gel"
        if (tok === "gel" && (catLower === "gel" || catLower === "ointment" || nameLower.includes("cream") || nameLower.includes("ointment") || nameLower.includes("emulgel") || nameLower.includes("balm"))) {
          return true;
        }
        // Semantic alias for "syrup"
        if (tok === "syrup" && (catLower === "syrup" || nameLower.includes("suspension") || nameLower.includes("liquid") || nameLower.includes("syp"))) {
          return true;
        }
        // Semantic alias for "drops"
        if (tok === "drops" || tok === "drop") {
          return catLower === "drops" || nameLower.includes("drop") || nameLower.includes("spray");
        }
        return false;
      });

      if (!allTokensMatch) continue;

      let score = 0;

      // Exact name match
      if (nameLower === query) score += 120;
      // Name starts with query
      else if (nameLower.startsWith(query)) score += 90;
      // Name has word starting with query
      else if (new RegExp(`\\b${query}`, "i").test(nameLower)) score += 70;
      // Name contains query anywhere
      else if (nameLower.includes(query)) score += 50;

      // Boost if category equals or matches query
      if (catLower === query) score += 60;
      else if (catLower.includes(query)) score += 40;

      // Boost if active form / preferredCategory matches
      if (normPref) {
        if (normPref === "gel" && (catLower === "gel" || catLower === "ointment")) score += 35;
        else if (normPref === catLower) score += 35;
      }

      // Salt match
      if (saltLower.includes(query)) score += 30;

      // Token count bonus
      score += queryTokens.length * 5;

      scored.push({ opt, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 20).map(s => s.opt);
  }, [options, remoteResults, query, preferredCategory]);

  // Fallback remote search if options array is empty or yielded no results
  useEffect(() => {
    if (!query || query.length < 2) {
      setRemoteResults([]);
      setIsRemoteLoading(false);
      return;
    }

    // Only invoke remote search if local options are empty or failed to find matches
    if (options.length > 0 && filteredOptions.length > 0) {
      return;
    }

    const endpoint = searchEndpoint || "/api/admin/medicines";
    const timer = setTimeout(async () => {
      setIsRemoteLoading(true);
      try {
        const url = `${endpoint}${endpoint.includes("?") ? "&" : "?"}search=${encodeURIComponent(query)}&limit=20`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setRemoteResults(data.data.filter(d => d.is_active !== false));
        }
      } catch (err) {
        console.warn("Autocomplete remote search error:", err);
      } finally {
        setIsRemoteLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, options.length, filteredOptions.length, searchEndpoint]);

  const handleSelect = (item) => {
    onSelect(item);
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightIndex]);
      } else if (query) {
        // Custom selection on enter
        handleSelect({ name: value, category: preferredCategory || "General" });
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative flex-1" ref={wrapperRef}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightIndex(-1);
        }}
        onFocus={() => {
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        spellCheck="false"
      />

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-72 overflow-y-auto animate-in fade-in duration-100 divide-y divide-gray-100 dark:divide-gray-700/60">
          {/* Loading Indicator */}
          {isRemoteLoading && (
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0067A1]" />
              Searching medicines catalogue…
            </div>
          )}

          {/* Results List */}
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => {
              const isHighlighted = idx === highlightIndex;
              return (
                <div
                  key={idx}
                  className={`px-3.5 py-2 cursor-pointer transition-colors ${
                    isHighlighted 
                      ? "bg-[#0067A1]/10 dark:bg-gray-700 text-[#0067A1]" 
                      : "hover:bg-[#0067A1]/5 dark:hover:bg-gray-700/70"
                  }`}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onClick={() => handleSelect(opt)}
                >
                  {renderOption ? renderOption(opt) : (
                    <div className="text-sm font-bold text-black dark:text-white">
                      {typeof opt === 'string' ? opt : (opt.label || opt.name || opt.test_name)}
                    </div>
                  )}
                </div>
              );
            })
          ) : !isRemoteLoading && query ? (
            <div className="p-3 text-center space-y-2">
              <p className="text-xs font-medium text-gray-600">
                No catalog medicines matching &ldquo;<span className="font-bold text-black">{value}</span>&rdquo;
              </p>
              <button
                type="button"
                onClick={() => handleSelect({ name: value, category: preferredCategory || "General" })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0067A1] bg-[#0067A1]/10 hover:bg-[#0067A1]/20 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {emptyActionLabel || `Use "${value}" as medicine name`}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
