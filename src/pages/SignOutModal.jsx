import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, LogOut } from 'lucide-react';

export const SignOutModal = ({ isOpen, onClose, onConfirm, isSigningOut = false }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small delay to ensure DOM is present before triggering transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !isSigningOut) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isSigningOut, onClose]);

  if (!shouldRender) return null;

  return createPortal(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        .so-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          opacity: 0;
          transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .so-overlay.visible { opacity: 1; }

        .so-modal {
          background: #ffffff;
          width: 100%; max-width: 380px;
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          transform: scale(0.95) translateY(10px);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          border: 1px solid rgba(255, 255, 255, 0.8);
        }
        .so-overlay.visible .so-modal {
          transform: scale(1) translateY(0);
        }

        .dark .so-modal {
          background: #1a1a1a;
          border: 1px solid #333;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .so-content {
          padding: 32px 28px 28px;
          display: flex; flex-direction: column; align-items: center; text-align: center;
        }

        .so-icon-wrapper {
          width: 72px; height: 72px;
          border-radius: 50%;
          background: #fef2f2;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 20px;
          color: #dc2626;
          position: relative;
          box-shadow: 0 0 0 8px #fff5f5;
        }
        .dark .so-icon-wrapper {
          background: #450a0a; color: #f87171;
          box-shadow: 0 0 0 8px #2a1212;
        }

        .so-title {
          font-family: 'Syne', sans-serif;
          font-size: 22px; font-weight: 700;
          color: #111827; margin-bottom: 8px;
        }
        .dark .so-title { color: #f9fafb; }

        .so-message {
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; color: #6b7280;
          line-height: 1.5; margin-bottom: 28px;
        }
        .dark .so-message { color: #9ca3af; }

        .so-actions {
          display: flex; gap: 12px; width: 100%;
        }

        .so-btn {
          flex: 1;
          padding: 12px;
          border-radius: 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          outline: none;
        }

        .so-btn-cancel {
          background: #f3f4f6; color: #4b5563;
        }
        .so-btn-cancel:hover { background: #e5e7eb; color: #111827; }
        .dark .so-btn-cancel { background: #27272a; color: #a1a1aa; }
        .dark .so-btn-cancel:hover { background: #3f3f46; color: #e4e4e7; }

        .so-btn-confirm {
          background: linear-gradient(135deg, #dc2626, #ef4444);
          color: white;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
        }
        .so-btn-confirm:hover {
          background: linear-gradient(135deg, #b91c1c, #dc2626);
          box-shadow: 0 6px 16px rgba(220, 38, 38, 0.3);
          transform: translateY(-1px);
        }
        .so-btn-confirm:disabled {
          opacity: 0.7; cursor: not-allowed; transform: none;
        }
      `}</style>
      <div 
        className={`so-overlay ${isVisible ? 'visible' : ''}`}
        onClick={() => !isSigningOut && onClose()}
        role="dialog"
        aria-modal="true"
      >
        <div className="so-modal" onClick={(e) => e.stopPropagation()}>
          <div className="so-content">
            <div className="so-icon-wrapper">
              <LogOut size={32} strokeWidth={2.5} />
            </div>
            <h3 className="so-title">Sign Out</h3>
            <p className="so-message">
              Are you sure you want to end your session? You will need to sign in again to access your account.
            </p>
            <div className="so-actions">
              <button 
                className="so-btn so-btn-cancel"
                onClick={onClose}
                disabled={isSigningOut}
              >
                Cancel
              </button>
              <button 
                className="so-btn so-btn-confirm"
                onClick={onConfirm}
                disabled={isSigningOut}
              >
                {isSigningOut ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Signing out...</span>
                  </>
                ) : (
                  'Sign Out'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};