import React from 'react';
import { useDeviceDetect } from '@/hooks/useDeviceDetect';
import { MOBILE_BREAKPOINT } from '@/config/constants';

/**
 * MobileBlocker Component
 * Displays a "Mobile Version Coming Soon" message and blocks access
 * when user is on a mobile device or small screen
 */
const MobileBlocker = ({ breakpoint = MOBILE_BREAKPOINT, children }) => {
  const { shouldBlockAccess, screenWidth, isMobile } = useDeviceDetect(breakpoint);

  // If not on mobile/small screen, render children normally
  if (!shouldBlockAccess) {
    return children;
  }

  // Block access and show message
  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="mb-6">
          <svg 
            className="w-24 h-24 mx-auto text-red-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" 
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-4">
          Mobile Version Coming Soon
        </h1>

        {/* Description */}
        <p className="text-gray-400 mb-6">
          We're currently working on a mobile-friendly version of the Asset Management System. 
          Please access the system using a desktop or laptop computer with a screen width 
          of at least {breakpoint}px.
        </p>

        {/* Device Info (for debugging) */}
        <div className="text-sm text-gray-500 space-y-1">
          <p>Current screen width: {screenWidth}px</p>
          <p>Mobile device detected: {isMobile ? 'Yes' : 'No'}</p>
          <p>Minimum required: {breakpoint}px</p>
        </div>

        {/* Decorative loading animation */}
        <div className="mt-8 flex justify-center">
          <div className="animate-pulse flex space-x-2">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <div className="w-3 h-3 bg-red-600 rounded-full animation-delay-200"></div>
            <div className="w-3 h-3 bg-red-600 rounded-full animation-delay-400"></div>
          </div>
        </div>
      </div>

      {/* Custom styles for animation delay */}
      <style>{`
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
      `}</style>
    </div>
  );
};

export default MobileBlocker;

