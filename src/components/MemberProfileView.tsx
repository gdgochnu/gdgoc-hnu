'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserRole, ProfileStatus, PerformanceReview, Certificate } from '@/types';
import { MemberPerformanceTab } from '@/components/profile/MemberPerformanceTab';
import { MemberCertificatesTab } from '@/components/profile/MemberCertificatesTab';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  ExternalLink, 
  Building2, 
  GraduationCap, 
  Calendar, 
  Clock, 
  Award, 
  FileText, 
  User, 
  Sparkles,
  BarChart3,
  ShieldAlert,
  ShieldCheck,
  Linkedin,
  Facebook,
  Instagram,
  Globe,
  IdCard,
  BookOpen
} from 'lucide-react';

export interface MemberProfileData {
  id: string;
  full_name: string;
  full_name_ar?: string | null;
  full_name_en?: string | null;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  whatsapp_number?: string | null;
  national_id?: string | null;
  university_id: string | null;
  faculty: string | null;
  department_major?: string | null;
  academic_year: string | number | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  role: UserRole;
  position: string | null;
  skills: string[] | null;
  portfolio_url: string | null;
  motivation: string | null;
  how_heard: string | null;
  availability_hours: number | null;
  status: ProfileStatus;
  join_date: string | null;
  overall_score?: number | null;
  attendance_rate?: number | null;
  created_at: string;
  department?: {
    id: string;
    name: string;
    code: string;
    branch: string;
    description: string | null;
  } | null;
}

interface MemberProfileViewProps {
  member: MemberProfileData;
  callerRole?: string;
  callerId?: string;
  canViewNationalId?: boolean;
  performanceReviews?: PerformanceReview[];
  certificates?: Certificate[];
  eventsAttendedCount?: number;
  totalCompletedEventsCount?: number;
}

