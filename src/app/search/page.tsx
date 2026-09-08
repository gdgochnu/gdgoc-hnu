'use client';

import React, { useState, useEffect, useTransition, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { GlobalSearchResult, SearchEntityType } from '@/types';
import { performGlobalSearch } from '@/app/search/actions';
import {
  Search,
  CheckSquare,
  Users,
  Calendar,
  Briefcase,
  ArrowRight,
  Sparkles,
  X,
  Loader2,
  ExternalLink,
  Filter,
  Tag,
  Clock,
  ChevronRight,
} from 'lucide-react';

const ENTITY_CONFIG: Record<
  SearchEntityType,
  { label: string; singular: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  task: {
    label: 'Tasks',
    singular: 'Task',
    color: '#8ab4f8',
    bg: 'rgba(66, 133, 244, 0.12)',
    border: 'rgba(66, 133, 244, 0.3)',
    icon: <CheckSquare size={16} />,
  },
  member: {
    label: 'Members',
    singular: 'Member',
    color: '#81c995',
    bg: 'rgba(52, 168, 83, 0.12)',
    border: 'rgba(52, 168, 83, 0.3)',
    icon: <Users size={16} />,
  },
  event: {
    label: 'Events',
    singular: 'Event',
    color: '#fdd663',
    bg: 'rgba(251, 188, 5, 0.12)',
    border: 'rgba(251, 188, 5, 0.3)',
    icon: <Calendar size={16} />,
  },
  pr_contact: {
    label: 'PR Contacts',
    singular: 'PR Contact',
    color: '#d7aefb',
    bg: 'rgba(161, 66, 244, 0.12)',
    border: 'rgba(161, 66, 244, 0.3)',
    icon: <Briefcase size={16} />,
  },
};

const SUGGESTED_SEARCHES = [
  'General Meeting',
  'Frontend',
  'Sponsorship',
  'Orientation',
  'Workshop',
  'HR',
  'Design',
];

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get('q') || '';
  const initialType = (searchParams.get('type') as SearchEntityType | 'all') || 'all';

  const [inputQuery, setInputQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchEntityType | 'all'>(initialType);
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Sync state if URL searchParams change
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const t = (searchParams.get('type') as SearchEntityType | 'all') || 'all';
    setInputQuery(q);
    setActiveTab(t);
    if (q.trim().length >= 2) {
      executeSearch(q, t);
    } else {
      setResults([]);
    }
  }, [searchParams]);

  const executeSearch = async (queryText: string, typeFilter: SearchEntityType | 'all') => {
    if (!queryText || queryText.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await performGlobalSearch(queryText, {
        limit: 50,
        type: typeFilter,
      });

      if (res.success) {
        setResults(res.data);
      } else {
        setErrorMessage(res.error || 'Search encountered an issue');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error during search');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryChange = (val: string) => {
    setInputQuery(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val.trim()) {
      params.set('q', val);
    } else {
      params.delete('q');
    }
    startTransition(() => {
      router.replace(`/search?${params.toString()}`);
    });
  };

  const handleTabChange = (type: SearchEntityType | 'all') => {
    setActiveTab(type);
    const params = new URLSearchParams(searchParams.toString());
    if (type !== 'all') {
      params.set('type', type);
    } else {
      params.delete('type');
    }
    startTransition(() => {
      router.replace(`/search?${params.toString()}`);
    });
  };

  // Filter results client-side for immediate responsive tab switching if all results were fetched
  const filteredResults =
    activeTab === 'all'
      ? results
      : results.filter((item) => item.entity_type === activeTab);

  // Group counts
  const counts: Record<SearchEntityType | 'all', number> = {
    all: results.length,
    task: results.filter((r) => r.entity_type === 'task').length,
    member: results.filter((r) => r.entity_type === 'member').length,
    event: results.filter((r) => r.entity_type === 'event').length,
    pr_contact: results.filter((r) => r.entity_type === 'pr_contact').length,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '2rem',
        maxWidth: '1200px',
        margin: '0 auto',
        color: 'var(--text-primary, #FFFFFF)',
      }}
    >
      {/* Header Banner */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.2), rgba(161, 66, 244, 0.2))',
              border: '1px solid rgba(66, 133, 244, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--google-blue, #4285F4)',
            }}
          >
            <Search size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Global Search</h1>
            <p style={{ color: 'var(--text-secondary, #9AA0A6)', fontSize: '0.9rem', margin: 0 }}>
              Search across Tasks, Members, Events, and PR Contacts in GDGoC HNU OS
            </p>
          </div>
        </div>
      </div>

      {/* Main Search Input Box */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem',
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search
            size={22}
            style={{
              position: 'absolute',
              left: '1rem',
              color: 'var(--google-blue, #4285F4)',
              pointerEvents: 'none',
            }}
          />
          <input
            id="global-search-page-input"
            type="text"
            value={inputQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Type at least 2 characters to search across the entire workspace..."
            autoFocus
            style={{
              width: '100%',
              padding: '1rem 3rem 1rem 3.25rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              color: '#FFFFFF',
              fontSize: '1.05rem',
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
          />
          {isLoading ? (
            <Loader2
              size={20}
              className="animate-spin"
              style={{
                position: 'absolute',
                right: '1rem',
                color: 'var(--text-secondary, #9AA0A6)',
              }}
            />
          ) : inputQuery ? (
            <button
              onClick={() => handleQueryChange('')}
              style={{
                position: 'absolute',
                right: '1rem',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary, #9AA0A6)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Clear search"
            >
              <X size={20} />
            </button>
          ) : null}
        </div>

        {/* Suggested searches chips */}
        {!inputQuery && (
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #9AA0A6)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={14} color="#fdd663" /> Suggested:
            </span>
            {SUGGESTED_SEARCHES.map((tag) => (
              <button
                key={tag}
                onClick={() => handleQueryChange(tag)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '20px',
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary, #9AA0A6)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(66, 133, 244, 0.15)';
                  e.currentTarget.style.color = '#8ab4f8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = 'var(--text-secondary, #9AA0A6)';
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      {inputQuery.trim().length >= 2 && (
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            overflowX: 'auto',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            onClick={() => handleTabChange('all')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'all' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: activeTab === 'all' ? '#FFFFFF' : 'var(--text-secondary, #9AA0A6)',
              fontWeight: activeTab === 'all' ? 600 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span>All Results</span>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '10px',
                background: activeTab === 'all' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                color: activeTab === 'all' ? '#FFFFFF' : 'var(--text-secondary, #9AA0A6)',
              }}
            >
              {counts.all}
            </span>
          </button>

          {(Object.keys(ENTITY_CONFIG) as SearchEntityType[]).map((type) => {
            const config = ENTITY_CONFIG[type];
            const isActive = activeTab === type;
            return (
              <button
                key={type}
                onClick={() => handleTabChange(type)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive ? config.bg : 'transparent',
                  color: isActive ? config.color : 'var(--text-secondary, #9AA0A6)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {config.icon}
                <span>{config.label}</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                    color: isActive ? config.color : 'var(--text-secondary, #9AA0A6)',
                  }}
                >
                  {counts[type]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Results Header / Feedback */}
      {inputQuery.trim().length >= 2 && !isLoading && (
        <div style={{ marginBottom: '1.25rem', fontSize: '0.9rem', color: 'var(--text-secondary, #9AA0A6)' }}>
          Found {filteredResults.length} {filteredResults.length === 1 ? 'match' : 'matches'} for{' '}
          <strong style={{ color: '#FFFFFF' }}>"{inputQuery}"</strong>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '12px',
            background: 'rgba(234, 67, 53, 0.1)',
            border: '1px solid rgba(234, 67, 53, 0.3)',
            color: '#F28B82',
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Results List */}
      {filteredResults.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {filteredResults.map((item) => {
            const config = ENTITY_CONFIG[item.entity_type] || ENTITY_CONFIG.task;
            return (
              <Link
                key={`${item.entity_type}-${item.id}`}
                href={item.url}
                className="glass-panel"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.borderColor = config.border;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Left accent bar */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '3px',
                    background: config.color,
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1, minWidth: 0, paddingLeft: '0.5rem' }}>
                  {/* Entity Icon Container */}
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: config.bg,
                      border: `1px solid ${config.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: config.color,
                      flexShrink: 0,
                    }}
                  >
                    {config.icon}
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: config.bg,
                          color: config.color,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {config.singular}
                      </span>
                      <h2
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          margin: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.title}
                      </h2>
                    </div>

                    {item.subtitle && (
                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary, #9AA0A6)',
                          marginBottom: item.description ? '0.35rem' : 0,
                        }}
                      >
                        {item.subtitle}
                      </div>
                    )}

                    {item.description && (
                      <p
                        style={{
                          fontSize: '0.875rem',
                          color: 'rgba(255, 255, 255, 0.7)',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: '1.4',
                        }}
                      >
                        {item.description}
                      </p>
                    )}

                    {/* Metadata Chips if available */}
                    {item.metadata && Object.keys(item.metadata).length > 0 && (
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        {item.metadata.status && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'var(--text-secondary, #9AA0A6)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                            }}
                          >
                            Status: {item.metadata.status}
                          </span>
                        )}
                        {item.metadata.priority && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'var(--text-secondary, #9AA0A6)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                            }}
                          >
                            Priority: {item.metadata.priority}
                          </span>
                        )}
                        {item.metadata.stage && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'var(--text-secondary, #9AA0A6)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                            }}
                          >
                            Stage: {item.metadata.stage}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Arrow Icon */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: 'var(--text-secondary, #9AA0A6)',
                    fontSize: '0.85rem',
                    marginLeft: '1rem',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ display: 'none' }} className="sm-inline">
                    View
                  </span>
                  <ChevronRight size={18} />
                </div>
              </Link>
            );
          })}
        </div>
      ) : inputQuery.trim().length >= 2 && !isLoading ? (
        /* Empty State */
        <div
          className="glass-panel"
          style={{
            padding: '3.5rem 2rem',
            textAlign: 'center',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: 'var(--text-secondary, #9AA0A6)',
            }}
          >
            <Search size={28} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem', color: '#FFFFFF' }}>
            No results found for "{inputQuery}"
          </h2>
          <p
            style={{
              color: 'var(--text-secondary, #9AA0A6)',
              fontSize: '0.9rem',
              maxWidth: '480px',
              margin: '0 auto 1.5rem',
              lineHeight: '1.5',
            }}
          >
            {activeTab !== 'all'
              ? `We couldn't find any ${ENTITY_CONFIG[activeTab]?.label || 'matches'} matching your query. Try switching to "All Results" or refining your search term.`
              : 'Make sure your search terms are spelled correctly, or try searching for more general keywords.'}
          </p>
          {activeTab !== 'all' && (
            <button
              onClick={() => handleTabChange('all')}
              style={{
                background: 'rgba(66, 133, 244, 0.15)',
                border: '1px solid rgba(66, 133, 244, 0.3)',
                borderRadius: '8px',
                padding: '0.6rem 1.25rem',
                color: '#8ab4f8',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Show all categories
            </button>
          )}
        </div>
      ) : !inputQuery ? (
        /* Initial landing hint */
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            color: 'var(--text-secondary, #9AA0A6)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.1), rgba(52, 168, 83, 0.1))',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: '#8ab4f8',
            }}
          >
            <Sparkles size={32} />
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#FFFFFF', margin: '0 0 0.5rem' }}>
            Instant Workspace Discovery
          </h2>
          <p style={{ maxWidth: '500px', margin: '0 auto', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Search anything across the chapter: assigned tasks, team members, upcoming events, and external PR contacts. Press <kbd style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>Ctrl+K</kbd> anywhere to open quick search.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary, #9AA0A6)',
            gap: '0.75rem',
          }}
        >
          <Loader2 size={24} className="animate-spin" />
          <span>Loading Search Engine...</span>
        </div>
      }
    >
      <SearchResultsContent />
    </Suspense>
  );
}
