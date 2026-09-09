'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  UnifiedApprovalsSummary,
  UnifiedApprovalItem,
  UnifiedApprovalType,
  ActOnUnifiedApprovalInput,
} from '@/types/command-center';
import { actOnUnifiedApproval } from '@/app/command-center/actions';
import {
  ShieldCheck,
  UserPlus,
  CheckSquare,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  ExternalLink,
  Filter,
  ChevronDown,
  ChevronUp,
  Inbox,
  Sparkles,
  Send,
  MessageSquare,
} from 'lucide-react';

interface UnifiedApprovalsQueueProps {
  initialSummary: UnifiedApprovalsSummary;
}

export function UnifiedApprovalsQueue({ initialSummary }: UnifiedApprovalsQueueProps) {
  const [summary, setSummary] = useState<UnifiedApprovalsSummary>(initialSummary);
  const [selectedFilter, setSelectedFilter] = useState<'all' | UnifiedApprovalType | 'urgent'>('all');
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Reject / Changes requested modal or inline input state
  const [promptAction, setPromptAction] = useState<{
    item: UnifiedApprovalItem;
    action: 'reject' | 'changes_requested';
  } | null>(null);
  const [promptNotes, setPromptNotes] = useState('');

  // Expandable details state: map itemId -> boolean
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredItems = summary.items.filter((item) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'urgent') return item.urgency === 'urgent';
    return item.type === selectedFilter;
  });

  const handleAction = (item: UnifiedApprovalItem, action: 'approve' | 'reject' | 'changes_requested', notes?: string) => {
    setActionError(null);
    setActionSuccess(null);

    const input: ActOnUnifiedApprovalInput = {
      type: item.type,
      entityId: item.entityId,
      action,
      notes,
    };

    startTransition(async () => {
      const res = await actOnUnifiedApproval(input);
      if (!res.success) {
        setActionError(res.error || 'Failed to process action');
        return;
      }

      // Optimistically remove item from list
      const updatedItems = summary.items.filter((i) => i.id !== item.id);
      const accountsCount = updatedItems.filter((i) => i.type === 'account').length;
      const tasksCount = updatedItems.filter((i) => i.type === 'task').length;
      const eventsCount = updatedItems.filter((i) => i.type === 'event').length;
      const urgentCount = updatedItems.filter((i) => i.urgency === 'urgent').length;

      setSummary({
        totalPending: updatedItems.length,
        accountsCount,
        tasksCount,
        eventsCount,
        urgentCount,
        items: updatedItems,
      });

      const actionText = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'sent back for revisions';
      setActionSuccess(`Successfully ${actionText}: "${item.title}"`);
      setPromptAction(null);
      setPromptNotes('');
    });
  };

  const getTypeBadge = (type: UnifiedApprovalType) => {
    switch (type) {
      case 'account':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 800,
              background: 'rgba(66, 133, 244, 0.15)',
              color: '#93C5FD',
              border: '1px solid rgba(66, 133, 244, 0.35)',
            }}
          >
            <UserPlus size={12} />
            Account Sign-up
          </span>
        );
      case 'task':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 800,
              background: 'rgba(52, 168, 83, 0.15)',
              color: '#86EFAC',
              border: '1px solid rgba(52, 168, 83, 0.35)',
            }}
          >
            <CheckSquare size={12} />
            Task Review
          </span>
        );
      case 'event':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 800,
              background: 'rgba(168, 85, 247, 0.15)',
              color: '#D8B4FE',
              border: '1px solid rgba(168, 85, 247, 0.35)',
            }}
          >
            <Calendar size={12} />
            Event Publishing
          </span>
        );
    }
  };

  return (
    <div
      id="unified-approvals-queue"
      className="glass-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        padding: '2rem',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* 1. Header & Summary Stats */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(251, 188, 4, 0.15)',
                border: '1px solid rgba(251, 188, 4, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FBBC04',
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#FFFFFF',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              Unified Pending-Approvals Queue
            </h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
            Centralized leadership queue aggregating member registrations, task completions, and event publishing proposals.
          </p>
        </div>

        {/* Executive Action Link */}
        <Link
          href="/approvals"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.95rem',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: 'var(--text-secondary)',
            fontSize: '0.78rem',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'all 0.2s',
          }}
        >
          <span>Full Management View</span>
          <ArrowUpRight size={14} />
        </Link>
      </div>

      {/* 2. KPI Summary Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.85rem',
        }}
      >
        {/* Total Pending */}
        <div
          style={{
            padding: '1rem',
            borderRadius: '14px',
            background: 'rgba(66, 133, 244, 0.06)',
            border: '1px solid rgba(66, 133, 244, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Total In Queue
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFFFFF' }}>
              {summary.totalPending}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>items</span>
          </div>
        </div>

        {/* Accounts */}
        <div
          style={{
            padding: '1rem',
            borderRadius: '14px',
            background: 'rgba(251, 188, 4, 0.06)',
            border: '1px solid rgba(251, 188, 4, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <span style={{ fontSize: '0.74rem', color: '#FCD34D', fontWeight: 600 }}>
            Account Sign-ups
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFFFFF' }}>
              {summary.accountsCount}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>pending</span>
          </div>
        </div>

        {/* Tasks */}
        <div
          style={{
            padding: '1rem',
            borderRadius: '14px',
            background: 'rgba(52, 168, 83, 0.06)',
            border: '1px solid rgba(52, 168, 83, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <span style={{ fontSize: '0.74rem', color: '#86EFAC', fontWeight: 600 }}>
            Task Reviews
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFFFFF' }}>
              {summary.tasksCount}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>pending</span>
          </div>
        </div>

        {/* Events */}
        <div
          style={{
            padding: '1rem',
            borderRadius: '14px',
            background: 'rgba(168, 85, 247, 0.06)',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <span style={{ fontSize: '0.74rem', color: '#D8B4FE', fontWeight: 600 }}>
            Event Publishing
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFFFFF' }}>
              {summary.eventsCount}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>drafts</span>
          </div>
        </div>

        {/* Urgent >48h */}
        <div
          style={{
            padding: '1rem',
            borderRadius: '14px',
            background: summary.urgentCount > 0 ? 'rgba(234, 67, 53, 0.12)' : 'rgba(255, 255, 255, 0.03)',
            border: summary.urgentCount > 0 ? '1px solid rgba(234, 67, 53, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <span
            style={{
              fontSize: '0.74rem',
              color: summary.urgentCount > 0 ? '#FCA5A5' : 'var(--text-muted)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <AlertTriangle size={13} />
            Stalled (&gt;48h)
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span
              style={{
                fontSize: '1.6rem',
                fontWeight: 900,
                color: summary.urgentCount > 0 ? '#EA4335' : '#FFFFFF',
              }}
            >
              {summary.urgentCount}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>require action</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Pills */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              border: 'none',
              background: selectedFilter === 'all' ? 'var(--google-blue)' : 'rgba(255, 255, 255, 0.06)',
              color: selectedFilter === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            All Pending ({summary.totalPending})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('account')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              border: 'none',
              background: selectedFilter === 'account' ? 'rgba(66, 133, 244, 0.25)' : 'rgba(255, 255, 255, 0.06)',
              color: selectedFilter === 'account' ? '#93C5FD' : 'var(--text-secondary)',
              borderWidth: selectedFilter === 'account' ? '1px' : '0',
              borderStyle: 'solid',
              borderColor: 'rgba(66, 133, 244, 0.4)',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Accounts ({summary.accountsCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('task')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              border: 'none',
              background: selectedFilter === 'task' ? 'rgba(52, 168, 83, 0.25)' : 'rgba(255, 255, 255, 0.06)',
              color: selectedFilter === 'task' ? '#86EFAC' : 'var(--text-secondary)',
              borderWidth: selectedFilter === 'task' ? '1px' : '0',
              borderStyle: 'solid',
              borderColor: 'rgba(52, 168, 83, 0.4)',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Tasks ({summary.tasksCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('event')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              border: 'none',
              background: selectedFilter === 'event' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.06)',
              color: selectedFilter === 'event' ? '#D8B4FE' : 'var(--text-secondary)',
              borderWidth: selectedFilter === 'event' ? '1px' : '0',
              borderStyle: 'solid',
              borderColor: 'rgba(168, 85, 247, 0.4)',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Events ({summary.eventsCount})
          </button>
          {summary.urgentCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedFilter('urgent')}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '999px',
                border: 'none',
                background: selectedFilter === 'urgent' ? '#EA4335' : 'rgba(234, 67, 53, 0.15)',
                color: selectedFilter === 'urgent' ? '#FFFFFF' : '#FCA5A5',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              ⚠ Urgent Only ({summary.urgentCount})
            </button>
          )}
        </div>
      </div>

      {/* Notifications Alert */}
      {actionSuccess && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            background: 'rgba(52, 168, 83, 0.15)',
            border: '1px solid rgba(52, 168, 83, 0.35)',
            color: '#86EFAC',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <CheckCircle2 size={16} />
          {actionSuccess}
        </div>
      )}

      {actionError && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            background: 'rgba(234, 67, 53, 0.15)',
            border: '1px solid rgba(234, 67, 53, 0.35)',
            color: '#FCA5A5',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertTriangle size={16} />
          {actionError}
        </div>
      )}

      {/* 4. Approvals List */}
      {filteredItems.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            borderRadius: '16px',
            border: '1px dashed rgba(255, 255, 255, 0.12)',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Inbox size={36} style={{ opacity: 0.4 }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#FFFFFF' }}>
            Queue is currently clear!
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            No approvals pending for this filter category.
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filteredItems.map((item) => {
            const isExpanded = expandedItems[item.id] ?? false;

            return (
              <div
                key={item.id}
                style={{
                  padding: '1.25rem',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.025)',
                  border:
                    item.urgency === 'urgent'
                      ? '1px solid rgba(234, 67, 53, 0.35)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow:
                    item.urgency === 'urgent'
                      ? '0 0 15px rgba(234, 67, 53, 0.08)'
                      : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Item Top Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Submitter Avatar */}
                    {item.submitterAvatar ? (
                      <img
                        src={item.submitterAvatar}
                        alt={item.submitterName}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'rgba(66, 133, 244, 0.15)',
                          color: '#93C5FD',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.9rem',
                          fontWeight: 800,
                        }}
                      >
                        {item.submitterName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {getTypeBadge(item.type)}
                        {item.departmentCode && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {item.departmentCode}
                          </span>
                        )}
                        {item.urgency === 'urgent' && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '6px',
                              background: 'rgba(234, 67, 53, 0.2)',
                              color: '#FCA5A5',
                              border: '1px solid rgba(234, 67, 53, 0.4)',
                            }}
                          >
                            Waiting {Math.round(item.hoursPending / 24)}d ({item.hoursPending}h)
                          </span>
                        )}
                      </div>

                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.15rem' }}>
                        {item.title}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* Expand Details */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(item.id)}
                      style={{
                        padding: '0.4rem 0.65rem',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      {isExpanded ? 'Less' : 'Details'}
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {/* Quick Approve Button */}
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleAction(item, 'approve')}
                      style={{
                        padding: '0.4rem 0.95rem',
                        borderRadius: '8px',
                        background: 'rgba(52, 168, 83, 0.15)',
                        border: '1px solid rgba(52, 168, 83, 0.35)',
                        color: '#86EFAC',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: isPending ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <CheckCircle2 size={13} />
                      Approve
                    </button>

                    {/* Request Changes / Reject */}
                    {item.type !== 'account' && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          setPromptAction({ item, action: 'changes_requested' });
                          setPromptNotes('');
                        }}
                        style={{
                          padding: '0.4rem 0.75rem',
                          borderRadius: '8px',
                          background: 'rgba(251, 188, 4, 0.12)',
                          border: '1px solid rgba(251, 188, 4, 0.3)',
                          color: '#FCD34D',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: isPending ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <MessageSquare size={12} />
                        Request Changes
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setPromptAction({ item, action: 'reject' });
                        setPromptNotes('');
                      }}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '8px',
                        background: 'rgba(234, 67, 53, 0.12)',
                        border: '1px solid rgba(234, 67, 53, 0.3)',
                        color: '#FCA5A5',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: isPending ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <XCircle size={12} />
                      Reject
                    </button>

                    {/* Direct link */}
                    <Link
                      href={item.actionUrl}
                      style={{
                        padding: '0.4rem 0.6rem',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--text-muted)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Open full page"
                    >
                      <ExternalLink size={13} />
                    </Link>
                  </div>
                </div>

                {/* Inline Reviewer Notes Prompt */}
                {promptAction && promptAction.item.id === item.id && (
                  <div
                    style={{
                      padding: '0.85rem',
                      borderRadius: '10px',
                      background: 'rgba(15, 23, 42, 0.85)',
                      border:
                        promptAction.action === 'reject'
                          ? '1px solid rgba(234, 67, 53, 0.4)'
                          : '1px solid rgba(251, 188, 4, 0.4)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: promptAction.action === 'reject' ? '#FCA5A5' : '#FCD34D',
                      }}
                    >
                      {promptAction.action === 'reject' ? 'Confirm Rejection Reason:' : 'Feedback / Required Modifications:'}
                    </span>
                    <textarea
                      rows={2}
                      value={promptNotes}
                      onChange={(e) => setPromptNotes(e.target.value)}
                      placeholder="Add specific notes for the submitter..."
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#FFFFFF',
                        fontSize: '0.78rem',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => setPromptAction(null)}
                        style={{
                          padding: '0.3rem 0.65rem',
                          borderRadius: '6px',
                          background: 'transparent',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: 'var(--text-secondary)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleAction(item, promptAction.action, promptNotes)}
                        style={{
                          padding: '0.3rem 0.85rem',
                          borderRadius: '6px',
                          background: promptAction.action === 'reject' ? '#EA4335' : '#FBBC04',
                          color: promptAction.action === 'reject' ? '#FFFFFF' : '#1E293B',
                          border: 'none',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: isPending ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isPending ? 'Processing…' : promptAction.action === 'reject' ? 'Confirm Reject' : 'Send Modifications'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '0.85rem',
                      borderRadius: '10px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0.65rem',
                      fontSize: '0.78rem',
                    }}
                  >
                    {item.type === 'account' && (
                      <>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Faculty:</span>{' '}
                          <span style={{ color: '#FFFFFF' }}>{item.details.faculty || 'N/A'}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>University ID:</span>{' '}
                          <span style={{ color: '#FFFFFF' }}>{item.details.universityId || 'N/A'}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Phone:</span>{' '}
                          <span style={{ color: '#FFFFFF' }}>{item.details.phone || 'N/A'}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Email:</span>{' '}
                          <span style={{ color: '#FFFFFF' }}>{item.submitterEmail || 'N/A'}</span>
                        </div>
                      </>
                    )}

                    {item.type === 'task' && (
                      <>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Priority:</span>{' '}
                          <span style={{ color: '#FFFFFF', fontWeight: 700 }}>
                            {item.details.taskPriority?.toUpperCase() || 'MEDIUM'}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Deadline:</span>{' '}
                          <span style={{ color: '#FFFFFF' }}>
                            {item.details.taskDeadline ? new Date(item.details.taskDeadline).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        {item.details.taskDescription && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Description:</span>{' '}
                            <span style={{ color: '#FFFFFF' }}>{item.details.taskDescription}</span>
                          </div>
                        )}
                      </>
                    )}

                    {item.type === 'event' && (
                      <>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Event Date:</span>{' '}
                          <span style={{ color: '#FFFFFF' }}>
                            {item.details.eventDate ? new Date(item.details.eventDate).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Venue:</span>{' '}
                          <span style={{ color: '#FFFFFF' }}>{item.details.eventVenue || 'TBD'}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Capacity:</span>{' '}
                          <span style={{ color: '#FFFFFF' }}>{item.details.eventCapacity || 'Unlimited'} attendees</span>
                        </div>
                        {item.details.eventDescription && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Description:</span>{' '}
                            <span style={{ color: '#FFFFFF' }}>{item.details.eventDescription}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
