import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

/**
 * Remove ANSI color codes from a string
 */
function stripAnsiCodes(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Format Circom compilation errors for better readability
 */
export function formatCircomErrors(errors: string[]): string {
  const formatted: string[] = [];
  
  let currentError: string[] = [];
  
  for (const line of errors) {
    const cleaned = stripAnsiCodes(line);
    
    // Detect start of a new error block
    if (cleaned.includes('error[P')) {
      // Flush previous error if any
      if (currentError.length > 0) {
        formatted.push(currentError.join('\n'));
        currentError = [];
      }
      currentError.push(cleaned);
    } else if (currentError.length > 0) {
      // Add to current error block
      currentError.push(cleaned);
    } else {
      // Standalone error message
      formatted.push(cleaned);
    }
  }
  
  // Flush last error
  if (currentError.length > 0) {
    formatted.push(currentError.join('\n'));
  }
  
  return formatted.join('\n\n');
}

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
  private circomVersion: string | null = null;
  private versionChecked: boolean = false;
  private circomBinaryPath: string;

  constructor(workDir?: string) {
    this.workDir = workDir || path.join(process.cwd(), 'zk-workspace');
    this.circuitsDir = path.join(this.workDir, 'circuits');
    this.artifactsDir = path.join(this.workDir, 'artifacts');
    
    // Determine circom binary path (local or global)
    const localBinary = path.join(process.cwd(), 'bin', process.platform === 'win32' ? 'circom.exe' : 'circom');
    this.circomBinaryPath = existsSync(localBinary) ? localBinary : 'circom';
  }

  /**
   * Get and cache the Circom compiler version
   */
  private async getCircomVersion(): Promise<string | null> {
    if (this.versionChecked) {
      return this.circomVersion;
    }

    try {
      const { stdout } = await execAsync(`"${this.circomBinaryPath}" --version`, {
        maxBuffer: 1024 * 1024
      });
      const version = stdout.trim();
      this.circomVersion = version;
      this.versionChecked = true;
      console.log(`Circom compiler version detected: ${version}`);
      console.log(`Using binary at: ${this.circomBinaryPath}`);
      return version;
    } catch (error) {
      console.error('Failed to detect Circom version:', error);
      this.versionChecked = true;
      return null;
    }
  }

  /**
   * Check if the installed Circom version is compatible with Circom 2.0 syntax
   */
  private async isCircom2Compatible(): Promise<boolean> {
    const version = await this.getCircomVersion();
    if (!version) return false;
    
    // Parse version number (e.g., "circom compiler 2.1.0" -> 2 or "2.1.0" -> 2)
    // Extract numbers from the version string
    const versionMatch = version.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!versionMatch) return false;
    
    const majorVersion = parseInt(versionMatch[1]);
    return majorVersion >= 2;
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

      // Validate circuit syntax before compilation
      const validationResult = await this.validateCircuitSyntaxSync(circuitCode);
      if (!validationResult.valid) {
        return {
          success: false,
          circuitName,
          artifacts: {},
          errors: validationResult.errors
        };
      }

      // Write circuit to file
      const circuitPath = path.join(this.circuitsDir, `${circuitName}.circom`);
      await fs.writeFile(circuitPath, circuitCode, 'utf-8');

      // Build compilation command
      const outputDir = path.join(this.artifactsDir, circuitName);
      await fs.mkdir(outputDir, { recursive: true });

      // Circom 2.x requires executing from the output directory
      // Build relative path from output directory to circuit file
      const relativeCircuitPath = path.relative(outputDir, circuitPath);
      
    // Add node_modules to include path
      const nodeModulesPath = path.join(process.cwd(), 'node_modules');
      
      let compileCmd = `"${this.circomBinaryPath}" "${relativeCircuitPath}" --prime ${prime} -l "${nodeModulesPath}"`;

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
      console.log(`Working directory: ${outputDir}`);

      // Execute compilation from the output directory
      const { stdout, stderr } = await execAsync(compileCmd, {
        cwd: outputDir,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      // Parse output for warnings/errors
      const warnings: string[] = [];
      const errors: string[] = [];

      // Circom outputs compilation messages to both stdout and stderr
      const allOutput = `${stdout}\n${stderr}`;
      
      if (allOutput) {
        const lines = allOutput.split('\n');
        lines.forEach(line => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;
          
          // Check for error patterns
          if (trimmedLine.toLowerCase().includes('error') || 
              trimmedLine.includes('Error:') ||
              trimmedLine.includes('error[')) {
            errors.push(trimmedLine);
          } 
          // Check for warning patterns
          else if (trimmedLine.toLowerCase().includes('warning') ||
                   trimmedLine.includes('Warning:')) {
            warnings.push(trimmedLine);
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

      if (result.success) {
        console.log(`Circuit compiled successfully: ${circuitName}`);
        console.log(`Artifacts generated:`, Object.keys(artifacts));
      } else {
        console.warn(`Compilation completed but failed to generate artifacts for: ${circuitName}`);
        if (errors.length === 0 && Object.keys(artifacts).length === 0) {
          const noArtifactsMsg = "No artifacts generated. Ensure your circuit has a 'component main = ...' declaration.";
          if (!result.errors) result.errors = [];
          result.errors.push(noArtifactsMsg);
          console.warn(noArtifactsMsg);
        }
      }

      return result;
    } catch (error: any) {
      console.error('Compilation error:', error);
      
      // Extract and clean detailed error from stdout/stderr
      const errorLines: string[] = [];
      
      const processOutput = (output: string) => {
        if (!output) return;
        const lines = output.split('\n');
        lines.forEach(line => {
          const trimmed = line.trim();
          // Filter out stack traces and internal node errors
          if (trimmed && 
              !trimmed.startsWith('at ') && 
              !trimmed.includes('node:internal') && 
              !trimmed.includes('child_process')) {
            errorLines.push(line); // Keep original indentation
          }
        });
      };

      if (error.stdout) processOutput(error.stdout);
      if (error.stderr) processOutput(error.stderr);
      
      // Fallback if no details found in output but message exists
      if (errorLines.length === 0 && error.message) {
         // If message is just "Command failed", it's not very useful without output
         if (!error.message.startsWith('Command failed')) {
            errorLines.push(error.message);
         }
      }
      
      // If still empty, force a message
      if (errorLines.length === 0) {
        errorLines.push('Unknown compilation error occurred');
      }

      // Deduplicate lines while preserving order
      const uniqueErrors = [...new Set(errorLines)];

      return {
        success: false,
        circuitName,
        artifacts: {},
        errors: uniqueErrors
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
   * Validate circuit syntax synchronously (basic checks)
   */
  private async validateCircuitSyntaxSync(circuitCode: string): Promise<{
    valid: boolean;
    errors?: string[];
  }> {
    const errors: string[] = [];
    const isCircom2 = await this.isCircom2Compatible();
    const version = this.circomVersion || 'unknown';

    // Check for pragma statement
    const hasPragma = circuitCode.includes('pragma circom');
    
    // Version-specific validation
    if (isCircom2) {
      // Circom 2.0+ requires pragma
      if (!hasPragma) {
        errors.push(
          `Circom ${version} requires a pragma statement. Add "pragma circom 2.0.0;" at the beginning of your circuit.`
        );
      }
    } else {
      // Old Circom (0.5.x) doesn't support pragma
      if (hasPragma) {
        errors.push(
          `Your Circom compiler version (${version}) does not support the "pragma" directive. ` +
          `This is Circom 2.0 syntax. Please either:\n` +
          `  1. Upgrade to Circom 2.0+ (recommended): npm install -g circom@latest\n` +
          `  2. Remove the "pragma circom 2.0.0;" line to use legacy syntax`
        );
      }
    }

    // Check for main component declaration
    const mainComponentRegex = /component\s+main\s*(?:\{[^}]*\})?\s*=\s*\w+\s*\([^)]*\)\s*;/;
    if (!mainComponentRegex.test(circuitCode)) {
      errors.push(
        'Missing main component declaration. Add "component main = YourTemplate();" at the end of your circuit.'
      );
    }

    // Check for at least one template definition
    if (!circuitCode.includes('template ')) {
      errors.push(
        'No template definition found. Define at least one template with "template TemplateName() { ... }".'
      );
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate circuit syntax without full compilation
   */
  async validateCircuitSyntax(circuitCode: string, circuitName: string): Promise<{
    valid: boolean;
    errors?: string[];
  }> {
    // First do synchronous validation
    const syncResult = await this.validateCircuitSyntaxSync(circuitCode);
    if (!syncResult.valid) {
      return syncResult;
    }

    try {
      // Ensure directory exists
      await this.initialize();
      
      // Write circuit to temporary file
      const tempPath = path.join(this.circuitsDir, `_temp_${circuitName}.circom`);
      await fs.writeFile(tempPath, circuitCode, 'utf-8');

      // Add node_modules to include path
      const nodeModulesPath = path.join(process.cwd(), 'node_modules');

      // Run circom with --inspect flag only
      const { stderr, stdout } = await execAsync(`"${this.circomBinaryPath}" "${tempPath}" --inspect -l "${nodeModulesPath}"`, {
        maxBuffer: 1024 * 1024
      });

      // Clean up temp file
      await fs.unlink(tempPath);

      const allOutput = `${stdout}\n${stderr}`;
      if (allOutput && allOutput.toLowerCase().includes('error')) {
        const errors = allOutput.split('\n').filter(line => 
          line.trim() && line.toLowerCase().includes('error')
        );
        return { valid: false, errors };
      }

      return { valid: true };
    } catch (error: any) {
      // Extract error messages from the compilation failure
      const errorMessages: string[] = [];
      
      if (error.stderr) {
        const lines = error.stderr.split('\n');
        lines.forEach((line: string) => {
          const trimmed = line.trim();
          if (trimmed && (trimmed.toLowerCase().includes('error') || trimmed.includes('Error:'))) {
            errorMessages.push(trimmed);
          }
        });
      }

      if (errorMessages.length === 0 && error.message) {
        errorMessages.push(error.message);
      }

      return {
        valid: false,
        errors: errorMessages.length > 0 ? errorMessages : ['Unknown validation error']
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
