import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * Wraps page content with a fade-in transition animation
 * Triggers on route changes for smooth navigation experience
 */
export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Reset visibility on route change
    setIsVisible(false);
    
    // Small delay to ensure CSS transition is triggered
    const timer = setTimeout(() => setIsVisible(true), 10);
    
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div
      className={`transition-opacity duration-300 ease-in-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {children}
    </div>
  );
}
