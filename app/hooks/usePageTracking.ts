/**
 * usePageTracking Hook
 * Automatically tracks page views in GA4 and Mixpanel
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { trackPageView, trackEvent } from '~/utils/analytics';

/**
 * Hook to track page views automatically
 * Call this in your root layout or main component
 */
export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    // Track page view whenever location changes
    trackPageView(location.pathname, document.title);
    
    // Track as custom event as well
    trackEvent('page_view', {
      path: location.pathname,
      title: document.title,
      timestamp: new Date().toISOString(),
    });
  }, [location.pathname]);
}

/**
 * Hook to track user interactions
 */
export function useEventTracking() {
  return {
    trackClick: (elementName: string, metadata?: Record<string, any>) => {
      trackEvent('click', {
        element: elementName,
        ...metadata,
      });
    },
    trackFormSubmit: (formName: string, metadata?: Record<string, any>) => {
      trackEvent('form_submit', {
        form: formName,
        ...metadata,
      });
    },
    trackScroll: (section: string) => {
      trackEvent('scroll', {
        section,
        timestamp: new Date().toISOString(),
      });
    },
    trackVideoPlay: (videoId: string, videoTitle?: string) => {
      trackEvent('video_play', {
        video_id: videoId,
        video_title: videoTitle,
      });
    },
    trackDownload: (fileName: string, fileType?: string) => {
      trackEvent('download', {
        file_name: fileName,
        file_type: fileType,
      });
    },
  };
}

/**
 * Hook to track user authentication events
 */
export function useAuthTracking() {
  return {
    trackSignup: (method: string, metadata?: Record<string, any>) => {
      trackEvent('signup', {
        method,
        ...metadata,
      });
    },
    trackLogin: (method: string, metadata?: Record<string, any>) => {
      trackEvent('login', {
        method,
        ...metadata,
      });
    },
    trackLogout: () => {
      trackEvent('logout', {
        timestamp: new Date().toISOString(),
      });
    },
    trackPasswordReset: () => {
      trackEvent('password_reset', {
        timestamp: new Date().toISOString(),
      });
    },
  };
}

/**
 * Hook to track conversion events
 */
export function useConversionTracking() {
  return {
    trackDonation: (amount: number, currency: string, metadata?: Record<string, any>) => {
      trackEvent('donation', {
        amount,
        currency,
        ...metadata,
      });
    },
    trackSubscription: (plan: string, price: number, metadata?: Record<string, any>) => {
      trackEvent('subscription', {
        plan,
        price,
        ...metadata,
      });
    },
    trackPurchase: (itemId: string, price: number, metadata?: Record<string, any>) => {
      trackEvent('purchase', {
        item_id: itemId,
        price,
        ...metadata,
      });
    },
  };
}
