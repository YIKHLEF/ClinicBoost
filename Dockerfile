# Multi-stage Docker build for ClinicBoost
# Stage 1: Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Build arguments
ARG NODE_ENV=production
ARG VITE_APP_VERSION
ARG VITE_BUILD_TIME
ARG VITE_COMMIT_SHA

# Set environment variables
ENV NODE_ENV=${NODE_ENV}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
ENV VITE_BUILD_TIME=${VITE_BUILD_TIME}
ENV VITE_COMMIT_SHA=${VITE_COMMIT_SHA}

# Build the application
RUN npm run build:${NODE_ENV}

# Stage 2: Production stage
FROM nginx:alpine AS production

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache curl

# Copy custom nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/default.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy health check script
COPY docker/health-check.sh /usr/local/bin/health-check.sh
RUN chmod +x /usr/local/bin/health-check.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S clinicboost -u 1001

# Set ownership
RUN chown -R clinicboost:nodejs /usr/share/nginx/html && \
    chown -R clinicboost:nodejs /var/cache/nginx && \
    chown -R clinicboost:nodejs /var/log/nginx && \
    chown -R clinicboost:nodejs /etc/nginx/conf.d

# Switch to non-root user
USER clinicboost

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD /usr/local/bin/health-check.sh

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
