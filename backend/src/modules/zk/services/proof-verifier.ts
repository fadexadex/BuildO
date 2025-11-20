import * as snarkjs from 'snarkjs';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';

/**
 * Proof Verifier Service
 * Handles verification of zero-knowledge proofs using snarkjs
 */

export interface VerificationResult {
  success: boolean;
  verified: boolean;
  verificationTime?: number;
  errors?: string[];
  details?: {
    publicSignals?: string[];
    proofHash?: string;
    verificationKeyHash?: string;
  };
}

export interface ProofData {
  proof: any;
  publicSignals: string[];
}

export type ProvingSystem = 'groth16' | 'plonk' | 'fflonk';

export class ProofVerifierService {
  private workDir: string;
  private vkeysDir: string;

  constructor(workDir?: string) {
    this.workDir = workDir || path.join(process.cwd(), 'zk-workspace');
    this.vkeysDir = path.join(this.workDir, 'zkeys');
  }

  /**
   * Initialize the working directories
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.vkeysDir, { recursive: true });
      console.log('Proof verifier workspace initialized');
    } catch (error) {
      console.error('Error initializing workspace:', error);
      throw error;
    }
  }

  /**
   * Verify a Groth16 proof
   */
  async verifyGroth16Proof(
    verificationKey: any,
    publicSignals: string[],
    proof: any
  ): Promise<VerificationResult> {
    try {
      const startTime = Date.now();

      console.log('Verifying Groth16 proof...');
      console.log('Public signals:', publicSignals);

      const verified = await snarkjs.groth16.verify(
        verificationKey,
        publicSignals,
        proof
      );

      const verificationTime = Date.now() - startTime;

      console.log(`Verification completed in ${verificationTime}ms`);
      console.log(`Result: ${verified ? 'VALID' : 'INVALID'}`);

      return {
        success: true,
        verified,
        verificationTime,
        details: {
          publicSignals,
          proofHash: this.hashProof(proof),
          verificationKeyHash: this.hashVerificationKey(verificationKey)
        }
      };
    } catch (error) {
      console.error('Error verifying Groth16 proof:', error);
      return {
        success: false,
        verified: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Verify a PLONK proof
   */
  async verifyPlonkProof(
    verificationKey: any,
    publicSignals: string[],
    proof: any
  ): Promise<VerificationResult> {
    try {
      const startTime = Date.now();

      console.log('Verifying PLONK proof...');
      console.log('Public signals:', publicSignals);

      const verified = await snarkjs.plonk.verify(
        verificationKey,
        publicSignals,
        proof
      );

      const verificationTime = Date.now() - startTime;

      console.log(`Verification completed in ${verificationTime}ms`);
      console.log(`Result: ${verified ? 'VALID' : 'INVALID'}`);

      return {
        success: true,
        verified,
        verificationTime,
        details: {
          publicSignals,
          proofHash: this.hashProof(proof),
          verificationKeyHash: this.hashVerificationKey(verificationKey)
        }
      };
    } catch (error) {
      console.error('Error verifying PLONK proof:', error);
      return {
        success: false,
        verified: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Verify a proof with automatic system detection
   */
  async verifyProof(
    verificationKey: any,
    publicSignals: string[],
    proof: any,
    provingSystem: ProvingSystem = 'groth16'
  ): Promise<VerificationResult> {
    try {
      await this.initialize();

      switch (provingSystem) {
        case 'groth16':
          return await this.verifyGroth16Proof(verificationKey, publicSignals, proof);
        
        case 'plonk':
          return await this.verifyPlonkProof(verificationKey, publicSignals, proof);
        
        case 'fflonk':
          // FFLONK uses similar API to PLONK
          return await this.verifyPlonkProof(verificationKey, publicSignals, proof);
        
        default:
          throw new Error(`Unsupported proving system: ${provingSystem}`);
      }
    } catch (error) {
      console.error('Error verifying proof:', error);
      return {
        success: false,
        verified: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Verify a proof using stored verification key
   */
  async verifyProofWithStoredKey(
    circuitName: string,
    publicSignals: string[],
    proof: any,
    provingSystem: ProvingSystem = 'groth16'
  ): Promise<VerificationResult> {
    try {
      const vkeyPath = path.join(this.vkeysDir, `${circuitName}_verification_key.json`);

      if (!existsSync(vkeyPath)) {
        throw new Error(`Verification key not found for circuit: ${circuitName}`);
      }

      const vkeyData = await fs.readFile(vkeyPath, 'utf-8');
      const verificationKey = JSON.parse(vkeyData);

      return await this.verifyProof(verificationKey, publicSignals, proof, provingSystem);
    } catch (error) {
      console.error('Error verifying proof with stored key:', error);
      return {
        success: false,
        verified: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Load verification key from file
   */
  async loadVerificationKey(filePath: string): Promise<any> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading verification key:', error);
      throw error;
    }
  }

  /**
   * Save verification key to file
   */
  async saveVerificationKey(
    circuitName: string,
    verificationKey: any
  ): Promise<string> {
    try {
      await this.initialize();

      const vkeyPath = path.join(this.vkeysDir, `${circuitName}_verification_key.json`);
      await fs.writeFile(vkeyPath, JSON.stringify(verificationKey, null, 2), 'utf-8');

      console.log(`Verification key saved: ${vkeyPath}`);
      return vkeyPath;
    } catch (error) {
      console.error('Error saving verification key:', error);
      throw error;
    }
  }

  /**
   * Batch verify multiple proofs
   */
  async batchVerifyProofs(
    verificationKey: any,
    proofs: ProofData[],
    provingSystem: ProvingSystem = 'groth16'
  ): Promise<VerificationResult[]> {
    console.log(`Batch verifying ${proofs.length} proofs...`);

    const results: VerificationResult[] = [];

    for (let i = 0; i < proofs.length; i++) {
      const { proof, publicSignals } = proofs[i];
      console.log(`Verifying proof ${i + 1}/${proofs.length}...`);
      
      const result = await this.verifyProof(
        verificationKey,
        publicSignals,
        proof,
        provingSystem
      );
      
      results.push(result);
    }

    const validCount = results.filter(r => r.verified).length;
    console.log(`Batch verification complete: ${validCount}/${proofs.length} valid`);

    return results;
  }

  /**
   * Verify proof format and structure
   */
  validateProofStructure(
    proof: any,
    provingSystem: ProvingSystem = 'groth16'
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      if (!proof || typeof proof !== 'object') {
        errors.push('Proof must be an object');
        return { valid: false, errors };
      }

      if (provingSystem === 'groth16') {
        // Validate Groth16 proof structure
        if (!proof.pi_a || !Array.isArray(proof.pi_a) || proof.pi_a.length !== 3) {
          errors.push('Invalid pi_a in proof');
        }
        
        if (!proof.pi_b || !Array.isArray(proof.pi_b) || proof.pi_b.length !== 3) {
          errors.push('Invalid pi_b in proof');
        }
        
        if (!proof.pi_c || !Array.isArray(proof.pi_c) || proof.pi_c.length !== 3) {
          errors.push('Invalid pi_c in proof');
        }
        
        if (!proof.protocol || proof.protocol !== 'groth16') {
          errors.push('Invalid or missing protocol field');
        }
      } else if (provingSystem === 'plonk' || provingSystem === 'fflonk') {
        // Validate PLONK/FFLONK proof structure
        if (!proof.A || !Array.isArray(proof.A)) {
          errors.push('Invalid A in proof');
        }
        
        if (!proof.B || !Array.isArray(proof.B)) {
          errors.push('Invalid B in proof');
        }
        
        if (!proof.C || !Array.isArray(proof.C)) {
          errors.push('Invalid C in proof');
        }
        
        if (!proof.protocol || (proof.protocol !== 'plonk' && proof.protocol !== 'fflonk')) {
          errors.push('Invalid or missing protocol field');
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return { valid: false, errors };
    }
  }

  /**
   * Validate verification key structure
   */
  validateVerificationKeyStructure(
    verificationKey: any,
    provingSystem: ProvingSystem = 'groth16'
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      if (!verificationKey || typeof verificationKey !== 'object') {
        errors.push('Verification key must be an object');
        return { valid: false, errors };
      }

      if (provingSystem === 'groth16') {
        // Validate Groth16 verification key structure
        if (!verificationKey.vk_alpha_1) {
          errors.push('Missing vk_alpha_1');
        }
        
        if (!verificationKey.vk_beta_2) {
          errors.push('Missing vk_beta_2');
        }
        
        if (!verificationKey.vk_gamma_2) {
          errors.push('Missing vk_gamma_2');
        }
        
        if (!verificationKey.vk_delta_2) {
          errors.push('Missing vk_delta_2');
        }
        
        if (!verificationKey.IC || !Array.isArray(verificationKey.IC)) {
          errors.push('Missing or invalid IC array');
        }
        
        if (!verificationKey.protocol || verificationKey.protocol !== 'groth16') {
          errors.push('Invalid or missing protocol field');
        }
      } else if (provingSystem === 'plonk' || provingSystem === 'fflonk') {
        // Validate PLONK/FFLONK verification key structure
        if (!verificationKey.n) {
          errors.push('Missing n (circuit size)');
        }
        
        if (!verificationKey.Qm) {
          errors.push('Missing Qm');
        }
        
        if (!verificationKey.protocol || (verificationKey.protocol !== 'plonk' && verificationKey.protocol !== 'fflonk')) {
          errors.push('Invalid or missing protocol field');
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return { valid: false, errors };
    }
  }

  /**
   * Hash a proof for identification
   */
  private hashProof(proof: any): string {
    const proofStr = JSON.stringify(proof);
    // Simple hash for identification (in production, use proper hashing)
    return Buffer.from(proofStr).toString('base64').substring(0, 32);
  }

  /**
   * Hash a verification key for identification
   */
  private hashVerificationKey(vkey: any): string {
    const vkeyStr = JSON.stringify(vkey);
    // Simple hash for identification (in production, use proper hashing)
    return Buffer.from(vkeyStr).toString('base64').substring(0, 32);
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats(results: VerificationResult[]): Promise<{
    total: number;
    verified: number;
    failed: number;
    errors: number;
    averageTime: number;
  }> {
    const stats = {
      total: results.length,
      verified: results.filter(r => r.verified).length,
      failed: results.filter(r => !r.verified && r.success).length,
      errors: results.filter(r => !r.success).length,
      averageTime: 0
    };

    const times = results
      .filter(r => r.verificationTime)
      .map(r => r.verificationTime!);

    if (times.length > 0) {
      stats.averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    }

    return stats;
  }
}

// Singleton instance
let proofVerifierService: ProofVerifierService | null = null;

export function getProofVerifierService(): ProofVerifierService {
  if (!proofVerifierService) {
    proofVerifierService = new ProofVerifierService();
  }
  return proofVerifierService;
}

export default ProofVerifierService;
