'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronUp } from 'lucide-react';

interface BackToTopButtonProps {
  /** Scroll threshold (px) before the button appears — default 400 */
  threshold?: number;
}

export function BackToTopButton({ threshold = 400 }: BackToTopButtonProps) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (!mounted) return null;

  return createPortal(
    <button
      type="button"
      className="student-back-to-top"
      onClick={scrollToTop}
      aria-label="Back to top"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.35rem',
        padding: '0.55rem 0.95rem',
        borderRadius: '999px',
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(66, 133, 244, 0.35)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px rgba(66, 133, 244, 0.25)',
        color: '#FFFFFF',
        fontSize: '0.78rem',
        fontWeight: 700,
        cursor: 'pointer',
        opacity: visible ? 1 : 0,
        transform: `translateY(${visible ? '0' : '40px'})`,
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease, background 0.15s ease',
        pointerEvents: visible ? 'all' : 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(66, 133, 244, 0.35)';
        e.currentTarget.style.borderColor = 'rgba(66, 133, 244, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(15, 23, 42, 0.92)';
        e.currentTarget.style.borderColor = 'rgba(66, 133, 244, 0.35)';
      }}
    >
      <ChevronUp size={16} color="#60A5FA" />
      <span>Top</span>
    </button>,
    document.body
  );
}
