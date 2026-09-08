'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Filter,
  Eye,
  CheckCircle2,
  Circle,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { Event, EventStatus } from '@/types';

interface ContentCalendarClientProps {
  events: Event[];
  currentUserRole: string;
  departments: { id: string; name: string; code: string; branch: string }[];
}

const STATUS_CONFIG: Record<EventStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  draft:                    { label: 'Draft',           color: '#9AA0A6', bg: 'rgba(154,160,166,0.12)', border: 'rgba(154,160,166,0.3)',  dot: '#9AA0A6' },
  submitted_for_review:     { label: 'Under Review',   color: '#FBBC04', bg: 'rgba(251,188,4,0.12)',   border: 'rgba(251,188,4,0.35)',   dot: '#FBBC04' },
  branch_review:            { label: 'Branch Review',  color: '#FBBC04', bg: 'rgba(251,188,4,0.12)',   border: 'rgba(251,188,4,0.35)',   dot: '#FBBC04' },
  pending_final_approval:   { label: 'Final Approval', color: '#F97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.35)',  dot: '#F97316' },
  approved:                 { label: 'Approved',        color: '#8ab4f8', bg: 'rgba(66,133,244,0.12)', border: 'rgba(66,133,244,0.35)',  dot: '#8ab4f8' },
  published:                { label: 'Published',       color: '#81c995', bg: 'rgba(52,168,83,0.12)',  border: 'rgba(52,168,83,0.35)',   dot: '#34A853' },
  closed:                   { label: 'Closed',          color: '#C084FC', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.35)',  dot: '#C084FC' },
  completed:                { label: 'Completed',       color: '#34A853', bg: 'rgba(52,168,83,0.18)',  border: 'rgba(52,168,83,0.5)',    dot: '#34A853' },
  rejected:                 { label: 'Rejected',        color: '#EA4335', bg: 'rgba(234,67,53,0.12)',  border: 'rgba(234,67,53,0.35)',   dot: '#EA4335' },
};

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  // Prev month tail
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  // Next month head
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push({ date: new Date(year, month + 1, d), isCurrentMonth: false });
  }
  return days;
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function ContentCalendarClient({ events, currentUserRole, departments }: ContentCalendarClientProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [view, setView] = useState<'month' | 'list'>('month');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const isLeadership = ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'].includes(currentUserRole);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (filterStatus !== 'all' && e.status !== filterStatus) return false;
      if (filterDept !== 'all' && e.department_id !== filterDept) return false;
      return true;
    });
  }, [events, filterStatus, filterDept]);

  // Group events by date key
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const ev of filteredEvents) {
      const key = ev.event_date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [filteredEvents]);

  const calDays = useMemo(() => getCalendarDays(year, month), [year, month]);
  const todayKey = toDateKey(today);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // For list view: events in the current month sorted by date
  const monthEvents = useMemo(() => {
    return filteredEvents
      .filter((e) => {
        const d = new Date(e.event_date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .sort((a, b) => a.event_date.localeCompare(b.event_date));
  }, [filteredEvents, year, month]);

  const selectedDayEvents = selectedDay ? (eventsByDate.get(selectedDay) || []) : [];

  return (
    <div style={{ padding: '2rem', maxWidth: '1300px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Calendar size={24} color="#8ab4f8" />
            Content Calendar
          </h1>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Visual overview of all chapter events and workshops
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* View Toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
            {(['month', 'list'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '0.45rem 1rem',
                  background: view === v ? 'rgba(66,133,244,0.2)' : 'transparent',
                  border: 'none',
                  color: view === v ? '#8ab4f8' : 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  fontWeight: view === v ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {v === 'month' ? '📅 Month' : '📋 List'}
              </button>
            ))}
          </div>

          {isLeadership && (
            <Link
              href="/events"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                background: 'var(--google-blue)', color: '#fff',
                padding: '0.5rem 1rem', borderRadius: '9px',
                fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none',
              }}
            >
              <Plus size={15} /> New Event
            </Link>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <Filter size={15} color="var(--text-muted)" />
        <select
          id="calendar-status-filter"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '7px', color: 'var(--text-primary)', padding: '0.35rem 0.65rem', fontSize: '0.82rem', cursor: 'pointer' }}
        >
          <option value="all">All Statuses</option>
          {(Object.keys(STATUS_CONFIG) as EventStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>

        <select
          id="calendar-dept-filter"
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '7px', color: 'var(--text-primary)', padding: '0.35rem 0.65rem', fontSize: '0.82rem', cursor: 'pointer' }}
        >
          <option value="all">All Committees</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Zap size={12} style={{ display: 'inline', marginRight: '4px' }} color="var(--google-yellow)" />
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Month Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          id="calendar-prev-month"
          onClick={prevMonth}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.4rem 0.7rem', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}
        >
          <ChevronLeft size={18} />
        </button>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, minWidth: '200px', textAlign: 'center' }}>
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          id="calendar-next-month"
          onClick={nextMonth}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.4rem 0.7rem', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}
        >
          <ChevronRight size={18} />
        </button>
        <button
          onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
          style={{ background: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.3)', borderRadius: '8px', padding: '0.4rem 0.85rem', cursor: 'pointer', color: '#8ab4f8', fontSize: '0.8rem', fontWeight: 600 }}
        >
          Today
        </button>
      </div>

      {/* ---- MONTH VIEW ---- */}
      {view === 'month' && (
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {/* Calendar Grid */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Day Headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
              {DAY_NAMES.map((d) => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0.4rem 0', letterSpacing: '0.06em' }}>{d}</div>
              ))}
            </div>

            {/* Day Cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
              {calDays.map(({ date, isCurrentMonth }, idx) => {
                const key = toDateKey(date);
                const dayEvents = eventsByDate.get(key) || [];
                const isToday = key === todayKey;
                const isSelected = key === selectedDay;
                const MAX_VISIBLE = 2;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDay(isSelected ? null : key)}
                    style={{
                      minHeight: '90px',
                      padding: '6px',
                      borderRadius: '10px',
                      background: isSelected
                        ? 'rgba(66,133,244,0.15)'
                        : isToday
                          ? 'rgba(66,133,244,0.08)'
                          : 'rgba(255,255,255,0.02)',
                      border: isSelected
                        ? '1px solid rgba(66,133,244,0.5)'
                        : isToday
                          ? '1px solid rgba(66,133,244,0.3)'
                          : '1px solid rgba(255,255,255,0.05)',
                      cursor: dayEvents.length > 0 ? 'pointer' : 'default',
                      transition: 'all 0.15s',
                      opacity: isCurrentMonth ? 1 : 0.35,
                    }}
                  >
                    <div style={{
                      fontSize: '0.82rem',
                      fontWeight: isToday ? 800 : 600,
                      color: isToday ? '#8ab4f8' : 'var(--text-primary)',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <span style={isToday ? {
                        background: '#4285F4',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                      } : {}}>
                        {date.getDate()}
                      </span>
                      {dayEvents.length > 0 && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>{dayEvents.length}</span>
                      )}
                    </div>

                    {/* Event pills */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {dayEvents.slice(0, MAX_VISIBLE).map((ev) => {
                        const cfg = STATUS_CONFIG[ev.status] || STATUS_CONFIG.draft;
                        return (
                          <Link
                            key={ev.id}
                            href={`/events/${ev.slug}`}
                            onClick={(e) => e.stopPropagation()}
                            title={ev.title}
                            style={{
                              display: 'block',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              padding: '2px 5px',
                              borderRadius: '4px',
                              background: cfg.bg,
                              color: cfg.color,
                              border: `1px solid ${cfg.border}`,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              textDecoration: 'none',
                              lineHeight: '1.4',
                            }}
                          >
                            {ev.title}
                          </Link>
                        );
                      })}
                      {dayEvents.length > MAX_VISIBLE && (
                        <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)', fontWeight: 600, paddingLeft: '3px' }}>
                          +{dayEvents.length - MAX_VISIBLE} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day Detail Panel */}
          {selectedDay && (
            <div
              className="glass-panel"
              style={{ width: '280px', flexShrink: 0, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignSelf: 'flex-start', position: 'sticky', top: '80px' }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Selected Day</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.2rem' }}>
                  {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <Calendar size={28} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <div>No events on this day</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedDayEvents.map((ev) => {
                    const cfg = STATUS_CONFIG[ev.status] || STATUS_CONFIG.draft;
                    return (
                      <div
                        key={ev.id}
                        style={{
                          padding: '0.9rem',
                          borderRadius: '10px',
                          background: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{ev.title}</span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {cfg.label}
                          </span>
                        </div>
                        {ev.venue && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                            <MapPin size={11} /> {ev.venue}
                          </div>
                        )}
                        {ev.start_time && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                            <Clock size={11} /> {ev.start_time}{ev.end_time ? ` – ${ev.end_time}` : ''}
                          </div>
                        )}
                        {ev.department?.name && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                            <Users size={11} /> {ev.department.name}
                          </div>
                        )}
                        <Link
                          href={`/events/${ev.slug}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#8ab4f8', fontWeight: 600, textDecoration: 'none' }}
                        >
                          <Eye size={12} /> View Details
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---- LIST VIEW ---- */}
      {view === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {monthEvents.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Calendar size={40} style={{ opacity: 0.25, marginBottom: '1rem' }} />
              <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No events in {MONTH_NAMES[month]} {year}</div>
              {isLeadership && (
                <Link href="/events" style={{ color: '#8ab4f8', fontSize: '0.875rem', fontWeight: 600 }}>
                  + Create a new event
                </Link>
              )}
            </div>
          ) : (
            monthEvents.map((ev) => {
              const cfg = STATUS_CONFIG[ev.status] || STATUS_CONFIG.draft;
              const evDate = new Date(ev.event_date + 'T12:00:00');
              const isPast = evDate < today;
              return (
                <Link
                  key={ev.id}
                  href={`/events/${ev.slug}`}
                  className="glass-panel"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    padding: '1rem 1.25rem',
                    textDecoration: 'none',
                    color: 'inherit',
                    opacity: isPast && ev.status !== 'completed' ? 0.6 : 1,
                    transition: 'all 0.15s',
                    borderLeft: `3px solid ${cfg.dot}`,
                  }}
                >
                  {/* Date Block */}
                  <div style={{ flexShrink: 0, textAlign: 'center', width: '52px' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{evDate.getDate()}</div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{MONTH_NAMES[evDate.getMonth()].slice(0, 3)}</div>
                  </div>

                  {/* Status icon */}
                  <div style={{ flexShrink: 0 }}>
                    {ev.status === 'completed' ? <CheckCircle2 size={18} color="#34A853" /> :
                     ev.status === 'rejected' ? <AlertCircle size={18} color="#EA4335" /> :
                     ev.status === 'published' ? <CheckCircle2 size={18} color="#8ab4f8" /> :
                     <Circle size={18} color="var(--text-muted)" />}
                  </div>

                  {/* Title & Meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      {ev.venue && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <MapPin size={11} /> {ev.venue}
                        </span>
                      )}
                      {ev.start_time && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <Clock size={11} /> {ev.start_time}
                        </span>
                      )}
                      {ev.department?.name && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <Users size={11} /> {ev.department.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span style={{ flexShrink: 0, fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '10px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                    {cfg.label}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* Status Legend */}
      <div className="glass-panel" style={{ padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legend:</span>
        {(Object.entries(STATUS_CONFIG) as [EventStatus, typeof STATUS_CONFIG[EventStatus]][]).map(([s, cfg]) => (
          <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: cfg.color }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cfg.dot, display: 'inline-block', flexShrink: 0 }} />
            {cfg.label}
          </span>
        ))}
      </div>

    </div>
  );
}
