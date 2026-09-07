'use client';

import { useState } from 'react';
import { FacultyOption } from '@/types';
import { 
  createFaculty, 
  updateFaculty, 
  toggleFacultyActive, 
  moveFacultyOrder, 
  deleteFaculty 
} from '@/app/settings/faculties/actions';
import { 
  GraduationCap, 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertCircle,
  Search,
  X,
  Sparkles
} from 'lucide-react';

interface FacultiesManagementClientProps {
  initialFaculties: FacultyOption[];
}

export function FacultiesManagementClient({ initialFaculties }: FacultiesManagementClientProps) {
  const [faculties, setFaculties] = useState<FacultyOption[]>(initialFaculties);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<FacultyOption | null>(null);

  // Form states
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(faculties.length + 1);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Open Add Modal
  const handleOpenAdd = () => {
    setNameAr('');
    setNameEn('');
    const maxOrder = faculties.reduce((max, f) => Math.max(max, f.sort_order), 0);
    setSortOrder(maxOrder + 1);
    setIsActive(true);
    setError(null);
    setIsAddOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (faculty: FacultyOption) => {
    setEditingFaculty(faculty);
    setNameAr(faculty.name_ar);
    setNameEn(faculty.name_en);
    setSortOrder(faculty.sort_order);
    setIsActive(faculty.is_active);
    setError(null);
  };

  // Close modals
  const handleCloseModal = () => {
    setIsAddOpen(false);
    setEditingFaculty(null);
    setError(null);
  };

  // Show temporary success message
  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // Submit Add
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim() || !nameEn.trim()) {
      setError('Both Arabic and English names are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await createFaculty({
        name_ar: nameAr.trim(),
        name_en: nameEn.trim(),
        sort_order: Number(sortOrder),
        is_active: isActive,
      });

      if (!res.success || !res.faculty) {
        setError(res.error || 'Failed to create faculty.');
        setIsSubmitting(false);
        return;
      }

      setFaculties((prev) => [...prev, res.faculty!].sort((a, b) => a.sort_order - b.sort_order));
      handleCloseModal();
      triggerSuccess('Faculty added successfully!');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaculty) return;
    if (!nameAr.trim() || !nameEn.trim()) {
      setError('Both Arabic and English names are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await updateFaculty(editingFaculty.id, {
        name_ar: nameAr.trim(),
        name_en: nameEn.trim(),
        sort_order: Number(sortOrder),
        is_active: isActive,
      });

      if (!res.success || !res.faculty) {
        setError(res.error || 'Failed to update faculty.');
        setIsSubmitting(false);
        return;
      }

      setFaculties((prev) =>
        prev
          .map((f) => (f.id === editingFaculty.id ? res.faculty! : f))
          .sort((a, b) => a.sort_order - b.sort_order)
      );
      handleCloseModal();
      triggerSuccess('Faculty updated successfully!');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active
  const handleToggleActive = async (faculty: FacultyOption) => {
    try {
      setLoadingId(faculty.id);
      const res = await toggleFacultyActive(faculty.id, faculty.is_active);

      if (!res.success) {
        setError(res.error || 'Failed to update status.');
        setLoadingId(null);
        return;
      }

      setFaculties((prev) =>
        prev.map((f) => (f.id === faculty.id ? { ...f, is_active: !f.is_active } : f))
      );
      triggerSuccess(`Faculty "${faculty.name_en}" is now ${!faculty.is_active ? 'Active' : 'Inactive'}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle status.');
    } finally {
      setLoadingId(null);
    }
  };

  // Move Order Up or Down
  const handleMoveOrder = async (id: string, direction: 'up' | 'down') => {
    try {
      setLoadingId(id);
      const res = await moveFacultyOrder(id, direction);

      if (!res.success) {
        setError(res.error || 'Failed to reorder.');
        setLoadingId(null);
        return;
      }

      // Re-sort in local state
      const currentIndex = faculties.findIndex((f) => f.id === id);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex >= 0 && targetIndex < faculties.length) {
        const newArr = [...faculties];
        const temp = newArr[currentIndex];
        newArr[currentIndex] = newArr[targetIndex];
        newArr[targetIndex] = temp;
        // Swap orders
        const tempOrder = newArr[currentIndex].sort_order;
        newArr[currentIndex].sort_order = newArr[targetIndex].sort_order;
        newArr[targetIndex].sort_order = tempOrder;
        setFaculties(newArr);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reorder.');
    } finally {
      setLoadingId(null);
    }
  };

  // Delete
  const handleDelete = async (faculty: FacultyOption) => {
    const confirm = window.confirm(
      `Are you sure you want to delete "${faculty.name_en}" (${faculty.name_ar})?\n\nTip: You can deactivate it instead to hide it from new applications while preserving historical records.`
    );
    if (!confirm) return;

    try {
      setLoadingId(faculty.id);
      const res = await deleteFaculty(faculty.id);

      if (!res.success) {
        setError(res.error || 'Failed to delete faculty.');
        setLoadingId(null);
        return;
      }

      setFaculties((prev) => prev.filter((f) => f.id !== faculty.id));
      triggerSuccess(`Faculty deleted successfully.`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete faculty.');
    } finally {
      setLoadingId(null);
    }
  };

  // Filtered list
  const filteredFaculties = faculties.filter((f) => {
    const q = searchQuery.toLowerCase();
    return (
      f.name_ar.toLowerCase().includes(q) ||
      f.name_en.toLowerCase().includes(q) ||
      String(f.sort_order).includes(q)
    );
  });

  const activeCount = faculties.filter((f) => f.is_active).length;
  const inactiveCount = faculties.length - activeCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Toast Success Notification */}
      {successMessage && (
        <div style={{
          background: 'rgba(52, 168, 83, 0.15)',
          border: '1px solid rgba(52, 168, 83, 0.4)',
          color: '#86EFAC',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.92rem',
          fontWeight: 600,
        }}>
          <CheckCircle2 size={18} color="var(--google-green)" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div style={{
          background: 'rgba(234, 67, 53, 0.12)',
          border: '1px solid rgba(234, 67, 53, 0.4)',
          color: '#F87171',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.92rem',
        }}>
          <AlertCircle size={18} color="var(--google-red)" />
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#F87171', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats Cards & Controls Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={24} color="var(--google-blue)" />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{faculties.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Faculties</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(52, 168, 83, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} color="var(--google-green)" />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#86EFAC' }}>{activeCount}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active in Forms</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(251, 188, 4, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <XCircle size={24} color="var(--google-yellow)" />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FDE047' }}>{inactiveCount}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Deactivated / Hidden</div>
          </div>
        </div>
      </div>

      {/* Search & Add Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', minWidth: '280px', flex: 1, maxWidth: '450px' }}>
          <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search faculties (Arabic or English)..."
            style={{
              width: '100%',
              padding: '0.7rem 1rem 0.7rem 2.6rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.92rem',
              outline: 'none',
            }}
          />
        </div>

        <button
          onClick={handleOpenAdd}
          className="btn-primary"
          style={{
            padding: '0.7rem 1.4rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          <Plus size={18} />
          <span>Add Faculty Option</span>
        </button>
      </div>

      {/* Faculties List / Table */}
      <div className="glass-panel" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.92rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '1rem 1.25rem', width: '90px' }}>Order</th>
                <th style={{ padding: '1rem 1.25rem' }}>Arabic Name (الاسم العربي)</th>
                <th style={{ padding: '1rem 1.25rem' }}>English Name</th>
                <th style={{ padding: '1rem 1.25rem', width: '130px' }}>Status</th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'right', width: '160px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFaculties.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No faculties found matching your search.
                  </td>
                </tr>
              ) : (
                filteredFaculties.map((f, idx) => (
                  <tr
                    key={f.id}
                    style={{
                      borderBottom: idx < filteredFaculties.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      background: f.is_active ? 'transparent' : 'rgba(0, 0, 0, 0.15)',
                      opacity: f.is_active ? 1 : 0.65,
                      transition: 'background 0.2s ease',
                    }}
                  >
                    {/* Sort Order & Move buttons */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontWeight: 700, width: '24px', textAlign: 'center' }}>{f.sort_order}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <button
                            title="Move Up"
                            disabled={idx === 0 || loadingId === f.id}
                            onClick={() => handleMoveOrder(f.id, 'up')}
                            style={{
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '2px 4px',
                              color: 'var(--text-secondary)',
                              cursor: idx === 0 ? 'not-allowed' : 'pointer',
                              opacity: idx === 0 ? 0.3 : 1,
                            }}
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            title="Move Down"
                            disabled={idx === filteredFaculties.length - 1 || loadingId === f.id}
                            onClick={() => handleMoveOrder(f.id, 'down')}
                            style={{
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '2px 4px',
                              color: 'var(--text-secondary)',
                              cursor: idx === filteredFaculties.length - 1 ? 'not-allowed' : 'pointer',
                              opacity: idx === filteredFaculties.length - 1 ? 0.3 : 1,
                            }}
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Arabic Name */}
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 600, fontSize: '0.98rem' }}>
                      <span dir="rtl">{f.name_ar}</span>
                    </td>

                    {/* English Name */}
                    <td style={{ padding: '1rem 1.25rem', color: 'var(--text-primary)' }}>
                      {f.name_en}
                    </td>

                    {/* Active/Inactive Toggle Pill */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <button
                        onClick={() => handleToggleActive(f)}
                        disabled={loadingId === f.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '999px',
                          border: f.is_active ? '1px solid rgba(52, 168, 83, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
                          background: f.is_active ? 'rgba(52, 168, 83, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: f.is_active ? '#86EFAC' : 'var(--text-secondary)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {loadingId === f.id ? (
                          <Loader2 size={12} className="spin-animation" />
                        ) : f.is_active ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <XCircle size={12} />
                        )}
                        <span>{f.is_active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>

                    {/* Actions: Edit & Delete */}
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleOpenEdit(f)}
                          title="Edit Faculty"
                          style={{
                            background: 'rgba(66, 133, 244, 0.12)',
                            border: '1px solid rgba(66, 133, 244, 0.3)',
                            borderRadius: '8px',
                            padding: '0.45rem',
                            color: '#93C5FD',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(f)}
                          title="Delete Faculty"
                          style={{
                            background: 'rgba(234, 67, 53, 0.12)',
                            border: '1px solid rgba(234, 67, 53, 0.3)',
                            borderRadius: '8px',
                            padding: '0.45rem',
                            color: '#FCA5A5',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Faculty */}
      {isAddOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem',
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', borderRadius: '18px', padding: '2rem', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <GraduationCap size={22} color="var(--google-blue)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add Faculty Option</h3>
              </div>
              <button onClick={handleCloseModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  اسم الكلية بالعربية (Arabic Name) <span style={{ color: 'var(--google-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  dir="rtl"
                  required
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: كلية الهندسة بحلوان"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  English Name <span style={{ color: 'var(--google-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. Faculty of Engineering (Helwan)"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '1.2rem' }}>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--google-blue)', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Active in Dropdown</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary"
                  style={{ padding: '0.65rem 1.25rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{ padding: '0.65rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                >
                  {isSubmitting ? <Loader2 size={16} className="spin-animation" /> : <Plus size={16} />}
                  <span>Add Faculty</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Faculty */}
      {editingFaculty && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem',
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', borderRadius: '18px', padding: '2rem', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Edit2 size={20} color="var(--google-yellow)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Edit Faculty Option</h3>
              </div>
              <button onClick={handleCloseModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  اسم الكلية بالعربية (Arabic Name) <span style={{ color: 'var(--google-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  dir="rtl"
                  required
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  English Name <span style={{ color: 'var(--google-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '1.2rem' }}>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--google-blue)', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Active in Dropdown</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary"
                  style={{ padding: '0.65rem 1.25rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{ padding: '0.65rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                >
                  {isSubmitting ? <Loader2 size={16} className="spin-animation" /> : <CheckCircle2 size={16} />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
