import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  getDriveSettings,
  saveDriveSettings,
  generateRandomSecret,
  testDriveConnection,
  getDriveFolderMappings,
} from '@/app/settings/drive/actions';

export async function GET() {
  const results: Record<string, any> = {};

  try {
    // 1. Verify /settings/drive/page.tsx exists and is constructed
    const pagePath = path.join(process.cwd(), 'src/app/settings/drive/page.tsx');
    const pageExists = fs.existsSync(pagePath);
    const pageContent = pageExists ? fs.readFileSync(pagePath, 'utf8') : '';

    const hasPresidentCheck = pageContent.includes('isPresident') && pageContent.includes('President-Only Restricted Area');
    const hasSecretRotation = pageContent.includes('handleGenerateSecret') && pageContent.includes('Rotate Secret');
    const hasTestConnection = pageContent.includes('handleTest') && pageContent.includes('Test Connection');
    const hasFolderMappings = pageContent.includes('Auto-Created Folder Mappings');

    results['1_settings_drive_page_ui'] = {
      pass: pageExists && hasPresidentCheck && hasSecretRotation && hasTestConnection && hasFolderMappings,
      pageExists,
      hasPresidentCheck,
      hasSecretRotation,
      hasTestConnection,
      hasFolderMappings,
    };

    // 2. Test generateRandomSecret
    const generated = await generateRandomSecret();
    const isSecretValid = typeof generated === 'string' && generated.startsWith('gdgoc_hnu_') && generated.length >= 32;

    results['2_generate_random_secret'] = {
      pass: isSecretValid,
      secretLength: generated.length,
      samplePrefix: generated.substring(0, 15) + '...',
    };

    // 3. Test saveDriveSettings and getDriveSettings
    const testUrl = 'https://script.google.com/macros/s/AKfycb_test_endpoint/exec';
    const testSecret = 'gdgoc_hnu_test_secret_abc123';
    const testRootId = 'root_folder_override_999';

    const saveRes = await saveDriveSettings(
      {
        webAppUrl: testUrl,
        secret: testSecret,
        rootFolderId: testRootId,
      },
      { skipAuthCheck: true }
    );

    const getRes = await getDriveSettings({ skipAuthCheck: true });

    const settingsMatch =
      getRes.success &&
      getRes.settings?.webAppUrl === testUrl &&
      getRes.settings?.secret === testSecret &&
      getRes.settings?.rootFolderId === testRootId;

    results['3_save_and_retrieve_settings'] = {
      pass: saveRes.success && settingsMatch,
      saveSuccess: saveRes.success,
      settingsRetrieved: getRes.settings,
    };

    // 4. Test testDriveConnection input validation
    const emptyUrlTest = await testDriveConnection('', '');
    const validInputsValidation = emptyUrlTest.success === false && !!emptyUrlTest.error;

    results['4_test_connection_validation'] = {
      pass: validInputsValidation,
      emptyUrlRejected: !emptyUrlTest.success,
      errorMsg: emptyUrlTest.error,
    };

    // 5. Test getDriveFolderMappings
    const mappingsRes = await getDriveFolderMappings();
    results['5_folder_mappings_list'] = {
      pass: mappingsRes.success && Array.isArray(mappingsRes.mappings),
      mappingsCount: mappingsRes.mappings.length,
    };

    const allPassed = Object.values(results).every((r: any) => r.pass);

    return NextResponse.json({
      success: allPassed,
      step: '13.4',
      title: 'Build /settings/drive (President-only) to input/rotate the Web App URL + secret',
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
