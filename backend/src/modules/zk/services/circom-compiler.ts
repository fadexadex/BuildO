import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

/**
 * Circom Compiler Service
 * Handles compilation of Circom circuits into various artifacts needed for proof generation
 */

export interface CircuitCompilationResult {
  success: boolean;
  circuitName: string;
  artifacts: {
    r1cs?: string;        // R1CS constraint system file path
    wasm?: string;        // WASM witness calculator path
    wasmJs?: string;      // WASM JavaScript wrapper path
    sym?: string;         // Symbol file path
    cpp?: string;         // C++ witness calculator directory path
  };
  errors?: string[];
  warnings?: string[];
  stats?: {
    constraints: number;
    privateInputs: number;
    publicInputs: number;
    outputs: number;
    wires: number;
  };
}

export interface CompilationOptions {
  includeWasm?: boolean;      // Generate WASM witness calculator (default: true)
  includeCpp?: boolean;       // Generate C++ witness calculator
  includeR1cs?: boolean;      // Generate R1CS file (default: true)
  includeSym?: boolean;       // Generate symbol file
  optimize?: boolean;         // Enable circuit optimization (default: true)
  verbose?: boolean;          // Verbose output
  inspect?: boolean;          // Inspect R1CS system
  prime?: 'bn128' | 'bls12381' | 'goldilocks'; // Prime field (default: bn128)
}

export class CircomCompilerService {
  private workDir: string;
  private circuitsDir: string;
  private artifactsDir: string;

  constructor(workDir?: string) {
    this.workDir = workDir || path.join(process.cwd(), 'zk-workspace');
    this.circuitsDir = path.join(this.workDir, 'circuits');
    this.artifactsDir = path.join(this.workDir, 'artifacts');
  }

