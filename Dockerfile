# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/playwright:v1.35.1-jammy

WORKDIR /usr/src/app

# Download dependencies as a separate step to take advantage of Docker's caching.

COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/package.json
COPY packages/js/package.json packages/js/package.json
COPY packages/node/package.json packages/node/package.json
COPY packages/realtime-api/package.json packages/realtime-api/package.json
COPY packages/swaig/package.json packages/swaig/package.json
COPY packages/web-api/package.json packages/web-api/package.json
COPY packages/webrtc/package.json packages/webrtc/package.json
COPY scripts/sw-build/package.json scripts/sw-build/package.json
COPY scripts/sw-build-all/package.json scripts/sw-build-all/package.json
COPY scripts/sw-common/package.json scripts/sw-common/package.json
COPY scripts/sw-release/package.json scripts/sw-release/package.json
COPY scripts/sw-test/package.json scripts/sw-test/package.json
COPY internal/e2e-js/package.json internal/e2e-js/package.json
COPY internal/e2e-realtime-api/package.json internal/e2e-realtime-api/package.json
COPY internal/playground-js/package.json internal/playground-js/package.json
COPY internal/playground-realtime-api/package.json internal/playground-realtime-api/package.json
COPY internal/playground-swaig/package.json internal/playground-swaig/package.json
COPY internal/stack-tests/package.json internal/stack-tests/package.json

# Leverage a cache mount to /root/.npm to speed up subsequent builds.
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

RUN npm i && \
    npm run build

CMD ["node"]
