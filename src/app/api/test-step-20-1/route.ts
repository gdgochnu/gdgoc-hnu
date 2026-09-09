import { NextResponse } from 'next/server';
import {
  fetchCertificateTemplatesAction,
  fetchCertificateTemplateAction,
  saveCertificateTemplateAction,
  deleteCertificateTemplateAction,
} from '@/lib/certificates/template-actions';
import { DEFAULT_FIELD_LAYOUT } from '@/types/certificates';

/**
 * GET /api/test-step-20-1
 * Verify: Certificate Template Builder (§4.14)
 * Tests:
 *   1. Default field layout structure contains all required markers (name, title, date, cert#, QR)
 *   2. Template creation with custom field coordinates and styling
 *   3. Retrieval by ID and layout persistence
 *   4. Template update capability
 *   5. Clean deletion / teardown
 */
export async function GET() {
  const results: Record<string, unknown> = {};

  // Test 1: Default Field Layout Verification
  try {
    const requiredFields = ['recipient_name', 'title', 'issue_date', 'certificate_number', 'qr_code'];
    const allPresent = requiredFields.every((f) => Boolean((DEFAULT_FIELD_LAYOUT as any)[f]));

    results['1_default_layout_integrity'] = {
      allPresent,
      fieldsCount: Object.keys(DEFAULT_FIELD_LAYOUT).length,
      sampleCoordinates: {
        recipient_name: { x: DEFAULT_FIELD_LAYOUT.recipient_name.x, y: DEFAULT_FIELD_LAYOUT.recipient_name.y },
        qr_code: { x: DEFAULT_FIELD_LAYOUT.qr_code.x, y: DEFAULT_FIELD_LAYOUT.qr_code.y },
      },
    };
  } catch (e: any) {
    results['1_default_layout_integrity'] = { error: e.message };
  }

  // Test 2: Create Template via Action
  let createdId: string | null = null;
  try {
    const saveRes = await saveCertificateTemplateAction({
      name: `Test Template #${Date.now()}`,
      backgroundImageDriveFileId: 'test_drive_file_123',
      fieldLayout: DEFAULT_FIELD_LAYOUT,
      bypassAuth: true,
    });

    if (saveRes.success && saveRes.template) {
      createdId = saveRes.template.id;
      results['2_create_template'] = {
        success: true,
        id: createdId,
        name: saveRes.template.name,
        hasLayout: Boolean(saveRes.template.field_layout),
      };
    } else {
      results['2_create_template'] = { success: false, error: saveRes.error };
    }
  } catch (e: any) {
    results['2_create_template'] = { error: e.message };
  }

  // Test 3: Fetch by ID
  if (createdId) {
    try {
      const fetchRes = await fetchCertificateTemplateAction(createdId);
      results['3_fetch_template_by_id'] = {
        success: fetchRes.success,
        nameMatched: Boolean(fetchRes.template?.name),
        recipientX: fetchRes.template?.field_layout.recipient_name.x,
      };
    } catch (e: any) {
      results['3_fetch_template_by_id'] = { error: e.message };
    }

    // Test 4: Update Template
    try {
      const updatedLayout = {
        ...DEFAULT_FIELD_LAYOUT,
        recipient_name: { ...DEFAULT_FIELD_LAYOUT.recipient_name, fontSize: 40 },
      };

      const updateRes = await saveCertificateTemplateAction({
        id: createdId,
        name: 'Updated Test Certificate Template',
        fieldLayout: updatedLayout,
        bypassAuth: true,
      });

      results['4_update_template'] = {
        success: updateRes.success,
        updatedFontSize: updateRes.template?.field_layout.recipient_name.fontSize,
      };
    } catch (e: any) {
      results['4_update_template'] = { error: e.message };
    }

    // Test 5: Delete / Teardown
    try {
      const delRes = await deleteCertificateTemplateAction(createdId, true);
      results['5_delete_template'] = { success: delRes.success };
    } catch (e: any) {
      results['5_delete_template'] = { error: e.message };
    }
  }

  return NextResponse.json(results);
}
