# syntax=docker/dockerfile:1

FROM --platform=$BUILDPLATFORM node:22-alpine AS bin
ARG TARGETARCH
ARG XRAY_VERSION=26.9.30
ARG CLOUDFLARED_VERSION=2026.10.0

RUN apk add --no-cache curl unzip ca-certificates

WORKDIR /out

RUN set -eux; \
  case "$TARGETARCH" in \
    amd64) XRAY_ARCH=64 ;; \
    arm64) XRAY_ARCH=arm64-v8a ;; \
    *) echo "unsupported arch: $TARGETARCH" && exit 1 ;; \
  esac; \
  curl -fsSL -o xray.zip \
    "https://github.com/XTLS/Xray-core/releases/download/v${XRAY_VERSION}/Xray-linux-${XRAY_ARCH}.zip"; \
  unzip -o xray.zip xray; \
  chmod +x xray; \
  mv xray /out/xray

RUN set -eux; \
  case "$TARGETARCH" in \
    amd64) CF_ARCH=amd64 ;; \
    arm64) CF_ARCH=arm64 ;; \
    *) echo "unsupported arch: $TARGETARCH" && exit 1 ;; \
  esac; \
  curl -fsSL -o /out/cloudflared \
    "https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/cloudflared-linux-${CF_ARCH}"; \
  chmod +x /out/cloudflared

FROM node:22-alpine AS web
WORKDIR /web
COPY web/package.json ./
RUN npm install --no-audit --no-fund
COPY web/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata \
  && adduser -D -u 10001 appuser

COPY --from=bin /out/xray /usr/local/bin/xray
COPY --from=bin /out/cloudflared /usr/local/bin/cloudflared
COPY package.json ./
COPY server ./server
COPY --from=web /web/dist ./web/dist

ENV NODE_ENV=production \
    PORT=3000 \
    FILE_PATH=/tmp/site-pulse \
    WEB_DIST=/app/web/dist \
    XRAY_BIN=/usr/local/bin/xray \
    CLOUDFLARED_BIN=/usr/local/bin/cloudflared

EXPOSE 3000
USER appuser

CMD ["node", "server/index.js"]
