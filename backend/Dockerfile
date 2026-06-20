# ---- build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps first for better layer caching.
COPY package*.json ./
RUN npm ci

# Build TypeScript -> dist/
COPY . .
RUN npm run build

# ---- runtime stage ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Production dependencies only.
COPY package*.json ./
RUN npm ci --omit=dev

# Compiled app + the committed migrations (read at startup by migrate.ts).
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle

EXPOSE 3000
# Runs migrations, then listens (see src/index.ts).
CMD ["node", "dist/index.js"]
