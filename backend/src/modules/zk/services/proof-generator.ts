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
  private ptauDir: string;

  constructor(workDir?: string) {
    this.workDir = workDir || path.join(process.cwd(), 'zk-workspace');
    this.witnessDir = path.join(this.workDir, 'witness');
    this.zkeyDir = path.join(this.workDir, 'zkeys');
    this.ptauDir = path.join(this.workDir, 'ptau');
    
    // Try to find any available ptau file (prefer larger ones)
    const ptauFiles = [
      'powersOfTau28_hez_final_15.ptau',  // 2^15 - 32k constraints
      'powersOfTau28_hez_final_12.ptau',  // 2^12 - 4k constraints
      'powersOfTau28_hez_final_10.ptau',  // 2^10 - 1k constraints
    ];
    
    this.ptauPath = '';
    for (const ptauFile of ptauFiles) {
      const testPath = path.join(this.ptauDir, ptauFile);
      if (existsSync(testPath)) {
        this.ptauPath = testPath;
        console.log(`Using Powers of Tau file: ${path.basename(testPath)}`);
        break;
      }
    }
    
    // Fallback to default if none found
    if (!this.ptauPath) {
      this.ptauPath = path.join(this.ptauDir, 'powersOfTau28_hez_final_10.ptau');
    }
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
    console.log('Powers of Tau file not found. Attempting download...');
    
    try {
      const https = await import('https');
      const PTAU_URL = 'https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_10.ptau';
      
      console.log(`Downloading from: ${PTAU_URL}`);
      console.log(`Target location: ${this.ptauPath}`);
      console.log('This may take a few minutes (file size: ~16 MB)...');
      
      await this.downloadFileWithProgress(PTAU_URL, this.ptauPath);
      
      console.log('✓ Powers of Tau file downloaded successfully!');
    } catch (error) {
      console.error('Failed to download Powers of Tau file automatically.');
      console.error('Please download it manually using:');
      console.error('  npm run setup:ptau');
      console.error('');
      console.error('Or manually download from:');
      console.error('  https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_10.ptau');
      console.error(`And place it at: ${this.ptauPath}`);
      throw new Error('Powers of tau file is required for proof generation');
    }
  }

  /**
   * Download file with progress tracking
   */
  private async downloadFileWithProgress(url: string, destination: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const https = await import('https');
      const fsSync = await import('fs');
      
      const file = fsSync.createWriteStream(destination);
      
      https.get(url, (response) => {
        // Follow redirects
        if (response.statusCode === 302 || response.statusCode === 301) {
          file.close();
          fsSync.unlinkSync(destination);
          return this.downloadFileWithProgress(response.headers.location!, destination)
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200) {
          file.close();
          if (existsSync(destination)) {
            fsSync.unlinkSync(destination);
          }
          reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
          return;
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        let lastPercent = 0;

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const percent = Math.floor((downloadedBytes / totalBytes) * 100);
          
          if (percent !== lastPercent && percent % 10 === 0) {
            console.log(`Download progress: ${percent}%`);
            lastPercent = percent;
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });

        file.on('error', (err) => {
          file.close();
          if (existsSync(destination)) {
            fsSync.unlinkSync(destination);
          }
          reject(err);
        });
      }).on('error', (err) => {
        file.close();
        if (existsSync(destination)) {
          fsSync.unlinkSync(destination);
        }
        reject(err);
      });
    });
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
        const errorMsg = [
          'Powers of Tau file not found.',
          '',
          'Please run one of these commands:',
          '  npm run setup:ptau    (for circuits with up to 1,024 constraints)',
          '  npm run setup:ptau15  (for circuits with up to 32,768 constraints)',
          '',
          `Expected location: ${this.ptauPath}`,
          '',
          'Or download manually from:',
          '  https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_10.ptau',
        ].join('\n');
        throw new Error(errorMsg);
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

   let shouldRegenerate = !existsSync(zkeyPath);

    if (!shouldRegenerate && existsSync(r1csPath)) {
      // Check if zkey is stale compared to R1CS
      try {
        const zkeyStats = await fs.stat(zkeyPath);
        const r1csStats = await fs.stat(r1csPath);
        
        if (r1csStats.mtime > zkeyStats.mtime) {
          console.log(`Zkey is stale (R1CS is newer). Regenerating zkey for: ${circuitName}`);
          shouldRegenerate = true;
          // Clean up old zkey to force regeneration
          await fs.unlink(zkeyPath).catch(e => console.warn('Failed to delete old zkey:', e));
        }
      } catch (error) {
        console.warn('Error checking file timestamps, forcing regeneration:', error);
        shouldRegenerate = true;
      }
    }

    if (!shouldRegenerate) {
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
