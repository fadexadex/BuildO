"use client";

import { WalletProvider } from "@/contexts/WalletContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <WalletProvider>
        {children}
        <Toaster />
      </WalletProvider>
    </ErrorBoundary>
  );
}

