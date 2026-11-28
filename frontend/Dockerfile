# ==========================================
# Stage 1: Build the React / Vite application
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies cleanly
RUN npm ci

# Accept API base URL build argument (Vite bakes VITE_* variables in at build time)
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copy source code and build production bundle
COPY . .
RUN npm run build

# ==========================================
# Stage 2: Serve using Nginx (Production)
# ==========================================
FROM nginx:alpine AS runner

# Cloud Run injects the PORT environment variable (defaults to 8080)
ENV PORT=8080

# Copy Nginx template (nginx docker-entrypoint automatically runs envsubst on /etc/nginx/templates/*.template)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 8080

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
