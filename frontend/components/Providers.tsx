"use client";

import { WalletProvider } from "@/contexts/WalletContext";
import { ModeProvider } from "@/contexts/ModeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <WalletProvider>
        <ModeProvider>
          {children}
        </ModeProvider>
        <Toaster />
      </WalletProvider>
    </ErrorBoundary>
  );
}

