import React from 'react';
import { 
  Search, 
  User, 
  CircleDot, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  Plus, 
  Calendar 
} from 'lucide-react';

export function TasksSkeleton() {
  const columns = [
    { label: 'To Do', color: '#4285F4', icon: CircleDot },
    { label: 'In Progress', color: '#FBBC04', icon: Clock },
    { label: 'In Review', color: '#A855F7', icon: ShieldCheck },
    { label: 'Done', color: '#34A853', icon: CheckCircle2 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      {/* Top Filter & Action Bar - exact match */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search
              size={18}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <div
              className="input-field"
              style={{ paddingLeft: '2.5rem', height: '42px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}
            >
              <span style={{ opacity: 0.6 }}>Search tasks, descriptions, or assignees...</span>
            </div>
          </div>

          {/* Committee Filter */}
          <div className="input-field" style={{ height: '42px', minWidth: '180px', display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            All Committees
          </div>

          {/* Priority Filter */}
          <div className="input-field" style={{ height: '42px', minWidth: '130px', display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            All Priorities
          </div>

          {/* My Tasks Button */}
          <div
            style={{
              padding: '0.65rem 1.1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: 'var(--text-secondary)',
              fontSize: '0.86rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <User size={15} />
            <span>My Tasks</span>
          </div>
        </div>

        {/* Task Counter and Create Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="skeleton-pulse" style={{ height: '18px', width: '110px', borderRadius: '4px' }} />
          <div
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              fontSize: '0.88rem',
              fontWeight: 700,
              opacity: 0.8,
            }}
          >
            <Plus size={16} />
            <span>New Task</span>
          </div>
        </div>
      </div>

      {/* 4 Kanban Columns with exact colored top borders */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          alignItems: 'flex-start',
        }}
      >
        {columns.map((col, idx) => {
          const ColIcon = col.icon;
          return (
            <div
              key={idx}
              className="glass-panel"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                minHeight: '540px',
                background: 'rgba(19, 27, 46, 0.55)',
                borderTop: `3px solid ${col.color}`,
              }}
            >
              {/* Column Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <ColIcon size={18} color={col.color} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {col.label}
                  </h3>
                </div>

                <div
                  className="skeleton-pulse"
                  style={{
                    height: '22px',
                    width: '28px',
                    borderRadius: '999px',
                  }}
                />
              </div>

              {/* Task Cards in this column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', flex: 1 }}>
                {[1, 2].map((cardIdx) => (
                  <div
                    key={cardIdx}
                    className="glass-panel"
                    style={{
                      background: 'rgba(255, 255, 255, 0.035)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      position: 'relative',
                    }}
                  >
                    {/* Top Row: Committee & Priority */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="skeleton-pulse" style={{ height: '18px', width: '75px', borderRadius: '4px' }} />
                      <div className="skeleton-pulse" style={{ height: '18px', width: '55px', borderRadius: '4px' }} />
                    </div>

                    {/* Task Title lines */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div className="skeleton-pulse" style={{ height: '16px', width: '90%', borderRadius: '4px' }} />
                      <div className="skeleton-pulse" style={{ height: '16px', width: '60%', borderRadius: '4px' }} />
                    </div>

                    {/* Task Description */}
                    <div className="skeleton-pulse" style={{ height: '12px', width: '75%', borderRadius: '4px' }} />

                    {/* Card Footer: Assignee on left, Deadline on right */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', paddingTop: '0.65rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="skeleton-pulse" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                        <div className="skeleton-pulse" style={{ height: '12px', width: '70px', borderRadius: '4px' }} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={13} color="var(--text-muted)" />
                        <div className="skeleton-pulse" style={{ height: '12px', width: '55px', borderRadius: '4px' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
