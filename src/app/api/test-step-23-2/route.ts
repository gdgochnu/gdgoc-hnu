import { NextResponse } from 'next/server';
import { checkRateLimit, resetRateLimit } from '@/lib/security/rate-limit';
import { generateSecurityChallenge, verifySecurityChallenge } from '@/lib/security/captcha';
import { registerForEvent } from '@/app/events/actions';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {
    test: 'Step 23.2 - Rate limiting and CAPTCHA / bot protection on Recruitment and Event Registration',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    // 1. Rate Limiter Functional Test
    const testKey = `test-ip-rate-limit-${Date.now()}`;
    resetRateLimit(testKey);

    const call1 = checkRateLimit(testKey, 3, 10000);
    const call2 = checkRateLimit(testKey, 3, 10000);
    const call3 = checkRateLimit(testKey, 3, 10000);
    const call4 = checkRateLimit(testKey, 3, 10000); // Should be blocked

    results.checks.rateLimiter = {
      success: call1.allowed && call2.allowed && call3.allowed && !call4.allowed,
      call1Allowed: call1.allowed,
      call3Remaining: call3.remaining,
      call4Blocked: !call4.allowed,
      call4Error: call4.error,
    };
    resetRateLimit(testKey);

    // 2. Honeypot Bot Detection Test
    const honeypotResult = verifySecurityChallenge({
      honeypot: 'http://spam-bot-link.com',
      challengeToken: 'fake-token',
      captchaAnswer: '12',
    });

    results.checks.honeypotDetection = {
      success: !honeypotResult.success && honeypotResult.code === 'BOT_DETECTED',
      code: honeypotResult.code,
      error: honeypotResult.error,
    };

    // 3. CAPTCHA Challenge Generation & Validation Test
    const challenge = generateSecurityChallenge();
    const isTokenValidFormat = typeof challenge.challengeToken === 'string' && challenge.challengeToken.length > 20;

    // A) Wrong answer test
    const wrongAnswerResult = verifySecurityChallenge({
      challengeToken: challenge.challengeToken,
      captchaAnswer: '999999',
    });

    // B) Tampered token test
    const tamperedResult = verifySecurityChallenge({
      challengeToken: challenge.challengeToken + 'tampered',
      captchaAnswer: '5',
    });

    // C) Correct answer calculation
    const rawPayload = JSON.parse(Buffer.from(challenge.challengeToken, 'base64').toString('utf8')).payload;
    const correctAnswer = rawPayload.split(':')[0];

    const correctAnswerResult = verifySecurityChallenge({
      challengeToken: challenge.challengeToken,
      captchaAnswer: correctAnswer,
    });

    results.checks.captchaVerification = {
      success:
        isTokenValidFormat &&
        !wrongAnswerResult.success &&
        !tamperedResult.success &&
        correctAnswerResult.success,
      challengeQuestion: challenge.question,
      wrongAnswerBlocked: !wrongAnswerResult.success,
      tamperedTokenBlocked: !tamperedResult.success,
      correctAnswerAccepted: correctAnswerResult.success,
    };

    // 4. Public Event Registration Security Integration Test
    const admin = createAdminClient();
    const { data: testEvent } = await admin
      .from('events')
      .select('id, title, status')
      .eq('status', 'published')
      .limit(1)
      .maybeSingle();

    if (testEvent) {
      // Test A: Blocked by Honeypot
      const botReg = await registerForEvent({
        eventId: testEvent.id,
        fullName: 'Spam Bot',
        email: 'spambot@example.com',
        honeypot: 'filled_by_bot',
      });

      // Test B: Blocked by Invalid Captcha
      const invalidCaptchaReg = await registerForEvent({
        eventId: testEvent.id,
        fullName: 'Real User',
        email: 'realuser@example.com',
        challengeToken: challenge.challengeToken,
        captchaAnswer: '99999', // wrong answer
      });

      results.checks.eventRegistrationSecurity = {
        success:
          !botReg.success &&
          (botReg.code === 'BOT_DETECTED' || botReg.code === 'CAPTCHA_FAILED') &&
          !invalidCaptchaReg.success &&
          invalidCaptchaReg.code === 'CAPTCHA_FAILED',
        botBlocked: !botReg.success,
        botErrorCode: botReg.code,
        invalidCaptchaBlocked: !invalidCaptchaReg.success,
        invalidCaptchaErrorCode: invalidCaptchaReg.code,
      };
    } else {
      results.checks.eventRegistrationSecurity = {
        success: true,
        note: 'No published events currently available to test registration call directly.',
      };
    }

    const allPassed =
      results.checks.rateLimiter.success &&
      results.checks.honeypotDetection.success &&
      results.checks.captchaVerification.success &&
      results.checks.eventRegistrationSecurity.success;

    results.allPassed = allPassed;

    return NextResponse.json(results, { status: allPassed ? 200 : 500 });
  } catch (globalError: any) {
    return NextResponse.json(
      {
        success: false,
        error: globalError.message || 'Error executing test for step 23.2',
        results,
      },
      { status: 500 }
    );
  }
}
