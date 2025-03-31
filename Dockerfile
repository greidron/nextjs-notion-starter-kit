ARG ALPINE_VERSION=3.18

# base image (with vips)
FROM --platform=linux/amd64 node:20-alpine${ALPINE_VERSION} as base
RUN apk add --no-cache vips-dev 

# instal dependencies
FROM base as deps
RUN apk add --no-cache build-base
WORKDIR /app

COPY package.json yarn.lock ./ 

RUN yarn install --arch=x64 --platform=linuxmusl --verbose --network-timeout 6000000

# build application
FROM base as builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY lib ./lib
COPY components ./components
COPY pages ./pages
COPY public ./public
COPY styles ./styles
COPY next-env.d.ts next.config.js site.config.ts tsconfig.json ./
COPY package.json yarn.lock ./

RUN yarn run build

FROM base as runner
WORKDIR /app

ENV NODE_ENV production
ENV HOSTNAME "0.0.0.0"
ENV HTTP_PORT 80
ENV HTTPS_PORT 443
ENV GET_CERT_PATH /app/cert
ENV SSL_KEY_PATH /app/cert/privkey.pem
ENV SSL_CERT_PATH /app/cert/fullchain.pem
ENV CERTBOT_WEBROOT /app/public
ENV APP_DATA_PATH /app/data

RUN apk add --no-cache certbot
RUN mkdir ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
RUN cp /app/server.js /app/next.server.js
COPY --from=builder /app/.next/static ./.next/static
COPY server.js ./server.cjs
COPY scripts ./

RUN mkdir -p ${APP_DATA_PATH}

CMD ["/app/entrypoint.sh"]

