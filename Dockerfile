FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN apk add --no-cache openssl openssl1.1-compat

RUN npm ci

# =========================

FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN apk add --no-cache openssl openssl1.1-compat

ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG VAPID_PUBLIC_KEY
ARG VAPID_PRIVATE_KEY
ARG VAPID_SUBJECT
ARG FIREBASE_CLIENT_EMAIL
ARG FIREBASE_PRIVATE_KEY

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY
ENV VAPID_PRIVATE_KEY=$VAPID_PRIVATE_KEY
ENV VAPID_SUBJECT=$VAPID_SUBJECT
ENV FIREBASE_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL
ENV FIREBASE_PRIVATE_KEY=$FIREBASE_PRIVATE_KEY

RUN npx prisma generate

RUN npm run build

# =========================

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl openssl1.1-compat

COPY package*.json ./

COPY --from=deps /app/node_modules ./node_modules

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

COPY --from=builder /app/next.config.* ./

EXPOSE 3000

CMD ["npm", "start"]