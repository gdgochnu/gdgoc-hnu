'use client';

import React, { useState, useEffect, useTransition, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Save,
  Loader2,
  User,
  GraduationCap,
  Globe,
  Sparkles,
  Plus,
  Check,
  AlertCircle,
  Phone,
  MessageSquare,
  Linkedin,
  Facebook,
  Instagram,
  IdCard,
  BookOpen,
  Clock,
  Image as ImageIcon,
  Upload,
  Lock,
  Trash2,
  ExternalLink,
  Github,
  Twitter,
  Youtube,
  MessageCircle,
  Code,
  Link2,
} from 'lucide-react';
import {
  updateMyProfileAction,
  uploadProfilePhotoAction,
  UpdateProfileInput,
  CustomSocialLink,
} from '@/app/profile/actions';
import { MemberProfileData } from '@/components/MemberProfileView';

interface FacultyOptionItem {
  id: string;
  name_ar: string;
  name_en: string;
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberProfileData;
  facultyOptions?: FacultyOptionItem[];
  onSuccess?: (updated: Partial<MemberProfileData>) => void;
}

const POPULAR_SKILLS = [
  'React',
  'Next.js',
  'TypeScript',
  'JavaScript',
  'Python',
  'Flutter',
  'Node.js',
  'UI/UX Design',
  'Figma',
  'AI / Machine Learning',
  'Cloud Computing (GCP)',
  'Cybersecurity',
  'DevOps',
  'Content Creation',
  'Public Speaking',
  'Event Management',
  'Video Editing',
  'Graphic Design',
  'Problem Solving',
];

