# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build Next.js app
RUN npm run build

# Create production runtime image
FROM node:20-alpine AS runner

WORKDIR /app

# Prefer Next.js standalone output if enabled.
# If standalone isn't generated, the app will still run using `next start`.
ENV NODE_ENV=production

# Copy build artifacts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
#COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "run", "start"]

