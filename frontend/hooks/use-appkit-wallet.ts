'use client'

import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { useCallback } from 'react'
import type { Provider } from '@reown/appkit-adapter-wagmi'

interface WalletContextType {
  accountId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  provider: 'appkit' | 'manual';
  connectionState: string | null;
  sendHbarTransfer: (input: { toAccountId: string; amountHbar: number; memo?: string }) => Promise<{ transactionId: string }>;
}

export function useAppKitWallet(): WalletContextType {
  const { open, close } = useAppKit()
  const { address, isConnected, caipAddress } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')

  const connect = useCallback(async () => {
    await open()
  }, [open])

  const disconnect = useCallback(async () => {
    await open({ view: 'Account' })
  }, [open])

  const sendHbarTransfer = useCallback(
    async ({ toAccountId, amountHbar, memo }: { toAccountId: string; amountHbar: number; memo?: string }) => {
      if (!isConnected) {
        throw new Error('Wallet not connected')
      }

      if (!walletProvider) {
        throw new Error('Wallet provider is not ready yet')
      }

      try {
        // For Hedera transfers, we'll need to implement this with the Hedera SDK
        // For now, returning a placeholder
        console.log('Hedera transfer:', { toAccountId, amountHbar, memo })
        
        // TODO: Implement actual Hedera transfer logic here
        // This would require using the Hedera SDK with the connected wallet
        
        return { transactionId: 'pending-implementation' }
      } catch (error) {
        console.error('Transfer failed:', error)
        throw error instanceof Error ? error : new Error('Transfer failed')
      }
    },
    [isConnected, walletProvider]
  )

  return {
    accountId: address || null,
    isConnected,
    isConnecting: false,
    connect,
    disconnect,
    provider: 'appkit',
    connectionState: isConnected ? 'Connected' : 'Disconnected',
    sendHbarTransfer
  }
}


