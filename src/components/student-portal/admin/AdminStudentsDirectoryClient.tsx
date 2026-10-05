'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  BookOpen,
  Award,
  TrendingUp,
  GraduationCap,
  Layers,
  Search,
  Calendar,
  Sparkles,
  Building2,
  Linkedin,
  Github,
  Mail,
  Phone,
  Filter,
  Download,
  LayoutGrid,
  List,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Shield,
  Activity,
  QrCode,
  FileSpreadsheet,
} from 'lucide-react';
import { AdminStudentsDirectoryData, AdminStudentItem } from '@/app/student-portal/admin/students/actions';

interface Props {
  initialData: AdminStudentsDirectoryData;
  userRole: string;
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
  'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
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

const FACULTY_COLORS = ['#4285F4', '#34A853', '#FBBC04', '#EA4335', '#8B5CF6', '#06B6D4', '#F97316'];

function StatCard({
  icon,
  iconColor,
  value,
  label,
  sub,
  glow,
}: {
  icon: React.ReactNode;
  iconColor: string;
  value: string | number;
  label: string;
  sub?: string;
  glow: string;
}) {
  return (
    <div
      className="glass-panel"
      style={{
        padding: '1.25rem 1.1rem',
        borderRadius: '16px',
        textAlign: 'center',
        transition: 'all 0.2s ease',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 16px 32px -8px rgba(0,0,0,0.5), 0 0 20px -4px ${glow}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `${iconColor}15`,
          border: `1px solid ${iconColor}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 0.6rem',
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: iconColor, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', marginTop: '0.25rem' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '0.15rem' }}>{sub}</div>}
    </div>
  );
}

function BarMiniChart({
  items,
  max,
  colorFn,
}: {
  items: Array<{ label: string; count: number }>;
  max: number;
  colorFn: (index: number) => string;
}) {
  if (items.length === 0) {
    return <div style={{ color: '#64748B', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>No data yet</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      {items.map((item, idx) => {
        const pct = max > 0 ? Math.round((item.count / max) * 100) : 0;
        const color = colorFn(idx);
        return (
          <div key={item.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
              <span style={{ color: '#CBD5E1', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                {item.label}
              </span>
              <span style={{ color, fontWeight: 700 }}>
                {item.count}{' '}
                <span style={{ color: '#64748B', fontWeight: 400, fontSize: '0.7rem' }}>({pct}%)</span>
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  borderRadius: 999,
                  background: color,
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AdminStudentsDirectoryClient({ initialData, userRole }: Props) {
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterFaculty, setFilterFaculty] = useState<string | null>(null);
  const [filterCerts, setFilterCerts] = useState<'all' | 'with_certs' | 'no_certs'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'attendance' | 'enrollments' | 'certs' | 'name'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedStudent, setSelectedStudent] = useState<AdminStudentItem | null>(null);

  const { stats, students, facultiesList } = initialData;

  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchEn = s.full_name_en?.toLowerCase().includes(q);
          const matchAr = s.full_name_ar?.toLowerCase().includes(q);
          const matchEmail = s.email?.toLowerCase().includes(q);
          const matchPhone = s.phone?.includes(q) || s.whatsapp_number?.includes(q);
          const matchFac = s.faculty?.toLowerCase().includes(q);
          const matchDept = s.department_major?.toLowerCase().includes(q);
          const matchNatId = s.national_id?.includes(q);
          if (!matchEn && !matchAr && !matchEmail && !matchPhone && !matchFac && !matchDept && !matchNatId) {
            return false;
          }
        }
        if (filterYear !== null && Number(s.academic_year) !== Number(filterYear)) {
          return false;
        }
        if (filterFaculty && s.faculty !== filterFaculty) {
          return false;
        }
        if (filterCerts === 'with_certs' && s.certificatesCount === 0) {
          return false;
        }
        if (filterCerts === 'no_certs' && s.certificatesCount > 0) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'recent') {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }
        if (sortBy === 'attendance') {
          return b.attendanceRate - a.attendanceRate;
        }
        if (sortBy === 'enrollments') {
          return b.enrolledCourses - a.enrolledCourses;
        }
        if (sortBy === 'certs') {
          return b.certificatesCount - a.certificatesCount;
        }
        if (sortBy === 'name') {
          const nameA = a.full_name_en || a.full_name_ar || '';
          const nameB = b.full_name_en || b.full_name_ar || '';
          return nameA.localeCompare(nameB);
        }
        return 0;
      });
  }, [students, search, filterYear, filterFaculty, filterCerts, sortBy]);

  const maxFaculty = useMemo(() => Math.max(...stats.byFaculty.map((f) => f.count), 1), [stats.byFaculty]);
  const maxYear = useMemo(() => Math.max(...stats.byYear.map((y) => y.count), 1), [stats.byYear]);
  const maxTrack = useMemo(() => Math.max(...stats.byTrack.map((t) => t.count), 1), [stats.byTrack]);

  // Export to CSV function
  const exportToCSV = () => {
    const headers = [
      'Full Name (EN)',
      'Full Name (AR)',
      'Email',
      'Phone',
      'WhatsApp Number',
      'National ID',
      'Faculty',
      'Academic Year',
      'Department / Major',
      'University',
      'Enrolled Courses Count',
      'Certificates Count',
      'Attendance Rate %',
      'Workshops Count',
      'Registered At',
    ];

    const rows = filteredStudents.map((s) => [
      `"${s.full_name_en || ''}"`,
      `"${s.full_name_ar || ''}"`,
      `"${s.email || ''}"`,
      `"${s.phone || ''}"`,
      `"${s.whatsapp_number || ''}"`,
      `"${s.national_id || ''}"`,
      `"${s.faculty || ''}"`,
      `"${s.academic_year ? YEAR_LABELS[s.academic_year] || s.academic_year : ''}"`,
      `"${s.department_major || ''}"`,
      `"${s.university || ''}"`,
      s.enrolledCourses,
      s.certificatesCount,
      `${s.attendanceRate}%`,
      s.workshopsCount,
      `"${s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GDGoC_HNU_Enrolled_Students_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 1.75rem 5rem' }}>
      {/* 1. Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem 2.25rem',
          borderRadius: '24px',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(66, 133, 244, 0.25)',
          background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(52, 168, 83, 0.06) 50%, rgba(251, 188, 4, 0.04) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.85rem', borderRadius: 999, background: 'rgba(66, 133, 244, 0.2)', border: '1px solid rgba(66, 133, 244, 0.4)', color: '#60A5FA', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.85rem' }}>
              <Shield size={13} color="#60A5FA" />
              Presidential Executive Directory
            </div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              Enrolled Scholars & Platform Analytics
            </h1>
            <p style={{ color: '#94A3B8', fontSize: '0.92rem', maxWidth: 750, marginTop: '0.6rem', lineHeight: 1.5 }}>
              Central executive roster of all registered students at Helwan National University. Monitor academic distributions, track enrollment velocity, attendance participation, and issued completion credentials.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={exportToCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.2rem',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              <Download size={15} />
              Export CSV Roster ({filteredStudents.length})
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <StatCard
          icon={<Users size={20} color="#4285F4" />}
          iconColor="#4285F4"
          value={stats.totalStudents.toLocaleString()}
          label="Registered Scholars"
          sub="Active student profiles"
          glow="rgba(66, 133, 244, 0.4)"
        />
        <StatCard
          icon={<BookOpen size={20} color="#34A853" />}
          iconColor="#34A853"
          value={stats.totalEnrollments.toLocaleString()}
          label="Course Enrollments"
          sub={`${stats.activeCourses} active tracks`}
          glow="rgba(52, 168, 83, 0.4)"
        />
        <StatCard
          icon={<Award size={20} color="#FBBC04" />}
          iconColor="#FBBC04"
          value={stats.totalCertificates.toLocaleString()}
          label="Certificates Issued"
          sub="Verified credentials"
          glow="rgba(251, 188, 4, 0.4)"
        />
        <StatCard
          icon={<Activity size={20} color="#EA4335" />}
          iconColor="#EA4335"
          value={stats.totalAttendanceLogs.toLocaleString()}
          label="Attendance Scans"
          sub="Live session check-ins"
          glow="rgba(234, 67, 53, 0.4)"
        />
        <StatCard
          icon={<Sparkles size={20} color="#8B5CF6" />}
          iconColor="#8B5CF6"
          value={stats.totalWorkshopRegistrations.toLocaleString()}
          label="Workshop Regs"
          sub="Hands-on bootcamps"
          glow="rgba(139, 92, 246, 0.4)"
        />
        <StatCard
          icon={<TrendingUp size={20} color="#06B6D4" />}
          iconColor="#06B6D4"
          value={`${stats.avgAttendanceRate}%`}
          label="Avg Attendance"
          sub="Overall participation"
          glow="rgba(6, 182, 212, 0.4)"
        />
      </div>

      {/* 3. Analytics Distribution Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        {/* Faculty Breakdown */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
            <Building2 size={18} color="#4285F4" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Faculty Breakdown</h3>
          </div>
          <BarMiniChart
            items={stats.byFaculty.map((f) => ({ label: f.faculty, count: f.count }))}
            max={maxFaculty}
            colorFn={(idx) => FACULTY_COLORS[idx % FACULTY_COLORS.length]}
          />
        </div>

        {/* Academic Year Distribution */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
            <GraduationCap size={18} color="#34A853" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Academic Stage Distribution</h3>
          </div>
          <BarMiniChart
            items={stats.byYear.map((y) => ({ label: y.label, count: y.count }))}
            max={maxYear}
            colorFn={(idx) => ['#34A853', '#4285F4', '#FBBC04', '#EA4335', '#8B5CF6'][idx % 5]}
          />
        </div>

        {/* Track Popularity */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
            <Layers size={18} color="#FBBC04" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Track Popularity & Velocity</h3>
          </div>
          <BarMiniChart
            items={stats.byTrack.map((t) => ({ label: t.track, count: t.count }))}
            max={maxTrack}
            colorFn={(idx) => stats.byTrack[idx]?.color || '#4285F4'}
          />
        </div>
      </div>

      {/* 4. Filter & Search Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.5rem',
          borderRadius: 20,
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', flex: 1 }}>
          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: 260, flex: '1 1 260px' }}>
            <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by name, email, phone, faculty, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: 36,
                paddingRight: 12,
                paddingTop: '0.55rem',
                paddingBottom: '0.55rem',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Year Filter */}
          <select
            value={filterYear ?? ''}
            onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : null)}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: filterYear ? '#60A5FA' : '#CBD5E1',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="" style={{ background: '#1E293B', color: '#CBD5E1' }}>All Academic Years</option>
            <option value="1" style={{ background: '#1E293B', color: '#FFFFFF' }}>1st Year</option>
            <option value="2" style={{ background: '#1E293B', color: '#FFFFFF' }}>2nd Year</option>
            <option value="3" style={{ background: '#1E293B', color: '#FFFFFF' }}>3rd Year</option>
            <option value="4" style={{ background: '#1E293B', color: '#FFFFFF' }}>4th Year</option>
            <option value="5" style={{ background: '#1E293B', color: '#FFFFFF' }}>5th Year</option>
          </select>

          {/* Faculty Filter */}
          <select
            value={filterFaculty ?? ''}
            onChange={(e) => setFilterFaculty(e.target.value || null)}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: filterFaculty ? '#60A5FA' : '#CBD5E1',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer',
              maxWidth: 220,
            }}
          >
            <option value="" style={{ background: '#1E293B', color: '#CBD5E1' }}>All Faculties</option>
            {facultiesList.map((f) => (
              <option key={f} value={f} style={{ background: '#1E293B', color: '#FFFFFF' }}>
                {f}
              </option>
            ))}
          </select>

          {/* Certificate Filter */}
          <select
            value={filterCerts}
            onChange={(e) => setFilterCerts(e.target.value as any)}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: filterCerts !== 'all' ? '#FBBC04' : '#CBD5E1',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all" style={{ background: '#1E293B', color: '#CBD5E1' }}>All Credentials</option>
            <option value="with_certs" style={{ background: '#1E293B', color: '#FFFFFF' }}>Has Certificates (≥ 1)</option>
            <option value="no_certs" style={{ background: '#1E293B', color: '#FFFFFF' }}>No Certificates Yet</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#CBD5E1',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="recent" style={{ background: '#1E293B', color: '#FFFFFF' }}>Sort: Most Recent</option>
            <option value="attendance" style={{ background: '#1E293B', color: '#FFFFFF' }}>Sort: Attendance %</option>
            <option value="enrollments" style={{ background: '#1E293B', color: '#FFFFFF' }}>Sort: Most Enrollments</option>
            <option value="certs" style={{ background: '#1E293B', color: '#FFFFFF' }}>Sort: Most Certificates</option>
            <option value="name" style={{ background: '#1E293B', color: '#FFFFFF' }}>Sort: Name A-Z</option>
          </select>

          {(search || filterYear !== null || filterFaculty || filterCerts !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setFilterYear(null);
                setFilterFaculty(null);
                setFilterCerts('all');
              }}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: 10,
                background: 'rgba(234, 67, 53, 0.15)',
                border: '1px solid rgba(234, 67, 53, 0.3)',
                color: '#EA4335',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* View Mode Switcher */}
        <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 10 }}>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              padding: '0.4rem 0.65rem',
              borderRadius: 8,
              border: 'none',
              background: viewMode === 'grid' ? '#4285F4' : 'transparent',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            <LayoutGrid size={14} />
            Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            style={{
              padding: '0.4rem 0.65rem',
              borderRadius: 8,
              border: 'none',
              background: viewMode === 'table' ? '#4285F4' : 'transparent',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            <List size={14} />
            Roster Table
          </button>
        </div>
      </div>

      {/* Active Count Result */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', padding: '0 0.5rem' }}>
        <div style={{ color: '#94A3B8', fontSize: '0.85rem' }}>
          Showing <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{filteredStudents.length}</span> scholars (of {stats.totalStudents} total)
        </div>
      </div>

      {/* 5. Directory Roster (Grid vs Table) */}
      {filteredStudents.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3.5rem', textAlign: 'center', borderRadius: 20 }}>
          <Users size={40} color="#64748B" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: '#FFFFFF', fontSize: '1.1rem', fontWeight: 700 }}>No Scholars Found</h3>
          <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '0.4rem' }}>
            Try adjusting your search terms or clearing active filters.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              className="glass-panel"
              style={{
                padding: '1.4rem',
                borderRadius: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
                transition: 'all 0.2s ease',
                position: 'relative',
                border: '1px solid rgba(255,255,255,0.07)',
                cursor: 'pointer',
              }}
              onClick={() => setSelectedStudent(student)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(66, 133, 244, 0.4)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
              }}
            >
              <div>
                {/* Avatar & Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '0.85rem' }}>
                  {student.avatar_url ? (
                    <img
                      src={student.avatar_url}
                      alt={student.full_name_en || 'Student'}
                      style={{ width: 48, height: 48, borderRadius: 14, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background: getGradient(student.id),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1rem',
                        color: '#FFFFFF',
                        flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      }}
                    >
                      {getAvatarInitials(student.full_name_en, student.full_name_ar)}
                    </div>
                  )}

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {student.full_name_en || student.full_name_ar || 'Unnamed Scholar'}
                    </div>
                    {student.full_name_ar && student.full_name_en && (
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', direction: 'rtl', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {student.full_name_ar}
                      </div>
                    )}
                    {student.email && (
                      <div style={{ fontSize: '0.72rem', color: '#60A5FA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {student.email}
                      </div>
                    )}
                  </div>
                </div>

                {/* Faculty & Year Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.9rem' }}>
                  {student.faculty && (
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: 6,
                        background: 'rgba(66, 133, 244, 0.12)',
                        border: '1px solid rgba(66, 133, 244, 0.25)',
                        color: '#93C5FD',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 180,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {student.faculty}
                    </span>
                  )}
                  {student.academic_year && (
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: 6,
                        background: 'rgba(52, 168, 83, 0.12)',
                        border: '1px solid rgba(52, 168, 83, 0.25)',
                        color: '#86EFAC',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                      }}
                    >
                      {YEAR_LABELS[student.academic_year] || `Year ${student.academic_year}`}
                    </span>
                  )}
                </div>

                {/* Mini Stats Bar */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.5rem',
                    background: 'rgba(0,0,0,0.25)',
                    padding: '0.65rem 0.5rem',
                    borderRadius: 12,
                    textAlign: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#60A5FA' }}>{student.enrolledCourses}</div>
                    <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Tracks</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#FBBC04' }}>{student.certificatesCount}</div>
                    <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Certs</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: student.attendanceRate >= 70 ? '#34A853' : student.attendanceRate >= 40 ? '#FBBC04' : '#EA4335' }}>
                      {student.attendanceRate}%
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Att.</div>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                  Joined {new Date(student.created_at).toLocaleDateString()}
                </span>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {student.whatsapp_number && (
                    <a
                      href={`https://wa.me/${student.whatsapp_number.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: '#25D366', padding: 4, borderRadius: 6, background: 'rgba(37, 211, 102, 0.1)' }}
                      title="WhatsApp Chat"
                    >
                      <Phone size={14} />
                    </a>
                  )}
                  {student.linkedin_url && (
                    <a
                      href={student.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: '#0A66C2', padding: 4, borderRadius: 6, background: 'rgba(10, 102, 194, 0.1)' }}
                      title="LinkedIn Profile"
                    >
                      <Linkedin size={14} />
                    </a>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStudent(student);
                    }}
                    style={{
                      padding: '0.3rem 0.7rem',
                      borderRadius: 8,
                      background: 'rgba(66, 133, 244, 0.15)',
                      border: '1px solid rgba(66, 133, 244, 0.3)',
                      color: '#60A5FA',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    View File
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="glass-panel" style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}>
                  <th style={{ padding: '0.85rem 1.2rem' }}>Scholar</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Faculty & Stage</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Contact Info</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Tracks</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Certs</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Attendance</th>
                  <th style={{ padding: '0.85rem 1.2rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s ease', cursor: 'pointer' }}
                    onClick={() => setSelectedStudent(student)}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                    }}
                  >
                    <td style={{ padding: '0.85rem 1.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {student.avatar_url ? (
                          <img src={student.avatar_url} alt="" style={{ width: 34, height: 34, borderRadius: 10, objectFit: 'cover' }} />
                        ) : (
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 10,
                              background: getGradient(student.id),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              color: '#FFFFFF',
                            }}
                          >
                            {getAvatarInitials(student.full_name_en, student.full_name_ar)}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700, color: '#FFFFFF' }}>
                            {student.full_name_en || student.full_name_ar || 'Unnamed'}
                          </div>
                          {student.full_name_ar && student.full_name_en && (
                            <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{student.full_name_ar}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ color: '#E2E8F0', fontWeight: 600 }}>{student.faculty || '—'}</div>
                      <div style={{ fontSize: '0.72rem', color: '#86EFAC' }}>
                        {student.academic_year ? YEAR_LABELS[student.academic_year] || `Year ${student.academic_year}` : '—'}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ color: '#60A5FA', fontSize: '0.78rem' }}>{student.email || '—'}</div>
                      <div style={{ color: '#94A3B8', fontSize: '0.72rem' }}>{student.phone || '—'}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 800, color: '#60A5FA' }}>
                      {student.enrolledCourses}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 800, color: '#FBBC04' }}>
                      {student.certificatesCount}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          color: student.attendanceRate >= 70 ? '#34A853' : student.attendanceRate >= 40 ? '#FBBC04' : '#EA4335',
                        }}
                      >
                        {student.attendanceRate}%
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1.2rem', textAlign: 'right' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStudent(student);
                        }}
                        style={{
                          padding: '0.35rem 0.8rem',
                          borderRadius: 8,
                          background: 'rgba(66, 133, 244, 0.15)',
                          border: '1px solid rgba(66, 133, 244, 0.3)',
                          color: '#60A5FA',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Student Detailed Dossier Modal */}
      {selectedStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem',
          }}
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: 620,
              borderRadius: 24,
              padding: '2rem',
              background: '#0F172A',
              border: '1px solid rgba(66, 133, 244, 0.3)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 40px rgba(66, 133, 244, 0.2)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {selectedStudent.avatar_url ? (
                  <img
                    src={selectedStudent.avatar_url}
                    alt=""
                    style={{ width: 60, height: 60, borderRadius: 16, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 16,
                      background: getGradient(selectedStudent.id),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1.3rem',
                      color: '#FFFFFF',
                    }}
                  >
                    {getAvatarInitials(selectedStudent.full_name_en, selectedStudent.full_name_ar)}
                  </div>
                )}
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    {selectedStudent.full_name_en || 'Unnamed Scholar'}
                  </h2>
                  {selectedStudent.full_name_ar && (
                    <div style={{ fontSize: '0.88rem', color: '#94A3B8', marginTop: '0.15rem' }}>
                      {selectedStudent.full_name_ar}
                    </div>
                  )}
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: '0.35rem',
                      padding: '0.15rem 0.55rem',
                      borderRadius: 6,
                      background: 'rgba(52, 168, 83, 0.15)',
                      border: '1px solid rgba(52, 168, 83, 0.3)',
                      color: '#86EFAC',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    Status: {selectedStudent.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  borderRadius: 10,
                  width: 34,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94A3B8',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Metric Summary in Modal */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.75rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                padding: '1rem',
                borderRadius: 16,
                marginBottom: '1.5rem',
                textAlign: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#60A5FA' }}>{selectedStudent.enrolledCourses}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>COURSES</div>
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FBBC04' }}>{selectedStudent.certificatesCount}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>CERTS</div>
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34A853' }}>{selectedStudent.attendanceRate}%</div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>ATTENDANCE</div>
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#8B5CF6' }}>{selectedStudent.workshopsCount}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>BOOTCAMPS</div>
              </div>
            </div>

            {/* Academic & Personal Records */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: '#94A3B8' }}>University:</span>
                <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{selectedStudent.university}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: '#94A3B8' }}>Faculty:</span>
                <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{selectedStudent.faculty || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: '#94A3B8' }}>Academic Year:</span>
                <span style={{ color: '#FFFFFF', fontWeight: 600 }}>
                  {selectedStudent.academic_year ? YEAR_LABELS[selectedStudent.academic_year] || `Year ${selectedStudent.academic_year}` : '—'}
                </span>
              </div>
              {selectedStudent.department_major && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: '#94A3B8' }}>Department / Major:</span>
                  <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{selectedStudent.department_major}</span>
                </div>
              )}
              {selectedStudent.email && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: '#94A3B8' }}>Email:</span>
                  <span style={{ color: '#60A5FA', fontWeight: 600 }}>{selectedStudent.email}</span>
                </div>
              )}
              {selectedStudent.phone && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: '#94A3B8' }}>Phone:</span>
                  <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{selectedStudent.phone}</span>
                </div>
              )}
              {selectedStudent.whatsapp_number && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: '#94A3B8' }}>WhatsApp:</span>
                  <span style={{ color: '#34A853', fontWeight: 600 }}>{selectedStudent.whatsapp_number}</span>
                </div>
              )}
              {selectedStudent.national_id && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: '#94A3B8' }}>National ID:</span>
                  <span style={{ color: '#E2E8F0', fontFamily: 'monospace' }}>{selectedStudent.national_id}</span>
                </div>
              )}
            </div>

            {/* Enrolled Tracks List */}
            {selectedStudent.courseTitles.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Enrolled Tracks ({selectedStudent.courseTitles.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {selectedStudent.courseTitles.map((title, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: 8,
                        background: 'rgba(66, 133, 244, 0.1)',
                        border: '1px solid rgba(66, 133, 244, 0.25)',
                        color: '#93C5FD',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                      }}
                    >
                      {title}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Links & Close */}
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              {selectedStudent.whatsapp_number && (
                <a
                  href={`https://wa.me/${selectedStudent.whatsapp_number.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.9rem',
                    borderRadius: 10,
                    background: '#25D366',
                    color: '#000000',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <Phone size={14} />
                  WhatsApp
                </a>
              )}
              {selectedStudent.linkedin_url && (
                <a
                  href={selectedStudent.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.9rem',
                    borderRadius: 10,
                    background: '#0A66C2',
                    color: '#FFFFFF',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <Linkedin size={14} />
                  LinkedIn
                </a>
              )}
              {selectedStudent.email && (
                <a
                  href={`mailto:${selectedStudent.email}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.9rem',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.1)',
                    color: '#FFFFFF',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <Mail size={14} />
                  Email Scholar
                </a>
              )}
              <button
                onClick={() => setSelectedStudent(null)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#FFFFFF',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
