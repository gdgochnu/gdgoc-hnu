import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';

interface TicketPDFProps {
  event: {
    title: string;
    event_date: string;
    start_time?: string | null;
    end_time?: string | null;
    venue?: string | null;
  };
  registration: {
    id: string;
    full_name: string;
    email: string;
    phone?: string | null;
    qr_code: string;
    status: string;
    created_at: string;
  };
  qrDataUrl: string;
  isCheckedIn?: boolean;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: '#0B0F19',
    color: '#F8FAFC',
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 480,
    backgroundColor: '#131B2E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A344D',
    overflow: 'hidden',
  },
  topBar: {
    height: 6,
    backgroundColor: '#4285F4',
    flexDirection: 'row',
  },
  barBlue: { flex: 1, backgroundColor: '#4285F4' },
  barRed: { flex: 1, backgroundColor: '#EA4335' },
  barYellow: { flex: 1, backgroundColor: '#FBBC04' },
  barGreen: { flex: 1, backgroundColor: '#34A853' },
  header: {
    padding: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#202C45',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chapterBrand: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#60A5FA',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subBrand: {
    fontSize: 8,
    color: '#94A3B8',
    marginTop: 2,
  },
  badge: {
    backgroundColor: 'rgba(52, 168, 83, 0.15)',
    borderWidth: 1,
    borderColor: '#34A853',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#4ADE80',
    textTransform: 'uppercase',
  },
  badgeUsed: {
    backgroundColor: 'rgba(234, 67, 53, 0.15)',
    borderWidth: 1,
    borderColor: '#EA4335',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgeUsedText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FCA5A5',
    textTransform: 'uppercase',
  },
  body: {
    padding: 24,
    flexDirection: 'row',
    gap: 20,
  },
  detailsCol: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 1.3,
  },
  metaItem: {
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 7,
    textTransform: 'uppercase',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#E2E8F0',
  },
  qrCol: {
    width: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
  },
  qrImage: {
    width: 116,
    height: 116,
  },
  qrCodeText: {
    fontSize: 7,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 6,
    textAlign: 'center',
  },
  footer: {
    backgroundColor: '#0F1626',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#202C45',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  singleUseNotice: {
    fontSize: 7,
    color: '#94A3B8',
  },
  securityText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#60A5FA',
    letterSpacing: 0.5,
  },
});

export function TicketPDF({ event, registration, qrDataUrl, isCheckedIn = false }: TicketPDFProps) {
  const formattedDate = new Date(event.event_date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const timeString = `${event.start_time || '10:00 AM'}${event.end_time ? ` - ${event.end_time}` : ''}`;

  return (
    <Document title={`Ticket - ${event.title} - ${registration.full_name}`}>
      <Page size="A5" orientation="landscape" style={styles.page}>
        <View style={styles.card}>
          {/* Top Google Colors Strip */}
          <View style={styles.topBar}>
            <View style={styles.barBlue} />
            <View style={styles.barRed} />
            <View style={styles.barYellow} />
            <View style={styles.barGreen} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.chapterBrand}>GDGoC Helwan National University</Text>
              <Text style={styles.subBrand}>Official Single-Use Admission Pass</Text>
            </View>

            <View style={isCheckedIn ? styles.badgeUsed : styles.badge}>
              <Text style={isCheckedIn ? styles.badgeUsedText : styles.badgeText}>
                {isCheckedIn ? 'USED / CHECKED IN' : 'CONFIRMED PASS'}
              </Text>
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.body}>
            {/* Left Column: Event & Attendee Details */}
            <View style={styles.detailsCol}>
              <Text style={styles.eventTitle}>{event.title}</Text>

              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>ATTENDEE NAME</Text>
                <Text style={styles.metaValue}>{registration.full_name}</Text>
              </View>

              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>DATE & TIME</Text>
                <Text style={styles.metaValue}>{formattedDate} • {timeString}</Text>
              </View>

              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>VENUE</Text>
                <Text style={styles.metaValue}>{event.venue || 'Helwan National University'}</Text>
              </View>

              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>EMAIL & PHONE</Text>
                <Text style={styles.metaValue}>{registration.email}{registration.phone ? ` • ${registration.phone}` : ''}</Text>
              </View>
            </View>

            {/* Right Column: QR Box */}
            <View style={styles.qrCol}>
              {qrDataUrl && <Image src={qrDataUrl} style={styles.qrImage} />}
              <Text style={styles.qrCodeText}>{registration.qr_code}</Text>
            </View>
          </View>

          {/* Security Footer */}
          <View style={styles.footer}>
            <Text style={styles.singleUseNotice}>
              ⚠️ Single-Use Ticket: Valid for exactly 1 entrance check-in. Present Student ID upon arrival.
            </Text>
            <Text style={styles.securityText}>GDGoC-HNU-PASS</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
