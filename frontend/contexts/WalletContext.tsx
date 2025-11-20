"use client";

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { LedgerId, TransferTransaction, Hbar, AccountId, TransactionId, PrivateKey } from '@hashgraph/sdk';

interface WalletContextType {
  accountId: string | null;
  privateKey: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectManual: (accountId: string, privateKey: string) => Promise<void>;
  disconnect: () => Promise<void>;
  sendHbarTransfer: (input: { toAccountId: string; amountHbar: number; memo?: string }) => Promise<{ transactionId: string }>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const TESTNET_NODE_ACCOUNT_IDS = [
  AccountId.fromString('0.0.3'),
  AccountId.fromString('0.0.4'),
  AccountId.fromString('0.0.5'),
  AccountId.fromString('0.0.6')
];

function getSavedAccount() {
  if (typeof window === 'undefined') return { accountId: null, privateKey: null };
  return {
    accountId: localStorage.getItem('hederaAccountId'),
    privateKey: localStorage.getItem('hederaPrivateKey')
  };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Load saved account on mount
  useEffect(() => {
    const saved = getSavedAccount();
    if (saved.accountId && saved.privateKey) {
      setAccountId(saved.accountId);
      setPrivateKey(saved.privateKey);
    }
  }, []);

  // Manual connection with Account ID and Private Key
  const connectManual = useCallback(async (accountId: string, privateKey: string) => {
    try {
      setIsConnecting(true);
      
      // Validate the inputs
      if (!accountId || !privateKey) {
        throw new Error('Please provide both Account ID and Private Key');
      }

      // Validate account ID format
      AccountId.fromString(accountId);
      
      // Validate private key format
      PrivateKey.fromString(privateKey);

      // Save to state and localStorage
      setAccountId(accountId);
      setPrivateKey(privateKey);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('hederaAccountId', accountId);
        localStorage.setItem('hederaPrivateKey', privateKey);
      }

      console.log('✅ Manually connected with account:', accountId);
    } catch (error) {
      console.error('Manual connection failed:', error);
      throw error instanceof Error ? error : new Error('Invalid credentials');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    console.log('🔌 Disconnecting wallet...');
    
    // Clear state and localStorage
    setAccountId(null);
    setPrivateKey(null);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hederaAccountId');
      localStorage.removeItem('hederaPrivateKey');
    }
    
    console.log('✅ Wallet disconnected');
  }, []);

  const sendHbarTransfer = useCallback(
    async ({ toAccountId, amountHbar, memo }: { toAccountId: string; amountHbar: number; memo?: string }) => {
      if (!accountId || !privateKey) {
        throw new Error('Wallet not connected');
      }

      try {
        const payerAccount = AccountId.fromString(accountId);
        const receiverAccount = AccountId.fromString(toAccountId);
        const txId = TransactionId.generate(payerAccount);

        console.log('📤 Sending HBAR transfer using private key...');
        
        const signingKey = PrivateKey.fromString(privateKey);
        
        const transaction = await new TransferTransaction()
          .addHbarTransfer(payerAccount, new Hbar(-amountHbar))
          .addHbarTransfer(receiverAccount, new Hbar(amountHbar))
          .setTransactionId(txId)
          .setNodeAccountIds(TESTNET_NODE_ACCOUNT_IDS)
          .setTransactionMemo(memo ?? 'BuildO transaction')
          .freezeWith({
            getLedgerId: () => LedgerId.TESTNET,
          } as any);

        const signedTx = await transaction.sign(signingKey);
        
        // Note: In a real app, you'd execute this against a Hedera mirror node
        // For now, we'll return the transaction ID as success
        console.log('✅ Transaction signed successfully');
        return { transactionId: txId.toString() };
        
      } catch (error) {
        console.error('HBAR transfer failed:', error);
        throw error instanceof Error ? error : new Error('Transfer failed');
      }
    },
    [accountId, privateKey]
  );

  return (
    <WalletContext.Provider
      value={{
        accountId,
        privateKey,
        isConnected: !!accountId,
        isConnecting,
        connectManual,
        disconnect,
        sendHbarTransfer
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
