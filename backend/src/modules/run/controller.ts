import { Request, Response, NextFunction } from 'express';
import { spawn, exec } from 'child_process';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { promisify } from 'util';
import { AppError } from '../../middlewares/error.handler.js';

const execAsync = promisify(exec);

interface RunRequest {
  code: string;
}

// Use the backend's existing node_modules (where @hashgraph/sdk is already installed)
const BACKEND_NODE_MODULES = join(process.cwd(), 'node_modules');

export async function executeCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.body as RunRequest;

    if (!code || typeof code !== 'string') {
      throw new AppError('Code is required and must be a string', 400);
    }

    // Create a unique temporary directory for this execution
    const executionId = `hedera-playground-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tempDir = join(tmpdir(), executionId);
    
    try {
      mkdirSync(tempDir, { recursive: true });
    } catch (setupError) {
      throw new AppError(
        `Failed to create execution directory: ${setupError instanceof Error ? setupError.message : 'Unknown error'}`,
        500
      );
    }

    try {
      // Create the execution file directly (no package.json or npm install needed)
      const tempFile = join(tempDir, 'main.js');
      
      // Wrap the code with better error handling and output capture
      const wrappedCode = `
const originalConsole = { ...console };
const outputs = [];

// Helper function to safely stringify objects
function safeStringify(arg) {
  if (typeof arg === 'object' && arg !== null) {
    try {
      // First try JSON.stringify
      return JSON.stringify(arg, null, 2);
    } catch (e) {
      // For complex objects, show useful info
      try {
        const constructorName = arg.constructor ? arg.constructor.name : 'Object';
        
        // Special handling for common SDK objects
        if (constructorName === 'Client') {
          return '[Hedera Client Instance]';
        } else if (constructorName === 'AccountId') {
          return arg.toString();
        } else if (constructorName === 'PrivateKey') {
          return '[PrivateKey Instance]';
        } else if (constructorName !== 'Object') {
          return \`[\${constructorName} Instance]\`;
        }
        
        // Try toString as fallback
        const stringified = arg.toString();
        return stringified === '[object Object]' ? \`[\${constructorName}]\` : stringified;
      } catch (e2) {
        return '[Complex Object]';
      }
    }
  }
  return String(arg);
}

// Override console methods with improved object handling
console.log = (...args) => {
  const message = args.map(safeStringify).join(' ');
  outputs.push({ type: 'log', message, timestamp: new Date().toISOString() });
  originalConsole.log(...args);
};

console.error = (...args) => {
  const message = args.map(safeStringify).join(' ');
  outputs.push({ type: 'error', message, timestamp: new Date().toISOString() });
  originalConsole.error(...args);
};

console.warn = (...args) => {
  const message = args.map(safeStringify).join(' ');
  outputs.push({ type: 'warn', message, timestamp: new Date().toISOString() });
  originalConsole.warn(...args);
};

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  process.exit(1);
});

(async () => {
  try {
    ${code}
  } catch (error) {
    console.error('Execution Error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    setTimeout(() => {
      process.stdout.write('__OUTPUT_START__' + JSON.stringify(outputs) + '__OUTPUT_END__');
      process.exit(0);
    }, 1000);
  }
})();
`;

      try {
        writeFileSync(tempFile, wrappedCode);
      } catch (writeError) {
        throw new AppError(
          `Failed to write execution file: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`,
          500
        );
      }

      // Execute the code and return a promise
      const result = await new Promise<{ output: string; exitCode: number; success: boolean }>((resolve) => {
        const timeout = setTimeout(() => {
          cleanup();
          resolve({ 
            output: '⏰ Code execution timed out after 45 seconds\nThis may happen with long-running operations or infinite loops.',
            exitCode: 124,
            success: false
          });
        }, 45000);

        const nodeProcess = spawn('node', [tempFile], {
          cwd: tempDir,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { 
            ...process.env, 
            NODE_PATH: BACKEND_NODE_MODULES  // Use backend's node_modules
          }
        });

        let output = '';
        let errorOutput = '';

        nodeProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        nodeProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        const cleanup = () => {
          try {
            unlinkSync(tempFile);
            // No package.json to clean up anymore
          } catch (err) {
            // Ignore cleanup errors
          }
        };

        nodeProcess.on('close', (exitCode) => {
          clearTimeout(timeout);
          cleanup();

          // Extract captured outputs
          let capturedOutputs: Array<{type: string, message: string, timestamp: string}> = [];
          const outputMatch = output.match(/__OUTPUT_START__([\s\S]*?)__OUTPUT_END__/);
          if (outputMatch) {
            try {
              capturedOutputs = JSON.parse(outputMatch[1]);
            } catch (err) {
              // Fallback to raw output
            }
          }

          // Format the output with timestamps and emojis
          let formattedOutput = '';
          
          if (capturedOutputs.length > 0) {
            capturedOutputs.forEach(({ type, message, timestamp }) => {
              const time = new Date(timestamp).toLocaleTimeString();
              const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '📝';
              formattedOutput += `[${time}] ${prefix} ${message}\n`;
            });
          } else if (output.trim()) {
            // Remove the output markers and display raw output
            const cleanOutput = output.replace(/__OUTPUT_START__[\s\S]*?__OUTPUT_END__/, '').trim();
            if (cleanOutput) {
              formattedOutput = `📝 ${cleanOutput}`;
            }
          }

          if (errorOutput.trim()) {
            formattedOutput += `${formattedOutput ? '\n' : ''}❌ Error: ${errorOutput.trim()}`;
          }

          if (exitCode !== 0) {
            formattedOutput += `${formattedOutput ? '\n' : ''}💥 Process exited with code ${exitCode}`;
          } else if (!formattedOutput.trim()) {
            formattedOutput = '✅ Code executed successfully (no output generated)';
          }

          resolve({ 
            output: formattedOutput,
            exitCode: exitCode || 0,
            success: exitCode === 0
          });
        });

        nodeProcess.on('error', (error) => {
          clearTimeout(timeout);
          cleanup();

          resolve({ 
            output: `❌ Execution failed: ${error.message}`,
            exitCode: 1,
            success: false
          });
        });
      });

      res.json({
        ...result,
        success: result.success
      });

    } catch (setupError) {
      throw new AppError(
        `Execution setup failed: ${setupError instanceof Error ? setupError.message : 'Unknown error'}`,
        500
      );
    }

  } catch (error) {
    console.error('Error in executeCode:', error);
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(
        `Code execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      ));
    }
  }
}