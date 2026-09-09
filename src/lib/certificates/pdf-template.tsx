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

const styles = StyleSheet.create({
  page: {
    width: 842, // A4 landscape width in points
    height: 595, // A4 landscape height in points
    backgroundColor: '#ffffff',
    position: 'relative',
    fontFamily: 'Helvetica',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 842,
    height: 595,
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

function calculatePositionStyle(field: FieldPosition, pageWidth = 842, pageHeight = 595) {
  // Translate percentage (x, y) to absolute coordinates in points
  const left = (field.x / 100) * pageWidth;
  const top = (field.y / 100) * pageHeight;

  return {
    position: 'absolute' as const,
    left: left - 250, // anchor center offset
    top: top - 20,
    width: 500,
    textAlign: field.align || 'center',
    color: field.color || '#1e293b',
    fontSize: field.fontSize || 14,
    fontFamily: field.fontWeight === 'bold' || field.fontWeight === 'black' ? 'Helvetica-Bold' : 'Helvetica',
  };
}

export function CertificatePDFDocument({ data }: { data: CertificateData }) {
  const { fieldLayout } = data;

  return (
    <Document title={`Certificate — ${data.recipientName}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Background Image if uploaded */}
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
            Issued on {data.issueDate}
          </Text>
        )}

        {/* 4. Serial / Certificate Number */}
        {fieldLayout.certificate_number?.visible !== false && (
          <Text style={calculatePositionStyle(fieldLayout.certificate_number)}>
            Credential ID: {data.certificateNumber}
          </Text>
        )}

        {/* 5. Issuer Sign-off */}
        {fieldLayout.issuer_name && fieldLayout.issuer_name.visible !== false && (
          <Text style={calculatePositionStyle(fieldLayout.issuer_name)}>
            Chapter Presidential Leadership
          </Text>
        )}

        {/* 6. Verification QR Code */}
        {fieldLayout.qr_code?.visible !== false && (
          <View
            style={{
              position: 'absolute',
              left: (fieldLayout.qr_code.x / 100) * 842 - 35,
              top: (fieldLayout.qr_code.y / 100) * 595 - 35,
              width: 70,
              height: 70,
              backgroundColor: '#ffffff',
              padding: 4,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {data.qrCodeDataUrl ? (
              <Image src={data.qrCodeDataUrl} style={{ width: 62, height: 62 }} />
            ) : null}
            <Text style={{ fontSize: 6, color: '#94a3b8', marginTop: 2, textAlign: 'center' }}>
              Scan to Verify
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
