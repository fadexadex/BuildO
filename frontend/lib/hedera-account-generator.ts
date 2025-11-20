/**
 * Hedera Testnet Account Generator
 * Automatically generates a new testnet account for users to start learning immediately
 */

import { Client, PrivateKey, AccountCreateTransaction, Hbar, AccountId } from '@hashgraph/sdk';

export interface GeneratedAccount {
    accountId: string;
    privateKey: string;
    publicKey: string;
}

const STORAGE_KEY = 'buildo_auto_account';

/**
 * Generate a new Hedera testnet account
 * Note: This creates a key pair but doesn't create the account on-chain.
 * For actual on-chain account creation, you need an operator account with HBAR.
 * 
 * For learning purposes, we'll generate a key pair that users can use
 * after they fund it via the Hedera Portal or another funded account.
 */
export function generateTestnetAccount(): GeneratedAccount {
    // Generate a new private key
    const privateKey = PrivateKey.generateECDSA();
    const publicKey = privateKey.publicKey;
    
    // Note: We can't create the account on-chain without an operator account
    // So we'll generate a key pair and the user will need to:
    // 1. Get testnet HBAR from https://portal.hedera.com/
    // 2. Create the account using the portal or another funded account
    
    return {
        accountId: '', // Will be set when account is created on-chain
        privateKey: privateKey.toString(),
        publicKey: publicKey.toString(),
    };
}

/**
 * Get or create an auto-generated account for the session
 */
export function getOrCreateAutoAccount(): GeneratedAccount {
    if (typeof window === 'undefined') {
        // Server-side: return a placeholder
        return {
            accountId: '',
            privateKey: '',
            publicKey: '',
        };
    }

    // Check if we already have an auto-account for this session
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('Failed to parse stored account:', e);
        }
    }

    // Generate a new account
    const account = generateTestnetAccount();
    
    // Store it in sessionStorage
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(account));
    
    return account;
}

/**
 * Clear the auto-generated account
 */
export function clearAutoAccount(): void {
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem(STORAGE_KEY);
    }
}

/**
 * Update the account ID after on-chain creation
 */
export function updateAccountId(accountId: string): void {
    if (typeof window === 'undefined') return;
    
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const account = JSON.parse(stored);
            account.accountId = accountId;
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(account));
        } catch (e) {
            console.error('Failed to update account ID:', e);
        }
    }
}

