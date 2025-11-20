# Reown AppKit Integration Guide

This document explains the Reown AppKit integration in this Next.js application.

## What Changed

The wallet connection system has been updated from HashConnect to **Reown AppKit**, which provides:
- Universal wallet connectivity across multiple chains
- Support for EVM, Solana, Bitcoin, and Hedera networks
- Modern, customizable UI components
- Social login options
- Better SSR support for Next.js

## Files Created/Modified

### New Files:
1. **`config/index.tsx`** - Wagmi adapter configuration with network setup
2. **`contexts/AppKitContext.tsx`** - AppKit provider with SSR support
3. **`hooks/use-appkit-wallet.ts`** - Custom hook wrapping AppKit functionality
4. **`global.d.ts`** - TypeScript declarations for AppKit web components
5. **`components/ConnectWallet.tsx`** - Example component using AppKit button
6. **`.env.local`** - Environment variables (needs manual creation - see below)

### Modified Files:
1. **`contexts/WalletContext.tsx`** - Now re-exports the AppKit hook for backward compatibility
2. **`components/Providers.tsx`** - Updated to use AppKitProvider
3. **`app/layout.tsx`** - Made async to support SSR with cookies
4. **`next.config.mjs`** - Added AppKit webpack externals
5. **`package.json`** - Added AppKit dependencies

## Required Manual Steps

### 1. Create `.env.local` File

⚠️ **IMPORTANT**: Due to security restrictions, the `.env.local` file needs to be created manually.

Create a file named `.env.local` in the `frontend` directory with the following content:

```env
NEXT_PUBLIC_PROJECT_ID="1d22957abec62a8dececcec96d61abbc"
```

This uses your existing WalletConnect Project ID. If you need a new one, get it from [Reown Dashboard](https://dashboard.reown.com).

## How to Use

### Option 1: Using the AppKit Button Component (Recommended)

The simplest way to add wallet connectivity is using the `<appkit-button>` web component:

```tsx
export default function YourComponent() {
  return (
    <div>
      <h1>Connect Your Wallet</h1>
      <appkit-button />
    </div>
  )
}
```

No import needed - it's a global web component!

### Option 2: Using the Wallet Hook

For existing components using `useWallet`, no changes are needed! The hook has been updated to use AppKit under the hood:

```tsx
import { useWallet } from "@/contexts/WalletContext"

export default function YourComponent() {
  const { accountId, isConnected, connect, disconnect } = useWallet()
  
  return (
    <div>
      {isConnected ? (
        <div>
          <p>Connected: {accountId}</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <button onClick={connect}>Connect Wallet</button>
      )}
    </div>
  )
}
```

### Option 3: Using AppKit Hooks Directly

You can also use AppKit hooks directly:

```tsx
'use client'

import { useAppKit, useAppKitAccount } from '@reown/appkit/react'

export default function YourComponent() {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  
  return (
    <div>
      {isConnected ? (
        <p>Connected: {address}</p>
      ) : (
        <button onClick={() => open()}>Connect Wallet</button>
      )}
    </div>
  )
}
```

## Supported Networks

The current configuration supports:
- **Hedera Testnet** (default)
- Ethereum Mainnet
- Arbitrum

To add more networks, edit `config/index.tsx`:

```tsx
import { mainnet, arbitrum, hedera, polygon, base } from '@reown/appkit/networks'

export const networks: [Chain, ...Chain[]] = [hedera, mainnet, arbitrum, polygon, base]
```

## Testing the Integration

1. **Create the `.env.local` file** (see above)
2. **Restart your dev server**:
   ```bash
   npm run dev
   ```
3. **Visit your app** - The AppKit should initialize automatically
4. **Click the connect button** - You should see the AppKit modal

## Hedera-Specific Features

The `sendHbarTransfer` function in the wallet hook is currently a placeholder. To implement Hedera transfers with AppKit, you'll need to:

1. Use the Hedera SDK alongside AppKit
2. Get the wallet provider from AppKit
3. Use it to sign Hedera transactions

Example implementation would look like:

```tsx
// In use-appkit-wallet.ts
const sendHbarTransfer = async ({ toAccountId, amountHbar, memo }) => {
  // Get the provider from AppKit
  const provider = walletProvider
  
  // Create and sign Hedera transaction using the provider
  // Implementation depends on how AppKit exposes the Hedera provider
}
```

## Troubleshooting

### Modal doesn't appear
- Check that `.env.local` exists with the correct `NEXT_PUBLIC_PROJECT_ID`
- Restart your dev server after creating `.env.local`
- Check browser console for errors

### TypeScript errors on `<appkit-button>`
- Make sure `global.d.ts` exists in the project root
- Restart your TypeScript server

### Build errors
- Ensure all dependencies are installed: `npm install`
- Check that `next.config.mjs` includes the webpack externals

## Learn More

- [Reown AppKit Documentation](https://docs.reown.com/appkit/next/core/installation)
- [Wagmi Documentation](https://wagmi.sh/)
- [Hedera Network](https://hedera.com/)

## Migration Notes

All existing components using `useWallet` from `@/contexts/WalletContext` will continue to work without modifications. The interface remains the same:

- ✅ `accountId` - Connected wallet address
- ✅ `isConnected` - Connection status
- ✅ `connect()` - Opens connection modal
- ✅ `disconnect()` - Opens account modal (where user can disconnect)
- ⚠️ `sendHbarTransfer()` - Requires implementation for Hedera transfers

The old HashConnect implementation has been replaced but the API remains compatible.


