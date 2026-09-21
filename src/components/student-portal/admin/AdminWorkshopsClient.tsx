'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Layers,
  Plus,
  Search,
  Filter,
  Users,
  Calendar,
  Edit,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  ChevronRight,
  UserCheck,
  Lock,
  Unlock,
  ToggleLeft,
  ToggleRight,
  QrCode,
  GraduationCap,
  UploadCloud,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import {
  AdminWorkshopItem,
  CreateWorkshopInput,
  createAdminWorkshop,
  updateAdminWorkshop,
  deleteAdminWorkshop,
  toggleWorkshopRegistrationOpen,
  uploadWorkshopCoverImageAction,
} from '@/app/student-portal/admin/workshops/actions';
import { WorkshopStatus, CourseInstructorRole } from '@/types/student';

interface AdminWorkshopsClientProps {
  initialWorkshops: AdminWorkshopItem[];
  departments: Array<{ id: string; name: string; code: string; branch: string }>;
  teamMembers: Array<{ id: string; full_name: string; avatar_url: string | null; role: string; department_id: string | null }>;
  userRole: string;
  userDepartmentId: string | null;
  canCreate: boolean;
}

export function AdminWorkshopsClient({
  initialWorkshops,
  departments,
  teamMembers,
  userRole,
  userDepartmentId,
  canCreate,
}: AdminWorkshopsClientProps) {
  const [workshops, setWorkshops] = useState<AdminWorkshopItem[]>(initialWorkshops);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | WorkshopStatus>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [regFilter, setRegFilter] = useState<'all' | 'open' | 'closed'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<AdminWorkshopItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('Hands-on Workshop');
  const [formDeptId, setFormDeptId] = useState(userDepartmentId || (departments[0]?.id || ''));
  const [formCoverUrl, setFormCoverUrl] = useState('');
  const [formCapacity, setFormCapacity] = useState<string>('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formStatus, setFormStatus] = useState<WorkshopStatus>('draft');
  const [formRegOpen, setFormRegOpen] = useState(true);
  const [selectedInstructors, setSelectedInstructors] = useState<Array<{ profile_id: string; role: CourseInstructorRole }>>([]);
  const [instructorSearchQuery, setInstructorSearchQuery] = useState('');

  // Cover Image Drive Upload State
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [showManualUrlInput, setShowManualUrlInput] = useState(false);
  const coverFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleCoverUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP, GIF)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size exceeds the 10MB limit.');
      return;
    }

    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadWorkshopCoverImageAction(formData);
      if (res.success && res.url) {
        setFormCoverUrl(res.url);
      } else {
        alert(res.error || 'Failed to upload image to Google Drive.');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred while uploading image.');
    } finally {
      setIsUploadingCover(false);
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = '';
      }
    }
  };

  const handleCoverDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCoverUpload(e.dataTransfer.files[0]);
    }
  };

  const isPresident = ['president', 'co_president', 'branch_head'].includes(userRole);

  // KPI calculations
  const totalWorkshops = workshops.length;
  const publishedCount = workshops.filter((w) => w.status === 'published').length;
  const totalRegistrations = workshops.reduce((acc, w) => acc + (w.registrations_count || 0), 0);
  const totalSessions = workshops.reduce((acc, w) => acc + (w.sessions_count || 0), 0);

  // Candidate members filtered by search query
  const filteredCandidateMembers = teamMembers.filter((m) => {
    if (!instructorSearchQuery.trim()) return true;
    const q = instructorSearchQuery.toLowerCase();
    return m.full_name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
  });

  // Filtering
  const filteredWorkshops = workshops.filter((w) => {
    const matchesSearch =
      w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.description && w.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (w.category && w.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
    const matchesDept = deptFilter === 'all' || w.department_id === deptFilter;
    const matchesReg =
      regFilter === 'all' ||
      (regFilter === 'open' && w.registration_open) ||
      (regFilter === 'closed' && !w.registration_open);

    return matchesSearch && matchesStatus && matchesDept && matchesReg;
  });

  const openCreateModal = () => {
    setEditingWorkshop(null);
    setFormTitle('');
    setFormDesc('');
    setFormCategory('Technical Workshop');
    setFormDeptId(userDepartmentId || (departments[0]?.id || ''));
    setFormCoverUrl('');
    setFormCapacity('');
    setFormDeadline('');
    setFormStatus('draft');
    setFormRegOpen(true);
    setSelectedInstructors([]);
    setInstructorSearchQuery('');
    setFormError(null);
    setIsUploadingCover(false);
    setShowManualUrlInput(false);
    setIsModalOpen(true);
  };

  const openEditModal = (w: AdminWorkshopItem) => {
    setEditingWorkshop(w);
    setFormTitle(w.title);
    setFormDesc(w.description || '');
    setFormCategory(w.category || 'Technical Workshop');
    setFormDeptId(w.department_id || (departments[0]?.id || ''));
    setFormCoverUrl(w.cover_image_url || '');
    setFormCapacity(w.capacity ? String(w.capacity) : '');
    setFormDeadline(w.registration_deadline ? w.registration_deadline.slice(0, 16) : '');
    setFormStatus(w.status);
    setFormRegOpen(w.registration_open);
    setSelectedInstructors(
      w.instructors_list.map((inst) => ({
        profile_id: inst.profile_id,
        role: inst.role,
      }))
    );
    setInstructorSearchQuery('');
    setFormError(null);
    setIsUploadingCover(false);
    setShowManualUrlInput(false);
    setIsModalOpen(true);
  };

  const handleToggleReg = async (w: AdminWorkshopItem) => {
    const nextState = !w.registration_open;
    setWorkshops((prev) =>
      prev.map((item) => (item.id === w.id ? { ...item, registration_open: nextState } : item))
    );
    const res = await toggleWorkshopRegistrationOpen(w.id, nextState);
    if (!res.success) {
      // Revert on error
      setWorkshops((prev) =>
        prev.map((item) => (item.id === w.id ? { ...item, registration_open: !nextState } : item))
      );
      alert(res.error || 'Failed to toggle registration.');
    }
  };

  const handleSaveWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Workshop title is required.');
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);

      if (editingWorkshop) {
        const res = await updateAdminWorkshop({
          id: editingWorkshop.id,
          title: formTitle,
          description: formDesc,
          category: formCategory,
          department_id: isPresident ? formDeptId : undefined,
          cover_image_url: formCoverUrl,
          capacity: formCapacity ? Number(formCapacity) : null,
          registration_deadline: formDeadline || null,
          status: formStatus,
          registration_open: formRegOpen,
          instructors: selectedInstructors,
        });

        if (!res.success || !res.workshop) {
          setFormError(res.error || 'Failed to update workshop.');
          return;
        }

        const updated = res.workshop;
        setWorkshops((prev) =>
          prev.map((item) =>
            item.id === updated.id
              ? {
                  ...item,
                  ...updated,
                  department: departments.find((d) => d.id === updated.department_id) || item.department,
                  department_name: departments.find((d) => d.id === updated.department_id)?.name || item.department_name,
                  department_code: departments.find((d) => d.id === updated.department_id)?.code || item.department_code,
                  instructors_list: selectedInstructors.map((si) => {
                    const m = teamMembers.find((tm) => tm.id === si.profile_id);
                    return {
                      id: si.profile_id,
                      profile_id: si.profile_id,
                      role: si.role,
                      full_name: m?.full_name || 'Instructor',
                      avatar_url: m?.avatar_url || null,
                    };
                  }),
                }
              : item
          )
        );
      } else {
        const res = await createAdminWorkshop({
          title: formTitle,
          description: formDesc,
          category: formCategory,
          department_id: formDeptId,
          cover_image_url: formCoverUrl,
          capacity: formCapacity ? Number(formCapacity) : null,
          registration_deadline: formDeadline || null,
          status: formStatus,
          registration_open: formRegOpen,
          instructors: selectedInstructors,
        });

        if (!res.success || !res.workshop) {
          setFormError(res.error || 'Failed to create workshop.');
          return;
        }

        const created = res.workshop;
        const dept = departments.find((d) => d.id === created.department_id);
        const fullItem: AdminWorkshopItem = {
          ...created,
          department: dept || null,
          department_name: dept?.name,
          department_code: dept?.code,
          instructors_list: selectedInstructors.map((si) => {
            const m = teamMembers.find((tm) => tm.id === si.profile_id);
            return {
              id: si.profile_id,
              profile_id: si.profile_id,
              role: si.role,
              full_name: m?.full_name || 'Instructor',
              avatar_url: m?.avatar_url || null,
            };
          }),
          registrations_count: 0,
          sessions_count: 0,
        };

        setWorkshops([fullItem, ...workshops]);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (w: AdminWorkshopItem) => {
    if (!confirm(`Are you sure you want to permanently delete workshop "${w.title}"? This cannot be undone.`)) {
      return;
    }
    const res = await deleteAdminWorkshop(w.id);
    if (!res.success) {
      alert(res.error || 'Failed to delete workshop.');
      return;
    }
    setWorkshops((prev) => prev.filter((item) => item.id !== w.id));
  };

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '1360px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.25rem' }}>
      {/* 1. Header & Quick Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(234, 67, 53, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444',
              }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: '#FFFFFF' }}>
                Workshops & Bootcamps
              </h1>
              <p style={{ color: 'var(--text-secondary, #94A3B8)', fontSize: '0.88rem', margin: '0.2rem 0 0 0' }}>
                Schedule multi-session technical bootcamps, assign instructors, manage seats, and oversee student attendance.
              </p>
            </div>
          </div>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={openCreateModal}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.35rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              borderRadius: '10px',
              boxShadow: '0 4px 14px rgba(66, 133, 244, 0.25)',
            }}
          >
            <Plus size={18} />
            <span>Create New Workshop</span>
          </button>
        )}
      </div>

      {/* 2. KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94A3B8)', fontWeight: 600 }}>Total Workshops</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FFFFFF' }}>{totalWorkshops}</div>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted, #64748B)' }}>All created bootcamps</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94A3B8)', fontWeight: 600 }}>Published</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#34D399' }}>{publishedCount}</div>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted, #64748B)' }}>Visible to student applicants</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94A3B8)', fontWeight: 600 }}>Student Registrations</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#60A5FA' }}>{totalRegistrations}</div>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted, #64748B)' }}>Registered attendance passes</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94A3B8)', fontWeight: 600 }}>Multi-Sessions Scheduled</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FBBF24' }}>{totalSessions}</div>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted, #64748B)' }}>Offline & online lessons</span>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.55rem 0.85rem',
              flex: 1,
            }}
          >
            <Search size={16} color="var(--text-muted, #64748B)" />
            <input
              type="text"
              placeholder="Search workshops by title, description or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#FFFFFF',
                fontSize: '0.86rem',
                width: '100%',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.55rem 0.85rem',
              color: '#FFFFFF',
              fontSize: '0.84rem',
              outline: 'none',
            }}
          >
            <option value="all" style={{ background: '#181B20' }}>All Statuses</option>
            <option value="published" style={{ background: '#181B20' }}>Published</option>
            <option value="draft" style={{ background: '#181B20' }}>Draft</option>
            <option value="completed" style={{ background: '#181B20' }}>Completed</option>
            <option value="archived" style={{ background: '#181B20' }}>Archived</option>
          </select>

          {/* Registration Filter */}
          <select
            value={regFilter}
            onChange={(e) => setRegFilter(e.target.value as any)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.55rem 0.85rem',
              color: '#FFFFFF',
              fontSize: '0.84rem',
              outline: 'none',
            }}
          >
            <option value="all" style={{ background: '#181B20' }}>All Registrations</option>
            <option value="open" style={{ background: '#181B20' }}>🟢 Registration Open</option>
            <option value="closed" style={{ background: '#181B20' }}>🔴 Registration Closed</option>
          </select>

          {/* Department Filter */}
          {isPresident && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '0.55rem 0.85rem',
                color: '#FFFFFF',
                fontSize: '0.84rem',
                outline: 'none',
              }}
            >
              <option value="all" style={{ background: '#181B20' }}>All Committees</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id} style={{ background: '#181B20' }}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 4. Workshops List / Cards Grid */}
      {filteredWorkshops.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'rgba(234, 67, 53, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444',
            }}
          >
            <Sparkles size={28} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
            No Workshops Found
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #94A3B8)', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
            No workshops match your current filters. Create your first workshop or change search parameters.
          </p>
          {canCreate && (
            <button
              type="button"
              onClick={openCreateModal}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                fontSize: '0.86rem',
                marginTop: '0.5rem',
              }}
            >
              <Plus size={16} />
              <span>Create Workshop</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {filteredWorkshops.map((w) => {
            const isOwner =
              isPresident ||
              (userRole === 'committee_head' && w.department_id === userDepartmentId) ||
              w.instructors_list.some((inst) => inst.profile_id === userRole);

            return (
              <div
                key={w.id}
                className="glass-panel"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {w.cover_image_url && (
                  <div
                    style={{
                      width: 'calc(100% + 3rem)',
                      margin: '-1.5rem -1.5rem 0.75rem -1.5rem',
                      height: '140px',
                      background: `url(${w.cover_image_url}) center/cover no-repeat`,
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.1) 0%, rgba(15, 23, 42, 0.75) 100%)',
                      }}
                    />
                  </div>
                )}
                <div>
                  {/* Top Header: Category & Badges & Owner Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: '#EF4444',
                          background: 'rgba(234, 67, 53, 0.12)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {w.category || 'Workshop'}
                      </span>
                      {w.department_name && (
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #94A3B8)', fontWeight: 600 }}>
                          • {w.department_name}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '999px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          background:
                            w.status === 'published'
                              ? 'rgba(52, 168, 83, 0.15)'
                              : w.status === 'completed'
                              ? 'rgba(66, 133, 244, 0.15)'
                              : 'rgba(251, 188, 4, 0.15)',
                          color:
                            w.status === 'published'
                              ? '#86EFAC'
                              : w.status === 'completed'
                              ? '#93C5FD'
                              : '#FDE047',
                          border: `1px solid ${
                            w.status === 'published'
                              ? 'rgba(52, 168, 83, 0.3)'
                              : w.status === 'completed'
                              ? 'rgba(66, 133, 244, 0.3)'
                              : 'rgba(251, 188, 4, 0.3)'
                          }`,
                        }}
                      >
                        {w.status}
                      </span>
                    </div>

                    {isOwner && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(w)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            padding: '0.35rem',
                            color: '#CBD5E1',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                          }}
                          title="Edit Workshop Settings"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(w)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: '6px',
                            padding: '0.35rem',
                            color: '#F87171',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                          }}
                          title="Delete Workshop"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.5rem 0', lineHeight: 1.35 }}>
                    {w.title}
                  </h3>
                  {w.description && (
                    <p
                      style={{
                        fontSize: '0.84rem',
                        color: 'var(--text-secondary, #94A3B8)',
                        margin: 0,
                        lineHeight: 1.45,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {w.description}
                    </p>
                  )}

                  {/* Quick Registration Status Toggle */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '0.85rem',
                      padding: '0.55rem 0.75rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: w.registration_open ? '#10B981' : '#EF4444',
                        }}
                      />
                      <span style={{ color: w.registration_open ? '#86EFAC' : '#FCA5A5', fontWeight: 600 }}>
                        {w.registration_open ? 'Registration Active' : 'Registration Closed'}
                      </span>
                    </div>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleToggleReg(w)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: w.registration_open ? '#34D399' : '#94A3B8',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                        title="Click to toggle registration on/off"
                      >
                        {w.registration_open ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                        <span>Toggle</span>
                      </button>
                    )}
                  </div>

                  {/* KPI Metrics */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.5rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      marginTop: '0.85rem',
                      textAlign: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748B)', fontWeight: 600 }}>SESSIONS</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.1rem' }}>
                        {w.sessions_count}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748B)', fontWeight: 600 }}>REGISTERED</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#93C5FD', marginTop: '0.1rem' }}>
                        {w.registrations_count}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748B)', fontWeight: 600 }}>CAPACITY</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#CBD5E1', marginTop: '0.1rem' }}>
                        {w.capacity ? w.capacity : '∞'}
                      </div>
                    </div>
                  </div>

                  {/* Instructors Avatars Strip */}
                  <div style={{ marginTop: '0.85rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748B)', fontWeight: 600, marginBottom: '0.35rem' }}>
                      WORKSHOP INSTRUCTORS & MENTORS
                    </div>
                    {w.instructors_list.length === 0 ? (
                      <span style={{ fontSize: '0.76rem', color: '#94A3B8', fontStyle: 'italic' }}>
                        No instructors assigned yet
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {w.instructors_list.map((inst) => (
                          <div
                            key={inst.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.18rem 0.45rem',
                              borderRadius: '999px',
                              background: inst.role === 'instructor' ? 'rgba(234, 67, 53, 0.12)' : 'rgba(52, 168, 83, 0.12)',
                              border: inst.role === 'instructor' ? '1px solid rgba(234, 67, 53, 0.25)' : '1px solid rgba(52, 168, 83, 0.25)',
                              fontSize: '0.72rem',
                              color: '#FFFFFF',
                            }}
                          >
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: inst.role === 'instructor' ? '#F87171' : '#34D399' }} />
                            <span>{inst.full_name}</span>
                            <span style={{ fontSize: '0.64rem', color: '#94A3B8', textTransform: 'capitalize' }}>
                              ({inst.role})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Controls (2x2 Grid) */}
                <div
                  style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: '0.85rem',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                  }}
                >
                  <Link
                    href={`/student-portal/admin/workshops/${w.id}/sessions`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.55rem 0.6rem',
                      borderRadius: '8px',
                      background: 'rgba(234, 67, 53, 0.12)',
                      border: '1px solid rgba(234, 67, 53, 0.25)',
                      color: '#F87171',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      transition: 'all 0.15s ease',
                    }}
                    title="Manage Workshop Sessions"
                  >
                    <Calendar size={13} />
                    <span>Sessions ({w.sessions_count})</span>
                  </Link>

                  <Link
                    href={`/student-portal/admin/workshops/${w.id}/registrations`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.55rem 0.6rem',
                      borderRadius: '8px',
                      background: 'rgba(52, 168, 83, 0.12)',
                      border: '1px solid rgba(52, 168, 83, 0.28)',
                      color: '#86EFAC',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      transition: 'all 0.15s ease',
                    }}
                    title="Manage Registrations & Attendance Passes"
                  >
                    <Users size={13} />
                    <span>Registered ({w.registrations_count})</span>
                  </Link>

                  <Link
                    href={`/student-portal/admin/workshops/${w.id}/instructors`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.55rem 0.6rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#E2E8F0',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      transition: 'all 0.15s ease',
                    }}
                    title="Manage Instructors & Mentors"
                  >
                    <Users size={13} />
                    <span>Instructors</span>
                  </Link>

                  <Link
                    href={`/student-portal/admin/attendance/scan?type=workshop&workshopId=${w.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.55rem 0.6rem',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.16) 0%, rgba(52, 168, 83, 0.16) 100%)',
                      border: '1px solid rgba(66, 133, 244, 0.35)',
                      color: '#60A5FA',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      transition: 'all 0.15s ease',
                    }}
                    title="Scan Attendee QR Codes for Attendance"
                  >
                    <QrCode size={13} style={{ color: '#34A853' }} />
                    <span>Scan QR</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Create / Edit Workshop Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem',
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '16px',
              padding: '2rem',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                  {editingWorkshop ? 'Edit Workshop Configuration' : 'Create New Technical Workshop'}
                </h2>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary, #94A3B8)', margin: '0.25rem 0 0 0' }}>
                  Configure bootcamp tracks, attendance capacity, and assign instructor mentors.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#94A3B8',
                  padding: '0.4rem',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#FCA5A5',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveWorkshop} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                  WORKSHOP TITLE *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flutter Multiplatform Architecture Bootcamp"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                  DESCRIPTION
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe workshop prerequisites, agenda, and target outcomes..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Category & Owning Committee */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                    CATEGORY / TRACK
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mobile Development, AI, Web"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                    OWNING COMMITTEE
                  </label>
                  {isPresident ? (
                    <select
                      value={formDeptId}
                      onChange={(e) => setFormDeptId(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        padding: '0.65rem 0.85rem',
                        color: '#FFFFFF',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id} style={{ background: '#181B20' }}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        padding: '0.65rem 0.85rem',
                        color: '#CBD5E1',
                        fontSize: '0.88rem',
                      }}
                    >
                      {departments.find((d) => d.id === formDeptId)?.name || 'Your Assigned Committee'}
                    </div>
                  )}
                </div>
              </div>

              {/* Workshop Cover Image (Google Drive Upload) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1' }}>
                    <ImageIcon size={15} color="#A855F7" />
                    <span>Workshop Cover Image (16:9 Recommended) • Google Drive</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowManualUrlInput(!showManualUrlInput)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    {showManualUrlInput ? 'Hide Manual URL' : 'Enter Direct Image URL'}
                  </button>
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={coverFileInputRef}
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleCoverUpload(e.target.files[0]);
                    }
                  }}
                  style={{ display: 'none' }}
                />

                {/* Uploading State */}
                {isUploadingCover && (
                  <div
                    style={{
                      height: '140px',
                      borderRadius: '12px',
                      border: '2px dashed #A855F7',
                      background: 'rgba(168, 85, 247, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      color: '#E9D5FF',
                    }}
                  >
                    <Loader2 size={32} className="animate-spin" color="#A855F7" />
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                      Uploading cover image to chapter Google Drive...
                    </span>
                  </div>
                )}

                {/* Preview State if image is set & not uploading */}
                {!isUploadingCover && formCoverUrl && (
                  <div
                    style={{
                      position: 'relative',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      height: '160px',
                      background: `url(${formCoverUrl}) center/cover no-repeat`,
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '0.6rem',
                        left: '0.6rem',
                        background: 'rgba(16, 185, 129, 0.85)',
                        backdropFilter: 'blur(4px)',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCircle2 size={13} />
                      <span>Stored in Google Drive</span>
                    </div>

                    <div
                      style={{
                        position: 'absolute',
                        bottom: '0.6rem',
                        right: '0.6rem',
                        display: 'flex',
                        gap: '0.5rem',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => coverFileInputRef.current?.click()}
                        style={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          color: '#0F172A',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <UploadCloud size={14} />
                        <span>Change Image</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormCoverUrl('')}
                        style={{
                          background: 'rgba(239, 68, 68, 0.9)',
                          border: 'none',
                          color: '#FFFFFF',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Trash2 size={14} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Dropzone if no image and not uploading */}
                {!isUploadingCover && !formCoverUrl && (
                  <div
                    onClick={() => coverFileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={handleCoverDrop}
                    style={{
                      height: '140px',
                      borderRadius: '12px',
                      border: '2px dashed rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      padding: '1rem',
                      textAlign: 'center',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#A855F7';
                      e.currentTarget.style.background = 'rgba(168, 85, 247, 0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'rgba(168, 85, 247, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#C084FC',
                      }}
                    >
                      <UploadCloud size={22} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#F1F5F9' }}>
                        Click to upload or drag & drop cover image here
                      </span>
                      <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>
                        Directly uploaded to chapter Google Drive (PNG, JPG, WebP • Max 10MB)
                      </p>
                    </div>
                  </div>
                )}

                {/* Optional Manual URL Input */}
                {showManualUrlInput && (
                  <div style={{ marginTop: '0.6rem' }}>
                    <input
                      type="url"
                      value={formCoverUrl}
                      onChange={(e) => setFormCoverUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/... or direct image URL"
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#FFFFFF',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Capacity & Registration Deadline */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                    MAX CAPACITY (OPTIONAL)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Leave empty for unlimited"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                    REGISTRATION DEADLINE (OPTIONAL)
                  </label>
                  <input
                    type="datetime-local"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Status & Registration Open Toggle */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                    PUBLICATION STATUS
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  >
                    <option value="draft" style={{ background: '#181B20' }}>Draft (Private)</option>
                    <option value="published" style={{ background: '#181B20' }}>Published (Live on Portal)</option>
                    <option value="completed" style={{ background: '#181B20' }}>Completed</option>
                    <option value="archived" style={{ background: '#181B20' }}>Archived</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                    REGISTRATION GATE
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.65rem 0.85rem',
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formRegOpen}
                      onChange={(e) => setFormRegOpen(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#10B981' }}
                    />
                    <span style={{ fontSize: '0.88rem', color: formRegOpen ? '#86EFAC' : '#FCA5A5', fontWeight: 600 }}>
                      {formRegOpen ? 'Allow New Registrations' : 'Registration Closed'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Instructor Assignment Selection */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', margin: 0 }}>
                    ASSIGN WORKSHOP INSTRUCTORS & MENTORS
                  </label>
                  {selectedInstructors.length > 0 && (
                    <span style={{ fontSize: '0.74rem', color: '#86EFAC', fontWeight: 700 }}>
                      {selectedInstructors.length} assigned
                    </span>
                  )}
                </div>

                {/* Live Search Input for Candidate Members */}
                <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                  <Search
                    size={14}
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted, #64748B)',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search candidate members by name or role..."
                    value={instructorSearchQuery}
                    onChange={(e) => setInstructorSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.48rem 2.2rem 0.48rem 2.1rem',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '0.82rem',
                      outline: 'none',
                    }}
                  />
                  {instructorSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setInstructorSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '0.65rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '2px',
                      }}
                      title="Clear search"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div
                  style={{
                    maxHeight: '180px',
                    overflowY: 'auto',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                  }}
                >
                  {filteredCandidateMembers.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: '#94A3B8', padding: '0.75rem', textAlign: 'center' }}>
                      No team members match &quot;{instructorSearchQuery}&quot;
                    </div>
                  ) : (
                    filteredCandidateMembers.map((member) => {
                      const assigned = selectedInstructors.find((si) => si.profile_id === member.id);
                      const isChecked = Boolean(assigned);

                      return (
                        <div
                          key={member.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '6px',
                            background: isChecked ? 'rgba(234, 67, 53, 0.12)' : 'transparent',
                            border: isChecked ? '1px solid rgba(234, 67, 53, 0.25)' : '1px solid transparent',
                          }}
                        >
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', flex: 1 }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedInstructors([...selectedInstructors, { profile_id: member.id, role: 'instructor' }]);
                                } else {
                                  setSelectedInstructors(selectedInstructors.filter((si) => si.profile_id !== member.id));
                                }
                              }}
                              style={{ width: '15px', height: '15px', accentColor: '#EF4444' }}
                            />
                            <span style={{ fontSize: '0.84rem', color: '#FFFFFF', fontWeight: 600 }}>{member.full_name}</span>
                            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>({member.role})</span>
                          </label>

                          {isChecked && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInstructors(
                                    selectedInstructors.map((si) =>
                                      si.profile_id === member.id ? { ...si, role: 'instructor' } : si
                                    )
                                  );
                                }}
                                style={{
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  background: assigned?.role === 'instructor' ? '#EF4444' : 'rgba(255, 255, 255, 0.08)',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                Instructor
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInstructors(
                                    selectedInstructors.map((si) =>
                                      si.profile_id === member.id ? { ...si, role: 'mentor' } : si
                                    )
                                  );
                                }}
                                style={{
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  background: assigned?.role === 'mentor' ? '#10B981' : 'rgba(255, 255, 255, 0.08)',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                Mentor
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#CBD5E1',
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary"
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.7 : 1,
                  }}
                >
                  {isSaving ? 'Saving...' : editingWorkshop ? 'Update Workshop' : 'Create Workshop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
