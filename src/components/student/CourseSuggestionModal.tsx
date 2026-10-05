'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  X,
  Users,
  Clock,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import { SuggestedCourseItem } from '@/app/student/courses/actions';

interface CourseSuggestionModalProps {
  courses: SuggestedCourseItem[];
  onDismiss: () => void;
}

export function CourseSuggestionModal({ courses, onDismiss }: CourseSuggestionModalProps) {
  if (!courses || courses.length === 0) return null;

  const featuredCourse = courses[0];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99990, // Positioned right below mandatory social gate (99999) if both exist
        padding: '1rem',
        animation: 'fadeIn 0.25s ease',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 480,
          borderRadius: 24,
          padding: '1.75rem',
          background: '#0B1120',
          border: '1px solid rgba(66, 133, 244, 0.35)',
          boxShadow:
            '0 25px 60px -12px rgba(0, 0, 0, 0.9), 0 0 45px -10px rgba(66, 133, 244, 0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top Google 4-Color Accent Strip */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3.5px',
            background:
              'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          }}
        />

        {/* Close / Dismiss Button */}
        <button
          type="button"
          onClick={onDismiss}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94A3B8',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title="Dismiss"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Header Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.25rem 0.75rem',
            borderRadius: 999,
            background: 'rgba(66, 133, 244, 0.15)',
            border: '1px solid rgba(66, 133, 244, 0.3)',
            color: '#60A5FA',
            fontSize: '0.72rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '0.75rem',
          }}
        >
          <Sparkles size={13} color="#60A5FA" />
          Recommended Track
        </div>

        {/* Title & Subtitle */}
        <h2
          style={{
            fontSize: '1.35rem',
            fontWeight: 900,
            color: '#FFFFFF',
            margin: '0 0 0.35rem',
            letterSpacing: '-0.01em',
            paddingRight: '2rem',
          }}
        >
          Ready to Start Learning? 🚀
        </h2>
        <p
          style={{
            color: '#94A3B8',
            fontSize: '0.82rem',
            lineHeight: 1.5,
            margin: '0 0 1.25rem',
          }}
        >
          You haven't enrolled in any tracks yet. Explore our open developer programs and kickstart your journey.
        </p>

        {/* Featured Course Card */}
        <div
          style={{
            borderRadius: 16,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(66, 133, 244, 0.25)',
            padding: '1.1rem',
            marginBottom: '1.25rem',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem',
            }}
          >
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.15rem 0.55rem',
                borderRadius: '6px',
                background: 'rgba(66, 133, 244, 0.2)',
                color: '#93C5FD',
              }}
            >
              {featuredCourse.category}
            </span>
            {featuredCourse.sessions_count > 0 && (
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <Clock size={12} />
                {featuredCourse.sessions_count} Sessions
              </span>
            )}
          </div>

          <h3
            style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: '0 0 0.4rem',
              lineHeight: 1.35,
            }}
          >
            {featuredCourse.title}
          </h3>

          {featuredCourse.description && (
            <p
              style={{
                fontSize: '0.78rem',
                color: '#94A3B8',
                margin: '0 0 0.85rem',
                lineHeight: 1.45,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {featuredCourse.description}
            </p>
          )}

          {/* Instructor & Actions Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4285F4, #34A853)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  overflow: 'hidden',
                }}
              >
                {featuredCourse.instructor_avatar ? (
                  <img
                    src={featuredCourse.instructor_avatar}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  featuredCourse.instructor_name?.charAt(0) || 'G'
                )}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#CBD5E1', fontWeight: 600 }}>
                {featuredCourse.instructor_name}
              </span>
            </div>

            <Link
              href={`/student/courses/${featuredCourse.id}`}
              onClick={onDismiss}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.9rem',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
                color: '#FFFFFF',
                fontSize: '0.8rem',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(66, 133, 244, 0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              <span>View & Enroll</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <button
            type="button"
            onClick={onDismiss}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '0.4rem 0.6rem',
              transition: 'color 0.15s ease',
            }}
          >
            Maybe Later
          </button>

          <Link
            href="/student/courses"
            onClick={onDismiss}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: '#60A5FA',
              fontSize: '0.8rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <span>Browse All Tracks ({courses.length})</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
