FROM oven/bun:1
WORKDIR /app/backend

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

ENV ENV=production
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
