FROM node:18

WORKDIR /app

ARG NPM_TOKEN

COPY package*.json ./
COPY .npmrc.prod ./.npmrc

RUN yarn install --frozen-lockfile
COPY . .
RUN yarn run build:release

RUN yarn install --production --frozen-lockfile
RUN rm -rf .npmrc

CMD ["yarn","start"]
