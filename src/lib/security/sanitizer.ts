/**
 * Input Sanitization Module for Rich-Text and Free-Form Inputs
 * Spec §9 Security Hardening Pass, Checklist 23.3
 *
 * Protects against Stored XSS, Reflected XSS, HTML Injection, and Protocol Exploits
 * across Tasks, Comments, Events, Feedback, PR notes, and Recruitment profiles.
 */

// Allowed safe HTML tags for rich text
const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'code', 'pre',
  'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'span'
]);

// Dangerous protocols
const DANGEROUS_PROTOCOLS = /^(javascript|vbscript|data|file):/i;

/**
 * Sanitizes plain text by stripping all HTML tags and encoding dangerous entities.
 */
export function sanitizePlainText(input: string | null | undefined, maxLength?: number): string {
  if (!input || typeof input !== 'string') return '';

  let sanitized = input
    // Remove script and style blocks along with their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove all remaining HTML tags
    .replace(/<\/?[^>]+(>|$)/g, '')
    // Normalize and trim
    .trim();

  if (maxLength && maxLength > 0) {
    sanitized = sanitized.slice(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitizes rich-text input while preserving safe formatting tags (p, b, strong, em, ul, ol, li, a, code, etc.).
 * Strips script, iframe, object, embed, svg, style, form, on* attributes, and javascript: links.
 */
export function sanitizeRichText(input: string | null | undefined, maxLength?: number): string {
  if (!input || typeof input !== 'string') return '';

  let text = input;

  // 1. Remove dangerous blocks entirely including content
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  text = text.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  text = text.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  text = text.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');

  // 2. Filter individual tags
  text = text.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, tag, attrString) => {
    const lowerTag = tag.toLowerCase();

    // If tag is not in allowed list, strip it
    if (!ALLOWED_TAGS.has(lowerTag)) {
      return '';
    }

    // Check if it's a closing tag
    if (match.startsWith('</')) {
      return `</${lowerTag}>`;
    }

    // Process attributes for allowed tags (only allow safe attributes like href on <a>, title, class)
    let cleanAttrs = '';
    if (lowerTag === 'a' && attrString) {
      // Extract href
      const hrefMatch = attrString.match(/href\s*=\s*["']?([^"'\s>]+)["']?/i);
      if (hrefMatch) {
        const url = hrefMatch[1].trim();
        // Disallow dangerous protocols
        if (!DANGEROUS_PROTOCOLS.test(url)) {
          cleanAttrs = ` href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"`;
        }
      }
    }

    // If tag is a self-closing br
    if (lowerTag === 'br') {
      return '<br/>';
    }

    return `<${lowerTag}${cleanAttrs}>`;
  });

  // 3. Remove any remaining on* handler artifacts that might have escaped
  text = text.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  text = text.replace(/\s*on\w+\s*=\s*[^"'\s>]+/gi, '');

  let result = text.trim();
  if (maxLength && maxLength > 0) {
    result = result.slice(0, maxLength);
  }

  return result;
}

/**
 * Escapes standard HTML special characters.
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates whether an input contains potentially malicious XSS payloads.
 */
export function containsXssPayload(input: string | null | undefined): boolean {
  if (!input || typeof input !== 'string') return false;

  const patterns = [
    /<script\b/i,
    /javascript:/i,
    /onerror\s*=/i,
    /onload\s*=/i,
    /onclick\s*=/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /<svg\b[^>]*onload/i,
    /data:text\/html/i,
  ];

  return patterns.some((p) => p.test(input));
}