  /**
   * Initialize the working directories
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.circuitsDir, { recursive: true });
      await fs.mkdir(this.artifactsDir, { recursive: true });
      console.log('Circom compiler workspace initialized');
    } catch (error) {
      console.error('Error initializing workspace:', error);
      throw error;
    }
  }

  /**
   * Compile a Circom circuit from source code
   */
  async compileCircuit(
    circuitCode: string,
    circuitName: string,
    options: CompilationOptions = {}
  ): Promise<CircuitCompilationResult> {
    const {
      includeWasm = true,
      includeCpp = false,
      includeR1cs = true,
      includeSym = true,
      optimize = true,
      verbose = false,
      inspect = false,
      prime = 'bn128'
    } = options;

    try {
      // Ensure workspace is initialized
      await this.initialize();

      // Write circuit to file
      const circuitPath = path.join(this.circuitsDir, `${circuitName}.circom`);
      await fs.writeFile(circuitPath, circuitCode, 'utf-8');

      // Build compilation command
      const outputDir = path.join(this.artifactsDir, circuitName);
      await fs.mkdir(outputDir, { recursive: true });

      let compileCmd = `circom "${circuitPath}" -o "${outputDir}" --prime ${prime}`;

      // Add flags based on options
      if (includeR1cs) compileCmd += ' --r1cs';
      if (includeWasm) compileCmd += ' --wasm';
      if (includeCpp) compileCmd += ' --c';
      if (includeSym) compileCmd += ' --sym';
      if (optimize) compileCmd += ' --O1';
      if (verbose) compileCmd += ' --verbose';
      if (inspect) compileCmd += ' --inspect';

      console.log(`Compiling circuit: ${circuitName}`);
      console.log(`Command: ${compileCmd}`);

      // Execute compilation
      const { stdout, stderr } = await execAsync(compileCmd, {
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      // Parse output for warnings/errors
      const warnings: string[] = [];
      const errors: string[] = [];

      if (stderr) {
        const lines = stderr.split('\n');
        lines.forEach(line => {
          if (line.toLowerCase().includes('warning')) {
            warnings.push(line);
          } else if (line.toLowerCase().includes('error')) {
            errors.push(line);
          }
        });
      }

      // Check if compilation was successful
      const artifacts: CircuitCompilationResult['artifacts'] = {};

      if (includeR1cs) {
        const r1csPath = path.join(outputDir, `${circuitName}.r1cs`);
        if (existsSync(r1csPath)) {
          artifacts.r1cs = r1csPath;
        }
      }

      if (includeWasm) {
        const wasmDir = path.join(outputDir, `${circuitName}_js`);
        const wasmPath = path.join(wasmDir, `${circuitName}.wasm`);
        const wasmJsPath = path.join(wasmDir, 'generate_witness.js');
        
        if (existsSync(wasmPath)) {
          artifacts.wasm = wasmPath;
        }
        if (existsSync(wasmJsPath)) {
          artifacts.wasmJs = wasmJsPath;
        }
      }

      if (includeSym) {
        const symPath = path.join(outputDir, `${circuitName}.sym`);
        if (existsSync(symPath)) {
          artifacts.sym = symPath;
        }
      }

      if (includeCpp) {
        const cppDir = path.join(outputDir, `${circuitName}_cpp`);
        if (existsSync(cppDir)) {
          artifacts.cpp = cppDir;
        }
      }

      // Parse circuit statistics
      const stats = await this.parseCircuitStats(stdout, artifacts.sym);

      const result: CircuitCompilationResult = {
        success: errors.length === 0 && Object.keys(artifacts).length > 0,
        circuitName,
        artifacts,
        warnings: warnings.length > 0 ? warnings : undefined,
        errors: errors.length > 0 ? errors : undefined,
        stats
      };

      console.log(`Circuit compiled successfully: ${circuitName}`);
      console.log(`Artifacts generated:`, Object.keys(artifacts));

      return result;
    } catch (error) {
      console.error('Compilation error:', error);
      
      return {
        success: false,
        circuitName,
        artifacts: {},
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Compile a circuit from a file
   */
  async compileCircuitFile(
    circuitFilePath: string,
    options: CompilationOptions = {}
  ): Promise<CircuitCompilationResult> {
    try {
      const circuitCode = await fs.readFile(circuitFilePath, 'utf-8');
      const circuitName = path.basename(circuitFilePath, '.circom');
      
      return await this.compileCircuit(circuitCode, circuitName, options);
    } catch (error) {
      console.error('Error reading circuit file:', error);
      throw error;
    }
  }

  /**
   * Parse circuit statistics from compilation output
   */
  private async parseCircuitStats(
    stdout: string,
    symPath?: string
  ): Promise<CircuitCompilationResult['stats']> {
    const stats: CircuitCompilationResult['stats'] = {
      constraints: 0,
      privateInputs: 0,
      publicInputs: 0,
      outputs: 0,
      wires: 0
    };

    try {
      // Parse from stdout
      const constraintsMatch = stdout.match(/non-linear constraints:\s*(\d+)/i);
      if (constraintsMatch) {
        stats.constraints = parseInt(constraintsMatch[1]);
      }

      const wiresMatch = stdout.match(/wires:\s*(\d+)/i);
      if (wiresMatch) {
        stats.wires = parseInt(wiresMatch[1]);
      }

      // Parse from symbol file if available
      if (symPath && existsSync(symPath)) {
        const symContent = await fs.readFile(symPath, 'utf-8');
        const lines = symContent.split('\n');
        
        lines.forEach(line => {
          if (line.includes('main.')) {
            if (line.includes('[input]')) {
              stats.privateInputs++;
            } else if (line.includes('[output]')) {
              stats.outputs++;
            }
          }
        });
      }

      return stats;
    } catch (error) {
      console.warn('Could not parse circuit stats:', error);
      return stats;
    }
  }

  /**
   * Get compiled circuit artifacts
   */
  async getArtifacts(circuitName: string): Promise<CircuitCompilationResult['artifacts']> {
    const outputDir = path.join(this.artifactsDir, circuitName);
    
    if (!existsSync(outputDir)) {
      throw new Error(`No artifacts found for circuit: ${circuitName}`);
    }

    const artifacts: CircuitCompilationResult['artifacts'] = {};

    const r1csPath = path.join(outputDir, `${circuitName}.r1cs`);
    if (existsSync(r1csPath)) {
      artifacts.r1cs = r1csPath;
    }

    const wasmDir = path.join(outputDir, `${circuitName}_js`);
    const wasmPath = path.join(wasmDir, `${circuitName}.wasm`);
    const wasmJsPath = path.join(wasmDir, 'generate_witness.js');
    
    if (existsSync(wasmPath)) {
      artifacts.wasm = wasmPath;
    }
    if (existsSync(wasmJsPath)) {
      artifacts.wasmJs = wasmJsPath;
    }

    const symPath = path.join(outputDir, `${circuitName}.sym`);
    if (existsSync(symPath)) {
      artifacts.sym = symPath;
    }

    const cppDir = path.join(outputDir, `${circuitName}_cpp`);
    if (existsSync(cppDir)) {
      artifacts.cpp = cppDir;
    }

    return artifacts;
  }

  /**
   * Clean up workspace for a specific circuit
   */
  async cleanCircuit(circuitName: string): Promise<void> {
    try {
      const circuitPath = path.join(this.circuitsDir, `${circuitName}.circom`);
      const artifactsPath = path.join(this.artifactsDir, circuitName);

      if (existsSync(circuitPath)) {
        await fs.unlink(circuitPath);
      }

      if (existsSync(artifactsPath)) {
        await fs.rm(artifactsPath, { recursive: true });
      }

      console.log(`Cleaned up workspace for circuit: ${circuitName}`);
    } catch (error) {
      console.error('Error cleaning circuit:', error);
      throw error;
    }
  }

  /**
   * Validate circuit syntax without full compilation
   */
  async validateCircuitSyntax(circuitCode: string, circuitName: string): Promise<{
    valid: boolean;
    errors?: string[];
  }> {
    try {
      // Write circuit to temporary file
      const tempPath = path.join(this.circuitsDir, `_temp_${circuitName}.circom`);
      await fs.writeFile(tempPath, circuitCode, 'utf-8');

      // Run circom with --inspect flag only
      const { stderr } = await execAsync(`circom "${tempPath}" --inspect`, {
        maxBuffer: 1024 * 1024
      });

      // Clean up temp file
      await fs.unlink(tempPath);

      if (stderr && stderr.toLowerCase().includes('error')) {
        const errors = stderr.split('\n').filter(line => 
          line.toLowerCase().includes('error')
        );
        return { valid: false, errors };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }
}

// Singleton instance
let compilerService: CircomCompilerService | null = null;

export function getCircomCompilerService(): CircomCompilerService {
  if (!compilerService) {
    compilerService = new CircomCompilerService();
  }
  return compilerService;
}

export default CircomCompilerService;
