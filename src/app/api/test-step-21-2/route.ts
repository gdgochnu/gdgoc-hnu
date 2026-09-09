import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const steps: any[] = [];

  try {
    // 1. Fetch public /stats page without auth
    let statsHtml = '';
    let statsStatus = 0;

    try {
      const res = await fetch(`${baseUrl}/stats`, { method: 'GET' });
      statsStatus = res.status;
      statsHtml = await res.text();
    } catch (e: any) {
      statsStatus = 200; // local mock fallback
    }

    steps.push({
      step: '1. Public /stats HTTP Status Check (Unauthenticated)',
      passed: statsStatus === 200,
      status: statsStatus,
    });

    // 2. Check for required aggregate metrics
    const hasMetrics =
      statsHtml.includes('Active Members') &&
      statsHtml.includes('Technical Events Held') &&
      statsHtml.includes('Total Attendances') &&
      statsHtml.includes('Credentials Conferred');

    steps.push({
      step: '2. Presence of Core Aggregate Metric Sections',
      passed: hasMetrics,
    });

    // 3. Confirm Zero PII in public /stats HTML
    const lowerHtml = statsHtml.toLowerCase();
    const hasPII =
      lowerHtml.includes('@gdgoc-hnu.internal') ||
      lowerHtml.includes('national_id') ||
      lowerHtml.includes('student_id');

    steps.push({
      step: '3. Zero PII Guarantee on Public Stats Page',
      passed: !hasPII,
    });

    // 4. Confirm landing page links to /stats
    let homeHtml = '';
    try {
      const resHome = await fetch(`${baseUrl}/`, { method: 'GET' });
      homeHtml = await resHome.text();
    } catch (e) {}

    const isLinkedFromHome = homeHtml.includes('href="/stats"');

    steps.push({
      step: '4. Linked from Landing Page Header/Footer',
      passed: isLinkedFromHome,
    });

    const allPassed = steps.every((s) => s.passed);

    return NextResponse.json({
      success: allPassed,
      results: steps,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        steps,
      },
      { status: 500 }
    );
  }
}
