import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { searchModules, ModuleSynonym } from '../../utils/searchSynonyms';
import { useNavigate } from 'react-router-dom';

export interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  showSuggestions?: boolean;
  onModuleSelect?: (module: ModuleSynonym) => void;
}

export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, value, onChange, placeholder = 'Buscar...', onClear, showSuggestions = false, onModuleSelect, ...props }, ref) => {
    const [suggestions, setSuggestions] = useState<ModuleSynonym[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
      if (showSuggestions && value && String(value).trim().length >= 2) {
        const results = searchModules(String(value));
        setSuggestions(results);
        setShowDropdown(results.length > 0);
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, [value, showSuggestions]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setShowDropdown(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSuggestionClick = (module: ModuleSynonym) => {
      if (onModuleSelect) {
        onModuleSelect(module);
      } else {
        navigate(module.path);
      }
      setShowDropdown(false);
      setSuggestions([]);
    };

    return (
      <div className="flex-1 relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-accent-500 transition-colors z-10" />
        <input
          ref={ref}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => showSuggestions && value && setSuggestions(searchModules(String(value)))}
          className={cn(
            "w-full pl-10 pr-4 py-2.5 dark:bg-dark-card border border-gray-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all text-gray-900 dark:text-white text-sm",
            onClear && "pr-10",
            className
          )}
          {...props}
        />
        {onClear && value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {showDropdown && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto custom-scrollbar"
          >
            <div className="p-2">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2">
                Módulos sugeridos
              </p>
              {suggestions.map((module) => (
                <button
                  key={module.path}
                  onClick={() => handleSuggestionClick(module)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left group/btn"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white group-hover/btn:text-accent-500 transition-colors">
                      {module.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {module.keywords.slice(0, 3).join(', ')}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover/btn:text-accent-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';
