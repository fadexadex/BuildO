# 🔐 Manual Wallet Connection Guide

## Overview

Your app now supports **manual wallet connection** by entering Account ID and Private Key directly. This is a quick, developer-friendly way to connect without dealing with wallet extensions or HashConnect SSR issues.

## ✅ What's Implemented

### Two Connection Methods:

1. **Manual Connection** (Active) - Enter credentials directly
2. **HashConnect** (Available) - For wallet extensions (HashPack/Blade)

## 🚀 How to Use

### For Users:

1. **Click "Connect Wallet"** button
2. **Enter your Hedera Testnet credentials:**
   - Account ID (e.g., `0.0.12345`)
   - Private Key (starts with `302e020100...`)
3. **Click Connect**

### For Developers:

```tsx
import { ManualWalletConnect } from '@/components/ManualWalletConnect'

function YourComponent() {
  return (
    <div>
      <h1>My App</h1>
      <ManualWalletConnect />
    </div>
  )
}
```

Or use the hook directly:

```tsx
import { useWallet } from '@/contexts/WalletContext'

function YourComponent() {
  const { accountId, isConnected, connectManual, disconnect } = useWallet()
  
  const handleManualConnect = async () => {
    try {
      await connectManual('0.0.12345', 'your-private-key')
    } catch (error) {
      console.error('Connection failed:', error)
    }
  }
  
  return (
    <div>
      {isConnected ? (
        <div>
          <p>Connected: {accountId}</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <button onClick={handleManualConnect}>Connect</button>
      )}
    </div>
  )
}
```

## 🔑 Getting Testnet Credentials

### Option 1: Hedera Portal (Recommended)

1. Visit https://portal.hedera.com
2. Sign up/Login
3. Go to **Testnet** section
4. Create a new account
5. Copy your **Account ID** and **Private Key**

### Option 2: Using Hedera SDK

```javascript
import { PrivateKey, Client } from '@hashgraph/sdk'

// Generate new keys
const privateKey = PrivateKey.generate()
const publicKey = privateKey.publicKey

console.log('Private Key:', privateKey.toString())
console.log('Public Key:', publicKey.toString())

// Then create account using Hedera portal with the public key
```

## 🔒 Security Notes

### ✅ Safe Practices:

- Credentials stored in **localStorage** (browser only)
- Private keys **never** sent to server
- Only use **testnet** credentials
- Clear browser data removes credentials

### ⚠️ Important Warnings:

- **NEVER use mainnet credentials** in this app
- **NEVER commit private keys** to git
- **NEVER share your private keys** with anyone
- This is for **development/testing** only

For production apps, use:
- HashConnect with wallet extensions
- WalletConnect protocol
- Hardware wallets

## 📡 Transaction Support

The wallet can now send HBAR transfers using your private key:

```tsx
const { sendHbarTransfer } = useWallet()

async function sendHbar() {
  try {
    const { transactionId } = await sendHbarTransfer({
      toAccountId: '0.0.98765',
      amountHbar: 1,
      memo: 'Test transfer'
    })
    console.log('Success:', transactionId)
  } catch (error) {
    console.error('Transfer failed:', error)
  }
}
```

## 🎯 API Reference

### `useWallet` Hook

```typescript
const {
  // State
  accountId,        // string | null - Current account ID
  privateKey,       // string | null - Current private key (manual mode)
  isConnected,      // boolean - Connection status
  isConnecting,     // boolean - Pairing in progress
  provider,         // 'manual' | 'hashconnect' - Connection method
  connectionState,  // HashConnectConnectionState | null
  
  // Methods
  connectManual,    // (accountId: string, privateKey: string) => Promise<void>
  connect,          // () => Promise<void> - HashConnect (future)
  disconnect,       // () => Promise<void>
  sendHbarTransfer, // (params) => Promise<{ transactionId: string }>
} = useWallet()
```

### `connectManual` Parameters

```typescript
await connectManual(
  '0.0.12345',                    // Account ID
  '302e020100300506032b657004...' // Private Key (DER-encoded hex)
)
```

### `sendHbarTransfer` Parameters

```typescript
await sendHbarTransfer({
  toAccountId: '0.0.98765',  // Recipient account ID
  amountHbar: 1,              // Amount in HBAR
  memo: 'Optional memo'       // Transaction memo (optional)
})
```

