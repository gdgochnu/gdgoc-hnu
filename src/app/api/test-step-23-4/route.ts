import { NextRequest, NextResponse } from 'next/server';
import {
  validateFileUpload,
  BLOCKED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_DEFAULT_FILE_SIZE_BYTES,
  MAX_IMAGE_FILE_SIZE_BYTES,
} from '@/lib/security/file-validation';
import { uploadFileToDrive } from '@/lib/drive/drive-client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const results: Record<string, any> = {};

  try {
    // 1. Test Blocked Executable & Script Extensions
    const dangerousFiles = [
      { name: 'malware.exe', mime: 'application/x-msdownload' },
      { name: 'script.sh', mime: 'application/x-sh' },
      { name: 'backdoor.php', mime: 'application/x-php' },
      { name: 'run.bat', mime: 'application/x-bat' },
      { name: 'virus.js', mime: 'application/javascript' },
    ];

    const blockedResults = dangerousFiles.map((df) => {
      const res = validateFileUpload({
        fileName: df.name,
        mimeType: df.mime,
        sizeBytes: 1024,
      });
      return {
        file: df.name,
        blocked: !res.valid && res.code === 'BLOCKED_EXTENSION',
        code: res.code,
        error: res.error,
      };
    });

    const allDangerousBlocked = blockedResults.every((r) => r.blocked);

    results.blockedExtensions = {
      success: allDangerousBlocked,
      allDangerousBlocked,
      testedCount: dangerousFiles.length,
      samples: blockedResults,
    };

    // 2. Test Dangerous Double Extensions (e.g. payload.exe.jpg)
    const doubleExtFile = 'payload.exe.png';
    const doubleExtRes = validateFileUpload({
      fileName: doubleExtFile,
      mimeType: 'image/png',
      sizeBytes: 2048,
    });

    const doubleExtBlocked = !doubleExtRes.valid && doubleExtRes.code === 'BLOCKED_EXTENSION';

    results.doubleExtensionProtection = {
      success: doubleExtBlocked,
      testedFile: doubleExtFile,
      blocked: doubleExtBlocked,
      code: doubleExtRes.code,
      error: doubleExtRes.error,
    };

    // 3. Test MIME Type Spoofing Detection
    const spoofedFile = 'innocent_photo.jpg';
    const spoofedMime = 'application/x-executable';
    const spoofedRes = validateFileUpload({
      fileName: spoofedFile,
      mimeType: spoofedMime,
      sizeBytes: 4096,
    });

    const spoofingBlocked = !spoofedRes.valid && spoofedRes.code === 'INVALID_MIME';

    results.mimeSpoofingProtection = {
      success: spoofingBlocked,
      testedFile: spoofedFile,
      spoofedMime,
      blocked: spoofingBlocked,
      code: spoofedRes.code,
      error: spoofedRes.error,
    };

    // 4. Test Size Limit Enforcement (0-byte empty files and oversized files)
    const emptyFileRes = validateFileUpload({
      fileName: 'empty.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 0,
    });
    const emptyFileBlocked = !emptyFileRes.valid && emptyFileRes.code === 'FILE_EMPTY';

    const oversizedGeneralRes = validateFileUpload({
      fileName: 'massive_archive.zip',
      mimeType: 'application/zip',
      sizeBytes: MAX_DEFAULT_FILE_SIZE_BYTES + 1024, // 25MB + 1KB
    });
    const oversizedGeneralBlocked = !oversizedGeneralRes.valid && oversizedGeneralRes.code === 'FILE_TOO_LARGE';

    const oversizedImageRes = validateFileUpload({
      fileName: 'huge_photo.png',
      mimeType: 'image/png',
      sizeBytes: MAX_IMAGE_FILE_SIZE_BYTES + 1024, // 10MB + 1KB
      category: 'image',
    });
    const oversizedImageBlocked = !oversizedImageRes.valid && oversizedImageRes.code === 'FILE_TOO_LARGE';

    results.sizeValidation = {
      success: emptyFileBlocked && oversizedGeneralBlocked && oversizedImageBlocked,
      emptyFileBlocked,
      oversizedGeneralBlocked,
      oversizedImageBlocked,
    };

    // 5. Test Legitimate File Types Allowed
    const validFiles = [
      { name: 'document.pdf', mime: 'application/pdf', size: 500 * 1024 },
      { name: 'photo.jpg', mime: 'image/jpeg', size: 1.5 * 1024 * 1024 },
      { name: 'diagram.png', mime: 'image/png', size: 800 * 1024 },
      { name: 'dataset.csv', mime: 'text/csv', size: 50 * 1024 },
    ];

    const validResults = validFiles.map((vf) => {
      const res = validateFileUpload({
        fileName: vf.name,
        mimeType: vf.mime,
        sizeBytes: vf.size,
      });
      return {
        file: vf.name,
        accepted: res.valid,
        canonicalMime: res.canonicalMimeType,
      };
    });

    const allValidAccepted = validResults.every((r) => r.accepted);

    results.validFilesAccepted = {
      success: allValidAccepted,
      testedCount: validFiles.length,
      samples: validResults,
    };

    // 6. Test Drive Bridge Integration Guard
    // Calling uploadFileToDrive with dangerous .exe must be rejected before any Drive dispatch
    const bridgeBlockedRes = await uploadFileToDrive({
      fileName: 'exploit.sh',
      mimeType: 'application/x-sh',
      base64Data: Buffer.from('#!/bin/bash\necho "pwned"').toString('base64'),
    });

    const driveBridgeGuardBlocked = !bridgeBlockedRes.success && bridgeBlockedRes.code === 'BLOCKED_EXTENSION';

    // Calling uploadFileToDrive with valid PDF must be accepted
    const validBase64 = Buffer.from('%PDF-1.4 test certificate sample content').toString('base64');
    const bridgeAllowedRes = await uploadFileToDrive({
      fileName: 'test-certificate-23-4.pdf',
      mimeType: 'application/pdf',
      base64Data: validBase64,
    });

    const driveBridgeGuardAllowed = bridgeAllowedRes.success && Boolean(bridgeAllowedRes.fileId);

    results.driveBridgeIntegration = {
      success: driveBridgeGuardBlocked && driveBridgeGuardAllowed,
      maliciousUploadBlocked: driveBridgeGuardBlocked,
      blockedError: bridgeBlockedRes.error,
      legitimateUploadAllowed: driveBridgeGuardAllowed,
      sampleFileId: bridgeAllowedRes.fileId,
    };

    const allPassed =
      results.blockedExtensions.success &&
      results.doubleExtensionProtection.success &&
      results.mimeSpoofingProtection.success &&
      results.sizeValidation.success &&
      results.validFilesAccepted.success &&
      results.driveBridgeIntegration.success;

    return NextResponse.json({
      test: 'Step 23.4 - Add file-upload MIME and size validation before the Drive bridge call',
      timestamp: new Date().toISOString(),
      checks: results,
      allPassed,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        test: 'Step 23.4 - Add file-upload MIME and size validation before the Drive bridge call',
        error: err.message || 'File validation verification failed',
        allPassed: false,
      },
      { status: 500 }
    );
  }
}
