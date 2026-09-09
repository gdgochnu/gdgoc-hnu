/**
 * GDGoC HNU OS — Certificates System Types (§4.14)
 */

export interface FieldPosition {
  x: number; // Percentage from left (0 to 100)
  y: number; // Percentage from top (0 to 100)
  fontSize: number; // in pixels (e.g. 24, 16, 12)
  fontWeight?: 'normal' | 'medium' | 'bold' | 'black';
  fontFamily?: string;
  color: string; // hex or rgba
  align: 'left' | 'center' | 'right';
  width?: number; // percentage width for centering/alignment
  visible: boolean;
  sampleText?: string;
}

export interface CertificateFieldLayout {
  recipient_name: FieldPosition;
  title: FieldPosition;
  issue_date: FieldPosition;
  certificate_number: FieldPosition;
  qr_code: FieldPosition;
  issuer_name?: FieldPosition;
  signature_image?: FieldPosition;
}

export const DEFAULT_FIELD_LAYOUT: CertificateFieldLayout = {
  recipient_name: {
    x: 50,
    y: 44,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1d2e',
    align: 'center',
    visible: true,
    sampleText: 'Karim Mostafa',
  },
  title: {
    x: 50,
    y: 54,
    fontSize: 16,
    fontWeight: 'normal',
    color: '#475569',
    align: 'center',
    visible: true,
    sampleText: 'for successfully completing the Flutter & Firebase Bootcamp',
  },
  issue_date: {
    x: 28,
    y: 78,
    fontSize: 12,
    fontWeight: 'normal',
    color: '#64748b',
    align: 'center',
    visible: true,
    sampleText: 'September 9, 2026',
  },
  certificate_number: {
    x: 50,
    y: 88,
    fontSize: 10,
    fontWeight: 'normal',
    color: '#94a3b8',
    align: 'center',
    visible: true,
    sampleText: 'GDGOC-2026-000001',
  },
  qr_code: {
    x: 82,
    y: 76,
    fontSize: 60,
    color: '#1a1d2e',
    align: 'center',
    visible: true,
    sampleText: 'QR Code',
  },
  issuer_name: {
    x: 50,
    y: 78,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
    align: 'center',
    visible: true,
    sampleText: 'GDGoC Chapter Leadership',
  },
};

export interface CertificateTemplate {
  id: string;
  name: string;
  background_image_drive_file_id: string | null;
  background_image_url?: string | null;
  field_layout: CertificateFieldLayout;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificateRecipientInput {
  profileId?: string | null;
  name: string;
  email: string;
  attendancePct?: number;
}

export interface IssueCertificatesBatchInput {
  templateId: string;
  eventId?: string | null;
  title: string; // e.g. "Certificate of Completion — Flutter Bootcamp"
  recipients: CertificateRecipientInput[];
  issueDate?: string;
}

export interface IssueCertificatesResult {
  success: boolean;
  totalRequested: number;
  totalIssued: number;
  issuedCertificates: Array<{
    id: string;
    recipientName: string;
    certificateNumber: string;
    verificationCode: string;
    pdfUrl?: string | null;
  }>;
  errors?: string[];
}
