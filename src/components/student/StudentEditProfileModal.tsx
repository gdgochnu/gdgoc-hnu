'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  User,
  GraduationCap,
  Phone,
  Building2,
  Calendar,
  Linkedin,
  Facebook,
  Instagram,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Camera,
} from 'lucide-react';
import { StudentProfile } from '@/types/student';
import { updateStudentProfileInfo } from '@/app/student/actions';

interface StudentEditProfileModalProps {
  student: StudentProfile;
  faculties: Array<{ id: string; name_ar: string; name_en: string; sort_order?: number }>;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: (updatedStudent: Partial<StudentProfile>) => void;
}

export function StudentEditProfileModal({
  student,
  faculties,
  isOpen,
  onClose,
  onProfileUpdated,
}: StudentEditProfileModalProps) {
  const effectiveFaculties = useMemo(() => {
    if (faculties && faculties.length > 0) return faculties;
    return [
      { id: 'f-csai', name_en: 'Faculty of Computer Science & Artificial Intelligence', name_ar: 'كلية الحاسبات والذكاء الاصطناعي', sort_order: 1 },
      { id: 'f-eng', name_en: 'Faculty of Engineering', name_ar: 'كلية الهندسة', sort_order: 2 },
      { id: 'f-sci', name_en: 'Faculty of Science', name_ar: 'كلية العلوم', sort_order: 3 },
      { id: 'f-comm', name_en: 'Faculty of Commerce & Business Administration', name_ar: 'كلية التجارة وإدارة الأعمال', sort_order: 4 },
      { id: 'f-arts', name_en: 'Faculty of Applied Arts', name_ar: 'كلية الفنون التطبيقية', sort_order: 5 },
      { id: 'f-med', name_en: 'Faculty of Medicine', name_ar: 'كلية الطب', sort_order: 6 },
      { id: 'f-dent', name_en: 'Faculty of Dentistry', name_ar: 'كلية طب الأسنان', sort_order: 7 },
      { id: 'f-pharm', name_en: 'Faculty of Pharmacy', name_ar: 'كلية الصيدلة', sort_order: 8 },
      { id: 'f-nurs', name_en: 'Faculty of Nursing', name_ar: 'كلية التمريض', sort_order: 9 },
      { id: 'f-other', name_en: 'Other Faculty', name_ar: 'كلية أخرى', sort_order: 10 },
    ];
  }, [faculties]);

  const [formData, setFormData] = useState({
    full_name_ar: student.full_name_ar || '',
    full_name_en: student.full_name_en || '',
    faculty: student.faculty || (effectiveFaculties[0]?.name_en || ''),
    department_major: student.department_major || '',
    academic_year: student.academic_year || 1,
    phone: student.phone || '',
    whatsapp_number: student.whatsapp_number || '',
    facebook_url: student.facebook_url || '',
    instagram_url: student.instagram_url || '',
    linkedin_url: student.linkedin_url || '',
    avatar_url: student.avatar_url || '',
  });

  const isCurrentFacultyInList = effectiveFaculties.some(
    (f) => f.name_en === formData.faculty || f.name_ar === formData.faculty
  );

  const [activeTab, setActiveTab] = useState<'basic' | 'academic' | 'contact' | 'social'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation
    const arParts = formData.full_name_ar.trim().split(/\s+/).filter(Boolean);
    if (arParts.length < 4) {
      setErrorMsg('Arabic name must be at least 4 parts (الاسم الرباعي الرسمي بالعربية).');
      setActiveTab('basic');
      return;
    }

    const enParts = formData.full_name_en.trim().split(/\s+/).filter(Boolean);
    if (enParts.length < 4) {
      setErrorMsg('English name must be at least 4 parts (Full Official Name in English).');
      setActiveTab('basic');
      return;
    }

    if (!formData.faculty) {
      setErrorMsg('Please select your faculty / college.');
      setActiveTab('academic');
      return;
    }

    const phoneClean = formData.phone.replace(/[\s\-]/g, '');
    const phoneRegex = /^(?:\+20|20|0)?1[0125]\d{8}$/;
    if (!phoneRegex.test(phoneClean)) {
      setErrorMsg('Please enter a valid Egyptian phone number (e.g. 010xxxxxxxx).');
      setActiveTab('contact');
      return;
    }

    const waClean = formData.whatsapp_number.replace(/[\s\-]/g, '');
    if (!phoneRegex.test(waClean)) {
      setErrorMsg('Please enter a valid Egyptian WhatsApp number (e.g. 010xxxxxxxx).');
      setActiveTab('contact');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await updateStudentProfileInfo({
        full_name_ar: formData.full_name_ar,
        full_name_en: formData.full_name_en,
        faculty: formData.faculty,
        department_major: formData.department_major || undefined,
        academic_year: Number(formData.academic_year),
        phone: formData.phone,
        whatsapp_number: formData.whatsapp_number,
        facebook_url: formData.facebook_url || undefined,
        instagram_url: formData.instagram_url || undefined,
        linkedin_url: formData.linkedin_url || undefined,
        avatar_url: formData.avatar_url || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to update profile.');
        return;
      }

      setSuccessMsg('Profile updated successfully!');
      onProfileUpdated({
        full_name_ar: formData.full_name_ar,
        full_name_en: formData.full_name_en,
        faculty: formData.faculty,
        department_major: formData.department_major,
        academic_year: Number(formData.academic_year),
        phone: formData.phone,
        whatsapp_number: formData.whatsapp_number,
        facebook_url: formData.facebook_url || null,
        instagram_url: formData.instagram_url || null,
        linkedin_url: formData.linkedin_url || null,
        avatar_url: formData.avatar_url || null,
      });

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(3, 7, 18, 0.85)',
        backdropFilter: 'blur(12px)',
      }}
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(10, 15, 29, 0.98) 100%)',
          border: '1px solid rgba(66, 133, 244, 0.35)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(66, 133, 244, 0.18)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.5rem 1.75rem 1rem 1.75rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(66, 133, 244, 0.18)',
                border: '1px solid rgba(66, 133, 244, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60A5FA',
              }}
            >
              <User size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF' }}>
                Edit Student Profile
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#94A3B8' }}>
                Update your academic identity & accreditation info
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '0.45rem',
              color: '#94A3B8',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Sub-tabs navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.75rem 0 1.75rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'basic', label: 'Identity & Names' },
            { id: 'academic', label: 'Academic Study' },
            { id: 'contact', label: 'Phone & WhatsApp' },
            { id: 'social', label: 'Social & Avatar' },
          ].map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px 8px 0 0',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #4285F4' : '2px solid transparent',
                  background: isActive ? 'rgba(66, 133, 244, 0.12)' : 'transparent',
                  color: isActive ? '#60A5FA' : '#94A3B8',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Notification alerts */}
        {errorMsg && (
          <div
            style={{
              margin: '1rem 1.75rem 0 1.75rem',
              padding: '0.85rem 1.1rem',
              borderRadius: '12px',
              background: 'rgba(234, 67, 53, 0.15)',
              border: '1px solid rgba(234, 67, 53, 0.35)',
              color: '#F87171',
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              margin: '1rem 1.75rem 0 1.75rem',
              padding: '0.85rem 1.1rem',
              borderRadius: '12px',
              background: 'rgba(52, 168, 83, 0.15)',
              border: '1px solid rgba(52, 168, 83, 0.35)',
              color: '#34D399',
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div
            style={{
              padding: '1.25rem 1.75rem',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {/* TAB 1: Identity & Names */}
            {activeTab === 'basic' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#E2E8F0' }}>
                    Full Official English Name (4 parts) <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name_en}
                    onChange={(e) => handleChange('full_name_en', e.target.value)}
                    placeholder="e.g. Ahmed Mohamed Ali Hassan"
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '0.92rem',
                    }}
                  />
                  <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                    This name will appear on official Google certificates.
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#E2E8F0', textAlign: 'right' }} dir="rtl">
                    الاسم الرباعي الرسمي بالعربية <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    dir="rtl"
                    value={formData.full_name_ar}
                    onChange={(e) => handleChange('full_name_ar', e.target.value)}
                    placeholder="مثال: أحمد محمد علي حسن"
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '0.92rem',
                      textAlign: 'right',
                    }}
                  />
                </div>

                <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(66, 133, 244, 0.08)', border: '1px solid rgba(66, 133, 244, 0.2)', fontSize: '0.8rem', color: '#93C5FD', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Sparkles size={16} style={{ flexShrink: 0 }} />
                  <span>Your National ID is encrypted and securely linked to your attendance pass ({student.qr_code}).</span>
                </div>
              </>
            )}

            {/* TAB 2: Academic Study */}
            {activeTab === 'academic' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#E2E8F0' }}>
                    Faculty / College <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    value={formData.faculty}
                    onChange={(e) => handleChange('faculty', e.target.value)}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: '#0F172A',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      fontSize: '0.92rem',
                    }}
                  >
                    {!formData.faculty && (
                      <option value="" disabled style={{ background: '#0F172A' }}>
                        -- Select Faculty / اختر الكلية --
                      </option>
                    )}
                    {formData.faculty && !isCurrentFacultyInList && (
                      <option value={formData.faculty} style={{ background: '#0F172A' }}>
                        {formData.faculty}
                      </option>
                    )}
                    {effectiveFaculties.map((f) => (
                      <option key={f.id} value={f.name_en} style={{ background: '#0F172A' }}>
                        {f.name_en} — {f.name_ar}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#E2E8F0' }}>
                    Department / Academic Track (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.department_major}
                    onChange={(e) => handleChange('department_major', e.target.value)}
                    placeholder="e.g. Computer Science, AI, Cyber Security"
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '0.92rem',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#E2E8F0' }}>
                    Academic Year <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                    {[1, 2, 3, 4, 5].map((y) => {
                      const isSelected = Number(formData.academic_year) === y;
                      return (
                        <button
                          key={y}
                          type="button"
                          onClick={() => handleChange('academic_year', y)}
                          style={{
                            padding: '0.65rem 0',
                            borderRadius: '10px',
                            border: isSelected ? '1px solid #4285F4' : '1px solid rgba(255, 255, 255, 0.1)',
                            background: isSelected ? 'rgba(66, 133, 244, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                            color: isSelected ? '#60A5FA' : '#CBD5E1',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                          }}
                        >
                          Year {y}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* TAB 3: Phone & WhatsApp */}
            {activeTab === 'contact' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#E2E8F0' }}>
                    Phone Number (Egyptian Mobile) <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="010xxxxxxxx"
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '0.92rem',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#E2E8F0' }}>
                    WhatsApp Number <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.whatsapp_number}
                    onChange={(e) => handleChange('whatsapp_number', e.target.value)}
                    placeholder="010xxxxxxxx"
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '0.92rem',
                    }}
                  />
                  <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                    Used by course instructors and mentors for track group announcements.
                  </span>
                </div>
              </>
            )}

            {/* TAB 4: Social & Avatar */}
            {activeTab === 'social' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#E2E8F0' }}>
                    Profile Photo / Avatar URL
                  </label>
                  <input
                    type="url"
                    value={formData.avatar_url}
                    onChange={(e) => handleChange('avatar_url', e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '0.92rem',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Linkedin size={15} color="#0A66C2" />
                    <span>LinkedIn Profile URL</span>
                  </label>
                  <input
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) => handleChange('linkedin_url', e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '0.92rem',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Facebook size={15} color="#1877F2" />
                    <span>Facebook Profile URL</span>
                  </label>
                  <input
                    type="url"
                    value={formData.facebook_url}
                    onChange={(e) => handleChange('facebook_url', e.target.value)}
                    placeholder="https://facebook.com/yourprofile"
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '0.92rem',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Instagram size={15} color="#E4405F" />
                    <span>Instagram Profile URL</span>
                  </label>
                  <input
                    type="url"
                    value={formData.instagram_url}
                    onChange={(e) => handleChange('instagram_url', e.target.value)}
                    placeholder="https://instagram.com/yourhandle"
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '0.92rem',
                    }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Modal Actions Footer */}
          <div
            style={{
              padding: '1.25rem 1.75rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(0, 0, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              style={{
                padding: '0.75rem 1.25rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#CBD5E1',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1.75rem',
                borderRadius: '12px',
                background: '#4285F4',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(66, 133, 244, 0.4)',
              }}
            >
              {isSubmitting ? (
                'Saving Changes...'
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
