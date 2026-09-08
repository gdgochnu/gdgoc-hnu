'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Medal,
  Award,
  Search,
  Filter,
  Download,
  Flame,
  UserCheck,
  Building2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  BarChart3,
  Users,
} from 'lucide-react';
import {
  AttendanceLeaderboardSummary,
  AttendanceLeaderboardEntry,
  UserRole,
  DepartmentBranch,
} from '@/types';

interface AttendanceLeaderboardProps {
  initialSummary: AttendanceLeaderboardSummary;
}

export function AttendanceLeaderboard({ initialSummary }: AttendanceLeaderboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedRoleCategory, setSelectedRoleCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rate' | 'events' | 'name'>('rate');

  // Format human-readable role name & badge color
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'president':
        return {
          label: 'President',
          bg: 'rgba(234, 67, 53, 0.15)',
          color: 'var(--google-red)',
          border: 'rgba(234, 67, 53, 0.35)',
        };
      case 'co_president':
        return {
          label: 'Co-President',
          bg: 'rgba(251, 188, 5, 0.15)',
          color: 'var(--google-yellow)',
          border: 'rgba(251, 188, 5, 0.35)',
        };
      case 'branch_head':
        return {
          label: 'Branch Head',
          bg: 'rgba(66, 133, 244, 0.15)',
          color: 'var(--google-blue)',
          border: 'rgba(66, 133, 244, 0.35)',
        };
      case 'committee_head':
        return {
          label: 'Committee Head',
          bg: 'rgba(52, 168, 83, 0.15)',
          color: 'var(--google-green)',
          border: 'rgba(52, 168, 83, 0.35)',
        };
      case 'committee_co_head':
        return {
          label: 'Co-Head',
          bg: 'rgba(20, 184, 166, 0.15)',
          color: '#14B8A6',
          border: 'rgba(20, 184, 166, 0.35)',
        };
      case 'member':
      default:
        return {
          label: 'Member',
          bg: 'rgba(255, 255, 255, 0.08)',
          color: 'var(--text-secondary)',
          border: 'rgba(255, 255, 255, 0.15)',
        };
    }
  };

  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    return initialSummary.entries
      .filter((entry) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = entry.fullName.toLowerCase().includes(q);
          const matchesNameAr = entry.fullNameAr?.toLowerCase().includes(q);
          const matchesEmail = entry.email.toLowerCase().includes(q);
          const matchesDept = entry.departmentName?.toLowerCase().includes(q);
          const matchesPosition = entry.position?.toLowerCase().includes(q);
          if (!matchesName && !matchesNameAr && !matchesEmail && !matchesDept && !matchesPosition) {
            return false;
          }
        }

        // Branch filter
        if (selectedBranch !== 'all' && entry.branch !== selectedBranch) {
          return false;
        }

        // Department filter
        if (selectedDept !== 'all' && entry.departmentId !== selectedDept) {
          return false;
        }

        // Role Category filter
        if (selectedRoleCategory !== 'all') {
          if (selectedRoleCategory === 'presidential') {
            if (entry.role !== 'president' && entry.role !== 'co_president') return false;
          } else if (selectedRoleCategory === 'branch_heads') {
            if (entry.role !== 'branch_head') return false;
          } else if (selectedRoleCategory === 'committee_heads') {
            if (entry.role !== 'committee_head' && entry.role !== 'committee_co_head') return false;
          } else if (selectedRoleCategory === 'members') {
            if (entry.role !== 'member') return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'rate') {
          if (b.attendanceRate !== a.attendanceRate) return b.attendanceRate - a.attendanceRate;
          return b.eventsAttended - a.eventsAttended;
        }
        if (sortBy === 'events') {
          if (b.eventsAttended !== a.eventsAttended) return b.eventsAttended - a.eventsAttended;
          return b.attendanceRate - a.attendanceRate;
        }
        return a.fullName.localeCompare(b.fullName);
      });
  }, [
    initialSummary.entries,
    searchQuery,
    selectedBranch,
    selectedDept,
    selectedRoleCategory,
    sortBy,
  ]);

  // Top 3 Podium entries (from unfiltered top of chapter, or filtered top)
  const topThree = useMemo(() => {
    return initialSummary.entries.slice(0, 3);
  }, [initialSummary.entries]);

  // Client-side CSV export
  const handleExportCsv = () => {
    const headers = [
      'Rank',
      'Full Name (EN)',
      'Full Name (AR)',
      'Email',
      'Role',
      'Position',
      'Department',
      'Branch',
      'Attendance Rate (%)',
      'Events Attended',
      'Eligible Events',
    ];

    const rows = filteredEntries.map((e, index) => [
      `"${index + 1}"`,
      `"${(e.fullNameEn || e.fullName).replace(/"/g, '""')}"`,
      `"${(e.fullNameAr || '').replace(/"/g, '""')}"`,
      `"${e.email.replace(/"/g, '""')}"`,
      `"${e.role}"`,
      `"${(e.position || '').replace(/"/g, '""')}"`,
      `"${(e.departmentName || 'N/A').replace(/"/g, '""')}"`,
      `"${e.branch || 'N/A'}"`,
      `"${e.attendanceRate}%"`,
      `"${e.eventsAttended}"`,
      `"${e.eventsEligible}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gdgoc-attendance-leaderboard-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getRankMedal = (rank: number) => {
    if (rank === 1) {
      return {
        icon: <Trophy size={18} color="#FFD700" />,
        bg: 'linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(255, 215, 0, 0.08))',
        border: '1px solid rgba(255, 215, 0, 0.5)',
        color: '#FFD700',
        label: '#1 Gold',
      };
    }
    if (rank === 2) {
      return {
        icon: <Medal size={18} color="#C0C0C0" />,
        bg: 'linear-gradient(135deg, rgba(192, 192, 192, 0.25), rgba(192, 192, 192, 0.08))',
        border: '1px solid rgba(192, 192, 192, 0.5)',
        color: '#E0E0E0',
        label: '#2 Silver',
      };
    }
    if (rank === 3) {
      return {
        icon: <Award size={18} color="#CD7F32" />,
        bg: 'linear-gradient(135deg, rgba(205, 127, 50, 0.25), rgba(205, 127, 50, 0.08))',
        border: '1px solid rgba(205, 127, 50, 0.5)',
        color: '#CD7F32',
        label: '#3 Bronze',
      };
    }
    return {
      icon: null,
      bg: 'rgba(255, 255, 255, 0.06)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      color: 'var(--text-secondary)',
      label: `#${rank}`,
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Header Overview & Stats */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.65rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 800,
                background: 'rgba(66, 133, 244, 0.15)',
                color: 'var(--google-blue)',
                border: '1px solid rgba(66, 133, 244, 0.3)',
              }}
            >
              <Trophy size={13} /> Org-wide Attendance Rate Leaderboard
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Spec §4.5 &bull; Step 10.2
            </span>
          </div>
          <h2
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: '0 0 0.25rem 0',
              letterSpacing: '-0.01em',
            }}
          >
            Chapter Attendance Rankings
          </h2>
          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              margin: 0,
              maxWidth: '650px',
            }}
          >
            Universal attendance rates covering all roles — Members, Committee Heads, Branch Leadership, and Chapter Presidents alike.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Quick Metrics */}
          <div
            className="glass-panel"
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
            }}
          >
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Chapter Average
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--google-green)' }}>
                {initialSummary.averageAttendanceRate}%
              </div>
            </div>
            <div
              style={{
                width: '1px',
                height: '28px',
                background: 'rgba(255, 255, 255, 0.1)',
              }}
            />
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Tracked Profiles
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                {initialSummary.totalProfiles}
              </div>
            </div>
          </div>

          <button
            onClick={handleExportCsv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.15rem',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-primary)',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Download size={15} color="var(--google-blue)" />
            Export CSV
          </button>
        </div>
      </div>

      {/* 2. Podium: Top 3 Chapter Attenders */}
      {topThree.length > 0 && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            <Flame size={18} color="var(--google-yellow)" />
            <h3
              style={{
                fontSize: '1rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Chapter Podium
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Top overall attendance leaders
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {topThree.map((item, index) => {
              const medal = getRankMedal(index + 1);
              const roleInfo = getRoleBadge(item.role);

              return (
                <div
                  key={item.profileId}
                  className="glass-panel"
                  style={{
                    padding: '1.4rem 1.3rem',
                    borderRadius: '16px',
                    border: medal.border,
                    background: medal.bg,
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.1rem',
                          fontWeight: 800,
                          color: '#FFFFFF',
                          overflow: 'hidden',
                        }}
                      >
                        {item.avatarUrl ? (
                          <img
                            src={item.avatarUrl}
                            alt={item.fullName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          item.fullName.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: '0.98rem',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                          }}
                        >
                          <Link
                            href={`/members/${item.profileId}`}
                            style={{
                              color: 'inherit',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            {item.fullName}
                            <ExternalLink size={12} style={{ opacity: 0.6 }} />
                          </Link>
                        </div>
                        <div
                          style={{
                            fontSize: '0.76rem',
                            color: 'var(--text-muted)',
                            marginTop: '0.15rem',
                          }}
                        >
                          {item.position || item.departmentName || 'GDGoC Chapter'}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.3rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background: 'rgba(0, 0, 0, 0.3)',
                        color: medal.color,
                        border: medal.border,
                      }}
                    >
                      {medal.icon}
                      {medal.label}
                    </div>
                  </div>

                  {/* Turnout Progress */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.35rem',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: roleInfo.bg,
                          color: roleInfo.color,
                          border: `1px solid ${roleInfo.border}`,
                        }}
                      >
                        {roleInfo.label}
                      </span>

                      <span
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 900,
                          color:
                            item.attendanceRate >= 80
                              ? 'var(--google-green)'
                              : item.attendanceRate >= 50
                              ? 'var(--google-blue)'
                              : 'var(--google-yellow)',
                        }}
                      >
                        {item.attendanceRate}%
                      </span>
                    </div>

                    <div
                      style={{
                        width: '100%',
                        height: '6px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '999px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, item.attendanceRate)}%`,
                          height: '100%',
                          background:
                            item.attendanceRate >= 80
                              ? 'linear-gradient(90deg, var(--google-green), #48BB78)'
                              : 'linear-gradient(90deg, var(--google-blue), #60A5FA)',
                          borderRadius: '999px',
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                        marginTop: '0.4rem',
                      }}
                    >
                      <span>
                        Attended: <strong style={{ color: 'var(--text-primary)' }}>{item.eventsAttended}</strong> / {item.eventsEligible} events
                      </span>
                      <span>{item.departmentName || 'Executive'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Filter Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Search Box */}
          <div
            style={{
              position: 'relative',
              flex: '1 1 260px',
              minWidth: '220px',
            }}
          >
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search by name, email, position, or committee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.5rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(0, 0, 0, 0.25)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Filter Dropdowns */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              alignItems: 'center',
            }}
          >
            {/* Branch Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              style={{
                padding: '0.65rem 0.9rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(0, 0, 0, 0.35)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Branches</option>
              <option value="tech">Tech Branch</option>
              <option value="non_tech">Non-Tech Branch</option>
            </select>

            {/* Department Filter */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{
                padding: '0.65rem 0.9rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(0, 0, 0, 0.35)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Committees</option>
              {initialSummary.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>

            {/* Role Filter */}
            <select
              value={selectedRoleCategory}
              onChange={(e) => setSelectedRoleCategory(e.target.value)}
              style={{
                padding: '0.65rem 0.9rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(0, 0, 0, 0.35)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Roles</option>
              <option value="presidential">Presidency (President / Co-Pres)</option>
              <option value="branch_heads">Branch Leadership (Branch Heads)</option>
              <option value="committee_heads">Committee Heads &amp; Co-Heads</option>
              <option value="members">Members</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: '0.65rem 0.9rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(0, 0, 0, 0.35)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="rate">Sort: Attendance Rate (%)</option>
              <option value="events">Sort: Total Events Attended</option>
              <option value="name">Sort: Full Name (A-Z)</option>
            </select>
          </div>
        </div>

        <div
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredEntries.length}</strong> of{' '}
            {initialSummary.totalProfiles} chapter profiles
          </span>
          {(selectedBranch !== 'all' ||
            selectedDept !== 'all' ||
            selectedRoleCategory !== 'all' ||
            searchQuery.trim()) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedBranch('all');
                setSelectedDept('all');
                setSelectedRoleCategory('all');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--google-blue)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 4. Leaderboard Table */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.86rem',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 800,
                }}
              >
                <th style={{ padding: '1rem 1.25rem', width: '75px', textAlign: 'center' }}>Rank</th>
                <th style={{ padding: '1rem 1.25rem' }}>Chapter Member</th>
                <th style={{ padding: '1rem 1.25rem' }}>Role</th>
                <th style={{ padding: '1rem 1.25rem' }}>Committee &amp; Branch</th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>Events Attended</th>
                <th style={{ padding: '1rem 1.25rem', minWidth: '160px' }}>Attendance Rate</th>
                <th style={{ padding: '1rem 1.25rem', width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: '3.5rem 1.5rem',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <Users size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                    <div style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--text-secondary)' }}>
                      No profiles match the selected filters
                    </div>
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
                      Try adjusting your search query, committee, or role selection.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, idx) => {
                  const medal = getRankMedal(idx + 1);
                  const roleBadge = getRoleBadge(entry.role);

                  return (
                    <tr
                      key={entry.profileId}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Rank */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            fontWeight: 900,
                            fontSize: '0.84rem',
                            background: medal.bg,
                            color: medal.color,
                            border: medal.border,
                            margin: '0 auto',
                          }}
                        >
                          {medal.icon || idx + 1}
                        </div>
                      </td>

                      {/* Chapter Member */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              background: 'rgba(255, 255, 255, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              color: '#FFFFFF',
                              overflow: 'hidden',
                              flexShrink: 0,
                            }}
                          >
                            {entry.avatarUrl ? (
                              <img
                                src={entry.avatarUrl}
                                alt={entry.fullName}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              entry.fullName.charAt(0).toUpperCase()
                            )}
                          </div>

                          <div>
                            <Link
                              href={`/members/${entry.profileId}`}
                              style={{
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                              }}
                            >
                              {entry.fullName}
                              {entry.fullNameAr && (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  ({entry.fullNameAr})
                                </span>
                              )}
                            </Link>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {entry.position || entry.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: roleBadge.bg,
                            color: roleBadge.color,
                            border: `1px solid ${roleBadge.border}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {roleBadge.label}
                        </span>
                      </td>

                      {/* Committee & Branch */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {entry.departmentName || '—'}
                          </div>
                          {entry.branch && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                color: entry.branch === 'tech' ? 'var(--google-blue)' : '#14B8A6',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                              }}
                            >
                              {entry.branch === 'tech' ? 'Tech Branch' : 'Non-Tech Branch'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Events Attended */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {entry.eventsAttended}{' '}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            / {entry.eventsEligible}
                          </span>
                        </div>
                      </td>

                      {/* Attendance Rate */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '0.8rem',
                              fontWeight: 800,
                            }}
                          >
                            <span
                              style={{
                                color:
                                  entry.attendanceRate >= 80
                                    ? 'var(--google-green)'
                                    : entry.attendanceRate >= 50
                                    ? 'var(--google-blue)'
                                    : 'var(--google-yellow)',
                              }}
                            >
                              {entry.attendanceRate}%
                            </span>
                          </div>
                          <div
                            style={{
                              width: '100%',
                              height: '6px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              borderRadius: '999px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, entry.attendanceRate)}%`,
                                height: '100%',
                                background:
                                  entry.attendanceRate >= 80
                                    ? 'linear-gradient(90deg, var(--google-green), #48BB78)'
                                    : entry.attendanceRate >= 50
                                    ? 'linear-gradient(90deg, var(--google-blue), #60A5FA)'
                                    : 'linear-gradient(90deg, var(--google-yellow), #ECC94B)',
                                borderRadius: '999px',
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Profile Link Action */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <Link
                          href={`/members/${entry.profileId}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            color: 'var(--text-secondary)',
                            textDecoration: 'none',
                            transition: 'all 0.15s ease',
                          }}
                          title="View Profile"
                        >
                          <ChevronRight size={15} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
