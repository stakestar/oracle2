FROM node:18-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY node_modules/ node_modules/
COPY build/src/ build/
COPY package.json package.json

ENTRYPOINT [ "node", "build/main.js" ]
