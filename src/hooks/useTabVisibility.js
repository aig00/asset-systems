import { useEffect, useState, useRef } from 'react';

/**
 * Hook to detect when the page becomes visible/hidden (tab switch)
 * Returns isVisible boolean state
 */
export const useTabVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
};

/**
 * Hook to handle refresh when tab becomes visible
 * Calls the provided onVisible callback when page becomes visible
 */
export const useRefreshOnTabVisible = (onVisible) => {
  const isVisible = useTabVisibility();
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    if (isVisible && !wasVisibleRef.current) {
      // Tab just became visible
      onVisible?.();
    }
    wasVisibleRef.current = isVisible;
  }, [isVisible, onVisible]);

  return isVisible;
};

/**
 * Simple callback on tab visibility change
 */
export const useOnTabVisibilityChange = (onVisible, onHidden) => {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        onHidden?.();
      } else {
        onVisible?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onVisible, onHidden]);
};
