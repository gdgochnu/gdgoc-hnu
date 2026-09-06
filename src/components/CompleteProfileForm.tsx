'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitProfileCompletion } from '@/app/onboarding/complete-profile/actions';
import { 
  User, 
  Mail, 
  Phone, 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  Layers, 
  Briefcase, 
  Code, 
  Globe, 
  FileText, 
  CheckSquare, 
  Loader2, 
  AlertCircle,
  Clock,
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface DepartmentOption {
  id: string;
  code: string;
  name: string;
  branch: string;
}

export interface ExistingProfileData {
  phone?: string | null;
  universityId?: string | null;
  faculty?: string | null;
  academicYear?: string | null;
  departmentId?: string | null;
  position?: string | null;
  skills?: string[] | null;
  portfolioUrl?: string | null;
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
  initialProfile?: ExistingProfileData | null;
}

export function CompleteProfileForm({
  initialEmail,
  initialFullName,
  initialAvatarUrl,
  departments,
  initialProfile,
}: CompleteProfileFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName || '');
  const [phone, setPhone] = useState(initialProfile?.phone || '');
  const [universityId, setUniversityId] = useState(initialProfile?.universityId || '');
  const [faculty, setFaculty] = useState(initialProfile?.faculty || '');
  const [academicYear, setAcademicYear] = useState(initialProfile?.academicYear || '1st Year (Freshman)');
  const [departmentId, setDepartmentId] = useState(initialProfile?.departmentId || departments[0]?.id || '');
  const [position, setPosition] = useState(initialProfile?.position || 'Member');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>(initialProfile?.skills && initialProfile.skills.length > 0 ? initialProfile.skills : ['Problem Solving']);
  const [portfolioUrl, setPortfolioUrl] = useState(initialProfile?.portfolioUrl || '');
  const [motivation, setMotivation] = useState(initialProfile?.motivation || '');
  const [howHeard, setHowHeard] = useState(initialProfile?.howHeard || 'Social Media');
  const [availabilityHours, setAvailabilityHours] = useState(initialProfile?.availabilityHours || 8);
  const [agreeCodeOfConduct, setAgreeCodeOfConduct] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = skillInput.trim().replace(',', '');
      if (val && !skills.includes(val)) {
        setSkills([...skills, val]);
        setSkillInput('');
      }
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeCodeOfConduct) {
      setError('You must agree to the Code of Conduct to proceed.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await submitProfileCompletion({
        fullName,
        phone,
        universityId,
        faculty,
        academicYear,
        departmentId,
        position,
        skills,
        portfolioUrl,
        motivation,
        howHeard,
        availabilityHours,
        agreeCodeOfConduct,
      });

      if (res && res.success) {
        router.push('/onboarding/status');
        router.refresh();
      } else {
        setError(res?.error || 'Submission failed. Please check all fields.');
        setLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during submission.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2.5rem', maxWidth: '820px', margin: '0 auto' }}>
      {/* Header Avatar & Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '2rem' }}>
        {initialAvatarUrl ? (
          <img
            src={initialAvatarUrl}
            alt={fullName}
            style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--google-blue)' }}
          />
        ) : (
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={30} color="var(--google-blue)" />
          </div>
        )}
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{fullName || 'New Member'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <Mail size={14} color="var(--google-green)" />
            <span>{initialEmail}</span>
            <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'rgba(52, 168, 83, 0.15)', color: '#86EFAC', borderRadius: '4px' }}>
              Google Verified
            </span>
          </div>
        </div>
      </div>

      {/* Leadership Feedback Banner (if changes requested) */}
      {initialProfile?.changesRequestedNotes ? (
        <div style={{ background: 'rgba(251, 188, 4, 0.12)', border: '1px solid rgba(251, 188, 4, 0.4)', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#FDE047', fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.35rem' }}>
            <AlertCircle size={18} />
            <span>Leadership Revision Request</span>
          </div>
          <div style={{ color: '#FFFBEB', fontSize: '0.92rem', lineHeight: 1.6 }}>
            {initialProfile.changesRequestedNotes}
          </div>
        </div>
      ) : null}

      {/* Previous Rejection Banner (if re-applying) */}
      {initialProfile?.status === 'rejected' && initialProfile?.rejectionReason ? (
        <div style={{ background: 'rgba(234, 67, 53, 0.1)', border: '1px solid rgba(234, 67, 53, 0.3)', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#FCA5A5', fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.35rem' }}>
            <AlertCircle size={18} />
            <span>Previous Review Feedback</span>
          </div>
          <div style={{ color: '#FEE2E2', fontSize: '0.92rem', lineHeight: 1.6 }}>
            {initialProfile.rejectionReason}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
            You may revise your application below to re-apply.
          </div>
        </div>
      ) : null}

      {error ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.85rem 1.25rem', borderRadius: '10px', background: 'rgba(234, 67, 53, 0.12)', border: '1px solid rgba(234, 67, 53, 0.3)', color: '#FCA5A5', marginBottom: '1.75rem', fontSize: '0.9rem' }}>
          <AlertCircle size={18} color="var(--google-red)" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Section 1: Personal Details */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={18} color="var(--google-blue)" />
          <span>1. Personal & Academic Information</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ahmed Mahmoud"
              className="input-field"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Phone Number (WhatsApp) *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 01012345678"
              className="input-field"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              University / Student ID *
            </label>
            <input
              type="text"
              required
              value={universityId}
              onChange={(e) => setUniversityId(e.target.value)}
              placeholder="e.g. 202410885"
              className="input-field"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Faculty / College *
            </label>
            <select
              value={faculty}
              required
              onChange={(e) => setFaculty(e.target.value)}
              className="input-field"
            >
              <option value="" disabled>Select your faculty</option>
              <option value="Computer Science & AI">Faculty of Computer Science & AI</option>
              <option value="Engineering">Faculty of Engineering</option>
              <option value="Applied Arts">Faculty of Applied Arts</option>
              <option value="Commerce & Business Administration">Faculty of Commerce & Business</option>
              <option value="Science">Faculty of Science</option>
              <option value="Other">Other Faculty</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Academic Year *
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="input-field"
            >
              <option value="1st Year (Freshman)">1st Year (Freshman)</option>
              <option value="2nd Year (Sophomore)">2nd Year (Sophomore)</option>
              <option value="3rd Year (Junior)">3rd Year (Junior)</option>
              <option value="4th Year (Senior)">4th Year (Senior)</option>
              <option value="Postgraduate / Alumni">Postgraduate / Alumni</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Committee & Position */}
      <div style={{ marginBottom: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={18} color="var(--google-yellow)" />
          <span>2. Committee & Role Selection</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Committee You Are Applying To *
            </label>
            <select
              value={departmentId}
              required
              onChange={(e) => setDepartmentId(e.target.value)}
              className="input-field"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.branch === 'tech' ? 'Tech Branch' : 'Non-Tech Branch'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Preferred Position / Role
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g. Member, Technical Lead, Coordinator"
              className="input-field"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Availability (Hours per Week) *
            </label>
            <input
              type="number"
              min={2}
              max={40}
              required
              value={availabilityHours}
              onChange={(e) => setAvailabilityHours(Number(e.target.value))}
              className="input-field"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              How Did You Hear About Us?
            </label>
            <select
              value={howHeard}
              onChange={(e) => setHowHeard(e.target.value)}
              className="input-field"
            >
              <option value="Social Media (Facebook / LinkedIn / Instagram)">Social Media</option>
              <option value="Campus Booth / Physical Posters">Campus Booth / Posters</option>
              <option value="Friend or Peer Referral">Friend / Peer Referral</option>
              <option value="Attended a Previous GDGoC Event">Previous Event</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 3: Skills, Portfolio & Motivation */}
      <div style={{ marginBottom: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} color="var(--google-green)" />
          <span>3. Skills, Portfolio & Motivation</span>
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Skills & Tools (Press Enter or comma to add)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {skills.map((skill, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'rgba(66, 133, 244, 0.15)',
                    color: '#93C5FD',
                    border: '1px solid rgba(66, 133, 244, 0.3)',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '999px',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                  }}
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    style={{ background: 'none', border: 'none', color: '#93C5FD', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleAddSkill}
              placeholder="e.g. Next.js, Python, Figma, Public Speaking (Press Enter)"
              className="input-field"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Portfolio / GitHub / LinkedIn / CV Link
            </label>
            <input
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://github.com/username or https://linkedin.com/in/..."
              className="input-field"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Why do you want to join GDGoC HNU? *
            </label>
            <textarea
              required
              rows={4}
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder="Share your goals, what you hope to learn or contribute, and why this committee interests you..."
              className="input-field"
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>
      </div>

      {/* Code of Conduct Agreement */}
      <div style={{ marginBottom: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            required
            checked={agreeCodeOfConduct}
            onChange={(e) => setAgreeCodeOfConduct(e.target.checked)}
            style={{ width: '18px', height: '18px', marginTop: '0.2rem', accentColor: 'var(--google-blue)' }}
          />
          <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            I agree to uphold the <strong style={{ color: 'var(--text-primary)' }}>Google Developer Groups Community Guidelines</strong> and the chapter Code of Conduct. I commit to active collaboration, mutual respect, and chapter participation.
          </span>
        </label>
      </div>

      {/* Submit Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{ padding: '0.9rem 2.2rem', fontSize: '1rem', fontWeight: 700 }}
          id="submit-profile-btn"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Submitting Application...</span>
            </>
          ) : (
            <span>
              {initialProfile?.status === 'changes_requested'
                ? 'Submit Revisions for Review'
                : initialProfile?.status === 'rejected'
                ? 'Submit Re-application'
                : 'Submit Application for Review'}
            </span>
          )}
        </button>
      </div>
    </form>
  );
}
