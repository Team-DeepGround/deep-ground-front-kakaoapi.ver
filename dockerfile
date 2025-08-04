# Dockerfile
FROM node:18 as build
WORKDIR /app
COPY . .
COPY .env.local .env.local
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
RUN npm install --production
EXPOSE 3000
CMD ["npm", "start"]