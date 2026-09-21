'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { completeStudentProfile } from '@/app/student/actions';
import {
  User,
  CreditCard,
  Building2,
  GraduationCap,
  BookOpen,
  Phone,
  MessageSquare,
  Globe,
  Share2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface FacultyOptionItem {
  id: string;
  name_ar: string;
  name_en: string;
  sort_order: number;
}

interface CompleteStudentProfileFormProps {
  prefilled: {
    fullNameAr: string;
    fullNameEn: string;
    email: string;
    nationalId: string;
    university: string;
    faculty: string;
    departmentMajor: string;
    academicYear: number;
    phone: string;
    whatsappNumber: string;
    facebookUrl: string;
    instagramUrl: string;
    linkedinUrl: string;
  };
  faculties: FacultyOptionItem[];
  isTeamMember: boolean;
  isEditMode?: boolean;
}

export function CompleteStudentProfileForm({
  prefilled,
  faculties,
  isTeamMember,
  isEditMode = false,
}: CompleteStudentProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form State
  const [fullNameAr, setFullNameAr] = useState(prefilled.fullNameAr || '');
  const [fullNameEn, setFullNameEn] = useState(prefilled.fullNameEn || '');
  const [nationalId, setNationalId] = useState(prefilled.nationalId || '');
  // Check if prefilled university is HNU or other
  const initialIsHnu = !prefilled.university || 
    prefilled.university.toLowerCase().includes('helwan national') || 
    prefilled.university.toLowerCase().includes('hnu');

  const [universityType, setUniversityType] = useState<'hnu' | 'other'>(initialIsHnu ? 'hnu' : 'other');
  const [customUniversity, setCustomUniversity] = useState<string>(initialIsHnu ? '' : (prefilled.university || ''));
  const [faculty, setFaculty] = useState(prefilled.faculty || '');
  const [departmentMajor, setDepartmentMajor] = useState(prefilled.departmentMajor || '');
  const [academicYear, setAcademicYear] = useState<number>(prefilled.academicYear || 1);
  const [phone, setPhone] = useState(prefilled.phone || '');
  const [whatsappNumber, setWhatsappNumber] = useState(prefilled.whatsappNumber || '');
  const [facebookUrl, setFacebookUrl] = useState(prefilled.facebookUrl || '');
  const [instagramUrl, setInstagramUrl] = useState(prefilled.instagramUrl || '');
  const [linkedinUrl, setLinkedinUrl] = useState(prefilled.linkedinUrl || '');

  // Copy phone to WhatsApp
  const handleCopyPhoneToWhatsapp = () => {
    if (phone.trim()) {
      setWhatsappNumber(phone.trim());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side validations
    if (!fullNameAr.trim() || fullNameAr.trim().split(/\s+/).length < 3) {
      setErrorMessage('Please enter your full Arabic name (at least 3 or 4 parts).');
      return;
    }

    if (!fullNameEn.trim() || fullNameEn.trim().split(/\s+/).length < 3) {
      setErrorMessage('Please enter your full English name (at least 3 or 4 parts).');
      return;
    }

    const cleanNationalId = nationalId.trim();
    if (!cleanNationalId || !/^\d{14}$/.test(cleanNationalId)) {
      setErrorMessage('National ID must be exactly 14 numeric digits.');
      return;
    }

    const finalUniversity = universityType === 'hnu' ? 'Helwan National University' : customUniversity.trim();
    if (!finalUniversity) {
      setErrorMessage('Please enter your University name.');
      return;
    }

    if (!faculty.trim()) {
      setErrorMessage('Please provide your Faculty / College.');
      return;
    }

    if (!phone.trim()) {
      setErrorMessage('Please provide your mobile phone number.');
      return;
    }

    if (!whatsappNumber.trim()) {
      setErrorMessage('Please provide your WhatsApp phone number.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await completeStudentProfile({
          full_name_ar: fullNameAr,
          full_name_en: fullNameEn,
          national_id: cleanNationalId,
          university: finalUniversity,
          faculty: faculty.trim(),
          department_major: departmentMajor,
          academic_year: Number(academicYear),
          phone,
          whatsapp_number: whatsappNumber,
          facebook_url: facebookUrl,
          instagram_url: instagramUrl,
          linkedin_url: linkedinUrl,
        });

        if (res.success) {
          setSuccess(true);
          router.push('/student/dashboard');
          router.refresh();
        } else {
          setErrorMessage(res.error || 'Failed to complete profile.');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'An unexpected error occurred.');
      }
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem 0.75rem 2.5rem',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#FFFFFF',
    fontSize: '0.92rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.84rem',
    fontWeight: 700,
    color: '#CBD5E1',
    marginBottom: '0.45rem',
  };

  if (success) {
    return (
      <div
        className="glass-panel"
        style={{
          borderRadius: '24px',
          background: 'linear-gradient(180deg, #131B2E 0%, #0F172A 100%)',
          border: '1px solid rgba(52, 168, 83, 0.35)',
          padding: '3rem 2rem',
          textAlign: 'center',
          maxWidth: '580px',
          margin: '2rem auto',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(52, 168, 83, 0.15)',
            border: '1px solid rgba(52, 168, 83, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}
        >
          <CheckCircle2 size={32} color="#4ADE80" />
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 0.5rem' }}>
          {isEditMode ? 'Profile Information Updated!' : 'Student Profile Activated!'}
        </h2>
        <p style={{ fontSize: '0.92rem', color: '#94A3B8', lineHeight: 1.6, margin: '0 0 2rem' }}>
          {isEditMode
            ? 'Your profile information has been saved successfully. Redirecting to your dashboard...'
            : 'Your permanent student attendance QR code has been generated. Redirecting to your Student Dashboard...'}
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#60A5FA', fontSize: '0.9rem', fontWeight: 700 }}>
          <Loader2 size={18} className="animate-spin" />
          <span>Opening Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Team Member Bridge Banner */}
      {isTeamMember && (
        <div
          style={{
            borderRadius: '16px',
            padding: '1rem 1.25rem',
            background: 'rgba(66, 133, 244, 0.12)',
            border: '1px solid rgba(66, 133, 244, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(66, 133, 244, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Layers size={18} color="#60A5FA" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#93C5FD' }}>
              Dual Role Detected (Team Member Bridge Active)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#CBD5E1', marginTop: '0.15rem', lineHeight: 1.4 }}>
              Your student account is linked to your GDGoC Chapter profile. Personal details have been pre-filled automatically!
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div
          style={{
            borderRadius: '14px',
            padding: '0.9rem 1.1rem',
            background: 'rgba(234, 67, 53, 0.12)',
            border: '1px solid rgba(234, 67, 53, 0.35)',
            color: '#F87171',
            fontSize: '0.88rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Section 1: Personal & Legal Identification */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '20px',
          padding: '1.75rem',
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <User size={18} color="#60A5FA" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            Personal Identification
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {/* Full Name in Arabic */}
          <div>
            <label style={labelStyle}>
              Full Name in Arabic <span style={{ color: '#F87171' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={fullNameAr}
                onChange={(e) => setFullNameAr(e.target.value)}
                placeholder="Official 4-part Arabic Name"
                dir="rtl"
                required
                style={{ ...inputStyle, paddingRight: '2.5rem', paddingLeft: '1rem', textAlign: 'right' }}
              />
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.3rem' }}>
              Used for official certificates and university documentation.
            </div>
          </div>

          {/* Full Name in English */}
          <div>
            <label style={labelStyle}>
              Full Name in English (4 parts) <span style={{ color: '#F87171' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={fullNameEn}
                onChange={(e) => setFullNameEn(e.target.value)}
                placeholder="Ahmed Mohamed Ali Hassan"
                required
                style={inputStyle}
              />
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.3rem' }}>
              Used for Google Developer Groups international certificates.
            </div>
          </div>

          {/* National ID */}
          <div>
            <label style={labelStyle}>
              National ID (14 digits) <span style={{ color: '#F87171' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <CreditCard size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 14))}
                placeholder="29901011234567"
                maxLength={14}
                required
                style={inputStyle}
              />
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.3rem' }}>
              14 digits required for campus event security and verification.
            </div>
          </div>

          {/* Registered Email (Disabled) */}
          <div>
            <label style={labelStyle}>Registered Google Email</label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="#64748B" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                value={prefilled.email}
                disabled
                style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.3rem' }}>
              Authenticated via Google OAuth.
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: University & Academic Information */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '20px',
          padding: '1.75rem',
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <GraduationCap size={18} color="#4ADE80" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            Academic Information
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {/* University */}
          <div>
            <label style={labelStyle}>
              University <span style={{ color: '#F87171' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Building2 size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <select
                value={universityType}
                onChange={(e) => {
                  const val = e.target.value as 'hnu' | 'other';
                  setUniversityType(val);
                  if (val === 'hnu') {
                    setCustomUniversity('');
                  } else {
                    setFaculty('');
                  }
                }}
                required
                style={inputStyle}
              >
                <option value="hnu" style={{ background: '#0F172A' }}>
                  Helwan National University (HNU)
                </option>
                <option value="other" style={{ background: '#0F172A' }}>
                  Other University / Institution
                </option>
              </select>
            </div>

            {universityType === 'other' && (
              <div style={{ marginTop: '0.65rem' }}>
                <div style={{ position: 'relative' }}>
                  <Building2 size={16} color="#60A5FA" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={customUniversity}
                    onChange={(e) => setCustomUniversity(e.target.value)}
                    placeholder="Enter your university name (e.g. Cairo University)"
                    required
                    style={{ ...inputStyle, borderColor: 'rgba(66, 133, 244, 0.4)' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Faculty / College */}
          <div>
            <label style={labelStyle}>
              Faculty / College <span style={{ color: '#F87171' }}>*</span>
              {universityType === 'other' && (
                <span style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 500, marginLeft: '0.35rem' }}>
                  (Type your college name)
                </span>
              )}
            </label>
            <div style={{ position: 'relative' }}>
              <BookOpen size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              {universityType === 'hnu' ? (
                <select
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  required
                  style={inputStyle}
                >
                  <option value="" style={{ background: '#0F172A' }}>
                    -- Select HNU Faculty --
                  </option>
                  {faculties.map((f) => (
                    <option key={f.id} value={f.name_en} style={{ background: '#0F172A' }}>
                      {f.name_en}
                    </option>
                  ))}
                  <option value="Other Faculty" style={{ background: '#0F172A' }}>
                    Other Faculty
                  </option>
                </select>
              ) : (
                <input
                  type="text"
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  placeholder="Enter your faculty / college (e.g. Faculty of Engineering)"
                  required
                  style={{ ...inputStyle, borderColor: 'rgba(66, 133, 244, 0.4)' }}
                />
              )}
            </div>
            {universityType === 'hnu' && (
              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.3rem' }}>
                HNU official colleges list.
              </div>
            )}
          </div>

          {/* Department / Major */}
          <div>
            <label style={labelStyle}>Department / Major</label>
            <div style={{ position: 'relative' }}>
              <BookOpen size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={departmentMajor}
                onChange={(e) => setDepartmentMajor(e.target.value)}
                placeholder="e.g. Computer Science, Mechatronics, AI"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Academic Year */}
          <div>
            <label style={labelStyle}>
              Academic Year <span style={{ color: '#F87171' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <GraduationCap size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(Number(e.target.value))}
                required
                style={inputStyle}
              >
                <option value={1} style={{ background: '#0F172A' }}>1st Year (Freshman)</option>
                <option value={2} style={{ background: '#0F172A' }}>2nd Year (Sophomore)</option>
                <option value={3} style={{ background: '#0F172A' }}>3rd Year (Junior)</option>
                <option value={4} style={{ background: '#0F172A' }}>4th Year (Senior 1)</option>
                <option value={5} style={{ background: '#0F172A' }}>5th Year (Senior 2 / Engineering)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Contact & Communication */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '20px',
          padding: '1.75rem',
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <Phone size={18} color="#FBBF24" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            Contact Details
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {/* Phone */}
          <div>
            <label style={labelStyle}>
              Mobile Number <span style={{ color: '#F87171' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01012345678"
                required
                style={inputStyle}
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <label style={{ ...labelStyle, margin: 0 }}>
                WhatsApp Number <span style={{ color: '#F87171' }}>*</span>
              </label>
              <button
                type="button"
                onClick={handleCopyPhoneToWhatsapp}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#60A5FA',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: 0,
                }}
              >
                <Copy size={12} />
                <span>Same as Mobile</span>
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <MessageSquare size={16} color="#4ADE80" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="01012345678"
                required
                style={inputStyle}
              />
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.3rem' }}>
              Used to add you to official course broadcast channels.
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Professional & Social Profiles (Optional) */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '20px',
          padding: '1.75rem',
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <Share2 size={18} color="#A855F7" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            Social Profiles (Optional)
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {/* LinkedIn */}
          <div>
            <label style={labelStyle}>LinkedIn Profile URL</label>
            <div style={{ position: 'relative' }}>
              <Globe size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Facebook */}
          <div>
            <label style={labelStyle}>Facebook Profile URL</label>
            <div style={{ position: 'relative' }}>
              <Globe size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="url"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="https://facebook.com/username"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Instagram */}
          <div>
            <label style={labelStyle}>Instagram Profile URL</label>
            <div style={{ position: 'relative' }}>
              <Globe size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="url"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/username"
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: '1rem 2.25rem',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
            color: '#FFFFFF',
            fontSize: '1rem',
            fontWeight: 800,
            border: 'none',
            cursor: isPending ? 'wait' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            boxShadow: '0 8px 25px rgba(66, 133, 244, 0.4)',
            opacity: isPending ? 0.7 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          {isPending ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>{isEditMode ? 'Saving Changes...' : 'Activating Student Profile...'}</span>
            </>
          ) : (
            <>
              <span>{isEditMode ? 'Save Changes' : 'Complete & Activate Profile'}</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
