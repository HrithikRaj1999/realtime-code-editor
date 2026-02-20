# Multi-language runner image
FROM node:18-slim

# Install compilers and runtimes for all supported languages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    default-jdk \
    g++ \
    gcc \
    golang-go \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -s /bin/bash runner

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

# Create temp directories for code execution
RUN mkdir -p /tmp/code-exec /app/codes /app/output && \
    chown -R runner:runner /tmp/code-exec /app/codes /app/output

# Switch to non-root user
USER runner

CMD ["npx", "ts-node", "src/index.ts"]
