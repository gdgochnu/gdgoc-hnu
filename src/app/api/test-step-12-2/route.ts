import { NextResponse } from 'next/server';
import { performGlobalSearch } from '@/app/search/actions';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const results: Record<string, any> = {};

  try {
    // 1. Verify GlobalSearchBar component file exists and contains Cmd+K hotkey handling
    const searchBarPath = path.join(process.cwd(), 'src/components/layout/GlobalSearchBar.tsx');
    const searchBarExists = fs.existsSync(searchBarPath);
    const searchBarContent = searchBarExists ? fs.readFileSync(searchBarPath, 'utf8') : '';
    const hasCmdKHotkey = searchBarContent.includes("'k'") || searchBarContent.includes('"k"');
    const hasDebounce = searchBarContent.includes('setTimeout') || searchBarContent.includes('debounce');
    const hasDropdown = searchBarContent.includes('ENTITY_CONFIG');

    results['1_global_search_bar_component'] = {
      pass: searchBarExists && hasCmdKHotkey && hasDropdown,
      exists: searchBarExists,
      hasCmdKHotkey,
      hasDebounce,
      hasDropdown,
    };

    // 2. Verify AppNavigation includes GlobalSearchBar in the header
    const appNavPath = path.join(process.cwd(), 'src/components/layout/AppNavigation.tsx');
    const appNavContent = fs.existsSync(appNavPath) ? fs.readFileSync(appNavPath, 'utf8') : '';
    const isSearchBarMounted = appNavContent.includes('<GlobalSearchBar />') && appNavContent.includes("from './GlobalSearchBar'");

    results['2_search_bar_mounted_in_header'] = {
      pass: isSearchBarMounted,
      isMounted: isSearchBarMounted,
    };

    // 3. Verify /search dedicated page exists and exports default component with filters
    const searchPagePath = path.join(process.cwd(), 'src/app/search/page.tsx');
    const searchPageExists = fs.existsSync(searchPagePath);
    const searchPageContent = searchPageExists ? fs.readFileSync(searchPagePath, 'utf8') : '';
    const hasSuspense = searchPageContent.includes('Suspense');
    const hasFilterTabs = searchPageContent.includes('handleTabChange');
    const hasEmptyState = searchPageContent.includes('No results found');

    results['3_dedicated_search_page'] = {
      pass: searchPageExists && hasSuspense && hasFilterTabs && hasEmptyState,
      exists: searchPageExists,
      hasSuspense,
      hasFilterTabs,
      hasEmptyState,
    };

    // 4. Test performGlobalSearch action with options
    const searchAllRes = await performGlobalSearch('a', { skipAuthCheck: true }); // <2 chars test
    const searchTasksRes = await performGlobalSearch('Task', { skipAuthCheck: true, type: 'task' });
    const searchEventsRes = await performGlobalSearch('Meeting', { skipAuthCheck: true, type: 'event' });

    results['4_search_action_live_queries'] = {
      pass: searchAllRes.success && searchTasksRes.success && searchEventsRes.success,
      shortQueryHandled: searchAllRes.totalMatches === 0,
      tasksQueryResultCount: searchTasksRes.totalMatches,
      eventsQueryResultCount: searchEventsRes.totalMatches,
    };

    const allPassed = Object.values(results).every((r: any) => r.pass);

    return NextResponse.json({
      success: allPassed,
      step: '12.2',
      title: 'Build search bar in app header with hotkey and /search results page',
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
