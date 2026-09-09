import React from 'react';
import { Metadata } from 'next';
import { getPointRules } from '@/lib/gamification/points-engine';
import { getBadgeCatalog } from '@/lib/gamification/badges-engine';
import { getUserContext } from '@/lib/auth/get-user-context';
import { TransparencyView } from '@/components/gamification/TransparencyView';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'How Points & Levels Work | GDGoC HNU OS',
  description: 'Full transparency into GDGoC Helwan University points rules, level tiers, streaks, and badge criteria.',
};

export default async function GamificationRulesPage() {
  const [pointRules, badges, userContext] = await Promise.all([
    getPointRules(true),
    getBadgeCatalog(),
    getUserContext(),
  ]);

  const userRole = userContext.profile?.role;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/gamification"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Gamification Hub
          </Link>
        </div>

        <TransparencyView
          pointRules={pointRules}
          badges={badges}
          userRole={userRole}
        />
      </div>
    </div>
  );
}
