'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  GraduationCap, 
  Search, 
  Filter, 
  Building2, 
  Calendar, 
  Award, 
  CheckSquare, 
  FileText, 
  Clock, 
  RotateCcw, 
  Loader2, 
  UserCheck, 
  ArrowLeft,
  Mail,
  Phone,
  Sparkles,
  Info
} from 'lucide-react';
import { reactivateFromAlumni } from '@/app/approvals/actions';
import { UserRole } from '@/types';

export interface AlumnusItem {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  position: string | null;
  department_id: string | null;
  join_date: string | null;
  left_at: string | null;
  leave_reason: string | null;
  skills: string[];
  department?: {
    id: string;
    name: string;
    code: string;
    branch: string;
  } | null;
  stats: {
    tasksCompleted: number;
    badgesCount: number;
    certificatesCount: number;
    eventsAttended: number;
  };
}

interface AlumniDirectoryClientProps {
  initialAlumni: AlumnusItem[];
  departments: Array<{ id: string; name: string; code: string; branch: string }>;
  currentUserRole?: string;
  currentUserId?: string;
}

function calculateTenure(joinDateStr: string | null, leftAtStr: string | null): string {
  if (!joinDateStr) return 'Past Contributor';
  const start = new Date(joinDateStr);
  const end = leftAtStr ? new Date(leftAtStr) : new Date();

  const diffMonths = Math.max(
    1,
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  );

  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (diffMonths < 12) {
    return `${startYear} (${diffMonths} mo${diffMonths > 1 ? 's' : ''})`;
  }

  const years = Math.floor(diffMonths / 12);
  const remainingMonths = diffMonths % 12;

  let tenureStr = `${years} yr${years > 1 ? 's' : ''}`;
  if (remainingMonths > 0) {
    tenureStr += ` ${remainingMonths} mo${remainingMonths > 1 ? 's' : ''}`;
  }

  return `${startYear} – ${endYear} (${tenureStr})`;
}

