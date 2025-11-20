# ZK Quest - Zero-Knowledge Proof Module

This module handles Circom circuit compilation, proof generation, and verification for the ZK Quest platform.

## Requirements

### Circom Compiler

**Important:** This module requires **Circom 2.x** (specifically version 2.0.0 or higher).

#### Installation

**Windows:**
```bash
# Download the pre-built binary
curl -L -o circom.exe https://github.com/iden3/circom/releases/download/v2.2.3/circom-windows-amd64.exe

# Move to a directory in your PATH
move circom.exe C:\nvm4w\nodejs\
```

**Linux/macOS:**
```bash
# Install Rust if not already installed
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Clone and build Circom
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom
```

#### Verify Installation

```bash
circom --version
# Should output: circom compiler 2.2.3 (or higher)
```

### Node Dependencies

Install the required npm packages:

```bash
cd backend
npm install
```

## API Endpoints

### POST /zk/compile

Compile a Circom circuit.

**Request Body:**
```json
{
  "circuitCode": "pragma circom 2.0.0;\n\ntemplate Multiplier2() {\n  signal input a;\n  signal input b;\n  signal output c;\n  c <== a * b;\n}\n\ncomponent main = Multiplier2();",
  "circuitName": "Multiplier2",
  "options": {
    "includeWasm": true,
    "includeR1cs": true,
    "includeSym": true,
    "includeCpp": false,
    "optimize": true,
    "prime": "bn128"
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Circuit compiled successfully",
  "circuitName": "Multiplier2",
  "artifacts": {
    "r1cs": "path/to/Multiplier2.r1cs",
    "wasm": "path/to/Multiplier2.wasm",
    "wasmJs": "path/to/generate_witness.js",
    "sym": "path/to/Multiplier2.sym"
  },
  "stats": {
    "constraints": 1,
    "privateInputs": 2,
    "publicInputs": 0,
    "outputs": 1,
    "wires": 4
  }
}
```

## Circuit Syntax

All circuits must follow Circom 2.0 syntax:

1. **Pragma Statement** (required): `pragma circom 2.0.0;`
2. **Template Definition**: Define your circuit logic
3. **Main Component** (required): `component main = YourTemplate();`

### Example Circuit

```circom
pragma circom 2.0.0;

template Multiplier2() {
    signal input a;
    signal input b;
    signal output c;
    
    c <== a * b;
}

component main = Multiplier2();
```

## Troubleshooting

### "No artifacts generated" Error

This error typically means:
- Missing `component main = ...` declaration
- Missing `pragma circom 2.0.0;` statement
- Syntax errors in the circuit code

### Version Mismatch Errors

If you see errors about pragma directives or parse errors:
- Verify you have Circom 2.x installed: `circom --version`
- If you have Circom 0.5.x, upgrade to 2.x following the installation instructions above

### Compilation Timeout

For very large circuits:
- Reduce the optimization level (use `O0` or `O1` instead of `O2`)
- Increase the Node.js memory limit: `NODE_OPTIONS=--max-old-space-size=4096`

## Additional Resources

- [Circom Documentation](https://docs.circom.io/)
- [Circom GitHub Repository](https://github.com/iden3/circom)
- [SnarkJS Documentation](https://github.com/iden3/snarkjs)

