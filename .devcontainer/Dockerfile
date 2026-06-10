FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN adduser --disabled-password --gecos "" node
WORKDIR /workspace
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 4001 5173
USER node
CMD ["npm", "run", "start:dev"]
