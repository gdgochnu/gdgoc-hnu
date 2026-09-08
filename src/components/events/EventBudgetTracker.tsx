'use client';

import React, { useState, useTransition } from 'react';
import {
  EventBudgetSummary,
  EventBudgetItem,
  EventBudgetCategory,
} from '@/types';
import { upsertEventBudgetItem, deleteEventBudgetItem } from '@/app/events/actions';
import {
  Wallet,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Trash2,
  Edit2,
  ExternalLink,
  DollarSign,
  PieChart,
  FileText,
  Loader2,
  X,
  UploadCloud,
} from 'lucide-react';

interface EventBudgetTrackerProps {
  initialSummary: EventBudgetSummary;
  eventId: string;
  canManage: boolean;
}

const CATEGORY_META: Record<
  EventBudgetCategory,
  { label: string; color: string; bg: string }
> = {
  venue: { label: 'Venue & Hall', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)' },
  catering: { label: 'Catering & Food', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)' },
  printing: { label: 'Printing & Badges', color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.15)' },
  transport: { label: 'Transport & Logistics', color: '#34D399', bg: 'rgba(52, 211, 153, 0.15)' },
  other: { label: 'Miscellaneous', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.15)' },
};

export function EventBudgetTracker({
  initialSummary,
  eventId,
  canManage,
}: EventBudgetTrackerProps) {
  const [summary, setSummary] = useState<EventBudgetSummary>(initialSummary);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EventBudgetItem | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [category, setCategory] = useState<EventBudgetCategory>('venue');
  const [description, setDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');

  const openAddModal = () => {
    setEditingItem(null);
    setCategory('venue');
    setDescription('');
    setEstimatedCost('');
    setActualCost('');
    setPaidBy('');
    setReceiptUrl('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: EventBudgetItem) => {
    setEditingItem(item);
    setCategory(item.category);
    setDescription(item.description);
    setEstimatedCost(String(item.estimated_cost));
    setActualCost(item.actual_cost !== null ? String(item.actual_cost) : '');
    setPaidBy(item.paid_by || '');
    setReceiptUrl(item.receipt_url || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setFormError('Description is required.');
      return;
    }
    const est = parseFloat(estimatedCost);
    if (isNaN(est) || est < 0) {
      setFormError('Please enter a valid estimated cost.');
      return;
    }

    setFormError(null);
    startTransition(async () => {
      const res = await upsertEventBudgetItem({
        id: editingItem?.id,
        eventId,
        category,
        description,
        estimatedCost: est,
        actualCost: actualCost.trim() ? parseFloat(actualCost) : null,
        paidBy: paidBy.trim() || null,
        receiptUrl: receiptUrl.trim() || null,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to save budget item.');
      } else if (res.item) {
        // Update local items state
        let updatedItems: EventBudgetItem[];
        if (editingItem) {
          updatedItems = summary.items.map((it) =>
            it.id === res.item!.id ? res.item! : it
          );
        } else {
          updatedItems = [...summary.items, res.item];
        }

        // Recompute local metrics
        let totalEst = 0;
        let totalAct = 0;
        const breakdown: any = {
          venue: { estimated: 0, actual: 0, count: 0 },
          catering: { estimated: 0, actual: 0, count: 0 },
          printing: { estimated: 0, actual: 0, count: 0 },
          transport: { estimated: 0, actual: 0, count: 0 },
          other: { estimated: 0, actual: 0, count: 0 },
        };

        updatedItems.forEach((it) => {
          totalEst += it.estimated_cost;
          if (it.actual_cost !== null) totalAct += it.actual_cost;
          if (breakdown[it.category]) {
            breakdown[it.category].estimated += it.estimated_cost;
            if (it.actual_cost !== null) breakdown[it.category].actual += it.actual_cost;
            breakdown[it.category].count++;
          }
        });

        const isOver = totalAct > totalEst && totalEst > 0;
        setSummary({
          eventId,
          totalEstimated: Number(totalEst.toFixed(2)),
          totalActual: Number(totalAct.toFixed(2)),
          variance: Number((totalEst - totalAct).toFixed(2)),
          isOverBudget: isOver,
          overBudgetAmount: isOver ? Number((totalAct - totalEst).toFixed(2)) : 0,
          categoryBreakdown: breakdown,
          items: updatedItems,
        });

        setIsModalOpen(false);
      }
    });
  };

  const handleDelete = (itemId: string) => {
    if (!confirm('Are you sure you want to delete this budget line item?')) return;

    startTransition(async () => {
      const res = await deleteEventBudgetItem(itemId, eventId);
      if (res.success) {
        const updatedItems = summary.items.filter((it) => it.id !== itemId);
        let totalEst = 0;
        let totalAct = 0;
        const breakdown: any = {
          venue: { estimated: 0, actual: 0, count: 0 },
          catering: { estimated: 0, actual: 0, count: 0 },
          printing: { estimated: 0, actual: 0, count: 0 },
          transport: { estimated: 0, actual: 0, count: 0 },
          other: { estimated: 0, actual: 0, count: 0 },
        };

        updatedItems.forEach((it) => {
          totalEst += it.estimated_cost;
          if (it.actual_cost !== null) totalAct += it.actual_cost;
          if (breakdown[it.category]) {
            breakdown[it.category].estimated += it.estimated_cost;
            if (it.actual_cost !== null) breakdown[it.category].actual += it.actual_cost;
            breakdown[it.category].count++;
          }
        });

        const isOver = totalAct > totalEst && totalEst > 0;
        setSummary({
          eventId,
          totalEstimated: Number(totalEst.toFixed(2)),
          totalActual: Number(totalAct.toFixed(2)),
          variance: Number((totalEst - totalAct).toFixed(2)),
          isOverBudget: isOver,
          overBudgetAmount: isOver ? Number((totalAct - totalEst).toFixed(2)) : 0,
          categoryBreakdown: breakdown,
          items: updatedItems,
        });
      } else {
        alert(res.error || 'Failed to delete budget item.');
      }
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div
      className="glass-panel"
      style={{
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(16px)',
        position: 'relative',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Top Google 4-color Accent Bar */}
      <div
        style={{
          height: '4px',
          width: '100%',
          background:
            'linear-gradient(90deg, #4285F4 0% 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75% 100%)',
        }}
      />

      <div style={{ padding: '1.75rem 2rem' }}>
        {/* Section Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(52, 168, 83, 0.15)',
                border: '1px solid rgba(52, 168, 83, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--google-green)',
                flexShrink: 0,
              }}
            >
              <Wallet size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    margin: 0,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Event Budget Tracker
                </h2>
                {summary.isOverBudget && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.2rem 0.65rem',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: 'rgba(234, 67, 53, 0.15)',
                      color: 'var(--google-red)',
                      border: '1px solid rgba(234, 67, 53, 0.3)',
                    }}
                  >
                    <AlertTriangle size={12} /> Over Budget!
                  </span>
                )}
              </div>
              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  margin: '0.25rem 0 0',
                }}
              >
                Line items, estimated vs. actual expenses, and verified receipts (Spec §4.20)
              </p>
            </div>
          </div>

          {/* Action Button */}
          {canManage && (
            <button
              onClick={openAddModal}
              id="add-budget-item-btn"
              style={{
                background: 'linear-gradient(135deg, var(--google-blue), #2563EB)',
                color: '#FFFFFF',
                padding: '0.55rem 1.15rem',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(66, 133, 244, 0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              <Plus size={16} />
              <span>Add Budget Item</span>
            </button>
          )}
        </div>

        {/* Over Budget Notice Alert */}
        {summary.isOverBudget && (
          <div
            style={{
              margin: '1.25rem 0 0.5rem',
              padding: '0.9rem 1.25rem',
              borderRadius: '12px',
              background: 'rgba(234, 67, 53, 0.12)',
              border: '1px solid rgba(234, 67, 53, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <AlertTriangle size={18} color="var(--google-red)" style={{ flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FCA5A5' }}>
                  Budget Overrun Alert: Actual spend exceeds initial estimate!
                </span>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#CBD5E1' }}>
                  Total actual expenditures ({formatCurrency(summary.totalActual)}) have exceeded estimated budget ({formatCurrency(summary.totalEstimated)}) by{' '}
                  <strong style={{ color: '#F87171' }}>{formatCurrency(summary.overBudgetAmount)}</strong>.
                  Flagged in President Command Center.
                </p>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '0.25rem 0.65rem',
                borderRadius: '6px',
                background: 'rgba(234, 67, 53, 0.25)',
                color: '#FECACA',
              }}
            >
              +{formatCurrency(summary.overBudgetAmount)} Exceeded
            </span>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            margin: '1.5rem 0',
          }}
        >
          {/* Estimated Card */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
              }}
            >
              Estimated Budget
            </span>
            <span style={{ fontSize: '1.85rem', fontWeight: 900, color: '#FFFFFF' }}>
              {formatCurrency(summary.totalEstimated)}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Across {summary.items.length} line items
            </span>
          </div>

          {/* Actual Spend Card */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
              }}
            >
              Actual Spend
            </span>
            <span
              style={{
                fontSize: '1.85rem',
                fontWeight: 900,
                color: summary.isOverBudget ? 'var(--google-red)' : '#86EFAC',
              }}
            >
              {formatCurrency(summary.totalActual)}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Realized &amp; paid costs
            </span>
          </div>

          {/* Variance / Remaining Card */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
              }}
            >
              Budget Variance
            </span>
            <span
              style={{
                fontSize: '1.85rem',
                fontWeight: 900,
                color:
                  summary.variance > 0
                    ? 'var(--google-green)'
                    : summary.variance < 0
                    ? 'var(--google-red)'
                    : '#FFFFFF',
              }}
            >
              {summary.variance >= 0 ? '+' : ''}
              {formatCurrency(summary.variance)}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {summary.variance >= 0 ? 'Remaining under budget' : 'Deficit / overspend'}
            </span>
          </div>
        </div>

        {/* Categories Breakdown */}
        {summary.items.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              flexWrap: 'wrap',
              marginBottom: '1.5rem',
              padding: '0.85rem 1rem',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                marginRight: '0.25rem',
              }}
            >
              <PieChart size={14} /> Categories:
            </span>

            {(Object.keys(CATEGORY_META) as EventBudgetCategory[]).map((cat) => {
              const data = summary.categoryBreakdown[cat];
              if (!data || data.count === 0) return null;
              const meta = CATEGORY_META[cat];
              return (
                <span
                  key={cat}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: meta.bg,
                    color: meta.color,
                  }}
                >
                  <span>{meta.label}:</span>
                  <strong style={{ color: '#FFFFFF' }}>{formatCurrency(data.actual || data.estimated)}</strong>
                  <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>({data.count})</span>
                </span>
              );
            })}
          </div>
        )}

        {/* Items Table / Empty State */}
        {summary.items.length === 0 ? (
          <div
            style={{
              padding: '3rem 1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.015)',
              borderRadius: '16px',
              border: '1px dashed var(--border-subtle)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                marginBottom: '1rem',
              }}
            >
              <Receipt size={26} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.4rem' }}>
              No Budget Items Yet
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 0 1.25rem' }}>
              Track costs for venue booking, catering, badges, transport, and printouts.
            </p>
            {canManage && (
              <button
                onClick={openAddModal}
                style={{
                  background: 'linear-gradient(135deg, var(--google-blue), #2563EB)',
                  color: '#FFFFFF',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Plus size={15} /> Add First Item
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.85rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Description</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Estimated</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actual</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Paid By</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Receipt</th>
                  {canManage && <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {summary.items.map((item) => {
                  const meta = CATEGORY_META[item.category] || CATEGORY_META.other;
                  const hasReceipt = Boolean(item.receipt_url || item.receipt_drive_file_id);
                  const isItemOver =
                    item.actual_cost !== null && item.actual_cost > item.estimated_cost;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* Category */}
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: meta.bg,
                            color: meta.color,
                          }}
                        >
                          {meta.label}
                        </span>
                      </td>

                      {/* Description */}
                      <td style={{ padding: '0.85rem 1rem', color: '#FFFFFF', fontWeight: 600 }}>
                        {item.description}
                      </td>

                      {/* Estimated Cost */}
                      <td
                        style={{
                          padding: '0.85rem 1rem',
                          textAlign: 'right',
                          color: '#CBD5E1',
                          fontFamily: 'monospace',
                        }}
                      >
                        {formatCurrency(item.estimated_cost)}
                      </td>

                      {/* Actual Cost */}
                      <td
                        style={{
                          padding: '0.85rem 1rem',
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color:
                            item.actual_cost === null
                              ? 'var(--text-muted)'
                              : isItemOver
                              ? 'var(--google-red)'
                              : '#86EFAC',
                        }}
                      >
                        {item.actual_cost !== null ? (
                          formatCurrency(item.actual_cost)
                        ) : (
                          <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>Pending</span>
                        )}
                      </td>

                      {/* Paid By */}
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                        {item.paid_by || '—'}
                      </td>

                      {/* Receipt */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {hasReceipt ? (
                          <button
                            onClick={() => setSelectedReceipt(item.receipt_url || '#')}
                            style={{
                              background: 'rgba(66, 133, 244, 0.12)',
                              border: '1px solid rgba(66, 133, 244, 0.3)',
                              color: '#93C5FD',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <Receipt size={12} />
                            <span>View</span>
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No receipt</span>
                        )}
                      </td>

                      {/* Actions */}
                      {canManage && (
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                              onClick={() => openEditModal(item)}
                              title="Edit item"
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-secondary)',
                                padding: '0.3rem',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              title="Delete item"
                              style={{
                                background: 'rgba(234, 67, 53, 0.1)',
                                border: '1px solid rgba(234, 67, 53, 0.25)',
                                color: '#F87171',
                                padding: '0.3rem',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              borderRadius: '20px',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              padding: '2rem',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
              }}
            >
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                {editingItem ? 'Edit Budget Item' : 'Add Budget Item'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.3rem',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(234, 67, 53, 0.15)',
                  border: '1px solid rgba(234, 67, 53, 0.3)',
                  color: '#FCA5A5',
                  fontSize: '0.8rem',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Category */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as EventBudgetCategory)}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '0.65rem 0.85rem',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                >
                  <option value="venue">Venue & Hall</option>
                  <option value="catering">Catering & Food</option>
                  <option value="printing">Printing & Badges</option>
                  <option value="transport">Transport & Logistics</option>
                  <option value="other">Miscellaneous</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Auditorium Sound System & Wireless Mics"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '0.65rem 0.85rem',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Estimated & Actual Costs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Estimated Cost (EGP) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '0.65rem 0.85rem',
                      color: '#FFFFFF',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Actual Cost (EGP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Optional until paid"
                    value={actualCost}
                    onChange={(e) => setActualCost(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '0.65rem 0.85rem',
                      color: '#FFFFFF',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Paid By */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Paid By (Person / Lead)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ahmed Reda / Operations Fund"
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '0.65rem 0.85rem',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Receipt Attachment URL / Storage */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Receipt URL / Image Link
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or receipt link"
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '0.65rem 0.85rem',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    padding: '0.65rem 1.15rem',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  style={{
                    background: 'linear-gradient(135deg, var(--google-blue), #2563EB)',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '0.65rem 1.35rem',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingItem ? 'Update Item' : 'Add Item'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {selectedReceipt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '600px',
              borderRadius: '20px',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              padding: '1.5rem',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
              position: 'relative',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Receipt Document Preview
              </h4>
              <button
                onClick={() => setSelectedReceipt(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                background: '#000000',
                border: '1px solid var(--border-subtle)',
                padding: '1rem',
                minHeight: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {selectedReceipt.startsWith('http') ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
                  <Receipt size={40} color="var(--google-blue)" />
                  <a
                    href={selectedReceipt}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: 'rgba(66, 133, 244, 0.2)',
                      border: '1px solid rgba(66, 133, 244, 0.4)',
                      color: '#93C5FD',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <span>Open External Receipt</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Receipt attached ({selectedReceipt})
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
