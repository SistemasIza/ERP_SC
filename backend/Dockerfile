# Dockerfile for Sparktree SaaS Backend
# Implements containerized deployment with directory isolation (RNF-04, RNF-05)

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create ephemeral directory for temporary auth state (RNF-05)
# This directory is not mounted as a volume, ensuring containers are stateless
RUN mkdir -p /tmp/auth_state && \
    chmod 777 /tmp/auth_state

# Set environment variables for ephemeral auth storage
ENV AUTH_STATE_PATH=/tmp/auth_state

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "start"]
