import { useEffect } from 'react';

/**
 * Auto-refresh hook that redirects to login after inactivity
 * @param {number} timeoutMinutes - Minutes of inactivity before redirect
 */
export const useAutoRefresh = (timeoutMinutes = 30) => {
  useEffect(() => {
    let timeoutId;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        window.location.href = '/';
      }, timeoutMinutes * 60 * 1000);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    // Initialize timer
    resetTimer();

    // Add event listeners to reset timer on user activity
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [timeoutMinutes]);
};

export default useAutoRefresh;

