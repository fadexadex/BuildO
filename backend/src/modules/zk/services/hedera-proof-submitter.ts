import { 
  Client, 
  TopicCreateTransaction, 
  TopicMessageSubmitTransaction,
  AccountId,
  PrivateKey,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TransferTransaction,
  Hbar,
  ContractCreateFlow,
  ContractExecuteTransaction,
  ContractCallQuery,
  ContractFunctionParameters
} from '@hashgraph/sdk';
import { ethers } from 'ethers';

/**
 * Hedera Proof Submitter Service
 * Handles submission of ZK proofs to Hedera Consensus Service (HCS)
 * and minting of achievement NFTs using Hedera Token Service (HTS)
 */

interface HederaConfig {
  operatorId?: string;
  operatorKey?: string;
  network: 'testnet' | 'mainnet';
}

interface ProofSubmission {
  level: string;
  proofHash: string;
  userId: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  properties: Record<string, any>;
}

export class HederaProofSubmitter {
  private client: Client;
  private operatorId?: AccountId;
  private operatorKey?: PrivateKey;
  private topicId: string | null = null;
  private achievementTokenIds: Map<string, string> = new Map();

  constructor(config: HederaConfig) {
    // Initialize Hedera client
    if (config.network === 'testnet') {
      this.client = Client.forTestnet();
    } else {
      this.client = Client.forMainnet();
    }

    if (config.operatorId && config.operatorKey) {
      this.operatorId = AccountId.fromString(config.operatorId);
      this.operatorKey = PrivateKey.fromString(config.operatorKey);
      this.client.setOperator(this.operatorId, this.operatorKey);
    }
  }

  /**
   * Create a client from user credentials
   */
  private createUserClient(accountId: string, privateKey: string): Client {
    const client = this.client.networkName === 'mainnet' ? Client.forMainnet() : Client.forTestnet();
    client.setOperator(AccountId.fromString(accountId), PrivateKey.fromString(privateKey));
    return client;
  }

  /**
   * Deploy a verifier contract to Hedera
   */
  async deployVerifierContract(
    bytecode: string,
    accountId: string,
    privateKey: string
  ): Promise<string> {
    let client: Client | null = null;
    try {
      client = this.createUserClient(accountId, privateKey);

      console.log(`Deploying verifier contract for account ${accountId}...`);

      // Use ContractCreateFlow for automatic file creation if bytecode is large
      const transaction = new ContractCreateFlow()
        .setBytecode(bytecode)
        .setGas(1000000); // Set enough gas for deployment

      const txResponse = await transaction.execute(client);
      const receipt = await txResponse.getReceipt(client);
      
      const contractId = receipt.contractId?.toString();
      
      if (!contractId) {
        throw new Error('Failed to deploy verifier contract');
      }

      console.log(`Verifier contract deployed: ${contractId}`);
      return contractId;
    } catch (error) {
      console.error('Error deploying verifier contract:', error);
      throw error;
    } finally {
      if (client) client.close();
    }
  }

