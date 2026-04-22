import { useSearch } from "../../context/SearchContext";
import { useProducts } from "../../context/ProductContext";
import { useEffect, useState, useRef, useCallback } from "react";

export default function SearchBar() {
  const { query, setQuery, setResults } = useSearch();
  const { products } = useProducts();

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // ── Filter results + build suggestions from in-memory products ──
  useEffect(() => {
    const q = query?.trim().toLowerCase();

    if (!q) {
      setResults([]);
      setSuggestions([]);
      setActiveSuggestion(-1);
      return;
    }

    const filtered = products.filter((product) =>
      Object.values(product).some((value) =>
        String(value).toLowerCase().includes(q)
      )
    );

    setResults(filtered);

    // Suggestions = unique matching product names
    const names = [];
    const seen = new Set();
    for (const p of products) {
      if (p.name?.toLowerCase().includes(q) && !seen.has(p.name)) {
        seen.add(p.name);
        names.push(p.name);
      }
    }
    setSuggestions(names);
    setActiveSuggestion(-1);
  }, [query, products]);

  // ── Close suggestions on outside click ──
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (name) => {
      setQuery(name);
      setShowSuggestions(false);
      setActiveSuggestion(-1);
      inputRef.current?.blur();
    },
    [setQuery]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
    inputRef.current?.focus();
  }, [setQuery, setResults]);

  // ── Keyboard navigation ──
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter" && activeSuggestion >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeSuggestion]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveSuggestion(-1);
    }
  };

  // Highlight matching part of suggestion
  const highlightMatch = (text, query) => {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-bold text-blue-600">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  const isOpen = showSuggestions && suggestions.length > 0 && query?.trim();

  return (
    <div ref={wrapperRef} className="relative w-full md:mr-4">

      {/* Input */}
      <div className="relative">
        {/* Search icon */}
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          width="15" height="15" viewBox="0 0 20 20" fill="none"
        >
          <path
            d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          />
        </svg>

        <input
          ref={inputRef}
          type="text"
          placeholder="Search products..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            if (query?.trim()) setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full pl-10 pr-10 py-2 text-sm border border-gray-200 bg-gray-50
            focus:bg-white focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10
            outline-none transition-all
            ${isOpen ? "rounded-t-2xl rounded-b-none border-b-transparent" : "rounded-full"}`}
        />

        {/* Clear button */}
        {query?.trim() && (
          <button
            onClick={handleClear}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center
              justify-center rounded-full bg-gray-300 hover:bg-gray-400 text-white transition"
          >
            <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Suggestions dropdown */} 
      {isOpen && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 border-t-0
            rounded-b-2xl shadow-lg overflow-hidden max-h-72 overflow-y-auto"
          >

          {suggestions.map((name, idx) => (
            <li key={name}>
              <button
                onMouseDown={(e) => e.preventDefault()} // prevent input blur before click
                onClick={() => handleSelect(name)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition
                  ${activeSuggestion === idx
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                  }`}
              >
                {/* Search icon per row */}
                <svg className="text-gray-300 flex-shrink-0" width="12" height="12"
                  viewBox="0 0 20 20" fill="none">
                  <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <span className="truncate">
                  {highlightMatch(name, query)}
                </span>
              </button>
            </li>
          ))}

          {/* Subtle footer showing total result count */}
          <li className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <p className="text-[11px] text-gray-400">
              {products.filter((p) =>
                Object.values(p).some((v) =>
                  String(v).toLowerCase().includes(query.toLowerCase())
                )
              ).length} result{products.filter((p) =>
                Object.values(p).some((v) =>
                  String(v).toLowerCase().includes(query.toLowerCase())
                )
              ).length !== 1 ? "s" : ""} found
            </p>
          </li>
        </ul>
      )}
    </div>
  );
}