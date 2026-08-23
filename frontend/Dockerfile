FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
# Key publica do Web3Forms: opcional, mas so entra no bundle se existir aqui.
ARG VITE_WEB3FORMS_ACCESS_KEY=
ENV VITE_WEB3FORMS_ACCESS_KEY=$VITE_WEB3FORMS_ACCESS_KEY
# Modulo de blog: precisa casar com ENABLE_BLOG do backend.
ARG VITE_ENABLE_BLOG=true
ENV VITE_ENABLE_BLOG=$VITE_ENABLE_BLOG
RUN npm run build

FROM nginx:1.28-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1
