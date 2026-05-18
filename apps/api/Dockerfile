FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm install

COPY . .
RUN npm run prisma:generate -w apps/api
RUN npm run build -w apps/api

FROM node:18-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm install --omit=dev

COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/prisma apps/api/prisma
COPY --from=builder /app/node_modules/.prisma node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma node_modules/@prisma

WORKDIR /app/apps/api
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
