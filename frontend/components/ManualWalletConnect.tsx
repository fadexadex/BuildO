'use client'

import { useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Wallet, X } from 'lucide-react'

export function ManualWalletConnect() {
  const { accountId, isConnected, connectManual, disconnect } = useWallet()
  const [open, setOpen] = useState(false)
  const [inputAccountId, setInputAccountId] = useState('')
  const [inputPrivateKey, setInputPrivateKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await connectManual(inputAccountId, inputPrivateKey)
      setOpen(false)
      setInputAccountId('')
      setInputPrivateKey('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
          <span className="text-xs text-slate-400">Connected:</span>
          <span className="ml-2 font-mono text-sm text-cyan-400">
            {accountId}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={disconnect}
          className="text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-indigo-600 hover:bg-indigo-500">
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Connect Hedera Wallet</DialogTitle>
          <DialogDescription className="text-slate-400">
            Enter your Hedera testnet credentials to connect your wallet
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleConnect} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="accountId" className="text-slate-300">
              Account ID
            </Label>
            <Input
              id="accountId"
              type="text"
              placeholder="0.0.12345"
              value={inputAccountId}
              onChange={(e) => setInputAccountId(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              required
            />
            <p className="text-xs text-slate-500">
              Your Hedera testnet account ID (e.g., 0.0.12345)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="privateKey" className="text-slate-300">
              Private Key
            </Label>
            <Input
              id="privateKey"
              type="password"
              placeholder="302e020100300506032b657004220420..."
              value={inputPrivateKey}
              onChange={(e) => setInputPrivateKey(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 font-mono text-sm"
              required
            />
            <p className="text-xs text-slate-500">
              Your private key (kept secure in your browser)
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-950/50 border border-red-900 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500"
            >
              {loading ? 'Connecting...' : 'Connect'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-slate-700 hover:bg-slate-800"
            >
              Cancel
            </Button>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              💡 <strong>Need a testnet account?</strong><br />
              Visit{' '}
              <a
                href="https://portal.hedera.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300"
              >
                portal.hedera.com
              </a>{' '}
              to create one
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

