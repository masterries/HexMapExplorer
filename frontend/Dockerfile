# ---- build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# OSRM base URL baked into the SPA at build time. Empty = public OSRM demo;
# pass /osrm to use a self-hosted OSRM (see docker-compose.osrm.yml).
ARG VITE_OSRM_URL=""
ENV VITE_OSRM_URL=$VITE_OSRM_URL
RUN npm run build

# ---- runtime stage (nginx serves the static SPA + proxies /api) ----
FROM nginx:1.27-alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