## 🎨 ManualWalletConnect Component

The pre-built component includes:

- ✅ Beautiful modal UI
- ✅ Input validation
- ✅ Error handling
- ✅ Loading states
- ✅ Connected state display
- ✅ Disconnect functionality

```tsx
<ManualWalletConnect />
```

## 🔄 Migrating from Old useWallet

If your code was using the old `useWallet` hook:

### Before:
```tsx
const { accountId, isConnected, connect, disconnect } = useWallet()
```

### After (Still works!):
```tsx
const { accountId, isConnected, connect, disconnect } = useWallet()
// Plus new features:
const { connectManual, privateKey, provider } = useWallet()
```

**No breaking changes!** All existing code continues to work.

## 🐛 Troubleshooting

### "Invalid credentials" error

- Check Account ID format (must be `0.0.xxxxx`)
- Verify Private Key is correct DER-encoded hex string
- Ensure using **testnet** credentials

### Connection doesn't persist

- Check localStorage is enabled in browser
- Verify not in incognito/private mode
- Check browser console for errors

### Transactions fail

- Verify account has sufficient HBAR balance
- Check account ID is correct
- Ensure using testnet network
- View logs in browser console

## 📊 Provider Comparison

| Feature | Manual | HashConnect |
|---------|---------|-------------|
| Setup | ✅ Instant | ⚠️ Need wallet extension |
| Security | ⚠️ Key in browser | ✅ Key in wallet |
| User Experience | 👨‍💻 Developer-friendly | 👥 User-friendly |
| Transaction Signing | ✅ Automatic | ✅ User approves |
| SSR Compatible | ✅ Yes | ⚠️ Needs dynamic import |
| Production Ready | ❌ Testing only | ✅ Yes |

## 🎯 Use Cases

### Manual Connection Best For:

- ✅ Development and testing
- ✅ Backend integration testing
- ✅ Automated testing
- ✅ Demo purposes
- ✅ Quick prototyping

### HashConnect Best For:

- ✅ Production applications
- ✅ End-user facing apps
- ✅ Multi-account support
- ✅ Enhanced security
- ✅ Wallet ecosystem integration

## 🚀 Next Steps

1. **Test Manual Connection:**
   ```bash
   npm run dev
   ```
   Visit your app and click "Connect Wallet"

2. **Get Test Credentials:**
   Visit https://portal.hedera.com

3. **Send Test Transaction:**
   Use `sendHbarTransfer` to test transfers

4. **Switch to HashConnect (Future):**
   When ready for production, use the `connect()` method instead

## 💡 Pro Tips

1. **Save Test Credentials:** Keep a test account for development
2. **Use .env for Backend:** Store test keys in `.env` for backend testing
3. **Never Mix Mainnet/Testnet:** Always verify network before transactions
4. **Check Console Logs:** Useful debugging info logged to console
5. **Test Disconnection:** Verify `disconnect()` clears data properly

## 📝 Example: Complete Integration

```tsx
'use client'

import { useWallet } from '@/contexts/WalletContext'
import { ManualWalletConnect } from '@/components/ManualWalletConnect'
import { Button } from '@/components/ui/button'

export function MyPage() {
  const { accountId, isConnected, sendHbarTransfer } = useWallet()
  
  const handleSendTest = async () => {
    if (!isConnected) return
    
    try {
      const result = await sendHbarTransfer({
        toAccountId: '0.0.98',
        amountHbar: 1,
        memo: 'Test from BuildO'
      })
      alert(`Success! TX: ${result.transactionId}`)
    } catch (error) {
      alert(`Failed: ${error.message}`)
    }
  }
  
  return (
    <div className="p-8">
      <h1>BuildO - Hedera Playground</h1>
      
      <div className="mt-4">
        <ManualWalletConnect />
      </div>
      
      {isConnected && (
        <div className="mt-4">
          <p>Connected as: {accountId}</p>
          <Button onClick={handleSendTest}>
            Send Test Transaction
          </Button>
        </div>
      )}
    </div>
  )
}
```

## ✅ Summary

- ✅ Manual wallet connection implemented
- ✅ HashConnect code preserved for future use
- ✅ Beautiful UI component provided
- ✅ Transaction signing works
- ✅ No SSR issues
- ✅ Perfect for development

**You're ready to build!** 🎉

