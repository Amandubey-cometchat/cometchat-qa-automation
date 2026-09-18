# Only needed for local/dev use via docker-compose.yml's `receiver` service.
# The normal flow (see README) uses an already-deployed Render instance —
# this is not how the receiver is meant to run in production.
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 4001

CMD ["npm", "start"]