  /**
   * Verify a proof on-chain using the deployed verifier contract
   */
  async verifyProofOnChain(
    contractId: string,
    a: string[],
    b: string[][],
    c: string[],
    publicSignals: string[],
    accountId: string,
    privateKey: string
  ): Promise<{ transactionId: string; verified: boolean; explorerUrl: string }> {
      let client: Client | null = null;
      try {
        client = this.createUserClient(accountId, privateKey);
        
        console.log('=== Verifying Proof On-Chain ===');
        console.log('Contract ID:', contractId);
        console.log('Public Signals:', publicSignals);
        
        if (!Array.isArray(publicSignals)) {
          throw new Error('Public signals must be provided for on-chain verification');
        }

        const pubSignalsLength = publicSignals.length;

        // SnarkJS-generated verifier contracts use fixed-size arrays for public signals, eg. uint[1]
        // Build the exact ABI signature that matches the compiled contract to avoid decoding issues
        const pubSignalsType = `uint256[${pubSignalsLength}]`;
        const abi = [
          `function verifyProof(uint256[2] calldata _pA, uint256[2][2] calldata _pB, uint256[2] calldata _pC, ${pubSignalsType} calldata _pubSignals) public view returns (bool)`
        ];

        console.log('Using ABI:', abi[0]);

        const iface = new ethers.Interface(abi);
        
        // Encode the full call data (includes function selector + parameters)
        const encodedData = iface.encodeFunctionData("verifyProof", [a, b, c, publicSignals]);
        
        console.log('Encoded calldata length:', encodedData.length);
        console.log('Function selector:', encodedData.slice(0, 10));
        
        // For Hedera with complex nested arrays, we pass the full EVM-encoded calldata
        // The calldata includes the function selector and properly ABI-encoded parameters
        const calldataHex = encodedData.slice(2); // Remove '0x' prefix
        const calldataBytes = Uint8Array.from(Buffer.from(calldataHex, 'hex'));
        
        console.log('Full EVM calldata size:', calldataBytes.length, 'bytes');
        
        // Use ContractExecuteTransaction with raw calldata
        // When setFunction is not called, Hedera treats setFunctionParameters as raw EVM bytecode
        console.log('Executing transaction with raw EVM calldata...');
        const tx = await new ContractExecuteTransaction()
          .setContractId(contractId)
          .setGas(1000000)
          .setFunctionParameters(calldataBytes)
          .execute(client);
        
        const receipt = await tx.getReceipt(client);
        const transactionId = tx.transactionId.toString();
        
        console.log('Transaction executed:', transactionId);
        console.log('Receipt status:', receipt.status.toString());
        
        let verified: boolean | null = null;
        
        try {
          console.log('Fetching transaction record for function result...');
          const record = await tx.getRecord(client);
          const functionResult = record.contractFunctionResult;
          
          if (functionResult) {
            verified = functionResult.getBool(0);
            console.log('Transaction record result (verified):', verified);
          } else {
            console.warn('Transaction record did not include a contract function result');
          }
        } catch (recordError) {
          console.error('Error fetching transaction record:', recordError);
        }
        
        // If record lookup failed, fall back to a local query to read the bool
        if (verified === null) {
          // For view functions, we should query the result instead of executing a transaction
          // Let's query to get the actual boolean return value
          console.log('Querying verification result...');
          const callQuery = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(300000) // match on-chain gas usage headroom
            .setFunctionParameters(calldataBytes);
          
          const queryResult = await callQuery.execute(client);
          verified = queryResult.getBool(0);
          console.log('Query result (verified):', verified);
        }
        
        if (verified === null) {
          console.warn('Unable to determine verification result from record or query, falling back to transaction status');
          verified = receipt.status.toString() === 'SUCCESS';
          console.log('Using transaction status for verification:', verified);
        }

        const finalVerified = verified ?? false;
        
        const network = this.client.networkName === 'mainnet' ? 'mainnet' : 'testnet';
        const explorerUrl = `https://hashscan.io/${network}/transaction/${transactionId}`;
        
        console.log('✓ Verification completed:', { transactionId, verified: finalVerified, explorerUrl });
        
        return {
            transactionId,
            verified: finalVerified,
            explorerUrl
        };

      } catch (error: any) {
        console.error('Error executing verifier contract:', error);
        
        // Check if it's a contract revert (status code 33 = CONTRACT_REVERT_EXECUTED)
        if (error.status?._code === 33) {
          console.error('Contract reverted - proof verification failed on-chain');
          throw new Error('Proof verification failed on-chain (contract reverted)');
        }
        
        throw error;
      } finally {
        if (client) client.close();
      }
  }

  /**
   * Create a new HCS topic for proof submissions
   */
  async createProofTopic(memo: string = 'ZK Quest Proof Submissions'): Promise<string> {
    try {
      const transaction = new TopicCreateTransaction()
        .setTopicMemo(memo)
        .setAdminKey(this.operatorKey.publicKey)
        .setSubmitKey(this.operatorKey.publicKey);

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      
      this.topicId = receipt.topicId?.toString() || null;
      
      if (!this.topicId) {
        throw new Error('Failed to create topic');
      }

      console.log(`Created HCS topic: ${this.topicId}`);
      return this.topicId;
    } catch (error) {
      console.error('Error creating HCS topic:', error);
      throw error;
    }
  }

