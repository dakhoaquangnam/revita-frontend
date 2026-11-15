# Revita frontend (Next.js 16) — Dockerfile cho VPS ONIE
# Build: docker compose build --build-arg NEXT_PUBLIC_API_URL=... --build-arg NEXT_PUBLIC_SOCKET_URL=...
# Chạy:  npm start (next start, cổng 3000 trong container, không publish ra host —
#        nginx của backend đã chiếm cổng 80 và sẽ proxy / về container này).
# Lưu ý: NEXT_PUBLIC_* được "nướng" vào JS lúc build, đổi API base thì phải build lại.

# ---------- Stage 1: build ----------
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_API_URL=http://23.132.252.189/api
ARG NEXT_PUBLIC_SOCKET_URL=http://23.132.252.189
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
RUN npm run build

# ---------- Stage 2: chạy ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN apk add --no-cache libc6-compat
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
EXPOSE 3000
CMD ["npm", "start"]
