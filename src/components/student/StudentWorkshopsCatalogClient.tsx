'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Search,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Sparkles,
  ArrowRight,
  Filter,
  X,
  GraduationCap,
  Layers,
  ChevronRight,
  MapPin,
  Video,
  Play,
  QrCode,
} from 'lucide-react';
import { StudentWorkshopCardItem } from '@/app/student/workshops/actions';

interface StudentWorkshopsCatalogClientProps {
  initialWorkshops: StudentWorkshopCardItem[];
  categories: string[];
  departments: Array<{ id: string; name: string; code: string }>;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
}

export function StudentWorkshopsCatalogClient({
  initialWorkshops,
  categories,
  departments,
  isAuthenticated,
  needsOnboarding,
}: StudentWorkshopsCatalogClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'open' | 'registered'>('all');

  // Filtered workshops
  const filteredWorkshops = useMemo(() => {
    return initialWorkshops.filter((workshop) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        workshop.title.toLowerCase().includes(q) ||
        (workshop.description && workshop.description.toLowerCase().includes(q)) ||
        (workshop.category && workshop.category.toLowerCase().includes(q)) ||
        (workshop.department_name && workshop.department_name.toLowerCase().includes(q)) ||
        workshop.instructors.some((ins) => ins.full_name.toLowerCase().includes(q));

      const matchesDept = selectedDept === 'all' || workshop.department_id === selectedDept;
      const matchesCat = selectedCategory === 'all' || workshop.category === selectedCategory;

      let matchesMode = true;
      if (filterMode === 'open') {
        matchesMode = workshop.registration_open && !workshop.is_full && !workshop.my_registration_status;
      } else if (filterMode === 'registered') {
        matchesMode = Boolean(workshop.my_registration_status);
      }

      return matchesSearch && matchesDept && matchesCat && matchesMode;
    });
  }, [initialWorkshops, searchQuery, selectedDept, selectedCategory, filterMode]);

  // Aggregate stats
  const totalSessions = initialWorkshops.reduce((acc, w) => acc + w.sessions_count, 0);
  const openCount = initialWorkshops.filter((w) => w.registration_open && !w.is_full).length;
  const registeredCount = initialWorkshops.filter((w) => w.my_registration_status === 'registered').length;

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedDept !== 'all' ||
    selectedCategory !== 'all' ||
    filterMode !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDept('all');
    setSelectedCategory('all');
    setFilterMode('all');
  };

  return (
    <div
      style={{
        padding: '2.5rem 2rem',
        maxWidth: '1240px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        paddingBottom: '4rem',
      }}
    >
      {/* Onboarding Notice for incomplete profiles */}
      {isAuthenticated && needsOnboarding && (
        <div
          style={{
            padding: '1.2rem 1.5rem',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(251, 188, 4, 0.15) 0%, rgba(234, 67, 53, 0.1) 100%)',
            border: '1px solid rgba(251, 188, 4, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <AlertCircle size={22} style={{ color: '#FBBF24', flexShrink: 0 }} />
            <div>
              <div style={{ color: '#FBBF24', fontWeight: 700, fontSize: '0.95rem' }}>
                Complete Your Student Profile to Register
              </div>
              <div style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                Finish filling your university details, academic year, and major to unlock one-click workshop registration and attendance pass.
              </div>
            </div>
          </div>
          <Link
            href="/student/onboarding"
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '9999px',
              background: '#FBBF24',
              color: '#0F172A',
              fontWeight: 700,
              fontSize: '0.875rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            Complete Profile Now <ChevronRight size={16} />
          </Link>
        </div>
      )}

      {/* Hero Header Section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              background: 'rgba(52, 168, 83, 0.12)',
              border: '1px solid rgba(52, 168, 83, 0.3)',
              color: '#34A853',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <Sparkles size={14} />
            Interactive Bootcamps
          </div>
          <div
            style={{
              fontSize: '0.8rem',
              color: '#64748B',
              fontWeight: 600,
            }}
          >
            • GDGoC Helwan University
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1.5rem',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '2.4rem',
                fontWeight: 800,
                color: '#F8FAFC',
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              Workshops & Hands-On Bootcamps
            </h1>
            <p
              style={{
                color: '#94A3B8',
                fontSize: '1.05rem',
                maxWidth: '720px',
                marginTop: '0.6rem',
                lineHeight: 1.6,
              }}
            >
              Intensive multi-session bootcamps, technical deep dives, and hands-on workshops led by chapter committee heads and instructors. Join live streams or attend offline on campus.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              href="/student/courses"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#E2E8F0',
                fontSize: '0.9rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <GraduationCap size={18} style={{ color: 'var(--google-blue)' }} />
              Browse Long Tracks
            </Link>
            {isAuthenticated && (
              <Link
                href="/student/my-qr"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.15) 0%, rgba(52, 168, 83, 0.15) 100%)',
                  border: '1px solid rgba(66, 133, 244, 0.3)',
                  color: '#60A5FA',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <QrCode size={18} />
                My Attendance Pass
              </Link>
            )}
          </div>
        </div>

        {/* Aggregate KPI Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '1rem',
            marginTop: '0.5rem',
          }}
        >
          <div
            style={{
              padding: '1.1rem 1.25rem',
              borderRadius: '14px',
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div style={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Available Bootcamps
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', marginTop: '0.25rem' }}>
              {initialWorkshops.length}
            </div>
            <div style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '0.2rem' }}>
              Published workshops
            </div>
          </div>

          <div
            style={{
              padding: '1.1rem 1.25rem',
              borderRadius: '14px',
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div style={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Sessions
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--google-blue, #4285F4)', marginTop: '0.25rem' }}>
              {totalSessions}
            </div>
            <div style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '0.2rem' }}>
              Hands-on lab sessions
            </div>
          </div>

          <div
            style={{
              padding: '1.1rem 1.25rem',
              borderRadius: '14px',
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div style={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Open Registrations
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34A853', marginTop: '0.25rem' }}>
              {openCount}
            </div>
            <div style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '0.2rem' }}>
              Spots currently open
            </div>
          </div>

          {isAuthenticated && (
            <div
              style={{
                padding: '1.1rem 1.25rem',
                borderRadius: '14px',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div style={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
                My Registrations
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FBBF24', marginTop: '0.25rem' }}>
                {registeredCount}
              </div>
              <div style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                Confirmed attendance
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          padding: '1.25rem',
          borderRadius: '16px',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {/* Search Box */}
          <div
            style={{
              position: 'relative',
              flex: '1 1 280px',
            }}
          >
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748B',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, topic, committee, or instructor..."
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.75rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#F8FAFC',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter Mode Tabs */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '10px',
              padding: '0.25rem',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              style={{
                padding: '0.5rem 0.9rem',
                borderRadius: '8px',
                border: 'none',
                background: filterMode === 'all' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: filterMode === 'all' ? '#F8FAFC' : '#94A3B8',
                fontWeight: filterMode === 'all' ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('open')}
              style={{
                padding: '0.5rem 0.9rem',
                borderRadius: '8px',
                border: 'none',
                background: filterMode === 'open' ? 'rgba(52, 168, 83, 0.2)' : 'transparent',
                color: filterMode === 'open' ? '#34A853' : '#94A3B8',
                fontWeight: filterMode === 'open' ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Open for Registration
            </button>
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setFilterMode('registered')}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: filterMode === 'registered' ? 'rgba(66, 133, 244, 0.2)' : 'transparent',
                  color: filterMode === 'registered' ? '#60A5FA' : '#94A3B8',
                  fontWeight: filterMode === 'registered' ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Registered ({registeredCount})
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#F8FAFC',
                fontSize: '0.875rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all" style={{ background: '#0F172A', color: '#FFF' }}>
                All Categories
              </option>
              {categories.map((cat) => (
                <option key={cat} value={cat} style={{ background: '#0F172A', color: '#FFF' }}>
                  {cat}
                </option>
              ))}
            </select>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#EF4444',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <X size={15} /> Reset
            </button>
          )}
        </div>

        {/* Department Pills */}
        {departments.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
              alignItems: 'center',
              paddingTop: '0.4rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, marginRight: '0.25rem' }}>
              Committee:
            </span>
            <button
              type="button"
              onClick={() => setSelectedDept('all')}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: selectedDept === 'all' ? 700 : 500,
                border: selectedDept === 'all' ? '1px solid rgba(66, 133, 244, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                background: selectedDept === 'all' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                color: selectedDept === 'all' ? '#60A5FA' : '#94A3B8',
                cursor: 'pointer',
              }}
            >
              All Committees
            </button>
            {departments.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDept(d.id)}
                style={{
                  padding: '0.35rem 0.8rem',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: selectedDept === d.id ? 700 : 500,
                  border: selectedDept === d.id ? '1px solid rgba(66, 133, 244, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: selectedDept === d.id ? 'rgba(66, 133, 244, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: selectedDept === d.id ? '#60A5FA' : '#94A3B8',
                  cursor: 'pointer',
                }}
              >
                {d.name} ({d.code})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Workshops Grid */}
      {filteredWorkshops.length === 0 ? (
        <div
          style={{
            padding: '4rem 2rem',
            borderRadius: '20px',
            background: 'rgba(15, 23, 42, 0.4)',
            border: '1px dashed rgba(255, 255, 255, 0.12)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
            }}
          >
            <Calendar size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
              No Workshops Found
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem', maxWidth: '440px', marginTop: '0.4rem' }}>
              {hasActiveFilters
                ? 'No workshops match your selected search terms and filters. Try resetting the filters to view all available bootcamps.'
                : 'Stay tuned! New hands-on bootcamps and technical workshops will be published soon by our chapter heads.'}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                marginTop: '0.5rem',
                padding: '0.65rem 1.4rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#F8FAFC',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {filteredWorkshops.map((workshop) => {
            const isRegistered = workshop.my_registration_status === 'registered';
            const totalHours = Math.max(1, Math.round(workshop.total_duration_minutes / 60));

            return (
              <div
                key={workshop.id}
                style={{
                  borderRadius: '18px',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: isRegistered
                    ? '1px solid rgba(52, 168, 83, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(12px)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                  position: 'relative',
                }}
              >
                {/* Registered Glow Tag */}
                {isRegistered && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      zIndex: 10,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.8rem',
                      borderRadius: '9999px',
                      background: 'rgba(52, 168, 83, 0.9)',
                      color: '#FFFFFF',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      boxShadow: '0 4px 14px rgba(52, 168, 83, 0.4)',
                    }}
                  >
                    <CheckCircle2 size={13} /> Registered
                  </div>
                )}

                {/* Banner / Cover Header */}
                <div
                  style={{
                    height: '160px',
                    position: 'relative',
                    background: workshop.cover_image_url
                      ? `url(${workshop.cover_image_url}) center/cover no-repeat`
                      : 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '1rem',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.2) 0%, rgba(15, 23, 42, 0.85) 100%)',
                    }}
                  />

                  {/* Top Badges */}
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      display: 'flex',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    {workshop.department_code && (
                      <span
                        style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px',
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#60A5FA',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          letterSpacing: '0.03em',
                        }}
                      >
                        {workshop.department_code}
                      </span>
                    )}
                    {workshop.category && (
                      <span
                        style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px',
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#CBD5E1',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        {workshop.category}
                      </span>
                    )}
                  </div>

                  {/* Delivery Format Pills (Offline/Online count) */}
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'center',
                    }}
                  >
                    {workshop.offline_sessions_count > 0 && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          background: 'rgba(52, 168, 83, 0.25)',
                          border: '1px solid rgba(52, 168, 83, 0.4)',
                          color: '#4ADE80',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                        }}
                      >
                        <MapPin size={11} /> {workshop.offline_sessions_count} Offline
                      </span>
                    )}
                    {workshop.online_sessions_count > 0 && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          background: 'rgba(66, 133, 244, 0.25)',
                          border: '1px solid rgba(66, 133, 244, 0.4)',
                          color: '#93C5FD',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                        }}
                      >
                        <Video size={11} /> {workshop.online_sessions_count} Online
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Section */}
                <div
                  style={{
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    gap: '1rem',
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        color: '#F8FAFC',
                        margin: 0,
                        lineHeight: 1.35,
                      }}
                    >
                      {workshop.title}
                    </h3>
                    <p
                      style={{
                        color: '#94A3B8',
                        fontSize: '0.875rem',
                        marginTop: '0.4rem',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minHeight: '2.6em',
                      }}
                    >
                      {workshop.description || 'Hands-on practical bootcamp organized by Google Developer Groups on Campus HNU.'}
                    </p>
                  </div>

                  {/* Workshop Metrics Meta */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.6rem',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Calendar size={14} style={{ color: 'var(--google-blue)' }} />
                      <span style={{ fontSize: '0.8rem', color: '#CBD5E1', fontWeight: 600 }}>
                        {workshop.sessions_count} Sessions
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Clock size={14} style={{ color: '#FBBF24' }} />
                      <span style={{ fontSize: '0.8rem', color: '#CBD5E1', fontWeight: 600 }}>
                        ~{totalHours} hrs Total
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Users size={14} style={{ color: '#34A853' }} />
                      <span style={{ fontSize: '0.8rem', color: '#CBD5E1', fontWeight: 600 }}>
                        {workshop.capacity ? `${workshop.registration_count}/${workshop.capacity} seats` : `${workshop.registration_count} registered`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      {workshop.is_full ? (
                        <span style={{ fontSize: '0.8rem', color: '#EF4444', fontWeight: 700 }}>
                          Full
                        </span>
                      ) : workshop.registration_open ? (
                        <span style={{ fontSize: '0.8rem', color: '#34A853', fontWeight: 700 }}>
                          Open to Enroll
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>
                          Registration Closed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Instructors Row */}
                  {workshop.instructors.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '0.3rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', marginLeft: '-4px' }}>
                          {workshop.instructors.slice(0, 3).map((ins, i) => (
                            <div
                              key={ins.id}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
                                border: '2px solid #0F172A',
                                marginLeft: i > 0 ? '-8px' : 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#FFF',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                overflow: 'hidden',
                              }}
                              title={ins.full_name}
                            >
                              {ins.avatar_url ? (
                                <img
                                  src={ins.avatar_url}
                                  alt={ins.full_name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                ins.full_name.charAt(0)
                              )}
                            </div>
                          ))}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                          {workshop.instructors[0].full_name}
                          {workshop.instructors.length > 1 && ` +${workshop.instructors.length - 1}`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Bottom Action CTA */}
                  <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                    <Link
                      href={`/student/workshops/${workshop.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '11px',
                        background: isRegistered
                          ? 'linear-gradient(135deg, rgba(52, 168, 83, 0.2) 0%, rgba(66, 133, 244, 0.15) 100%)'
                          : 'linear-gradient(135deg, var(--google-blue, #4285F4) 0%, #2563EB 100%)',
                        border: isRegistered ? '1px solid rgba(52, 168, 83, 0.4)' : 'none',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        textDecoration: 'none',
                        transition: 'opacity 0.15s ease',
                      }}
                    >
                      {isRegistered ? (
                        <>
                          <CheckCircle2 size={16} /> View My Sessions & QR
                        </>
                      ) : workshop.is_full ? (
                        <>
                          View Workshop Details <ArrowRight size={16} />
                        </>
                      ) : workshop.registration_open ? (
                        <>
                          View Details & Register <ArrowRight size={16} />
                        </>
                      ) : (
                        <>
                          View Workshop Details <ArrowRight size={16} />
                        </>
                      )}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
