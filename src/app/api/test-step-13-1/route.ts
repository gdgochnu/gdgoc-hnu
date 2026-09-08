import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const results: Record<string, any> = {};

  try {
    // 1. Verify Google Apps Script code exists
    const codeJsPath = path.join(process.cwd(), 'google-apps-script/Code.js');
    const codeGsPath = path.join(process.cwd(), 'google-apps-script/Code.gs');
    const codeJsExists = fs.existsSync(codeJsPath);
    const codeGsExists = fs.existsSync(codeGsPath);

    const scriptContent = codeJsExists ? fs.readFileSync(codeJsPath, 'utf8') : '';

    results['1_apps_script_files'] = {
      pass: codeJsExists && codeGsExists,
      codeJsExists,
      codeGsExists,
    };

    // 2. Verify Root Drive Folder management
    const hasRootFolderLogic =
      scriptContent.includes('getRootFolder') &&
      scriptContent.includes('GDGoC HNU OS Workspace') &&
      scriptContent.includes('DriveApp.createFolder');

    results['2_root_drive_folder_binding'] = {
      pass: hasRootFolderLogic,
      hasRootFolderLogic,
    };

    // 3. Verify Secret Authentication
    const hasSecretVerification =
      scriptContent.includes('verifyAuth') &&
      scriptContent.includes('DRIVE_BRIDGE_SECRET') &&
      scriptContent.includes('PropertiesService.getScriptProperties');

    results['3_shared_secret_authentication'] = {
      pass: hasSecretVerification,
      hasSecretVerification,
    };

    // 4. Verify all required actions are present
    const hasEnsureFolderPath = scriptContent.includes('handleEnsureFolderPath') || scriptContent.includes('ensureFolderPath');
    const hasUploadFile = scriptContent.includes('handleUploadFile') || scriptContent.includes('uploadFile');
    const hasListFiles = scriptContent.includes('handleListFiles') || scriptContent.includes('listFiles');
    const hasDeleteFile = scriptContent.includes('handleDeleteFile') || scriptContent.includes('deleteFile');
    const hasGetShareableLink = scriptContent.includes('handleGetShareableLink') || scriptContent.includes('getShareableLink');
    const hasPing = scriptContent.includes('handlePing') || scriptContent.includes('ping');

    results['4_required_action_handlers'] = {
      pass:
        hasEnsureFolderPath &&
        hasUploadFile &&
        hasListFiles &&
        hasDeleteFile &&
        hasGetShareableLink &&
        hasPing,
      hasEnsureFolderPath,
      hasUploadFile,
      hasListFiles,
      hasDeleteFile,
      hasGetShareableLink,
      hasPing,
    };

    // 5. Verify documentation and manifest
    const manifestPath = path.join(process.cwd(), 'google-apps-script/appsscript.json');
    const readmePath = path.join(process.cwd(), 'google-apps-script/README.md');
    const manifestExists = fs.existsSync(manifestPath);
    const readmeExists = fs.existsSync(readmePath);

    results['5_manifest_and_setup_guide'] = {
      pass: manifestExists && readmeExists,
      manifestExists,
      readmeExists,
    };

    const allPassed = Object.values(results).every((r: any) => r.pass);

    return NextResponse.json({
      success: allPassed,
      step: '13.1',
      title: 'Create the root Drive folder + the Google Apps Script bound to it',
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        stack: err.stack,
      },
      { status: 500 }
    );
  }
}
