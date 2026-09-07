'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { submitProfileCompletion } from '@/app/onboarding/complete-profile/actions';
import { FacultyOption } from '@/types';
import { 
  User, 
  Mail, 
  Phone, 
  CreditCard,
  GraduationCap, 
  BookOpen, 
  Calendar, 
  Layers, 
  Briefcase, 
  FileText, 
  CheckSquare, 
  Loader2, 
  AlertCircle,
  Clock,
  Sparkles,
  Share2,
  Check,
  Info
} from 'lucide-react';

interface DepartmentOption {
  id: string;
  code: string;
  name: string;
  branch: string;
}

export interface ExistingProfileData {
  fullNameAr?: string | null;
  fullNameEn?: string | null;
  nationalId?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  faculty?: string | null;
  departmentMajor?: string | null;
  academicYear?: number | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  linkedinUrl?: string | null;
  departmentId?: string | null;
  position?: string | null;
  motivation?: string | null;
  howHeard?: string | null;
  availabilityHours?: number | null;
  status?: string | null;
  changesRequestedNotes?: string | null;
  rejectionReason?: string | null;
}

interface CompleteProfileFormProps {
  initialEmail: string;
  initialFullName: string;
  initialAvatarUrl?: string | null;
  departments: DepartmentOption[];
  faculties: FacultyOption[];
  initialProfile?: ExistingProfileData | null;
}

