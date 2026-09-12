'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function NavigationProgressBarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);

    setIsVisible(true);
    setProgress(30);

    // Natural progress acceleration
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 70) return prev + 18;
        if (prev < 88) return prev + 6;
        if (prev < 94) return prev + 1;
        return prev;
      });
    }, 120);

    // Safety timeout to prevent stuck progress bar
    safetyTimerRef.current = setTimeout(() => {
      finishProgress();
    }, 6000);
  };

  const finishProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);

    setProgress(100);

    setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        setProgress(0);
      }, 250);
    }, 200);
  };

  // Complete progress on route/searchParam change
  useEffect(() => {
    finishProgress();
  }, [pathname, searchParams]);

  // Intercept click on internal links
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Only handle primary left click without modifier keys
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      // Traverse up to find <a> tag
      let target = e.target as HTMLElement | null;
      while (target && target.tagName !== 'A') {
        target = target.parentElement;
      }

      if (!target || target.tagName !== 'A') return;

      const anchor = target as HTMLAnchorElement;
      const href = anchor.getAttribute('href');

      if (!href) return;

      // Ignore download, external, or target="_blank"
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      // Ignore hash anchors and javascript:
      if (href.startsWith('#') || href.startsWith('javascript:')) return;

      // Check if it is an internal URL
      try {
        const url = new URL(anchor.href, window.location.origin);
        if (url.origin !== window.location.origin) return;

        // If target is the exact same page and search query, do not trigger
        const currentPath = window.location.pathname + window.location.search;
        const targetPath = url.pathname + url.search;
        if (currentPath === targetPath) return;

        // Valid internal navigation: trigger instant progress bar
        startProgress();
      } catch {
        // Ignore invalid URLs
      }
    };

    const handlePopState = () => {
      startProgress();
    };

    document.addEventListener('click', handleDocumentClick, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
      window.removeEventListener('popstate', handlePopState);
      if (timerRef.current) clearInterval(timerRef.current);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="top-nav-progress" aria-hidden="true">
      <div
        className="top-nav-progress-bar"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}

export function NavigationProgressBar() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressBarContent />
    </Suspense>
  );
}
