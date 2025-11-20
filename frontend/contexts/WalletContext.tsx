"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getOrCreateAutoAccount, clearAutoAccount } from '@/lib/hedera-account-generator';

interface WalletContextType {
    accountId: string;
    privateKey: string;
    isConnected: boolean;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    connector: null;
    connectionMethod: 'auto' | null;
}

const WalletContext = createContext<WalletContextType>({
    accountId: '',
    privateKey: '',
    isConnected: false,
    connect: async () => {},
    disconnect: async () => {},
    connector: null,
    connectionMethod: null,
});

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
    const [accountId, setAccountId] = useState<string>('');
    const [privateKey, setPrivateKey] = useState<string>('');
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [connectionMethod, setConnectionMethod] = useState<'auto' | null>(null);

    // Auto-connect with generated account on mount
    useEffect(() => {
        // Check if there's a saved account from previous session
        const savedAccountId = typeof window !== 'undefined' ? sessionStorage.getItem('hedera_account_id') : null;
        const savedPrivateKey = typeof window !== 'undefined' ? sessionStorage.getItem('hedera_private_key') : null;
        
        if (savedAccountId && savedPrivateKey) {
            // Use saved account
            setAccountId(savedAccountId);
            setPrivateKey(savedPrivateKey);
            setIsConnected(true);
            setConnectionMethod('auto');
        } else {
            // Generate and auto-connect with a new account
            const autoAccount = getOrCreateAutoAccount();
            setPrivateKey(autoAccount.privateKey);
            setIsConnected(true);
            setConnectionMethod('auto');
            
            // Note: accountId will be empty until the account is created on-chain
            // For now, users can use the private key to interact with the chain
            // The account will be created when they first use it (if they have testnet HBAR)
        }
    }, []);

    const connect = useCallback(async () => {
        // Just ensure we're connected with auto account
        if (!isConnected) {
            const autoAccount = getOrCreateAutoAccount();
            setPrivateKey(autoAccount.privateKey);
            setIsConnected(true);
            setConnectionMethod('auto');
        }
    }, [isConnected]);

    const disconnect = useCallback(async () => {
        // Clear auto account
        clearAutoAccount();
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('hedera_account_id');
            sessionStorage.removeItem('hedera_private_key');
        }
        setAccountId('');
        setPrivateKey('');
        setIsConnected(false);
        setConnectionMethod(null);
    }, []);

    const contextValue = {
        accountId,
        privateKey,
        isConnected,
        connect,
        disconnect,
        connector: null,
        connectionMethod,
    };

    return (
        <WalletContext.Provider value={contextValue}>
            {children}
        </WalletContext.Provider>
    );
};
