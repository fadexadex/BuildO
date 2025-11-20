"use client"

import { useEffect } from "react"

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Suppress WalletConnect-related errors if they occur
      const errorMessage = event.reason?.message || String(event.reason || '');
      if (errorMessage.includes('WalletConnect') || errorMessage.includes('formatMobileRegistry')) {
        event.preventDefault();
        console.warn('Suppressed WalletConnect error:', errorMessage);
        return;
      }
      // Log other unhandled rejections but don't crash the app
      console.warn('Unhandled promise rejection:', event.reason);
    };

    // Handle general errors
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.message || '';
      if (errorMessage.includes('WalletConnect') || errorMessage.includes('formatMobileRegistry')) {
        event.preventDefault();
        console.warn('Suppressed WalletConnect error:', errorMessage);
        return;
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return <>{children}</>;
}