export const SOCIAL_PLATFORMS = [
  { id: 'github', label: 'GitHub', placeholder: 'https://github.com/username' },
  { id: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username' },
  { id: 'twitter', label: 'X (Twitter)', placeholder: 'https://x.com/username' },
  { id: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/username' },
  { id: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/username' },
  { id: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@channel' },
  { id: 'discord', label: 'Discord', placeholder: 'https://discord.gg/... or username' },
  { id: 'telegram', label: 'Telegram', placeholder: 'https://t.me/username' },
  { id: 'behance', label: 'Behance', placeholder: 'https://behance.net/username' },
  { id: 'dribbble', label: 'Dribbble', placeholder: 'https://dribbble.com/username' },
  { id: 'leetcode', label: 'LeetCode', placeholder: 'https://leetcode.com/u/username' },
  { id: 'codeforces', label: 'Codeforces', placeholder: 'https://codeforces.com/profile/username' },
  { id: 'kaggle', label: 'Kaggle', placeholder: 'https://kaggle.com/username' },
  { id: 'medium', label: 'Medium', placeholder: 'https://medium.com/@username' },
  { id: 'portfolio', label: 'Portfolio / Website', placeholder: 'https://yourwebsite.com' },
  { id: 'custom', label: 'Other / Custom Platform', placeholder: 'https://...' },
];

export function getPlatformIcon(platform: string, size = 15) {
  switch (platform.toLowerCase()) {
    case 'github':
      return <Github size={size} color="#FFFFFF" />;
    case 'linkedin':
      return <Linkedin size={size} color="#0A66C2" />;
    case 'twitter':
    case 'x':
      return <Twitter size={size} color="#1DA1F2" />;
    case 'facebook':
      return <Facebook size={size} color="#1877F2" />;
    case 'instagram':
      return <Instagram size={size} color="#E4405F" />;
    case 'youtube':
      return <Youtube size={size} color="#FF0000" />;
    case 'discord':
      return <MessageSquare size={size} color="#5865F2" />;
    case 'telegram':
      return <MessageCircle size={size} color="#229ED9" />;
    case 'behance':
      return <Sparkles size={size} color="#0057FF" />;
    case 'dribbble':
      return <Globe size={size} color="#EA4C89" />;
    case 'leetcode':
    case 'codeforces':
      return <Code size={size} color="#FBBC04" />;
    case 'kaggle':
      return <Globe size={size} color="#20BEFF" />;
    case 'medium':
      return <BookOpen size={size} color="#FFFFFF" />;
    case 'portfolio':
    case 'website':
      return <Globe size={size} color="var(--google-green)" />;
    default:
      return <Link2 size={size} color="var(--text-muted)" />;
  }
}

export function EditProfileModal({
  isOpen,
  onClose,
  member,
  facultyOptions = [],
  onSuccess,
}: EditProfileModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'academic' | 'social' | 'skills'>('personal');
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states - Personal
  const [fullNameEn, setFullNameEn] = useState(member.full_name_en || member.full_name || '');
  const [fullNameAr, setFullNameAr] = useState(member.full_name_ar || '');
  const [phone, setPhone] = useState(member.phone || '');
  const [whatsappNumber, setWhatsappNumber] = useState(member.whatsapp_number || member.phone || '');
  const [universityId, setUniversityId] = useState(member.university_id || '');
  const [nationalId, setNationalId] = useState(member.national_id || '');
  const [avatarUrl, setAvatarUrl] = useState(member.avatar_url || '');

  // Photo Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);

  // Form states - Academic
  const [faculty, setFaculty] = useState(member.faculty || '');
  const [departmentMajor, setDepartmentMajor] = useState(member.department_major || '');
  const [academicYear, setAcademicYear] = useState<string>(
    member.academic_year ? String(member.academic_year) : '1'
  );

  // Form states - Dynamic Social Links
  const [socialLinks, setSocialLinks] = useState<CustomSocialLink[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('github');
  const [newLinkUrl, setNewLinkUrl] = useState<string>('');
  const [customPlatformLabel, setCustomPlatformLabel] = useState<string>('');

  // Form states - Skills & Bio
  const [skills, setSkills] = useState<string[]>(Array.isArray(member.skills) ? member.skills : []);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [motivation, setMotivation] = useState(member.motivation || '');
  const [availabilityHours, setAvailabilityHours] = useState<string>(
    member.availability_hours ? String(member.availability_hours) : '5'
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper to extract social links from member record
  const extractSocialLinks = (m: MemberProfileData): CustomSocialLink[] => {
    const existing = m.custom_fields?.social_links;
    if (Array.isArray(existing) && existing.length > 0) {
      return existing.map((link: any) => ({
        platform: link.platform || 'custom',
        label: link.label || link.platform || 'Link',
        url: link.url || '',
      }));
    }

    const initialList: CustomSocialLink[] = [];
    if (m.linkedin_url) {
      initialList.push({ platform: 'linkedin', label: 'LinkedIn', url: m.linkedin_url });
    }
    if (m.portfolio_url) {
      initialList.push({ platform: 'portfolio', label: 'Portfolio', url: m.portfolio_url });
    }
    if (m.facebook_url) {
      initialList.push({ platform: 'facebook', label: 'Facebook', url: m.facebook_url });
    }
    if (m.instagram_url) {
      initialList.push({ platform: 'instagram', label: 'Instagram', url: m.instagram_url });
    }
    return initialList;
  };

  // Reset values when modal opens or member changes
  useEffect(() => {
    if (isOpen) {
      setFullNameEn(member.full_name_en || member.full_name || '');
      setFullNameAr(member.full_name_ar || '');
      setPhone(member.phone || '');
      setWhatsappNumber(member.whatsapp_number || member.phone || '');
      setUniversityId(member.university_id || '');
      setNationalId(member.national_id || '');
      setAvatarUrl(member.avatar_url || '');

      setFaculty(member.faculty || '');
      setDepartmentMajor(member.department_major || '');
      setAcademicYear(member.academic_year ? String(member.academic_year) : '1');

      setSocialLinks(extractSocialLinks(member));
      setSelectedPlatform('github');
      setNewLinkUrl('');
      setCustomPlatformLabel('');

      setSkills(Array.isArray(member.skills) ? member.skills : []);
      setMotivation(member.motivation || '');
      setAvailabilityHours(member.availability_hours ? String(member.availability_hours) : '5');

      setErrorMsg(null);
      setSuccessMsg(null);
      setPhotoUploadError(null);
    }
  }, [isOpen, member]);

  if (!isOpen || !mounted) return null;

  const hasExistingNationalId = Boolean(member.national_id && member.national_id.trim().length > 0);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoUploadError('Please select a valid image file (JPEG, PNG, WebP, GIF).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoUploadError('Image size exceeds 5MB limit.');
      return;
    }

    setPhotoUploadError(null);
    setIsUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await uploadProfilePhotoAction(formData);

      if (res.success && res.url) {
        setAvatarUrl(res.url);
        setSuccessMsg('Profile photo uploaded successfully!');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setPhotoUploadError(res.error || 'Failed to upload photo.');
      }
    } catch (err: any) {
      setPhotoUploadError(err.message || 'Error uploading photo.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddSocialLink = () => {
    const trimmedUrl = newLinkUrl.trim();
    if (!trimmedUrl) return;

    const platformPreset = SOCIAL_PLATFORMS.find((p) => p.id === selectedPlatform);
    const label =
      selectedPlatform === 'custom'
        ? customPlatformLabel.trim() || 'Custom Link'
        : platformPreset?.label || selectedPlatform;

    // Check if duplicate url
    if (socialLinks.some((l) => l.url === trimmedUrl)) {
      setErrorMsg('This link URL has already been added.');
      return;
    }

    setSocialLinks([
      ...socialLinks,
      {
        platform: selectedPlatform,
        label,
        url: trimmedUrl,
      },
    ]);

    setNewLinkUrl('');
    setCustomPlatformLabel('');
    setErrorMsg(null);
  };

  const handleRemoveSocialLink = (indexToRemove: number) => {
    setSocialLinks(socialLinks.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddSkill = (skillToAdd?: string) => {
    const s = (skillToAdd || newSkillInput).trim();
    if (!s) return;
    if (!skills.includes(s)) {
      setSkills([...skills, s]);
    }
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullNameEn.trim()) {
      setErrorMsg('Full name in English is required.');
      setActiveTab('personal');
      return;
    }

    // Validate national ID if provided for the first time
    if (!hasExistingNationalId && nationalId.trim().length > 0) {
      const cleanNid = nationalId.trim();
      if (!/^[0-9]{14}$/.test(cleanNid)) {
        setErrorMsg('National ID must be exactly 14 digits.');
        setActiveTab('personal');
        return;
      }
    }

    startTransition(async () => {
      try {
        // Derive standard URLs from socialLinks for backwards compatibility
        const linkedin = socialLinks.find((l) => l.platform === 'linkedin')?.url || '';
        const portfolio =
          socialLinks.find((l) => l.platform === 'portfolio' || l.platform === 'github')?.url || '';
        const facebook = socialLinks.find((l) => l.platform === 'facebook')?.url || '';
        const instagram = socialLinks.find((l) => l.platform === 'instagram')?.url || '';

        const payload: UpdateProfileInput = {
          fullNameEn: fullNameEn.trim(),
          fullNameAr: fullNameAr.trim() || undefined,
          nationalId: !hasExistingNationalId && nationalId.trim() ? nationalId.trim() : undefined,
          phone: phone.trim() || undefined,
          whatsappNumber: whatsappNumber.trim() || undefined,
          universityId: universityId.trim() || undefined,
          avatarUrl: avatarUrl.trim() || undefined,
          faculty: faculty.trim() || undefined,
          departmentMajor: departmentMajor.trim() || undefined,
          academicYear: academicYear ? Number(academicYear) : undefined,
          linkedinUrl: linkedin || undefined,
          portfolioUrl: portfolio || undefined,
          facebookUrl: facebook || undefined,
          instagramUrl: instagram || undefined,
          skills,
          motivation: motivation.trim() || undefined,
          availabilityHours: availabilityHours ? Number(availabilityHours) : undefined,
          customSocialLinks: socialLinks,
        };

        const res = await updateMyProfileAction(payload);

        if (res.success) {
          setSuccessMsg('Profile updated successfully!');
          if (onSuccess) {
            onSuccess({
              full_name: fullNameEn.trim(),
              full_name_en: fullNameEn.trim(),
              full_name_ar: fullNameAr.trim() || null,
              phone: phone.trim() || null,
              whatsapp_number: whatsappNumber.trim() || null,
              university_id: universityId.trim() || null,
              national_id: member.national_id || (nationalId.trim() || null),
              avatar_url: avatarUrl.trim() || null,
              faculty: faculty.trim() || null,
              department_major: departmentMajor.trim() || null,
              academic_year: academicYear ? Number(academicYear) : null,
              linkedin_url: linkedin || null,
              portfolio_url: portfolio || null,
              facebook_url: facebook || null,
              instagram_url: instagram || null,
              skills,
              motivation: motivation.trim() || null,
              availability_hours: availabilityHours ? Number(availabilityHours) : null,
              custom_fields: {
                ...(member.custom_fields || {}),
                social_links: socialLinks,
              },
            });
          }
          setTimeout(() => {
            onClose();
          }, 850);
        } else {
          setErrorMsg(res.error || 'Failed to update profile.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'An unexpected error occurred.');
      }
    });
  };

  const currentPlatformPreset = SOCIAL_PLATFORMS.find((p) => p.id === selectedPlatform);

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending && !isUploadingPhoto) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          borderRadius: '24px',
          background: 'var(--surface-primary, #13151b)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.55)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Top 4-Color Google Strip */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background:
              'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          }}
        />

        {/* Modal Header - Pure English, No Arabic */}
        <div
          style={{
            padding: '1.5rem 1.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <User size={22} color="var(--google-blue)" />
              <span>Edit Profile</span>
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Update your personal, academic, and technical details across GDGoC HNU OS.
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isPending || isUploadingPhoto}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs - Strict No Vertical Scroll */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            overflowX: 'auto',
            overflowY: 'hidden',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              border: activeTab === 'personal' ? '1px solid var(--google-blue)' : '1px solid transparent',
              background: activeTab === 'personal' ? 'rgba(66, 133, 244, 0.15)' : 'transparent',
              color: activeTab === 'personal' ? '#fff' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <User size={15} color={activeTab === 'personal' ? 'var(--google-blue)' : 'currentColor'} />
            <span>Personal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('academic')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              border: activeTab === 'academic' ? '1px solid var(--google-green)' : '1px solid transparent',
              background: activeTab === 'academic' ? 'rgba(52, 168, 83, 0.15)' : 'transparent',
              color: activeTab === 'academic' ? '#fff' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <GraduationCap size={15} color={activeTab === 'academic' ? 'var(--google-green)' : 'currentColor'} />
            <span>Academic</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('social')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              border: activeTab === 'social' ? '1px solid #FBBC04' : '1px solid transparent',
              background: activeTab === 'social' ? 'rgba(251, 188, 4, 0.15)' : 'transparent',
              color: activeTab === 'social' ? '#fff' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Globe size={15} color={activeTab === 'social' ? '#FBBC04' : 'currentColor'} />
            <span>Social &amp; Links ({socialLinks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('skills')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              border: activeTab === 'skills' ? '1px solid #a855f7' : '1px solid transparent',
              background: activeTab === 'skills' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
              color: activeTab === 'skills' ? '#fff' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Sparkles size={15} color={activeTab === 'skills' ? '#a855f7' : 'currentColor'} />
            <span>Skills &amp; Bio ({skills.length})</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
        >
          <div
            style={{
              padding: '1.5rem 1.75rem',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {/* Feedback Alerts */}
            {errorMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  background: 'rgba(234, 67, 53, 0.15)',
                  border: '1px solid rgba(234, 67, 53, 0.3)',
                  color: '#FCA5A5',
                  fontSize: '0.85rem',
                }}
              >
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  background: 'rgba(52, 168, 83, 0.15)',
                  border: '1px solid rgba(52, 168, 83, 0.3)',
                  color: '#86EFAC',
                  fontSize: '0.85rem',
                }}
              >
                <Check size={18} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* TAB 1: PERSONAL DETAILS */}
            {activeTab === 'personal' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Names */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Full Name (English) *
                    </label>
                    <input
                      type="text"
                      value={fullNameEn}
                      onChange={(e) => setFullNameEn(e.target.value)}
                      placeholder="e.g. Mostafa Mahmoud"
                      required
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Full Name (Arabic)
                    </label>
                    <input
                      type="text"
                      value={fullNameAr}
                      onChange={(e) => setFullNameAr(e.target.value)}
                      placeholder="e.g. Mostafa Mahmoud (in Arabic script)"
                      dir="rtl"
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Contacts */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Phone Number
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01012345678"
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem 0.75rem 2.5rem',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#fff',
                          fontSize: '0.9rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      WhatsApp Number
                    </label>
                    <div style={{ position: 'relative' }}>
                      <MessageSquare size={15} color="#25D366" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        placeholder="01012345678"
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem 0.75rem 2.5rem',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#fff',
                          fontSize: '0.9rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* University ID & National ID */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      University Student ID
                    </label>
                    <div style={{ position: 'relative' }}>
                      <IdCard size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        value={universityId}
                        onChange={(e) => setUniversityId(e.target.value)}
                        placeholder="e.g. 202300123"
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem 0.75rem 2.5rem',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#fff',
                          fontSize: '0.9rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* National ID: Locked if already set, editable if empty */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <IdCard size={15} color={hasExistingNationalId ? 'var(--google-green)' : 'var(--google-blue)'} />
                      <span>National ID</span>
                    </label>

                    {hasExistingNationalId ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem 1rem',
                          borderRadius: '10px',
                          background: 'rgba(52, 168, 83, 0.08)',
                          border: '1px solid rgba(52, 168, 83, 0.25)',
                          minHeight: '44px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Lock size={15} color="var(--google-green)" />
                          <span style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                            {member.national_id}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#86EFAC',
                            background: 'rgba(52, 168, 83, 0.2)',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <Check size={12} />
                          <span>Verified &amp; Locked</span>
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ position: 'relative' }}>
                          <IdCard size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                          <input
                            type="text"
                            maxLength={14}
                            value={nationalId}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              setNationalId(val);
                            }}
                            placeholder="Enter 14-digit Egyptian National ID"
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem 0.75rem 2.5rem',
                              borderRadius: '10px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: nationalId.length === 14 ? '1px solid rgba(52, 168, 83, 0.6)' : '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#fff',
                              fontSize: '0.9rem',
                              fontFamily: 'monospace',
                              letterSpacing: '0.05em',
                              outline: 'none',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                          Can only be set once during your profile update. Once submitted, it is locked for HR validation.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Photo: Upload or URL */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Profile Photo
                  </label>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.25rem',
                      padding: '1rem',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Avatar Preview */}
                    <div
                      style={{
                        width: '68px',
                        height: '68px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.3), rgba(52, 168, 83, 0.3))',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <User size={30} color="var(--text-muted)" />
                      )}
                    </div>

                    {/* Actions: File upload button + direct URL */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handlePhotoUpload}
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          style={{ display: 'none' }}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingPhoto || isPending}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            padding: '0.55rem 1.1rem',
                            borderRadius: '10px',
                            background: 'rgba(66, 133, 244, 0.15)',
                            border: '1px solid rgba(66, 133, 244, 0.35)',
                            color: '#93C5FD',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: isUploadingPhoto ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {isUploadingPhoto ? (
                            <>
                              <Loader2 size={15} className="animate-spin" />
                              <span>Uploading Photo...</span>
                            </>
                          ) : (
                            <>
                              <Upload size={15} />
                              <span>Upload Photo File</span>
                            </>
                          )}
                        </button>

                        {avatarUrl && (
                          <button
                            type="button"
                            onClick={() => setAvatarUrl('')}
                            disabled={isPending || isUploadingPhoto}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.55rem 0.85rem',
                              borderRadius: '10px',
                              background: 'rgba(234, 67, 53, 0.1)',
                              border: '1px solid rgba(234, 67, 53, 0.25)',
                              color: '#FCA5A5',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <X size={14} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      {photoUploadError && (
                        <span style={{ fontSize: '0.78rem', color: '#FCA5A5' }}>{photoUploadError}</span>
                      )}

                      <div style={{ position: 'relative', marginTop: '0.2rem' }}>
                        <ImageIcon size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="url"
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          placeholder="Or paste direct image URL (https://...)"
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            color: '#fff',
                            fontSize: '0.82rem',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ACADEMIC DETAILS */}
            {activeTab === 'academic' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {/* Faculty */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Faculty / College
                    </label>
                    <select
                      value={faculty}
                      onChange={(e) => setFaculty(e.target.value)}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: '#1c1f26',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    >
                      <option value="">Select Faculty...</option>
                      {facultyOptions.map((fac) => (
                        <option key={fac.id} value={fac.name_ar}>
                          {fac.name_ar} ({fac.name_en})
                        </option>
                      ))}
                      {faculty && !facultyOptions.some((f) => f.name_ar === faculty) && (
                        <option value={faculty}>{faculty}</option>
                      )}
                    </select>
                  </div>

                  {/* Academic Year */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Academic Year
                    </label>
                    <select
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: '#1c1f26',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    >
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                      <option value="5">5th Year</option>
                      <option value="6">Graduate / Alumni</option>
                    </select>
                  </div>
                </div>

                {/* Major / Department */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Department / Academic Major
                  </label>
                  <div style={{ position: 'relative' }}>
                    <BookOpen size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={departmentMajor}
                      onChange={(e) => setDepartmentMajor(e.target.value)}
                      placeholder="e.g. Computer Science / Information Systems / Mechatronics"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem 0.75rem 2.5rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: DYNAMIC SOCIAL & LINKS */}
            {activeTab === 'social' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Active Links List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Added Social Profiles &amp; Links ({socialLinks.length})
                  </label>

                  {socialLinks.length === 0 ? (
                    <div
                      style={{
                        padding: '1.5rem',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px dashed rgba(255, 255, 255, 0.1)',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem',
                      }}
                    >
                      No social links added yet. Choose a platform below to add your first profile or custom link.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {socialLinks.map((link, index) => (
                        <div
                          key={`${link.platform}-${index}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.75rem 1rem',
                            borderRadius: '10px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            gap: '0.75rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {getPlatformIcon(link.platform, 16)}
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                                {link.label}
                              </div>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: '0.78rem',
                                  color: 'var(--google-blue)',
                                  textDecoration: 'none',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: 'block',
                                }}
                              >
                                {link.url}
                              </a>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveSocialLink(index)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '0.35rem',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'color 0.15s',
                            }}
                            title="Remove link"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add New Link Section */}
                <div
                  style={{
                    padding: '1.25rem',
                    borderRadius: '14px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                    + Add New Profile or Link
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    {/* Platform Selector */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Platform / Network
                      </label>
                      <select
                        value={selectedPlatform}
                        onChange={(e) => setSelectedPlatform(e.target.value)}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          background: '#1c1f26',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#fff',
                          fontSize: '0.85rem',
                          outline: 'none',
                        }}
                      >
                        {SOCIAL_PLATFORMS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Custom Label if 'custom' is selected */}
                    {selectedPlatform === 'custom' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          Custom Platform / Label
                        </label>
                        <input
                          type="text"
                          value={customPlatformLabel}
                          onChange={(e) => setCustomPlatformLabel(e.target.value)}
                          placeholder="e.g. Substack, Hashnode, Twitch..."
                          style={{
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#fff',
                            fontSize: '0.85rem',
                            outline: 'none',
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* URL Input + Add Button */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                      <Link2 size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="url"
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSocialLink();
                          }
                        }}
                        placeholder={currentPlatformPreset?.placeholder || 'https://...'}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem 0.65rem 2.3rem',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#fff',
                          fontSize: '0.85rem',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddSocialLink}
                      style={{
                        padding: '0.65rem 1.25rem',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #FBBC04, #e3a600)',
                        border: 'none',
                        color: '#13151b',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Plus size={16} />
                      <span>Add Link</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SKILLS & BIO */}
            {activeTab === 'skills' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Skills Manager */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Technical &amp; Soft Skills
                  </label>

                  {/* Skill Add Input */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                      placeholder="Type a skill (e.g. Next.js, Cloud, Public Speaking)..."
                      style={{
                        flex: 1,
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSkill()}
                      style={{
                        padding: '0.75rem 1.25rem',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #4285F4, #1a73e8)',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Plus size={16} />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Current Active Skills List */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      minHeight: '44px',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    {skills.length === 0 ? (
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        No skills added yet. Use the input above or choose from recommendations below.
                      </span>
                    ) : (
                      skills.map((skill) => (
                        <span
                          key={skill}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '999px',
                            background: 'rgba(66, 133, 244, 0.15)',
                            border: '1px solid rgba(66, 133, 244, 0.3)',
                            color: '#93C5FD',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              color: '#93C5FD',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Quick Recommendation Pills */}
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
                      Quick Suggestions (Click to add):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {POPULAR_SKILLS.filter((ps) => !skills.includes(ps)).slice(0, 12).map((recSkill) => (
                        <button
                          key={recSkill}
                          type="button"
                          onClick={() => handleAddSkill(recSkill)}
                          style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            color: 'var(--text-secondary)',
                            fontSize: '0.74rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          + {recSkill}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Motivation / Bio */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Bio &amp; Motivation
                  </label>
                  <textarea
                    rows={4}
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    placeholder="Tell the chapter about yourself, your passion, and what you want to achieve..."
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      resize: 'vertical',
                      lineHeight: 1.6,
                    }}
                  />
                </div>

                {/* Availability Hours */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Weekly Availability Hours
                  </label>
                  <div style={{ position: 'relative', maxWidth: '240px' }}>
                    <Clock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={availabilityHours}
                      onChange={(e) => setAvailabilityHours(e.target.value)}
                      placeholder="e.g. 10"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem 0.75rem 2.5rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: '1rem 1.75rem',
              background: 'rgba(0, 0, 0, 0.25)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isPending || isUploadingPhoto}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending || isUploadingPhoto}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.4rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4285F4, #1a73e8)',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: isPending || isUploadingPhoto ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(66, 133, 244, 0.3)',
                opacity: isPending || isUploadingPhoto ? 0.7 : 1,
              }}
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{isPending ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
