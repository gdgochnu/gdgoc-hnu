import { NextRequest, NextResponse } from 'next/server';
import {
  sanitizePlainText,
  sanitizeRichText,
  escapeHtml,
  containsXssPayload,
} from '@/lib/security/sanitizer';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const results: Record<string, any> = {};

  try {
    // 1. Test rich-text sanitization against common XSS vectors
    const scriptPayload = '<p>Hello world! <script>alert("xss")</script>Welcome.</p>';
    const sanitizedScript = sanitizeRichText(scriptPayload);
    const scriptNeutralized = !sanitizedScript.includes('<script>') && !sanitizedScript.includes('alert(');

    const iframePayload = '<div>Check this out: <iframe src="http://evil.com"></iframe>done</div>';
    const sanitizedIframe = sanitizeRichText(iframePayload);
    const iframeNeutralized = !sanitizedIframe.includes('<iframe') && !sanitizedIframe.includes('evil.com');

    const eventHandlerPayload = '<p>Click here <b onclick="evilCode()" onmouseover="stealCookies()">Bold Text</b></p>';
    const sanitizedEventHandler = sanitizeRichText(eventHandlerPayload);
    const handlerNeutralized = !sanitizedEventHandler.includes('onclick') && !sanitizedEventHandler.includes('onmouseover');

    const javascriptHrefPayload = '<a href="javascript:alert(document.cookie)">Malicious Link</a>';
    const sanitizedHref = sanitizeRichText(javascriptHrefPayload);
    const javascriptProtocolNeutralized = !sanitizedHref.includes('javascript:');

    const safeFormattingPreserved =
      sanitizedScript.includes('<p>') &&
      sanitizedScript.includes('Hello world!') &&
      sanitizedEventHandler.includes('<b>Bold Text</b>');

    const safeLinkPayload = '<a href="https://google.com">Official Site</a>';
    const sanitizedSafeLink = sanitizeRichText(safeLinkPayload);
    const safeLinkPreserved =
      sanitizedSafeLink.includes('href="https://google.com"') &&
      sanitizedSafeLink.includes('rel="noopener noreferrer"');

    results.richTextSanitization = {
      success:
        scriptNeutralized &&
        iframeNeutralized &&
        handlerNeutralized &&
        javascriptProtocolNeutralized &&
        safeFormattingPreserved &&
        safeLinkPreserved,
      scriptNeutralized,
      iframeNeutralized,
      handlerNeutralized,
      javascriptProtocolNeutralized,
      safeFormattingPreserved,
      safeLinkPreserved,
      samples: {
        scriptPayloadCleaned: sanitizedScript,
        eventHandlerCleaned: sanitizedEventHandler,
        javascriptHrefCleaned: sanitizedHref,
        safeLinkCleaned: sanitizedSafeLink,
      },
    };

    // 2. Test plain-text sanitization (e.g., titles, names, short inputs)
    const rawPlainName = '   <h1>Dr. John Doe</h1><script>steal()</script>   ';
    const cleanName = sanitizePlainText(rawPlainName, 50);
    const plainTextTagsStripped = cleanName === 'Dr. John Doe';

    const longText = 'A'.repeat(200);
    const truncatedText = sanitizePlainText(longText, 50);
    const plainTextTruncationEnforced = truncatedText.length === 50;

    results.plainTextSanitization = {
      success: plainTextTagsStripped && plainTextTruncationEnforced,
      tagsStripped: plainTextTagsStripped,
      truncationEnforced: plainTextTruncationEnforced,
      cleanedName: cleanName,
    };

    // 3. Test XSS payload detection helper
    const xssScript = containsXssPayload('<script>alert(1)</script>');
    const xssOnerror = containsXssPayload('<img src=x onerror=alert(1)>');
    const xssJsProtocol = containsXssPayload('javascript:void(0)');
    const safeText = containsXssPayload('This is a completely legitimate normal description for a workshop.');

    results.payloadDetection = {
      success: xssScript && xssOnerror && xssJsProtocol && !safeText,
      xssScriptDetected: xssScript,
      xssOnerrorDetected: xssOnerror,
      xssJsProtocolDetected: xssJsProtocol,
      falsePositiveFree: !safeText,
    };

    // 4. Test HTML character escaping
    const unescapedChars = '<div class="test" data-val=\'abc\'>&copy;</div>';
    const escaped = escapeHtml(unescapedChars);
    const escapeSuccess =
      !escaped.includes('<') &&
      !escaped.includes('>') &&
      !escaped.includes('"') &&
      !escaped.includes("'") &&
      escaped.includes('&lt;') &&
      escaped.includes('&gt;') &&
      escaped.includes('&quot;') &&
      escaped.includes('&#039;');

    results.htmlEscape = {
      success: escapeSuccess,
      escapedOutput: escaped,
    };

    const allPassed =
      results.richTextSanitization.success &&
      results.plainTextSanitization.success &&
      results.payloadDetection.success &&
      results.htmlEscape.success;

    return NextResponse.json({
      test: 'Step 23.3 - Input sanitization on all rich-text and free-form fields',
      timestamp: new Date().toISOString(),
      checks: results,
      allPassed,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        test: 'Step 23.3 - Input sanitization on all rich-text and free-form fields',
        error: err.message || 'Sanitization verification failed',
        allPassed: false,
      },
      { status: 500 }
    );
  }
}
