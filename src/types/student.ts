/**
 * GDGoC HNU OS — Student Portal Types
 * Spec reference: §4.S.1, §4.S.2, §4.S.10
 */

export type StudentStatus = 'incomplete' | 'active' | 'suspended';

export interface StudentProfile {
  id: string; // matches auth.users.id
  team_profile_id: string | null; // links team members who are also students
  full_name_ar: string | null;
  full_name_en: string | null;
  email: string;
  avatar_url: string | null;
  national_id: string | null;
  university: string;
  faculty: string | null;
  department_major: string | null;
  academic_year: number | null; // 1 to 5
  phone: string | null;
  whatsapp_number: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  qr_code: string; // Permanent QR code identifier e.g. STU-XXXXXXXX
  status: StudentStatus;
  created_at: string;
  updated_at: string;
}

export interface StudentOnboardingInput {
  full_name_ar: string;
  full_name_en: string;
  national_id: string;
  university?: string;
  faculty: string;
  department_major?: string;
  academic_year: number;
  phone: string;
  whatsapp_number: string;
  facebook_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
}
