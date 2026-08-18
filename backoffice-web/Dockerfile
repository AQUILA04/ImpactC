FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

FROM dependencies AS builder
ARG NEXT_PUBLIC_API_BASE=https://impactc-api.optimizesolux.com/api
ARG NEXT_PUBLIC_KEYCLOAK_BACKOFFICE_ENABLED=true
ARG NEXT_PUBLIC_KEYCLOAK_AUTHORITY=https://auth.optimizesolux.com/realms/impactc
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=impactc-backoffice
ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}
ENV NEXT_PUBLIC_KEYCLOAK_BACKOFFICE_ENABLED=${NEXT_PUBLIC_KEYCLOAK_BACKOFFICE_ENABLED}
ENV NEXT_PUBLIC_KEYCLOAK_AUTHORITY=${NEXT_PUBLIC_KEYCLOAK_AUTHORITY}
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=${NEXT_PUBLIC_KEYCLOAK_CLIENT_ID}
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
RUN groupadd --gid 10001 impactc \
    && useradd --uid 10001 --gid impactc --shell /usr/sbin/nologin --create-home impactc
COPY --from=builder --chown=impactc:impactc /app/public ./public
COPY --from=builder --chown=impactc:impactc /app/.next/standalone ./
COPY --from=builder --chown=impactc:impactc /app/.next/static ./.next/static
USER impactc
EXPOSE 3000
CMD ["node", "server.js"]