export function AlumniDirectoryClient({
  initialAlumni,
  departments,
  currentUserRole,
}: AlumniDirectoryClientProps) {
  const [alumni, setAlumni] = useState<AlumnusItem[]>(initialAlumni);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [reactivateModalAlumnus, setReactivateModalAlumnus] = useState<AlumnusItem | null>(null);
  const [isReactivating, setIsReactivating] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const isPresident = currentUserRole === 'president' || currentUserRole === 'co_president';

  const filteredAlumni = useMemo(() => {
    return alumni.filter((a) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        a.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.position && a.position.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (a.leave_reason && a.leave_reason.toLowerCase().includes(searchQuery.toLowerCase())) ||
        a.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDept = deptFilter === 'all' || a.department_id === deptFilter;

      return matchesSearch && matchesDept;
    });
  }, [alumni, searchQuery, deptFilter]);

  const handleConfirmReactivate = async () => {
    if (!reactivateModalAlumnus) return;

    try {
      setIsReactivating(true);
      const res = await reactivateFromAlumni(reactivateModalAlumnus.id);
      if (res.success) {
        setAlumni((prev) => prev.filter((a) => a.id !== reactivateModalAlumnus.id));
        setActionSuccessMessage(`Successfully reactivated ${reactivateModalAlumnus.full_name} back to active member roster.`);
        setReactivateModalAlumnus(null);
      } else {
        alert(res.error || 'Failed to reactivate alumnus.');
      }
    } catch (err: any) {
      alert(err.message || 'Error executing reactivation');
    } finally {
      setIsReactivating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Banner & Return link */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <Link
          href="/members"
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Active Members Directory</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Total Alumni Archived: <strong style={{ color: '#FFFFFF' }}>{alumni.length}</strong>
          </span>
        </div>
      </div>

      {actionSuccessMessage && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            background: 'rgba(52, 168, 83, 0.15)',
            border: '1px solid rgba(52, 168, 83, 0.4)',
            color: '#86EFAC',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.9rem',
          }}
        >
          <Sparkles size={18} />
          <span>{actionSuccessMessage}</span>
          <button
            onClick={() => setActionSuccessMessage(null)}
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#86EFAC', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search
            size={18}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Search alumni by name, email, skills, or leave reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.85rem',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(0, 0, 0, 0.25)',
              color: '#FFFFFF',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} color="var(--text-muted)" />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(26, 32, 44, 0.95)',
              color: '#FFFFFF',
              fontSize: '0.9rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Committees</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alumni Cards Grid */}
      {filteredAlumni.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(66, 133, 244, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <GraduationCap size={28} color="var(--google-blue)" />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, marginBottom: '0.5rem', color: '#FFFFFF' }}>
            No Alumni Profiles Found
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '450px', margin: '0 auto' }}>
            {searchQuery || deptFilter !== 'all'
              ? 'No alumni match your current search or committee filter criteria.'
              : 'As chapter members conclude their active tenure, their preserved records and achievements will be showcased here.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem' }}>
          {filteredAlumni.map((alumnus) => {
            const tenure = calculateTenure(alumnus.join_date, alumnus.left_at);

            return (
              <div
                key={alumnus.id}
                className="glass-panel"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.1rem',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(26, 32, 44, 0.8))',
                  borderRadius: '16px',
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
                    background: 'linear-gradient(90deg, #4285F4, #FBBC04)',
                  }}
                />

                {/* Profile Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.25), rgba(251, 188, 4, 0.25))',
                      border: '2px solid rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}
                  >
                    {alumnus.avatar_url ? (
                      <img src={alumnus.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      alumnus.full_name?.charAt(0) || 'A'
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                        {alumnus.full_name}
                      </h4>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          background: 'rgba(251, 188, 4, 0.15)',
                          color: '#FDE047',
                          border: '1px solid rgba(251, 188, 4, 0.3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <GraduationCap size={12} />
                        ALUMNI
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {alumnus.position || alumnus.role.replace('_', ' ')} • {alumnus.department?.name || 'General Chapter'}
                    </div>

                    {/* Tenure Badge */}
                    <div
                      style={{
                        marginTop: '0.4rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <Clock size={12} />
                      <span>{tenure}</span>
                    </div>
                  </div>
                </div>

                {/* Leave Reason Banner */}
                {alumnus.leave_reason && (
                  <div
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Departure Note: </span>
                    "{alumnus.leave_reason}"
                  </div>
                )}

                {/* Historical Contribution Stats Grid */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Historical Record & Achievements
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                    <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <CheckSquare size={14} color="var(--google-blue)" style={{ margin: '0 auto 0.2rem' }} />
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#93C5FD' }}>{alumnus.stats.tasksCompleted}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Tasks Done</div>
                    </div>

                    <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <Award size={14} color="var(--google-yellow)" style={{ margin: '0 auto 0.2rem' }} />
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FDE047' }}>{alumnus.stats.badgesCount}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Badges</div>
                    </div>

                    <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <FileText size={14} color="var(--google-green)" style={{ margin: '0 auto 0.2rem' }} />
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#86EFAC' }}>{alumnus.stats.certificatesCount}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Certificates</div>
                    </div>

                    <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <Calendar size={14} color="var(--google-red)" style={{ margin: '0 auto 0.2rem' }} />
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FCA5A5' }}>{alumnus.stats.eventsAttended}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Events</div>
                    </div>
                  </div>
                </div>

                {/* Skills tags */}
                {alumnus.skills && alumnus.skills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {alumnus.skills.slice(0, 4).map((skill, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-secondary)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                    {alumnus.skills.length > 4 && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                        +{alumnus.skills.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* President Action: Reactivate Alumnus */}
                {isPresident && (
                  <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <button
                      onClick={() => setReactivateModalAlumnus(alumnus)}
                      className="btn-secondary"
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        fontSize: '0.82rem',
                        padding: '0.5rem',
                        borderColor: 'rgba(66, 133, 244, 0.35)',
                        color: '#93C5FD',
                      }}
                    >
                      <RotateCcw size={14} />
                      <span>Reactivate to Active Member</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reactivate Confirmation Modal */}
      {reactivateModalAlumnus && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '2rem',
              borderRadius: '16px',
              background: '#1A202C',
              border: '1px solid rgba(66, 133, 244, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCheck size={22} color="var(--google-blue)" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF' }}>
                  Reactivate Member?
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Restore {reactivateModalAlumnus.full_name} to active chapter status.
                </p>
              </div>
            </div>

            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                background: 'rgba(66, 133, 244, 0.08)',
                border: '1px solid rgba(66, 133, 244, 0.2)',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}
            >
              According to Spec §4.16, reactivating restores active login access and assigns tasks/events while completely preserving historical accomplishments, points, and badges.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setReactivateModalAlumnus(null)}
                disabled={isReactivating}
                className="btn-secondary"
                style={{ padding: '0.6rem 1.25rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReactivate}
                disabled={isReactivating}
                className="btn-primary"
                style={{ padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
              >
                {isReactivating ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                <span>Confirm Reactivation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
