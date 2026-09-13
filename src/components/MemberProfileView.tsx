'use client';

import React, { useState } from 'react';
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
  BookOpen,
  Pencil,
  Sliders,
} from 'lucide-react';
import { EditProfileModal, getPlatformIcon } from '@/components/profile/EditProfileModal';
import { EditMemberPositionModal } from '@/components/profile/EditMemberPositionModal';

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
  custom_fields?: {
    social_links?: Array<{ platform: string; label: string; url: string }>;
    [key: string]: any;
  } | null;
}

interface MemberProfileViewProps {
  member: MemberProfileData;
  callerRole?: string;
  callerId?: string;
  callerDepartmentId?: string | null;
  callerBranch?: string | null;
  canViewNationalId?: boolean;
  performanceReviews?: PerformanceReview[];
  certificates?: Certificate[];
  eventsAttendedCount?: number;
  totalCompletedEventsCount?: number;
  facultyOptions?: Array<{ id: string; name_ar: string; name_en: string }>;
  isDedicatedProfilePage?: boolean;
  departments?: Array<{ id: string; name: string; code: string; branch: string }>;
}

export function MemberProfileView({
  member: initialMember,
  callerRole,
  callerId,
  callerDepartmentId,
  callerBranch,
  canViewNationalId = false,
  performanceReviews = [],
  certificates = [],
  eventsAttendedCount = 0,
  totalCompletedEventsCount = 0,
  facultyOptions = [],
  isDedicatedProfilePage = false,
  departments = [],
}: MemberProfileViewProps) {
  const [currentMember, setCurrentMember] = useState<MemberProfileData>(initialMember);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'performance' | 'certificates'>('overview');

  const isSelfView = currentMember.id === callerId;
  const isPresident = currentMember.role === 'president';
  const isCoPresident = currentMember.role === 'co_president';
  const isTech = currentMember.department?.branch === 'tech';
  const isSuspended = currentMember.status === 'suspended';

  // Permission Logic: Strictly Heads & Presidents only
  // - President/Co-President can manage all members across branches
  // - Branch Head can only manage members in their branch (Tech vs Non-Tech) and cannot modify Presidents or other Branch Heads
  // - Committee Head can only manage members in their specific committee
  const isPresidential = ['president', 'co_president'].includes(callerRole || '');
  const isTargetPresidential = ['president', 'co_president'].includes(currentMember.role);
  const isTargetBranchHead = currentMember.role === 'branch_head';
  const isSameBranch = !!callerBranch && currentMember.department?.branch === callerBranch;
  const isSameDept = !!callerDepartmentId && currentMember.department?.id === callerDepartmentId;

  let canManagePosition = false;
  if (isPresidential) {
    canManagePosition = true;
  } else if (callerRole === 'branch_head') {
    canManagePosition = isSameBranch && (!isTargetPresidential && !isTargetBranchHead);
  } else if (callerRole === 'committee_head') {
    canManagePosition = isSameDept && (!isTargetPresidential && !isTargetBranchHead && currentMember.role !== 'committee_head');
  }

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'president':
        return {
          label: '👑 Chapter President',
          bg: 'linear-gradient(135deg, rgba(251, 188, 4, 0.25), rgba(66, 133, 244, 0.25))',
          color: '#FDE047',
          border: 'rgba(251, 188, 4, 0.65)',
          boxShadow: '0 0 16px rgba(251, 188, 4, 0.35)',
        };
      case 'co_president':
        return {
          label: '👑 Chapter Co-President',
          bg: 'linear-gradient(135deg, rgba(251, 188, 4, 0.2), rgba(52, 168, 83, 0.2))',
          color: '#FDE047',
          border: 'rgba(251, 188, 4, 0.55)',
          boxShadow: '0 0 12px rgba(251, 188, 4, 0.25)',
        };
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

  const getDisplayPosition = () => {
    if (isPresident) {
      if (!currentMember.position || currentMember.position.toLowerCase() === 'member') {
        return 'Chapter President & Executive Community Lead';
      }
      return currentMember.position;
    }
    if (isCoPresident) {
      if (!currentMember.position || currentMember.position.toLowerCase() === 'member') {
        return 'Chapter Co-President & Executive Lead';
      }
      return currentMember.position;
    }
    if (currentMember.role === 'branch_head') {
      if (
        !currentMember.position ||
        currentMember.position.toLowerCase() === 'member' ||
        currentMember.position.toLowerCase() === 'head of branch' ||
        currentMember.position.toLowerCase().startsWith('head of ')
      ) {
        return isTech ? 'Technical Branch Head' : 'Non-Technical Branch Head';
      }
      return currentMember.position;
    }
    if (currentMember.role === 'committee_head') {
      if (!currentMember.position || currentMember.position.toLowerCase() === 'member' || currentMember.position === 'Head of Committee') {
        return currentMember.department ? `Head of ${currentMember.department.name}` : 'Committee Head';
      }
      return currentMember.position;
    }
    if (currentMember.role === 'committee_co_head') {
      if (!currentMember.position || currentMember.position.toLowerCase() === 'member' || currentMember.position === 'Co-Head of Committee') {
        return currentMember.department ? `Co-Head of ${currentMember.department.name}` : 'Committee Co-Head';
      }
      return currentMember.position;
    }
    if (currentMember.position && currentMember.position.toLowerCase() !== 'member') {
      return currentMember.position;
    }
    return currentMember.department ? `Member of ${currentMember.department.name}` : 'General Chapter Member';
  };

  const getAcademicYearLabel = (year: string | number | null) => {
    if (!year) return 'Not specified';
    const num = Number(year);
    switch (num) {
      case 1:
        return '1st Year';
      case 2:
        return '2nd Year';
      case 3:
        return '3rd Year';
      case 4:
        return '4th Year';
      case 5:
        return '5th Year';
      default:
        return `Year ${year}`;
    }
  };

  const roleBadge = getRoleBadge(currentMember.role);
  const primaryName = currentMember.full_name_en || currentMember.full_name;
  const secondaryName = currentMember.full_name_ar;
  const whatsappContact = currentMember.whatsapp_number || currentMember.phone;
  // Alias member to currentMember so all subsequent UI blocks automatically reflect live edits
  const member = currentMember;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Back Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link
          href={isDedicatedProfilePage ? '/dashboard' : '/members'}
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
          <span>{isDedicatedProfilePage ? 'Back to Dashboard' : 'Back to Members Directory'}</span>
        </Link>

        {isSelfView ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', padding: '0.25rem 0.65rem', borderRadius: '8px', background: isPresident ? 'rgba(251, 188, 4, 0.15)' : 'rgba(255, 255, 255, 0.08)', color: isPresident ? '#FDE047' : 'var(--text-secondary)', fontWeight: 700 }}>
              {isPresident ? '👑 Executive Account' : 'Your Account'}
            </span>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1.15rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4285F4, #1a73e8)',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(66, 133, 244, 0.3)',
                transition: 'all 0.2s',
              }}
            >
              <Pencil size={14} />
              <span>Edit Profile</span>
            </button>
          </div>
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
        background: isPresident 
          ? 'radial-gradient(ellipse at top left, rgba(251, 188, 4, 0.14) 0%, rgba(66, 133, 244, 0.09) 45%, var(--surface-primary, #13151b) 100%)'
          : undefined,
        border: isPresident ? '1px solid rgba(251, 188, 4, 0.35)' : undefined,
        boxShadow: isPresident ? '0 12px 40px rgba(251, 188, 4, 0.08), 0 20px 48px rgba(0, 0, 0, 0.4)' : undefined,
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
              width: isPresident ? '92px' : '84px',
              height: isPresident ? '92px' : '84px',
              borderRadius: '50%',
              background: isPresident
                ? 'linear-gradient(135deg, #FBBC04, #4285F4)'
                : 'linear-gradient(135deg, rgba(66, 133, 244, 0.3), rgba(52, 168, 83, 0.3))',
              border: isPresident ? '3px solid #FBBC04' : '2px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.2rem',
              fontWeight: 800,
              color: '#FFFFFF',
              flexShrink: 0,
              boxShadow: isPresident
                ? '0 0 28px rgba(251, 188, 4, 0.45), 0 8px 24px rgba(0, 0, 0, 0.5)'
                : '0 8px 24px rgba(0, 0, 0, 0.3)',
              position: 'relative',
            }}>
              {member.avatar_url ? (
                <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                primaryName?.charAt(0) || 'M'
              )}
              {isPresident && (
                <div
                  title="Chapter President"
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-6px',
                    fontSize: '1.25rem',
                    filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.7))',
                  }}
                >
                  👑
                </div>
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
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  background: roleBadge.bg,
                  color: roleBadge.color,
                  border: `1px solid ${roleBadge.border}`,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  boxShadow: (roleBadge as any).boxShadow,
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

              {/* Position / Executive Title */}
              <div style={{ color: isPresident ? '#E5E7EB' : 'var(--text-secondary)', fontSize: '0.98rem', fontWeight: isPresident ? 700 : 500, marginTop: '0.35rem' }}>
                {getDisplayPosition()}
              </div>

              {/* Department / Executive Oversight Scope */}
              {isPresident ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.88rem' }}>
                  <Building2 size={16} color="var(--google-yellow)" />
                  <span style={{ color: '#FDE047', fontWeight: 800 }}>Executive Chapter Board</span>
                  <span style={{ color: 'var(--text-secondary)' }}>• Supreme Oversight over All Branches &amp; Committees (Tech &amp; Non-Tech)</span>
                </div>
              ) : isCoPresident ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.88rem' }}>
                  <Building2 size={16} color="var(--google-yellow)" />
                  <span style={{ color: '#FDE047', fontWeight: 800 }}>Executive Chapter Board</span>
                  <span style={{ color: 'var(--text-secondary)' }}>• Executive Oversight (All Branches &amp; Committees)</span>
                </div>
              ) : currentMember.role === 'branch_head' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.88rem' }}>
                  <Building2 size={16} color={isTech ? 'var(--google-blue)' : 'var(--google-green)'} />
                  <span style={{ color: isTech ? '#93C5FD' : '#86EFAC', fontWeight: 800 }}>
                    {isTech ? 'Technical Branch Leadership' : 'Non-Technical Branch Leadership'}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    • Executive Oversight over {isTech ? 'Technical Committees' : 'Non-Technical Committees'}
                  </span>
                </div>
              ) : currentMember.department ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  <Building2 size={15} color={isTech ? 'var(--google-blue)' : 'var(--google-green)'} />
                  <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{currentMember.department.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>• {isTech ? 'Tech Branch' : 'Non-Tech Branch'}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Quick Contact & Social Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {isSelfView && (
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 1.15rem',
                  fontSize: '0.85rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #4285F4, #1a73e8)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(66, 133, 244, 0.3)',
                }}
              >
                <Pencil size={15} />
                <span>Edit Profile</span>
              </button>
            )}
            {canManagePosition && (
              <button
                type="button"
                onClick={() => setIsPositionModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 1.15rem',
                  fontSize: '0.85rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(251, 188, 4, 0.18), rgba(66, 133, 244, 0.18))',
                  color: '#FDE047',
                  border: '1px solid rgba(251, 188, 4, 0.45)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(251, 188, 4, 0.15)',
                  transition: 'all 0.2s',
                }}
                title="Change member position title, authority role, or committee"
              >
                <Sliders size={15} color="#FDE047" />
                <span>Edit Position</span>
              </button>
            )}

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
                href={`https://wa.me/${String(whatsappContact).replace(/[^0-9]/g, '')}`}
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

            {/* Custom Social Channels in Quick Action Bar */}
            {Array.isArray(member.custom_fields?.social_links) && member.custom_fields.social_links.filter((sl) =>
              sl?.platform && typeof sl.platform === 'string' && !['linkedin', 'facebook', 'instagram', 'portfolio'].includes(sl.platform.toLowerCase())
            ).map((sl, i) => (
              <a
                key={`hero-custom-${sl.platform}-${i}`}
                href={sl.url}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 0.95rem', fontSize: '0.85rem' }}
                title={sl.label}
              >
                {getPlatformIcon(sl.platform, 15)}
                <span>{sl.label}</span>
              </a>
            ))}
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
                    <span>National ID</span>
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
              {isPresident && (
                <div style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(251, 188, 4, 0.08)',
                  border: '1px solid rgba(251, 188, 4, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                }}>
                  <Sparkles size={18} color="var(--google-yellow)" />
                  <div>
                    <div style={{ color: '#FDE047', fontWeight: 800, fontSize: '0.84rem' }}>
                      Supreme Chapter Leadership
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '2px' }}>
                      Overseeing GDGoC HNU chapter strategy, leadership appointments, and cross-functional committees.
                    </div>
                  </div>
                </div>
              )}

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
                  {isPresident ? 'Leading Chapter Since' : 'Member Since'}
                </div>
                <div style={{ color: '#FFFFFF', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={15} color="var(--google-yellow)" />
                  <span suppressHydrationWarning>{new Date(member.join_date || member.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
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
                  {/* Custom Social Links Pills */}
                  {Array.isArray(member.custom_fields?.social_links) && member.custom_fields.social_links.filter((sl) =>
                    sl?.platform && typeof sl.platform === 'string' && !['linkedin', 'facebook', 'instagram', 'portfolio'].includes(sl.platform.toLowerCase())
                  ).map((sl, i) => (
                    <a
                      key={`overview-custom-${sl.platform}-${i}`}
                      href={sl.url}
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
                        color: '#fff',
                        textDecoration: 'none',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                      }}
                    >
                      {getPlatformIcon(sl.platform, 13)}
                      <span>{sl.label}</span>
                    </a>
                  ))}
                  {!member.linkedin_url && !member.facebook_url && !member.instagram_url && !member.portfolio_url && (!member.custom_fields?.social_links || member.custom_fields.social_links.length === 0) && (
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

              {/* Custom Social / Code Profiles */}
              {Array.isArray(member.custom_fields?.social_links) && member.custom_fields.social_links.filter((sl) =>
                sl?.platform && typeof sl.platform === 'string' && !['linkedin', 'portfolio'].includes(sl.platform.toLowerCase())
              ).map((sl, i) => (
                <div
                  key={`portfolio-custom-${sl.platform}-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {getPlatformIcon(sl.platform, 18)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>{sl.label}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                        {sl.url}
                      </div>
                    </div>
                  </div>

                  <a
                    href={sl.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.15rem', fontSize: '0.85rem' }}
                  >
                    <span>Open {sl.label}</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              ))}
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

      {/* Modal for editing own profile */}
      {isSelfView && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          member={currentMember}
          facultyOptions={facultyOptions}
          onSuccess={(updated) => {
            setCurrentMember((prev) => ({ ...prev, ...updated }));
          }}
        />
      )}

      {/* Modal for managing member position & role (Leadership) */}
      {canManagePosition && (
        <EditMemberPositionModal
          isOpen={isPositionModalOpen}
          onClose={() => setIsPositionModalOpen(false)}
          member={currentMember}
          departments={departments}
          callerRole={callerRole}
          callerBranch={callerBranch || undefined}
          onSuccess={(updated) => {
            setCurrentMember((prev) => ({
              ...prev,
              position: updated.position,
              role: updated.role,
              department_id: updated.department_id,
              department: updated.department
                ? {
                    id: updated.department.id,
                    name: updated.department.name,
                    code: updated.department.code,
                    branch: updated.department.branch,
                    description: updated.department.description ?? (prev.department?.description || null),
                  }
                : updated.department === null
                ? null
                : prev.department,
            }));
          }}
        />
      )}
    </div>
  );
}