  /**
   * Submit a proof to the HCS topic
   */
  async submitProof(submission: ProofSubmission): Promise<string> {
    if (!this.topicId) {
      throw new Error('Topic not initialized. Call createProofTopic first.');
    }

    try {
      const message = JSON.stringify({
        level: submission.level,
        proofHash: submission.proofHash,
        userId: submission.userId,
        timestamp: submission.timestamp,
        metadata: submission.metadata
      });

      const transaction = new TopicMessageSubmitTransaction()
        .setTopicId(this.topicId)
        .setMessage(message);

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      console.log(`Proof submitted to topic ${this.topicId}`);
      console.log(`Transaction ID: ${txResponse.transactionId}`);

      return txResponse.transactionId.toString();
    } catch (error) {
      console.error('Error submitting proof:', error);
      throw error;
    }
  }

  /**
   * Create an NFT token for achievements
   */
  async createAchievementNFT(
    name: string,
    symbol: string,
    maxSupply: number
  ): Promise<string> {
    try {
      const transaction = new TokenCreateTransaction()
        .setTokenName(name)
        .setTokenSymbol(symbol)
        .setTokenType(TokenType.NonFungibleUnique)
        .setDecimals(0)
        .setInitialSupply(0)
        .setMaxSupply(maxSupply)
        .setSupplyType(TokenSupplyType.Finite)
        .setTreasuryAccountId(this.operatorId)
        .setAdminKey(this.operatorKey.publicKey)
        .setSupplyKey(this.operatorKey.publicKey)
        .setFreezeDefault(false);

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      
      const tokenId = receipt.tokenId?.toString();
      
      if (!tokenId) {
        throw new Error('Failed to create NFT token');
      }

      console.log(`Created NFT token: ${tokenId}`);
      return tokenId;
    } catch (error) {
      console.error('Error creating NFT:', error);
      throw error;
    }
  }

  /**
   * Mint an achievement NFT
   */
  async mintAchievementNFT(
    tokenId: string,
    metadata: NFTMetadata
  ): Promise<string> {
    try {
      // Convert metadata to CID format (in production, upload to IPFS first)
      const metadataBytes = Buffer.from(JSON.stringify(metadata));

      const transaction = new TokenMintTransaction()
        .setTokenId(tokenId)
        .setMetadata([metadataBytes as unknown as Uint8Array]);

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      const serialNumbers = receipt.serials;
      
      if (!serialNumbers || serialNumbers.length === 0) {
        throw new Error('Failed to mint NFT');
      }

      console.log(`Minted NFT with serial number: ${serialNumbers[0]}`);
      return serialNumbers[0].toString();
    } catch (error) {
      console.error('Error minting NFT:', error);
      throw error;
    }
  }

  /**
   * Transfer NFT to user
   */
  async transferNFT(
    tokenId: string,
    serialNumber: string,
    recipientId: string
  ): Promise<void> {
    try {
      const transaction = new TransferTransaction()
        .addNftTransfer(tokenId, parseInt(serialNumber), this.operatorId, recipientId)
        .addHbarTransfer(this.operatorId, new Hbar(-1))
        .addHbarTransfer(recipientId, new Hbar(1));

      await transaction.execute(this.client);
      
      console.log(`Transferred NFT to ${recipientId}`);
    } catch (error) {
      console.error('Error transferring NFT:', error);
      throw error;
    }
  }

  /**
   * Complete workflow: Submit proof and mint achievement NFT
   */
  async completeLevel(
    levelName: string,
    proofHash: string,
    userId: string,
    recipientAccountId?: string
  ): Promise<{ transactionId: string; nftSerial?: string }> {
    try {
      // Submit proof to HCS
      const transactionId = await this.submitProof({
        level: levelName,
        proofHash,
        userId,
        timestamp: Date.now(),
        metadata: {
          version: '1.0',
          network: this.client.network
        }
      });

      // Get or create achievement token for this level
      let tokenId = this.achievementTokenIds.get(levelName);
      
      if (!tokenId) {
        tokenId = await this.createAchievementNFT(
          `ZK Quest - ${levelName}`,
          'ZKQUEST',
          1000 // Max supply
        );
        this.achievementTokenIds.set(levelName, tokenId);
      }

      // Mint achievement NFT
      const metadata: NFTMetadata = {
        name: `${levelName} Achievement`,
        description: `Completed ${levelName} in ZK Quest`,
        image: `ipfs://placeholder/${levelName}.png`, // Replace with actual IPFS CID
        properties: {
          level: levelName,
          completedAt: Date.now(),
          proofHash,
          userId
        }
      };

      const nftSerial = await this.mintAchievementNFT(tokenId, metadata);

      // Transfer to user if recipient account provided
      if (recipientAccountId) {
        await this.transferNFT(tokenId, nftSerial, recipientAccountId);
      }

      return {
        transactionId,
        nftSerial
      };
    } catch (error) {
      console.error('Error completing level:', error);
      throw error;
    }
  }

