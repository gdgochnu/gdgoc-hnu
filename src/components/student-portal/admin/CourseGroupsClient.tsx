'use client';

import React, { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Search,
  BookOpen,
  ArrowLeft,
  Calendar,
  Sparkles,
  Phone,
  Mail,
  GraduationCap,
  Building2,
  QrCode,
  Check,
  X,
  UserX,
  ExternalLink,
  MessageCircle,
  Eye,
  ShieldCheck,
  ArrowUpRight,
  Filter,
  RotateCcw,
  Trash2,
  Download,
  FileSpreadsheet,
  Plus,
  Edit2,
  Copy,
  Layers,
  Zap,
  Share2,
  ChevronRight,
  UserCheck,
  Send,
  Loader2,
} from 'lucide-react';
import { CourseGroup } from '@/types/student';
import {
  CourseGroupsPageData,
  GroupStudentItem,
  createCourseGroupAction,
  updateCourseGroupAction,
  deleteCourseGroupAction,
  assignStudentToGroupAction,
  autoDistributeStudentsToGroupsAction,
  bulkAssignStudentsToGroupAction,
  sendTestGroupEmailAction,
  sendGroupConfirmationEmailsAction,
} from '@/app/student-portal/admin/courses/[id]/groups/actions';
import { renderCourseEnrollmentEmailHtml } from '@/lib/email/service';

interface CourseGroupsClientProps {
  initialData: CourseGroupsPageData;
}

