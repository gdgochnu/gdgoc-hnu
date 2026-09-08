import { NextResponse } from 'next/server';
import { generatePersonalCalendarUrl } from '@/lib/calendar/calendar-client';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const results: Record<string, any> = {};

  try {
    // 1. Verify generatePersonalCalendarUrl produces a valid Google Calendar link
    const testDeadline = new Date('2026-10-15T09:00:00Z');
    const calUrl = generatePersonalCalendarUrl({
      title: '[Task Deadline] Build GDGoC Platform',
      description: 'This is an automated test',
      location: 'Helwan National University',
      startDate: testDeadline,
      endDate: new Date('2026-10-15T10:00:00Z'),
    });

    const hasActionTemplate = calUrl.includes('action=TEMPLATE');
    const hasText = calUrl.includes('text=');
    const hasDates = calUrl.includes('dates=');
    const hasGCalDomain = calUrl.startsWith('https://calendar.google.com/calendar/render');

    results['1_personal_calendar_url_generation'] = {
      pass: hasActionTemplate && hasText && hasDates && hasGCalDomain,
      url: calUrl.slice(0, 120) + '…',
      hasActionTemplate,
      hasText,
      hasDates,
    };

    // 2. Verify AddToCalendarButton component exists with correct variants
    const btnPath = path.join(process.cwd(), 'src', 'components', 'tasks', 'AddToCalendarButton.tsx');
    const btnExists = fs.existsSync(btnPath);
    let btnContent = '';
    if (btnExists) {
      btnContent = fs.readFileSync(btnPath, 'utf8');
    }

    const hasIconOnly = btnContent.includes("variant === 'icon-only'");
    const hasLinkVariant = btnContent.includes("variant === 'link'");
    const hasButtonVariant = btnContent.includes("// Default: 'button' variant");
    const hasCalendarImport = btnContent.includes('generatePersonalCalendarUrl');

    results['2_add_to_calendar_btn_component'] = {
      pass: btnExists && hasIconOnly && hasLinkVariant && hasButtonVariant && hasCalendarImport,
      btnExists,
      hasIconOnly,
      hasLinkVariant,
      hasButtonVariant,
      hasCalendarImport,
    };

    // 3. Verify TaskDetailClient mounts AddToCalendarButton
    const detailClientPath = path.join(process.cwd(), 'src', 'components', 'tasks', 'TaskDetailClient.tsx');
    const detailContent = fs.readFileSync(detailClientPath, 'utf8');
    const detailImports = detailContent.includes('AddToCalendarButton');
    const detailRenders = detailContent.includes('<AddToCalendarButton') && detailContent.includes('task.deadline');

    results['3_task_detail_integration'] = {
      pass: detailImports && detailRenders,
      detailImports,
      detailRenders,
    };

    // 4. Verify TasksKanbanClient mounts AddToCalendarButton (icon-only variant on cards)
    const kanbanPath = path.join(process.cwd(), 'src', 'components', 'tasks', 'TasksKanbanClient.tsx');
    const kanbanContent = fs.readFileSync(kanbanPath, 'utf8');
    const kanbanImports = kanbanContent.includes('AddToCalendarButton');
    const kanbanRenders = kanbanContent.includes('<AddToCalendarButton') && kanbanContent.includes('icon-only');

    results['4_kanban_card_integration'] = {
      pass: kanbanImports && kanbanRenders,
      kanbanImports,
      kanbanRenders,
    };

    const allPassed = Object.values(results).every((r: any) => r.pass);

    return NextResponse.json({
      success: allPassed,
      step: '14.4',
      title: 'Add to my Google Calendar one-click action on task deadlines',
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
