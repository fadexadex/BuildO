import * as snarkjs from 'snarkjs';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Proof Generator Service
 * Handles witness calculation and proof generation using snarkjs
 */

export interface WitnessGenerationResult {
  success: boolean;
  witnessPath?: string;
  witnessData?: Uint8Array;
  errors?: string[];
}

export interface ProofGenerationResult {
  success: boolean;
  proof?: any;
  publicSignals?: string[];
  errors?: string[];
  generationTime?: number;
}

export interface SetupResult {
  success: boolean;
  zkeyPath?: string;
  verificationKeyPath?: string;
  errors?: string[];
}

export type ProvingSystem = 'groth16' | 'plonk' | 'fflonk';

export class ProofGeneratorService {
  private workDir: string;
  private witnessDir: string;
  private zkeyDir: string;
  private ptauPath: string;

  constructor(workDir?: string) {
    this.workDir = workDir || path.join(process.cwd(), 'zk-workspace');
    this.witnessDir = path.join(this.workDir, 'witness');
    this.zkeyDir = path.join(this.workDir, 'zkeys');
    this.ptauPath = path.join(this.workDir, 'ptau', 'powersOfTau28_hez_final_10.ptau');
  }

  /**
   * Initialize the working directories
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.witnessDir, { recursive: true });
      await fs.mkdir(this.zkeyDir, { recursive: true });
      await fs.mkdir(path.dirname(this.ptauPath), { recursive: true });
      
      // Download powers of tau if not exists
      if (!existsSync(this.ptauPath)) {
        await this.downloadPowersOfTau();
      }
      
      console.log('Proof generator workspace initialized');
    } catch (error) {
      console.error('Error initializing workspace:', error);
      throw error;
    }
  }

  /**
   * Download powers of tau ceremony file (for small circuits)
   */
  private async downloadPowersOfTau(): Promise<void> {
    console.log('Downloading powers of tau file...');
    try {
      // For production, download from: https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_10.ptau
      // For now, we'll use a smaller one or expect it to be provided
      console.warn('Powers of tau file not found. Please download it manually from:');
      console.warn('https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_10.ptau');
      console.warn(`And place it at: ${this.ptauPath}`);
    } catch (error) {
      console.error('Error downloading powers of tau:', error);
      throw error;
    }
  }

