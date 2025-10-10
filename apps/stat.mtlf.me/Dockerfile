# syntax = docker/dockerfile:1

# Build stage
FROM oven/bun:1.2.19-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json bun.lockb ./
COPY packages ./packages
COPY apps/stat.mtlf.me ./apps/stat.mtlf.me

# Install dependencies
RUN bun install --frozen-lockfile

# Build the application
WORKDIR /app/apps/stat.mtlf.me
RUN bun run build

# Production stage
FROM oven/bun:1.2.19-alpine AS runner

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/apps/stat.mtlf.me/.next/standalone ./
COPY --from=builder /app/apps/stat.mtlf.me/.next/static ./apps/stat.mtlf.me/.next/static
COPY --from=builder /app/apps/stat.mtlf.me/public ./apps/stat.mtlf.me/public

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Start the application
CMD ["bun", "run", "apps/stat.mtlf.me/server.js"]
