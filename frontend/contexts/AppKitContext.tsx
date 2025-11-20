'use client'

import React, { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, cookieToInitialState, type Config } from 'wagmi'
import { createAppKit } from '@reown/appkit/react'
import { config, networks, projectId, wagmiAdapter } from '@/config'
import { hedera } from '@reown/appkit/networks'

const queryClient = new QueryClient()

const metadata = {
  name: 'BuildO - Agentic Hedera Playground',
  description: 'Interactive Hedera development environment with AI assistance',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://buildo.app',
  icons: [typeof window !== 'undefined' ? `${window.location.origin}/placeholder-logo.svg` : 'https://buildo.app/placeholder-logo.svg'],
}

// Initialize AppKit *outside* the component render cycle
if (!projectId) {
  console.error("AppKit Initialization Error: Project ID is missing.");
} else {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId: projectId!,
    networks: networks,
    defaultNetwork: hedera, // Default to Hedera testnet
    metadata,
    features: { analytics: true },
  })
}

export default function AppKitProvider({
  children,
  cookies,
}: {
  children: ReactNode
  cookies: string | null
}) {
  // Calculate initial state for Wagmi SSR hydration
  const initialState = cookieToInitialState(config as Config, cookies)

  return (
    <WagmiProvider config={config as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}


