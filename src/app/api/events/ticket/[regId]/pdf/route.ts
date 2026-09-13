import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import QRCode from 'qrcode';
import { TicketPDF } from '@/lib/events/ticket-pdf';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ regId: string }> }
) {
  try {
    const { regId } = await params;
    if (!regId) {
      return NextResponse.json({ error: 'Registration ID required' }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Fetch registration with event
    const { data: registration, error: regErr } = await admin
      .from('event_registrations')
      .select('*, event:events(*)')
      .eq('id', regId)
      .maybeSingle();

    if (regErr || !registration || !registration.event) {
      return NextResponse.json({ error: 'Ticket registration not found' }, { status: 404 });
    }

    // 2. Check if already checked in
    const { data: att } = await admin
      .from('attendance')
      .select('id, check_in_time')
      .eq('event_id', registration.event_id)
      .eq('registration_id', registration.id)
      .maybeSingle();

    // 3. Generate QR code PNG data URL for the PDF
    const qrDataUrl = await QRCode.toDataURL(registration.qr_code, {
      width: 260,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    });

    // 4. Render PDF Document
    const pdfElement = createElement(TicketPDF, {
      event: registration.event,
      registration,
      qrDataUrl,
      isCheckedIn: !!att,
    });

    const buffer = await renderToBuffer(pdfElement as any);
    const cleanFileName = `GDGoC_Ticket_${(registration.event.slug || 'event')}_${registration.qr_code}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${cleanFileName}"`,
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (err: any) {
    console.error('Error generating ticket PDF:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate ticket PDF' },
      { status: 500 }
    );
  }
}
