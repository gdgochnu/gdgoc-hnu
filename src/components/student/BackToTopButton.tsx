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
      onClick={scrollToTop}
      aria-label="Back to top"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? '0' : '80px'})`,
        zIndex: 999990,
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.5rem 1rem',
        borderRadius: '999px',
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
        color: '#E2E8F0',
        fontSize: '0.8rem',
        fontWeight: 700,
        cursor: 'pointer',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease',
        pointerEvents: visible ? 'all' : 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(66, 133, 244, 0.25)';
        e.currentTarget.style.borderColor = 'rgba(66, 133, 244, 0.45)';
        e.currentTarget.style.color = '#FFFFFF';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(15, 23, 42, 0.9)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        e.currentTarget.style.color = '#E2E8F0';
      }}
    >
      <ChevronUp size={15} />
      <span>Back to Top</span>
    </button>,
    document.body
  );
}
