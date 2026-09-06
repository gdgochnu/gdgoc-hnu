'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { UserRole } from '@/types';
import { 
  Search, 
  Filter, 
  Users, 
  Building2, 
  Mail, 
  Phone, 
  ExternalLink, 
  GraduationCap, 
  Sparkles, 
  Layers, 
  ArrowUpDown, 
  ChevronRight,
  UserCheck,
  Tag
} from 'lucide-react';

export interface DirectoryMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  university_id: string | null;
  faculty: string | null;
  academic_year: string | null;
  role: UserRole;
  position: string | null;
  skills: string[] | null;
  portfolio_url: string | null;
  department_id: string | null;
  join_date: string | null;
  departments?: {
    id: string;
    name: string;
    code: string;
    branch: string;
  } | null;
}

export interface DirectoryDepartment {
  id: string;
  name: string;
  code: string;
  branch: string;
}

interface MembersDirectoryClientProps {
  initialMembers: DirectoryMember[];
  departments: DirectoryDepartment[];
  currentUserRole?: string;
}

export function MembersDirectoryClient({
  initialMembers,
  departments,
  currentUserRole,
}: MembersDirectoryClientProps) {
  const [members] = useState<DirectoryMember[]>(initialMembers);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<'all' | 'tech' | 'non_tech'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'newest' | 'committee'>('name');

  // Filter and sort members
  const filteredMembers = useMemo(() => {
    let result = members.filter((m) => {
      // Branch filter
      if (branchFilter !== 'all') {
        const branch = m.departments?.branch;
        if (branch !== branchFilter) return false;
      }
      // Department filter
      if (deptFilter !== 'all' && m.department_id !== deptFilter) {
        return false;
      }
      // Role filter
      if (roleFilter !== 'all' && m.role !== roleFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = m.full_name?.toLowerCase().includes(q);
        const matchesEmail = m.email?.toLowerCase().includes(q);
        const matchesUniId = m.university_id?.toLowerCase().includes(q);
        const matchesPosition = m.position?.toLowerCase().includes(q);
        const matchesFaculty = m.faculty?.toLowerCase().includes(q);
        const matchesSkills = m.skills?.some((s) => s.toLowerCase().includes(q));

        if (!matchesName && !matchesEmail && !matchesUniId && !matchesPosition && !matchesFaculty && !matchesSkills) {
          return false;
        }
      }
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return (a.full_name || '').localeCompare(b.full_name || '');
      }
      if (sortBy === 'newest') {
        return new Date(b.join_date || 0).getTime() - new Date(a.join_date || 0).getTime();
      }
      if (sortBy === 'committee') {
        return (a.departments?.name || '').localeCompare(b.departments?.name || '');
      }
      return 0;
    });

    return result;
  }, [members, searchQuery, deptFilter, branchFilter, roleFilter, sortBy]);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'president':
        return { label: 'President', bg: 'rgba(66, 133, 244, 0.2)', color: '#93C5FD', border: 'rgba(66, 133, 244, 0.4)' };
      case 'co_president':
        return { label: 'Co-President', bg: 'rgba(251, 188, 4, 0.2)', color: '#FDE047', border: 'rgba(251, 188, 4, 0.4)' };
      case 'branch_head':
        return { label: 'Branch Head', bg: 'rgba(52, 168, 83, 0.2)', color: '#86EFAC', border: 'rgba(52, 168, 83, 0.4)' };
      case 'committee_head':
        return { label: 'Committee Head', bg: 'rgba(52, 168, 83, 0.2)', color: '#86EFAC', border: 'rgba(52, 168, 83, 0.4)' };
      case 'committee_co_head':
        return { label: 'Co-Head', bg: 'rgba(52, 168, 83, 0.15)', color: '#86EFAC', border: 'rgba(52, 168, 83, 0.3)' };
      default:
        return { label: 'Member', bg: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)', border: 'rgba(255, 255, 255, 0.15)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Stat Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} color="var(--google-blue)" />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Visible Members</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF' }}>{filteredMembers.length}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(52, 168, 83, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={20} color="var(--google-green)" />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Departments</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#86EFAC' }}>{departments.length}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(251, 188, 4, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} color="var(--google-yellow)" />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Leadership Roster</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FDE047' }}>
              {members.filter((m) => m.role !== 'member').length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Top Search Input */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by member name, email, student ID, position, or skills (e.g. React, Python)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '3rem', height: '48px', width: '100%', fontSize: '0.95rem' }}
          />
        </div>

        {/* Filter Controls Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Department Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Filter size={15} color="var(--google-blue)" />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="input-field"
                style={{ height: '40px', fontSize: '0.85rem' }}
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch Filter */}
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value as 'all' | 'tech' | 'non_tech')}
              className="input-field"
              style={{ height: '40px', fontSize: '0.85rem' }}
            >
              <option value="all">All Branches</option>
              <option value="tech">Tech Branch</option>
              <option value="non_tech">Non-Tech Branch</option>
            </select>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-field"
              style={{ height: '40px', fontSize: '0.85rem' }}
            >
              <option value="all">All Roles</option>
              <option value="president">President</option>
              <option value="co_president">Co-President</option>
              <option value="branch_head">Branch Head</option>
              <option value="committee_head">Committee Head</option>
              <option value="committee_co_head">Committee Co-Head</option>
              <option value="member">Member</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowUpDown size={15} color="var(--text-muted)" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="input-field"
              style={{ height: '40px', fontSize: '0.85rem' }}
            >
              <option value="name">Sort by Name (A-Z)</option>
              <option value="newest">Sort by Join Date</option>
              <option value="committee">Sort by Department</option>
            </select>
          </div>
        </div>
      </div>

      {/* Members Directory Grid */}
      {filteredMembers.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <Users size={44} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No members match your criteria</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Try broadening your search keywords or resetting your department filters.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {filteredMembers.map((m) => {
            const roleBadge = getRoleBadge(m.role);
            const isTech = m.departments?.branch === 'tech';

            return (
              <div
                key={m.id}
                className="glass-panel"
                style={{
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.2s, border-color 0.2s',
                }}
              >
                {/* Top Accent Strip */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: isTech ? 'var(--google-blue)' : 'var(--google-green)',
                  }}
                />

                {/* Profile Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.25), rgba(52, 168, 83, 0.25))',
                      border: '1.5px solid rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      flexShrink: 0,
                    }}>
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        m.full_name?.charAt(0) || 'M'
                      )}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                        {m.full_name}
                      </h3>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {m.position || m.departments?.name || 'Chapter Member'}
                      </div>
                    </div>
                  </div>

                  {/* Role Badge */}
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      background: roleBadge.bg,
                      color: roleBadge.color,
                      border: `1px solid ${roleBadge.border}`,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      flexShrink: 0,
                    }}
                  >
                    {roleBadge.label}
                  </span>
                </div>

                {/* Department Badge */}
                {m.departments ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    background: isTech ? 'rgba(66, 133, 244, 0.08)' : 'rgba(52, 168, 83, 0.08)',
                    border: isTech ? '1px solid rgba(66, 133, 244, 0.2)' : '1px solid rgba(52, 168, 83, 0.2)',
                    fontSize: '0.82rem',
                    color: isTech ? '#93C5FD' : '#86EFAC',
                    fontWeight: 600,
                  }}>
                    <Building2 size={14} />
                    <span>{m.departments.name}</span>
                    <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>• {isTech ? 'Tech' : 'Non-Tech'}</span>
                  </div>
                ) : null}

                {/* University Info */}
                {m.university_id || m.faculty ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <GraduationCap size={15} color="var(--google-yellow)" />
                    <span>{m.faculty || 'University Student'} {m.academic_year ? `• Year ${m.academic_year}` : ''}</span>
                  </div>
                ) : null}

                {/* Skills Tags */}
                {m.skills && m.skills.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                    {m.skills.slice(0, 4).map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                    {m.skills.length > 4 ? (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0.15rem 0.35rem' }}>
                        +{m.skills.length - 4}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {/* Contacts & External Links */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  marginTop: 'auto',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: '0.82rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    {m.email ? (
                      <a
                        href={`mailto:${m.email}`}
                        style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                        title={`Email ${m.email}`}
                      >
                        <Mail size={16} />
                      </a>
                    ) : null}

                    {m.phone ? (
                      <a
                        href={`https://wa.me/${m.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                        title={`WhatsApp ${m.phone}`}
                      >
                        <Phone size={16} />
                      </a>
                    ) : null}

                    {m.portfolio_url ? (
                      <a
                        href={m.portfolio_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--google-blue)', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                        title="View Portfolio / Profile Link"
                      >
                        <ExternalLink size={16} />
                      </a>
                    ) : null}
                  </div>

                  {/* Profile Link */}
                  <Link
                    href={`/members/${m.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: 'var(--google-blue)',
                      textDecoration: 'none',
                    }}
                  >
                    <span>View Profile</span>
                    <ChevronRight size={14} />
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