  /**
   * Get proof submissions from topic (for leaderboard)
   */
  async getProofSubmissions(limit: number = 100): Promise<ProofSubmission[]> {
    if (!this.topicId) {
      console.warn('Topic not initialized, returning empty submissions');
      return [];
    }

    try {
      // Extract topic number from topicId (format: "0.0.123456")
      const topicNumber = this.topicId.split('.').pop();
      if (!topicNumber) {
        throw new Error('Invalid topic ID format');
      }

      // Determine mirror node URL based on network
      const mirrorNodeUrl = this.client.networkName === 'testnet'
        ? 'https://testnet.mirrornode.hedera.com'
        : 'https://mainnet-public.mirrornode.hedera.com';

      // Query mirror node for topic messages
      const url = `${mirrorNodeUrl}/api/v1/topics/${this.topicId}/messages?limit=${limit}&order=desc`;
      
      console.log(`Fetching proof submissions from mirror node: ${url}`);
      
      // Use global fetch (Node 18+) or node-fetch for older versions
      const fetchFn = typeof fetch !== 'undefined' ? fetch : (await import('node-fetch')).default;
      
      const response = await fetchFn(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        // If mirror node is unavailable, return empty array (graceful degradation)
        if (response.status === 404 || response.status >= 500) {
          console.warn('Mirror node unavailable, returning empty submissions');
          return [];
        }
        throw new Error(`Mirror node API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.messages || !Array.isArray(data.messages)) {
        return [];
      }

      // Parse messages and extract proof submissions
      const submissions: ProofSubmission[] = [];
      
      for (const message of data.messages) {
        try {
          // Decode message content (base64)
          let messageContent: string;
          if (message.message) {
            // Message might be base64 encoded
            try {
              messageContent = Buffer.from(message.message, 'base64').toString('utf-8');
            } catch {
              // If not base64, use as-is
              messageContent = message.message;
            }
          } else {
            continue;
          }

          // Parse JSON message
          const parsed = JSON.parse(messageContent);
          
          if (parsed.level && parsed.proofHash && parsed.userId) {
            submissions.push({
              level: parsed.level,
              proofHash: parsed.proofHash,
              userId: parsed.userId,
              timestamp: parsed.timestamp || (message.consensus_timestamp ? 
                new Date(message.consensus_timestamp).getTime() : Date.now()),
              metadata: parsed.metadata,
            });
          }
        } catch (parseError) {
          // Skip invalid messages
          console.warn('Failed to parse message:', parseError);
          continue;
        }
      }

      // Sort by timestamp (newest first)
      submissions.sort((a, b) => b.timestamp - a.timestamp);

      console.log(`Retrieved ${submissions.length} proof submissions from mirror node`);
      return submissions.slice(0, limit);
    } catch (error) {
      console.error('Error fetching proof submissions from mirror node:', error);
      // Return empty array on error (graceful degradation)
      // In production, you might want to cache submissions locally
      return [];
    }
  }

  /**
   * Close the client connection
   */
  close(): void {
    this.client.close();
  }
}

// Singleton instance for backend use
let hederaService: HederaProofSubmitter | null = null;

export function getHederaService(): HederaProofSubmitter {
  if (!hederaService) {
    const config: HederaConfig = {
      operatorId: process.env.HEDERA_OPERATOR_ID,
      operatorKey: process.env.HEDERA_OPERATOR_KEY,
      network: (process.env.HEDERA_NETWORK as 'testnet' | 'mainnet') || 'testnet'
    };

    // Allow initialization without credentials for user-supplied wallet operations
    hederaService = new HederaProofSubmitter(config);
  }

  return hederaService;
}

export default HederaProofSubmitter;
