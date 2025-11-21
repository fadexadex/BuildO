# Dockerfile for ZK Quest Backend
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies (needed for native modules)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl

# Copy package files
COPY package*.json ./

# Install npm dependencies (this will also install Circom automatically via postinstall)
RUN npm ci --only=production

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

