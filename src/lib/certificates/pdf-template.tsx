import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import type { CertificateFieldLayout, FieldPosition } from '@/types/certificates';

export interface CertificateData {
  recipientName: string;
  recipientEmail: string;
  title: string;
  issueDate: string;
  certificateNumber: string;
  verificationCode: string;
  verifyUrl: string;
  qrCodeDataUrl: string;
  backgroundImageUrl?: string | null;
  fieldLayout: CertificateFieldLayout;
}

const PAGE_WIDTH = 842; // A4 landscape in points
const PAGE_HEIGHT = 595; // A4 landscape in points

const styles = StyleSheet.create({
  page: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    backgroundColor: '#ffffff',
    position: 'relative',
    fontFamily: 'Helvetica',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    objectFit: 'cover' as const,
    objectPosition: 'center' as const,
  },
  borderFrame: {
    position: 'absolute',
    top: 24,
    left: 24,
    right: 24,
    bottom: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  googleStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    display: 'flex',
    flexDirection: 'row',
  },
  stripBlue: { flex: 1, backgroundColor: '#4285F4' },
  stripRed: { flex: 1, backgroundColor: '#EA4335' },
  stripYellow: { flex: 1, backgroundColor: '#FBBC04' },
  stripGreen: { flex: 1, backgroundColor: '#34A853' },
  headerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  subHeaderText: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: 4,
  },
});

/**
 * Calculates pixel-perfect positioning matching web canvas transform: translate(-50%, -50%)
 */
function calculatePositionStyle(
  field: FieldPosition,
  pageWidth = PAGE_WIDTH,
  pageHeight = PAGE_HEIGHT
) {
  const fontSize = field.fontSize || 14;
  const align = field.align || 'center';

  // Calculate top coordinate so vertical center aligns with field.y%
  const centerTop = (field.y / 100) * pageHeight;
  const top = centerTop - fontSize * 0.6;

  if (align === 'left') {
    const left = (field.x / 100) * pageWidth;
    const width = Math.max(100, pageWidth - left - 24);
    return {
      position: 'absolute' as const,
      left,
      top,
      width,
      textAlign: 'left' as const,
      color: field.color || '#1e293b',
      fontSize,
      fontFamily:
        field.fontWeight === 'bold' || field.fontWeight === 'black'
          ? 'Helvetica-Bold'
          : 'Helvetica',
    };
  }

  if (align === 'right') {
    const right = (field.x / 100) * pageWidth;
    const width = Math.max(100, right - 24);
    const left = right - width;
    return {
      position: 'absolute' as const,
      left,
      top,
      width,
      textAlign: 'right' as const,
      color: field.color || '#1e293b',
      fontSize,
      fontFamily:
        field.fontWeight === 'bold' || field.fontWeight === 'black'
          ? 'Helvetica-Bold'
          : 'Helvetica',
    };
  }

  // Default: align === 'center'
  if (Math.abs(field.x - 50) <= 2) {
    // Exactly or near center: span full width with margins to prevent wrapping
    return {
      position: 'absolute' as const,
      left: 24,
      top,
      width: pageWidth - 48,
      textAlign: 'center' as const,
      color: field.color || '#1e293b',
      fontSize,
      fontFamily:
        field.fontWeight === 'bold' || field.fontWeight === 'black'
          ? 'Helvetica-Bold'
          : 'Helvetica',
    };
  }

  // Off-center center-aligned: box centered at field.x%
  const centerX = (field.x / 100) * pageWidth;
  const maxHalfWidth = Math.min(centerX - 24, pageWidth - 24 - centerX);
  const width = Math.max(120, Math.min(500, maxHalfWidth * 2));
  const left = centerX - width / 2;

  return {
    position: 'absolute' as const,
    left,
    top,
    width,
    textAlign: 'center' as const,
    color: field.color || '#1e293b',
    fontSize,
    fontFamily:
      field.fontWeight === 'bold' || field.fontWeight === 'black'
        ? 'Helvetica-Bold'
        : 'Helvetica',
  };
}

export function CertificatePDFDocument({ data }: { data: CertificateData }) {
  const { fieldLayout } = data;

  // QR Code coordinates
  const qrField = fieldLayout.qr_code || { x: 82, y: 76, fontSize: 85 };
  const qrSize = Math.max(48, qrField.fontSize || 85);
  const qrLeft = (qrField.x / 100) * PAGE_WIDTH - qrSize / 2;
  const qrTop = (qrField.y / 100) * PAGE_HEIGHT - qrSize / 2;

  return (
    <Document title={`Certificate — ${data.recipientName}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Background Image with objectFit cover (no squishing/distortion) */}
        {data.backgroundImageUrl ? (
          <Image src={data.backgroundImageUrl} style={styles.background} />
        ) : (
          <>
            {/* Fallback Google Developer Groups Design */}
            <View style={styles.googleStrip}>
              <View style={styles.stripBlue} />
              <View style={styles.stripRed} />
              <View style={styles.stripYellow} />
              <View style={styles.stripGreen} />
            </View>

            <View style={styles.borderFrame} />

            {/* Chapter Header */}
            <View style={{ position: 'absolute', top: 50, left: 0, right: 0 }}>
              <Text style={styles.headerText}>Google Developer Groups on Campus</Text>
              <Text style={styles.subHeaderText}>Helwan University Chapter • Cairo, Egypt</Text>
            </View>
          </>
        )}

        {/* 1. Recipient Name */}
        {fieldLayout.recipient_name?.visible !== false && (
          <Text style={calculatePositionStyle(fieldLayout.recipient_name)}>
            {data.recipientName}
          </Text>
        )}

        {/* 2. Certificate Title */}
        {fieldLayout.title?.visible !== false && (
          <Text style={calculatePositionStyle(fieldLayout.title)}>
            {data.title}
          </Text>
        )}

        {/* 3. Issue Date */}
        {fieldLayout.issue_date?.visible !== false && (
          <Text style={calculatePositionStyle(fieldLayout.issue_date)}>
            {data.issueDate}
          </Text>
        )}

        {/* 4. Serial / Certificate Number */}
        {fieldLayout.certificate_number?.visible !== false && (
          <Text style={calculatePositionStyle(fieldLayout.certificate_number)}>
            {data.certificateNumber}
          </Text>
        )}

        {/* 5. Issuer Sign-off */}
        {fieldLayout.issuer_name && fieldLayout.issuer_name.visible !== false && (
          <Text style={calculatePositionStyle(fieldLayout.issuer_name)}>
            {fieldLayout.issuer_name.sampleText || 'Chapter Presidential Leadership'}
          </Text>
        )}

        {/* 6. Verification QR Code */}
        {qrField.visible !== false && (
          <View
            style={{
              position: 'absolute',
              left: qrLeft,
              top: qrTop,
              width: qrSize,
              height: qrSize,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {data.qrCodeDataUrl ? (
              <Image
                src={data.qrCodeDataUrl}
                style={{ width: qrSize, height: qrSize }}
              />
            ) : null}
          </View>
        )}

        {/* 7. Any Custom Elements Added by User */}
        {Object.entries(fieldLayout)
          .filter(
            ([key, field]) =>
              ![
                'recipient_name',
                'title',
                'issue_date',
                'certificate_number',
                'issuer_name',
                'qr_code',
                'signature_image',
              ].includes(key) &&
              field &&
              field.visible !== false
          )
          .map(([key, field]) => (
            <Text key={key} style={calculatePositionStyle(field!)}>
              {field!.sampleText || ''}
            </Text>
          ))}
      </Page>
    </Document>
  );
}
