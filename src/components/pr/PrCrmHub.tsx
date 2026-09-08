'use client';

import React, { useState, useMemo } from 'react';
import {
  PRContact,
  PrContactType,
  PrPipelineStage,
  UserRole,
} from '@/types';
import { PrPipelineKanban } from './PrPipelineKanban';
import { PrContactsListView } from './PrContactsListView';
import { CreateContactModal } from './CreateContactModal';
import { EditContactModal } from './EditContactModal';
import {
  Kanban,
  List,
  Search,
  Plus,
  Filter,
  Users,
  Building,
  CheckCircle2,
  Clock,
  Briefcase,
  Sparkles,
} from 'lucide-react';

interface PrCrmHubProps {
  initialContacts: PRContact[];
  teamMembers: Array<{
    id: string;
    full_name_en: string;
    full_name_ar: string;
    role: UserRole;
    avatar_url?: string | null;
  }>;
  currentUserRole?: string;
  isPresidential?: boolean;
}

export function PrCrmHub({
  initialContacts,
  teamMembers,
  currentUserRole,
  isPresidential,
}: PrCrmHubProps) {
  const [contacts, setContacts] = useState<PRContact[]>(initialContacts);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createInitialStage, setCreateInitialStage] = useState<PrPipelineStage>('new');
  const [editingContact, setEditingContact] = useState<PRContact | null>(null);

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      // Type filter
      if (selectedType !== 'all' && c.type !== selectedType) return false;

      // Stage filter (mainly applicable in list view, but also honors filter)
      if (selectedStage !== 'all' && c.pipeline_stage !== selectedStage) return false;

      // Assignee filter
      if (selectedAssignee !== 'all') {
        if (selectedAssignee === 'unassigned' && c.assigned_to) return false;
        if (selectedAssignee !== 'unassigned' && c.assigned_to !== selectedAssignee) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name?.toLowerCase().includes(q);
        const matchesOrg = c.organization?.toLowerCase().includes(q);
        const matchesRole = c.role_title?.toLowerCase().includes(q);
        const matchesEmail = c.email?.toLowerCase().includes(q);
        const matchesNotes = c.notes?.toLowerCase().includes(q);
        if (!matchesName && !matchesOrg && !matchesRole && !matchesEmail && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [contacts, selectedType, selectedStage, selectedAssignee, searchQuery]);

  // Metric counts
  const metrics = useMemo(() => {
    const total = contacts.length;
    const newLeads = contacts.filter((c) => c.pipeline_stage === 'new').length;
    const contacted = contacts.filter((c) => c.pipeline_stage === 'contacted').length;
    const negotiating = contacts.filter((c) => c.pipeline_stage === 'negotiating').length;
    const confirmed = contacts.filter((c) => c.pipeline_stage === 'confirmed').length;
    const conversionRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;

    return { total, newLeads, contacted, negotiating, confirmed, conversionRate };
  }, [contacts]);

  // Handlers
  const handleOpenCreate = (stage: PrPipelineStage = 'new') => {
    setCreateInitialStage(stage);
    setIsCreateOpen(true);
  };

  const handleContactCreated = (newContact: PRContact) => {
    // Attach assignee if available
    const assigneeMember = teamMembers.find((m) => m.id === newContact.assigned_to);
    const hydratedContact: PRContact = {
      ...newContact,
      assignee: assigneeMember
        ? {
            id: assigneeMember.id,
            full_name_en: assigneeMember.full_name_en,
            full_name_ar: assigneeMember.full_name_ar,
            avatar_url: assigneeMember.avatar_url,
            role: assigneeMember.role,
          }
        : null,
    };
    setContacts((prev) => [hydratedContact, ...prev]);
  };

  const handleContactUpdated = (updated: PRContact) => {
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleContactDeleted = (contactId: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner & Header */}
      <div
        className="glass-panel"
        style={{
          backgroundColor: 'var(--bg-card, #13151b)',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          borderRadius: '1.25rem',
          padding: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow accent */}
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(66, 133, 244, 0.25) 0%, rgba(0,0,0,0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(66, 133, 244, 0.15)',
                  color: 'var(--google-blue, #4285F4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Briefcase size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                  PR CRM & Outreach Pipeline
                </h1>
                <p style={{ fontSize: '0.85rem', color: '#9aa0a6', margin: 0 }}>
                  Manage speakers, sponsors, venue hosts, and chapter partners across the outreach lifecycle
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* View Mode Toggle */}
            <div
              style={{
                display: 'flex',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                borderRadius: '0.65rem',
                padding: '0.2rem',
              }}
            >
              <button
                onClick={() => setViewMode('kanban')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: viewMode === 'kanban' ? 'var(--google-blue, #4285F4)' : 'transparent',
                  color: viewMode === 'kanban' ? '#fff' : '#9aa0a6',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Kanban size={15} />
                <span>Kanban</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: viewMode === 'list' ? 'var(--google-blue, #4285F4)' : 'transparent',
                  color: viewMode === 'list' ? '#fff' : '#9aa0a6',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <List size={15} />
                <span>Table</span>
              </button>
            </div>

            {/* Primary Add Contact CTA */}
            <button
              onClick={() => handleOpenCreate('new')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1.25rem',
                borderRadius: '0.65rem',
                border: 'none',
                backgroundColor: 'var(--google-blue, #4285F4)',
                color: '#fff',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(66, 133, 244, 0.35)',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <Plus size={18} />
              <span>Add Contact</span>
            </button>
          </div>
        </div>

        {/* 4 Pipeline Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          {/* Total Contacts */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '0.85rem',
              backgroundColor: 'rgba(66, 133, 244, 0.08)',
              border: '1px solid rgba(66, 133, 244, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Contacts
              </span>
              <Users size={16} color="var(--google-blue, #4285F4)" />
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff' }}>
              {metrics.total}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#8ab4f8' }}>
              {metrics.newLeads} new leads
            </div>
          </div>

          {/* Contacted */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '0.85rem',
              backgroundColor: 'rgba(251, 188, 5, 0.08)',
              border: '1px solid rgba(251, 188, 5, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Outreach Sent
              </span>
              <Clock size={16} color="var(--google-yellow, #FBBC05)" />
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff' }}>
              {metrics.contacted}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#fdd663' }}>
              Awaiting replies
            </div>
          </div>

          {/* Negotiating */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '0.85rem',
              backgroundColor: 'rgba(234, 67, 53, 0.08)',
              border: '1px solid rgba(234, 67, 53, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                In Discussion
              </span>
              <Sparkles size={16} color="var(--google-red, #EA4335)" />
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff' }}>
              {metrics.negotiating}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#f28b82' }}>
              Negotiating terms
            </div>
          </div>

          {/* Confirmed */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '0.85rem',
              backgroundColor: 'rgba(52, 168, 83, 0.08)',
              border: '1px solid rgba(52, 168, 83, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Confirmed
              </span>
              <CheckCircle2 size={16} color="var(--google-green, #34A853)" />
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff' }}>
              {metrics.confirmed}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#81c995' }}>
              {metrics.conversionRate}% conversion rate
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-panel"
        style={{
          backgroundColor: 'var(--bg-card, #13151b)',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          borderRadius: '1rem',
          padding: '1rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.85rem',
        }}
      >
        {/* Search input */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9aa0a6',
            }}
          />
          <input
            type="text"
            placeholder="Search contacts, roles, companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem 0.6rem 2.35rem',
              borderRadius: '0.6rem',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
              color: '#fff',
              fontSize: '0.88rem',
            }}
          />
        </div>

        {/* Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Filter size={15} color="#9aa0a6" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{
              padding: '0.6rem 0.85rem',
              borderRadius: '0.6rem',
              backgroundColor: '#1e212b',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
              color: '#fff',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Types</option>
            <option value="speaker">🎤 Speakers</option>
            <option value="sponsor">💎 Sponsors</option>
            <option value="partner">🤝 Partners</option>
            <option value="venue">🏛️ Venues</option>
            <option value="other">📌 Other</option>
          </select>
        </div>

        {/* Stage Filter (Active when filtering) */}
        {viewMode === 'list' && (
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            style={{
              padding: '0.6rem 0.85rem',
              borderRadius: '0.6rem',
              backgroundColor: '#1e212b',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
              color: '#fff',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Pipeline Stages</option>
            <option value="new">🔵 New</option>
            <option value="contacted">🟡 Contacted</option>
            <option value="negotiating">🔴 Negotiating</option>
            <option value="confirmed">🟢 Confirmed</option>
          </select>
        )}

        {/* Assignee Filter */}
        <select
          value={selectedAssignee}
          onChange={(e) => setSelectedAssignee(e.target.value)}
          style={{
            padding: '0.6rem 0.85rem',
            borderRadius: '0.6rem',
            backgroundColor: '#1e212b',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
            color: '#fff',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Assignees</option>
          <option value="unassigned">Unassigned Only</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name_en}
            </option>
          ))}
        </select>

        {/* Active Filters Clear Button */}
        {(searchQuery || selectedType !== 'all' || selectedStage !== 'all' || selectedAssignee !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedType('all');
              setSelectedStage('all');
              setSelectedAssignee('all');
            }}
            style={{
              padding: '0.6rem 0.85rem',
              borderRadius: '0.6rem',
              border: 'none',
              backgroundColor: 'rgba(234, 67, 53, 0.1)',
              color: '#f28b82',
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main View: Kanban vs List */}
      {viewMode === 'kanban' ? (
        <PrPipelineKanban
          contacts={filteredContacts}
          onContactUpdated={handleContactUpdated}
          onOpenCreateModal={handleOpenCreate}
          onOpenEditModal={(contact) => setEditingContact(contact)}
        />
      ) : (
        <PrContactsListView
          contacts={filteredContacts}
          onOpenEditModal={(contact) => setEditingContact(contact)}
        />
      )}

      {/* Create Contact Modal */}
      <CreateContactModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onContactCreated={handleContactCreated}
        teamMembers={teamMembers}
        initialStage={createInitialStage}
      />

      {/* Edit Contact Modal */}
      <EditContactModal
        isOpen={!!editingContact}
        contact={editingContact}
        onClose={() => setEditingContact(null)}
        onContactUpdated={handleContactUpdated}
        onContactDeleted={handleContactDeleted}
        teamMembers={teamMembers}
      />
    </div>
  );
}
