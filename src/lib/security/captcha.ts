import crypto from 'crypto';

/**
 * Smart CAPTCHA & Security Challenge System
 * Spec §9, §10, Checklist 23.2
 *
 * Provides:
 * 1. Dynamic arithmetic security challenges (HMAC signed, time-limited).
 * 2. Invisible honeypot field detection for spam bots.
 * 3. Tamper-evident verification.
 */

const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || 'gdgoc-hnu-smart-captcha-secret-v1';
const CHALLENGE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface CaptchaChallenge {
  challengeToken: string;
  question: string;
  expiresAt: number;
}

export interface SecurityVerificationInput {
  challengeToken?: string;
  captchaAnswer?: string | number;
  honeypot?: string;
  bypassForTest?: boolean;
}

export interface SecurityVerificationResult {
  success: boolean;
  code?: 'BOT_DETECTED' | 'MISSING_CAPTCHA' | 'EXPIRED_CAPTCHA' | 'INVALID_CAPTCHA';
  error?: string;
}

/**
 * Generates an HMAC-signed arithmetic security challenge.
 */
export function generateSecurityChallenge(): CaptchaChallenge {
  const num1 = Math.floor(Math.random() * 12) + 1;
  const num2 = Math.floor(Math.random() * 12) + 1;
  const answer = (num1 + num2).toString();
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  const nonce = crypto.randomBytes(8).toString('hex');

  const payload = `${answer}:${expiresAt}:${nonce}`;
  const signature = crypto
    .createHmac('sha256', CAPTCHA_SECRET)
    .update(payload)
    .digest('hex');

  const challengeToken = Buffer.from(JSON.stringify({ payload, signature })).toString('base64');

  return {
    challengeToken,
    question: `Security Check: What is ${num1} + ${num2}?`,
    expiresAt,
  };
}

/**
 * Verifies security challenge and honeypot inputs.
 */
export function verifySecurityChallenge(
  input: SecurityVerificationInput
): SecurityVerificationResult {
  // 1. Honeypot check: Bots routinely fill all input fields.
  // If the honeypot field has any value, block immediately.
  if (input.honeypot && input.honeypot.trim().length > 0) {
    return {
      success: false,
      code: 'BOT_DETECTED',
      error: 'Security verification failed. Automated bot activity detected.',
    };
  }

  // 2. Test bypass option for automated headless tests
  if (input.bypassForTest === true) {
    return { success: true };
  }

  // 3. Captcha challenge presence
  if (!input.challengeToken || input.captchaAnswer === undefined || input.captchaAnswer === null || input.captchaAnswer === '') {
    return {
      success: false,
      code: 'MISSING_CAPTCHA',
      error: 'Please complete the security check to proceed.',
    };
  }

  try {
    const rawJson = Buffer.from(input.challengeToken, 'base64').toString('utf8');
    const { payload, signature } = JSON.parse(rawJson);

    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', CAPTCHA_SECRET)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return {
        success: false,
        code: 'INVALID_CAPTCHA',
        error: 'Security check token is invalid or has been modified.',
      };
    }

    const [expectedAnswer, expiresAtStr] = payload.split(':');
    const expiresAt = parseInt(expiresAtStr, 10);

    // Check expiration
    if (Date.now() > expiresAt) {
      return {
        success: false,
        code: 'EXPIRED_CAPTCHA',
        error: 'Security check has expired. Please refresh and try again.',
      };
    }

    // Verify answer
    const cleanedAnswer = String(input.captchaAnswer).trim();
    if (cleanedAnswer !== expectedAnswer) {
      return {
        success: false,
        code: 'INVALID_CAPTCHA',
        error: 'Incorrect security answer. Please calculate correctly.',
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      code: 'INVALID_CAPTCHA',
      error: 'Invalid security challenge format.',
    };
  }
}
