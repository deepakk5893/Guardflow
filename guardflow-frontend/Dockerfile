# Multi-stage build for React frontend
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S reactjs -u 1001

# Set proper permissions
RUN chown -R reactjs:nodejs /usr/share/nginx/html && \
    chown -R reactjs:nodejs /var/cache/nginx && \
    chown -R reactjs:nodejs /var/log/nginx && \
    chown -R reactjs:nodejs /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R reactjs:nodejs /var/run/nginx.pid

# Switch to non-root user
USER reactjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]