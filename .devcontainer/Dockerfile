FROM node:20-bookworm-slim

# Install system dependencies for better-sqlite3 compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

# Create app user
RUN adduser --disabled-password --gecos "" node

WORKDIR /workspace

# Copy package files first for layer caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the project
COPY . .

EXPOSE 4001 5173

USER node
CMD ["npm", "run", "start:dev"]
