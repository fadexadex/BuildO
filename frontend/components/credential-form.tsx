"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Shield } from "lucide-react"

interface CredentialFormProps {
  accountId: string
  privateKey: string
  errors: { accountId?: string; privateKey?: string }
  onAccountIdChange: (value: string) => void
  onPrivateKeyChange: (value: string) => void
  onSubmit: () => void
  isLoading?: boolean
  submitText?: string
  showSecurityNotice?: boolean
}

export function CredentialForm({
  accountId,
  privateKey,
  errors,
  onAccountIdChange,
  onPrivateKeyChange,
  onSubmit,
  isLoading = false,
  submitText = "Connect",
  showSecurityNotice = true,
}: CredentialFormProps) {
  const [showPrivateKey, setShowPrivateKey] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {showSecurityNotice && (
        <Alert className="border-purple-200 bg-purple-50">
          <Shield className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-800 text-sm">
            <strong>Security Notice:</strong> Your credentials are stored in your browser's session storage (temporary) and are never transmitted to external servers.
          </AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="accountId" className="text-sm font-medium text-gray-900 mb-2 block">
          Account ID
        </Label>
        <Input
          id="accountId"
          placeholder="0.0.6255888"
          value={accountId}
          onChange={(e) => onAccountIdChange(e.target.value)}
          className={`${
            errors.accountId 
              ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
              : "border-gray-300 focus:border-gray-400 focus:ring-gray-400"
          }`}
        />
        {errors.accountId && (
          <p className="text-sm text-red-600 mt-1">{errors.accountId}</p>
        )}
      </div>

      <div>
        <Label htmlFor="privateKey" className="text-sm font-medium text-gray-900 mb-2 block">
          Private Key
        </Label>
        <div className="relative">
          <Input
            id="privateKey"
            type={showPrivateKey ? "text" : "password"}
            placeholder="Enter your private key"
            value={privateKey}
            onChange={(e) => onPrivateKeyChange(e.target.value)}
            className={`pr-10 ${
              errors.privateKey 
                ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                : "border-gray-300 focus:border-gray-400 focus:ring-gray-400"
            }`}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => setShowPrivateKey(!showPrivateKey)}
          >
            {showPrivateKey ? (
              <EyeOff className="h-3 w-3 text-gray-500" />
            ) : (
              <Eye className="h-3 w-3 text-gray-500" />
            )}
          </Button>
        </div>
        {errors.privateKey && (
          <p className="text-sm text-red-600 mt-1">{errors.privateKey}</p>
        )}
      </div>

      <Button 
        type="submit" 
        className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3" 
        disabled={isLoading}
      >
        {submitText}
      </Button>
    </form>
  )
}