export function MemberProfileView({
  member,
  callerRole,
  callerId,
  canViewNationalId = false,
  performanceReviews = [],
  certificates = [],
  eventsAttendedCount = 0,
  totalCompletedEventsCount = 0,
}: MemberProfileViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'performance' | 'certificates'>('overview');

  const isTech = member.department?.branch === 'tech';
  const isSuspended = member.status === 'suspended';

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

  const getAcademicYearLabel = (year: string | number | null) => {
    if (!year) return 'Not specified';
    const num = Number(year);
    switch (num) {
      case 1:
        return '1st Year (الفرقة الأولى)';
      case 2:
        return '2nd Year (الفرقة الثانية)';
      case 3:
        return '3rd Year (الفرقة الثالثة)';
      case 4:
        return '4th Year (الفرقة الرابعة)';
      case 5:
        return '5th Year (الفرقة الخامسة)';
      default:
        return `Year ${year}`;
    }
  };

  const roleBadge = getRoleBadge(member.role);
  const primaryName = member.full_name_en || member.full_name;
  const secondaryName = member.full_name_ar;
  const whatsappContact = member.whatsapp_number || member.phone;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Back Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link
          href="/members"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
            transition: 'color 0.2s',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Members Directory</span>
        </Link>

        {member.id === callerId ? (
          <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)' }}>
            Your Profile
          </span>
        ) : null}
      </div>

      {/* Hero Profile Banner */}
      <div className="glass-panel" style={{
        padding: '2.5rem 2rem',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}>
        {/* Top Google 4-Color Accent Strip */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: isSuspended 
            ? 'var(--google-red)' 
            : 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
        }} />

        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}>
          {/* Identity Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.3), rgba(52, 168, 83, 0.3))',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.2rem',
              fontWeight: 800,
              color: '#FFFFFF',
              flexShrink: 0,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            }}>
              {member.avatar_url ? (
                <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                primaryName?.charAt(0) || 'M'
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                  {primaryName}
                </h1>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px',
                  background: roleBadge.bg,
                  color: roleBadge.color,
                  border: `1px solid ${roleBadge.border}`,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {roleBadge.label}
                </span>
                {isSuspended ? (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.65rem',
                    borderRadius: '999px',
                    background: 'rgba(234, 67, 53, 0.2)',
                    color: '#FCA5A5',
                    border: '1px solid rgba(234, 67, 53, 0.4)',
                  }}>
                    Suspended
                  </span>
                ) : null}
              </div>

              {/* Dual Arabic Name */}
              {secondaryName && (
                <div style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  marginTop: '0.25rem',
                  fontFamily: 'inherit',
                  letterSpacing: '0.01em',
                }}>
                  {secondaryName}
                </div>
              )}

              <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.35rem' }}>
                {member.position || (member.department ? `Member of ${member.department.name}` : 'General Chapter Member')}
              </div>

              {member.department ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  <Building2 size={15} color={isTech ? 'var(--google-blue)' : 'var(--google-green)'} />
                  <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{member.department.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>• {isTech ? 'Tech Branch' : 'Non-Tech Branch'}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Quick Contact & Social Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {member.email ? (
              <a
                href={`mailto:${member.email}`}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 0.95rem', fontSize: '0.85rem' }}
                title="Send Email"
              >
                <Mail size={15} color="var(--google-blue)" />
                <span>Email</span>
              </a>
            ) : null}

            {whatsappContact ? (
              <a
                href={`https://wa.me/${whatsappContact.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 0.95rem', fontSize: '0.85rem', borderColor: 'rgba(52, 168, 83, 0.3)' }}
                title="Message on WhatsApp"
              >
                <Phone size={15} color="var(--google-green)" />
                <span style={{ color: '#86EFAC' }}>WhatsApp</span>
              </a>
            ) : null}

            {member.linkedin_url ? (
              <a
                href={member.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 0.95rem', fontSize: '0.85rem', borderColor: 'rgba(66, 133, 244, 0.3)' }}
                title="LinkedIn Profile"
              >
                <Linkedin size={15} color="var(--google-blue)" />
                <span style={{ color: '#93C5FD' }}>LinkedIn</span>
              </a>
            ) : null}

            {member.facebook_url ? (
              <a
                href={member.facebook_url}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 0.95rem', fontSize: '0.85rem' }}
                title="Facebook Profile"
              >
                <Facebook size={15} color="#60A5FA" />
                <span>Facebook</span>
              </a>
            ) : null}

            {member.instagram_url ? (
              <a
                href={member.instagram_url}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 0.95rem', fontSize: '0.85rem' }}
                title="Instagram Profile"
              >
                <Instagram size={15} color="#F472B6" />
                <span>Instagram</span>
              </a>
            ) : null}

            {member.portfolio_url ? (
              <a
                href={member.portfolio_url}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.15rem', fontSize: '0.85rem' }}
              >
                <span>Portfolio</span>
                <ExternalLink size={14} />
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '0.5rem',
        overflowX: 'auto',
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'overview' ? 'rgba(66, 133, 244, 0.15)' : 'transparent',
            color: activeTab === 'overview' ? '#93C5FD' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            borderBottom: activeTab === 'overview' ? '2px solid var(--google-blue)' : '2px solid transparent',
            whiteSpace: 'nowrap',
          }}
        >
          <User size={16} color={activeTab === 'overview' ? 'var(--google-blue)' : 'currentColor'} />
          <span>Overview & Bio</span>
        </button>

        <button
          onClick={() => setActiveTab('skills')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'skills' ? 'rgba(52, 168, 83, 0.15)' : 'transparent',
            color: activeTab === 'skills' ? '#86EFAC' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            borderBottom: activeTab === 'skills' ? '2px solid var(--google-green)' : '2px solid transparent',
            whiteSpace: 'nowrap',
          }}
        >
          <Sparkles size={16} color={activeTab === 'skills' ? 'var(--google-green)' : 'currentColor'} />
          <span>Skills & Portfolio</span>
        </button>

        <button
          onClick={() => setActiveTab('performance')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'performance' ? 'rgba(251, 188, 4, 0.15)' : 'transparent',
            color: activeTab === 'performance' ? '#FDE047' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            borderBottom: activeTab === 'performance' ? '2px solid var(--google-yellow)' : '2px solid transparent',
            whiteSpace: 'nowrap',
          }}
        >
          <BarChart3 size={16} color={activeTab === 'performance' ? 'var(--google-yellow)' : 'currentColor'} />
          <span>Performance & Attendance</span>
        </button>

        <button
          onClick={() => setActiveTab('certificates')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'certificates' ? 'rgba(234, 67, 53, 0.15)' : 'transparent',
            color: activeTab === 'certificates' ? '#FCA5A5' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            borderBottom: activeTab === 'certificates' ? '2px solid var(--google-red)' : '2px solid transparent',
            whiteSpace: 'nowrap',
          }}
        >
          <Award size={16} color={activeTab === 'certificates' ? 'var(--google-red)' : 'currentColor'} />
          <span>Certificates & Badges</span>
        </button>
      </div>

      {/* Tab 1: Overview & Academic Info */}
      {activeTab === 'overview' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Academic & University Card */}
          <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCap size={18} color="var(--google-blue)" />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Academic Details</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600 }}>
                  Faculty / College
                </div>
                <div style={{ color: '#FFFFFF', fontWeight: 700, marginTop: '2px' }}>
                  {member.faculty || 'Not specified'}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600 }}>
                  Department / Major
                </div>
                <div style={{ color: '#FFFFFF', fontWeight: 700, marginTop: '2px' }}>
                  {member.department_major || 'General / Unspecified'}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600 }}>
                  Academic Year
                </div>
                <div style={{ color: '#FFFFFF', fontWeight: 700, marginTop: '2px' }}>
                  {getAcademicYearLabel(member.academic_year)}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600 }}>
                  Student / University ID
                </div>
                <div style={{ color: '#FFFFFF', fontWeight: 700, marginTop: '2px', fontFamily: 'monospace' }}>
                  {member.university_id || 'Not specified'}
                </div>
              </div>

              {/* National ID with Security Gate */}
              <div style={{
                padding: '0.85rem',
                borderRadius: '10px',
                background: canViewNationalId ? 'rgba(52, 168, 83, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                border: canViewNationalId ? '1px solid rgba(52, 168, 83, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <IdCard size={14} color={canViewNationalId ? 'var(--google-green)' : 'var(--text-muted)'} />
                    <span>National ID (الرقم القومي)</span>
                  </div>

                  {canViewNationalId ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#86EFAC',
                      background: 'rgba(52, 168, 83, 0.15)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '999px',
                    }}>
                      <ShieldCheck size={12} />
                      <span>Authorized View</span>
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      background: 'rgba(255, 255, 255, 0.06)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '999px',
                    }}>
                      <ShieldAlert size={12} />
                      <span>Confidential</span>
                    </span>
                  )}
                </div>

                {canViewNationalId ? (
                  <div style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '1rem', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
                    {member.national_id || 'Not provided'}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', letterSpacing: '0.15em', fontStyle: 'italic' }}>
                    •••••••••••••• (HR / President Gated)
                  </div>
                )}
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600 }}>
                  Weekly Availability
                </div>
                <div style={{ color: '#FFFFFF', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={15} color="var(--google-green)" />
                  <span>{member.availability_hours ? `${member.availability_hours} hours / week` : 'Not specified'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Membership & Motivation Card */}
          <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(52, 168, 83, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={18} color="var(--google-green)" />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Chapter Journey & Motivation</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600 }}>
                  Why GDGoC HNU? (Motivation)
                </div>
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '4px', fontStyle: 'italic' }}>
                  "{member.motivation || 'Dedicated to learning, contributing, and building alongside the community.'}"
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600 }}>
                  Member Since
                </div>
                <div style={{ color: '#FFFFFF', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={15} color="var(--google-yellow)" />
                  <span>{new Date(member.join_date || member.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>

              {member.how_heard ? (
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600 }}>
                    Referred / Discovered Via
                  </div>
                  <div style={{ color: '#FFFFFF', fontWeight: 600, marginTop: '2px' }}>
                    {member.how_heard}
                  </div>
                </div>
              ) : null}

              {/* Social Channels Quick List */}
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Social & Professional Profiles
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {member.linkedin_url && (
                    <a
                      href={member.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.78rem',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '6px',
                        background: 'rgba(66, 133, 244, 0.1)',
                        color: '#93C5FD',
                        textDecoration: 'none',
                        border: '1px solid rgba(66, 133, 244, 0.25)',
                      }}
                    >
                      <Linkedin size={13} />
                      <span>LinkedIn</span>
                    </a>
                  )}
                  {member.facebook_url && (
                    <a
                      href={member.facebook_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.78rem',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-secondary)',
                        textDecoration: 'none',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <Facebook size={13} />
                      <span>Facebook</span>
                    </a>
                  )}
                  {member.instagram_url && (
                    <a
                      href={member.instagram_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.78rem',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-secondary)',
                        textDecoration: 'none',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <Instagram size={13} />
                      <span>Instagram</span>
                    </a>
                  )}
                  {member.portfolio_url && (
                    <a
                      href={member.portfolio_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.78rem',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '6px',
                        background: 'rgba(52, 168, 83, 0.1)',
                        color: '#86EFAC',
                        textDecoration: 'none',
                        border: '1px solid rgba(52, 168, 83, 0.25)',
                      }}
                    >
                      <Globe size={13} />
                      <span>Portfolio</span>
                    </a>
                  )}
                  {!member.linkedin_url && !member.facebook_url && !member.instagram_url && !member.portfolio_url && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No external links linked</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab 2: Skills & Technical Portfolio */}
      {activeTab === 'skills' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Skills Cloud */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Technical & Soft Skills</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Technologies, frameworks, and core domain competencies declared by the member.
            </p>

            {member.skills && member.skills.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {member.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      padding: '0.4rem 0.9rem',
                      borderRadius: '8px',
                      background: 'rgba(66, 133, 244, 0.12)',
                      border: '1px solid rgba(66, 133, 244, 0.25)',
                      color: '#93C5FD',
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No skills listed yet.</p>
            )}
          </div>

          {/* Portfolio & Links */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Portfolio & Online Presence</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              External profiles, code repositories, and work showcases.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {member.portfolio_url ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>Personal Portfolio / Link</div>
                    <div style={{ color: 'var(--google-blue)', fontSize: '0.85rem', wordBreak: 'break-all', marginTop: '2px' }}>
                      {member.portfolio_url}
                    </div>
                  </div>

                  <a
                    href={member.portfolio_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
                  >
                    <span>Open Link</span>
                    <ExternalLink size={15} />
                  </a>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No portfolio link submitted.</p>
              )}

              {/* LinkedIn Row */}
              {member.linkedin_url && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Linkedin size={18} color="var(--google-blue)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>LinkedIn Profile</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                        {member.linkedin_url}
                      </div>
                    </div>
                  </div>

                  <a
                    href={member.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.15rem', fontSize: '0.85rem' }}
                  >
                    <span>View LinkedIn</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab 3: Performance & Attendance (Spec §4.6 - Trend Chart + Attendance Rate) */}
      {activeTab === 'performance' ? (
        <MemberPerformanceTab
          member={member}
          reviews={performanceReviews}
          eventsAttendedCount={eventsAttendedCount}
          totalCompletedEventsCount={totalCompletedEventsCount}
        />
      ) : null}

      {/* Tab 4: Certificates (Spec §4.6 & §4.14 - Verifiable Certificates Tab) */}
      {activeTab === 'certificates' ? (
        <MemberCertificatesTab
          certificates={certificates}
          memberName={primaryName}
        />
      ) : null}
    </div>
  );
}
