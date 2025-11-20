# Quick Start Guide - ZK Quest Backend

## ✅ Automatic Circom Installation

**Good news!** You don't need to manually install Circom anymore. The setup is completely automatic!

### How It Works

When you run `npm install` or `npm run build`, the backend will:

1. **Detect your platform** (Windows/Linux/macOS)
2. **Download** the correct Circom 2.2.3 binary from GitHub
3. **Install** it to the `backend/bin/` directory
4. **Verify** the installation

### Local Development

```bash
cd backend

# Install dependencies (Circom will be installed automatically)
npm install

# Start the development server
npm run dev
```

That's it! Circom is ready to use.

### Cloud Deployment

For **any** cloud platform (AWS, GCP, Azure, Heroku, Railway, etc.):

```bash
# Just run npm install
npm install

# Start the server
npm start
```

The Circom compiler will be installed automatically during `npm install` thanks to the `postinstall` script.

## What Gets Installed

- **Circom 2.2.3** binary → `backend/bin/circom` (or `circom.exe` on Windows)
- Size: ~12MB
- No system dependencies required
- Works on Linux, macOS, and Windows

## Cloud Deployment Options

### Option 1: Docker (Recommended)

```bash
# Build
docker build -t zk-quest-backend .

# Run
docker run -p 3001:3001 zk-quest-backend
```

The Dockerfile handles everything automatically.

### Option 2: Direct Deployment

Deploy to any platform that supports Node.js:
- ✅ **AWS** (EC2, ECS, Elastic Beanstalk)
- ✅ **Google Cloud** (Cloud Run, GCE, GKE)
- ✅ **Azure** (App Service, Container Instances)
- ✅ **Heroku**
- ✅ **Railway**
- ✅ **DigitalOcean App Platform**
- ✅ **Vercel/Netlify** (serverless functions)

All you need is:
```json
{
  "scripts": {
    "postinstall": "npm run setup:circom",
    "build": "npm run setup:circom",
    "start": "npx tsx src/server.ts"
  }
}
```

Already configured in your `package.json`! ✓

## Verification

After installation, check the logs for:

```
Circom compiler version detected: circom compiler 2.2.3
Using binary at: /app/bin/circom
```

Or test the endpoint:

```bash
curl http://localhost:3001/zk/health
```

## Manual Setup (If Needed)

If automatic installation fails, you can run it manually:

```bash
npm run setup:circom
```

## Files Created

```
backend/
├── bin/
│   └── circom.exe          # Downloaded Circom binary
├── scripts/
│   └── setup-circom.cjs    # Setup script
├── zk-workspace/
│   ├── circuits/           # Your circuits
│   └── artifacts/          # Compiled artifacts
```

## Need Help?

See the full deployment guide:
- 📖 [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed cloud deployment instructions
- 📖 [README.md](./src/modules/zk/README.md) - ZK module documentation

## Testing Your Setup

Try compiling a test circuit:

```bash
curl -X POST http://localhost:3001/zk/compile \
  -H "Content-Type: application/json" \
  -d '{
    "circuitCode": "pragma circom 2.0.0;\n\ntemplate Multiplier2() {\n  signal input a;\n  signal input b;\n  signal output c;\n  c <== a * b;\n}\n\ncomponent main = Multiplier2();",
    "circuitName": "TestCircuit",
    "options": {
      "includeWasm": true,
      "includeR1cs": true,
      "includeSym": true,
      "optimize": true,
      "prime": "bn128"
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Circuit compiled successfully",
  "circuitName": "TestCircuit",
  "artifacts": { ... }
}
```

## Summary

**For local development:**
```bash
npm install && npm run dev
```

**For cloud deployment:**
```bash
# The platform will run:
npm install  # ← Circom gets installed here automatically
npm start
```

That's it! No manual Circom installation needed. 🎉

