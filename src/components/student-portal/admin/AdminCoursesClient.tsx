'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  BookOpen,
  Plus,
  Search,
  Filter,
  Users,
  Calendar,
  Layers,
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
  QrCode,
  FileText,
  Award,
  HelpCircle,
  UploadCloud,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import {
  AdminCourseItem,
  CreateCourseInput,
  createAdminCourse,
  updateAdminCourse,
  deleteAdminCourse,
  uploadCourseCoverImageAction,
} from '@/app/student-portal/admin/courses/actions';
import { CourseStatus, EnrollmentType, CourseInstructorRole } from '@/types/student';

interface AdminCoursesClientProps {
  initialCourses: AdminCourseItem[];
  departments: Array<{ id: string; name: string; code: string; branch: string }>;
  teamMembers: Array<{ id: string; full_name: string; avatar_url: string | null; role: string; department_id: string | null }>;
  userRole: string;
  userDepartmentId: string | null;
  canCreate: boolean;
}

export function AdminCoursesClient({
  initialCourses,
  departments,
  teamMembers,
  userRole,
  userDepartmentId,
  canCreate,
}: AdminCoursesClientProps) {
  const [courses, setCourses] = useState<AdminCourseItem[]>(initialCourses);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CourseStatus>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<AdminCourseItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDeptId, setFormDeptId] = useState(userDepartmentId || (departments[0]?.id || ''));
  const [formCoverUrl, setFormCoverUrl] = useState('');
  const [formEnrollType, setFormEnrollType] = useState<EnrollmentType>('open');
  const [formCapacity, setFormCapacity] = useState<string>('');
  const [formSyllabus, setFormSyllabus] = useState('');
  const [formStatus, setFormStatus] = useState<CourseStatus>('draft');
  const [assignedInstructors, setAssignedInstructors] = useState<Array<{ profile_id: string; role: CourseInstructorRole }>>([]);
  const [instructorSearchQuery, setInstructorSearchQuery] = useState('');

  // Cover Image Drive Upload State
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [showManualUrlInput, setShowManualUrlInput] = useState(false);
  const coverFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleCoverUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح (PNG, JPG, WebP, GIF)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً، الحد الأقصى 10MB');
      return;
    }

    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadCourseCoverImageAction(formData);
      if (res.success && res.url) {
        setFormCoverUrl(res.url);
      } else {
        alert(res.error || 'فشل في رفع الصورة إلى Google Drive');
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء رفع الصورة');
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

  const isPresident = userRole === 'president' || userRole === 'co_president';

  const openCreateModal = () => {
    setEditingCourse(null);
    setFormTitle('');
    setFormDesc('');
    setFormCategory('');
    setFormDeptId(userDepartmentId || (departments[0]?.id || ''));
    setFormCoverUrl('');
    setFormEnrollType('open');
    setFormCapacity('');
    setFormSyllabus('');
    setFormStatus('draft');
    setAssignedInstructors([]);
    setInstructorSearchQuery('');
    setFormError(null);
    setIsUploadingCover(false);
    setShowManualUrlInput(false);
    setIsModalOpen(true);
  };

  const openEditModal = (course: AdminCourseItem) => {
    setEditingCourse(course);
    setFormTitle(course.title);
    setFormDesc(course.description || '');
    setFormCategory(course.category || '');
    setFormDeptId(course.department_id || (departments[0]?.id || ''));
    setFormCoverUrl(course.cover_image_url || '');
    setFormEnrollType(course.enrollment_type);
    setFormCapacity(course.capacity ? String(course.capacity) : '');
    setFormSyllabus(course.syllabus || '');
    setFormStatus(course.status);
    setAssignedInstructors(
      course.instructors_list.map((inst) => ({
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

  const handleToggleInstructor = (profileId: string) => {
    const exists = assignedInstructors.find((i) => i.profile_id === profileId);
    if (exists) {
      setAssignedInstructors(assignedInstructors.filter((i) => i.profile_id !== profileId));
    } else {
      setAssignedInstructors([...assignedInstructors, { profile_id: profileId, role: 'instructor' }]);
    }
  };

  const handleChangeInstructorRole = (profileId: string, role: CourseInstructorRole) => {
    setAssignedInstructors(
      assignedInstructors.map((i) => (i.profile_id === profileId ? { ...i, role } : i))
    );
  };

  const handleSubmitCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Course title is required.');
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);

      const payload: CreateCourseInput = {
        title: formTitle,
        description: formDesc,
        category: formCategory,
        department_id: formDeptId,
        cover_image_url: formCoverUrl,
        enrollment_type: formEnrollType,
        capacity: formCapacity ? parseInt(formCapacity, 10) : null,
        syllabus: formSyllabus,
        status: formStatus,
        instructors: assignedInstructors,
      };

      if (editingCourse) {
        const res = await updateAdminCourse({
          id: editingCourse.id,
          ...payload,
        });

        if (!res.success) {
          setFormError(res.error || 'Failed to update course.');
          return;
        }

        // Update local state
        setCourses(
          courses.map((c) => {
            if (c.id !== editingCourse.id) return c;
            const updatedInstructors = assignedInstructors.map((ai) => {
              const tm = teamMembers.find((m) => m.id === ai.profile_id);
              return {
                id: ai.profile_id,
                profile_id: ai.profile_id,
                role: ai.role,
                full_name: tm?.full_name || 'Instructor',
                avatar_url: tm?.avatar_url || null,
              };
            });

            const { instructors: _discard, ...courseFields } = payload;

            return {
              ...c,
              ...courseFields,
              instructors_list: updatedInstructors,
              department_name: departments.find((d) => d.id === formDeptId)?.name,
              department_code: departments.find((d) => d.id === formDeptId)?.code,
            };
          })
        );
      } else {
        const res = await createAdminCourse(payload);
        if (!res.success || !res.courseId) {
          setFormError(res.error || 'Failed to create course.');
          return;
        }

        const newCourseItem: AdminCourseItem = {
          id: res.courseId,
          title: payload.title,
          description: payload.description || null,
          cover_image_url: payload.cover_image_url || null,
          category: payload.category || null,
          department_id: payload.department_id || null,
          capacity: payload.capacity || null,
          enrollment_type: payload.enrollment_type,
          syllabus: payload.syllabus || null,
          status: payload.status,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          department_name: departments.find((d) => d.id === formDeptId)?.name,
          department_code: departments.find((d) => d.id === formDeptId)?.code,
          instructors_list: assignedInstructors.map((ai) => {
            const tm = teamMembers.find((m) => m.id === ai.profile_id);
            return {
              id: ai.profile_id,
              profile_id: ai.profile_id,
              role: ai.role,
              full_name: tm?.full_name || 'Instructor',
              avatar_url: tm?.avatar_url || null,
            };
          }),
          enrollment_count: 0,
          sessions_count: 0,
        };

        setCourses([newCourseItem, ...courses]);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCourse = async (courseId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await deleteAdminCourse(courseId);
      if (!res.success) {
        alert(res.error || 'Failed to delete course');
        return;
      }
      setCourses(courses.filter((c) => c.id !== courseId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filtered courses
  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.category && c.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.instructors_list.some((i) => i.full_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesDept = deptFilter === 'all' || c.department_id === deptFilter;

    return matchesSearch && matchesStatus && matchesDept;
  });

  const totalCourses = courses.length;
  const publishedCount = courses.filter((c) => c.status === 'published').length;
  const draftCount = courses.filter((c) => c.status === 'draft').length;
  const totalEnrollments = courses.reduce((acc, c) => acc + c.enrollment_count, 0);

  // Candidate instructors (filtered to owning committee if not leadership)
  const candidateMembers = isPresident
    ? teamMembers.filter((m) => !formDeptId || m.department_id === formDeptId || !m.department_id)
    : teamMembers.filter((m) => m.department_id === userDepartmentId);

  const searchedMembers = candidateMembers.filter((m) => {
    if (!instructorSearchQuery.trim()) return true;
    const q = instructorSearchQuery.toLowerCase();
    const nameMatch = m.full_name?.toLowerCase().includes(q);
    const roleMatch = m.role?.toLowerCase().includes(q);
    return Boolean(nameMatch || roleMatch);
  });

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
        }}
      >
        {/* Top Google 4-Color Strip */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.25), rgba(52, 168, 83, 0.25))',
              border: '1.5px solid rgba(66, 133, 244, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60A5FA',
              flexShrink: 0,
            }}
          >
            <GraduationCap size={28} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                Course & Curriculum Management
              </h1>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  background: 'rgba(66, 133, 244, 0.18)',
                  color: '#93C5FD',
                  border: '1px solid rgba(66, 133, 244, 0.35)',
                  textTransform: 'uppercase',
                }}
              >
                Committee LMS Panel
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary, #94A3B8)', fontSize: '0.88rem', margin: '0.3rem 0 0 0' }}>
              Assign instructors, organize session schedules, govern enrollment modes, and publish student tracks.
            </p>
          </div>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={openCreateModal}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.7rem 1.3rem',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            <Plus size={18} />
            <span>Create New Course</span>
          </button>
        )}
      </div>

      {/* KPI Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748B)', fontWeight: 600 }}>Total Courses</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.35rem' }}>
            {totalCourses}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748B)', fontWeight: 600 }}>Published Active</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#86EFAC', marginTop: '0.35rem' }}>
            {publishedCount}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748B)', fontWeight: 600 }}>Draft Courses</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FDE047', marginTop: '0.35rem' }}>
            {draftCount}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748B)', fontWeight: 600 }}>Total Enrollments</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#93C5FD', marginTop: '0.35rem' }}>
            {totalEnrollments} Students
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '0.45rem 0.75rem',
              width: '100%',
              maxWidth: '340px',
            }}
          >
            <Search size={16} color="var(--text-muted, #64748B)" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses or instructors..."
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.86rem',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {(['all', 'published', 'draft', 'archived'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: statusFilter === s ? '1px solid rgba(66, 133, 244, 0.4)' : '1px solid transparent',
                  background: statusFilter === s ? 'rgba(66, 133, 244, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: statusFilter === s ? '#60A5FA' : 'var(--text-secondary, #94A3B8)',
                  textTransform: 'capitalize',
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Committee Filter for Leadership */}
          {isPresident && departments.length > 0 && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#CBD5E1',
                fontSize: '0.8rem',
                padding: '0.4rem 0.75rem',
                outline: 'none',
              }}
            >
              <option value="all">All Committees</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Courses List */}
      {filteredCourses.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <BookOpen size={40} color="var(--text-muted, #64748B)" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>No Courses Found</h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.35rem' }}>
            {canCreate
              ? 'Click "Create New Course" above to initiate your first chapter technical track.'
              : 'You do not have any assigned courses currently.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {filteredCourses.map((course) => {
            const isOwner =
              isPresident ||
              (userRole.includes('head') && userDepartmentId === course.department_id);

            return (
              <div
                key={course.id}
                className="glass-panel"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {course.cover_image_url && (
                  <div
                    style={{
                      width: 'calc(100% + 3rem)',
                      margin: '-1.5rem -1.5rem 0.75rem -1.5rem',
                      height: '140px',
                      background: `url(${course.cover_image_url}) center/cover no-repeat`,
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
                  {/* Top Badges & Owner Actions Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {course.department_name && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: 'rgba(66, 133, 244, 0.12)',
                            color: '#93C5FD',
                            border: '1px solid rgba(66, 133, 244, 0.25)',
                          }}
                        >
                          {course.department_code || course.department_name}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          background:
                            course.status === 'published'
                              ? 'rgba(52, 168, 83, 0.15)'
                              : course.status === 'draft'
                              ? 'rgba(251, 188, 4, 0.15)'
                              : 'rgba(255, 255, 255, 0.08)',
                          color:
                            course.status === 'published'
                              ? '#86EFAC'
                              : course.status === 'draft'
                              ? '#FDE047'
                              : '#94A3B8',
                          textTransform: 'uppercase',
                        }}
                      >
                        {course.status}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          background: course.enrollment_type === 'gated' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: course.enrollment_type === 'gated' ? '#C084FC' : '#93C5FD',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        {course.enrollment_type === 'gated' ? <Lock size={11} /> : <Unlock size={11} />}
                        <span>{course.enrollment_type === 'gated' ? 'Gated' : 'Open'}</span>
                      </span>
                    </div>

                    {isOwner && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(course)}
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
                          title="Edit Course Details"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCourse(course.id, course.title)}
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
                          title="Delete Course"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Category */}
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.35rem 0', letterSpacing: '-0.01em' }}>
                    {course.title}
                  </h3>
                  {course.category && (
                    <div style={{ fontSize: '0.76rem', color: '#60A5FA', fontWeight: 600, marginBottom: '0.5rem' }}>
                      {course.category}
                    </div>
                  )}

                  {course.description && (
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
                      {course.description}
                    </p>
                  )}

                  {/* Metrics Bar */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.5rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      marginTop: '1rem',
                      textAlign: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748B)', fontWeight: 600 }}>SESSIONS</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.1rem' }}>
                        {course.sessions_count}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748B)', fontWeight: 600 }}>ENROLLED</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#93C5FD', marginTop: '0.1rem' }}>
                        {course.enrollment_count}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748B)', fontWeight: 600 }}>CAPACITY</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#CBD5E1', marginTop: '0.1rem' }}>
                        {course.capacity ? course.capacity : '∞'}
                      </div>
                    </div>
                  </div>

                  {/* Instructors Avatars Strip */}
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748B)', fontWeight: 600, marginBottom: '0.4rem' }}>
                      INSTRUCTORS & MENTORS
                    </div>
                    {course.instructors_list.length === 0 ? (
                      <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontStyle: 'italic' }}>
                        No instructors assigned yet
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {course.instructors_list.map((inst) => (
                          <div
                            key={inst.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '999px',
                              background: inst.role === 'instructor' ? 'rgba(66, 133, 244, 0.12)' : 'rgba(52, 168, 83, 0.12)',
                              border: inst.role === 'instructor' ? '1px solid rgba(66, 133, 244, 0.25)' : '1px solid rgba(52, 168, 83, 0.25)',
                              fontSize: '0.74rem',
                              color: '#FFFFFF',
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: inst.role === 'instructor' ? '#60A5FA' : '#34D399' }} />
                            <span>{inst.full_name}</span>
                            <span style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'capitalize' }}>
                              ({inst.role})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Controls */}
                <div
                  style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <Link
                    href={`/student-portal/admin/courses/${course.id}/lessons`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                      padding: '0.55rem 0.8rem',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.18) 0%, rgba(168, 85, 247, 0.18) 100%)',
                      border: '1px solid rgba(66, 133, 244, 0.4)',
                      color: '#FFFFFF',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      transition: 'all 0.15s ease',
                    }}
                    title="Manage Syllabus, Lessons, Video Lectures, Tasks & Quizzes"
                  >
                    <BookOpen size={14} style={{ color: '#93C5FD' }} />
                    <span>Lessons & Curriculum</span>
                  </Link>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.5rem',
                    }}
                  >
                    <Link
                      href={`/student-portal/admin/courses/${course.id}/tasks`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        padding: '0.55rem 0.6rem',
                        borderRadius: '8px',
                        background: 'rgba(245, 158, 11, 0.12)',
                        border: '1px solid rgba(245, 158, 11, 0.28)',
                        color: '#FDE047',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                      }}
                      title="Manage Tasks & Project Assignments"
                    >
                      <FileText size={13} />
                      <span>Tasks</span>
                    </Link>

                    <Link
                      href={`/student-portal/admin/courses/${course.id}/submissions`}
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
                      title="Evaluate & Grade Student Submissions"
                    >
                      <Award size={13} />
                      <span>Submissions</span>
                    </Link>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.5rem',
                    }}
                  >
                    <Link
                      href={`/student-portal/admin/courses/${course.id}/sessions`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        padding: '0.55rem 0.6rem',
                        borderRadius: '8px',
                        background: 'rgba(66, 133, 244, 0.12)',
                        border: '1px solid rgba(66, 133, 244, 0.28)',
                        color: '#93C5FD',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                      }}
                      title="Manage Course Sessions"
                    >
                      <Calendar size={13} />
                      <span>Sessions ({course.sessions_count})</span>
                    </Link>

                    <Link
                      href={`/student-portal/admin/courses/${course.id}/quizzes`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        padding: '0.55rem 0.6rem',
                        borderRadius: '8px',
                        background: 'rgba(168, 85, 247, 0.12)',
                        border: '1px solid rgba(168, 85, 247, 0.28)',
                        color: '#C084FC',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                      }}
                      title="Manage Quizzes & Question Banks"
                    >
                      <HelpCircle size={13} />
                      <span>Quizzes</span>
                    </Link>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.5rem',
                    }}
                  >
                    <Link
                      href={`/student-portal/admin/courses/${course.id}/enrollments`}
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
                      title="Manage Enrolled Students & Applications"
                    >
                      <GraduationCap size={13} />
                      <span>Enroll ({course.enrollment_count})</span>
                    </Link>

                  <Link
                    href={`/student-portal/admin/courses/${course.id}/instructors`}
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
                    href={`/student-portal/admin/attendance/scan?type=course&courseId=${course.id}`}
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
                    title="Scan Student QR Codes for Attendance"
                  >
                    <QrCode size={13} style={{ color: '#34A853' }} />
                    <span>Scan QR</span>
                  </Link>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE / EDIT COURSE MODAL */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(12px)',
            zIndex: 1000,
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
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#0F172A',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              position: 'relative',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  {editingCourse ? 'Edit Course Settings' : 'Create New Course Track'}
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted, #94A3B8)', margin: '0.2rem 0 0 0' }}>
                  Provide curriculum metadata and assign teaching committee officers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#FCA5A5',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1.25rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCourse} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                  Course Title <span style={{ color: '#F87171' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Modern Web Development with React & Next.js"
                  required
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.9rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Category & Owning Committee */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Curriculum Category
                  </label>
                  <input
                    type="text"
                    list="curriculum-categories-list"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Web Development, Mobile, AI/ML..."
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                  <datalist id="curriculum-categories-list">
                    <option value="Web & Full-Stack Development" />
                    <option value="Mobile App Development" />
                    <option value="AI & Machine Learning" />
                    <option value="Cloud Computing & DevOps" />
                    <option value="Cybersecurity & Defense" />
                    <option value="UI/UX & Product Design" />
                    <option value="Competitive Programming & Algorithms" />
                    <option value="Data Science & Analytics" />
                    <option value="Game Development" />
                  </datalist>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Owning Committee
                  </label>
                  <select
                    value={formDeptId}
                    onChange={(e) => setFormDeptId(e.target.value)}
                    disabled={!isPresident}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      borderRadius: '8px',
                      background: '#1E293B',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: '0.9rem',
                      outline: 'none',
                      opacity: !isPresident ? 0.7 : 1,
                    }}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Course Cover Image (Google Drive Upload) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1' }}>
                    <ImageIcon size={15} color="#38BDF8" />
                    <span>صورة غلاف الكورس (16:9 موصى بها) • Google Drive</span>
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
                    {showManualUrlInput ? 'إخفاء الرابط اليدوي' : 'إدخال رابط صورة يدوي'}
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
                      border: '2px dashed #3B82F6',
                      background: 'rgba(59, 130, 246, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      color: '#93C5FD',
                    }}
                  >
                    <Loader2 size={32} className="animate-spin" color="#3B82F6" />
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                      جارٍ رفع الصورة إلى Google Drive الشابتر...
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
                      <span>متصلة بـ Google Drive</span>
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
                        <span>تغيير الصورة</span>
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
                        <span>حذف</span>
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
                      e.currentTarget.style.borderColor = '#4285F4';
                      e.currentTarget.style.background = 'rgba(66, 133, 244, 0.06)';
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
                        background: 'rgba(66, 133, 244, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#4285F4',
                      }}
                    >
                      <UploadCloud size={22} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#F1F5F9' }}>
                        اضغط لرفع صورة الغلاف أو اسحبها هنا
                      </span>
                      <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>
                        يتم الرفع إلى Google Drive الخاص بالشابتر (PNG, JPG, WebP - أقصى حجم 10MB)
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
                      placeholder="https://images.unsplash.com/... أو أي رابط صورة مباشر"
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

              {/* Enrollment Mode, Capacity, and Status */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Enrollment Mode
                  </label>
                  <select
                    value={formEnrollType}
                    onChange={(e) => setFormEnrollType(e.target.value as EnrollmentType)}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      borderRadius: '8px',
                      background: '#1E293B',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  >
                    <option value="open">Open (Instant Confirmation)</option>
                    <option value="gated">Gated (Instructor Approval Required)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Capacity Limit (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    placeholder="Unlimited"
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Publication Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as CourseStatus)}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      borderRadius: '8px',
                      background: '#1E293B',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  >
                    <option value="draft">Draft (Private to Committee)</option>
                    <option value="published">Published (Visible to Students)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                  Course Description & Overview
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={3}
                  placeholder="Outline what students will learn, tools covered, and prerequisites..."
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.9rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Instructors Multi-Select */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1' }}>
                    Assign Committee Instructors & Mentors
                  </label>
                  <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                    {assignedInstructors.length} assigned
                  </span>
                </div>

                {/* Search Bar for Instructors */}
                <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                  <Search
                    size={14}
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94A3B8',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    type="text"
                    value={instructorSearchQuery}
                    onChange={(e) => setInstructorSearchQuery(e.target.value)}
                    placeholder="Search committee member by name or role..."
                    style={{
                      width: '100%',
                      padding: '0.45rem 2rem 0.45rem 2.2rem',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
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
                        right: '0.6rem',
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
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div
                  style={{
                    maxHeight: '170px',
                    overflowY: 'auto',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                  }}
                >
                  {searchedMembers.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: '#94A3B8', padding: '0.75rem', textAlign: 'center' }}>
                      {candidateMembers.length === 0
                        ? 'No active committee members found for this committee.'
                        : `No members match "${instructorSearchQuery}"`}
                    </div>
                  ) : (
                    searchedMembers.map((member) => {
                      const assigned = assignedInstructors.find((i) => i.profile_id === member.id);
                      return (
                        <div
                          key={member.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '6px',
                            background: assigned ? 'rgba(66, 133, 244, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                            border: assigned ? '1px solid rgba(66, 133, 244, 0.28)' : '1px solid transparent',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', flex: 1 }}>
                            <input
                              type="checkbox"
                              checked={!!assigned}
                              onChange={() => handleToggleInstructor(member.id)}
                              style={{ cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.85rem', color: '#FFFFFF', fontWeight: 600 }}>
                              {member.full_name}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                              ({member.role.replace('_', ' ')})
                            </span>
                          </label>

                          {assigned && (
                            <select
                              value={assigned.role}
                              onChange={(e) => handleChangeInstructorRole(member.id, e.target.value as CourseInstructorRole)}
                              style={{
                                background: '#1E293B',
                                border: '1px solid rgba(66, 133, 244, 0.35)',
                                color: '#60A5FA',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                outline: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="instructor">Instructor (Lectures & Tasks)</option>
                              <option value="mentor">Mentor (Reviews & Help)</option>
                            </select>
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
                    fontSize: '0.88rem',
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
                    padding: '0.65rem 1.4rem',
                    fontSize: '0.88rem',
                    cursor: isSaving ? 'wait' : 'pointer',
                  }}
                >
                  {isSaving ? 'Saving...' : editingCourse ? 'Update Course' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
