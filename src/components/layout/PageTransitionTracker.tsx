'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function PageTransitionTracker({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Avoid firing on initial page load
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Dispatched when the new page component has actually been committed and painted to the DOM
    window.dispatchEvent(new CustomEvent('page-navigation-complete'));
  }, [children, pathname]);

  return <>{children}</>;
}
