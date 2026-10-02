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
  const [bottomOffset, setBottomOffset] = useState<string>('2rem');

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

  // Compute exact dynamic bottom offset across all page layouts and screen sizes
  useEffect(() => {
    const calculateOffset = () => {
      const isMobile = window.innerWidth <= 768;
      if (!isMobile) {
        setBottomOffset('2rem');
        return;
      }

      const stickyBar = document.querySelector('.student-mobile-sticky-bar') as HTMLElement | null;
      const mobileNav = document.querySelector('.student-mobile-bottom-nav, .student-mobile-nav') as HTMLElement | null;

      const hasStickyBar = Boolean(stickyBar && window.getComputedStyle(stickyBar).display !== 'none');
      const hasMobileNav = Boolean(mobileNav && window.getComputedStyle(mobileNav).display !== 'none');

      if (hasStickyBar && hasMobileNav) {
        // Both mobile nav (62px) and floating sticky bar (~65px) are active
        setBottomOffset('calc(150px + env(safe-area-inset-bottom, 0px))');
      } else if (hasStickyBar) {
        // Only floating sticky bar is active (e.g. guest view)
        setBottomOffset('calc(88px + env(safe-area-inset-bottom, 0px))');
      } else if (hasMobileNav) {
        // Only bottom mobile nav is active (e.g. dashboard, profile, catalog)
        setBottomOffset('calc(82px + env(safe-area-inset-bottom, 0px))');
      } else {
        // Standalone clean page
        setBottomOffset('calc(24px + env(safe-area-inset-bottom, 0px))');
      }
    };

    calculateOffset();
    window.addEventListener('resize', calculateOffset);

    // Watch DOM mutations to react immediately if bars mount/unmount dynamically
    const observer = new MutationObserver(calculateOffset);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('resize', calculateOffset);
      observer.disconnect();
    };
  }, []);

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
        position: 'fixed',
        bottom: bottomOffset,
        zIndex: 999990,
        opacity: visible ? 1 : 0,
        transform: `translateY(${visible ? '0' : '40px'})`,
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease, background 0.15s ease, bottom 0.2s ease',
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
