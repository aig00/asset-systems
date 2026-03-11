/**
 * Device detection utilities
 * Used to detect if user is accessing from mobile device or small screen
 */

// Common mobile device keywords in user agent
const MOBILE_KEYWORDS = [
  'Android',
  'webOS',
  'iPhone',
  'iPad',
  'iPod',
  'BlackBerry',
  'IEMobile',
  'Opera Mini',
  'Mobile',
  'mobile',
];

/**
 * Check if the user agent indicates a mobile device
 * @returns {boolean} True if mobile device detected
 */
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  return MOBILE_KEYWORDS.some(keyword => userAgent.includes(keyword));
};

/**
 * Check if the screen width is below the desktop threshold
 * @param {number} breakpoint - The breakpoint in pixels (default: 1024)
 * @returns {boolean} True if screen is smaller than breakpoint
 */
export const isSmallScreen = (breakpoint = 1024) => {
  if (typeof window === 'undefined') return false;
  
  return window.innerWidth < breakpoint;
};

/**
 * Combined check for mobile device or small screen
 * @param {number} breakpoint - The breakpoint in pixels (default: 1024)
 * @returns {boolean} True if mobile device or small screen detected
 */
export const isMobileOrSmallScreen = (breakpoint = 1024) => {
  return isMobileDevice() || isSmallScreen(breakpoint);
};

/**
 * Get current device type info
 * @param {number} breakpoint - The breakpoint in pixels (default: 1024)
 * @returns {object} Device information object
 */
export const getDeviceInfo = (breakpoint = 1024) => {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isSmallScreen: false,
      screenWidth: 0,
      userAgent: '',
    };
  }

  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  return {
    isMobile: isMobileDevice(),
    isSmallScreen: isSmallScreen(breakpoint),
    screenWidth: window.innerWidth,
    userAgent,
    isDesktop: !isMobileOrSmallScreen(breakpoint),
  };
};

