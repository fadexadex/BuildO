"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import { CredentialForm } from "@/components/credential-form"
import { AgentChat } from "@/components/agent-chat"
import { validateAccountId, validatePrivateKey } from "@/components/credential-utils"

export default function AgentPage() {
  const router = useRouter()
  const [accountId, setAccountId] = useState("")
  const [privateKey, setPrivateKey] = useState("")
  const [errors, setErrors] = useState<{ accountId?: string; privateKey?: string }>({})
  const [isConnected, setIsConnected] = useState(false)
  const [sessionId, setSessionId] = useState("")

  // Load credentials from session storage on mount
  useEffect(() => {
    const storedAccountId = sessionStorage.getItem('hedera_account_id')
    const storedPrivateKey = sessionStorage.getItem('hedera_private_key')
    
    if (storedAccountId && storedPrivateKey) {
      setAccountId(storedAccountId)
      setPrivateKey(storedPrivateKey)
    }
  }, [])

  // Generate unique session ID on mount
  useEffect(() => {
    setSessionId(`agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  }, [])

  const validateAndConnect = () => {
    const newErrors: { accountId?: string; privateKey?: string } = {}

    const accountIdError = validateAccountId(accountId)
    if (accountIdError) newErrors.accountId = accountIdError

    const privateKeyError = validatePrivateKey(privateKey)
    if (privateKeyError) newErrors.privateKey = privateKeyError

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      // Store credentials in session storage
      sessionStorage.setItem('hedera_account_id', accountId)
      sessionStorage.setItem('hedera_private_key', privateKey)
      setIsConnected(true)
    }
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    sessionStorage.removeItem('hedera_account_id')
    sessionStorage.removeItem('hedera_private_key')
    setAccountId("")
    setPrivateKey("")
    setErrors({})
  }

  if (isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Disconnect
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Hedera AI Agent</h1>
            </div>
          </div>

          <AgentChat
            accountId={accountId}
            privateKey={privateKey}
            sessionId={sessionId}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
            Connect to Hedera Agent
          </CardTitle>
          <p className="text-gray-600">
            Enter your Hedera testnet credentials to start chatting with the AI agent
          </p>
        </CardHeader>
        
        <CardContent>
          <CredentialForm
            accountId={accountId}
            privateKey={privateKey}
            errors={errors}
            onAccountIdChange={setAccountId}
            onPrivateKeyChange={setPrivateKey}
            onSubmit={validateAndConnect}
            submitText="Connect to Agent"
            showSecurityNotice={true}
          />

          <Alert className="mt-4 border-blue-200 bg-blue-50">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              <strong>What can the agent do?</strong><br />
              • Create and manage tokens (HTS)<br />
              • Transfer HBAR and tokens<br />
              • Query account balances<br />
              • Create consensus topics<br />
              • Execute real blockchain operations
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
