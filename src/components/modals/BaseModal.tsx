import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** 'none' = no dimming behind the dialog; 'dim' = light scrim */
  backdrop?: 'none' | 'dim';
}

export function BaseModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = 'md',
  backdrop = 'dim',
}: BaseModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleFocusTrap = (event: KeyboardEvent) => {
      if (!modalRef.current || !isOpen) return;

      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', handleFocusTrap);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleFocusTrap);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleFocusTrap);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-[min(100%,calc(100vw-1.5rem))] max-h-[min(100%,calc(100vh-1.5rem))] flex flex-col min-h-0',
  };

  const isFullSize = maxWidth === 'full';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={handleOverlayClick}
    >
      {/* Backdrop: avoid solid black — use transparent or a light scrim */}
      <div
        className={
          backdrop === 'none'
            ? 'absolute inset-0 bg-transparent'
            : 'absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]'
        }
        aria-hidden="true"
      />
      
      {/* Modal content */}
      <div
        ref={modalRef}
        className={`relative z-10 w-full ${maxWidthClasses[maxWidth]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div
          className={`bg-card rounded-xl shadow-2xl border border-border/80 flex flex-col min-h-0 ${
            isFullSize ? 'max-h-full' : ''
          }`}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between px-6 py-4 border-b border-border bg-muted/50">
            <h2 id="modal-title" className="text-xl font-semibold text-foreground">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground/70 hover:text-muted-foreground hover:bg-gray-200 transition-colors duration-200"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className={`p-6 ${isFullSize ? 'overflow-y-auto flex-1 min-h-0' : ''}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
