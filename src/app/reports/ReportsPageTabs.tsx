'use client';

import { useState } from 'react';
import { ClipboardList, Calendar } from 'lucide-react';

interface ReportsPageTabsProps {
  committeeTab: React.ReactNode;
  eventTab: React.ReactNode;
}

export function ReportsPageTabs({ committeeTab, eventTab }: ReportsPageTabsProps) {
  const [activeTab, setActiveTab] = useState<'committee' | 'events'>('committee');

  const tabs = [
    {
      key: 'committee' as const,
      label: 'Committee Reports',
      icon: ClipboardList,
      color: '#4285f4',
      description: 'Weekly & monthly performance',
    },
    {
      key: 'events' as const,
      label: 'Event Analytics',
      icon: Calendar,
      color: '#34a853',
      description: 'Attendance · Feedback · Budget',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Tab selector */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.375rem',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
          width: 'fit-content',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              id={`reports-main-tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                borderRadius: '11px',
                border: 'none',
                cursor: 'pointer',
                background: isActive
                  ? `linear-gradient(135deg, ${tab.color}33, ${tab.color}18)`
                  : 'transparent',
                borderColor: isActive ? `${tab.color}44` : 'transparent',
                borderStyle: 'solid',
                borderWidth: '1px',
                transition: 'all 0.2s',
              }}
            >
              <div
                style={{
                  color: isActive ? tab.color : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Icon size={16} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    lineHeight: 1.1,
                  }}
                >
                  {tab.label}
                </div>
                <div
                  style={{
                    fontSize: '0.67rem',
                    color: isActive ? tab.color : 'var(--text-muted)',
                    opacity: isActive ? 0.8 : 0.6,
                  }}
                >
                  {tab.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'committee' ? committeeTab : eventTab}
      </div>
    </div>
  );
}
