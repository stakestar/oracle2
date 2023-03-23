FROM node:18 as base

WORKDIR /app

COPY package*.json ./

RUN yarn install --frozen-lockfile
COPY . .
RUN yarn run build:release

FROM node:18-alpine

ENV NODE_ENV production

COPY package.json yarn.lock ./

RUN yarn install --production --frozen-lockfile

COPY --from=base /app/build ./build

CMD ["yarn","start"]
