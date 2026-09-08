'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GlobalSearchResult, SearchEntityType } from '@/types';
import { performGlobalSearch } from '@/app/search/actions';
import {
  Search,
  Command,
  Loader2,
  X,
  CheckSquare,
  Users,
  Calendar,
  Briefcase,
  ArrowRight,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const ENTITY_CONFIG: Record<
  SearchEntityType,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  task: {
    label: 'Task',
    color: '#8ab4f8',
    bg: 'rgba(66, 133, 244, 0.15)',
    icon: <CheckSquare size={14} />,
  },
  member: {
    label: 'Member',
    color: '#81c995',
    bg: 'rgba(52, 168, 83, 0.15)',
    icon: <Users size={14} />,
  },
  event: {
    label: 'Event',
    color: '#fdd663',
    bg: 'rgba(251, 188, 5, 0.15)',
    icon: <Calendar size={14} />,
  },
  pr_contact: {
    label: 'PR Contact',
    color: '#d7aefb',
    bg: 'rgba(161, 66, 244, 0.15)',
    icon: <Briefcase size={14} />,
  },
};

export function GlobalSearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global hotkey: Cmd+K or Ctrl+K or '/' focuses the search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to dismiss dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await performGlobalSearch(query, { limit: 6 });
        if (res.success) {
          setResults(res.data);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSelectResult = (result: GlobalSearchResult) => {
    setIsOpen(false);
    setQuery('');
    router.push(result.url);
  };

  return (
    <div
      ref={searchRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '380px',
      }}
    >
      <form onSubmit={handleSubmit} style={{ position: 'relative', width: '100%' }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: '0.85rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9aa0a6',
            pointerEvents: 'none',
          }}
        />

        <input
          ref={inputRef}
          type="text"
          placeholder="Search everything... (⌘K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen && e.target.value.trim().length >= 2) setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          style={{
            width: '100%',
            padding: '0.45rem 2.2rem 0.45rem 2.3rem',
            borderRadius: '0.65rem',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: isOpen
              ? '1px solid var(--google-blue, #4285F4)'
              : '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
            fontSize: '0.85rem',
            outline: 'none',
            transition: 'all 0.15s ease',
          }}
        />

        {/* Right action inside input: Spinner or Clear or Shortcut badge */}
        <div
          style={{
            position: 'absolute',
            right: '0.6rem',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          {isLoading ? (
            <Loader2 size={14} className="animate-spin" color="#9aa0a6" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setIsOpen(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#9aa0a6',
                cursor: 'pointer',
                padding: '0.15rem',
                display: 'flex',
              }}
            >
              <X size={14} />
            </button>
          ) : (
            <kbd
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.15rem',
                padding: '0.1rem 0.35rem',
                borderRadius: '0.3rem',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#9aa0a6',
                fontSize: '0.65rem',
                fontWeight: 600,
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <span>⌘K</span>
            </kbd>
          )}
        </div>
      </form>

      {/* Instant Dropdown Preview */}
      {isOpen && query.trim().length >= 2 && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            left: 0,
            right: 0,
            backgroundColor: 'var(--bg-card, #13151b)',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
            borderRadius: '0.85rem',
            boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.6)',
            padding: '0.5rem',
            zIndex: 999,
            maxHeight: '400px',
            overflowY: 'auto',
          }}
        >
          {results.length === 0 && !isLoading ? (
            <div
              style={{
                padding: '1.25rem 1rem',
                textAlign: 'center',
                color: '#9aa0a6',
                fontSize: '0.82rem',
              }}
            >
              <div>No direct matches found for "{query}"</div>
              <button
                onClick={handleSubmit}
                style={{
                  marginTop: '0.5rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--google-blue, #4285F4)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <span>View search results page</span>
                <ArrowRight size={13} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div
                style={{
                  padding: '0.35rem 0.6rem',
                  fontSize: '0.72rem',
                  color: '#9aa0a6',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Top Results
              </div>

              {results.map((item) => {
                const entityCfg = ENTITY_CONFIG[item.entity_type] || ENTITY_CONFIG.task;

                return (
                  <button
                    key={`${item.entity_type}-${item.id}`}
                    onClick={() => handleSelectResult(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.55rem 0.65rem',
                      borderRadius: '0.55rem',
                      border: 'none',
                      backgroundColor: 'transparent',
                      textAlign: 'left',
                      width: '100%',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Entity Icon badge */}
                    <div
                      style={{
                        width: '1.75rem',
                        height: '1.75rem',
                        borderRadius: '0.45rem',
                        backgroundColor: entityCfg.bg,
                        color: entityCfg.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {entityCfg.icon}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: '#fff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.73rem',
                          color: '#9aa0a6',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.subtitle}
                      </div>
                    </div>

                    <ChevronRight size={14} color="#5f6368" />
                  </button>
                );
              })}

              {/* View all results footer */}
              <button
                onClick={handleSubmit}
                style={{
                  marginTop: '0.35rem',
                  padding: '0.55rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: 'rgba(66, 133, 244, 0.08)',
                  color: 'var(--google-blue, #4285F4)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>View all results for "{query}"</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
