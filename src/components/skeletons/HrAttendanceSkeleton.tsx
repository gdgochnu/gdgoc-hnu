import React from 'react';
import { 
  Users, 
  Calendar, 
  AlertTriangle, 
  Award, 
  CheckCircle2 
} from 'lucide-react';

export function HrAttendanceSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      {/* 4 KPI Cards - exact match */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {/* KPI 1 */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Avg Attendance Rate</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(52, 168, 83, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={18} color="var(--google-green)" />
            </div>
          </div>
          <div className="skeleton-pulse" style={{ height: '32px', width: '65px', borderRadius: '6px' }} />
          <div className="skeleton-pulse" style={{ height: '12px', width: '110px', borderRadius: '4px' }} />
        </div>

        {/* KPI 2 */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Attendees</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color="var(--google-blue)" />
            </div>
          </div>
          <div className="skeleton-pulse" style={{ height: '32px', width: '55px', borderRadius: '6px' }} />
          <div className="skeleton-pulse" style={{ height: '12px', width: '90px', borderRadius: '4px' }} />
        </div>

        {/* KPI 3 */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tracked Events</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(251, 188, 4, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={18} color="var(--google-yellow)" />
            </div>
          </div>
          <div className="skeleton-pulse" style={{ height: '32px', width: '45px', borderRadius: '6px' }} />
          <div className="skeleton-pulse" style={{ height: '12px', width: '100px', borderRadius: '4px' }} />
        </div>

        {/* KPI 4 */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Low Turnout Alerts</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(234, 67, 53, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={18} color="var(--google-red)" />
            </div>
          </div>
          <div className="skeleton-pulse" style={{ height: '32px', width: '35px', borderRadius: '6px' }} />
          <div className="skeleton-pulse" style={{ height: '12px', width: '85px', borderRadius: '4px' }} />
        </div>
      </div>

      {/* Tabs bar */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.5rem' }}>
        <div style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', background: 'rgba(66, 133, 244, 0.15)', color: '#93C5FD', fontWeight: 700, fontSize: '0.9rem' }}>
          Attendance Leaderboard
        </div>
        <div style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>
          Event Attendance Logs
        </div>
        <div style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>
          Engagement Alerts
        </div>
      </div>

      {/* Table list shimmer */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {[1, 2, 3, 4, 5].map((r) => (
          <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div className="skeleton-pulse" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
              <div className="skeleton-pulse" style={{ height: '15px', width: '180px', borderRadius: '4px' }} />
              <div className="skeleton-pulse" style={{ height: '12px', width: '110px', borderRadius: '4px' }} />
            </div>
            <div className="skeleton-pulse" style={{ height: '24px', width: '60px', borderRadius: '999px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
