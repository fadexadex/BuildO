# Cloud Deployment Guide

This guide covers deploying the ZK Quest backend to various cloud platforms.

## Prerequisites

The application will **automatically download and install** the Circom compiler during the build/install process. No manual installation required!

### What Gets Installed Automatically

When you run `npm install` or `npm run build`, the setup script will:
1. Detect your platform (Linux/macOS/Windows)
2. Download the appropriate Circom 2.2.3 binary
3. Install it to the `backend/bin/` directory
4. Verify the installation

## Quick Start

```bash
# Clone and setup
git clone <your-repo>
cd backend

# Install dependencies (this will also install Circom automatically)
npm install

# Start the server
npm start
```

That's it! The Circom compiler is ready to use.

## Platform-Specific Instructions

### Docker Deployment

Use the provided Dockerfile:

```bash
# Build the Docker image
docker build -t zk-quest-backend .

# Run the container
docker run -p 3001:3001 -e DATABASE_URL="your-db-url" zk-quest-backend
```

### AWS (EC2, Elastic Beanstalk, ECS)

**Option 1: Using Docker**
- Use the Dockerfile provided
- Deploy to ECS or Elastic Beanstalk with Docker
- No additional setup needed

**Option 2: Direct Deployment**
```bash
# SSH into your EC2 instance
ssh ec2-user@your-instance

# Install Node.js (if not already installed)
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Clone and setup your application
git clone <your-repo>
cd backend
npm install  # This installs Circom automatically
npm start
```

### Google Cloud Platform (Cloud Run, GCE, GKE)

**Using Cloud Run (Recommended):**
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT-ID/zk-quest-backend
gcloud run deploy zk-quest-backend \
  --image gcr.io/PROJECT-ID/zk-quest-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Heroku

Create a `Procfile` in your backend directory:
```
web: npm start
```

Deploy:
```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Push to Heroku
git push heroku main

# The buildpack will automatically run npm install,
# which triggers the Circom installation
```

### Azure (App Service, Container Instances)

**Using Azure App Service:**
```bash
# Create a web app
az webapp create \
  --resource-group myResourceGroup \
  --plan myAppServicePlan \
  --name myZKQuestApp \
  --runtime "NODE|18-lts"

# Deploy your code
az webapp deployment source config \
  --name myZKQuestApp \
  --resource-group myResourceGroup \
  --repo-url https://github.com/yourusername/yourrepo \
  --branch main
```

### DigitalOcean App Platform

1. Connect your GitHub repository
2. Configure build settings:
   - Build Command: `npm install`
   - Run Command: `npm start`
3. Deploy - Circom will be installed automatically

### Railway

1. Connect your GitHub repository
2. Railway will automatically:
   - Run `npm install` (which installs Circom)
   - Start your application
3. No additional configuration needed

## Environment Variables

Make sure to set these environment variables in your cloud platform:

```env
# Database
DATABASE_URL=your-database-url

# Hedera Configuration
HEDERA_ACCOUNT_ID=your-account-id
HEDERA_PRIVATE_KEY=your-private-key
HEDERA_NETWORK=testnet

# API Keys (if needed)
GROQ_API_KEY=your-groq-api-key

# Server Configuration
PORT=3001
NODE_ENV=production
```

## Verifying Circom Installation

After deployment, you can verify Circom is working by checking the logs during startup:

```
Circom compiler version detected: circom compiler 2.2.3
Using binary at: /app/bin/circom
```

Or by calling the health endpoint:
```bash
curl https://your-app.com/zk/health
```

## Troubleshooting

### Binary Not Found

If you get "circom: command not found":

1. Check that `npm install` completed successfully
2. Verify the `bin/` directory exists and contains the circom binary
3. Check the logs for any download errors during setup

### Permission Denied on Linux/macOS

If you see permission errors:

```bash
# Make the binary executable
chmod +x backend/bin/circom
```

This should be done automatically, but may be needed in some environments.

### Platform Not Supported

The setup script supports:
- Linux (x64)
- macOS (x64)
- Windows (x64)

For ARM64 or other architectures, you'll need to build Circom from source:

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Build Circom
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom
```

## Performance Optimization

### Memory Requirements

For production deployments:
- **Minimum:** 512MB RAM
- **Recommended:** 1GB+ RAM for larger circuits
- **Large circuits:** 2GB+ RAM

Set Node.js memory limit if needed:
```bash
NODE_OPTIONS="--max-old-space-size=2048" npm start
```

### Build Cache

To speed up deployments, cache the `node_modules` and `bin` directories:

**Docker:**
```dockerfile
# Cache npm dependencies
COPY package*.json ./
RUN npm install

# This will skip re-downloading Circom if it exists
```

**CI/CD:**
```yaml
# Example for GitHub Actions
- uses: actions/cache@v3
  with:
    path: |
      backend/node_modules
      backend/bin
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

## Support

For issues or questions:
- Circom Documentation: https://docs.circom.io/
- GitHub Issues: [Your repo issues page]

