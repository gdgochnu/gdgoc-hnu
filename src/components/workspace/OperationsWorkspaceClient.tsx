'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  MapPin,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  Sparkles,
  ChevronRight,
  Plus,
  BarChart3,
  Layers,
  AlertCircle,
  Check,
} from 'lucide-react';

interface EventOpsSummary {
  id: string;
  title: string;
  slug: string | null;
  event_date: string | null;
  status: string;
  venue: string | null;
  stats: {
    total: number;
    completed: number;
    percentage: number;
    before: { total: number; completed: number };
    during: { total: number; completed: number };
    after: { total: number; completed: number };
  };
}

interface OperationsWorkspaceClientProps {
  initialEvents: EventOpsSummary[];
  overallStats: {
    totalEvents: number;
    totalTasks: number;
    totalCompleted: number;
    percentage: number;
  };
  canManage: boolean;
}

export function OperationsWorkspaceClient({
  initialEvents,
  overallStats,
  canManage,
}: OperationsWorkspaceClientProps) {
  const [events, setEvents] = useState<EventOpsSummary[]>(initialEvents);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter events
  const filteredEvents = events.filter((evt) => {
    const matchSearch =
      !searchQuery.trim() ||
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (evt.venue && evt.venue.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchStatus = statusFilter === 'all' || evt.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Calculate phase-wide totals
  const totalBefore = events.reduce((sum, e) => sum + e.stats.before.total, 0);
  const compBefore = events.reduce((sum, e) => sum + e.stats.before.completed, 0);

  const totalDuring = events.reduce((sum, e) => sum + e.stats.during.total, 0);
  const compDuring = events.reduce((sum, e) => sum + e.stats.during.completed, 0);

  const totalAfter = events.reduce((sum, e) => sum + e.stats.after.total, 0);
  const compAfter = events.reduce((sum, e) => sum + e.stats.after.completed, 0);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(251, 188, 4, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(251, 188, 4, 0.3)',
              }}
            >
              <ClipboardList size={22} color="#FBBC04" />
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0 }}>
              Operations Command Center
            </h1>
          </div>
          <p style={{ margin: '0.4rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Unified on-ground logistical control across all chapter events (Before, During & After checklists)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
          <Link
            href="/events"
            className="btn-secondary"
            style={{
              padding: '0.55rem 1rem',
              fontSize: '0.85rem',
              borderRadius: '9px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Calendar size={15} /> View Events List
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {/* Total Events */}
        <div className="glass-panel" style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Events Tracked
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {events.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {overallStats.totalTasks} total operations checklist tasks logged
          </div>
        </div>

        {/* Overall Completion */}
        <div className="glass-panel" style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Overall Readiness
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#34A853' }}>
              {overallStats.percentage}%
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34A853' }}>
            {overallStats.totalCompleted} / {overallStats.totalTasks}
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${overallStats.percentage}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #4285F4, #34A853)',
              }}
            />
          </div>
        </div>

        {/* Before Phase */}
        <div className="glass-panel" style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#8ab4f8', fontWeight: 700, textTransform: 'uppercase' }}>
            1. Before (Pre-Event Prep)
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#8ab4f8' }}>
            {compBefore} / {totalBefore}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {totalBefore > 0 ? Math.round((compBefore / totalBefore) * 100) : 0}% pre-event tasks cleared
          </div>
        </div>

        {/* During & After */}
        <div className="glass-panel" style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#FBBC04', fontWeight: 700, textTransform: 'uppercase' }}>
            2. During & 3. After Phases
          </span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>During: </span>
              <strong style={{ fontSize: '1.1rem', color: '#FBBC04' }}>{compDuring}/{totalDuring}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>After: </span>
              <strong style={{ fontSize: '1.1rem', color: '#34A853' }}>{compAfter}/{totalAfter}</strong>
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Execution & teardown readiness across events
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel" style={{ padding: '1rem 1.4rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '340px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            id="ops-search-input"
            type="text"
            placeholder="Search events or venues…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '36px',
              paddingRight: '12px',
              paddingTop: '0.55rem',
              paddingBottom: '0.55rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '9px',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>

        <Filter size={15} color="var(--text-muted)" />

        {/* Status Filter */}
        <select
          id="ops-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ minWidth: '160px' }}
        >
          <option value="all">All Event Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="completed">Completed</option>
          <option value="closed">Registration Closed</option>
        </select>

        <div style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Showing <strong>{filteredEvents.length}</strong> of {events.length} events
        </div>
      </div>

      {/* Events Operations Grid */}
      {filteredEvents.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <ClipboardList size={42} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.35rem' }}>No events found</div>
          <div style={{ fontSize: '0.85rem' }}>Try adjusting your search query or status filter.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.4rem' }}>
          {filteredEvents.map((evt) => {
            const hasTasks = evt.stats.total > 0;
            const linkHref = `/events/${evt.id}`;

            return (
              <div
                key={evt.id}
                className="glass-panel"
                style={{
                  padding: '1.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
              >
                {/* Event Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      href={linkHref}
                      style={{
                        textDecoration: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={evt.title}
                    >
                      {evt.title}
                    </Link>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                      {evt.event_date && (
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={12} /> {new Date(evt.event_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                      {evt.venue && (
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <MapPin size={12} color="var(--google-red)" /> {evt.venue}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      background: evt.status === 'published' ? 'rgba(52, 168, 83, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                      color: evt.status === 'published' ? '#4ade80' : 'var(--text-muted)',
                      border: `1px solid ${evt.status === 'published' ? 'rgba(52, 168, 83, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                    }}
                  >
                    {evt.status}
                  </span>
                </div>

                {/* Operations Readiness Progress */}
                <div style={{ background: 'rgba(0, 0, 0, 0.25)', borderRadius: '10px', padding: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Operations Checklist Readiness
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: evt.stats.percentage === 100 ? '#34A853' : '#8ab4f8' }}>
                      {evt.stats.percentage}%
                    </span>
                  </div>

                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${evt.stats.percentage}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #4285F4, #34A853)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  {/* Segment mini counters */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.6rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>
                      <strong style={{ color: '#8ab4f8' }}>Before:</strong> {evt.stats.before.completed}/{evt.stats.before.total}
                    </span>
                    <span>
                      <strong style={{ color: '#FBBC04' }}>During:</strong> {evt.stats.during.completed}/{evt.stats.during.total}
                    </span>
                    <span>
                      <strong style={{ color: '#34A853' }}>After:</strong> {evt.stats.after.completed}/{evt.stats.after.total}
                    </span>
                  </div>
                </div>

                {/* Footer Action */}
                <div style={{ marginTop: 'auto', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {hasTasks ? `${evt.stats.completed} of ${evt.stats.total} tasks completed` : 'No operations tasks yet'}
                  </span>

                  <Link
                    href={`${linkHref}#event-operations-checklist-section`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#8ab4f8',
                      textDecoration: 'none',
                    }}
                  >
                    <span>Manage Checklist</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
