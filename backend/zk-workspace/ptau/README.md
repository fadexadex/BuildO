  # Powers of Tau Files

This directory contains Powers of Tau ceremony files required for generating zero-knowledge proofs with Circom circuits.

## What are Powers of Tau files?

Powers of Tau files (`.ptau`) contain cryptographic parameters from a trusted setup ceremony. These files are required for generating and verifying zero-knowledge proofs using proving systems like Groth16 and PLONK.

## Which file do I need?

The Powers of Tau file you need depends on the complexity of your circuit (number of constraints):

| File | Power | Max Constraints | File Size | Use Case |
|------|-------|----------------|-----------|----------|
| `powersOfTau28_hez_final_10.ptau` | 2^10 | 1,024 | ~1.3 MB | Simple circuits, demos |
| `powersOfTau28_hez_final_12.ptau` | 2^12 | 4,096 | ~5 MB | Small to medium circuits |
| `powersOfTau28_hez_final_15.ptau` | 2^15 | 32,768 | ~50 MB | Medium to large circuits |
| `powersOfTau28_hez_final_20.ptau` | 2^20 | 1,048,576 | ~1.6 GB | Very large circuits |

**Tip:** Use `snarkjs info -r circuit.r1cs` after compiling to see how many constraints your circuit has.

## Download Instructions

### Option 1: Use npm scripts (Recommended)

```bash
# For small circuits (up to 1,024 constraints)
npm run setup:ptau

# For larger circuits (up to 32,768 constraints)
npm run setup:ptau15
```

### Option 2: Manual download with curl

```bash
# Powers of Tau 2^10 (1,024 constraints)
curl -o zk-workspace/ptau/powersOfTau28_hez_final_10.ptau \
  https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_10.ptau

# Powers of Tau 2^15 (32,768 constraints)
curl -o zk-workspace/ptau/powersOfTau28_hez_final_15.ptau \
  https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_15.ptau
```

### Option 3: Manual download with wget

```bash
# Powers of Tau 2^10
wget -O zk-workspace/ptau/powersOfTau28_hez_final_10.ptau \
  https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_10.ptau

# Powers of Tau 2^15
wget -O zk-workspace/ptau/powersOfTau28_hez_final_15.ptau \
  https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_15.ptau
```

## Alternative Download Sources

If the Google Storage link doesn't work, try these mirrors:

- **Hermez S3 (EU):** `https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_XX.ptau`

Replace `XX` with `10`, `12`, `15`, `20`, etc.

## Verification

After downloading, verify the file size:

```bash
ls -lh zk-workspace/ptau/

# Expected sizes:
# powersOfTau28_hez_final_10.ptau: ~1.3 MB
# powersOfTau28_hez_final_15.ptau: ~50 MB
```

## Usage

The proof generator service will automatically detect and use the largest available Powers of Tau file in this directory. The priority order is:

1. `powersOfTau28_hez_final_15.ptau` (if available)
2. `powersOfTau28_hez_final_12.ptau` (if available)
3. `powersOfTau28_hez_final_10.ptau` (fallback)

## Troubleshooting

### Error: "Powers of tau file not found"

This means no `.ptau` file was found in this directory. Run one of the setup commands:

```bash
npm run setup:ptau
```

### Error: Circuit has too many constraints

Your circuit has more constraints than your Powers of Tau file supports. Download a larger file:

```bash
npm run setup:ptau15  # For up to 32k constraints
```

### Download fails with HTTP 403

Try:
1. Using a different mirror (see Alternative Download Sources above)
2. Using a VPN if the source is region-restricted
3. Downloading from a different network
4. Using wget or curl directly instead of the npm scripts

## More Information

- [Circom Documentation](https://docs.circom.io/)
- [snarkjs Documentation](https://github.com/iden3/snarkjs)
- [Powers of Tau Ceremony](https://blog.hermez.io/hermez-cryptographic-setup/)

## File Integrity

These files come from trusted setup ceremonies. For production use, you should verify the file integrity. Learn more at:
- https://github.com/iden3/snarkjs#7-prepare-phase-2



