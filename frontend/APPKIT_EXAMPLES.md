# AppKit Usage Examples

Quick reference for using Reown AppKit in your components.

## Basic Connect Button

### Using the Web Component (Simplest)

```tsx
export default function Header() {
  return (
    <nav>
      <h1>My App</h1>
      <appkit-button />
    </nav>
  )
}
```

### Using the Hook

```tsx
'use client'

import { useWallet } from "@/contexts/WalletContext"
import { Button } from "@/components/ui/button"

export default function ConnectButton() {
  const { accountId, isConnected, connect, disconnect } = useWallet()
  
  if (isConnected) {
    return (
      <Button onClick={disconnect}>
        {accountId?.slice(0, 6)}...{accountId?.slice(-4)}
      </Button>
    )
  }
  
  return <Button onClick={connect}>Connect Wallet</Button>
}
```

## Account Information

### Display Connected Account

```tsx
'use client'

import { useAppKitAccount } from '@reown/appkit/react'

export function AccountInfo() {
  const { address, isConnected, caipAddress, status } = useAppKitAccount()
  
  if (!isConnected) {
    return <p>Not connected</p>
  }
  
  return (
    <div>
      <p>Address: {address}</p>
      <p>CAIP Address: {caipAddress}</p>
      <p>Status: {status}</p>
    </div>
  )
}
```

## Network Information

### Display Current Network

```tsx
'use client'

import { useAppKitNetwork } from '@reown/appkit/react'

export function NetworkInfo() {
  const { chainId, caipNetworkId, networkImageId } = useAppKitNetwork()
  
  return (
    <div>
      <p>Chain ID: {chainId}</p>
      <p>CAIP Network: {caipNetworkId}</p>
    </div>
  )
}
```

### Switch Networks

```tsx
'use client'

import { useAppKitNetwork } from '@reown/appkit/react'
import { hedera, mainnet } from '@reown/appkit/networks'

export function NetworkSwitcher() {
  const { switchNetwork } = useAppKitNetwork()
  
  return (
    <div>
      <button onClick={() => switchNetwork(hedera)}>
        Switch to Hedera
      </button>
      <button onClick={() => switchNetwork(mainnet)}>
        Switch to Ethereum
      </button>
    </div>
  )
}
```

## Modal Control

### Programmatically Control Modal

```tsx
'use client'

import { useAppKit } from '@reown/appkit/react'

export function ModalController() {
  const { open, close } = useAppKit()
  
  return (
    <div>
      {/* Open to default view */}
      <button onClick={() => open()}>Open Modal</button>
      
      {/* Open to specific view */}
      <button onClick={() => open({ view: 'Account' })}>
        Open Account
      </button>
      
      <button onClick={() => open({ view: 'Networks' })}>
        Select Network
      </button>
      
      <button onClick={() => close()}>Close Modal</button>
    </div>
  )
}
```

## Checking Connection State

```tsx
'use client'

import { useAppKitState } from '@reown/appkit/react'

export function ConnectionState() {
  const { open, selectedNetworkId } = useAppKitState()
  
  return (
    <div>
      <p>Modal Open: {open ? 'Yes' : 'No'}</p>
      <p>Network: {selectedNetworkId}</p>
    </div>
  )
}
```

## Wagmi Hooks Integration

Since AppKit uses Wagmi under the hood, you can use Wagmi hooks directly:

### Read from Contract

```tsx
'use client'

import { useReadContract } from 'wagmi'

const contractAbi = [/* your ABI */]
const contractAddress = '0x...'

export function ContractReader() {
  const { data, isLoading, error } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'balanceOf',
    args: ['0x...'],
  })
  
  if (isLoading) return <p>Loading...</p>
  if (error) return <p>Error: {error.message}</p>
  
  return <p>Balance: {data?.toString()}</p>
}
```

### Write to Contract

```tsx
'use client'

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'

const contractAbi = [/* your ABI */]
const contractAddress = '0x...'

export function ContractWriter() {
  const { data: hash, writeContract } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })
  
  const handleTransfer = () => {
    writeContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: 'transfer',
      args: ['0x...', parseEther('0.1')],
    })
  }
  
  return (
    <div>
      <button onClick={handleTransfer} disabled={isConfirming}>
        {isConfirming ? 'Confirming...' : 'Transfer'}
      </button>
      {isSuccess && <p>Transaction confirmed!</p>}
    </div>
  )
}
```

## Styling the AppKit Button

The `<appkit-button>` component can be customized via CSS:

```css
/* In your CSS file */
appkit-button {
  --w3m-accent: #6d28d9; /* Primary color */
  --w3m-color-mix: #0f172a; /* Background color */
  --w3m-color-mix-strength: 10;
}
```

Or inline:

```tsx
<appkit-button 
  style={{
    '--w3m-accent': '#6d28d9',
  } as React.CSSProperties}
/>
```

## Complete Example: Header with Wallet

```tsx
'use client'

import { useWallet } from "@/contexts/WalletContext"
import { Button } from "@/components/ui/button"

export function Header() {
  const { accountId, isConnected, connect } = useWallet()
  
  return (
    <header className="flex items-center justify-between p-4">
      <h1 className="text-2xl font-bold">BuildO</h1>
      
      <div className="flex items-center gap-4">
        {isConnected ? (
          <>
            <span className="text-sm text-muted-foreground">
              {accountId?.slice(0, 6)}...{accountId?.slice(-4)}
            </span>
            <appkit-button />
          </>
        ) : (
          <Button onClick={connect}>
            Connect Wallet
          </Button>
        )}
      </div>
    </header>
  )
}
```

## Using in Existing Components

Your existing components using `useWallet` will work without changes:

### Example: GameShell.tsx (Already Compatible!)

```tsx
'use client'

import { useWallet } from "@/contexts/WalletContext"

export function GameShell() {
  const { accountId, isConnected, connect, disconnect } = useWallet()
  
  // This code still works! No changes needed
  return (
    <button onClick={isConnected ? disconnect : connect}>
      {isConnected && accountId ? (
        <span className="font-mono">
          {accountId.slice(0, 6)}...{accountId.slice(-4)}
        </span>
      ) : (
        "Connect Wallet"
      )}
    </button>
  )
}
```

## Best Practices

1. **Use `<appkit-button />` for quick implementation** - It handles all UI states automatically
2. **Use hooks for custom UI** - When you need full control over appearance
3. **Check `isConnected` before blockchain operations** - Always verify connection state
4. **Handle loading states** - Provide feedback during async operations
5. **Error boundaries** - Wrap wallet operations in try-catch blocks

## Common Patterns

### Require Connection

```tsx
'use client'

import { useWallet } from "@/contexts/WalletContext"
import { useEffect } from "react"

export function ProtectedPage() {
  const { isConnected, connect } = useWallet()
  
  useEffect(() => {
    if (!isConnected) {
      connect()
    }
  }, [isConnected, connect])
  
  if (!isConnected) {
    return <p>Please connect your wallet...</p>
  }
  
  return <div>Protected content here</div>
}
```

### Show Different Content Based on Connection

```tsx
'use client'

import { useWallet } from "@/contexts/WalletContext"

export function ConditionalContent() {
  const { isConnected, accountId } = useWallet()
  
  return (
    <div>
      {isConnected ? (
        <div>
          <h2>Welcome, {accountId}!</h2>
          <p>You have access to premium features</p>
        </div>
      ) : (
        <div>
          <h2>Welcome!</h2>
          <p>Connect your wallet to access premium features</p>
          <appkit-button />
        </div>
      )}
    </div>
  )
}
```


