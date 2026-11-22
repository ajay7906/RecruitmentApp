# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies required for native builds & prisma
RUN apk add --no-cache libc6-compat openssl

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependencies and generate Prisma Client
RUN npm ci
RUN npx prisma generate

COPY . .

# Production Runner Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

RUN apk add --no-cache openssl

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

# Copy built dependencies and app source
COPY --from=builder --chown=expressjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=expressjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=expressjs:nodejs /app/src ./src
COPY --from=builder --chown=expressjs:nodejs /app/package.json ./package.json

# Create storage directory for uploaded files
RUN mkdir -p /app/storage/resumes /app/storage/resume-text && \
    chown -R expressjs:nodejs /app/storage

USER expressjs

EXPOSE 8080

CMD ["node", "src/server.js"]