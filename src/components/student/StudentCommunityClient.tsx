'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  BookOpen,
  Award,
  QrCode,
  TrendingUp,
  GraduationCap,
  Layers,
  Search,
  Target,
  Calendar,
  Activity,
  ChevronDown,
  Sparkles,
  Building2,
  Linkedin,
  CheckCircle2,
} from 'lucide-react';

interface CommunityData {
  authenticated: boolean;
  currentStudentId: string | null;
  stats: {
    totalStudents: number;
    activeCourses: number;
    totalEnrollments: number;
    totalCertificates: number;
    totalAttendanceLogs: number;
    totalWorkshopRegistrations: number;
    avgAttendanceRate: number;
  };
  byFaculty: Array<{ faculty: string; count: number }>;
  byYear: Array<{ year: number; label: string; count: number }>;
  byTrack: Array<{ track: string; count: number; color: string }>;
  students: Array<{
    id: string;
    full_name_en: string | null;
    full_name_ar: string | null;
    avatar_url: string | null;
    faculty: string | null;
    academic_year: number | null;
    university: string;
    enrolledCourses: number;
    certificatesCount: number;
    attendanceRate: number;
    linkedin_url: string | null;
  }>;
  totalCount: number;
}

interface Props {
  initialData: CommunityData;
}

function getAvatarInitials(en: string | null, ar: string | null): string {
  const name = en || ar || '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
  'linear-gradient(135deg, #34A853 0%, #16A34A 100%)',
  'linear-gradient(135deg, #EA4335 0%, #DC2626 100%)',
  'linear-gradient(135deg, #FBBC04 0%, #D97706 100%)',
  'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
  'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
];

