'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
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
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'open' | 'enrolled'>('all');

  // Filter courses
  const filteredCourses = useMemo(() => {
    return initialCourses.filter((course) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        course.title.toLowerCase().includes(q) ||
        (course.description && course.description.toLowerCase().includes(q)) ||
        (course.category && course.category.toLowerCase().includes(q)) ||
        (course.department_name && course.department_name.toLowerCase().includes(q)) ||
        course.instructors.some((ins) => ins.full_name.toLowerCase().includes(q));

      const matchesDept = selectedDept === 'all' || course.department_id === selectedDept;
      const matchesCat = selectedCategory === 'all' || course.category === selectedCategory;

      let matchesMode = true;
      if (filterMode === 'open') {
        matchesMode = !course.is_full && !course.my_enrollment_status;
      } else if (filterMode === 'enrolled') {
        matchesMode = Boolean(course.my_enrollment_status);
      }

      return matchesSearch && matchesDept && matchesCat && matchesMode;
    });
  }, [initialCourses, searchQuery, selectedDept, selectedCategory, filterMode]);

  // Aggregate stats
  const totalSessions = initialCourses.reduce((acc, c) => acc + c.sessions_count, 0);
  const totalTracks = categories.length || 1;
  const enrolledCount = initialCourses.filter((c) => c.my_enrollment_status === 'confirmed').length;

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
            Comprehensive hands-on programs taught by Google Developer Groups on Campus Helwan University technical
            leads. Attend in-person workshops or online sessions with recorded video lectures, practical labs, and
            graduation certificates.
          </p>

          {/* Quick Metrics */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4285F4' }}>
                {initialCourses.length}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
                Published Courses
              </div>
            </div>

            <div style={{ width: '1px', height: '32px', background: 'rgba(255, 255, 255, 0.1)' }} />

            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34A853' }}>
                {totalSessions}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
                Curriculum Sessions
              </div>
            </div>

            <div style={{ width: '1px', height: '32px', background: 'rgba(255, 255, 255, 0.1)' }} />

            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FBBC04' }}>
                {totalTracks}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
                Tech Tracks
              </div>
            </div>

            {isAuthenticated && enrolledCount > 0 && (
              <>
                <div style={{ width: '1px', height: '32px', background: 'rgba(255, 255, 255, 0.1)' }} />
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#A855F7' }}>
                    {enrolledCount}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
                    My Enrolled
                  </div>
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
              placeholder="Search courses by title, track, instructor, or committee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                }}
                title="Clear search"
              >
                <X size={16} />
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

        {/* Dropdowns row: Committee & Track */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', width: '100%' }}>
          {/* Committee Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flex: '1 1 220px', minWidth: 0, maxWidth: '100%' }}>
            <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600, flexShrink: 0 }}>Committee:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
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
                All Committees
              </option>
              {departments.map((d) => (
                <option key={d.id} value={d.id} style={{ background: '#0F172A', color: '#FFFFFF' }}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Category / Track Filter */}
          {categories.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flex: '1 1 180px', minWidth: 0, maxWidth: '100%' }}>
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

      {/* Courses Cards Grid */}
      {filteredCourses.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '4rem 2rem',
            borderRadius: '20px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <BookOpen size={48} style={{ color: '#64748B', margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 0.5rem 0' }}>
            No Courses Found
          </h3>
          <p style={{ color: '#94A3B8', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
            {hasActiveFilters
              ? 'No courses match your active search filters or committee selection.'
              : 'There are currently no published courses available. Check back soon!'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                background: '#4285F4',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.88rem',
                border: 'none',
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {filteredCourses.map((course) => {
            const isEnrolled = course.my_enrollment_status === 'confirmed';
            const isPending = course.my_enrollment_status === 'pending';
            const isWaitlisted = course.my_enrollment_status === 'waitlisted';
            const hoursEst = Math.round(course.total_duration_minutes / 60);

            return (
              <div
                key={course.id}
                className="glass-panel"
                style={{
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                  background: 'rgba(15, 23, 42, 0.65)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'rgba(66, 133, 244, 0.4)';
                  e.currentTarget.style.boxShadow = '0 12px 28px -6px rgba(0, 0, 0, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Cover Banner */}
                <div
                  style={{
                    height: '140px',
                    position: 'relative',
                    background: course.cover_image_url
                      ? `url(${course.cover_image_url}) center/cover no-repeat`
                      : 'linear-gradient(135deg, rgba(66, 133, 244, 0.3) 0%, rgba(52, 168, 83, 0.2) 100%)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(to bottom, rgba(15, 23, 42, 0.1) 0%, rgba(15, 23, 42, 0.85) 100%)',
                    }}
                  />

                  {/* Top Badges */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '0.85rem',
                      left: '0.85rem',
                      right: '0.85rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    {course.category ? (
                      <span
                        style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: 'rgba(15, 23, 42, 0.85)',
                          color: '#60A5FA',
                          border: '1px solid rgba(66, 133, 244, 0.3)',
                          backdropFilter: 'blur(8px)',
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
                          gap: '0.3rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: 'rgba(52, 168, 83, 0.9)',
                          color: '#FFFFFF',
                          boxShadow: '0 2px 8px rgba(52, 168, 83, 0.4)',
                        }}
                      >
                        <CheckCircle2 size={12} />
                        Enrolled
                      </span>
                    ) : isPending ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: 'rgba(251, 188, 4, 0.9)',
                          color: '#0F172A',
                          boxShadow: '0 2px 8px rgba(251, 188, 4, 0.4)',
                        }}
                      >
                        <Clock3 size={12} />
                        Pending Approval
                      </span>
                    ) : isWaitlisted ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: 'rgba(168, 85, 247, 0.9)',
                          color: '#FFFFFF',
                        }}
                      >
                        Waitlisted
                      </span>
                    ) : course.is_full ? (
                      <span
                        style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: 'rgba(234, 67, 53, 0.85)',
                          color: '#FFFFFF',
                        }}
                      >
                        Full
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: 'rgba(15, 23, 42, 0.85)',
                          color: '#34D399',
                          border: '1px solid rgba(52, 168, 83, 0.3)',
                          backdropFilter: 'blur(8px)',
                        }}
                      >
                        {course.enrollment_type === 'open' ? 'Open Enrollment' : 'Gated Entry'}
                      </span>
                    )}
                  </div>

                  {/* Committee tag bottom-left of cover */}
                  {course.department_name && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '0.65rem',
                        left: '0.85rem',
                        fontSize: '0.74rem',
                        color: '#CBD5E1',
                        fontWeight: 600,
                        textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
                      }}
                    >
                      {course.department_name}
                    </div>
                  )}
                </div>

                {/* Card Content Body */}
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <h3
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      color: '#FFFFFF',
                      margin: '0 0 0.5rem 0',
                      lineHeight: 1.35,
                    }}
                  >
                    {course.title}
                  </h3>

                  <p
                    style={{
                      color: '#94A3B8',
                      fontSize: '0.84rem',
                      lineHeight: 1.5,
                      margin: '0 0 1.25rem 0',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      flex: 1,
                    }}
                  >
                    {course.description || 'Comprehensive curriculum covering core concepts and practical real-world engineering.'}
                  </p>

                  {/* Stats Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.75rem 0',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      marginBottom: '1rem',
                      fontSize: '0.78rem',
                      color: '#CBD5E1',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={14} style={{ color: '#60A5FA' }} />
                      <span>{course.sessions_count} Sessions</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={14} style={{ color: '#34D399' }} />
                      <span>~{hoursEst} hrs</span>
                    </div>

                    {course.capacity && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
                        <Users size={14} style={{ color: '#FBBF24' }} />
                        <span>{course.enrollment_count}/{course.capacity}</span>
                      </div>
                    )}
                  </div>

                  {/* Teaching Staff Avatars & Footer Action */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                      {course.instructors.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {course.instructors.slice(0, 3).map((ins, idx) => (
                            <div
                              key={ins.id}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: idx === 0 ? '#4285F4' : '#10B981',
                                border: '2px solid #0F172A',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                marginLeft: idx > 0 ? '-8px' : '0',
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
                                ins.full_name.slice(0, 1).toUpperCase()
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <span
                        style={{
                          fontSize: '0.76rem',
                          color: '#94A3B8',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {course.instructors.length > 0
                          ? course.instructors[0].full_name + (course.instructors.length > 1 ? ` +${course.instructors.length - 1}` : '')
                          : 'GDGoC Staff'}
                      </span>
                    </div>

                    {/* View Course Link */}
                    <Link
                      href={`/student/courses/${course.id}`}
                      style={{
                        padding: '0.45rem 0.85rem',
                        borderRadius: '8px',
                        background: 'rgba(66, 133, 244, 0.15)',
                        border: '1px solid rgba(66, 133, 244, 0.3)',
                        color: '#60A5FA',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      View
                      <ArrowRight size={13} />
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
