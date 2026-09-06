'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { 
  ApprovalStageTracker, 
  ApprovalInstanceData, 
  ApprovalStepItem 
} from '@/components/approvals/ApprovalStageTracker';
import { ArrowLeft, ShieldCheck, CheckSquare, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function DemoApprovalTrackerPage() {
  const [activeTab, setActiveTab] = useState<'task' | 'event'>('task');

  // Simulated 3-stage task instance
  const sampleTaskInstance: ApprovalInstanceData = {
    id: 'demo-task-instance-001',
    workflow_type: 'task_completion',
    current_step: 2,
    status: 'in_progress',
    created_at: new Date(Date.now() - 3600 * 24 * 1000).toISOString(),
  };

  const sampleTaskSteps: ApprovalStepItem[] = [
    {
      id: 'step-1',
      step_order: 1,
      approver_rule: 'committee_head',
      status: 'approved',
      notes: 'Code implementation and responsive styling verified against design system tokens. Ready for branch review.',
      acted_at: new Date(Date.now() - 3600 * 12 * 1000).toISOString(),
      resolved_approver: {
        full_name: 'Ziad Mohamed (Web Dev Lead)',
        role: 'committee_head',
      },
    },
    {
      id: 'step-2',
      step_order: 2,
      approver_rule: 'branch_head',
      status: 'pending',
      notes: null,
      acted_at: null,
      resolved_approver: null,
    },
    {
      id: 'step-3',
      step_order: 3,
      approver_rule: 'president_or_co_president',
      status: 'pending',
      notes: null,
      acted_at: null,
      resolved_approver: null,
    },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="header-nav">
        <div className="nav-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/approvals" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem' }}>
            <ArrowLeft size={16} />
            <span>Back to Approvals Queue</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'rgba(66, 133, 244, 0.15)', color: '#93C5FD', fontWeight: 700 }}>
              Spec §4.2 Reusable Component
            </span>
          </div>
        </div>
      </header>

      <main style={{ padding: '3rem 2rem', maxWidth: '960px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Banner */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <CheckSquare size={20} color="var(--google-blue)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--google-blue)' }}>
              Interactive Component Showcase
            </span>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, marginBottom: '0.5rem' }}>
            Approval Stage Tracker
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.96rem', margin: 0, lineHeight: 1.6 }}>
            The reusable multi-stage governance tracker powering task completion sign-offs, event publishing, and executive chapter escalation.
          </p>
        </div>

        {/* Target Entity Card Preview */}
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.25rem' }}>
              Attached Deliverable
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, marginBottom: '0.35rem' }}>
              Design & Implement Google OAuth Onboarding Bridge
            </h4>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>Assignee: <strong>Karim Hossam (Tech Member)</strong></span>
              <span>•</span>
              <span>Committee: <strong>Web Development (Tech)</strong></span>
              <span>•</span>
              <span>Priority: <strong style={{ color: '#EA4335' }}>High</strong></span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem', borderRadius: '999px', background: 'rgba(251, 188, 4, 0.15)', color: '#FDE047', fontWeight: 700 }}>
              Status: Under Review
            </span>
          </div>
        </div>

        {/* The Reusable Component */}
        <ApprovalStageTracker
          instance={sampleTaskInstance}
          steps={sampleTaskSteps}
          canUserApprove={true}
          currentUserId="mock-branch-head"
          onActionComplete={() => {
            console.log('Action complete triggered');
          }}
        />
      </main>
    </div>
  );
}
