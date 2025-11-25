FROM oven/bun:1.2.20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y nodejs npm && \
    npm install -g @anthropic-ai/claude-code && \
    rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY . .

CMD ["bun", "run", "src/index.ts"]
