import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const globalsCssPath = path.join(process.cwd(), 'src', 'app', 'globals.css');
    const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx');

    const globalsCss = fs.readFileSync(globalsCssPath, 'utf8');
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');

    const hasColorSchemeDark = globalsCss.includes('color-scheme: dark;');
    const hasBgMainDark = globalsCss.includes('--bg-main: #0B0F19;');
    const hasTextPrimaryDark = globalsCss.includes('--text-primary: #F8FAFC;');
    const hasDarkScrollbars = globalsCss.includes('::-webkit-scrollbar');
    const hasHtmlDarkClass = layoutContent.includes('className="dark"');
    const hasViewportDarkThemeColor = layoutContent.includes('themeColor: "#0B0F19"');

    const allStep73AssertionsPassed =
      hasColorSchemeDark &&
      hasBgMainDark &&
      hasTextPrimaryDark &&
      hasDarkScrollbars &&
      hasHtmlDarkClass &&
      hasViewportDarkThemeColor;

    return NextResponse.json({
      status: allStep73AssertionsPassed ? 'ok' : 'assertion_failed',
      message: allStep73AssertionsPassed
        ? 'Phase 7 - Step 7.3 Dark Mode Single Design Theme PASSED across the platform!'
        : 'One or more Dark Mode theme assertions failed.',
      verification: {
        assertions: {
          hasColorSchemeDark,
          hasBgMainDark,
          hasTextPrimaryDark,
          hasDarkScrollbars,
          hasHtmlDarkClass,
          hasViewportDarkThemeColor,
        },
        themeConfig: {
          palette: {
            bgMain: '#0B0F19',
            textPrimary: '#F8FAFC',
            googleBlue: '#4285F4',
            googleGreen: '#34A853',
            googleYellow: '#FBBC04',
            googleRed: '#EA4335',
          },
          singleTheme: 'Dark Mode Native (Spec §7)',
        },
        allStep73AssertionsPassed,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
