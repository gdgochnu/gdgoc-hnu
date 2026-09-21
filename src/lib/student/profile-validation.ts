import { StudentProfile } from '@/types/student';

/**
 * Validates whether a student profile has satisfied all mandatory onboarding fields
 * and has an active account status.
 */
export function isStudentProfileComplete(student: Partial<StudentProfile> | null | undefined): boolean {
  if (!student) return false;
  if (student.status !== 'active') return false;

  // 1. Arabic Name: at least 4 parts
  const nameAr = (student.full_name_ar || '').trim();
  if (nameAr.split(/\s+/).filter(Boolean).length < 4) return false;

  // 2. English Name: at least 4 parts
  const nameEn = (student.full_name_en || '').trim();
  if (nameEn.split(/\s+/).filter(Boolean).length < 4) return false;

  // 3. National ID: exactly 14 numeric digits
  const nationalId = (student.national_id || '').trim();
  if (!/^\d{14}$/.test(nationalId)) return false;

  // 4. Faculty: required
  const faculty = (student.faculty || '').trim();
  if (!faculty) return false;

  // 5. Academic Year: integer between 1 and 5
  const academicYear = Number(student.academic_year);
  if (!academicYear || isNaN(academicYear) || academicYear < 1 || academicYear > 5) return false;

  // 6. Phone & WhatsApp: valid Egyptian mobile number format
  const phone = (student.phone || '').replace(/[\s\-\(\)]/g, '');
  const whatsapp = (student.whatsapp_number || '').replace(/[\s\-\(\)]/g, '');
  const phoneRegex = /^(?:\+20|20|0)?1[0125]\d{8}$/;
  if (!phone || !phoneRegex.test(phone)) return false;
  if (!whatsapp || !phoneRegex.test(whatsapp)) return false;

  return true;
}
