/**
 * File Upload MIME & Size Validation Module
 * Spec §9 Security Hardening Pass, Checklist Step 23.4
 *
 * Validates file MIME types, file extensions, and file sizes before
 * any Google Drive bridge dispatch or storage write occurs.
 * Protects against remote code execution, spoofed MIME attacks, and storage abuse.
 */

// Explicitly blocked dangerous and executable extensions
export const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'bash', 'bin', 'com', 'cpl', 'dll', 'jar',
  'js', 'mjs', 'cjs', 'jsp', 'php', 'phtml', 'py', 'pyc', 'rb', 'scr',
  'vbs', 'vbe', 'wsf', 'wsh', 'ps1', 'psm1', 'html', 'htm', 'xhtml',
  'msi', 'app', 'apk', 'action', 'cgi', 'pl', 'asp', 'aspx'
]);

// Map of allowed extensions to canonical MIME types
export const ALLOWED_EXTENSION_MAP: Record<string, string[]> = {
  // Images
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
  gif: ['image/gif'],
  svg: ['image/svg+xml'],
  // Documents
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  txt: ['text/plain'],
  csv: ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
  json: ['application/json'],
  // Archives
  zip: ['application/zip', 'application/x-zip-compressed'],
  rar: ['application/x-rar-compressed', 'application/vnd.rar'],
  gz: ['application/gzip', 'application/x-gzip'],
  tar: ['application/x-tar'],
  '7z': ['application/x-7z-compressed'],
  // Media (Audio / Video)
  mp4: ['video/mp4'],
  webm: ['video/webm', 'audio/webm'],
  mov: ['video/quicktime'],
  mp3: ['audio/mpeg'],
  wav: ['audio/wav', 'audio/x-wav'],
  ogg: ['audio/ogg', 'video/ogg'],
};

// All allowed MIME types flat set
export const ALLOWED_MIME_TYPES = new Set(
  Object.values(ALLOWED_EXTENSION_MAP).flat()
);

// File size limits in bytes
export const MAX_DEFAULT_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024;   // 10 MB
export const MAX_MEDIA_FILE_SIZE_BYTES = 50 * 1024 * 1024;   // 50 MB
export const MIN_FILE_SIZE_BYTES = 1;                        // At least 1 byte

export type UploadCategory = 'any' | 'image' | 'document' | 'media';

export interface FileValidationOptions {
  fileName: string;
  mimeType?: string;
  sizeBytes: number;
  category?: UploadCategory;
  customMaxSizeBytes?: number;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  code?: 'INVALID_NAME' | 'BLOCKED_EXTENSION' | 'INVALID_MIME' | 'FILE_TOO_LARGE' | 'FILE_EMPTY' | 'CATEGORY_MISMATCH';
  sanitizedFileName?: string;
  canonicalMimeType?: string;
}

/**
 * Validates a file's name, extension, MIME type, and size.
 */
export function validateFileUpload(options: FileValidationOptions): FileValidationResult {
  const { fileName, mimeType, sizeBytes, category = 'any', customMaxSizeBytes } = options;

  // 1. Basic filename validation
  if (!fileName || typeof fileName !== 'string' || fileName.trim().length === 0) {
    return {
      valid: false,
      code: 'INVALID_NAME',
      error: 'File name is required and cannot be empty.',
    };
  }

  const cleanName = fileName.trim().replace(/[/\\]/g, '_');
  const dotIndex = cleanName.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === cleanName.length - 1) {
    return {
      valid: false,
      code: 'INVALID_NAME',
      error: 'File must have a valid extension.',
    };
  }

  // 2. Check for dangerous double-extensions (e.g. payload.exe.jpg or script.php.pdf)
  const nameParts = cleanName.toLowerCase().split('.');
  for (let i = 0; i < nameParts.length - 1; i++) {
    const intermediateExt = nameParts[i];
    if (BLOCKED_EXTENSIONS.has(intermediateExt)) {
      return {
        valid: false,
        code: 'BLOCKED_EXTENSION',
        error: `Potentially dangerous multi-extension detected: ".${intermediateExt}" is prohibited.`,
      };
    }
  }

  const ext = nameParts[nameParts.length - 1].toLowerCase();

  // 3. Block forbidden extensions
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      code: 'BLOCKED_EXTENSION',
      error: `Executable or script files (.${ext}) are strictly prohibited.`,
    };
  }

  // 4. Verify extension is in known allowed whitelist
  if (!ALLOWED_EXTENSION_MAP[ext]) {
    return {
      valid: false,
      code: 'BLOCKED_EXTENSION',
      error: `File type ".${ext}" is not supported. Please upload a standard image, document, or archive.`,
    };
  }

  // 5. Size validation
  if (!sizeBytes || sizeBytes < MIN_FILE_SIZE_BYTES) {
    return {
      valid: false,
      code: 'FILE_EMPTY',
      error: 'File is empty (0 bytes). Please select a valid file.',
    };
  }

  let maxSize = customMaxSizeBytes || MAX_DEFAULT_FILE_SIZE_BYTES;
  if (category === 'image') maxSize = Math.min(maxSize, MAX_IMAGE_FILE_SIZE_BYTES);
  if (category === 'media') maxSize = Math.min(maxSize, MAX_MEDIA_FILE_SIZE_BYTES);

  if (sizeBytes > maxSize) {
    const limitMb = (maxSize / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      code: 'FILE_TOO_LARGE',
      error: `File size exceeds the allowed limit of ${limitMb} MB.`,
    };
  }

  // 6. MIME Type validation & spoofing check
  const allowedMimesForExt = ALLOWED_EXTENSION_MAP[ext];
  const providedMime = (mimeType || '').trim().toLowerCase();

  // If MIME type is provided and not generic octet-stream, ensure it is compatible
  if (providedMime && providedMime !== 'application/octet-stream') {
    if (!allowedMimesForExt.includes(providedMime) && !ALLOWED_MIME_TYPES.has(providedMime)) {
      return {
        valid: false,
        code: 'INVALID_MIME',
        error: `MIME type "${providedMime}" does not match file extension ".${ext}".`,
      };
    }
  }

  const canonicalMime = providedMime && allowedMimesForExt.includes(providedMime)
    ? providedMime
    : allowedMimesForExt[0];

  // 7. Category check
  if (category === 'image' && !canonicalMime.startsWith('image/')) {
    return {
      valid: false,
      code: 'CATEGORY_MISMATCH',
      error: `Expected an image file, but received "${canonicalMime}".`,
    };
  }

  if (category === 'media' && !canonicalMime.startsWith('image/') && !canonicalMime.startsWith('video/') && !canonicalMime.startsWith('audio/')) {
    return {
      valid: false,
      code: 'CATEGORY_MISMATCH',
      error: `Expected a media file (image/audio/video), but received "${canonicalMime}".`,
    };
  }

  return {
    valid: true,
    sanitizedFileName: cleanName,
    canonicalMimeType: canonicalMime,
  };
}
