FROM node:18 AS build
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
COPY .env.local .env.local
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/next.config.js ./next.config.js
COPY --from=build /app/.env.local .env.local

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
