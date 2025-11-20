'use client'

/**
 * ConnectWallet Component
 * 
 * Simple wrapper component that uses the AppKit button web component
 * No need to import - it's a global web component registered by createAppKit
 */

export function ConnectWallet() {
  return (
    <div className="flex items-center justify-center">
      <appkit-button />
    </div>
  )
}

export default ConnectWallet


