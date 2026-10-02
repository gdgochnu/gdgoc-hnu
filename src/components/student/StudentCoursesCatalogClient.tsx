'use client';

import React, { useState, useMemo, useCallback, useEffect, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen,
  Search,
  Calendar,
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
} from 'lucide-react';
import { StudentCourseCardItem } from '@/app/student/courses/actions';

interface StudentCoursesCatalogClientProps {
  initialCourses: StudentCourseCardItem[];
  categories: string[];
  departments: Array<{ id: string; name: string; code: string }>;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
}

export function StudentCoursesCatalogClient({
  initialCourses,
  categories,
  departments,
  isAuthenticated,
  needsOnboarding,
}: StudentCoursesCatalogClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'open' | 'enrolled'>('all');

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter courses
  const filteredCourses = useMemo(() => {
    return initialCourses.filter((course) => {
      const q = debouncedSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        course.title.toLowerCase().includes(q) ||
        (course.description && course.description.toLowerCase().includes(q)) ||
        (course.category && course.category.toLowerCase().includes(q)) ||
        (course.department_name && course.department_name.toLowerCase().includes(q)) ||
        course.instructors.some((ins) => ins.full_name.toLowerCase().includes(q));

      const matchesCat = selectedCategory === 'all' || course.category === selectedCategory;

      let matchesMode = true;
      if (filterMode === 'open') {
        matchesMode = !course.is_full && !course.my_enrollment_status;
      } else if (filterMode === 'enrolled') {
        matchesMode = Boolean(course.my_enrollment_status);
      }

      return matchesSearch && matchesCat && matchesMode;
    });
  }, [initialCourses, debouncedSearch, selectedCategory, filterMode]);

  // Aggregate stats
  const totalSessions = initialCourses.reduce((acc, c) => acc + c.sessions_count, 0);
  const totalTracks = categories.length || 1;
  const enrolledCount = initialCourses.filter((c) => c.my_enrollment_status === 'confirmed').length;

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'all' ||
    filterMode !== 'all';

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedCategory('all');
    setFilterMode('all');
  }, []);

  return (
    <div
      style={{
        padding: 'clamp(1.25rem, 2.5vw, 2rem) clamp(1rem, 3vw, 2rem) 4rem',
        maxWidth: '1240px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        width: '100%',
        boxSizing: 'border-box',
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
                Complete Your Student Profile to Enroll
              </div>
              <div style={{ color: '#CBD5E1', fontSize: '0.84rem', marginTop: '0.15rem' }}>
                Your student profile requires a few details before course enrollments can be approved.
              </div>
            </div>
          </div>
          <Link
            href="/student/onboarding"
            style={{
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              background: '#FBBF24',
              color: '#0F172A',
              fontWeight: 700,
              fontSize: '0.84rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            Complete Profile Now
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Hero Header */}
      <div
        className="glass-panel"
        style={{
          padding: '2.5rem 2rem',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'radial-gradient(ellipse at top right, rgba(66, 133, 244, 0.18) 0%, rgba(15, 23, 42, 0.8) 70%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '780px', position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '20px',
              background: 'rgba(66, 133, 244, 0.15)',
              border: '1px solid rgba(66, 133, 244, 0.3)',
              color: '#60A5FA',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginBottom: '1rem',
            }}
          >
            <Sparkles size={14} />
            Official Learning Curriculum
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: '0 0 0.8rem 0',
              lineHeight: 1.2,
              letterSpacing: '-0.5px',
            }}
          >
            Explore Tracks & Structured Courses
          </h1>

          <p style={{ color: '#94A3B8', fontSize: '1.02rem', lineHeight: 1.6, margin: '0 0 1.75rem 0' }}>
            Comprehensive hands-on programs taught by Google Developer Groups on Campus Helwan National University technical
            leads. Attend in-person workshops or online sessions with recorded video lectures, practical labs, and
            graduation certificates.
          </p>

          {/* Quick Metrics */}
          <div className="courses-stats-row">
            <div className="courses-stat-item">
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4285F4' }}>{initialCourses.length}</div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Courses</div>
            </div>
            <div className="courses-stat-divider" />
            <div className="courses-stat-item">
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34A853' }}>{totalSessions}</div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sessions</div>
            </div>
            <div className="courses-stat-divider" />
            <div className="courses-stat-item">
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FBBC04' }}>{totalTracks}</div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tracks</div>
            </div>
            {isAuthenticated && enrolledCount > 0 && (
              <>
                <div className="courses-stat-divider" />
                <div className="courses-stat-item">
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#A855F7' }}>{enrolledCount}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enrolled</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Live Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94A3B8',
              }}
            />
            <input
              type="text"
              placeholder="Search courses by title, track, or instructor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchQuery('');
              }}
              style={{
                width: '100%',
                padding: '0.65rem 2.4rem 0.65rem 2.6rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
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
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#CBD5E1',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                  e.currentTarget.style.color = '#EF4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#CBD5E1';
                }}
                title="Clear search (Esc)"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(
              [
                { key: 'all', label: 'All Courses' },
                { key: 'open', label: 'Open to Enroll' },
                ...(isAuthenticated ? [{ key: 'enrolled', label: 'My Enrolled' }] : []),
              ] as Array<{ key: 'all' | 'open' | 'enrolled'; label: string }>
            ).map((mode) => (
              <button
                key={mode.key}
                onClick={() => setFilterMode(mode.key)}
                style={{
                  padding: '0.5rem 0.95rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border:
                    filterMode === mode.key
                      ? '1px solid rgba(66, 133, 244, 0.5)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                  background:
                    filterMode === mode.key ? 'rgba(66, 133, 244, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  color: filterMode === mode.key ? '#60A5FA' : '#94A3B8',
                  transition: 'all 0.15s ease',
                }}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdowns row: Track */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', width: '100%' }}>
          {/* Category / Track Filter */}
          {categories.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flex: '1 1 200px', minWidth: 0, maxWidth: '280px' }}>
              <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600, flexShrink: 0 }}>Track:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: 0,
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#E2E8F0',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer',
                  textOverflow: 'ellipsis',
                  boxSizing: 'border-box',
                }}
              >
                <option value="all" style={{ background: '#0F172A', color: '#FFFFFF' }}>
                  All Tracks
                </option>
                {categories.map((cat) => (
                  <option key={cat} value={cat} style={{ background: '#0F172A', color: '#FFFFFF' }}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(234, 67, 53, 0.1)',
                border: '1px solid rgba(234, 67, 53, 0.3)',
                color: '#EA4335',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                marginLeft: 'auto',
              }}
            >
              <X size={13} />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Counter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.2rem 0.4rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.86rem', color: '#94A3B8' }}>
          <Sparkles size={15} color="#4285F4" />
          <span>
            Showing <strong style={{ color: '#FFFFFF', fontWeight: 800 }}>{filteredCourses.length}</strong> of{' '}
            <strong style={{ color: '#FFFFFF', fontWeight: 800 }}>{initialCourses.length}</strong> Courses
          </span>
          {hasActiveFilters && (
            <span
              style={{
                fontSize: '0.72rem',
                padding: '0.15rem 0.55rem',
                borderRadius: '999px',
                background: 'rgba(66, 133, 244, 0.15)',
                color: '#60A5FA',
                border: '1px solid rgba(66, 133, 244, 0.3)',
                fontWeight: 700,
              }}
            >
              Filtered
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#EA4335',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.2rem 0.5rem',
            }}
          >
            <X size={13} />
            <span>Reset All</span>
          </button>
        )}
      </div>

      {/* Courses Cards Grid */}
      {filteredCourses.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '4.5rem 2rem',
            borderRadius: '24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem',
            background: hasActiveFilters
              ? 'radial-gradient(ellipse at center, rgba(234, 67, 53, 0.06) 0%, rgba(15, 23, 42, 0.5) 70%)'
              : 'radial-gradient(ellipse at center, rgba(66, 133, 244, 0.08) 0%, rgba(15, 23, 42, 0.5) 70%)',
            border: hasActiveFilters
              ? '1px solid rgba(234, 67, 53, 0.2)'
              : '1px dashed rgba(66, 133, 244, 0.3)',
          }}
        >
          {/* Animated icon */}
          <div style={{ position: 'relative', width: '80px', height: '80px' }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: hasActiveFilters ? 'rgba(234, 67, 53, 0.1)' : 'rgba(66, 133, 244, 0.1)',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: '8px',
                borderRadius: '50%',
                background: hasActiveFilters ? 'rgba(234, 67, 53, 0.15)' : 'rgba(66, 133, 244, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: hasActiveFilters ? '#F87171' : '#60A5FA',
              }}
            >
              <BookOpen size={34} />
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.5rem 0' }}>
              {hasActiveFilters ? 'No Courses Match' : 'No Courses Published Yet'}
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '0.92rem', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
              {hasActiveFilters
                ? 'No courses match your active filters. Try broadening your search or clearing the track and status filters to see all available courses.'
                : 'Chapter technical tracks are preparing course curricula. New courses covering Web, Mobile, AI, Cloud, and Cybersecurity will appear here soon.'}
            </p>
          </div>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                padding: '0.7rem 1.5rem',
                borderRadius: '10px',
                background: 'rgba(66, 133, 244, 0.15)',
                border: '1px solid rgba(66, 133, 244, 0.35)',
                color: '#60A5FA',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(66, 133, 244, 0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(66, 133, 244, 0.15)')}
            >
              <X size={15} />
              Clear All Filters
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#64748B', marginTop: '0.25rem' }}>
              <Sparkles size={14} color="#4285F4" />
              <span>New courses are added each semester — check back soon!</span>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
            gap: '1.5rem',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          {filteredCourses.map((course) => {
            const isEnrolled = course.my_enrollment_status === 'confirmed';
            const isPending = course.my_enrollment_status === 'pending';
            const isWaitlisted = course.my_enrollment_status === 'waitlisted';
            const hoursEst = Math.max(1, Math.round(course.total_duration_minutes / 60));

            return (
              <div
                key={course.id}
                className="glass-panel"
                style={{
                  borderRadius: '20px',
                  border: isEnrolled
                    ? '1px solid rgba(52, 168, 83, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.88) 100%)',
                  boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.4)',
                  width: '100%',
                  boxSizing: 'border-box',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.borderColor = isEnrolled
                    ? 'rgba(52, 168, 83, 0.7)'
                    : 'rgba(66, 133, 244, 0.5)';
                  e.currentTarget.style.boxShadow = isEnrolled
                    ? '0 16px 36px -6px rgba(0, 0, 0, 0.6), 0 0 20px rgba(52, 168, 83, 0.2)'
                    : '0 16px 36px -6px rgba(0, 0, 0, 0.6), 0 0 20px rgba(66, 133, 244, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = isEnrolled
                    ? 'rgba(52, 168, 83, 0.4)'
                    : 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.boxShadow = '0 8px 24px -4px rgba(0, 0, 0, 0.4)';
                }}
              >
                {/* Cover Banner */}
                <div
                  style={{
                    height: '160px',
                    position: 'relative',
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.35) 0%, rgba(52, 168, 83, 0.25) 50%, rgba(15, 23, 42, 0.9) 100%)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  {course.cover_image_url && (
                    <Image
                      src={course.cover_image_url}
                      alt={course.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 380px"
                      loading="lazy"
                      unoptimized
                      style={{
                        objectFit: 'cover',
                        objectPosition: 'center',
                        transition: 'transform 0.4s ease',
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(to bottom, rgba(15, 23, 42, 0.15) 0%, rgba(15, 23, 42, 0.6) 60%, rgba(15, 23, 42, 0.95) 100%)',
                      zIndex: 1,
                    }}
                  />

                  {/* Top Badges */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '0.9rem',
                      left: '0.9rem',
                      right: '0.9rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.5rem',
                      zIndex: 2,
                    }}
                  >
                    {course.category ? (
                      <span
                        style={{
                          padding: '0.3rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          background: 'rgba(15, 23, 42, 0.85)',
                          color: '#60A5FA',
                          border: '1px solid rgba(66, 133, 244, 0.35)',
                          backdropFilter: 'blur(10px)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        }}
                      >
                        {course.category}
                      </span>
                    ) : <span />}

                    {/* Enrollment State Badge */}
                    {isEnrolled ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          background: 'rgba(52, 168, 83, 0.95)',
                          color: '#FFFFFF',
                          boxShadow: '0 4px 12px rgba(52, 168, 83, 0.4)',
                        }}
                      >
                        <CheckCircle2 size={13} />
                        Enrolled
                      </span>
                    ) : isPending ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          background: 'rgba(251, 188, 4, 0.95)',
                          color: '#0F172A',
                          boxShadow: '0 4px 12px rgba(251, 188, 4, 0.35)',
                        }}
                      >
                        <Clock3 size={13} />
                        Under Review
                      </span>
                    ) : isWaitlisted ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          background: 'rgba(168, 85, 247, 0.95)',
                          color: '#FFFFFF',
                        }}
                      >
                        Waitlisted
                      </span>
                    ) : course.is_full ? (
                      <span
                        style={{
                          padding: '0.3rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          background: 'rgba(234, 67, 53, 0.9)',
                          color: '#FFFFFF',
                        }}
                      >
                        Full
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: '0.3rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          background: 'rgba(15, 23, 42, 0.85)',
                          color: course.enrollment_type === 'open' ? '#34D399' : '#FBBF24',
                          border: `1px solid ${course.enrollment_type === 'open' ? 'rgba(52, 168, 83, 0.4)' : 'rgba(251, 188, 4, 0.4)'}`,
                          backdropFilter: 'blur(10px)',
                        }}
                      >
                        {course.enrollment_type === 'open' ? 'Open Enrollment' : 'Admission by Review'}
                      </span>
                    )}
                  </div>

                  {/* Committee tag bottom-left of cover */}
                  {course.department_name && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '0.75rem',
                        left: '0.9rem',
                        fontSize: '0.75rem',
                        color: '#E2E8F0',
                        fontWeight: 600,
                        textShadow: '0 1px 4px rgba(0, 0, 0, 0.9)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: 'rgba(15, 23, 42, 0.65)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        backdropFilter: 'blur(6px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      <Sparkles size={11} color="#60A5FA" />
                      {course.department_name}
                    </div>
                  )}
                </div>

                {/* Card Content Body */}
                <div style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '0.9rem' }}>
                  <h3
                    style={{
                      fontSize: '1.18rem',
                      fontWeight: 800,
                      color: '#FFFFFF',
                      margin: 0,
                      lineHeight: 1.35,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {course.title}
                  </h3>

                  <p
                    style={{
                      color: '#94A3B8',
                      fontSize: '0.86rem',
                      lineHeight: 1.55,
                      margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: '2.7em',
                    }}
                  >
                    {course.description || 'Comprehensive curriculum covering core concepts and practical real-world engineering.'}
                  </p>

                  {/* Stats Row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.6rem',
                      padding: '0.75rem 0.9rem',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      fontSize: '0.8rem',
                      color: '#CBD5E1',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Calendar size={15} style={{ color: '#60A5FA', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600 }}>{course.sessions_count} Sessions</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Clock size={15} style={{ color: '#34D399', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600 }}>~{hoursEst} hrs Total</span>
                    </div>
                  </div>

                  {/* Teaching Staff Avatars & Footer Action */}
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      {course.instructors.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {course.instructors.slice(0, 3).map((ins, idx) => (
                            <div
                              key={ins.id}
                              style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                background: idx === 0 ? '#4285F4' : '#10B981',
                                border: '2px solid #0F172A',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                marginLeft: idx > 0 ? '-9px' : '0',
                                overflow: 'hidden',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                              }}
                              title={ins.full_name}
                            >
                              {ins.avatar_url ? (
                                <Image
                                  src={ins.avatar_url}
                                  alt={ins.full_name}
                                  width={30}
                                  height={30}
                                  style={{ objectFit: 'cover', borderRadius: '50%' }}
                                />
                              ) : (
                                ins.full_name.slice(0, 1).toUpperCase()
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <span
                        style={{
                          fontSize: '0.78rem',
                          color: '#94A3B8',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontWeight: 500,
                        }}
                      >
                        {course.instructors.length > 0
                          ? course.instructors[0].full_name + (course.instructors.length > 1 ? ` +${course.instructors.length - 1}` : '')
                          : 'GDGoC Chapter'}
                      </span>
                    </div>

                    {/* View Course Link */}
                    <Link
                      href={`/student/courses/${course.id}`}
                      style={{
                        padding: '0.55rem 1.05rem',
                        borderRadius: '10px',
                        background: isEnrolled
                          ? 'linear-gradient(135deg, rgba(52, 168, 83, 0.25) 0%, rgba(66, 133, 244, 0.2) 100%)'
                          : 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
                        border: isEnrolled ? '1px solid rgba(52, 168, 83, 0.45)' : 'none',
                        color: '#FFFFFF',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        flexShrink: 0,
                        boxShadow: isEnrolled ? 'none' : '0 4px 14px rgba(66, 133, 244, 0.35)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isEnrolled ? 'Open Track' : 'View Course'}
                      <ArrowRight size={14} />
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
