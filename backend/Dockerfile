# Dockerfile for ZK Quest Backend
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install system dependencies (needed for native modules and circom)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Copy scripts directory (needed for postinstall hook)
COPY scripts ./scripts

# Install npm dependencies (this will also install Circom automatically via postinstall)
RUN npm ci --only=production

# Download Powers of Tau ceremony file so proofs work without runtime downloads
RUN npm run setup:ptau

# Copy application source
COPY . .

# Create necessary directories
RUN mkdir -p zk-workspace/circuits zk-workspace/artifacts

# Expose port
EXPOSE 3001

# Set environment to production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/zk/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]

