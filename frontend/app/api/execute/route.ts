import { NextRequest, NextResponse } from 'next/server';
import { spawn, exec } from 'child_process';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // Create a unique temporary directory for this execution
    const executionId = `hedera-playground-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tempDir = join(tmpdir(), executionId);
    mkdirSync(tempDir, { recursive: true });

    try {
      // Create package.json for the temporary project
      const packageJson = {
        name: "hedera-playground-temp",
        version: "1.0.0",
        type: "commonjs",
        dependencies: {
          "@hashgraph/sdk": "^2.64.5"
        }
      };
      
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      // Install dependencies (quick install of just Hedera SDK)
      await execAsync('npm install --production --silent', { cwd: tempDir });

      // Create the execution file
      const tempFile = join(tempDir, 'main.js');
      
      // Wrap the code with better error handling and output capture
      const wrappedCode = `
const originalConsole = { ...console };
const outputs = [];

// Override console methods to capture output
console.log = (...args) => {
  const message = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
  outputs.push({ type: 'log', message, timestamp: new Date().toISOString() });
  originalConsole.log(...args);
};

console.error = (...args) => {
  const message = args.map(String).join(' ');
  outputs.push({ type: 'error', message, timestamp: new Date().toISOString() });
  originalConsole.error(...args);
};

console.warn = (...args) => {
  const message = args.map(String).join(' ');
  outputs.push({ type: 'warn', message, timestamp: new Date().toISOString() });
  originalConsole.warn(...args);
};

// Capture unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
});

// Capture uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  process.exit(1);
});

// Execute the user code
(async () => {
  try {
    ${code}
  } catch (error) {
    console.error('Execution Error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    // Output all captured logs as JSON
    setTimeout(() => {
      process.stdout.write('__OUTPUT_START__' + JSON.stringify(outputs) + '__OUTPUT_END__');
      process.exit(0);
    }, 1000); // Give async operations time to complete
  }
})();
`;

      writeFileSync(tempFile, wrappedCode);

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          cleanup();
          resolve(NextResponse.json({ 
            error: 'Execution timeout (45 seconds)', 
            output: '⏰ Code execution timed out after 45 seconds\nThis may happen with long-running operations or infinite loops.' 
          }, { status: 408 }));
        }, 45000);

        const nodeProcess = spawn('node', [tempFile], {
          cwd: tempDir,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, NODE_PATH: join(tempDir, 'node_modules') }
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
            unlinkSync(join(tempDir, 'package.json'));
            // Note: Not removing node_modules for performance, they'll be cleaned up by OS
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

          resolve(NextResponse.json({ 
            output: formattedOutput,
            exitCode,
            success: exitCode === 0
          }));
        });

        nodeProcess.on('error', (error) => {
          clearTimeout(timeout);
          cleanup();

          resolve(NextResponse.json({ 
            error: error.message, 
            output: `❌ Execution failed: ${error.message}`
          }, { status: 500 }));
        });
      });

    } catch (setupError) {
      // Cleanup on setup error
      try {
        unlinkSync(join(tempDir, 'package.json'));
      } catch (err) {
        // Ignore
      }
      
      return NextResponse.json({ 
        error: 'Setup failed', 
        output: `❌ Failed to setup execution environment: ${setupError instanceof Error ? setupError.message : 'Unknown error'}`
      }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error', 
      output: `❌ Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
} 