export function CompleteProfileForm({
  initialEmail,
  initialFullName,
  initialAvatarUrl,
  departments,
  faculties,
  initialProfile,
}: CompleteProfileFormProps) {
  const router = useRouter();

  // Form State
  const [fullNameAr, setFullNameAr] = useState(initialProfile?.fullNameAr || '');
  const [fullNameEn, setFullNameEn] = useState(initialProfile?.fullNameEn || initialFullName || '');
  const [nationalId, setNationalId] = useState(initialProfile?.nationalId || '');
  const [phone, setPhone] = useState(initialProfile?.phone || '');
  const [whatsappNumber, setWhatsappNumber] = useState(initialProfile?.whatsappNumber || initialProfile?.phone || '');
  const [sameAsPhone, setSameAsPhone] = useState(
    !initialProfile?.whatsappNumber || initialProfile.whatsappNumber === initialProfile?.phone
  );

  const [faculty, setFaculty] = useState(
    initialProfile?.faculty || (faculties.length > 0 ? faculties[0].name_ar : '')
  );
  const [departmentMajor, setDepartmentMajor] = useState(initialProfile?.departmentMajor || '');
  const [academicYear, setAcademicYear] = useState<number>(initialProfile?.academicYear || 1);

  const [facebookUrl, setFacebookUrl] = useState(initialProfile?.facebookUrl || '');
  const [instagramUrl, setInstagramUrl] = useState(initialProfile?.instagramUrl || '');
  const [linkedinUrl, setLinkedinUrl] = useState(initialProfile?.linkedinUrl || '');

  const [departmentId, setDepartmentId] = useState(
    initialProfile?.departmentId || departments[0]?.id || ''
  );
  const [position, setPosition] = useState(initialProfile?.position || 'Member');
  const [motivation, setMotivation] = useState(initialProfile?.motivation || '');
  const [howHeard, setHowHeard] = useState(initialProfile?.howHeard || 'Social Media');
  const [availabilityHours, setAvailabilityHours] = useState(initialProfile?.availabilityHours || 8);
  const [agreeCodeOfConduct, setAgreeCodeOfConduct] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync whatsapp when sameAsPhone is checked
  useEffect(() => {
    if (sameAsPhone) {
      setWhatsappNumber(phone);
    }
  }, [phone, sameAsPhone]);

  // Word count helpers
  const countWords = (str: string) => str.trim().split(/\s+/).filter(Boolean).length;
  const arabicWordsCount = countWords(fullNameAr);
  const englishWordsCount = countWords(fullNameEn);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side quick checks
    if (arabicWordsCount < 4) {
      setError('الاسم الرباعي باللغة العربية يجب أن يتكون من 4 أسماء على الأقل.');
      return;
    }

    if (englishWordsCount < 4) {
      setError('Full name in English must contain at least 4 names.');
      return;
    }

    if (!/^[23]\d{13}$/.test(nationalId.trim())) {
      setError('الرقم القومي غير صحيح. يجب أن يتكون من 14 رقماً ويبدأ بـ 2 أو 3.');
      return;
    }

    if (!agreeCodeOfConduct) {
      setError('You must agree to the Code of Conduct to submit your application.');
      return;
    }

    try {
      setLoading(true);

      const res = await submitProfileCompletion({
        fullNameAr,
        fullNameEn,
        nationalId,
        phone,
        whatsappNumber: sameAsPhone ? phone : whatsappNumber,
        faculty,
        departmentMajor,
        academicYear,
        facebookUrl: facebookUrl || undefined,
        instagramUrl: instagramUrl || undefined,
        linkedinUrl: linkedinUrl || undefined,
        departmentId,
        position,
        motivation,
        howHeard,
        availabilityHours,
        agreeCodeOfConduct,
      });

      if (!res.success) {
        setError(res.error || 'Failed to submit profile.');
        setLoading(false);
        return;
      }

      router.push('/onboarding/status');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Revision notes alert if status is changes_requested */}
      {initialProfile?.status === 'changes_requested' && (
        <div style={{
          background: 'rgba(251, 188, 4, 0.08)',
          border: '1px solid rgba(251, 188, 4, 0.4)',
          borderRadius: '16px',
          padding: '1.5rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
        }}>
          <Clock size={24} color="var(--google-yellow)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--google-yellow)', fontSize: '1rem', marginBottom: '0.35rem' }}>
              Action Required: Revisions Requested by Leadership
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              {initialProfile.changesRequestedNotes || 'Please review and update the information below as requested by the Chapter President / Co-President.'}
            </div>
          </div>
        </div>
      )}

      {/* Global Error Alert */}
      {error && (
        <div style={{
          background: 'rgba(234, 67, 53, 0.1)',
          border: '1px solid rgba(234, 67, 53, 0.4)',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          color: '#F87171',
          fontSize: '0.92rem',
        }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Personal Identity Section */}
      <section className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={20} color="var(--google-blue)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Personal Identity (البيانات الشخصية)</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Official 4-part names and Egyptian National ID as required by university chapter rules.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* Arabic 4-part name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              الاسم باللغة العربية (رباعي) <span style={{ color: 'var(--google-red)' }}>*</span>
            </label>
            <input
              type="text"
              dir="rtl"
              required
              value={fullNameAr}
              onChange={(e) => setFullNameAr(e.target.value)}
              placeholder="مثال: أحمد محمد علي حسن"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: arabicWordsCount >= 4 ? '1px solid rgba(52, 168, 83, 0.5)' : '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginTop: '0.35rem', color: arabicWordsCount >= 4 ? 'var(--google-green)' : 'var(--text-secondary)' }}>
              <span>يجب أن يتكون من 4 أسماء على الأقل</span>
              <span>{arabicWordsCount}/4 أسماء</span>
            </div>
          </div>

          {/* English 4-part name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Full Name in English (4 parts) <span style={{ color: 'var(--google-red)' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={fullNameEn}
              onChange={(e) => setFullNameEn(e.target.value)}
              placeholder="e.g. Ahmed Mohamed Ali Hassan"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: englishWordsCount >= 4 ? '1px solid rgba(52, 168, 83, 0.5)' : '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginTop: '0.35rem', color: englishWordsCount >= 4 ? 'var(--google-green)' : 'var(--text-secondary)' }}>
              <span>Must be at least 4 names in English</span>
              <span>{englishWordsCount}/4 names</span>
            </div>
          </div>

          {/* Readonly Google Email */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Google Account Email
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '0.92rem',
            }}>
              <Mail size={16} color="var(--google-blue)" />
              <span>{initialEmail}</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.35rem' }}>
              Verified via Google Sign-in
            </span>
          </div>

          {/* National ID (14 digits) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              الرقم القومي المصري (National ID) <span style={{ color: 'var(--google-red)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                maxLength={14}
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                placeholder="14 رقماً قومياً (e.g. 3010101...)"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: nationalId.length === 14 ? '1px solid rgba(52, 168, 83, 0.5)' : '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginTop: '0.35rem', color: nationalId.length === 14 ? 'var(--google-green)' : 'var(--text-secondary)' }}>
              <span>محفوظ بأمان ولا يُعرض إلا للقيادة وإدارة الموارد البشرية (HR)</span>
              <span>{nationalId.length}/14 رقماً</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Contact & Communication Section */}
      <section className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(52, 168, 83, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Phone size={20} color="var(--google-green)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Contact & Communication (معلومات الاتصال)</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Egyptian phone numbers for chapter coordination and WhatsApp communication.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* Mobile Phone */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              رقم الهاتف المحمول (Mobile Number) <span style={{ color: 'var(--google-red)' }}>*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01012345678"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.35rem' }}>
              رقم محمول مصري (010, 011, 012, 015)
            </span>
          </div>

          {/* WhatsApp Number */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                رقم الواتساب (WhatsApp Number) <span style={{ color: 'var(--google-red)' }}>*</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={sameAsPhone}
                  onChange={(e) => {
                    setSameAsPhone(e.target.checked);
                    if (e.target.checked) setWhatsappNumber(phone);
                  }}
                  style={{ accentColor: 'var(--google-green)', cursor: 'pointer' }}
                />
                نفس رقم الهاتف
              </label>
            </div>

            <input
              type="tel"
              required
              disabled={sameAsPhone}
              value={sameAsPhone ? phone : whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="01012345678"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: sameAsPhone ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: sameAsPhone ? 'var(--text-secondary)' : 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
                cursor: sameAsPhone ? 'not-allowed' : 'text',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.35rem' }}>
              لإرسال إشعارات اللجان والمهام العاجلة
            </span>
          </div>
        </div>
      </section>

      {/* 3. Academic Details Section */}
      <section className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(251, 188, 4, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={20} color="var(--google-yellow)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Academic Details (البيانات الأكاديمية)</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Faculty, college department/major, and current academic year.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* Faculty / College (Controlled dropdown from faculty_options) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              الكلية (Faculty / College) <span style={{ color: 'var(--google-red)' }}>*</span>
            </label>
            <select
              required
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: '#131B2E',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            >
              {faculties.length === 0 ? (
                <option value="">No faculties available</option>
              ) : (
                faculties.map((f) => (
                  <option key={f.id} value={f.name_ar}>
                    {f.name_ar} ({f.name_en})
                  </option>
                ))
              )}
            </select>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.35rem' }}>
              قائمة الكليات المعتمدة بجامعة حلوان
            </span>
          </div>

          {/* Department / Major (Free text) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              القسم / التخصص (Department / Major) <span style={{ color: 'var(--google-red)' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={departmentMajor}
              onChange={(e) => setDepartmentMajor(e.target.value)}
              placeholder="مثال: علوم الحاسب / هندسة البرمجيات"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.35rem' }}>
              أدخل اسم قسمك أو برنامجك الدراسي بحرية
            </span>
          </div>

          {/* Academic Year (1-5) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              السنة الدراسية (Academic Year / Grade) <span style={{ color: 'var(--google-red)' }}>*</span>
            </label>
            <select
              required
              value={academicYear}
              onChange={(e) => setAcademicYear(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: '#131B2E',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            >
              <option value={1}>الفرقة الأولى (1st Year - Freshman)</option>
              <option value={2}>الفرقة الثانية (2nd Year - Sophomore)</option>
              <option value={3}>الفرقة الثالثة (3rd Year - Junior)</option>
              <option value={4}>الفرقة الرابعة (4th Year - Senior 1)</option>
              <option value={5}>الفرقة الخامسة (5th Year - Senior 2 / Engineering)</option>
            </select>
          </div>
        </div>
      </section>

      {/* 4. Social Media Profiles Section (Optional) */}
      <section className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(234, 67, 53, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Share2 size={20} color="var(--google-red)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Social Media & Professional Profiles (روابط التواصل - اختياري)</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Add your LinkedIn, Facebook, or Instagram profile URLs for networking.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* LinkedIn URL */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              LinkedIn Profile URL
            </label>
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/username"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Facebook URL */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Facebook Profile URL
            </label>
            <input
              type="url"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              placeholder="https://facebook.com/username"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Instagram Handle / URL */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Instagram Profile / Handle
            </label>
            <input
              type="text"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/username or @username"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </section>

      {/* 5. Chapter Application & Committee Preferences */}
      <section className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={20} color="var(--google-blue)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Chapter Application Preferences (لجنة ورغبات العضوية)</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select the committee you are applying to and specify your availability.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* Target Committee */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              اللجنة المستهدفة (Committee Applying To) <span style={{ color: 'var(--google-red)' }}>*</span>
            </label>
            <select
              required
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: '#131B2E',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.branch === 'tech' ? 'Technical Branch' : 'Non-Technical Branch'})
                </option>
              ))}
            </select>
          </div>

          {/* Preferred Position */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              المنصب المفضل (Preferred Position)
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g. Member, Co-Head, Senior Member"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Availability (hours/week) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              التفرغ الأسبوعي المتوقع (Availability hrs/week) <span style={{ color: 'var(--google-red)' }}>*</span>
            </label>
            <input
              type="number"
              min={1}
              max={60}
              required
              value={availabilityHours}
              onChange={(e) => setAvailabilityHours(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
          </div>

          {/* How heard */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              كيف سمعت عنا؟ (How did you hear about us?)
            </label>
            <select
              value={howHeard}
              onChange={(e) => setHowHeard(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: '#131B2E',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            >
              <option value="Social Media">Social Media (Facebook / LinkedIn)</option>
              <option value="Friend or Peer">Friend or Colleague Referral</option>
              <option value="University Campus Event">University Campus Event / Booth</option>
              <option value="GDG Chapter Website">GDG Chapter Website</option>
              <option value="Previous Season Member">Previous Season Member</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Motivation */}
        <div style={{ marginTop: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            دافع الانضمام (Motivation — Why join GDGoC HNU?) <span style={{ color: 'var(--google-red)' }}>*</span>
          </label>
          <textarea
            required
            rows={4}
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            placeholder="Tell us what excites you about joining GDGoC Helwan National University, your background, and what you hope to learn and contribute..."
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>
      </section>

      {/* 6. Code of Conduct & Submission */}
      <section className="glass-panel" style={{ padding: '1.75rem', borderRadius: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', marginBottom: '1.5rem' }}>
          <input
            type="checkbox"
            required
            checked={agreeCodeOfConduct}
            onChange={(e) => setAgreeCodeOfConduct(e.target.checked)}
            style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--google-blue)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            I agree to the <strong>GDGoC Community Guidelines and Chapter Code of Conduct</strong>, commit to active participation in assigned tasks and events, and confirm that all submitted academic and personal data is accurate.
          </span>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              padding: '0.85rem 2.5rem',
              fontSize: '1.05rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin-animation" />
                <span>Submitting Application...</span>
              </>
            ) : (
              <>
                <span>Submit Profile for Review</span>
                <Sparkles size={18} />
              </>
            )}
          </button>
        </div>
      </section>
    </form>
  );
}