function getGradient(id: string): string {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

const YEAR_LABELS: Record<number, string> = {
  1: '1st Year',
  2: '2nd Year',
  3: '3rd Year',
  4: '4th Year',
  5: '5th Year',
};

function StatCard({ icon, iconColor, value, label, sub, glow }: { icon: React.ReactNode; iconColor: string; value: string | number; label: string; sub?: string; glow: string }) {
  return (
    <div
      className="glass-panel"
      style={{ padding: '1.4rem 1.2rem', borderRadius: '18px', textAlign: 'center', transition: 'transform 0.2s ease, box-shadow 0.2s ease', cursor: 'default', position: 'relative', overflow: 'hidden' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 20px 40px -10px rgba(0,0,0,0.5), 0 0 20px -4px ${glow}`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${iconColor}18`, border: `1.5px solid ${iconColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
        {icon}
      </div>
      <div style={{ fontSize: '1.9rem', fontWeight: 900, color: iconColor, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#FFFFFF', marginTop: '0.3rem' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.2rem' }}>{sub}</div>}
    </div>
  );
}

function BarMiniChart({ items, max, colorFn }: { items: Array<{ label: string; count: number }>; max: number; colorFn: (idx: number) => string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {items.map((item, idx) => {
        const pct = max > 0 ? (item.count / max) * 100 : 0;
        const color = colorFn(idx);
        return (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.73rem', color: '#94A3B8', fontWeight: 600, width: 120, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.label}>{item.label}</div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 4, height: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: color, transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, width: 28, textAlign: 'right', flexShrink: 0 }}>{item.count}</div>
          </div>
        );
      })}
    </div>
  );
}

function StudentCard({ student, isCurrentUser }: { student: CommunityData['students'][0]; isCurrentUser: boolean }) {
  const initials = getAvatarInitials(student.full_name_en, student.full_name_ar);
  const gradient = getGradient(student.id);
  return (
    <div className="glass-panel" style={{ borderRadius: '18px', overflow: 'hidden', transition: 'transform 0.2s ease, box-shadow 0.2s ease', position: 'relative', cursor: 'default', border: isCurrentUser ? '1.5px solid rgba(66,133,244,0.5)' : undefined }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 20px 40px -10px rgba(0,0,0,0.6), 0 0 20px -4px rgba(66,133,244,0.18)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
    >
      <div style={{ height: 3, background: gradient }} />
      {isCurrentUser && (
        <div style={{ position: 'absolute', top: 14, right: 10, fontSize: '0.62rem', fontWeight: 800, padding: '0.18rem 0.5rem', borderRadius: 999, background: 'rgba(66,133,244,0.2)', border: '1px solid rgba(66,133,244,0.4)', color: '#60A5FA', letterSpacing: '0.06em', textTransform: 'uppercase' }}>You</div>
      )}
      <div style={{ padding: '1.25rem 1.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.9rem' }}>
          {student.avatar_url ? (
            <img src={student.avatar_url} alt={student.full_name_en || ''} style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)' }} />
          ) : (
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 900, fontSize: '1rem', flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)' }}>{initials}</div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.full_name_en || 'Student'}</div>
            {student.full_name_ar && <div dir="rtl" style={{ fontSize: '0.72rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.full_name_ar}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.9rem' }}>
          {student.faculty && <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '0.18rem 0.5rem', borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }} title={student.faculty}>{student.faculty}</span>}
          {student.academic_year && <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '0.18rem 0.5rem', borderRadius: 6, background: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.2)', color: '#60A5FA' }}>{YEAR_LABELS[student.academic_year] || `Year ${student.academic_year}`}</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginBottom: '0.85rem' }}>
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.45rem 0.2rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#4285F4', lineHeight: 1 }}>{student.enrolledCourses}</div>
            <div style={{ fontSize: '0.58rem', color: '#64748B', fontWeight: 600, marginTop: 2 }}>Tracks</div>
          </div>
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.45rem 0.2rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#FBBC04', lineHeight: 1 }}>{student.certificatesCount}</div>
            <div style={{ fontSize: '0.58rem', color: '#64748B', fontWeight: 600, marginTop: 2 }}>Certs</div>
          </div>
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.45rem 0.2rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: student.attendanceRate >= 75 ? '#34A853' : student.attendanceRate >= 50 ? '#FBBC04' : '#EA4335', lineHeight: 1 }}>{student.attendanceRate}%</div>
            <div style={{ fontSize: '0.58rem', color: '#64748B', fontWeight: 600, marginTop: 2 }}>Attend.</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
            <Building2 size={11} color="#475569" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.65rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.university}</span>
          </div>
          {student.linkedin_url && (
            <a href={student.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, background: 'rgba(10,102,194,0.15)', border: '1px solid rgba(10,102,194,0.3)', flexShrink: 0 }}>
              <Linkedin size={13} color="#0A66C2" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function StudentCommunityClient({ initialData }: Props) {
  const { stats, byFaculty, byYear, byTrack, students, totalCount, currentStudentId } = initialData;
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterFaculty, setFilterFaculty] = useState<string | null>(null);

  const allYears = Array.from(new Set(students.map(s => s.academic_year).filter(Boolean) as number[])).sort();
  const allFaculties = Array.from(new Set(students.map(s => s.faculty).filter(Boolean) as string[])).sort();

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return students.filter(s => {
      if (filterYear && s.academic_year !== filterYear) return false;
      if (filterFaculty && s.faculty !== filterFaculty) return false;
      if (q) {
        const nameEn = (s.full_name_en || '').toLowerCase();
        const nameAr = (s.full_name_ar || '').toLowerCase();
        const fac = (s.faculty || '').toLowerCase();
        if (!nameEn.includes(q) && !nameAr.includes(q) && !fac.includes(q)) return false;
      }
      return true;
    });
  }, [students, search, filterYear, filterFaculty]);

  const maxFaculty = byFaculty.reduce((m, f) => Math.max(m, f.count), 0);
  const maxYear = byYear.reduce((m, y) => Math.max(m, y.count), 0);
  const maxTrack = byTrack.reduce((m, t) => Math.max(m, t.count), 0);
  const FACULTY_COLORS = ['#4285F4', '#34A853', '#EA4335', '#FBBC04', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

  return (
    <div style={{ padding: 'clamp(1.25rem, 3vw, 2rem)', maxWidth: 1400, margin: '0 auto' }}>

      {/* Hero */}
      <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', padding: 'clamp(2rem, 4vw, 3rem) clamp(1.5rem, 3vw, 2.5rem)', marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(11,18,34,0.98) 0%, rgba(7,12,24,0.99) 100%)', border: '1px solid rgba(66,133,244,0.2)', boxShadow: '0 25px 60px -20px rgba(0,0,0,0.8)' }}>
        <div style={{ position: 'absolute', top: '-20%', left: '10%', width: 400, height: 300, background: 'radial-gradient(ellipse, rgba(66,133,244,0.1) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '-10%', right: '5%', width: 300, height: 250, background: 'radial-gradient(ellipse, rgba(52,168,83,0.07) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #4285F4 0%, #34A853 33%, #FBBC04 66%, #EA4335 100%)', opacity: 0.6 }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.3rem 0.85rem', borderRadius: 999, background: 'rgba(66,133,244,0.12)', border: '1px solid rgba(66,133,244,0.25)', color: '#93C5FD', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.9rem' }}>
              <Sparkles size={12} />
              GDGoC HNU &middot; Student Community
            </div>
            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, color: '#FFFFFF', margin: '0 0 0.75rem', letterSpacing: '-0.035em', lineHeight: 1.1 }}>
              Our Growing{' '}
              <span style={{ background: 'linear-gradient(135deg, #4285F4 0%, #34A853 55%, #FBBC04 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Scholar Community</span>
            </h1>
            <p style={{ fontSize: 'clamp(0.88rem, 2vw, 1rem)', color: '#94A3B8', margin: 0, lineHeight: 1.65, maxWidth: 540 }}>
              Real-time insights into the GDGoC HNU student community — enrollment trends, attendance analytics, faculty breakdown, and the scholars building the future.
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
            {[{ label: 'Total Students', value: totalCount, color: '#4285F4' }, { label: 'Certificates', value: stats.totalCertificates, color: '#FBBC04' }, { label: 'Avg Attendance', value: `${stats.avgAttendanceRate}%`, color: '#34A853' }].map(p => (
              <div key={p.label} style={{ padding: '0.65rem 1.1rem', borderRadius: 14, background: `${p.color}12`, border: `1px solid ${p.color}28`, textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: p.color, lineHeight: 1 }}>{p.value}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, marginTop: 2 }}>{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 155px), 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard icon={<Users size={20} color="#4285F4" />} iconColor="#4285F4" value={stats.totalStudents} label="Active Students" sub="Fully onboarded" glow="rgba(66,133,244,0.25)" />
        <StatCard icon={<BookOpen size={20} color="#34A853" />} iconColor="#34A853" value={stats.activeCourses} label="Live Tracks" sub="Published courses" glow="rgba(52,168,83,0.25)" />
        <StatCard icon={<Layers size={20} color="#8B5CF6" />} iconColor="#8B5CF6" value={stats.totalEnrollments} label="Enrollments" sub="Confirmed spots" glow="rgba(139,92,246,0.25)" />
        <StatCard icon={<Award size={20} color="#FBBC04" />} iconColor="#FBBC04" value={stats.totalCertificates} label="Certificates" sub="Issued & verified" glow="rgba(251,188,4,0.25)" />
        <StatCard icon={<QrCode size={20} color="#06B6D4" />} iconColor="#06B6D4" value={stats.totalAttendanceLogs} label="QR Check-ins" sub="Attendance logs" glow="rgba(6,182,212,0.25)" />
        <StatCard icon={<Calendar size={20} color="#EC4899" />} iconColor="#EC4899" value={stats.totalWorkshopRegistrations} label="Workshop Seats" sub="Registered" glow="rgba(236,72,153,0.25)" />
        <StatCard icon={<Activity size={20} color="#F97316" />} iconColor="#F97316" value={`${stats.avgAttendanceRate}%`} label="Avg Attendance" sub="Across all tracks" glow="rgba(249,115,22,0.25)" />
      </div>

      {/* Analytics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {byFaculty.length > 0 && (
          <div className="glass-panel" style={{ borderRadius: 18, padding: '1.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.2rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: '#4285F415', border: '1px solid #4285F430', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><GraduationCap size={16} color="#4285F4" /></div>
              <div><div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FFFFFF' }}>Faculty Breakdown</div><div style={{ fontSize: '0.66rem', color: '#64748B' }}>Students per college</div></div>
            </div>
            <BarMiniChart items={byFaculty.map(f => ({ label: f.faculty, count: f.count }))} max={maxFaculty} colorFn={idx => FACULTY_COLORS[idx % FACULTY_COLORS.length]} />
          </div>
        )}
        {byYear.length > 0 && (
          <div className="glass-panel" style={{ borderRadius: 18, padding: '1.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.2rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: '#34A85315', border: '1px solid #34A85330', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={16} color="#34A853" /></div>
              <div><div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FFFFFF' }}>Academic Year Split</div><div style={{ fontSize: '0.66rem', color: '#64748B' }}>Distribution by study year</div></div>
            </div>
            <BarMiniChart items={byYear.map(y => ({ label: y.label, count: y.count }))} max={maxYear} colorFn={idx => ['#4285F4', '#34A853', '#FBBC04', '#EA4335', '#8B5CF6'][idx % 5]} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '1rem' }}>
              {byYear.map((y, idx) => {
                const colors = ['#4285F4', '#34A853', '#FBBC04', '#EA4335', '#8B5CF6'];
                const c = colors[idx % colors.length];
                const pct = totalCount > 0 ? Math.round((y.count / totalCount) * 100) : 0;
                return (
                  <div key={y.year} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: 999, background: `${c}12`, border: `1px solid ${c}25` }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block' }} />
                    <span style={{ fontSize: '0.65rem', color: '#CBD5E1', fontWeight: 700 }}>{y.label}: {pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {byTrack.length > 0 && (
          <div className="glass-panel" style={{ borderRadius: 18, padding: '1.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.2rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: '#FBBC0415', border: '1px solid #FBBC0430', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Target size={16} color="#FBBC04" /></div>
              <div><div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FFFFFF' }}>Track Popularity</div><div style={{ fontSize: '0.66rem', color: '#64748B' }}>Confirmed enrollments per track</div></div>
            </div>
            <BarMiniChart items={byTrack.map(t => ({ label: t.track, count: t.count }))} max={maxTrack} colorFn={idx => byTrack[idx]?.color || '#94A3B8'} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '1rem' }}>
              {byTrack.map(t => (
                <div key={t.track} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: 999, background: `${t.color}12`, border: `1px solid ${t.color}25` }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, display: 'inline-block' }} />
                  <span style={{ fontSize: '0.65rem', color: '#CBD5E1', fontWeight: 700 }}>{t.track}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Members Section */}
      <div className="glass-panel" style={{ borderRadius: 20, padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#4285F415', border: '1px solid #4285F430', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={18} color="#4285F4" /></div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF' }}>Scholar Directory</div>
              <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{filtered.length} {filtered.length === 1 ? 'student' : 'students'} shown &middot; {totalCount} total enrolled</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#64748B" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input type="text" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, paddingRight: 12, paddingTop: '0.45rem', paddingBottom: '0.45rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '0.82rem', outline: 'none', width: 180 }} id="community-search-input" />
            </div>
            <div style={{ position: 'relative' }}>
              <select value={filterYear ?? ''} onChange={e => setFilterYear(e.target.value ? Number(e.target.value) : null)} style={{ padding: '0.45rem 2rem 0.45rem 0.75rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: filterYear ? '#60A5FA' : '#94A3B8', fontSize: '0.82rem', outline: 'none', cursor: 'pointer', appearance: 'none' }} id="community-year-filter">
                <option value="" style={{ background: '#0B0F19' }}>All Years</option>
                {allYears.map(y => <option key={y} value={y} style={{ background: '#0B0F19' }}>{YEAR_LABELS[y] || `Year ${y}`}</option>)}
              </select>
              <ChevronDown size={13} color="#64748B" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
            {allFaculties.length > 0 && (
              <div style={{ position: 'relative' }}>
                <select value={filterFaculty ?? ''} onChange={e => setFilterFaculty(e.target.value || null)} style={{ padding: '0.45rem 2rem 0.45rem 0.75rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: filterFaculty ? '#60A5FA' : '#94A3B8', fontSize: '0.82rem', outline: 'none', cursor: 'pointer', appearance: 'none', maxWidth: 180 }} id="community-faculty-filter">
                  <option value="" style={{ background: '#0B0F19' }}>All Faculties</option>
                  {allFaculties.map(f => <option key={f} value={f} style={{ background: '#0B0F19' }}>{f}</option>)}
                </select>
                <ChevronDown size={13} color="#64748B" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            )}
            {(search || filterYear || filterFaculty) && (
              <button type="button" onClick={() => { setSearch(''); setFilterYear(null); setFilterFaculty(null); }} style={{ padding: '0.45rem 0.85rem', borderRadius: 10, background: 'rgba(234,67,53,0.1)', border: '1px solid rgba(234,67,53,0.25)', color: '#EA4335', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>Clear</button>
            )}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748B' }}>
            <Users size={36} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
            <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>No students match your filters.</div>
            <div style={{ fontSize: '0.78rem', marginTop: '0.35rem' }}>Try clearing or adjusting the filters above.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 230px), 1fr))', gap: '0.9rem' }}>
            {filtered.map(student => (
              <StudentCard key={student.id} student={student} isCurrentUser={student.id === currentStudentId} />
            ))}
          </div>
        )}
        {students.length < totalCount && (
          <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', borderRadius: 12, background: 'rgba(66,133,244,0.06)', border: '1px solid rgba(66,133,244,0.15)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748B', fontSize: '0.78rem' }}>
            <CheckCircle2 size={14} color="#4285F4" />
            Showing the first <strong style={{ color: '#94A3B8' }}>{students.length}</strong> students of <strong style={{ color: '#94A3B8' }}>{totalCount}</strong> total. Use search and filters to find specific students.
          </div>
        )}
      </div>
    </div>
  );
}