export function CourseGroupsClient({ initialData }: CourseGroupsClientProps) {
  const [course, setCourse] = useState(initialData.course);
  const [groups, setGroups] = useState<CourseGroup[]>(initialData.groups);
  const [students, setStudents] = useState<GroupStudentItem[]>(initialData.students);
  const canManage = initialData.canManage;

  const [isPending, startTransition] = useTransition();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all'); // 'all' | 'unassigned' | groupId
  const [selectedJoinStatusFilter, setSelectedJoinStatusFilter] = useState<'all' | 'joined' | 'not_joined'>('all');
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState<string>('all');

  // Multi-select for bulk actions
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Modals
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CourseGroup | null>(null);
  const [showAutoDistributeModal, setShowAutoDistributeModal] = useState(false);

  // Group Email Modal state
  const [selectedGroupForEmail, setSelectedGroupForEmail] = useState<CourseGroup | null>(null);
  const [showGroupEmailModal, setShowGroupEmailModal] = useState(false);
  const [groupTestEmail, setGroupTestEmail] = useState('');
  const [isSendingGroupTest, setIsSendingGroupTest] = useState(false);
  const [isSendingGroupAll, setIsSendingGroupAll] = useState(false);
  const [groupEmailFeedback, setGroupEmailFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Group Email Preview HTML
  const groupEmailPreviewHtml = useMemo(() => {
    if (!selectedGroupForEmail) return '';
    return renderCourseEnrollmentEmailHtml({
      studentName: 'Ahmed Mohamed (Preview)',
      courseTitle: course.title,
      courseCategory: course.category,
      courseId: course.id,
      whatsappGroupLink: selectedGroupForEmail.invitation_link || null,
      whatsappGroupName: selectedGroupForEmail.name || 'Your Study Group',
    });
  }, [selectedGroupForEmail, course.title, course.category, course.id]);

  // Form states for Add/Edit Group
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupCapacityInput, setGroupCapacityInput] = useState('50');
  const [groupLinkInput, setGroupLinkInput] = useState('');
  const [groupNotesInput, setGroupNotesInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  // Form states for Auto-Distribute
  const [distributeCapacity, setDistributeCapacity] = useState('50');
  const [distributePrefix, setDistributePrefix] = useState('Group');
  const [distributeOnlyUnassigned, setDistributeOnlyUnassigned] = useState(false);
  const [distributeStrategy, setDistributeStrategy] = useState<'fifo' | 'alphabetical' | 'faculty'>('fifo');
  const [isDistributing, setIsDistributing] = useState(false);

  // Bulk target group
  const [bulkTargetGroupId, setBulkTargetGroupId] = useState<string>('');
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);

  // Stats calculation
  const totalConfirmed = students.length;
  const assignedStudents = students.filter((s) => s.group_id);
  const unassignedStudents = students.filter((s) => !s.group_id);
  const joinedStudents = students.filter((s) => s.joined_group_at);
  const joinRatePercent = assignedStudents.length > 0
    ? Math.round((joinedStudents.length / assignedStudents.length) * 100)
    : 0;

  // Distinct faculties
  const faculties = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.faculty?.trim()) set.add(s.faculty.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (s.full_name_en && s.full_name_en.toLowerCase().includes(q)) ||
        (s.full_name_ar && s.full_name_ar.includes(q)) ||
        s.email.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.faculty && s.faculty.toLowerCase().includes(q)) ||
        (s.group_name && s.group_name.toLowerCase().includes(q));

      let matchesGroup = true;
      if (selectedGroupFilter === 'unassigned') {
        matchesGroup = !s.group_id;
      } else if (selectedGroupFilter !== 'all') {
        matchesGroup = s.group_id === selectedGroupFilter;
      }

      let matchesJoinStatus = true;
      if (selectedJoinStatusFilter === 'joined') {
        matchesJoinStatus = Boolean(s.joined_group_at);
      } else if (selectedJoinStatusFilter === 'not_joined') {
        matchesJoinStatus = !s.joined_group_at && Boolean(s.group_id);
      }

      let matchesFaculty = true;
      if (selectedFacultyFilter !== 'all') {
        matchesFaculty = s.faculty === selectedFacultyFilter;
      }

      return matchesSearch && matchesGroup && matchesJoinStatus && matchesFaculty;
    });
  }, [students, searchQuery, selectedGroupFilter, selectedJoinStatusFilter, selectedFacultyFilter]);

  // Select all helper
  const isAllSelected = filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.enrollment_id));
    }
  };

  const handleToggleSelectStudent = (enrollmentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(enrollmentId) ? prev.filter((id) => id !== enrollmentId) : [...prev, enrollmentId]
    );
  };

  // Group Email Handlers
  const handleOpenGroupEmailModal = (g: CourseGroup) => {
    setSelectedGroupForEmail(g);
    setGroupEmailFeedback(null);
    setShowGroupEmailModal(true);
  };

  const handleSendGroupTestEmail = async () => {
    if (!selectedGroupForEmail || !groupTestEmail.trim()) {
      setGroupEmailFeedback({ type: 'error', text: 'يرجى إدخال بريد إلكتروني صالح للتجربة.' });
      return;
    }
    try {
      setIsSendingGroupTest(true);
      setGroupEmailFeedback(null);
      const res = await sendTestGroupEmailAction({
        courseId: course.id,
        groupId: selectedGroupForEmail.id,
        testEmail: groupTestEmail.trim(),
      });
      if (!res.success) {
        setGroupEmailFeedback({ type: 'error', text: res.error || 'فشل إرسال الإيميل التجريبي.' });
      } else {
        setGroupEmailFeedback({ type: 'success', text: `✅ تم إرسال الإيميل التجريبي بنجاح إلى ${groupTestEmail}` });
      }
    } catch (err: any) {
      setGroupEmailFeedback({ type: 'error', text: err.message || 'حدث خطأ غير متوقع.' });
    } finally {
      setIsSendingGroupTest(false);
    }
  };

  const handleSendGroupAllConfirmation = async () => {
    if (!selectedGroupForEmail) return;
    const assignedCount = selectedGroupForEmail.assigned_count || 0;
    if (assignedCount === 0) {
      setGroupEmailFeedback({ type: 'error', text: 'لا يوجد طلاب مسجلون في هذه المجموعة لإرسال الإيميلات لهم.' });
      return;
    }
    if (
      !confirm(
        `هل أنت متأكد من إرسال إيميل التأكيد ورابط الواتساب لجميع طلاب ${selectedGroupForEmail.name} (${assignedCount} طالب)؟`
      )
    ) {
      return;
    }

    try {
      setIsSendingGroupAll(true);
      setGroupEmailFeedback(null);
      const res = await sendGroupConfirmationEmailsAction({
        courseId: course.id,
        groupId: selectedGroupForEmail.id,
      });

      if (!res.success) {
        setGroupEmailFeedback({ type: 'error', text: res.error || 'فشل إرسال الإيميلات للمجموعة.' });
      } else {
        setGroupEmailFeedback({
          type: 'success',
          text: `✅ تم إرسال الإيميلات بنجاح! تم تسليم ${res.sentCount} إيميل${res.failedCount ? `، وفشل ${res.failedCount}` : ''}.`,
        });
      }
    } catch (err: any) {
      setGroupEmailFeedback({ type: 'error', text: err.message || 'حدث خطأ غير متوقع أثناء الإرسال.' });
    } finally {
      setIsSendingGroupAll(false);
    }
  };

  // Open Add Group Modal
  const handleOpenAddGroup = () => {
    setEditingGroup(null);
    setGroupNameInput(`Group ${groups.length + 1}`);
    setGroupCapacityInput('50');
    setGroupLinkInput('');
    setGroupNotesInput('');
    setFormError(null);
    setShowAddGroupModal(true);
  };

  // Open Edit Group Modal
  const handleOpenEditGroup = (g: CourseGroup) => {
    setEditingGroup(g);
    setGroupNameInput(g.name);
    setGroupCapacityInput(String(g.max_capacity || 50));
    setGroupLinkInput(g.invitation_link || '');
    setGroupNotesInput(g.notes || '');
    setFormError(null);
    setShowAddGroupModal(true);
  };

  // Save Add/Edit Group
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupNameInput.trim()) {
      setFormError('Group name is required.');
      return;
    }

    try {
      setIsSavingGroup(true);
      setFormError(null);

      const cap = parseInt(groupCapacityInput, 10) || 50;

      if (editingGroup) {
        const res = await updateCourseGroupAction({
          groupId: editingGroup.id,
          courseId: course.id,
          name: groupNameInput.trim(),
          max_capacity: cap,
          invitation_link: groupLinkInput.trim() || null,
          notes: groupNotesInput.trim() || null,
        });

        if (!res.success) {
          setFormError(res.error || 'Failed to update group.');
          return;
        }

        setGroups((prev) =>
          prev.map((g) =>
            g.id === editingGroup.id
              ? {
                  ...g,
                  name: groupNameInput.trim(),
                  max_capacity: cap,
                  invitation_link: groupLinkInput.trim() || null,
                  notes: groupNotesInput.trim() || null,
                }
              : g
          )
        );

        setStudents((prev) =>
          prev.map((s) =>
            s.group_id === editingGroup.id ? { ...s, group_name: groupNameInput.trim() } : s
          )
        );

        setFeedback({ type: 'success', text: `Group "${groupNameInput}" updated successfully.` });
      } else {
        const res = await createCourseGroupAction({
          courseId: course.id,
          name: groupNameInput.trim(),
          max_capacity: cap,
          invitation_link: groupLinkInput.trim() || null,
          notes: groupNotesInput.trim() || null,
        });

        if (!res.success || !res.group) {
          setFormError(res.error || 'Failed to create group.');
          return;
        }

        setGroups((prev) => [...prev, res.group!]);
        setFeedback({ type: 'success', text: `Group "${res.group.name}" created successfully.` });
      }

      setShowAddGroupModal(false);
    } catch (err: any) {
      setFormError(err.message || 'An error occurred.');
    } finally {
      setIsSavingGroup(false);
    }
  };

  // Delete Group
  const handleDeleteGroup = async (g: CourseGroup) => {
    if (!confirm(`Are you sure you want to delete "${g.name}"? All assigned students will become unassigned.`)) {
      return;
    }

    try {
      const res = await deleteCourseGroupAction({ groupId: g.id, courseId: course.id });
      if (!res.success) {
        alert(res.error || 'Failed to delete group.');
        return;
      }

      setGroups((prev) => prev.filter((item) => item.id !== g.id));
      setStudents((prev) =>
        prev.map((s) => (s.group_id === g.id ? { ...s, group_id: null, group_name: null, joined_group_at: null } : s))
      );

      setFeedback({ type: 'success', text: `Group "${g.name}" deleted.` });
    } catch (err: any) {
      alert(err.message || 'An error occurred.');
    }
  };

  // Copy Group Link
  const handleCopyLink = (g: CourseGroup) => {
    if (!g.invitation_link) return;
    navigator.clipboard.writeText(g.invitation_link);
    setCopiedGroupId(g.id);
    setTimeout(() => setCopiedGroupId(null), 2000);
  };

  // Inline Assign Student to Group
  const handleAssignStudent = async (enrollmentId: string, newGroupId: string) => {
    const targetGroupId = newGroupId === 'unassigned' ? null : newGroupId;
    const targetGroup = groups.find((g) => g.id === targetGroupId);

    try {
      const res = await assignStudentToGroupAction({
        enrollmentId,
        groupId: targetGroupId,
        courseId: course.id,
      });

      if (!res.success) {
        alert(res.error || 'Failed to assign group.');
        return;
      }

      // Update student local state
      setStudents((prev) =>
        prev.map((s) => {
          if (s.enrollment_id !== enrollmentId) return s;
          return {
            ...s,
            group_id: targetGroupId,
            group_name: targetGroup ? targetGroup.name : null,
            group_assigned_at: targetGroupId ? new Date().toISOString() : null,
            joined_group_at: null,
          };
        })
      );

      // Re-calculate group counts
      setGroups((prev) =>
        prev.map((g) => {
          const count = students.filter((s) =>
            s.enrollment_id === enrollmentId ? targetGroupId === g.id : s.group_id === g.id
          ).length;
          return { ...g, assigned_count: count };
        })
      );
    } catch (err: any) {
      alert(err.message || 'An error occurred.');
    }
  };

  // Execute Auto-Distribute
  const handleExecuteAutoDistribute = async () => {
    try {
      setIsDistributing(true);
      const cap = parseInt(distributeCapacity, 10) || 50;

      const res = await autoDistributeStudentsToGroupsAction({
        courseId: course.id,
        groupCapacity: cap,
        groupPrefix: distributePrefix,
        onlyUnassigned: distributeOnlyUnassigned,
        strategy: distributeStrategy,
      });

      if (!res.success) {
        alert(res.error || 'Auto-distribution failed.');
        return;
      }

      setFeedback({
        type: 'success',
        text: `Successfully distributed ${res.totalAssigned} students across groups! (${res.groupsCreated || 0} new groups created)`,
      });

      setShowAutoDistributeModal(false);

      // Refresh data
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'An unexpected error occurred.');
    } finally {
      setIsDistributing(false);
    }
  };

  // Bulk Assign
  const handleExecuteBulkAssign = async () => {
    if (selectedStudentIds.length === 0) return;
    const targetGroupId = bulkTargetGroupId === 'unassigned' ? null : bulkTargetGroupId;
    const targetGroup = groups.find((g) => g.id === targetGroupId);

    try {
      setIsBulkAssigning(true);
      const res = await bulkAssignStudentsToGroupAction({
        courseId: course.id,
        enrollmentIds: selectedStudentIds,
        groupId: targetGroupId,
      });

      if (!res.success) {
        alert(res.error || 'Bulk assignment failed.');
        return;
      }

      setStudents((prev) =>
        prev.map((s) => {
          if (!selectedStudentIds.includes(s.enrollment_id)) return s;
          return {
            ...s,
            group_id: targetGroupId,
            group_name: targetGroup ? targetGroup.name : null,
            group_assigned_at: targetGroupId ? new Date().toISOString() : null,
            joined_group_at: null,
          };
        })
      );

      setFeedback({
        type: 'success',
        text: `Assigned ${selectedStudentIds.length} students to ${targetGroup ? targetGroup.name : 'Unassigned pool'}.`,
      });

      setSelectedStudentIds([]);
    } catch (err: any) {
      alert(err.message || 'An error occurred.');
    } finally {
      setIsBulkAssigning(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (students.length === 0) {
      alert('No students to export.');
      return;
    }

    const headers = [
      'Full Name (EN)',
      'Full Name (AR)',
      'Email',
      'Phone / WhatsApp',
      'Faculty',
      'Department / Major',
      'Academic Year',
      'Assigned Group',
      'Group Invite Link',
      'Joined Group Status',
      'Joined At Date',
      'Course Enrolled At',
    ];

    const rows = students.map((s) => {
      const grp = groups.find((g) => g.id === s.group_id);
      return [
        `"${(s.full_name_en || '').replace(/"/g, '""')}"`,
        `"${(s.full_name_ar || '').replace(/"/g, '""')}"`,
        `"${(s.email || '').replace(/"/g, '""')}"`,
        `"${(s.whatsapp_number || s.phone || '').replace(/"/g, '""')}"`,
        `"${(s.faculty || '').replace(/"/g, '""')}"`,
        `"${(s.department_major || '').replace(/"/g, '""')}"`,
        s.academic_year ? `Year ${s.academic_year}` : '',
        `"${(s.group_name || 'Unassigned').replace(/"/g, '""')}"`,
        `"${(grp?.invitation_link || '').replace(/"/g, '""')}"`,
        s.joined_group_at ? 'Joined' : s.group_id ? 'Pending Join' : 'No Group Assigned',
        s.joined_group_at ? new Date(s.joined_group_at).toISOString() : '',
        new Date(s.enrolled_at).toISOString(),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${course.title.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_')}_Groups_Roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // WhatsApp Nudge Link generator
  const getWhatsAppNudgeUrl = (s: GroupStudentItem) => {
    const rawPhone = (s.whatsapp_number || s.phone || '').replace(/\D/g, '');
    if (!rawPhone) return '#';
    let phoneFormatted = rawPhone;
    if (phoneFormatted.startsWith('01')) {
      phoneFormatted = '2' + phoneFormatted;
    } else if (phoneFormatted.startsWith('1')) {
      phoneFormatted = '20' + phoneFormatted;
    }

    const grp = groups.find((g) => g.id === s.group_id);
    const link = grp?.invitation_link || '';
    const studentName = s.full_name_ar || s.full_name_en || 'يا بطل';

    const msg = `مرحباً ${studentName}! 🎉
تم قبولك في كورس "${course.title}" مع GDGoC Helwan National University.
تم تعيينك في: ${s.group_name || 'مجموعتك الدراسية'}.

تفضل بالانضمام لرابط الجروب الخاص بمجموعتك للمتابعة مع المدربين والزملاء:
${link}

نتمنى لك رحلة تعليمية موفقة! 🚀`;

    return `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div style={{ padding: '2rem 1.5rem 5rem', maxWidth: '1440px', margin: '0 auto', color: '#F8FAFC' }}>
      {/* Top Header & Breadcrumbs */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#94A3B8', marginBottom: '0.75rem' }}>
          <Link href="/student-portal/admin/courses" style={{ color: '#94A3B8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <BookOpen size={14} /> Courses
          </Link>
          <ChevronRight size={14} />
          <Link href={`/student-portal/admin/courses/${course.id}/enrollments`} style={{ color: '#94A3B8', textDecoration: 'none' }}>
            {course.title} (Enrollments)
          </Link>
          <ChevronRight size={14} />
          <span style={{ color: '#60A5FA', fontWeight: 700 }}>Study Groups & Sections</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.5px' }}>
                Course Groups & Study Sections
              </h1>
              <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', background: 'rgba(66, 133, 244, 0.15)', border: '1px solid rgba(66, 133, 244, 0.3)', color: '#60A5FA', fontSize: '0.8rem', fontWeight: 700 }}>
                {course.title}
              </span>
            </div>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginTop: '0.4rem', margin: '0.4rem 0 0' }}>
              Manage study cohorts, assign 50-student WhatsApp/Discord groups, distribute students, and track link clicks.
            </p>
          </div>

          {/* Top Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              href={`/student-portal/admin/courses/${course.id}/enrollments`}
              style={{
                padding: '0.65rem 1.1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#CBD5E1',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <ArrowLeft size={15} /> Back to Roster
            </Link>

            <button
              type="button"
              onClick={handleExportCsv}
              style={{
                padding: '0.65rem 1.1rem',
                borderRadius: '10px',
                background: 'rgba(52, 168, 83, 0.15)',
                border: '1px solid rgba(52, 168, 83, 0.35)',
                color: '#34D399',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <Download size={15} /> Export Groups CSV
            </button>

            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => setShowAutoDistributeModal(true)}
                  style={{
                    padding: '0.65rem 1.2rem',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 4px 14px rgba(168, 85, 247, 0.35)',
                  }}
                >
                  <Zap size={15} /> Auto-Distribute ({distributeCapacity}/group)
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddGroup}
                  style={{
                    padding: '0.65rem 1.2rem',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 4px 14px rgba(66, 133, 244, 0.35)',
                  }}
                >
                  <Plus size={15} /> Add Group
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: '0.9rem 1.25rem',
            borderRadius: '12px',
            background: feedback.type === 'success' ? 'rgba(52, 168, 83, 0.15)' : 'rgba(234, 67, 53, 0.15)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(52, 168, 83, 0.35)' : 'rgba(234, 67, 53, 0.35)'}`,
            color: feedback.type === 'success' ? '#34D399' : '#F87171',
            fontSize: '0.88rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {feedback.type === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* High-Level Overview Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>Confirmed Students</span>
            <Users size={16} color="#60A5FA" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.4rem' }}>
            {totalConfirmed}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.2rem' }}>
            Active approved enrollments
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>Total Groups Created</span>
            <Layers size={16} color="#A855F7" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#A855F7', marginTop: '0.4rem' }}>
            {groups.length}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.2rem' }}>
            Study sections available
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>Assigned to Groups</span>
            <UserCheck size={16} color="#34D399" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34D399', marginTop: '0.4rem' }}>
            {assignedStudents.length} <span style={{ fontSize: '0.9rem', color: '#94A3B8', fontWeight: 500 }}>/ {totalConfirmed}</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: unassignedStudents.length > 0 ? '#FBBF24' : '#34D399', marginTop: '0.2rem' }}>
            {unassignedStudents.length > 0 ? `${unassignedStudents.length} unassigned students` : 'All students assigned ✓'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>Group Join Click Rate</span>
            <Sparkles size={16} color="#FBBF24" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FBBF24', marginTop: '0.4rem' }}>
            {joinRatePercent}%
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.2rem' }}>
            {joinedStudents.length} of {assignedStudents.length} clicked invite link
          </div>
        </div>
      </div>

      {/* Groups Section Cards */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} color="#60A5FA" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              Course Groups ({groups.length})
            </h2>
          </div>
          {groups.length === 0 && canManage && (
            <button
              type="button"
              onClick={() => setShowAutoDistributeModal(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#60A5FA',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Zap size={14} /> Auto-create & split students into groups of 50
            </button>
          )}
        </div>

        {groups.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              padding: '2.5rem 1.5rem',
              borderRadius: '16px',
              textAlign: 'center',
              background: 'rgba(15, 23, 42, 0.45)',
              border: '1px dashed rgba(255, 255, 255, 0.12)',
            }}
          >
            <Layers size={36} style={{ color: '#64748B', margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.35rem' }}>
              No Study Groups Created Yet
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '0.86rem', maxWidth: '480px', margin: '0 auto 1.25rem' }}>
              Create study groups (e.g. 50 students each) and add WhatsApp/Discord links so students can join their cohort.
            </p>
            {canManage && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setShowAutoDistributeModal(true)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  <Zap size={15} /> ⚡ Smart Auto-Distribute by 50
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddGroup}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '10px',
                    background: 'rgba(66, 133, 244, 0.2)',
                    border: '1px solid rgba(66, 133, 244, 0.4)',
                    color: '#60A5FA',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  <Plus size={15} /> Create First Group
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
              gap: '1rem',
            }}
          >
            {groups.map((g) => {
              const assigned = g.assigned_count || 0;
              const joined = g.joined_count || 0;
              const cap = g.max_capacity || 50;
              const percentFull = Math.min(Math.round((assigned / cap) * 100), 100);
              const isCopied = copiedGroupId === g.id;

              return (
                <div
                  key={g.id}
                  className="glass-panel"
                  style={{
                    padding: '1.25rem',
                    borderRadius: '16px',
                    background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
                    border: selectedGroupFilter === g.id ? '1px solid #60A5FA' : '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Top Row: Group Title & Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: 'rgba(66, 133, 244, 0.18)',
                          border: '1px solid rgba(66, 133, 244, 0.35)',
                          color: '#60A5FA',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {g.group_number || '#'}
                      </span>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                        {g.name}
                      </h3>
                    </div>

                    {canManage && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditGroup(g)}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#CBD5E1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                          title="Edit Group"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(g)}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: 'rgba(234, 67, 53, 0.1)',
                            border: '1px solid rgba(234, 67, 53, 0.25)',
                            color: '#F87171',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                          title="Delete Group"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Capacity Progress Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94A3B8', marginBottom: '0.35rem' }}>
                      <span>Enrolled Roster:</span>
                      <span style={{ color: assigned >= cap ? '#F87171' : '#FFFFFF', fontWeight: 700 }}>
                        {assigned} / {cap} Students ({percentFull}%)
                      </span>
                    </div>
                    <div style={{ height: '6px', width: '100%', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${percentFull}%`,
                          borderRadius: '4px',
                          background: percentFull >= 100 ? '#EF4444' : percentFull >= 80 ? '#FBBF24' : '#34A853',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Join Link Tracking Status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', fontSize: '0.78rem' }}>
                    <span style={{ color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCircle2 size={13} color="#34D399" />
                      <span>Joined Link:</span>
                    </span>
                    <span style={{ fontWeight: 700, color: joined > 0 ? '#34D399' : '#94A3B8' }}>
                      {joined} of {assigned} ({assigned > 0 ? Math.round((joined / assigned) * 100) : 0}%)
                    </span>
                  </div>

                  {/* Invitation Link Box */}
                  {g.invitation_link ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <a
                        href={g.invitation_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1,
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          background: 'rgba(37, 211, 102, 0.12)',
                          border: '1px solid rgba(37, 211, 102, 0.3)',
                          color: '#25D366',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <MessageCircle size={14} /> Open WhatsApp/Link
                      </a>

                      <button
                        type="button"
                        onClick={() => handleCopyLink(g)}
                        style={{
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          background: isCopied ? 'rgba(52, 168, 83, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                          border: `1px solid ${isCopied ? 'rgba(52, 168, 83, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                          color: isCopied ? '#34D399' : '#CBD5E1',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                        title="Copy Invite Link"
                      >
                        {isCopied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: '#F87171', padding: '0.45rem 0.65rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px dashed rgba(239, 68, 68, 0.25)' }}>
                      <span>⚠️ No invite link added</span>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditGroup(g)}
                          style={{ background: 'transparent', border: 'none', color: '#60A5FA', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                        >
                          + Add Link
                        </button>
                      )}
                    </div>
                  )}

                  {/* Send Group Confirmation Email Button */}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleOpenGroupEmailModal(g)}
                      style={{
                        padding: '0.55rem 0.85rem',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, rgba(234, 67, 53, 0.18) 0%, rgba(251, 188, 4, 0.15) 100%)',
                        border: '1px solid rgba(234, 67, 53, 0.38)',
                        color: '#FCA5A5',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        transition: 'all 0.15s ease',
                      }}
                      title={`معاينة وإرسال إيميل التأكيد لطلاب ${g.name}`}
                    >
                      <Send size={13} />
                      <span>إرسال إيميل تأكيد للجروب ({assigned} طالب)</span>
                    </button>
                  )}

                  {/* Filter by this group shortcut button */}
                  <button
                    type="button"
                    onClick={() => setSelectedGroupFilter(selectedGroupFilter === g.id ? 'all' : g.id)}
                    style={{
                      marginTop: '0.2rem',
                      padding: '0.45rem',
                      borderRadius: '8px',
                      background: selectedGroupFilter === g.id ? 'rgba(96, 165, 250, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${selectedGroupFilter === g.id ? 'rgba(96, 165, 250, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
                      color: selectedGroupFilter === g.id ? '#60A5FA' : '#94A3B8',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {selectedGroupFilter === g.id ? 'Showing Table Roster (Clear Filter)' : `View ${assigned} Members in Table ↓`}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Roster & Tracking Section Header with Filter Toolbar */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '16px',
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          marginBottom: '2rem',
        }}
      >
        {/* Table Toolbar */}
        <div
          style={{
            padding: '1.25rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Users size={18} color="#34D399" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Student Assignment & Link Tracking ({filteredStudents.length})
              </h2>
            </div>

            {/* Clear all filters shortcut if active */}
            {(searchQuery || selectedGroupFilter !== 'all' || selectedJoinStatusFilter !== 'all' || selectedFacultyFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGroupFilter('all');
                  setSelectedJoinStatusFilter('all');
                  setSelectedFacultyFilter('all');
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#EF4444',
                  borderRadius: '6px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <X size={13} /> Reset Filters
              </button>
            )}
          </div>

          {/* Controls row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student by name, email, phone, faculty..."
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem 0.6rem 2.4rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#FFFFFF',
                  fontSize: '0.84rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Filter by Group */}
            <select
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              style={{
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                background: '#0F172A',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#CBD5E1',
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Groups ({totalConfirmed})</option>
              <option value="unassigned">⚠️ Unassigned Pool ({unassignedStudents.length})</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.assigned_count || 0}/{g.max_capacity})
                </option>
              ))}
            </select>

            {/* Filter by Join Status */}
            <select
              value={selectedJoinStatusFilter}
              onChange={(e) => setSelectedJoinStatusFilter(e.target.value as any)}
              style={{
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                background: '#0F172A',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#CBD5E1',
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Join Statuses</option>
              <option value="joined">🟢 Clicked & Joined ({joinedStudents.length})</option>
              <option value="not_joined">🟡 Not Joined Yet ({assignedStudents.length - joinedStudents.length})</option>
            </select>

            {/* Filter by Faculty */}
            {faculties.length > 0 && (
              <select
                value={selectedFacultyFilter}
                onChange={(e) => setSelectedFacultyFilter(e.target.value)}
                style={{
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  background: '#0F172A',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#CBD5E1',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  maxWidth: '200px',
                }}
              >
                <option value="all">All Faculties</option>
                {faculties.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Bulk Actions Floating Bar */}
          {selectedStudentIds.length > 0 && canManage && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'linear-gradient(90deg, rgba(66, 133, 244, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
                border: '1px solid rgba(66, 133, 244, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#FFFFFF', fontWeight: 700 }}>
                <CheckCircle2 size={16} color="#60A5FA" />
                <span>{selectedStudentIds.length} students selected</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: '#CBD5E1' }}>Move to:</span>
                <select
                  value={bulkTargetGroupId}
                  onChange={(e) => setBulkTargetGroupId(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    background: '#0F172A',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">-- Choose Target Group --</option>
                  <option value="unassigned">⚠️ Unassign from Group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.assigned_count || 0}/{g.max_capacity})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={!bulkTargetGroupId || isBulkAssigning}
                  onClick={handleExecuteBulkAssign}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '8px',
                    background: '#4285F4',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: !bulkTargetGroupId || isBulkAssigning ? 'not-allowed' : 'pointer',
                    opacity: !bulkTargetGroupId || isBulkAssigning ? 0.6 : 1,
                  }}
                >
                  {isBulkAssigning ? 'Applying...' : 'Apply Group'}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStudentIds([])}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#CBD5E1',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table View */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94A3B8' }}>
                {canManage && (
                  <th style={{ padding: '0.85rem 1rem', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#4285F4' }}
                    />
                  </th>
                )}
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Student</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Faculty / Academic Year</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Assigned Study Group</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Group Link Status</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'right' }}>Actions & Nudge</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94A3B8' }}>
                    No students match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const isSelected = selectedStudentIds.includes(s.enrollment_id);
                  const isJoined = Boolean(s.joined_group_at);
                  const isAssigned = Boolean(s.group_id);
                  const grp = groups.find((g) => g.id === s.group_id);

                  return (
                    <tr
                      key={s.enrollment_id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: isSelected ? 'rgba(66, 133, 244, 0.08)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {canManage && (
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectStudent(s.enrollment_id)}
                            style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#4285F4' }}
                          />
                        </td>
                      )}

                      {/* Student Info */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              color: '#FFFFFF',
                              flexShrink: 0,
                            }}
                          >
                            {(s.full_name_en || s.full_name_ar || 'S').slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#FFFFFF' }}>
                              {s.full_name_en || s.full_name_ar || 'Student Name'}
                            </div>
                            {s.full_name_ar && s.full_name_en && (
                              <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>{s.full_name_ar}</div>
                            )}
                            <div style={{ fontSize: '0.74rem', color: '#64748B' }}>{s.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Faculty Info */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ color: '#CBD5E1', fontWeight: 600 }}>{s.faculty || '—'}</div>
                        <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                          {s.academic_year ? `Year ${s.academic_year}` : ''}
                          {s.department_major ? ` • ${s.department_major}` : ''}
                        </div>
                      </td>

                      {/* Assigned Group Dropdown / Badge */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {canManage ? (
                          <select
                            value={s.group_id || 'unassigned'}
                            onChange={(e) => handleAssignStudent(s.enrollment_id, e.target.value)}
                            style={{
                              padding: '0.4rem 0.65rem',
                              borderRadius: '8px',
                              background: isAssigned ? 'rgba(66, 133, 244, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                              border: `1px solid ${isAssigned ? 'rgba(66, 133, 244, 0.4)' : 'rgba(239, 68, 68, 0.3)'}`,
                              color: isAssigned ? '#93C5FD' : '#F87171',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              outline: 'none',
                              maxWidth: '180px',
                            }}
                          >
                            <option value="unassigned" style={{ background: '#0F172A', color: '#F87171' }}>
                              ⚠️ Unassigned
                            </option>
                            {groups.map((g) => (
                              <option key={g.id} value={g.id} style={{ background: '#0F172A', color: '#FFF' }}>
                                {g.name} ({g.assigned_count || 0}/{g.max_capacity})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            style={{
                              padding: '0.3rem 0.65rem',
                              borderRadius: '6px',
                              background: isAssigned ? 'rgba(66, 133, 244, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                              border: `1px solid ${isAssigned ? 'rgba(66, 133, 244, 0.35)' : 'rgba(239, 68, 68, 0.3)'}`,
                              color: isAssigned ? '#93C5FD' : '#F87171',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                            }}
                          >
                            {s.group_name || 'Unassigned'}
                          </span>
                        )}
                      </td>

                      {/* Group Link Join Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {isJoined ? (
                          <div>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '6px',
                                background: 'rgba(52, 168, 83, 0.18)',
                                border: '1px solid rgba(52, 168, 83, 0.4)',
                                color: '#34D399',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                              }}
                            >
                              <Check size={12} /> Joined Group ✓
                            </span>
                            <div
                              suppressHydrationWarning
                              style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.2rem' }}
                            >
                              {new Date(s.joined_group_at!).toLocaleDateString('en-US', {
                                timeZone: 'Africa/Cairo',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        ) : isAssigned ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '6px',
                              background: 'rgba(251, 188, 4, 0.12)',
                              border: '1px solid rgba(251, 188, 4, 0.3)',
                              color: '#FBBF24',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                            }}
                          >
                            <Clock3 size={12} /> Pending Join
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#64748B' }}>—</span>
                        )}
                      </td>

                      {/* WhatsApp Nudge & Phone */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', justifyContent: 'flex-end' }}>
                          {(s.whatsapp_number || s.phone) && isAssigned && grp?.invitation_link && (
                            <a
                              href={getWhatsAppNudgeUrl(s)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '0.35rem 0.75rem',
                                borderRadius: '6px',
                                background: 'rgba(37, 211, 102, 0.15)',
                                border: '1px solid rgba(37, 211, 102, 0.35)',
                                color: '#25D366',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                              }}
                              title="Send WhatsApp reminder with group link"
                            >
                              <MessageCircle size={13} /> Nudge WA
                            </a>
                          )}

                          {(s.phone || s.whatsapp_number) && (
                            <a
                              href={`tel:${s.phone || s.whatsapp_number}`}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#CBD5E1',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textDecoration: 'none',
                              }}
                              title={`Call ${s.phone || s.whatsapp_number}`}
                            >
                              <Phone size={13} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Group Modal */}
      {showAddGroupModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 8, 15, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              borderRadius: '20px',
              background: '#0F172A',
              border: '1px solid rgba(66, 133, 244, 0.3)',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={18} color="#60A5FA" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  {editingGroup ? `Edit ${editingGroup.name}` : 'Create Study Group'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddGroupModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(234, 67, 53, 0.15)', border: '1px solid rgba(234, 67, 53, 0.35)', color: '#F87171', fontSize: '0.82rem', marginBottom: '1rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveGroup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Group Name *
                </label>
                <input
                  type="text"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  placeholder="e.g. Group 1, Group A (Mobile), or Section 1"
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Max Target Capacity (Students)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={groupCapacityInput}
                  onChange={(e) => setGroupCapacityInput(e.target.value)}
                  placeholder="50"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Default is 50 students per study cohort group.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Group Invite Link (WhatsApp / Discord / Telegram)
                </label>
                <input
                  type="url"
                  value={groupLinkInput}
                  onChange={(e) => setGroupLinkInput(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Students assigned to this group will see this invite link with 1-click tracking.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Notes / Meeting Time (Optional)
                </label>
                <textarea
                  rows={2}
                  value={groupNotesInput}
                  onChange={(e) => setGroupNotesInput(e.target.value)}
                  placeholder="e.g. In-person Lab on Mondays at 4 PM"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddGroupModal(false)}
                  style={{
                    padding: '0.65rem 1.1rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#CBD5E1',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingGroup}
                  style={{
                    padding: '0.65rem 1.35rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: isSavingGroup ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(66, 133, 244, 0.35)',
                  }}
                >
                  {isSavingGroup ? 'Saving...' : editingGroup ? 'Save Changes' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto-Distribute Modal */}
      {showAutoDistributeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 8, 15, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '540px',
              borderRadius: '20px',
              background: '#0F172A',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={20} color="#A855F7" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  ⚡ Smart Auto-Distribution
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAutoDistributeModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ color: '#94A3B8', fontSize: '0.86rem', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
              Automatically partition students into groups of equal sizes (e.g. 50 students). Groups will be auto-created if not enough exist.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Target Students per Group
                </label>
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={distributeCapacity}
                  onChange={(e) => setDistributeCapacity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Group Name Prefix
                </label>
                <input
                  type="text"
                  value={distributePrefix}
                  onChange={(e) => setDistributePrefix(e.target.value)}
                  placeholder="Group / مجموعة"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Groups will be named: "{distributePrefix} 1", "{distributePrefix} 2", etc.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#CBD5E1', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Distribution Sorting Strategy
                </label>
                <select
                  value={distributeStrategy}
                  onChange={(e) => setDistributeStrategy(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: '#0F172A',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  <option value="fifo">Registration Date (First Enrolled First Assigned)</option>
                  <option value="alphabetical">Alphabetical by Name (A to Z / أ إلى ي)</option>
                  <option value="faculty">Group by Faculty & Academic Year</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                <input
                  type="checkbox"
                  id="onlyUnassigned"
                  checked={distributeOnlyUnassigned}
                  onChange={(e) => setDistributeOnlyUnassigned(e.target.checked)}
                  style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#A855F7' }}
                />
                <label htmlFor="onlyUnassigned" style={{ fontSize: '0.82rem', color: '#CBD5E1', cursor: 'pointer' }}>
                  Only distribute currently unassigned students ({unassignedStudents.length}) without reshuffling existing groups
                </label>
              </div>

              {/* Summary Calculation Box */}
              <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.25)', fontSize: '0.82rem', color: '#E2E8F0' }}>
                <div style={{ fontWeight: 700, color: '#C084FC', marginBottom: '0.25rem' }}>Live Preview:</div>
                <div>
                  • Total students to distribute: <b>{distributeOnlyUnassigned ? unassignedStudents.length : totalConfirmed}</b>
                </div>
                <div>
                  • Estimated groups needed:{' '}
                  <b>
                    {Math.ceil(
                      (distributeOnlyUnassigned ? unassignedStudents.length : totalConfirmed) /
                        (parseInt(distributeCapacity, 10) || 50)
                    ) || 1}
                  </b>{' '}
                  groups of {distributeCapacity} students
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAutoDistributeModal(false)}
                  style={{
                    padding: '0.65rem 1.1rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#CBD5E1',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDistributing || (distributeOnlyUnassigned && unassignedStudents.length === 0)}
                  onClick={handleExecuteAutoDistribute}
                  style={{
                    padding: '0.65rem 1.4rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: isDistributing ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(168, 85, 247, 0.4)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  {isDistributing ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Distributing...
                    </>
                  ) : (
                    'Confirm & Distribute Now'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Group Email Confirmation & Preview Modal ──────────────────────── */}
      {showGroupEmailModal && selectedGroupForEmail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGroupEmailModal(false);
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #0F172A 0%, #131722 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '820px',
              maxHeight: '92vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(234,67,53,0.25), rgba(251,188,4,0.2))',
                    border: '1px solid rgba(234,67,53,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Send size={18} color="#FCA5A5" />
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF' }}>
                    إرسال إيميل تأكيد لـ {selectedGroupForEmail.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '2px' }}>
                    {selectedGroupForEmail.assigned_count || 0} طالب مسجل • {selectedGroupForEmail.invitation_link ? '✅ رابط واتساب مضاف' : '⚠️ لا يوجد رابط واتساب'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowGroupEmailModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '0.4rem', borderRadius: '8px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Feedback Banner */}
              {groupEmailFeedback && (
                <div
                  style={{
                    padding: '0.85rem 1.2rem',
                    borderRadius: '10px',
                    background: groupEmailFeedback.type === 'success' ? 'rgba(52,168,83,0.15)' : 'rgba(234,67,53,0.15)',
                    border: `1px solid ${groupEmailFeedback.type === 'success' ? 'rgba(52,168,83,0.4)' : 'rgba(234,67,53,0.4)'}`,
                    color: groupEmailFeedback.type === 'success' ? '#34D399' : '#F87171',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                  }}
                >
                  {groupEmailFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{groupEmailFeedback.text}</span>
                </div>
              )}

              {/* ── Section 1: Live Email Preview ── */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '0.85rem 1.2rem',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    background: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <Eye size={16} color="#60A5FA" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF' }}>معاينة الإيميل لهذا الجروب</span>
                  <span style={{ fontSize: '0.78rem', color: '#94A3B8', marginLeft: 'auto' }}>
                    هكذا سيظهر الإيميل لطلاب {selectedGroupForEmail.name}
                  </span>
                </div>
                <div style={{ padding: '0.75rem', background: '#f1f3f4', borderRadius: '0 0 14px 14px' }}>
                  <iframe
                    title="Group Email Preview"
                    style={{ width: '100%', height: '460px', border: 'none', borderRadius: '10px', background: '#ffffff', display: 'block' }}
                    srcDoc={groupEmailPreviewHtml}
                  />
                </div>
              </div>

              {/* ── Section 2: Send Test Email ── */}
              <div style={{ background: 'rgba(66,133,244,0.06)', border: '1px solid rgba(66,133,244,0.2)', borderRadius: '14px', padding: '1.15rem 1.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.5rem' }}>
                  <Send size={15} color="#60A5FA" />
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF' }}>إرسال إيميل تجريبي (Test) لبيانات هذا الجروب</span>
                </div>
                <p style={{ margin: '0 0 0.85rem', fontSize: '0.82rem', color: '#94A3B8', lineHeight: 1.5 }}>
                  أدخل إيميلك لتصلك الرسالة بنفس شكلها ورابط واتساب الخاص بـ {selectedGroupForEmail.name}.
                </p>
                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <input
                    type="email"
                    placeholder="test@example.com"
                    value={groupTestEmail}
                    onChange={(e) => setGroupTestEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendGroupTestEmail();
                    }}
                    style={{
                      flex: 1,
                      minWidth: '220px',
                      padding: '0.6rem 0.9rem',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#FFFFFF',
                      fontSize: '0.86rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSendGroupTestEmail}
                    disabled={isSendingGroupTest || !groupTestEmail.trim()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.6rem 1.3rem',
                      borderRadius: '10px',
                      background: !groupTestEmail.trim() ? 'rgba(66,133,244,0.2)' : 'linear-gradient(135deg, #4285F4, #1A73E8)',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      cursor: isSendingGroupTest || !groupTestEmail.trim() ? 'not-allowed' : 'pointer',
                      opacity: !groupTestEmail.trim() ? 0.5 : 1,
                    }}
                  >
                    {isSendingGroupTest ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    <span>{isSendingGroupTest ? 'جاري الإرسال...' : 'أرسل Test'}</span>
                  </button>
                </div>
              </div>

              {/* ── Section 3: Send Confirmation to all in this group ── */}
              <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '14px', padding: '1.15rem 1.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.5rem' }}>
                  <Users size={16} color="#34D399" />
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF' }}>
                    إرسال لجميع طلاب {selectedGroupForEmail.name} ({selectedGroupForEmail.assigned_count || 0} طالب)
                  </span>
                </div>
                <p style={{ margin: '0 0 0.85rem', fontSize: '0.82rem', color: '#94A3B8', lineHeight: 1.5 }}>
                  سيتم إرسال إيميل التأكيد الرسمي لجميع الطلاب المقبولين المعينين في هذه المجموعة حصراً، مع تضمين رابط الواتساب:
                  {' '}
                  <span style={{ color: selectedGroupForEmail.invitation_link ? '#34D399' : '#F87171', fontWeight: 700 }}>
                    {selectedGroupForEmail.invitation_link ? selectedGroupForEmail.invitation_link : '⚠️ لم يتم إضافة رابط واتساب بعد'}
                  </span>
                </p>

                {(selectedGroupForEmail.assigned_count || 0) === 0 ? (
                  <div style={{ padding: '0.65rem 0.9rem', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8', fontSize: '0.82rem' }}>
                    لا يوجد طلاب مسجلون في هذه المجموعة بعد. قم بتعيين الطلاب أولاً عبر الجدول أدناه.
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendGroupAllConfirmation}
                    disabled={isSendingGroupAll}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.55rem',
                      padding: '0.7rem 1.4rem',
                      borderRadius: '10px',
                      background: isSendingGroupAll ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg, #10B981, #059669)',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: isSendingGroupAll ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
                    }}
                  >
                    {isSendingGroupAll ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    <span>
                      {isSendingGroupAll
                        ? 'جاري إرسال الإيميلات...'
                        : `إرسال التأكيد لـ ${selectedGroupForEmail.assigned_count || 0} طالب في هذا الجروب`}
                    </span>
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
