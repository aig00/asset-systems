import { useState, useEffect } from 'react';
import { isMobileOrSmallScreen, getDeviceInfo } from '@/utils/deviceDetect';

/**
 * Custom hook to detect mobile device or small screen
 * Provides reactive state that updates on window resize
 * @param {number} breakpoint - The breakpoint in pixels (default: 1024)
 * @returns {object} Device detection state and info
 */
export const useDeviceDetect = (breakpoint = 1024) => {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isSmallScreen: false,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
    isDesktop: true,
  });

  useEffect(() => {
    // Initial check
    setDeviceInfo(getDeviceInfo(breakpoint));

    // Handle window resize
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo(breakpoint));
    };

    // Add event listener for resize
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [breakpoint]);

  return {
    ...deviceInfo,
    // Helper to check if access should be blocked
    shouldBlockAccess: isMobileOrSmallScreen(breakpoint),
  };
};

export default useDeviceDetect;

