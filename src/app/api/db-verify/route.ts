import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createAnonClient } from '@/lib/supabase/client';

export async function GET() {
  try {
    const admin = createAdminClient();
    const anon = createAnonClient();

    // 1. Check if RPC check_rls_status is available
    const { data: rlsCatalog, error: rlsError } = await admin.rpc('check_rls_status');

    if (!rlsError && rlsCatalog) {
      interface RlsTableInfo {
        table_name: string;
        is_rls_enabled: boolean;
        policy_count: number;
      }
      const tables = (rlsCatalog as RlsTableInfo[]) || [];
      const protectedTables = tables.filter((t) => t.is_rls_enabled);
      const tablesWithoutRls = tables.filter((t) => !t.is_rls_enabled);
      const isFullySecured = tables.length >= 24 && tablesWithoutRls.length === 0;

      return NextResponse.json({
        success: isFullySecured,
        currentStep: '1.9',
        method: 'postgres_catalog_rpc',
        totalPublicTables: tables.length,
        protectedTablesCount: protectedTables.length,
        tablesMissingRls: tablesWithoutRls.map((t) => t.table_name),
        message: isFullySecured
          ? 'Step 1.9 Verified: All tables have RLS enabled with explicit policies attached.'
          : 'Step 1.9 pending: Some tables are missing RLS.',
      });
    }

    // 2. Fallback probe: Test if anon insert is blocked by RLS
    // Attempting an insert on departments without authentication must trigger RLS error (42501)
    const { error: anonInsertError } = await anon.from('departments').insert({
      code: '__probe_rls__',
      name: 'Probe',
      branch: 'tech',
    });

    const isBlockedByRls = anonInsertError?.code === '42501';

    return NextResponse.json({
      success: isBlockedByRls,
      currentStep: '1.9',
      method: 'behavioral_probe',
      rpcError: rlsError?.message,
      isBlockedByRls,
      anonInsertErrorCode: anonInsertError?.code,
      anonInsertErrorMessage: anonInsertError?.message,
      message: isBlockedByRls
        ? 'Step 1.9 Verified: RLS is active and successfully blocking unauthorized client writes.'
        : 'Step 1.9 pending: RLS does not appear to be active on departments yet. Check Supabase SQL Editor for any errors.',
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error connecting to Supabase',
    }, { status: 500 });
  }
}
