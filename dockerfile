# Dockerfile
FROM node:18 AS build
WORKDIR /app

ENV NODE_ENV=development
COPY package.json package-lock.json* ./
RUN npm install

COPY . .
COPY .env.local .env.local
RUN npm run build

FROM node:18-alpine
WORKDIR /app

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/next.config.js ./next.config.js

RUN npm install --production

ENV NODE_ENV=production

EXPOSE 3000
CMD ["npm", "start"]