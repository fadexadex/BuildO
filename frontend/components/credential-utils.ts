/**
 * Validation utilities for Hedera credentials
 */

export const validateAccountId = (id: string): boolean => {
  // Pattern allows for multiple digits in each segment (e.g., 0.0.6255888)
  const pattern = /^\d+\.\d+\.\d+$/
  return pattern.test(id)
}

export const validatePrivateKey = (key: string): boolean => {
  // Accept both raw hex (64 chars) and DER encoded format (96-100 chars starting with 3030)
  const rawHexPattern = /^[a-fA-F0-9]{64}$/
  const derPattern = /^3030[a-fA-F0-9]{92,96}$/  // Allow 96-100 total characters
  return rawHexPattern.test(key) || derPattern.test(key)
}

export const validateCredentials = (accountId: string, privateKey: string) => {
  const errors: { accountId?: string; privateKey?: string } = {}

  if (!accountId) {
    errors.accountId = "Account ID is required"
  } else if (!validateAccountId(accountId)) {
    errors.accountId = "Invalid Account ID format (expected: 0.0.6255888)"
  }

  if (!privateKey) {
    errors.privateKey = "Private Key is required"
  } else if (!validatePrivateKey(privateKey)) {
    errors.privateKey = "Invalid Private Key format (supports 64-char hex or 96-100 char DER format)"
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  }
}

export const storeCredentials = (accountId: string, privateKey: string) => {
  sessionStorage.setItem("hedera_account_id", accountId)
  sessionStorage.setItem("hedera_private_key", privateKey)
}

export const getStoredCredentials = () => {
  const accountId = sessionStorage.getItem("hedera_account_id")
  const privateKey = sessionStorage.getItem("hedera_private_key")
  return { accountId, privateKey }
}

export const clearStoredCredentials = () => {
  sessionStorage.removeItem("hedera_account_id")
  sessionStorage.removeItem("hedera_private_key")
}