  /**
   * Calculate witness from circuit inputs
   */
  async calculateWitness(
    circuitName: string,
    wasmPath: string,
    inputs: Record<string, any>
  ): Promise<WitnessGenerationResult> {
    try {
      await this.initialize();

      const witnessPath = path.join(this.witnessDir, `${circuitName}_witness.wtns`);
      
      console.log(`Calculating witness for circuit: ${circuitName}`);
      console.log('Inputs:', JSON.stringify(inputs, null, 2));

      // Write inputs to temporary file
      const inputsPath = path.join(this.witnessDir, `${circuitName}_input.json`);
      await fs.writeFile(inputsPath, JSON.stringify(inputs), 'utf-8');

      // Use snarkjs witness calculator
      const wasmBuffer = await fs.readFile(wasmPath);
      
      // Calculate witness using snarkjs (convert Buffer to Uint8Array)
      const { wtns } = await snarkjs.wtns.calculate(inputs, new Uint8Array(wasmBuffer));
      
      // Save witness to file
      await fs.writeFile(witnessPath, wtns);

      console.log(`Witness calculated successfully: ${witnessPath}`);

      return {
        success: true,
        witnessPath,
        witnessData: wtns
      };
    } catch (error) {
      console.error('Error calculating witness:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Setup ceremony - generate zkey for circuit
   */
  async setupCircuit(
    circuitName: string,
    r1csPath: string,
    provingSystem: ProvingSystem = 'groth16'
  ): Promise<SetupResult> {
    try {
      await this.initialize();

      if (!existsSync(this.ptauPath)) {
        throw new Error('Powers of tau file not found. Please download it first.');
      }

      const zkeyPath = path.join(this.zkeyDir, `${circuitName}_final.zkey`);
      const vkeyPath = path.join(this.zkeyDir, `${circuitName}_verification_key.json`);

      console.log(`Setting up ${provingSystem} circuit: ${circuitName}`);

      // Initialize the zkey (Phase 1)
      const zkey0Path = path.join(this.zkeyDir, `${circuitName}_0000.zkey`);
      
      console.log('Phase 1: Initializing zkey...');
      await snarkjs.zKey.newZKey(r1csPath, this.ptauPath, zkey0Path);

      // Contribute to the ceremony (Phase 2)
      console.log('Phase 2: Contributing to ceremony...');
      await snarkjs.zKey.contribute(
        zkey0Path,
        zkeyPath,
        'contribution1',
        Math.random().toString(36).substring(7) // Random entropy
      );

      // Export verification key
      console.log('Exporting verification key...');
      const vKey = await snarkjs.zKey.exportVerificationKey(zkeyPath);
      await fs.writeFile(vkeyPath, JSON.stringify(vKey, null, 2), 'utf-8');

      // Clean up intermediate zkey
      await fs.unlink(zkey0Path);

      console.log(`Setup completed successfully for circuit: ${circuitName}`);

      return {
        success: true,
        zkeyPath,
        verificationKeyPath: vkeyPath
      };
    } catch (error) {
      console.error('Error during setup:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Generate a proof using Groth16
   */
  async generateGroth16Proof(
    circuitName: string,
    zkeyPath: string,
    witnessPath: string
  ): Promise<ProofGenerationResult> {
    try {
      const startTime = Date.now();

      console.log(`Generating Groth16 proof for circuit: ${circuitName}`);

      // Read witness (convert Buffer to Uint8Array)
      const wtns = new Uint8Array(await fs.readFile(witnessPath));

      // Generate proof
      const { proof, publicSignals } = await snarkjs.groth16.prove(zkeyPath, wtns);

      const generationTime = Date.now() - startTime;

      console.log(`Proof generated successfully in ${generationTime}ms`);

      return {
        success: true,
        proof,
        publicSignals,
        generationTime
      };
    } catch (error) {
      console.error('Error generating proof:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Generate a proof using PLONK
   */
  async generatePlonkProof(
    circuitName: string,
    zkeyPath: string,
    witnessPath: string
  ): Promise<ProofGenerationResult> {
    try {
      const startTime = Date.now();

      console.log(`Generating PLONK proof for circuit: ${circuitName}`);

      // Read witness (convert Buffer to Uint8Array)
      const wtns = new Uint8Array(await fs.readFile(witnessPath));

      // Generate proof
      const { proof, publicSignals } = await snarkjs.plonk.prove(zkeyPath, wtns);

      const generationTime = Date.now() - startTime;

      console.log(`Proof generated successfully in ${generationTime}ms`);

      return {
        success: true,
        proof,
        publicSignals,
        generationTime
      };
    } catch (error) {
      console.error('Error generating proof:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Full prove - calculate witness and generate proof in one step
   */
  async fullProve(
    circuitName: string,
    wasmPath: string,
    zkeyPath: string,
    inputs: Record<string, any>,
    provingSystem: ProvingSystem = 'groth16'
  ): Promise<ProofGenerationResult> {
    try {
      const startTime = Date.now();

      console.log(`Full prove for circuit: ${circuitName} using ${provingSystem}`);

      // Read WASM file (convert Buffer to Uint8Array)
      const wasmBuffer = new Uint8Array(await fs.readFile(wasmPath));

      let proof: any;
      let publicSignals: string[];

      // Generate proof based on proving system
      if (provingSystem === 'groth16') {
        const result = await snarkjs.groth16.fullProve(inputs, wasmBuffer, zkeyPath);
        proof = result.proof;
        publicSignals = result.publicSignals;
      } else if (provingSystem === 'plonk') {
        const result = await snarkjs.plonk.fullProve(inputs, wasmBuffer, zkeyPath);
        proof = result.proof;
        publicSignals = result.publicSignals;
      } else {
        throw new Error(`Unsupported proving system: ${provingSystem}`);
      }

      const generationTime = Date.now() - startTime;

      console.log(`Full prove completed successfully in ${generationTime}ms`);
      console.log('Public signals:', publicSignals);

      return {
        success: true,
        proof,
        publicSignals,
        generationTime
      };
    } catch (error) {
      console.error('Error in full prove:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Get or create zkey for circuit
   */
  async getOrCreateZKey(
    circuitName: string,
    r1csPath: string,
    provingSystem: ProvingSystem = 'groth16'
  ): Promise<string> {
    const zkeyPath = path.join(this.zkeyDir, `${circuitName}_final.zkey`);

    if (existsSync(zkeyPath)) {
      console.log(`Using existing zkey: ${zkeyPath}`);
      return zkeyPath;
    }

    console.log(`Generating new zkey for circuit: ${circuitName}`);
    const setupResult = await this.setupCircuit(circuitName, r1csPath, provingSystem);

    if (!setupResult.success || !setupResult.zkeyPath) {
      throw new Error(`Failed to setup circuit: ${setupResult.errors?.join(', ')}`);
    }

    return setupResult.zkeyPath;
  }

  /**
   * Generate verification key from zkey
   */
  async exportVerificationKey(zkeyPath: string): Promise<any> {
    try {
      const vKey = await snarkjs.zKey.exportVerificationKey(zkeyPath);
      return vKey;
    } catch (error) {
      console.error('Error exporting verification key:', error);
      throw error;
    }
  }

  /**
   * Export Solidity verifier contract
   */
  async exportSolidityVerifier(
    zkeyPath: string,
    outputPath?: string
  ): Promise<string> {
    try {
      const solidityCode = await snarkjs.zKey.exportSolidityVerifier(zkeyPath);
      
      if (outputPath) {
        await fs.writeFile(outputPath, solidityCode, 'utf-8');
        console.log(`Solidity verifier exported to: ${outputPath}`);
      }

      return solidityCode;
    } catch (error) {
      console.error('Error exporting Solidity verifier:', error);
      throw error;
    }
  }

  /**
   * Clean up generated files for a circuit
   */
  async cleanCircuit(circuitName: string): Promise<void> {
    try {
      // Clean witness files
      const witnessPattern = path.join(this.witnessDir, `${circuitName}_*`);
      const { stdout } = await execAsync(`rm -f "${witnessPattern}"`);

      // Clean zkey files
      const zkeyPattern = path.join(this.zkeyDir, `${circuitName}_*`);
      await execAsync(`rm -f "${zkeyPattern}"`);

      console.log(`Cleaned up files for circuit: ${circuitName}`);
    } catch (error) {
      console.error('Error cleaning circuit files:', error);
      throw error;
    }
  }

  /**
   * Get storage paths for circuit artifacts
   */
  getCircuitPaths(circuitName: string) {
    return {
      witness: path.join(this.witnessDir, `${circuitName}_witness.wtns`),
      zkey: path.join(this.zkeyDir, `${circuitName}_final.zkey`),
      vkey: path.join(this.zkeyDir, `${circuitName}_verification_key.json`),
      inputs: path.join(this.witnessDir, `${circuitName}_input.json`)
    };
  }
}

// Singleton instance
let proofGeneratorService: ProofGeneratorService | null = null;

export function getProofGeneratorService(): ProofGeneratorService {
  if (!proofGeneratorService) {
    proofGeneratorService = new ProofGeneratorService();
  }
  return proofGeneratorService;
}

export default ProofGeneratorService;
