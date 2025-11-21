/**
 * Hedera Integration API Methods
 * Frontend API client for interacting with Hedera services
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ProofSubmissionRequest {
  levelId: string;
  playerId: string;
  proof: Record<string, unknown> | string;
  metadata?: Record<string, unknown>;
  recipientAccountId?: string;
}

export interface ProofSubmissionResponse {
  success: boolean;
  transactionId: string;
  proofHash: string;
  message: string;
  nftSerial?: string;
}

export interface LeaderboardEntry {
  userId: string;
  level: string;
  completedAt: number;
  rank: number;
}

/**
 * Submit a ZK proof commitment to Hedera HCS
 */
export async function submitProofToHedera(
  request: ProofSubmissionRequest
): Promise<ProofSubmissionResponse> {
  try {
    const response = await fetch(`${API_BASE}/zk/submit-to-hedera`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit proof: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting proof to Hedera:', error);
    throw error;
  }
}

/**
 * Get leaderboard data from Hedera HCS
 */
export async function getLeaderboard(
  limit: number = 50
): Promise<LeaderboardEntry[]> {
  try {
    const response = await fetch(`${API_BASE}/zk/leaderboard?limit=${limit}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }
}

/**
 * Initialize Hedera topic (admin only)
 */
export async function initializeHederaTopic(): Promise<{ topicId: string }> {
  try {
    const response = await fetch(`${API_BASE}/zk/initialize-topic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize topic: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error initializing Hedera topic:', error);
    throw error;
  }
}
